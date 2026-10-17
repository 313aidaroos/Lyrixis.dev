import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { getUser } from "@/lib/auth";
import { fulfillCheckoutSession, publicCardMessage, retrieveCheckoutSession } from "@/lib/card-checkout";
import { HttpError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment — Lyrixis",
};

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const query = await searchParams;
  const sessionId = query.session_id?.trim() || "";
  const user = await getUser();
  if (!user) {
    const next = `/checkout/return?session_id=${encodeURIComponent(sessionId)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  let message = "We could not confirm that payment.";
  let ok = false;
  if (sessionId) {
    try {
      const session = await retrieveCheckoutSession(sessionId);
      const result = await fulfillCheckoutSession(session, user.id);
      ok = true;
      message =
        result.product === "all_access"
          ? "All-Access is active on this card. It renews monthly. You can cancel with lyrixis@apixis.dev and it stays on until the end of the paid month."
          : "Card payment confirmed. This song is unlocked on your account.";
    } catch (error) {
      message = error instanceof HttpError ? publicCardMessage(error.message, "The card payment could not be confirmed.") : "The card payment could not be confirmed.";
    }
  }

  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-xl px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Card checkout</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold">{ok ? "Payment confirmed" : "Payment not confirmed"}</h1>
        <p className={`mt-4 text-sm leading-relaxed ${ok ? "text-ink-2" : "text-magenta"}`}>{message}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/pricing" className="btn-secondary px-4 py-2 text-sm">
            Back to pricing
          </Link>
          <Link href="/catalog" className="btn-primary px-4 py-2 text-sm">
            Go to the catalog
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
