/** Plain-language consent. The user accepts this exact text before a model is trained. */

export const VOICE_CONSENT_VERSION = "voice-consent-2026-10-12";

export const VOICE_CONSENT_TEXT = [
  "I am recording my own voice. I am not imitating another person, and I will not ask Lyrixis to copy a famous singer.",
  "Lyrixis may use this recording only to build a private voice model for my Apixis ID, and only to sing the songs I request.",
  "Lyrixis will not use this recording to train a model for anyone else.",
  "I can delete the recording and the model in one step. Deleting removes the audio from Lyrixis storage.",
  "A voice recording is biometric data. I have read that laws such as Illinois BIPA and Tennessee's ELVIS Act can apply. This screen is not legal advice.",
  "The finished song can be watermarked on preview. A store release needs a separate rights confirmation and an AI disclosure.",
].join(" ");

export function consentHash(text: string = VOICE_CONSENT_TEXT): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
