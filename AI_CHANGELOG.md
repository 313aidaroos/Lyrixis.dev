# AI Change Log

## Rules for AI models, bots, and agents

If you are an AI (Claude, ChatGPT, Grok, Gemini, Copilot, Cursor, JunoAI, or any other model, bot, or agent) and you add, modify, or delete anything in this repository, you **must** append a dated entry to this file describing what you changed and why — one entry per work session, no exceptions. This log is how the repository owner tracks what every AI did. Human commits do not need entries.

Entry format:

## YYYY-MM-DD — <your name/model>
- Changed: <files or area>
- Why: <reason>

---

## 2026-10-13 — Lyrixis Lead via cloud agent (Grok)
- Changed: `components/SiteFooter.tsx`, `NOTES/GROK.md`
- Why: add a verified Instagram icon link for @lyrixis.dev (Lyrixis Metadata Company). Facebook URLs could not be confirmed as the brand's Page, so none was added.

## 2026-10-13 — Lyrixis Lead via cloud agent
- Changed: guided voice-setup script, label release fields and royalty split, `DistributorProvider` with status pending distributor, payments gate, demo upload→lyrics, Playwright e2e, migration `0010_label_releases_ledger.sql` (not applied).
- Why: Q1 2027 voice-song launch prep. Extend the existing voice-song studio. Do not charge, and do not claim a song is on a store, until a distributor and the Wallet SKUs are registered.

## 2026-10-06 — Grok (Developer Bot): locked plans, How to use, Label / Enterprise
- Changed: pricing copy and three-option plans ($30 All-Access, $3 per song, Label / Enterprise contact form), `/how-to`, Cixy page help and prompt, FAQ, footer, homepage, `/enterprise` (`public/index.html`). New inquiry API, admin approve page, team page, `lib/enterprise-access.ts`, `services/enterprise.ts`, `lib/mail.ts`, migration `database/migrations/20261006_enterprise_accounts.sql` (not applied) and its rollback. Tests. At mid widths, “How to use” stays in the Product menu and the Menu panel so the top bar does not overflow; the signed-in bar wraps instead of running off the page.
- Why: Awad locked All-Access at $30/month and $3 per song, asked for a How to use guide with live-site screenshots, and a fully wired Label / Enterprise path (save the request, email awad@apixis.dev, approve the company, invite the team, isolate company songs). Card checkout was not added. Lyric video, translations, and Voices stay labeled Coming soon.

## 2026-10-05 — Grok (Developer Bot): 300 Ixis pricing, Cixy wording, RLS-helper migration
- Changed: `lib/ixis-pricing.ts`, pricing route/service, price copy (home, FAQ, Listen, /enterprise), `lib/cixy-prompt.ts`, `LoginForm`, `ApixisWorldWelcome`, `schema.sql`, two new migration files (not applied), tests, `NOTES/GROK.md`.
- Why: table said 299 vs Wallet SKU 300; Cixy said "$2.99 test mode / no live Stripe"; 1,000 Ixis grant is the shared Wallet's, not Apixis.dev's; Supabase advisor flagged anon-executable SECURITY DEFINER helpers.

## 2026-09-28 — JunoAI
- Changed: created this file
- Why: owner's standing rule — every AI that touches this repo must log its changes here

## 2026-09-28 — JunoAI
- Changed: added .github/workflows/ci.yml (shared CI caller)
- Why: automated build/test gate via the family reusable workflow

## 2026-09-29 — Grok (Lyrixis Lead)
- Changed: `lib/ixis-companies.ts` (new), `components/SiteFooter.tsx`, `WORKBOARD.md`, `NOTES/GROK.md`
- Why: Awad-approved footer section linking to the other Ixis companies; URLs kept in one data file
- 2026-09-29 follow-up: removed Qahwah World and Nursery Toons from `lib/ixis-companies.ts` (Awad-approved via hub); 11 sites remain

## 2026-10-05 (CT) — Grok (Lyrixis Lead) — footer on every page + Cixy page help
- Changed: `lib/cixy-page-help.ts`, `components/CixyPageHelp.tsx` (new), `app/layout.tsx`, `components/CixyWidget.tsx`, `components/CixyChat.tsx`, companies/dashboard/upload/tracks/add/support pages, `public/index.html`, tests
- Why: Awad asked for the footer on /enterprise and signed-in pages, and the Socixis-style Cixy page help

## 2026-09-30 — Codex — Tester readiness: shared-login redirects

- Copied the canonical ApixisWallet local-redirect validator and used it at login start and callback. Preserved this app’s existing Supabase adapter and routes.
- Added regression cases for external URLs, backslashes, encoded separators/control characters and normal return destinations. No design changes.

## 2026-09-30 — Claude (branch claude/awesome-newton-3tygzi)
- Changed: `lib/apixis-login.ts` re-copied from `ApixisWallet/sdk/apixis-login-next.ts` — `verifyOtp({ type: "email" })` (D16: new addresses get a `signup` token that `magiclink` rejects). `lib/apixis-wallet.ts` → SDK v3.1 (adds `marketplaceOrder`/`marketplaceSettle`). `lib/apixis-world*.ts` re-synced with Apixis.dev (15 clients incl. ominix, wattixis; 1,000 starter Ixis, D11).
- Changed: `lib/apixis-world-agent.test.ts` expects 15 clients.
- Why: family backend pass per Awad's 2026-09-30 decisions (ApixisWallet/AGENTS.md §0c D11–D16; live board: ApixisWallet/docs/FAMILY_STATUS.md). One SDK, one login kit, one world kit — copied from canonical, never patched by hand.

## 2026-10-02 — Claude (Claude Code)
- Changed: `.env.example` now lists every env var the code reads (missing names appended with a one-line note each).
- Why: so the owner can add keys in Vercel from one complete list. No code changed.

## 2026-10-02 (late night) — Claude
- Changed: new-account wording now says the Apixis world agent starts with **1,000** in-world Ixis (was 200). Apixis.dev really grants 1,000 (D11, `STARTER_IXIS_DEFAULTS.visitor`); shared world-kit comments changed identically in every copy.
- Why: the site was telling new people the wrong number.

## 2026-10-04 — Claude (Claude Code, full-portfolio review)
- Changed: `NOTES/CLAUDE.md` — this repo's slice of the 24-repo review (what is live, what is open, who owns each item, drift found). No code, env, database or deploy changes.
- Why: Awad asked for every repo to be read twice with a done / to-do / owner status, and for the notes in each repo to be updated. Notes only; Awad approved the merge on 2026-10-04.

## 2026-10-04 — Grok (Lyrixis Lead) — Lyrixis Voices (branch grok/lyrixis-voices)
- Changed: new `/voices` marketplace (pages, `app/api/voices/*`, partner API `app/api/v1/voices/*`), `lib/voices/*` service/ledger/providers (ElevenLabs + demo), `components/voices/*`, migration `0006_lyrixis_voices.sql` (not applied) with rollback + local RLS tests, `docs/voices/*`, `.env.example` vars, one SiteNav link (previews / `NEXT_PUBLIC_VOICES_NAV`). Retired the 9/22 voice-shelf skeleton files.
- Why: Awad approved building Lyrixis Voices (invite-only, Wallet-only payments, legal text pending review). Not merged, not deployed to production.
## 2026-10-04 (CT) — Grok (PR #14 refresh)
- Changed: merged main into `grok/ixis-footer`; `lib/ixis-companies.ts` comment says Ominix (formerly Nexxis) stays excluded from the footer. Notes kept from both sides.
- Why: bring the footer PR up to date for Awad's review; no list change.

## 2026-10-04 (CT) — Grok (Claude-audit lock fixes, PR from `grok/claude-audit-fixes`)
- Changed: `/tracks/[id]` no longer shows the dead Stripe checkout (404 `/api/checkout`) or a USD price; removed "As-salamu alaykum" from the magic-link screen and the support auto-reply; Ominix link on `/companies` → `ominix-app.vercel.app`; 1,000 Ixis wording names Apixis.dev; `NOTES/GROK.md` Claude #27 entry + hub decision (uploads will reuse `lyrixis.track.unlock`, not built yet).
- Why: Awad's locks (no Stripe/card checkout, no religious content outside Halaxis, Apixis.dev grants the 1,000 Ixis) and notes for every Claude change.

## 2026-10-05 (CT) — Grok (Lyrixis Lead): merged #29, #14, #28 (Awad approved)
- Changed: #29 `03df856` (no Stripe checkout on /tracks, no salam greetings, Apixis.dev 1,000 Ixis wording); #14 `ba67a21` (footer "Other Ixis companies", 12 sites incl. Ominix at ominix-app.vercel.app); #28 `acf2978` (Lyrixis Voices, closed in production, migration 0006 not applied). Details and undo in NOTES/GROK.md.
- Why: Awad approved the merges on 2026-10-05 (7:54 PM and 8:08 PM CT).

## 2026-10-05 — Grok (Developer Bot): direct-to-Storage upload + own-upload unlock
- Changed: `app/api/tracks/upload-url/route.ts` (new), `app/api/tracks/route.ts`, `services/tracks.ts`, `lib/storage.ts`, `lib/audio.ts`, `lib/env.ts`, `components/UploadForm.tsx`, `app/api/redeem/route.ts`, `components/RedeemButton.tsx`, `components/TrackView.tsx`, tests, `.env.example`, `README.md`, `docs/WORKER_HOSTING.md`, `NOTES/GROK.md`.
- Why: Vercel 413 on uploads over 4.5 MB; let users pay 300 Ixis (Wallet SKU `lyrixis.track.unlock`) to unlock their own uploaded track; transcription provider is now OpenAI.

## 2026-10-05 — Grok (Developer Bot): lyrics pipeline runs inside Vercel (Option B)
- Changed: `lib/processing.ts`, `lib/ffmpeg.ts`, `app/api/tracks/[id]/retry/route.ts` (new); `services/tracks.ts`, `workers/pipeline.ts`, `providers/transcription/whisper-v3.ts`, `lib/storage.ts`, `lib/rate-limit.ts`, `app/api/tracks/route.ts`, `components/TrackView.tsx`, `components/PricingCalculator.tsx`, `next.config.ts`, `vercel.json`, `package.json` (`ffmpeg-static`), docs, tests
- Why: Awad chose Option B (fewest accounts): no Redis, no Railway. Uploads run the pipeline via `after()`, audio goes to OpenAI whisper-1 as 16 kHz mono MP3, a DB count replaces the Redis upload limit, and failed or stuck tracks get Retry. The 100–999 calculator default is now 149, matching the DB.

## 2026-10-06 — Claude (family lead): AI Receptionist notes (D18)
- Changed: AI Receptionist section in the family notes (see `docs/AI_RECEPTIONIST.md` in ApixisWallet); notes only, no code.
- Why: Awad approved an AI Receptionist add-on at $100/month for every customer-facing family site and asked every bot and agent to follow one plan.
