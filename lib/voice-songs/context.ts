import { hasEntitlement, isWalletConfigured } from "@/lib/apixis-wallet";
import { apixisOwner } from "@/lib/apixis-login";
import { requireUser } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/owners";
import { createAdminClient } from "@/lib/supabase/admin";
import { providerStatus } from "./providers";
import { memoryStore, type VoiceSongsStore } from "./store";
import { SupabaseStore } from "./supabase-store";
import type { Actor } from "./types";

export const DEMO_COOKIE = "lyrixis_voice_demo";
export const ALLOWANCE_COOKIE = "lyrixis_voice_allowance";
export const DEMO_USER_ID = "00000000-0000-4000-8000-0000000000d1";

export function demoEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VOICE_SONGS_DEMO === "false") return false;
  if (env.VOICE_SONGS_DEMO === "true") return true;
  return env.NODE_ENV !== "production";
}

export function cookieOn(header: string | null, name: string): boolean {
  if (!header) return false;
  return header.split(";").some((part) => part.trim().startsWith(`${name}=1`));
}

export function memoryStoreSelected(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VOICE_SONGS_STORE === "memory") return true;
  if (env.VOICE_SONGS_STORE === "supabase") return false;
  return !env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY;
}

export function getStore(): VoiceSongsStore {
  return memoryStoreSelected() ? memoryStore() : new SupabaseStore();
}

export async function actorFromRequest(request: Request): Promise<Actor | null> {
  const cookie = request.headers.get("cookie");
  const url = new URL(request.url);
  if (demoEnabled() && (cookieOn(cookie, DEMO_COOKIE) || url.searchParams.get("demo") === "1")) {
    return {
      userId: DEMO_USER_ID,
      email: "demo@lyrixis.dev",
      demo: true,
      demoAllowance: cookieOn(cookie, ALLOWANCE_COOKIE) || url.searchParams.get("allowance") === "1",
      owner: false,
      walletOwner: "demo@lyrixis.dev",
    };
  }
  try {
    const user = await requireUser();
    if (!user.email) return null;
    const walletOwner = (await apixisOwner(user.email)) ?? user.email;
    return {
      userId: user.id,
      email: user.email,
      demo: false,
      demoAllowance: false,
      owner: isOwnerEmail(user.email),
      walletOwner,
    };
  } catch {
    return null;
  }
}

export async function allAccessFor(actor: Actor): Promise<boolean> {
  if (actor.owner) return true;
  if (actor.demo) return actor.demoAllowance;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("organization_members")
      .select("organization_id, organizations(plan)")
      .eq("user_id", actor.userId);
    const rows = (data ?? []) as { organizations?: { plan?: string } | { plan?: string }[] | null }[];
    for (const row of rows) {
      const org = row.organizations;
      const plan = Array.isArray(org) ? org[0]?.plan : org?.plan;
      if (plan === "enterprise") return true;
    }
  } catch {
    /* membership lookup is optional */
  }
  if (!isWalletConfigured()) return false;
  try {
    for (const key of ["lyrixis.all_access", "lyrixis.all-access", "lyrixis.plan.monthly"]) {
      if (await hasEntitlement(actor.walletOwner, "lyrixis", key)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function publicConfig() {
  const providers = providerStatus();
  return {
    demoAvailable: demoEnabled(),
    store: memoryStoreSelected() ? "memory" : "supabase",
    providers,
  };
}
