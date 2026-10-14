'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CARD_COMING_SOON } from '@/lib/card-copy';

export function RedeemButton({
  trackId,
  isUnlocked,
  kind = 'catalog',
  onUnlocked,
}: {
  trackId: string;
  isUnlocked: boolean;
  /** "upload" = the user's own uploaded track (TrackView shows its own exports once unlocked). */
  kind?: 'catalog' | 'upload';
  onUnlocked?: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancel = false;
    void fetch('/api/checkout')
      .then((response) => response.json())
      .then((json: { card?: boolean }) => {
        if (!cancel) setCardReady(Boolean(json.card));
      })
      .catch(() => {
        if (!cancel) setCardReady(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  if (isUnlocked && kind === 'upload') return null;

  if (isUnlocked) {
    return (
      <div className="card mt-6 bg-cyan/10 border-cyan/30">
        <p className="text-cyan font-medium">✓ Track unlocked</p>
        <p className="mt-2 text-sm text-ink-2">Download your exports:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["txt", "lrc", "json"] as const).map((f) => (
            <a
              key={f}
              href={`/api/catalog/${encodeURIComponent(trackId)}/export?format=${f}`}
              className="rounded border border-cyan/40 px-3 py-1 text-sm text-cyan hover:bg-cyan/10"
            >
              .{f}
            </a>
          ))}
        </div>
      </div>
    );
  }

  const handleRedeem = async () => {
    setLoading(true);
    setError(null);

    // Generate attemptId once per click (retries reuse it)
    const attemptId = crypto.randomUUID();

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': attemptId, // Retry-safe: same key for same button click
        },
        body: JSON.stringify({ trackId, kind }),
      });

      const data = await res.json();

      if (res.status === 401) {
        // Not signed in - redirect to login with next
        const current = window.location.pathname;
        router.push(`/login?next=${encodeURIComponent(current)}`);
        return;
      }

      if (res.status === 402) {
        // Insufficient Ixis - redirect to Wallet
        if (data.buyUrl) {
          window.location.href = data.buyUrl;
        } else {
          setError(data.message || 'Not enough Ixis. Buy Ixis in Apixis Wallet first.');
        }
        return;
      }

      if (!res.ok) {
        setError(typeof data.message === 'string' ? data.message : typeof data.error === 'string' ? data.error : (data.error && typeof data.error.message === 'string') ? data.error.message : 'Redemption failed');
        return;
      }

      // Success - refresh to show unlocked state
      if (onUnlocked) await onUnlocked();
      router.refresh();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCard = async () => {
    setCardLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'track', trackId, kind }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (data.already) {
        if (onUnlocked) await onUnlocked();
        router.refresh();
        return;
      }
      if (!res.ok || !data.url) {
        setError(typeof data.error?.message === 'string' ? data.error.message : `${CARD_COMING_SOON}. You can pay with Ixis.`);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not start card checkout. You can pay with Ixis.');
    } finally {
      setCardLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleRedeem}
          disabled={loading || cardLoading}
          className="btn btn-primary w-full sm:w-auto disabled:opacity-50"
        >
          {loading ? 'Unlocking…' : kind === 'upload' ? 'Unlock full lyrics · 300 Ixis' : 'Redeem · 300 Ixis'}
        </button>
        {cardReady ? (
          <button
            type="button"
            onClick={() => void handleCard()}
            disabled={loading || cardLoading}
            className="btn-secondary w-full px-4 py-2 text-sm disabled:opacity-50 sm:w-auto"
          >
            {cardLoading ? 'Opening checkout…' : 'Pay $3 by card'}
          </button>
        ) : (
          <span className="inline-flex items-center rounded-full border border-gold/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-gold">
            {CARD_COMING_SOON}
          </span>
        )}
      </div>
      {error && (
        <div className="card mt-3 bg-red-500/10 border-red-500/30">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      <p className="mt-2 text-xs text-ink-3">
        {kind === 'upload'
          ? 'Full synced lyrics, corrections, and TXT / SRT / LRC / JSON exports for this song. 300 Ixis ($3).'
          : "Unlock this track's exports for 300 Ixis ($3)."}{' '}
        All-Access is $30 a month when you are on that plan. Pay by card or with Ixis.{' '}
        Not enough Ixis? <a href="https://apixis-wallet.vercel.app/buy" className="text-cyan hover:underline">Buy Ixis</a>
      </p>
    </div>
  );
}
