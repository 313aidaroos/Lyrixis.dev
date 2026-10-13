import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "fs";
import { toneWav } from "../lib/voice-songs/wav";

const shots = "/opt/cursor/artifacts/screenshots";

async function shot(page: Page, name: string) {
  mkdirSync(shots, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: `${shots}/${name}-1280.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${shots}/${name}-390.png`, fullPage: true });
}

test("Apixis ID sign-in page is reachable", async ({ page }) => {
  await page.goto("/login");
  const link = page.getByRole("link", { name: "Log in with Apixis ID" });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toContain("/auth/apixis/start");
  const response = await page.request.get(href || "/auth/apixis/start", { maxRedirects: 0 });
  expect([302, 307, 308]).toContain(response.status());
  expect(response.headers().location || "").toContain("/sso/authorize");
});

test("upload demo reaches sample lyrics", async ({ page }) => {
  await page.goto("/upload?demo=1");
  await expect(page.getByRole("heading", { name: "Upload" })).toBeVisible();
  await expect(page.getByText("Demo mode. The file stays in this browser.")).toBeVisible();
  await shot(page, "upload");
  await page.locator("#audio").setInputFiles({
    name: "demo.wav",
    mimeType: "audio/wav",
    buffer: toneWav(1),
  });
  await page.locator("#title").fill("Night Window");
  await page.locator("#artist").fill("Demo artist");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Upload and process" }).click();
  await expect(page.getByTestId("demo-lyrics")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Night Window" })).toBeVisible();
  await expect(page.getByText("City lights along the window, counting miles until I'm home.")).toBeVisible();
  await shot(page, "lyrics");
});

test("voice setup demo runs through song and release", async ({ page }) => {
  await page.goto("/voice-songs?demo=1");
  await expect(page.getByRole("heading", { name: /Sing it/i })).toBeVisible();
  await shot(page, "voice-overview");

  await page.goto("/voice-songs/record?demo=1");
  await expect(page.getByTestId("elevenlabs-demo")).toBeVisible();
  await expect(page.getByTestId("script-line")).toBeVisible();
  await expect(page.getByText("Retake tips")).toBeVisible();
  await shot(page, "voice-record");
  for (let i = 0; i < 12; i += 1) {
    await page.getByTestId("record-line").click();
  }
  await expect(page.getByTestId("script-progress")).toHaveText("12 of 12");
  await page.getByTestId("save-sample").click();
  await expect(page.getByTestId("sample-saved")).toBeVisible();
  await page.getByTestId("rerecord-consent").click();
  await expect(page.getByTestId("script-line")).toContainText("owner of this voice");
  await page.getByTestId("record-line").click();

  await page.goto("/voice-songs/lyrics?demo=1");
  await expect(page.getByLabel("Lyrics")).toBeVisible();
  await shot(page, "voice-lyrics");

  await page.goto("/voice-songs/preview?demo=1");
  await expect(page.getByRole("heading", { name: "Window Down" })).toBeVisible();
  await expect(page.locator("audio")).toBeVisible();
  await shot(page, "voice-song");

  await page.goto("/voice-songs/release?demo=1");
  await expect(page.getByTestId("royalty-split")).toContainText("90%");
  await expect(page.getByTestId("royalty-split")).toContainText("10%");
  await expect(page.getByTestId("release-status")).toContainText("pending distributor");
  await expect(page.getByTestId("release-status")).toContainText("not on Spotify, Apple Music, Tidal");
  await shot(page, "voice-release");
  await page.getByTestId("submit-release").click();
  await expect(page.getByTestId("release-status")).toContainText("pending distributor");

  await page.goto("/voice-songs/checkout?demo=1");
  await expect(page.getByTestId("payments-closed")).toContainText("lyrixis.voice.setup");
  await expect(page.getByTestId("payments-closed")).toContainText("lyrixis.voice.release");
  await expect(page.getByTestId("payments-closed")).toContainText("Nothing was charged");
  await shot(page, "voice-checkout");
});
