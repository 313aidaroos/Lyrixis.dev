"use client";

/** Same request shape as the track uploader: one-time Supabase signed upload, audio stays off the Vercel body limit. */
export function uploadToSignedUrl(signedUrl: string, file: Blob, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anonKey) {
      xhr.setRequestHeader("apikey", anonKey);
      xhr.setRequestHeader("Authorization", `Bearer ${anonKey}`);
    }
    xhr.setRequestHeader("x-upsert", "true");
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading the recording."));
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file, filename);
    xhr.send(body);
  });
}
