// 2026-10-05 Grok: Cixy page help + "Other Ixis companies" footer coverage.
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { CIXY_AVATAR_SRC, PAGE_HELP, helpForPath } from "../cixy-page-help";
import { OTHER_IXIS_COMPANIES } from "../ixis-companies";

const root = path.resolve(__dirname, "../..");
const RELIGIOUS =
  /salaam|salam|insha|alhamdulillah|bismillah|halal|haram|prayer|ramadan|hijri|\beid\b|jumu|suhoor|iftar|mawlid|muslim|islam|scholar|riba/i;

function appPages(dir = path.join(root, "app"), prefix = ""): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "api" || name.startsWith("_")) continue;
      out.push(...appPages(full, `${prefix}/${name}`));
    } else if (name === "page.tsx") {
      out.push(prefix || "/");
    }
  }
  return out;
}

describe("Cixy page help", () => {
  it("uses the real Cixy photo, not an SVG", () => {
    expect(CIXY_AVATAR_SRC).toBe("/cixy/cixy-lyrixis-avatar.webp");
    expect(() => statSync(path.join(root, "public", CIXY_AVATAR_SRC))).not.toThrow();
    expect(readFileSync(path.join(root, "public/index.html"), "utf8")).toContain('src="/cixy/cixy-lyrixis-avatar.webp"');
  });

  it("has specific steps for every page in the app (no generic fallback)", () => {
    const pages = appPages().filter((p) => !p.startsWith("/auth"));
    for (const page of pages) {
      const sample = page.replace(/\[[^\]]+\]/g, "x");
      const { entry } = helpForPath(sample);
      expect(entry.title, page).not.toBe("Lyrixis");
    }
  });

  it("routes dynamic pages to their own help", () => {
    expect(helpForPath("/tracks/trx_123").route).toBe("/tracks/");
    expect(helpForPath("/catalog/rec_amazing_grace").route).toBe("/catalog/");
    expect(helpForPath("/catalog").route).toBe("/catalog");
    expect(helpForPath("/voices/compare").route).toBe("/voices");
    expect(helpForPath("/how-to").entry.title).toBe("How to use Lyrixis");
    expect(helpForPath("/team").entry.steps.join(" ")).toMatch(/Enterprise/);
    expect(helpForPath("/admin/enterprise").entry.steps.join(" ")).toMatch(/Mark as Enterprise/);
    expect(helpForPath("/pricing").entry.steps.join(" ")).toMatch(/\$30/);
    expect(helpForPath("/pricing").entry.steps.join(" ")).toMatch(/Contact sales/);
    expect(helpForPath("/dashboard/").route).toBe("/dashboard");
  });

  it("every entry has real steps and one-tap questions, and nothing religious", () => {
    for (const [route, entry] of Object.entries(PAGE_HELP)) {
      expect(entry.steps.length, route).toBeGreaterThanOrEqual(2);
      expect(entry.steps.length, route).toBeLessThanOrEqual(6);
      expect(entry.suggestions.length, route).toBeGreaterThan(0);
      expect(JSON.stringify(entry), route).not.toMatch(RELIGIOUS);
      expect(JSON.stringify(entry), route).not.toMatch(/\$2\.99|stripe|test mode/i);
    }
  });
});

describe("Other Ixis companies footer", () => {
  it("the static /enterprise footer lists exactly the shared list", () => {
    const html = readFileSync(path.join(root, "public/index.html"), "utf8");
    const block = html.slice(html.indexOf("Other Ixis companies"), html.indexOf("</div>", html.indexOf("Other Ixis companies")));
    const hrefs = [...block.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(OTHER_IXIS_COMPANIES.map((c) => c.url));
  });

  it("is on /companies and the signed-in pages", () => {
    for (const file of ["app/companies/page.tsx", "app/dashboard/page.tsx", "app/upload/page.tsx", "app/tracks/[id]/page.tsx", "app/add/page.tsx", "app/support/page.tsx"]) {
      expect(readFileSync(path.join(root, file), "utf8"), file).toContain("<SiteFooter />");
    }
  });
});
