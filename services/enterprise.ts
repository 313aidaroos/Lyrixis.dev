import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/errors";
import { sendLyrixisEmail } from "@/lib/mail";
import { SALES_EMAIL } from "@/lib/ixis-pricing";
import {
  canInviteToOrg,
  companySlug,
  enterpriseCoversTrack,
  isEnterpriseAdminEmail,
  normalizeEmail,
  seatsOpen,
  type InquiryInput,
  type Membership,
  type OrgPlan,
  type OrgRole,
} from "@/lib/enterprise-access";
import type { AppUser } from "@/types";

const SITE = "https://lyrixis.apixis.dev";

interface DbError {
  code?: string;
  message?: string;
}

function missingSchema(error: DbError | null | undefined): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

function asPlan(value: unknown): OrgPlan {
  return value === "enterprise" ? "enterprise" : "standard";
}

function asRole(value: unknown): OrgRole {
  return value === "owner" ? "owner" : "member";
}

interface OrgJoin {
  id?: string;
  name?: string;
  plan?: string;
  seat_limit?: number | null;
}

function oneOrg(value: OrgJoin | OrgJoin[] | null | undefined): OrgJoin | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Pending invites for this email become memberships. Missing tables are ignored so song unlocks keep working. */
export async function membershipsForUser(user: Pick<AppUser, "id" | "email">): Promise<Membership[]> {
  if (user.email) await acceptPendingInvites(user);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_members")
    .select("organization_id, role, organizations(plan)")
    .eq("user_id", user.id);
  if (error || !data) return [];
  return (data as { organization_id: string; role: string; organizations: OrgJoin | OrgJoin[] | null }[])
    .map((row) => ({
      organizationId: row.organization_id,
      role: asRole(row.role),
      plan: asPlan(oneOrg(row.organizations)?.plan),
    }))
    .filter((row) => row.plan === "enterprise" || row.role === "owner" || row.role === "member");
}

export async function enterpriseOrganizationIdForUpload(user: Pick<AppUser, "id" | "email">): Promise<string | null> {
  try {
    const memberships = await membershipsForUser(user);
    return memberships.find((row) => row.plan === "enterprise")?.organizationId ?? null;
  } catch {
    return null;
  }
}

export async function lyricsUnlockedFor(
  user: Pick<AppUser, "id" | "email">,
  track: { paid: boolean; organization_id: string | null },
  ownerBypass: boolean
): Promise<boolean> {
  if (track.paid || ownerBypass) return true;
  try {
    const memberships = await membershipsForUser(user);
    return enterpriseCoversTrack(memberships, track.organization_id);
  } catch {
    return false;
  }
}

async function acceptPendingInvites(user: Pick<AppUser, "id" | "email">): Promise<void> {
  if (!user.email) return;
  const admin = createAdminClient();
  const email = normalizeEmail(user.email);
  const { data, error } = await admin
    .from("organization_invites")
    .select("id, organization_id, role")
    .eq("status", "pending")
    .ilike("email", email);
  if (error || !data) return;
  for (const invite of data as { id: string; organization_id: string; role: string }[]) {
    const inserted = await admin.from("organization_members").insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      role: asRole(invite.role),
    });
    if (inserted.error && inserted.error.code !== "23505") continue;
    await admin
      .from("organization_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id)
      .eq("status", "pending");
  }
}

export interface InquiryRecord {
  id: string;
  companyName: string;
  contactName: string;
  workEmail: string;
  phone: string | null;
  songsPerMonth: string;
  teamSeats: number;
  message: string;
  status: string;
  createdAt: string;
}

export async function createEnterpriseInquiry(input: InquiryInput): Promise<{ id: string; emailed: boolean }> {
  const parsed = input;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("enterprise_inquiries")
    .insert({
      company_name: parsed.companyName,
      contact_name: parsed.contactName,
      work_email: normalizeEmail(parsed.workEmail),
      phone: parsed.phone,
      songs_per_month: parsed.songsPerMonth,
      team_seats: parsed.teamSeats,
      message: parsed.message,
      status: "new",
    })
    .select("id")
    .single();
  if (error || !data?.id) {
    if (missingSchema(error)) {
      throw new HttpError(
        503,
        "enterprise_not_ready",
        `We could not save this yet. Email ${SALES_EMAIL} with the same details and we will take it from there.`
      );
    }
    throw new HttpError(500, "inquiry_failed", "Could not save your request. Try again.");
  }

  const id = String(data.id);
  const mailed = await sendLyrixisEmail({
    to: SALES_EMAIL,
    subject: "Lyrixis Label / Enterprise inquiry",
    text: [
      "New Label / Enterprise request",
      "",
      `Company: ${parsed.companyName}`,
      `Contact: ${parsed.contactName}`,
      `Work email: ${normalizeEmail(parsed.workEmail)}`,
      `Phone: ${parsed.phone ?? "—"}`,
      `Songs per month: ${parsed.songsPerMonth}`,
      `Team seats: ${parsed.teamSeats}`,
      "",
      parsed.message,
      "",
      `Review: ${SITE}/admin/enterprise`,
      `Request id: ${id}`,
    ].join("\n"),
  });
  return { id, emailed: mailed.sent };
}

export async function listEnterpriseInquiries(): Promise<InquiryRecord[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("enterprise_inquiries")
    .select("id, company_name, contact_name, work_email, phone, songs_per_month, team_seats, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    if (missingSchema(error)) return [];
    throw new HttpError(500, "inquiry_list_failed", error.message);
  }
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    companyName: String(row.company_name ?? ""),
    contactName: String(row.contact_name ?? ""),
    workEmail: String(row.work_email ?? ""),
    phone: row.phone ? String(row.phone) : null,
    songsPerMonth: String(row.songs_per_month ?? ""),
    teamSeats: Number(row.team_seats ?? 0),
    message: String(row.message ?? ""),
    status: String(row.status ?? "new"),
    createdAt: String(row.created_at ?? ""),
  }));
}

export async function approveEnterpriseInquiry(actor: AppUser, inquiryId: string): Promise<{ organizationId: string }> {
  if (!isEnterpriseAdminEmail(actor.email)) {
    throw new HttpError(403, "forbidden", "Only Awad can approve a company.");
  }
  const admin = createAdminClient();
  const { data: inquiry, error } = await admin
    .from("enterprise_inquiries")
    .select("id, company_name, contact_name, work_email, team_seats, status")
    .eq("id", inquiryId)
    .maybeSingle();
  if (error) {
    if (missingSchema(error)) {
      throw new HttpError(503, "enterprise_not_ready", "Apply database/migrations/20261006_enterprise_accounts.sql first.");
    }
    throw new HttpError(500, "inquiry_lookup_failed", error.message);
  }
  if (!inquiry) throw new HttpError(404, "not_found", "That request was not found.");
  if (inquiry.status === "approved" && inquiry) {
    const existing = await admin.from("organizations").select("id").eq("inquiry_id", inquiryId).maybeSingle();
    if (existing.data?.id) return { organizationId: String(existing.data.id) };
  }
  if (inquiry.status !== "new" && inquiry.status !== "approved") {
    throw new HttpError(409, "not_open", "This request is not waiting for approval.");
  }

  const { data: slugs } = await admin.from("organizations").select("slug");
  const slug = companySlug(
    String(inquiry.company_name),
    ((slugs ?? []) as { slug: string }[]).map((row) => row.slug)
  );
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: inquiry.company_name,
      slug,
      billing_email: normalizeEmail(String(inquiry.work_email)),
      plan: "enterprise",
      enterprise_approved_at: new Date().toISOString(),
      enterprise_approved_by: actor.id,
      seat_limit: inquiry.team_seats,
      inquiry_id: inquiry.id,
    })
    .select("id")
    .single();
  if (orgError || !org?.id) {
    throw new HttpError(500, "org_create_failed", orgError?.message ?? "Could not create the company.");
  }
  const organizationId = String(org.id);
  const email = normalizeEmail(String(inquiry.work_email));
  const { data: owner } = await admin.from("users").select("id").ilike("email", email).maybeSingle();
  if (owner?.id) {
    await admin.from("organization_members").insert({
      organization_id: organizationId,
      user_id: owner.id,
      role: "owner",
    });
  } else {
    await admin.from("organization_invites").insert({
      organization_id: organizationId,
      email,
      role: "owner",
      status: "pending",
      invited_by: actor.id,
    });
  }
  await admin.from("enterprise_inquiries").update({ status: "approved", organization_id: organizationId }).eq("id", inquiry.id);

  await sendLyrixisEmail({
    to: [email, SALES_EMAIL],
    subject: "Lyrixis Label / Enterprise inquiry",
    text: [
      `${inquiry.company_name} is approved for Lyrixis Enterprise.`,
      "",
      `Sign in with ${email} (Apixis ID), then open ${SITE}/team.`,
      "The company owner can invite teammates by email. Everyone on the company gets All-Access for the company's songs.",
      "Lyric video downloads, translations, and Voices are still coming soon.",
    ].join("\n"),
  });
  return { organizationId };
}

export interface TeamView {
  organizationId: string;
  name: string;
  role: OrgRole;
  seatLimit: number | null;
  songsProcessed: number;
  members: { email: string; name: string | null; role: OrgRole }[];
  pending: { email: string; role: OrgRole }[];
}

export async function teamViewsFor(user: AppUser): Promise<TeamView[]> {
  const memberships = await membershipsForUser(user);
  const enterprise = memberships.filter((row) => row.plan === "enterprise");
  if (enterprise.length === 0) return [];
  const admin = createAdminClient();
  const views: TeamView[] = [];
  for (const membership of enterprise) {
    const { data: org } = await admin
      .from("organizations")
      .select("id, name, seat_limit, plan")
      .eq("id", membership.organizationId)
      .maybeSingle();
    if (!org || org.plan !== "enterprise") continue;
    const { data: memberRows } = await admin
      .from("organization_members")
      .select("role, user_id, users(email, full_name)")
      .eq("organization_id", membership.organizationId);
    const { data: inviteRows } = await admin
      .from("organization_invites")
      .select("email, role")
      .eq("organization_id", membership.organizationId)
      .eq("status", "pending");
    const { count } = await admin
      .from("tracks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organizationId);
    const members = ((memberRows ?? []) as { role: string; users: { email?: string; full_name?: string | null } | { email?: string; full_name?: string | null }[] | null }[]).map((row) => {
      const person = Array.isArray(row.users) ? row.users[0] : row.users;
      return {
        email: person?.email ?? "—",
        name: person?.full_name ?? null,
        role: asRole(row.role),
      };
    });
    views.push({
      organizationId: membership.organizationId,
      name: String(org.name),
      role: membership.role,
      seatLimit: org.seat_limit === null || org.seat_limit === undefined ? null : Number(org.seat_limit),
      songsProcessed: count ?? 0,
      members,
      pending: ((inviteRows ?? []) as { email: string; role: string }[]).map((row) => ({
        email: row.email,
        role: asRole(row.role),
      })),
    });
  }
  return views;
}

export async function inviteTeammate(actor: AppUser, organizationId: string, emailRaw: string): Promise<{ emailed: boolean }> {
  const email = normalizeEmail(emailRaw);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "bad_email", "Enter a valid email.");
  }
  const memberships = await membershipsForUser(actor);
  if (!canInviteToOrg(memberships, organizationId)) {
    throw new HttpError(403, "forbidden", "Only the company owner can invite people.");
  }
  const admin = createAdminClient();
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, name, plan, seat_limit")
    .eq("id", organizationId)
    .maybeSingle();
  if (orgError || !org || org.plan !== "enterprise") {
    throw new HttpError(404, "not_found", "Company not found.");
  }
  const { count: memberCount } = await admin
    .from("organization_members")
    .select("user_id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  const { count: pendingCount } = await admin
    .from("organization_invites")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");
  if (!seatsOpen(memberCount ?? 0, pendingCount ?? 0, org.seat_limit === null ? null : Number(org.seat_limit))) {
    throw new HttpError(409, "seats_full", "This company has no open seats. Email awad@apixis.dev if you need more.");
  }
  const { data: already } = await admin.from("users").select("id").ilike("email", email).maybeSingle();
  if (already?.id) {
    const { data: member } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", already.id)
      .maybeSingle();
    if (member) throw new HttpError(409, "already_member", "That person is already on this company.");
  }
  const { error: inviteError } = await admin.from("organization_invites").insert({
    organization_id: organizationId,
    email,
    role: "member",
    status: "pending",
    invited_by: actor.id,
  });
  if (inviteError) {
    if (inviteError.code === "23505") throw new HttpError(409, "already_invited", "That email already has an invite.");
    throw new HttpError(500, "invite_failed", inviteError.message);
  }
  const mailed = await sendLyrixisEmail({
    to: email,
    subject: `Join ${org.name} on Lyrixis`,
    text: [
      `${actor.email ?? "Your company"} invited you to ${org.name} on Lyrixis.`,
      "",
      `Sign in with this email address (Apixis ID), then open ${SITE}/team.`,
      "You get All-Access on the company's songs: synced lyrics, playback, corrections, and text downloads.",
      "Lyric video downloads, translations, and Voices are still coming soon.",
    ].join("\n"),
  });
  return { emailed: mailed.sent };
}
