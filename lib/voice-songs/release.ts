import { ROYALTY_LYRIXIS_BPS, ROYALTY_USER_BPS, MAX_RELEASES_PER_MONTH } from "./pricing";
import { screenArtistName, screenVoiceText } from "./safety";

export type ReleaseDraft = {
  artistName: string;
  title: string;
  writer: string;
  producer: string;
  aiVocals: boolean;
  aiMusic: boolean;
  aiLyrics: boolean;
  rightsAccepted: boolean;
  releasesThisMonth: number;
};

export type ReleaseIssue = { ok: false; reason: string };
export type ReleaseOk = {
  ok: true;
  artistName: string;
  title: string;
  credits: { writer: string; producer: string };
  royaltyUserBps: number;
  royaltyLyrixisBps: number;
};

export function reviewRelease(draft: ReleaseDraft): ReleaseOk | ReleaseIssue {
  if (draft.releasesThisMonth >= MAX_RELEASES_PER_MONTH) {
    return { ok: false, reason: "Four releases a month is the limit." };
  }
  const artist = screenArtistName(draft.artistName);
  if (!artist.ok) return { ok: false, reason: artist.reason };
  const title = screenVoiceText(draft.title, "title");
  if (!title.ok) return { ok: false, reason: title.reason };
  if (draft.artistName.trim().length < 2) return { ok: false, reason: "Add the artist name you release under." };
  if (draft.title.trim().length < 1) return { ok: false, reason: "Add a title." };
  if (!draft.writer.trim()) return { ok: false, reason: "Name the writer. That is you, unless you co-wrote it." };
  if (!draft.aiVocals || !draft.aiMusic || !draft.aiLyrics) {
    return { ok: false, reason: "AI vocals, AI music, and AI-assisted lyrics stay disclosed on every release." };
  }
  if (!draft.rightsAccepted) return { ok: false, reason: "Accept the rights statement before you submit." };
  return {
    ok: true,
    artistName: draft.artistName.trim(),
    title: draft.title.trim(),
    credits: { writer: draft.writer.trim(), producer: draft.producer.trim() || draft.writer.trim() },
    royaltyUserBps: ROYALTY_USER_BPS,
    royaltyLyrixisBps: ROYALTY_LYRIXIS_BPS,
  };
}

export const RIGHTS_STATEMENT =
  "I own this recording and this voice, or I have the rights to release them. The vocal is my own voice, not a clone of someone else. I understand Spotify pays only after 1,000 streams in a year, and that copyright may not cover the parts a model generated on its own.";

export const AI_DISCLOSURE = {
  vocals: "AI vocals, sung with the account holder's own voice model",
  music: "AI music",
  lyrics: "AI-assisted lyrics",
};
