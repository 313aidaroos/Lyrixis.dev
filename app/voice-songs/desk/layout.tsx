import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

export const dynamic = "force-dynamic";

export default function VoiceDeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
