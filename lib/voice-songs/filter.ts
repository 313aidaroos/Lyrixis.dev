/**
 * Own voice only. Blocks celebrity and artist-name prompts in lyrics, generation
 * prompts, and release metadata. Song-title lookalikes that are just common words
 * are left alone; distinctive titles and "sing like X" requests are not.
 */

const ARTISTS = [
  "taylor swift", "drake", "beyonce", "beyoncé", "the weeknd", "bad bunny", "ariana grande",
  "ed sheeran", "billie eilish", "rihanna", "eminem", "kanye west", "travis scott", "kendrick lamar",
  "justin bieber", "selena gomez", "dua lipa", "olivia rodrigo", "harry styles", "adele", "lady gaga",
  "bruno mars", "post malone", "the beatles", "michael jackson", "madonna", "elvis presley",
  "whitney houston", "frank sinatra", "bob dylan", "bob marley", "freddie mercury", "david bowie",
  "prince rogers", "stevie wonder", "aretha franklin", "nina simone", "amy winehouse", "sza",
  "doja cat", "nicki minaj", "cardi b", "megan thee stallion", "lil nas x", "juice wrld", "xxxtentacion",
  "playboi carti", "future hendrix", "metro boomin", "tyler the creator", "frank ocean", "sza",
  "lana del rey", "lorde", "billie holiday", "ella fitzgerald", "louis armstrong", "jay z", "jay-z",
  "kanye", "weeknd", "gaga", "rihanna", "beyonce", "shakira", "j balvin", "maluma", "rosalia", "rosalía",
  "bts", "blackpink", "newjeans", "twice", "stray kids", "coldplay", "radiohead", "nirvana", "metallica",
  "ac/dc", "rolling stones", "led zeppelin", "pink floyd", "u2", "maroon 5", "imagine dragons",
  "twenty one pilots", "the weeknd", "sabrina carpenter", "chappell roan", "charli xcx", "ice spice",
  "central cee", "burna boy", "wizkid", "davido", "tems", "ayra starr", "rema", "asake",
  "the notorious b.i.g.", "notorious big", "tupac", "2pac", "biggie", "snoop dogg", "dr dre", "dr. dre",
  "50 cent", "nas", "outkast", "andre 3000", "missy elliott", "lauryn hill", "alicia keys", "john legend",
  "chris brown", "usher", "nelly", "lil wayne", "drake", "nicki", "cardi",
];

/** Distinctive titles. Common words ("hello", "yesterday") are not in this list. */
const TITLES = [
  "bohemian rhapsody", "billie jean", "smells like teen spirit", "rolling in the deep",
  "uptown funk", "shape of you", "blinding lights", "purple rain", "like a virgin",
  "single ladies", "hotline bling", "god's plan", "gods plan", "sicko mode", "old town road",
  "drivers license", "blank space", "shake it off", "happier than ever", "watermelon sugar",
  "paint the town red", "good luck babe",
];

const IMPERSONATION =
  /\b(sing(?:s|ing)? like|sounds? like|voice of|clone of|cloned from|cover of|as sung by|as performed by|impersonat\w*|in the style of|like the voice of)\b/i;

export type ScreenField = "lyrics" | "prompt" | "metadata" | "artist";

export type ScreenResult = { ok: true } | { ok: false; reason: string; match: string };

function normalize(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/\s+/g, " ").trim();
}

function containsPhrase(haystack: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\s/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

export function screenText(value: string, field: ScreenField = "prompt"): ScreenResult {
  const text = normalize(value);
  if (!text) return { ok: true };

  if (IMPERSONATION.test(text)) {
    return {
      ok: false,
      match: "impersonation",
      reason: "Lyrixis only clones your own voice. Prompts cannot ask for another artist's voice, style, or a cover.",
    };
  }

  for (const name of ARTISTS) {
    if (containsPhrase(text, name)) {
      return {
        ok: false,
        match: name,
        reason: `“${name}” can’t be used in ${field === "artist" ? "your artist name" : "lyrics or prompts"}. Voice Songs is your own voice only.`,
      };
    }
  }

  for (const title of TITLES) {
    if (containsPhrase(text, title)) {
      return {
        ok: false,
        match: title,
        reason: `That title is someone else’s song. Write an original with Cixy instead.`,
      };
    }
  }

  return { ok: true };
}

export function screenFields(fields: Record<string, string | null | undefined>): ScreenResult {
  for (const [field, value] of Object.entries(fields)) {
    if (!value) continue;
    const kind: ScreenField = field === "artistName" || field === "artist" ? "artist" : field === "lyrics" ? "lyrics" : "prompt";
    const result = screenText(value, kind);
    if (!result.ok) return result;
  }
  return { ok: true };
}
