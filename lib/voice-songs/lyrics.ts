import { askCixy } from "@/services/cixy";
import { screenText } from "./filter";
import type { LyricMessage } from "./types";

export type LyricDraft = {
  lyrics: string;
  reply: string;
  provider: "cixy" | "demo";
  blocked: string | null;
};

function demoDraft(theme: string, mood: string, genre: string, note: string): LyricDraft {
  const title = theme.replace(/[^\w\s'-]/g, "").trim().slice(0, 48) || "Night Window";
  const lyrics = [
    `${title}`,
    "",
    "[Verse 1]",
    `I keep a ${mood.toLowerCase()} light on in the kitchen`,
    `Counting the ${genre.toLowerCase()} hours nobody sees`,
    "The city hums under the window like a second voice",
    "And I answer it quietly, just me",
    "",
    "[Chorus]",
    "Say it in my voice, say it slow",
    "If the room is small, let the chorus grow",
    "I am not a copy, I am not a name",
    "I am the one who stayed and sang",
    "",
    "[Verse 2]",
    note ? `You asked: ${note.slice(0, 140)}` : "Leave the famous names outside the door",
    "Write a line I have never heard before",
    "Hands on the table, breath on the take",
    "Three minutes, then another, for my sake",
    "",
    "[Chorus]",
    "Say it in my voice, say it slow",
    "If the room is small, let the chorus grow",
    "I am not a copy, I am not a name",
    "I am the one who stayed and sang",
  ].join("\n");
  return {
    lyrics,
    reply: "Demo Cixy wrote an original draft from your theme. Edit any line, then generate. A live Cixy reply needs ANTHROPIC_API_KEY.",
    provider: "demo",
    blocked: null,
  };
}

export async function coWriteLyrics(input: {
  theme: string;
  mood: string;
  genre: string;
  note: string;
  history: LyricMessage[];
  demo: boolean;
}): Promise<LyricDraft> {
  const joined = [input.theme, input.mood, input.genre, input.note, ...input.history.map((item) => item.content)].join("\n");
  const screened = screenText(joined, "lyrics");
  if (!screened.ok) {
    return { lyrics: "", reply: screened.reason, provider: input.demo ? "demo" : "cixy", blocked: screened.reason };
  }

  if (input.demo || !process.env.ANTHROPIC_API_KEY) {
    if (!input.demo) {
      return {
        lyrics: "",
        reply: "Cixy is not configured. Add ANTHROPIC_API_KEY, or open the demo to co-write a draft.",
        provider: "demo",
        blocked: null,
      };
    }
    return demoDraft(input.theme, input.mood, input.genre, input.note);
  }

  const prompt = [
    "Co-write ORIGINAL lyrics for the signed-in person's own voice. Never imitate an artist, never use a famous name, never quote or closely paraphrase a known song.",
    `Theme: ${input.theme}`,
    `Mood: ${input.mood}`,
    `Genre: ${input.genre}`,
    input.note ? `Their note: ${input.note}` : "",
    "Return a title, verse 1, chorus, and verse 2. Plain text with [Verse] and [Chorus] labels. No advice paragraph.",
  ]
    .filter(Boolean)
    .join("\n");

  const history = input.history.slice(-6).map((item) => ({
    role: item.role === "cixy" ? ("assistant" as const) : ("user" as const),
    content: item.content,
  }));
  const { reply } = await askCixy([...history, { role: "user", content: prompt }]);
  const outputScreen = screenText(reply, "lyrics");
  if (!outputScreen.ok) {
    return { lyrics: "", reply: outputScreen.reason, provider: "cixy", blocked: outputScreen.reason };
  }
  return { lyrics: reply.trim(), reply: "Here is a draft. Change any line you want, then generate.", provider: "cixy", blocked: null };
}
