import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { jsonError, HttpError } from '@/lib/errors';
import { createAdminClient } from '@/lib/supabase/admin';
import { redeem, buyIxisUrl, WalletError } from '@/lib/apixis-wallet';
import { apixisOwner } from "@/lib/apixis-login";
import { writeAudit } from "@/lib/audit";
import type { AppUser } from "@/types";

export const runtime = 'nodejs';

const bodySchema = z.object({
  trackId: z.string().min(1),
  /** "upload" = the signed-in user's own uploaded track (tracks.public_id, trx_…). Default: catalog. */
  kind: z.enum(["catalog", "upload"]).optional(),
});

/** Statuses where a finished transcription exists, so the person pays only for real lyrics. */
const UNLOCKABLE_STATUSES = new Set(["completed", "manual_review"]);

function insufficientResponse(quoted: number, returnUrl: string) {
  const needed = quoted > 0 ? quoted : 300; // quote() unreachable → show the SKU price
  return NextResponse.json(
    {
      error: 'insufficient_ixis',
      message: `Not enough Ixis — this unlock is ${needed.toLocaleString()} Ixis. Buy Ixis, then come back.`,
      needed,
      buyUrl: buyIxisUrl('lyrixis', returnUrl),
    },
    { status: 402 }
  );
}

/**
 * Unlock the signed-in user's OWN uploaded track (2026-10-05, Grok). Same Wallet SKU and the same
 * reserve → provision → capture flow as catalog unlocks. Provision = set tracks.paid = true on a row
 * this user owns (tracks are per-user, so this is not a global unlock); unprovision flips it back
 * if the Wallet confirms the customer was not charged.
 */
async function redeemUpload(request: NextRequest, user: AppUser & { email: string }, trackId: string) {
  const admin = createAdminClient();
  const { data: track } = await admin
    .from('tracks')
    .select('id, public_id, title, status, paid')
    .eq('public_id', trackId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!track) throw new HttpError(404, 'track_not_found', 'Track not found');
  if (track.paid) {
    return NextResponse.json({ success: true, message: 'Already unlocked for your account.', trackId });
  }
  if (!UNLOCKABLE_STATUSES.has(String(track.status))) {
    throw new HttpError(
      409,
      'not_ready',
      'Lyrics are still processing. Unlock when they are ready, so you only pay for a finished transcription.'
    );
  }

  const returnUrl = `${SITE}/tracks/${encodeURIComponent(trackId)}`;
  const attemptId = request.headers.get('x-idempotency-key') || crypto.randomUUID();

  const result = await redeem({
    owner: (await apixisOwner(user.email)) ?? user.email,
    productKey: PRODUCT_KEY,
    // Under 80 chars: "lyxu-" + user prefix + track id hex + attempt.
    idempotencyKey: `lyxu-${user.id.slice(0, 12)}-${String(track.public_id).slice(4, 28)}-${attemptId.slice(0, 8)}`,
    provision: async (reservation): Promise<{ trackId: string; ixis: number }> => {
      const { data, error } = await admin
        .from('tracks')
        .update({ paid: true })
        .eq('id', track.id)
        .eq('user_id', user.id)
        .eq('paid', false)
        .select('id');
      if (error) throw new HttpError(500, 'provision_failed', `Could not record unlock: ${error.message}`);
      // Another click already unlocked it: throwing releases this hold, so nobody pays twice.
      if (!data || data.length === 0) throw new HttpError(409, 'already_unlocked', 'This track is already unlocked.');
      return { trackId: String(track.id), ixis: reservation.ixis };
    },
    unprovision: async () => {
      const { error } = await admin.from('tracks').update({ paid: false }).eq('id', track.id).eq('user_id', user.id);
      if (error) console.error('[CRITICAL] upload unprovision failed:', { user: user.id, track: track.public_id, error });
    },
  });

  if (!result.ok) return insufficientResponse(result.needed, returnUrl);

  await writeAudit({
    actorUserId: user.id,
    action: 'unlock',
    entityType: 'track',
    entityId: String(track.id),
    metadata: {
      public_id: String(track.public_id),
      product_key: PRODUCT_KEY,
      ixis: result.result.ixis,
      receipt_id: result.receiptId || null,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Unlocked "${track.title ?? trackId}" · ${result.result.ixis.toLocaleString()} Ixis`,
    trackId,
    receiptId: result.receiptId,
  });
}
const PRODUCT_KEY = 'lyrixis.track.unlock'; // 300 Ixis, metered per-use
const SITE = 'https://lyrixis.apixis.dev';

/**
 * Unlock one public catalog recording for the signed-in user — or, with kind "upload" (or a trx_ id),
 * the user's own uploaded track (see redeemUpload).
 * Wallet is the source of truth (entitlement written on capture); track_unlocks is our
 * per-user cache. The old route looked in `tracks` (user uploads, not the public catalog) and
 * flipped a GLOBAL paid flag — Redeem 404'd on every catalog page (verified live).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, 'invalid_body', 'trackId is required.');
    const { trackId, kind } = parsed.data;
    if (!user.email) throw new HttpError(400, 'email_required', 'Sign in with email to redeem.');
    if (kind === 'upload' || (kind === undefined && trackId.startsWith('trx_'))) {
      return await redeemUpload(request, { ...user, email: user.email }, trackId);
    }

    const admin = createAdminClient();
    const { data: rec } = await admin
      .from('catalog_recordings')
      .select('public_id, title')
      .eq('public_id', trackId)
      .maybeSingle();
    if (!rec) throw new HttpError(404, 'track_not_found', 'Track not found');

    const { data: existing } = await admin
      .from('track_unlocks')
      .select('receipt_id')
      .eq('user_id', user.id)
      .eq('recording_public_id', rec.public_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ success: true, message: 'Already unlocked for your account.', trackId });
    }

    const returnUrl = `${SITE}/catalog/${encodeURIComponent(trackId)}`;
    
    // Generate client attemptId for true idempotency (reuse on retry, new on fresh click)
    const attemptId = request.headers.get('x-idempotency-key') || crypto.randomUUID();
    
    const result = await redeem({
      owner: (await apixisOwner(user.email)) ?? user.email,
      productKey: PRODUCT_KEY,
      // Stable per user+product+attempt (NOT Date.now(); retry must reuse key)
      // Under 80 chars: user prefix + recording + attempt
      idempotencyKey: `lyx-${user.id.slice(0, 12)}-${rec.public_id.slice(4, 28)}-${attemptId.slice(0, 8)}`,
      provision: async (reservation): Promise<{ unlockId: string; ixis: number }> => {
        const { data, error } = await admin.from('track_unlocks').insert({
          user_id: user.id,
          recording_public_id: rec.public_id,
          receipt_id: reservation.reservationId,
        }).select('user_id, recording_public_id').single();
        
        if (error) throw new HttpError(500, 'provision_failed', `Could not record unlock: ${error.message}`);
        return { unlockId: `${data.user_id}:${data.recording_public_id}`, ixis: reservation.ixis };
      },
      unprovision: async (reservation, result) => {
        // Capture failed after we wrote the unlock row: delete it
        const { error } = await admin.from('track_unlocks')
          .delete()
          .eq('user_id', user.id)
          .eq('recording_public_id', rec.public_id)
          .eq('receipt_id', reservation.reservationId); // Only delete THIS attempt's row
        
        if (error) {
          console.error('[CRITICAL] unprovision failed:', { user: user.id, track: rec.public_id, error });
        }
      },
    });

    if (!result.ok) return insufficientResponse(result.needed, returnUrl);

    return NextResponse.json({
      success: true,
      message: `Unlocked "${rec.title}" · ${result.result.ixis.toLocaleString()} Ixis`,
      trackId,
      receiptId: result.receiptId,
    });
  } catch (error) {
    if (error instanceof WalletError) {
      return NextResponse.json(
        { error: 'wallet_error', message: `Wallet: ${error.message}` },
        { status: error.status >= 500 ? 502 : error.status }
      );
    }
    return jsonError(error);
  }
}
