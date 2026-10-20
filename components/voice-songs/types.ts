export type StudioProviders = {
  elevenlabs: boolean;
  replicate: boolean;
  kits: boolean;
  speech: boolean;
  mock: boolean;
  missing: string[];
  optionalMissing: string[];
  musicReady: boolean;
  voiceReady: boolean;
  liveReady: boolean;
  /** False until a request-time read has filled this object. */
  checked?: boolean;
};

export type StudioProfile = {
  id: string;
  status: string;
  consentAccepted: boolean;
  livenessPassed: boolean;
  livenessMethod: string | null;
  phrase: string | null;
  sampleSeconds: number | null;
  hasModel: boolean;
  provider: string | null;
  training: boolean;
} | null;

export type StudioSong = {
  id: string;
  title: string;
  theme: string | null;
  mood: string | null;
  genre: string | null;
  lyrics: string;
  status: string;
  funding: string;
  takesAllowed: number;
  takesUsed: number;
  watermarked: boolean;
  providerMusic: string | null;
  providerVoice: string | null;
  error: string | null;
  hasAudio: boolean;
  createdAt: string;
};

export type StudioPayload = {
  signedIn: boolean;
  owner: boolean;
  ownerEmail: boolean;
  email?: string;
  providers: StudioProviders;
  consent: string;
  database: boolean;
  databaseMessage?: string;
  profile: StudioProfile;
  songs: StudioSong[];
  payments?: { card: boolean; wallet: boolean; live?: boolean };
};
