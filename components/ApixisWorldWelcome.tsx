"use client";
// One-time "Your agent is ready. Enter the Apixis world" card on the Lyrixis dashboard.
// The agent is created server-side by GET /api/apixis/world-agent on the first signed-in load.
// Cixy is the guide, never the person's avatar. Grok Developer Bot, 2026-09-28.
import { useEffect, useState } from "react";
import Image from "next/image";

type View = { ok: boolean; status: "ready" | "invite"; agentName: string | null; showWelcome: boolean; enterUrl: string };

function markSeen(action: "enter" | "dismiss") {
  try {
    void fetch("/api/apixis/world-agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export function ApixisWorldWelcome() {
  const [view, setView] = useState<View | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/apixis/world-agent", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => { if (!cancelled && v?.ok) setView(v); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  if (!view?.showWelcome) return null;
  const ready = view.status === "ready";
  return (
    <section
      aria-labelledby="lx-agent-title"
      data-state={view.status}
      className="card glow-card relative mt-8 overflow-hidden border-violet/40"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "var(--spectrum)" }} />
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <figure className="flex shrink-0 flex-col items-center gap-2">
          <div className="rounded-2xl p-[2px]" style={{ background: "var(--spectrum)" }}>
            <Image src="/cixy/cixy-lyrixis-avatar.webp" alt="Cixy, your guide" width={88} height={88} className="h-[88px] w-[88px] rounded-[14px] bg-surface object-cover" />
          </div>
          <figcaption className="text-center font-mono text-[10px] uppercase tracking-widest text-ink-3">
            <span className="block text-cyan">Cixy</span>your guide
          </figcaption>
        </figure>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan">
            ✦ {ready ? "Apixis world · your agent is ready" : "Apixis world · your own agent"}
          </p>
          <h2 id="lx-agent-title" className="mt-2 font-display text-2xl font-bold">
            {ready ? "Your agent is ready. Enter the Apixis world." : "Your own agent is waiting in the Apixis world."}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
            {ready
              ? "Your Lyrixis account came with your own agent in the Apixis world. It starts in the default Apixis body — make its hair, outfit and colors yours once you’re inside. I’ll meet you there and show you around."
              : "Every Lyrixis account gets its own agent in the Apixis world. Sign in with Apixis ID and it’s created for you, in the default Apixis body you can make your own."}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold" aria-label="Your agent">
            <li className="rounded-full px-3 py-1 text-white" style={{ background: "var(--spectrum)" }}>✦ {ready && view.agentName ? view.agentName : "Your agent"}</li>
            <li className="rounded-full border border-line bg-surface/60 px-3 py-1 text-ink-2">1,000 free Ixis in your Apixis Wallet</li>
            <li className="rounded-full border border-line bg-surface/60 px-3 py-1 text-ink-2">Sign in with Apixis ID</li>
          </ul>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 md:w-56">
          <a className="btn-primary" href={view.enterUrl} onClick={() => markSeen("enter")}>
            Enter the Apixis world <span className="arrow">↗</span>
          </a>
          <button type="button" className="btn-secondary" onClick={() => { markSeen("dismiss"); setView({ ...view, showWelcome: false }); }}>
            Not now
          </button>
          <small className="text-center text-xs text-ink-3">You can come back to Lyrixis anytime.</small>
        </div>
      </div>
    </section>
  );
}
