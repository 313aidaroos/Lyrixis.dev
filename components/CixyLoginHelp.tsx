"use client";
// 2026-09-28 Grok Developer Bot: "Need help signing in? Ask Cixy" beside the Lyrixis sign-in forms.
// Opens the existing public Cixy chat (/api/cixy works signed out) with sign-in questions.
import { useState } from "react";
import { CixyChat } from "@/components/CixyChat";

const QUESTIONS = ["I forgot my password", "How does the magic link work?", "What is Apixis ID?"];

export function CixyLoginHelp() {
  const [open, setOpen] = useState(false);
  return (
    <aside id="ask-cixy" className="overflow-hidden rounded-2xl border border-line bg-[rgba(16,15,42,0.6)] backdrop-blur-[18px]" aria-labelledby="cixy-help-title">
      <div className="flex items-start gap-4 p-5 sm:items-center sm:p-6">
        <img
          src="/cixy/cixy-lyrixis-avatar.webp"
          alt="Cixy, the Apixis family guide"
          width={80}
          height={80}
          className="h-16 w-16 flex-none rounded-2xl sm:h-20 sm:w-20 border border-line object-cover shadow-lg shadow-violet/20"
        />
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-2">Cixy · Sign-in help</p>
          <h2 id="cixy-help-title" className="mt-1 font-display text-xl font-bold">Need help signing in?</h2>
          <p className="mt-1 text-sm text-ink-2">Ask Cixy about magic links, resetting your password, or what Apixis ID is.</p>
        </div>
      </div>
      {open ? (
        <div className="border-t border-line">
          <CixyChat
            compact
            starters={QUESTIONS}
            placeholder="Ask Cixy about signing in…"
            intro={
              <p className="text-xs leading-relaxed text-ink-2">
                Cixy can explain every sign-in option. She can&apos;t see or change your account, and she never needs your password.
              </p>
            }
          />
        </div>
      ) : (
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <button type="button" className="btn-secondary w-full py-2.5 text-sm" aria-expanded={open} onClick={() => setOpen(true)}>
            Ask Cixy
          </button>
        </div>
      )}
    </aside>
  );
}
