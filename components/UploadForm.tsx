"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ApiError = { error?: { message?: string } | string; message?: string };

function errorMessage(json: ApiError, fallback: string): string {
  if (typeof json.error === "string") return json.message ?? json.error;
  return json.error?.message ?? json.message ?? fallback;
}

/**
 * PUT the file straight into Supabase Storage with the one-time signed upload token
 * (same request shape as supabase-js `uploadToSignedUrl`), reporting progress.
 * The audio never passes through a Vercel function (4.5 MB body limit).
 */
function uploadToSignedUrl(signedUrl: string, file: File, onProgress: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anonKey) {
      xhr.setRequestHeader("apikey", anonKey);
      xhr.setRequestHeader("Authorization", `Bearer ${anonKey}`);
    }
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
        return;
      }
      let detail = "";
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        detail = body.message ?? body.error ?? "";
      } catch {
        /* not JSON */
      }
      if (xhr.status === 413 || /maximum allowed size|too large/i.test(detail)) {
        reject(new Error("File is larger than the 100 MB upload limit."));
        return;
      }
      reject(new Error(detail ? `Upload failed: ${detail}` : `Upload failed (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.send(body);
  });
}

export function UploadForm({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rights, setRights] = useState(false);
  const [stage, setStage] = useState<"idle" | "preparing" | "uploading" | "finishing">("idle");
  const [progress, setProgress] = useState(0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!rights) {
      setError("You must confirm you have the rights to process this recording.");
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("audio");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose an audio file first.");
      return;
    }
    const title = String(data.get("title") ?? "").trim();
    const artist = String(data.get("artist") ?? "").trim();

    setPending(true);
    setProgress(0);
    if (demo) {
      const query = new URLSearchParams({ demo: "1", title: title || "Untitled", artist: artist || "Demo artist" });
      router.push(`/tracks/demo?${query.toString()}`);
      return;
    }
    try {
      // 1) Ask for a one-time signed upload URL (metadata only).
      setStage("preparing");
      const prep = await fetch("/api/tracks/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name || "audio",
          mime_type: file.type || "",
          size: file.size,
          rights_confirmed: true,
        }),
      });
      const prepJson = (await prep.json().catch(() => ({}))) as ApiError & {
        upload_id?: string;
        path?: string;
        signed_url?: string;
      };
      if (prep.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/upload")}`);
        return;
      }
      if (!prep.ok || !prepJson.upload_id || !prepJson.path || !prepJson.signed_url) {
        throw new Error(errorMessage(prepJson, "Could not start the upload."));
      }

      // 2) Upload the file straight to private Storage.
      setStage("uploading");
      await uploadToSignedUrl(prepJson.signed_url, file, setProgress);

      // 3) Create the track and queue processing (metadata only).
      setStage("finishing");
      const response = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_id: prepJson.upload_id,
          path: prepJson.path,
          filename: file.name || "audio",
          title: title || null,
          artist: artist || null,
          rights_confirmed: true,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as ApiError & { track_id?: string };
      if (!response.ok) {
        throw new Error(errorMessage(json, "Upload failed."));
      }
      if (!json.track_id) {
        throw new Error("Server did not return a track id.");
      }
      router.push(`/tracks/${json.track_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPending(false);
      setStage("idle");
    }
  }

  const buttonLabel =
    stage === "preparing"
      ? "Preparing…"
      : stage === "uploading"
        ? `Uploading… ${Math.round(progress * 100)}%`
        : stage === "finishing"
          ? "Queuing for lyrics…"
          : "Upload and process";

  return (
    <form className="page-panel space-y-6" onSubmit={(event) => void onSubmit(event)}>
      <div>
        <label className="label" htmlFor="audio">
          Audio file
        </label>
        <input
          id="audio"
          name="audio"
          className="input"
          type="file"
          accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/x-m4a,audio/ogg,.mp3,.wav,.flac,.m4a,.ogg"
          required
        />
        <p className="mt-2 text-xs text-ink-3">MP3, WAV, FLAC, M4A, or OGG. Max 100 MB, 12 minutes.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" className="input" placeholder="Optional — read from tags if empty" />
        </div>
        <div>
          <label className="label" htmlFor="artist">
            Artist
          </label>
          <input id="artist" name="artist" className="input" placeholder="Optional" />
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm text-ink-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={rights}
          onChange={(event) => setRights(event.target.checked)}
          required
        />
        <span>
          I confirm I have the rights to upload this recording and to generate lyrics from it. Lyrixis stores this
          confirmation and timestamp as a legal record.
        </span>
      </label>
      {stage === "uploading" && (
        <div
          className="h-2 w-full overflow-hidden rounded-full border border-line bg-surface"
          role="progressbar"
          aria-label="Upload progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div className="h-full rounded-full" style={{ width: `${Math.round(progress * 100)}%`, background: "var(--spectrum)" }} />
        </div>
      )}
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button className="btn-primary" type="submit" disabled={pending || !rights}>
        {buttonLabel}
      </button>
    </form>
  );
}
