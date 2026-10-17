import type { Metadata } from "next";
import { Manrope, Martian_Mono, Monoton } from "next/font/google";
import "./globals.css";
import { CixyWidget } from "@/components/CixyWidget";
import { CixyPageHelp } from "@/components/CixyPageHelp";

// 2026-10-05 font refresh preview (Grok, DO NOT MERGE until Awad approves). Awad picked Monoton:
// marquee = Monoton, ONLY for big headlines (hero + page titles, about 40px and up, via .font-marquee
// / sm:font-marquee); display = Manrope 800 for every smaller heading, price and number;
// body = Manrope; mono = Martian Mono. Was Special Elite everywhere.
const marquee = Monoton({ subsets: ["latin"], weight: "400", variable: "--font-marquee", display: "swap" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = Martian_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Lyrixis — The intelligence layer for music catalogs",
  description:
    "Lyrixis All-Access is $30 a month, or $3 per song for synced lyrics. Pay by card or with Ixis. Labels and companies contact sales.",
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Lyrixis — Music. Understood.",
    description: "All-Access is $30 a month (3,000 Ixis), or $3 (300 Ixis) per song. Lyric video, translations, and Voices are coming soon.",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
  },
};

export const viewport = {
  themeColor: "#07061a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${marquee.variable} ${body.variable} ${mono.variable} font-body antialiased`}>
        <div className="site-stage" aria-hidden="true" />
        {children}
        <CixyWidget />
        <CixyPageHelp />
      </body>
    </html>
  );
}
