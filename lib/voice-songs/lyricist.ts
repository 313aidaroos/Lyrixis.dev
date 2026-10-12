import { screenVoiceText } from "./safety";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

const SYSTEM = `You write original song lyrics for Lyrixis Voice Songs.
Rules:
- Only original lines. Never quote or closely paraphrase a published song.
- Never name a real singer, band, or celebrity, and never imitate one.
- If the user asks for someone else's voice, title, or lyrics, refuse in one sentence and offer an original theme instead.
- Return only the lyric, with section labels on their own line: [Verse], [Pre-Chorus], [Chorus], [Bridge].
- Four to sixteen lines. Plain text. No markdown.
- Match the requested genre and mood. Keep the words singable.`;

export function mockLyrics(input: { theme: string; mood: string; genre: string }): string {
  const theme = input.theme.trim() || "a night drive";
  const mood = input.mood.trim() || "hopeful";
  const genre = input.genre.trim() || "pop";
  return [
    "[Verse]",
    `The city keeps the window down, ${theme} in the glass.`,
    "I count the lights and leave the old plan in the past.",
    "",
    "[Chorus]",
    `This is my voice, ${mood}, singing it through.`,
    `A ${genre} heartbeat, and the words are new.`,
    "No one else's name, no borrowed refrain,",
    "just the line I wrote and the road I take.",
  ].join("\n");
}

export async function writeLyrics(input: { theme: string; mood: string; genre: string; draft: string; note: string }): Promise<{ lyrics: string; source: "cixy" | "mock" }> {
  const screened = screenVoiceText([input.theme, input.mood, input.genre, input.draft, input.note].join("\n"), "lyrics");
  if (!screened.ok) throw new Error(screened.reason);
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const mock = process.env.VOICE_SONGS_MOCK === "1" || process.env.VOICE_SONGS_MOCK === "true";
  if (!apiKey) {
    if (mock) return { lyrics: mockLyrics(input), source: "mock" };
    throw new Error("Cixy is not configured (ANTHROPIC_API_KEY). You can still type your own lyrics.");
  }
  const model = process.env.ANTHROPIC_MODEL?.startsWith("claude") ? process.env.ANTHROPIC_MODEL : DEFAULT_MODEL;
  const user = [
    `Genre: ${input.genre || "pop"}`,
    `Mood: ${input.mood || "warm"}`,
    `Theme: ${input.theme || "starting over"}`,
    input.draft ? `Draft to improve:\n${input.draft}` : "",
    input.note ? `Note: ${input.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    }),
  });
  const json = (await response.json().catch(() => ({}))) as { content?: { text?: string }[]; error?: { message?: string } };
  if (!response.ok) throw new Error(json.error?.message || `Cixy failed (${response.status}).`);
  const lyrics = json.content?.map((block) => block.text ?? "").join("\n").trim();
  if (!lyrics) throw new Error("Cixy returned an empty lyric.");
  const again = screenVoiceText(lyrics, "lyrics");
  if (!again.ok) throw new Error(again.reason);
  return { lyrics, source: "cixy" };
}
