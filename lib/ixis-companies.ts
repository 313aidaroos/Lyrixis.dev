/**
 * Other Ixis companies shown in the site footer.
 * Single source of truth: swap URLs here when custom domains arrive.
 * Lyrixis itself is intentionally left out, as are PersonalContentBot, AwadBot and COMMAND.
 * 2026-10-17 (Awad): every other Apixis-family company is listed at its live URL.
 * (The /companies page has its own full directory; this list is only the footer's.)
 */
export type IxisCompany = { name: string; url: string };

export const OTHER_IXIS_COMPANIES: readonly IxisCompany[] = [
  { name: "Apixis", url: "https://www.apixis.dev" },
  { name: "Apixis Wallet", url: "https://wallet.apixis.dev" },
  { name: "Socixis", url: "https://socixis.dev" },
  { name: "Renoxis", url: "https://renoxis.dev" },
  { name: "Rawixis", url: "https://rawixis.dev" },
  { name: "Contraxis", url: "https://contraxis.dev" },
  { name: "Halaxis", url: "https://halaxis.apixis.dev" },
  { name: "Recovra", url: "https://recovra-three.vercel.app" },
  { name: "Deduxis", url: "https://deduxis.apixis.dev" },
  { name: "Geoxis", url: "https://geoxis.apixis.dev" },
  { name: "Ominixis", url: "https://ominixis.apixis.dev" },
  { name: "Wattixis", url: "https://wattixis.apixis.dev" },
  { name: "Launchixis", url: "https://launchixis.apixis.dev" },
  { name: "Pinixis", url: "https://pinixis.dev" },
  { name: "Newsxis", url: "https://newsxis.apixis.dev" },
];
