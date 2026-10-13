import { connection } from "next/server";
import { voiceProviderStatus } from "@/lib/voice-songs/config";
import { VoiceStudio } from "./VoiceStudio";

type StudioProps = {
  step: string;
  demo?: boolean;
  songId?: string;
  query?: { sku?: string; songId?: string; paid?: string; sessionId?: string; cancelled?: boolean };
};

/** Reads provider keys on the request, not from the build. */
export async function VoiceStudioShell(props: StudioProps) {
  await connection();
  return <VoiceStudio {...props} initialProviders={voiceProviderStatus()} />;
}
