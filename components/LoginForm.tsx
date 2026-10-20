"use client";
// 2026-09-28 Grok Developer Bot: "Log in with Apixis ID" first, Magic link / Password tabs,
// a working "Forgot password?", friendly errors that don't wipe the form, and Cixy sign-in help.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { magicLink, login } from "@/app/login/actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { CixyLoginHelp } from "@/components/CixyLoginHelp";

type Mode = "magic" | "password" | "forgot";

function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export function LoginForm({ variant = "login" }: { variant?: "login" | "signup" }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const initialMode = params.get("mode");
  const [mode, setMode] = useState<Mode>(
    initialMode === "password" || initialMode === "forgot" ? initialMode : "magic",
  );
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    params.get("error") ? "That sign-in link didn't work or has expired. Please request a new one." : "",
  );
  const [sent, setSent] = useState<null | { kind: "magic" | "reset"; email: string }>(null);
  const [busy, setBusy] = useState(false);
  const sentRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (sent) sentRef.current?.focus();
  }, [sent]);

  function switchMode(value: Mode) {
    setMode(value);
    setError("");
  }

  async function onMagic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.includes("@")) return setError("Enter a valid email.");
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("email", email);
    form.set("next", next);
    try {
      const result = await magicLink(form);
      if (result && "ok" in result && result.ok) setSent({ kind: "magic", email });
      else setError(result?.message ?? "Could not send a sign-in link.");
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.includes("@")) return setError("Enter a valid email.");
    if (!password) return setError("Enter your password.");
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("email", email);
    form.set("password", password);
    form.set("next", next);
    try {
      const result = await login(form); // redirects on success
      if (result?.message) setError(result.message);
    } catch (e) {
      // Next's redirect() surfaces as a thrown NEXT_REDIRECT; let it through.
      if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
      setError("Could not sign in. Please try again or use a magic link.");
    } finally {
      setBusy(false);
    }
  }

  async function onForgot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.includes("@")) return setError("Enter a valid email.");
    setBusy(true);
    setError("");
    try {
      const target = `/set-password?reset=1&next=${encodeURIComponent(next)}`;
      const { error: err } = await createBrowserSupabaseClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
      });
      if (err && /rate limit|too many/i.test(err.message)) setError("Too many requests. Please wait a minute and try again.");
      else setSent({ kind: "reset", email }); // same answer whether or not the account exists
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const errorBox = error ? (
    <p role="alert" className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {error}
    </p>
  ) : null;

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => switchMode(value)}
      className={`pb-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/60 ${
        mode === value ? "border-b-2 border-cyan text-cyan" : "text-ink-3 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  let body: React.ReactNode;
  if (sent) {
    body = (
      <div className="auth-sent">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">Check your email</p>
        <h1 ref={sentRef} tabIndex={-1} className="mt-3 font-display text-3xl font-bold focus:outline-none">
          {sent.kind === "reset" ? "Reset link sent" : "Sign-in link sent"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          {sent.kind === "reset" ? (
            <>If <strong className="text-ink">{sent.email}</strong> has a Lyrixis account, a link to choose a new password is on its way. It works once and expires in an hour.</>
          ) : (
            <>We sent a sign-in link to <strong className="text-ink">{sent.email}</strong>. Open it on this device.</>
          )}
        </p>
        <p className="mt-3 text-xs text-ink-3">No email after a few minutes? Check spam, or try again.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" className="btn-secondary py-2.5 text-sm" onClick={() => setSent(null)}>
            Use a different email
          </button>
          <button type="button" className="btn-secondary py-2.5 text-sm" onClick={() => { setSent(null); switchMode("password"); }}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  } else if (mode === "forgot") {
    body = (
      <>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Lyrixis · Reset password</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Forgot your password?</h1>
        <p className="mt-2 text-sm text-ink-2">Enter the email you use for Lyrixis and we&apos;ll send you a link to choose a new password.</p>
        <form className="mt-6 space-y-4" onSubmit={onForgot} noValidate>
          <div>
            <label className="label" htmlFor="forgot-email">Email</label>
            <input id="forgot-email" type="email" autoComplete="email" required className="input" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          {errorBox}
          <button className="btn-primary w-full" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Email me a reset link"}
          </button>
        </form>
        <button type="button" className="mt-5 text-sm text-cyan underline-offset-4 hover:underline" onClick={() => switchMode("password")}>
          ← Back to sign in
        </button>
      </>
    );
  } else {
    body = (
      <>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Lyrixis</p>
        <h1 className="mt-3 font-display text-3xl font-bold">
          {variant === "signup" ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm text-ink-2">
          One Apixis ID for every Apixis site. New accounts are free to start, and every new Apixis ID gets 1,000 free Ixis in the shared Apixis Wallet.
        </p>
        <a
          href={variant === "signup" ? "https://www.apixis.dev/enter?from=lyrixis" : `/auth/apixis/start?next=${encodeURIComponent(next)}`}
          className="btn-primary mt-6 w-full justify-center"
        >
          {variant === "signup" ? "Create your Apixis ID" : "Log in with Apixis ID"}
        </a>
        <p className="mt-2 text-center text-xs text-ink-3">Already use Apixis, Socixis, Renoxis or the Wallet? Same account.</p>

        {/* 2026-10-04 (Grok, Apixis ID only): new accounts are created with Apixis ID only. /signup shows only
            the Apixis button; the email link and password below are for existing accounts (on /login). */}
        {variant === "signup" ? (
          <p className="mt-6 text-center text-sm text-ink-2">
            Already have an account?{" "}
            <a href={`/login?next=${encodeURIComponent(next)}`} className="text-cyan underline-offset-4 hover:underline">Sign in</a>
          </p>
        ) : (
        <>
        <p className="mt-2 text-center text-xs text-ink-3">New to Lyrixis? Create your account with Apixis ID. Email link and password are for existing accounts.</p>
        <p className="mt-3 text-center text-sm">
          <button type="button" className="text-cyan underline-offset-4 hover:underline" onClick={() => switchMode("forgot")}>
            Forgot password
          </button>
        </p>

        <div className="my-6 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-ink-3">
          <span className="h-px flex-1 bg-line" /> or use your email <span className="h-px flex-1 bg-line" />
        </div>

        <div className="flex gap-4 border-b border-ink/10" role="tablist" aria-label="Sign-in method">
          {tab("magic", "Magic link")}
          {tab("password", "Password")}
        </div>

        {mode === "magic" ? (
          <form className="mt-6 space-y-4" onSubmit={onMagic} noValidate>
            <div>
              <label className="label" htmlFor="email-magic">Email</label>
              <input id="email-magic" type="email" autoComplete="email" required className="input" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {errorBox}
            <button className="btn-primary w-full" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onPassword} noValidate>
            <div>
              <label className="label" htmlFor="email-password">Email</label>
              <input id="email-password" type="email" autoComplete="email" required className="input"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label mb-0" htmlFor="password">Password</label>
                <button type="button" className="text-sm text-cyan underline-offset-4 hover:underline" onClick={() => switchMode("forgot")}>
                  Forgot password?
                </button>
              </div>
              <input id="password" type="password" autoComplete="current-password" required className="input"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {errorBox}
            <button className="btn-primary w-full" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in with password"}
            </button>
          </form>
        )}
        </>
        )}

        <p className="mt-6 text-center text-xs text-ink-3">100 Ixis = $1. Paid Ixis never expires.</p>
      </>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl items-start gap-6 px-6 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-16">
      <div className="page-panel">{body}</div>
      <CixyLoginHelp />
    </div>
  );
}
