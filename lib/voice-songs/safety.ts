/**
 * Own-voice only. Blocks prompts that ask for another artist's voice, title, or lyrics.
 * Single common words (pink, queen) are blocked only next to an imitation phrase,
 * so ordinary lyrics can still use them.
 */

const IMITATION =
  /\b(in the style of|style of|sounds like|sing like|singing like|voice of|clone of|cloned voice|impersonat\w*|imitat\w*|as sung by|cover of|ai cover|deepfake|sounds exactly like|make it sound like|voice clone of)\b/i;

/** Multi-word public figures. Matched anywhere in a prompt, title, or artist field. */
const NAMED_ACTS = [
  "taylor swift",
  "ariana grande",
  "billie eilish",
  "the weeknd",
  "bad bunny",
  "kendrick lamar",
  "kanye west",
  "ye west",
  "beyonce",
  "beyoncé",
  "rihanna",
  "adele",
  "ed sheeran",
  "justin bieber",
  "selena gomez",
  "dua lipa",
  "harry styles",
  "olivia rodrigo",
  "sabrina carpenter",
  "chappell roan",
  "travis scott",
  "post malone",
  "bruno mars",
  "lady gaga",
  "katy perry",
  "miley cyrus",
  "elvis presley",
  "frank sinatra",
  "michael jackson",
  "whitney houston",
  "mariah carey",
  "britney spears",
  "eminem",
  "jay z",
  "jay-z",
  "nicki minaj",
  "cardi b",
  "doja cat",
  "sza",
  "frank ocean",
  "lana del rey",
  "stevie wonder",
  "bob dylan",
  "bob marley",
  "john lennon",
  "paul mccartney",
  "freddie mercury",
  "david bowie",
  "elton john",
  "madonna",
  "shakira",
  "jennifer lopez",
  "marc anthony",
  "daddy yankee",
  "j balvin",
  "peso pluma",
  "burna boy",
  "wizkid",
  "bts",
  "blackpink",
  "new jeans",
  "stray kids",
  "the beatles",
  "rolling stones",
  "pink floyd",
  "led zeppelin",
  "queen band",
  "coldplay",
  "imagine dragons",
  "maroon 5",
  "one direction",
  "twenty one pilots",
  "morgan wallen",
  "luke combs",
  "chris stapleton",
  "dolly parton",
  "willie nelson",
  "johnny cash",
  "tupac shakur",
  "notorious b.i.g",
  "notorious big",
  "ice spice",
  "central cee",
  "charli xcx",
  "troye sivan",
  "the week end",
];

/** Distinctive single names. Only blocked with an imitation phrase, or as the entire artist field. */
const SINGLE_NAMES = [
  "drake",
  "beyonce",
  "beyoncé",
  "rihanna",
  "adele",
  "eminem",
  "madonna",
  "shakira",
  "prince",
  "cher",
  "pink",
  "weeknd",
  "sza",
  "wizkid",
  "twice",
];

export type ScreenResult = { ok: true } | { ok: false; reason: string; match: string };

function norm(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function mentions(text: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(text);
}

export function screenVoiceText(value: string, field = "text"): ScreenResult {
  const text = norm(value);
  if (!text) return { ok: true };
  for (const name of NAMED_ACTS) {
    if (mentions(text, name)) {
      return { ok: false, reason: `${field} names another artist. Voice Songs only uses your own voice and original lyrics.`, match: name };
    }
  }
  if (IMITATION.test(text)) {
    return {
      ok: false,
      reason: `${field} asks to imitate someone else. Describe the mood and genre in your own words.`,
      match: text.match(IMITATION)?.[0] ?? "imitation",
    };
  }
  return { ok: true };
}

/** Artist / stage name on a release: the whole field cannot be a famous name. */
export function screenArtistName(value: string): ScreenResult {
  const named = screenVoiceText(value, "artist name");
  if (!named.ok) return named;
  const text = norm(value);
  if (SINGLE_NAMES.includes(text)) {
    return {
      ok: false,
      reason: "That artist name matches a well-known act. Use the name you release under, not someone else's.",
      match: text,
    };
  }
  return { ok: true };
}

export function screenFields(fields: Record<string, string | null | undefined>): ScreenResult {
  for (const [field, value] of Object.entries(fields)) {
    if (!value) continue;
    const result = field === "artist" || field === "artistName" ? screenArtistName(value) : screenVoiceText(value, field);
    if (!result.ok) return result;
  }
  return { ok: true };
}
