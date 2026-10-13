/**
 * The one voice-setup script. RecordPanel reads this file and does not keep a second copy.
 * Lines are original and phonetically balanced: vowels, stops, fricatives, affricates,
 * nasals, liquids, and glides, plus one sung line.
 */

export type ScriptCueKind = "room" | "mic" | "consent" | "speech" | "sing";

export type ScriptCue = {
  id: string;
  kind: ScriptCueKind;
  title: string;
  /** Words the person reads, or the check they perform. */
  text: string;
  /** How to pace this cue. */
  pace: string;
  /** A comfortable length for this cue, in seconds. */
  seconds: number;
};

/**
 * Read aloud, in the style of an ElevenLabs verification line:
 * the person states that they own the voice and consents to a synthetic version of it.
 */
export const CONSENT_LINE =
  "I am the owner of this voice, and I give Lyrixis permission to use this recording to create a private synthetic version of my voice.";

export const RETAKE_TIPS = [
  "If the meter barely moves, the mic is muted or too far away. Come closer and try that line again.",
  "If the bar slams to the end, the mic is clipping. Move back a hand's width and re-record that line.",
  "A fan, a street, or a television in the room gets trained into the voice. Close it off, then re-record the noisy line.",
  "Read the line as written. Skipping words makes the sample less useful.",
  "You can re-record one line without starting the whole script over.",
] as const;

export const RECORDING_SCRIPT: readonly ScriptCue[] = [
  {
    id: "room",
    kind: "room",
    title: "Room check",
    text: "Stay quiet. Do not speak, tap, or rustle for a few seconds.",
    pace: "Silence. About three seconds. The meter should sit near the bottom.",
    seconds: 3,
  },
  {
    id: "mic",
    kind: "mic",
    title: "Mic check",
    text: "Testing, one, two, three. This is my voice.",
    pace: "Normal speaking volume, about a hand's width from the mic. About four seconds.",
    seconds: 4,
  },
  {
    id: "consent",
    kind: "consent",
    title: "Consent, read aloud",
    text: CONSENT_LINE,
    pace: "Read it once, steadily, the way you would state a fact. Do not whisper, and do not rush the commas.",
    seconds: 12,
  },
  {
    id: "speech-1",
    kind: "speech",
    title: "Line 1",
    text: "The beige fox jumped the quick silver gate by the wide river.",
    pace: "Natural pace. Pause at the end. About six seconds.",
    seconds: 6,
  },
  {
    id: "speech-2",
    kind: "speech",
    title: "Line 2",
    text: "She sells fresh fish and three thick chips at the shop.",
    pace: "Keep the sh, ch, and th sounds clear. Do not speed up. About six seconds.",
    seconds: 6,
  },
  {
    id: "speech-3",
    kind: "speech",
    title: "Line 3",
    text: "I bought a blue book and put the full moon photo on the booth.",
    pace: "Let the oo and aw vowels last a little longer. About six seconds.",
    seconds: 6,
  },
  {
    id: "speech-4",
    kind: "speech",
    title: "Line 4",
    text: "Pat the cat, then tap the top of the pot with a pat.",
    pace: "Crisp consonants. A short pause after the comma. About five seconds.",
    seconds: 5,
  },
  {
    id: "speech-5",
    kind: "speech",
    title: "Line 5",
    text: "Young yellow yams and red wagons roll along the long lawn.",
    pace: "Easy pace. Keep the y, w, and ng sounds. About six seconds.",
    seconds: 6,
  },
  {
    id: "speech-6",
    kind: "speech",
    title: "Line 6",
    text: "Measure the pleasure of a vision in the azure garage.",
    pace: "Soft zh sounds. Do not shout. About six seconds.",
    seconds: 6,
  },
  {
    id: "speech-7",
    kind: "speech",
    title: "Line 7",
    text: "Think of the thin path through the north, then this smooth weather.",
    pace: "Both th sounds, unvoiced then voiced. Pause at the comma. About seven seconds.",
    seconds: 7,
  },
  {
    id: "speech-8",
    kind: "speech",
    title: "Line 8",
    text: "Are our hours ours, or are the early birds already awake?",
    pace: "Question at the end, voice rising a little. About six seconds.",
    seconds: 6,
  },
  {
    id: "sing",
    kind: "sing",
    title: "Sing a line",
    text: "La la la, hold the note, then hum a soft low tone.",
    pace: "Hum first, then sing the words on one comfortable pitch. About eight seconds.",
    seconds: 8,
  },
];

export function scriptProgress(doneIds: readonly string[], script: readonly ScriptCue[] = RECORDING_SCRIPT) {
  const done = script.filter((cue) => doneIds.includes(cue.id)).length;
  const total = script.length;
  return {
    done,
    total,
    label: `${done} of ${total}`,
    ratio: total === 0 ? 0 : done / total,
    complete: total > 0 && done === total,
  };
}

/** Training audio is every spoken and sung cue. The quiet room check stays out of the file. */
export function cuesForSample(script: readonly ScriptCue[] = RECORDING_SCRIPT): ScriptCue[] {
  return script.filter((cue) => cue.kind !== "room");
}
