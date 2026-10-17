"use client";

import { useState } from "react";
import { CARD_COMING_SOON } from "@/lib/card-copy";

export function CardPayButton({
  product,
  trackId,
  kind,
  label,
  className = "btn-secondary px-4 py-2 text-sm",
}: {
  product: "all_access" | "track";
  trackId?: string;
  kind?: "catalog" | "upload";
  label: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product, trackId, kind }),
      });
      const json = (await response.json()) as { url?: string; error?: { message?: string } };
      if (response.status === 401) {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }
      if (!response.ok || !json.url) {
        setError(json.error?.message || `${CARD_COMING_SOON}. You can pay with Ixis.`);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Could not start card checkout. You can pay with Ixis.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" className={className} disabled={busy} onClick={() => void pay()}>
        {busy ? "Opening checkout…" : label}
      </button>
      {error && <span className="text-xs text-magenta">{error}</span>}
    </span>
  );
}
