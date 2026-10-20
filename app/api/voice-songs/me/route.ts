import { connection } from "next/server";
import { jsonError, HttpError } from "@/lib/errors";
import { isWalletConfigured } from "@/lib/apixis-wallet";
import { cardCheckoutReady } from "@/lib/card-checkout";
import { voicePaymentsLive } from "@/lib/voice-songs/checkout";
import { voiceProviderStatus } from "@/lib/voice-songs/config";
import { VOICE_CONSENT_TEXT } from "@/lib/voice-songs/consent";
import { studioSnapshot, voiceSession } from "@/lib/voice-songs/service";

function payments() {
  return {
    card: cardCheckoutReady(),
    wallet: isWalletConfigured(),
    live: voicePaymentsLive(),
  };
}

export const dynamic = "force-dynamic";

export async function GET() {
  await connection();
  const providers = voiceProviderStatus();
  try {
    const session = await voiceSession();
    try {
      const snap = await studioSnapshot(session.user.id);
      return Response.json({
        signedIn: true,
        owner: session.owner,
        ownerEmail: session.ownerEmail,
        email: session.user.email,
        providers,
        consent: VOICE_CONSENT_TEXT,
        payments: payments(),
        database: true,
        ...snap,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Database unavailable";
      return Response.json({
        signedIn: true,
        owner: session.owner,
        ownerEmail: session.ownerEmail,
        email: session.user.email,
        providers,
        consent: VOICE_CONSENT_TEXT,
        payments: payments(),
        database: false,
        databaseMessage: /voice_profiles|schema cache|does not exist/i.test(message)
          ? "Apply database/migrations/0007_voice_songs.sql on Supabase, then reload."
          : message,
        profile: null,
        songs: [],
      });
    }
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      return Response.json({
        signedIn: false,
        owner: false,
        ownerEmail: false,
        providers,
        consent: VOICE_CONSENT_TEXT,
        payments: payments(),
        database: true,
        profile: null,
        songs: [],
      });
    }
    return jsonError(error);
  }
}
