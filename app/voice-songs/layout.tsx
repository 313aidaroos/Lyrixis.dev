import { AppNav } from "@/components/AppNav";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

export default function VoiceSongsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
