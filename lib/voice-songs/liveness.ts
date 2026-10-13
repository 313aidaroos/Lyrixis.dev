/** Read-aloud phrases. Neutral, short, and not a famous lyric. */

export const LIVENESS_PHRASES = [
  "My voice is my own and I am recording it for my song.",
  "I am speaking in the Lyrixis studio on a quiet afternoon.",
  "The chorus comes back and the verse tells the story.",
  "I count three slow breaths and then I sing the title.",
  "This recording is only for the account I signed in with.",
  "Blue lights on the console, a simple melody, my own words.",
  "I confirm I am the person whose voice is in this sample.",
  "Tonight the song starts quiet and opens on the second chorus.",
  "I will not borrow another singer's name or their melody.",
  "The drum hits on two and four, and I stay on the lyric.",
] as const;

export function newLivenessPhrase(random: () => number = Math.random): string {
  const index = Math.min(LIVENESS_PHRASES.length - 1, Math.floor(random() * LIVENESS_PHRASES.length));
  return LIVENESS_PHRASES[index];
}

function tokens(value: string): string[] {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

/** Share of expected words that show up in the transcript, in any order. */
export function phraseMatchScore(expected: string, heard: string): number {
  const want = tokens(expected);
  if (want.length === 0) return 0;
  const got = new Set(tokens(heard));
  const hits = want.filter((word) => got.has(word)).length;
  return hits / want.length;
}

export function phraseMatches(expected: string, heard: string, minimum = 0.72): boolean {
  return phraseMatchScore(expected, heard) >= minimum;
}
