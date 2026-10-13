export type DistributorName = "stub" | "too_lost" | "revelator";

export type DistributorRelease = {
  id: string;
  artistName: string;
  title: string;
  credits: { writer: string; producer: string };
  ai: { vocals: boolean; music: boolean; lyrics: boolean };
  royaltyUserBps: number;
  royaltyLyrixisBps: number;
  audioUrl: string | null;
  coverUrl: string | null;
};

export type DistributorResult =
  | { ok: true; distributor: DistributorName; ref: string; status: "held" | "submitted" }
  | { ok: false; distributor: DistributorName; missing?: string; message: string };

/** Shown anywhere a release is discussed. A song is never described as live on a store. */
export const PENDING_DISTRIBUTOR_NOTE =
  "Pending distributor. Lyrixis has not contracted a distributor, so this song is not on Spotify, Apple Music, Tidal, or any other store.";

export type PendingDistributorResult = {
  ok: true;
  distributor: "pending";
  ref: string;
  status: "pending distributor";
  message: string;
};

/**
 * The only distributor the app calls. No vendor is contracted, so submit never
 * reaches a store API and the status is always "pending distributor".
 */
export interface DistributorProvider {
  readonly name: "pending";
  submit(release: DistributorRelease): Promise<PendingDistributorResult>;
}

export const pendingDistributor: DistributorProvider = {
  name: "pending",
  async submit(release) {
    return {
      ok: true,
      distributor: "pending",
      ref: `pending-${release.id}`,
      status: "pending distributor",
      message: PENDING_DISTRIBUTOR_NOTE,
    };
  },
};

/** Public store status. Rejected and failed stay as they are. Nothing else is "live". */
export function displayStoreStatus(status: string): "pending distributor" | "rejected" | "failed" {
  if (status === "rejected" || status === "failed") return status;
  return "pending distributor";
}

export function selectedDistributor(env: Record<string, string | undefined> = process.env): DistributorName {
  const value = (env.VOICE_SONGS_DISTRIBUTOR || "").trim().toLowerCase();
  if (value === "too_lost" || value === "toolost") return "too_lost";
  if (value === "revelator") return "revelator";
  return "stub";
}

export function distributorKeyName(name: DistributorName): string | null {
  if (name === "too_lost") return "TOO_LOST_API_KEY";
  if (name === "revelator") return "REVELATOR_API_KEY";
  return null;
}

export async function submitRelease(
  release: DistributorRelease,
  env: Record<string, string | undefined> = process.env,
  post: (url: string, key: string, body: unknown) => Promise<{ ok: boolean; id?: string; message?: string }> = defaultPost,
): Promise<DistributorResult> {
  const name = selectedDistributor(env);
  if (name === "stub") {
    return {
      ok: true,
      distributor: "stub",
      ref: `stub-${release.id}`,
      status: "held",
    };
  }
  const keyName = distributorKeyName(name)!;
  const key = env[keyName]?.trim();
  if (!key) {
    return { ok: false, distributor: name, missing: keyName, message: `Not configured. Missing ${keyName}.` };
  }
  const base = (name === "too_lost" ? env.TOO_LOST_API_BASE : env.REVELATOR_API_BASE)?.replace(/\/$/, "")
    || (name === "too_lost" ? "https://api.toolost.com" : "https://api.revelator.com");
  const response = await post(`${base}/v1/releases`, key, {
    title: release.title,
    artistName: release.artistName,
    credits: release.credits,
    aiDisclosure: release.ai,
    royaltySplit: { userBps: release.royaltyUserBps, lyrixisBps: release.royaltyLyrixisBps },
    audioUrl: release.audioUrl,
    coverUrl: release.coverUrl,
    externalId: release.id,
  });
  if (!response.ok) {
    return { ok: false, distributor: name, message: response.message || "The distributor rejected the release." };
  }
  return { ok: true, distributor: name, ref: response.id || `${name}-${release.id}`, status: "submitted" };
}

async function defaultPost(url: string, key: string, body: unknown): Promise<{ ok: boolean; id?: string; message?: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as { id?: string; message?: string; error?: string };
  return { ok: response.ok, id: json.id, message: json.message || json.error };
}
