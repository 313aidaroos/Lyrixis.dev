import type { VoiceSongSku } from "./pricing";
import type { QualityReport } from "./audio";

export type VoiceStatus =
  | "draft"
  | "recorded"
  | "consented"
  | "verified"
  | "training"
  | "ready"
  | "failed"
  | "deleted";

export type SongStatus = "draft" | "generating" | "preview" | "failed";
export type TakeStatus = "queued" | "running" | "ready" | "failed";
export type ReleaseStatus = "queued" | "in_review" | "approved" | "rejected" | "submitted";
export type PayMethod = "ixis" | "card" | "allowance" | "owner";
export type PayStatus = "pending" | "captured" | "released";

export type VoiceRow = {
  id: string;
  userId: string;
  status: VoiceStatus;
  samplePath: string | null;
  sampleSeconds: number | null;
  sampleMime: string | null;
  quality: QualityReport | null;
  consentText: string | null;
  consentAcceptedAt: string | null;
  livenessPhrase: string | null;
  livenessTranscript: string | null;
  livenessScore: number | null;
  livenessPassed: boolean;
  provider: "replicate" | "kits" | "demo" | null;
  providerModelRef: string | null;
  trainError: string | null;
  isDemo: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LyricMessage = { role: "user" | "cixy"; content: string };

export type SongRow = {
  id: string;
  userId: string;
  voiceId: string;
  title: string;
  theme: string;
  mood: string;
  genre: string;
  lyrics: string;
  messages: LyricMessage[];
  status: SongStatus;
  funding: PayMethod | "demo" | null;
  receiptId: string | null;
  takesIncluded: number;
  error: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TakeRow = {
  id: string;
  songId: string;
  userId: string;
  takeNumber: number;
  kind: "included" | "extra";
  status: TakeStatus;
  mixPath: string | null;
  mime: string | null;
  voiceMix: number;
  musicProvider: string | null;
  voiceProvider: string | null;
  watermarked: boolean;
  notes: string[];
  error: string | null;
  isDemo: boolean;
  createdAt: string;
};

export type AiDisclosure = {
  vocals: "ai_voice_clone_own";
  music: "ai_generated";
  lyrics: "ai_assisted";
  c2pa: boolean;
  notice: string;
};

export type ReleaseRow = {
  id: string;
  songId: string;
  takeId: string;
  userId: string;
  artistName: string;
  title: string;
  artworkPath: string | null;
  credits: string;
  aiDisclosure: AiDisclosure;
  rightsAcceptedAt: string | null;
  royaltyUserBps: number;
  royaltyLyrixisBps: number;
  status: ReleaseStatus;
  reviewNote: string | null;
  distributor: "toolost" | "revelator" | "unconfigured";
  distributorStatus: "not_configured" | "queued" | "submitted" | "failed";
  distributorRef: string | null;
  distributorMessage: string | null;
  funding: PayMethod | "demo" | null;
  receiptId: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaymentRow = {
  id: string;
  userId: string;
  sku: VoiceSongSku;
  method: PayMethod;
  ixis: number;
  usdCents: number;
  status: PayStatus;
  receiptId: string | null;
  idempotencyKey: string;
  songId: string | null;
  consumed: boolean;
  checkoutUrl: string | null;
  isDemo: boolean;
  createdAt: string;
};

export type UsageRow = {
  userId: string;
  period: string;
  songsUsed: number;
  releasesUsed: number;
  setupCovered: boolean;
};

export type Actor = {
  userId: string;
  email: string;
  demo: boolean;
  /** Demo-only preview of the $30 plan allowances. */
  demoAllowance: boolean;
  owner: boolean;
  walletOwner: string;
};

export const CONSENT_TEXT =
  "I am an adult. This is my own voice. I let Lyrixis store this recording and train a private voice model that only my Apixis ID can use, only to sing songs I ask for. Lyrixis will not use my voice to train other people’s models. I can delete the model and the recording in one step. I will not use this to copy another person, a celebrity, or an artist.";

export const AI_DISCLOSURE_NOTICE =
  "This recording uses an AI clone of the artist’s own consented voice, AI-generated music, and AI-assisted lyrics. Spotify may not pay on tracks under 1,000 streams a year. Copyright may not cover the purely AI-generated parts. A person reviews this release before it can go to stores.";

export function aiDisclosure(c2pa: boolean): AiDisclosure {
  return {
    vocals: "ai_voice_clone_own",
    music: "ai_generated",
    lyrics: "ai_assisted",
    c2pa,
    notice: AI_DISCLOSURE_NOTICE,
  };
}
