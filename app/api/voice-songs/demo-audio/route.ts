import { toneWav } from "@/lib/voice-songs/wav";

export const dynamic = "force-dynamic";

/** Placeholder tone for the demo preview. Not a cloned voice and not a user file. */
export async function GET() {
  const body = toneWav(8);
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": "audio/wav",
      "content-disposition": "inline; filename=\"lyrixis-demo-preview.wav\"",
      "cache-control": "public, max-age=3600",
    },
  });
}
