import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { enterApixisUrl } from "@/lib/apixis-world";

export const metadata = {
  title: "Create your account — Lyrixis",
  description: "New Lyrixis accounts are Apixis ID only. Create one at Apixis, then sign in here.",
};

const ENTER_URL = enterApixisUrl("lyrixis");

export default function SignupPage() {
  return (
    <div>
      <SiteNav />
      <main className="mx-auto grid max-w-5xl items-start gap-6 px-6 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-16">
        <div className="page-panel">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Lyrixis</p>
          <h1 className="mt-3 font-display text-3xl font-bold">Create your account</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            New accounts are Apixis ID only. One Apixis ID works on every Apixis site, and every new Apixis ID gets 1,000 free Ixis once in the shared Apixis Wallet.
          </p>
          <a href={ENTER_URL} className="btn-primary mt-6 w-full justify-center">
            Create your Apixis ID
          </a>
          <p className="mt-3 text-center text-xs text-ink-3">
            This opens Apixis at {ENTER_URL.replace("https://", "")}. Lyrixis does not collect a new password or email a signup link.
          </p>
          <p className="mt-6 text-center text-sm text-ink-2">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
          <p className="mt-3 text-center text-sm">
            <Link href="/login?mode=forgot" className="text-cyan underline-offset-4 hover:underline">
              Forgot password
            </Link>
          </p>
          <p className="mt-6 text-center text-xs text-ink-3">100 Ixis = $1. Paid Ixis never expires.</p>
        </div>
        <aside className="overflow-hidden rounded-2xl border border-line bg-[rgba(16,15,42,0.6)] p-6 backdrop-blur-[18px]">
          <p className="font-mono text-[11px] uppercase tracking-widest text-cyan">Apixis ID</p>
          <h2 className="mt-2 font-display text-xl font-bold">Same account everywhere</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
            <li>Create the account on Apixis. Lyrixis does not offer a magic-link signup or a password signup.</li>
            <li>If you already use Apixis, Socixis, Renoxis, or the Wallet, sign in with that account.</li>
            <li>Forgot a Lyrixis email password? Use Forgot password. That does not change your Apixis ID password.</li>
          </ul>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
