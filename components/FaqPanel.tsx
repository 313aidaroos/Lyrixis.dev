import { PlanFaq } from "@/components/PlanFaq";

const FAQS = [
  {
    q: "What is Lyrixis?",
    a: "A music catalog: search recordings, read metadata, and view lyrics that we are allowed to show. Records live in Supabase.",
  },
  {
    q: "Can I paste commercial song lyrics?",
    a: "No. Ingest only accepts public-domain or original lyrics. Licensed commercial lyrics need a rights path first.",
  },
  {
    q: "What are ISRC, ISWC, and UPC?",
    a: "ISRC identifies a recording (the sound). ISWC identifies the composition (the work). UPC/EAN identifies a release. Search prefers those IDs over messy titles.",
  },
  {
    q: "How do I add a song?",
    a: "Use Add for one recording, or paste a CSV on the same page. Every row needs license public_domain or original. Metadata-only rows need an ISRC, ISWC, or UPC.",
  },
  {
    q: "Is search free?",
    a: "The public catalog on this site is free to search. Unlocking one song is $3 (300 Ixis). Lyrixis All-Access is $30 a month (3,000 Ixis). Pay by card or with Ixis. Card coming soon until card checkout is turned on. Ixis top-ups are in the Apixis Wallet.",
  },
  {
    q: "Why is the background karaoke?",
    a: "That is the product mood — people singing — kept washed out so you can still read the catalog.",
  },
];

export function FaqPanel() {
  return (
    <div className="grid gap-4">
      <PlanFaq />
      <h2 className="mt-6 font-display text-3xl font-bold">More questions</h2>
      {FAQS.map((item) => (
        <details key={item.q} className="card group">
          <summary className="cursor-pointer list-none font-display text-lg font-semibold">
            {item.q}
          </summary>
          <p className="mt-3 text-ink-2">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
