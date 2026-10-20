import { jsonError } from "@/lib/errors";
import { saveSongDraft, suggestLyrics, voiceSession } from "@/lib/voice-songs/service";
import { publicSong } from "@/lib/voice-songs/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      theme?: string;
      mood?: string;
      genre?: string;
      draft?: string;
      note?: string;
      title?: string;
      lyrics?: string;
      songId?: string;
    };
    if (body.action === "suggest") {
      const result = await suggestLyrics({
        theme: String(body.theme || ""),
        mood: String(body.mood || ""),
        genre: String(body.genre || ""),
        draft: String(body.draft || ""),
        note: String(body.note || ""),
      });
      return Response.json(result);
    }
    const session = await voiceSession();
    const song = await saveSongDraft({
      userId: session.user.id,
      owner: session.owner,
      songId: body.songId,
      title: String(body.title || ""),
      theme: String(body.theme || ""),
      mood: String(body.mood || ""),
      genre: String(body.genre || ""),
      lyrics: String(body.lyrics || body.draft || ""),
    });
    return Response.json({ song: publicSong(song) });
  } catch (error) {
    return jsonError(error);
  }
}
