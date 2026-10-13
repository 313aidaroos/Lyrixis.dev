import { ROYALTY_LYRIXIS_BPS, ROYALTY_USER_BPS, MAX_RELEASES_PER_MONTH } from "./pricing";
import { screenArtistName, screenVoiceText } from "./safety";

export const RELEASE_GENRES = ["Pop", "R&B", "Indie", "Folk", "Hip-hop", "Electronic", "Rock", "Afrobeats", "Latin", "Country"] as const;

export type WriterSplit = { name: string; sharePercent: number };

export type ReleaseDraft = {
  artistName: string;
  title: string;
  genre: string;
  releaseDate: string;
  explicit: boolean;
  writers: WriterSplit[];
  producer: string;
  aiVocals: boolean;
  aiMusic: boolean;
  aiLyrics: boolean;
  rightsAccepted: boolean;
  releasesThisMonth: number;
};

export type ReleaseCredits = {
  writer: string;
  producer: string;
  genre: string;
  releaseDate: string;
  explicit: boolean;
  writers: WriterSplit[];
};

export type ReleaseIssue = { ok: false; reason: string };
export type ReleaseOk = {
  ok: true;
  artistName: string;
  title: string;
  genre: string;
  releaseDate: string;
  explicit: boolean;
  writers: WriterSplit[];
  credits: ReleaseCredits;
  royaltyUserBps: number;
  royaltyLyrixisBps: number;
};

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

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
  const genre = screenVoiceText(draft.genre, "genre");
  if (!genre.ok) return { ok: false, reason: genre.reason };
  if (draft.genre.trim().length < 2) return { ok: false, reason: "Pick a genre." };
  if (!validDate(draft.releaseDate)) return { ok: false, reason: "Add a real release date." };
  if (typeof draft.explicit !== "boolean") return { ok: false, reason: "Say whether the song is explicit." };
  if (!draft.writers.length) return { ok: false, reason: "Name the writers and their splits." };
  const writers: WriterSplit[] = [];
  for (const writer of draft.writers) {
    const name = writer.name.trim();
    const screened = screenVoiceText(name, "writer");
    if (!screened.ok) return { ok: false, reason: screened.reason };
    if (name.length < 2) return { ok: false, reason: "Each writer needs a name." };
    if (!Number.isInteger(writer.sharePercent) || writer.sharePercent < 1 || writer.sharePercent > 100) {
      return { ok: false, reason: "Each writer split is a whole percent from 1 to 100." };
    }
    writers.push({ name, sharePercent: writer.sharePercent });
  }
  const share = writers.reduce((sum, writer) => sum + writer.sharePercent, 0);
  if (share !== 100) return { ok: false, reason: "Writer splits have to add up to 100%." };
  const producerName = draft.producer.trim();
  if (producerName) {
    const producer = screenVoiceText(producerName, "producer");
    if (!producer.ok) return { ok: false, reason: producer.reason };
  }
  if (!draft.aiVocals || !draft.aiMusic || !draft.aiLyrics) {
    return { ok: false, reason: "AI vocals, AI music, and AI-assisted lyrics stay disclosed on every release." };
  }
  if (!draft.rightsAccepted) return { ok: false, reason: "Confirm the rights before you submit." };
  const writerLabel = writers.map((writer) => `${writer.name} ${writer.sharePercent}%`).join(", ");
  return {
    ok: true,
    artistName: draft.artistName.trim(),
    title: draft.title.trim(),
    genre: draft.genre.trim(),
    releaseDate: draft.releaseDate,
    explicit: draft.explicit,
    writers,
    credits: {
      writer: writerLabel,
      producer: producerName || writers[0].name,
      genre: draft.genre.trim(),
      releaseDate: draft.releaseDate,
      explicit: draft.explicit,
      writers,
    },
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
