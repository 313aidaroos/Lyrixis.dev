Grok Bot (Developer Bot hub + product leads) notes. Every change Grok Bot makes to this product (code, env, database, deploys) gets a dated entry here so Claude, Hermes and Codex stay on the same page.

## 2026-10-13 — Lyrixis Lead via cloud agent: guided voice script, label release, payments stay gated (branch `cursor/voice-script-label-e2e-0502`; migration NOT applied)
- What: Voice setup now walks a single script (`lib/voice-songs/recording-script.ts`): room check, mic check, a consent line read aloud, phonetically balanced lines, pacing, a progress count, per-line re-record, and retake tips. The release form adds genre, release date, explicit flag, cover, and writer splits, and shows the 90% artist / 10% Lyrixis master split. Store status is `pending distributor`. The app does not call a distributor and does not say a song is on Spotify, Apple Music, Tidal, or any other store. Voice payments stay off unless `VOICE_SONGS_PAYMENTS=live`; the owner emails skip the charge; ElevenLabs with no key is labeled demo mode. Playwright covers Apixis ID sign-in, upload→lyrics, and voice setup→song→release in demo mode.
- Where: `lib/voice-songs/recording-script.ts`, `components/voice-songs/RecordPanel.tsx`, `components/voice-songs/ReleasePanel.tsx`, `lib/voice-songs/distributors.ts`, `lib/voice-songs/release.ts`, `lib/voice-songs/checkout.ts`, `lib/voice-songs/billing.ts`, `app/upload/page.tsx`, `app/tracks/[id]/page.tsx`, `e2e/launch-flows.spec.ts`, `database/migrations/0010_label_releases_ledger.sql`.
- Database: `0010_label_releases_ledger.sql` adds label columns on `voice_releases` and creates `voice_royalty_ledger`. It was NOT applied. Rollback: `database/migrations/rollback/0010_label_releases_ledger_down.sql`.
- Who: Lyrixis Lead via cloud agent.
- Undo: close the draft PR, or revert its commit. Do not run the migration down file unless the up migration was applied.

## 2026-10-06 — Grok (Developer Bot): locked $30 / $3 plans, How to use, Label / Enterprise (branch `cursor/pricing-howto-enterprise-3263`; migration NOT applied)
- What: Customer pricing is now two locked choices plus a company path. Lyrixis All-Access is $30 a month (3,000 Ixis), renews monthly, cancel anytime and it stays on until the end of the paid month. Without the plan, one song is $3 (300 Ixis), Wallet SKU `lyrixis.track.unlock` unchanged. Pay by card or with Ixis (100 Ixis = $1). Card checkout is wording only: no Stripe, no charge claim. Working now: unlimited synced song lyrics (playback, corrections, TXT/SRT/LRC/JSON). Coming soon, labeled that way: lyric video downloads, translations, Voices. Volume calculator is no longer on customer pages.
- What: `/how-to` is a numbered guide with screenshots from the live site (sign-in, the home demo while processing and playing, the catalog 300 Ixis redeem). Upload and Retry are described from the real screens; those screens need a signed-in owner, so they have no picture. Linked from the nav and footer.
- What: Label / Enterprise is a Contact sales form (company, contact name, work email, optional phone, songs per month, team seats, message). `POST /api/enterprise/inquiry` saves `enterprise_inquiries` and emails `awad@apixis.dev` through the existing Resend helper (`lib/mail.ts`). The form then shows “We received your request.” If the table is missing, the row is not saved and the visitor is told to email awad@apixis.dev. Awad (alaidaroosawad@gmail.com and awad@apixis.dev, same list as `lib/owners.ts`) opens `/admin/enterprise` and presses Mark as Enterprise. That creates the organization with `plan = enterprise`, seats from the request, and makes the contact the owner (or a pending owner invite if they have no account yet). The owner opens `/team`, sees members and songs processed, and invites teammates by email. Invitees who sign in with that email join the company. Company songs (`tracks.organization_id`) are unlocked for members of that enterprise org only. Personal songs stay private. Another company gets a 404. Checks are in server code because the app uses the service role. New tables have RLS on and are revoked from anon and authenticated.
- Nav: “How to use” is in the Product menu and the Menu panel below the xl breakpoint so the public bar does not overflow around 1024px. The signed-in bar wraps. Team and How to use stay reachable.
- Where: `lib/ixis-pricing.ts`, `components/PricingPlans.tsx`, `components/EnterpriseInquiryForm.tsx`, `components/PlanFaq.tsx`, `app/pricing/page.tsx`, `app/how-to/page.tsx`, `app/page.tsx`, `app/upload/page.tsx`, `app/layout.tsx`, `app/api/enterprise/inquiry/route.ts`, `app/admin/enterprise/page.tsx`, `app/admin/enterprise/actions.ts`, `app/team/page.tsx`, `app/team/actions.ts`, `services/enterprise.ts`, `services/tracks.ts`, `app/api/tracks/[id]/route.ts`, `app/api/tracks/[id]/exports/route.ts`, `lib/enterprise-access.ts`, `lib/mail.ts`, `lib/cixy-page-help.ts`, `lib/cixy-prompt.ts`, `components/CixyPageHelp.tsx`, nav/footer/FAQ/scale/redeem copy, `public/index.html`, `public/how-to/*.webp`, `middleware.ts`, `lib/supabase/middleware.ts`, `lib/__tests__/enterprise-access.test.ts`, pricing and Cixy tests.
- Database: `database/migrations/20261006_enterprise_accounts.sql` is in the repo and was NOT applied to production. Rollback: `database/migrations/rollback/20261006_enterprise_accounts_down.sql` (drops invites, the new org columns, and inquiries; does not delete organizations or members created while the migration was applied). Until it is applied, song lists and the $3 unlock keep working; the contact form returns the email fallback.
- Not touched: `lib/apixis-wallet.ts`, `lib/apixis-login.ts`, the 300 Ixis redeem path, Stripe.
- Who: Grok / Developer Bot, for Awad.
- Undo: close or revert the PR. Do not run the migration down file unless the up migration was applied.

## 2026-10-05 ~8:35 PM (CT): Grok (Developer Bot), prices = 300 Ixis via Apixis Wallet, Cixy wording, RLS-helper policy-scope migration (PR #33 from `grok/pricing-wording-db-hardening`; migration NOT applied)
- What: (1) Pricing: the `/pricing` table read 299 Ixis for 1–99 songs (DB `pricing_tiers` seed 299) while the Wallet SKU `lyrixis.track.unlock` is 300. `lib/ixis-pricing.ts` pins the 1-song tier to 300 in `/api/pricing/tiers` and `services/pricing.ts`; `schema.sql` seed → 300. (The prod row itself was set to 300 by #34's `20261005_track_unlock_price_300.sql`, so this PR ships no price migration.) Home "scale" badges, the FAQ and the static `/enterprise` page (table, calculator, FAQ) now price in Ixis, not dollars. (2) Cixy prompt (`lib/cixy-prompt.ts`): removed "$2.99 (test mode only)" and "No live Stripe charges"; now: 300 Ixis per song through the Apixis Wallet (catalog or own upload), Ixis-only payments, /upload limits; signup line = one-time 1,000 free Ixis welcome grant in the shared Apixis Wallet. Same wording fix on `/login` (`LoginForm`) and the dashboard world card (`ApixisWorldWelcome`) — they said Apixis.dev gives the 1,000. (3) Migration `20261005_restrict_rls_helper_execute.sql` (not applied; its revoke half is already live via #34's `20261005_revoke_anon_rls_helpers.sql`): revokes EXECUTE on `current_app_user_id()` / `current_org_ids()` from PUBLIC and anon (keeps authenticated + service_role) and re-scopes the 21 RLS policies that call them from PUBLIC to authenticated, so anon reads return zero rows instead of a permission error. Tested on a throwaway local Postgres 17: anon RPC denied, anon reads 0 rows, signed-in user still sees own rows, service role unaffected, re-runnable.
- Where: `lib/ixis-pricing.ts` (new), `app/api/pricing/tiers/route.ts`, `services/pricing.ts`, `components/PricingCalculator.tsx`, `components/ScaleSection.tsx`, `components/FaqPanel.tsx`, `components/LoginForm.tsx`, `components/ApixisWorldWelcome.tsx`, `lib/cixy-prompt.ts`, `public/index.html`, `schema.sql`, `database/migrations/20261005_restrict_rls_helper_execute.sql` (new), tests.
- Who: Grok / Developer Bot, for Awad.
- Undo: close the PR, or `git revert <squash sha>`. If the migration is applied later, its undo SQL is at the bottom of the file.

## 2026-10-04 summary

- **Grok:** added the verified-owner unlock bypass.
- **Lead:** prepared upload-worker hosting docs and a Feed preview; those preview changes were not merged.
- **Claude:** merged PR #27 (`8cf8429`) around 6:30 PM CT, adding the full-portfolio review to `NOTES/CLAUDE.md` and `AI_CHANGELOG.md` (notes/docs only).
- **Hermes:** no 2026-10-04 commit or merged PR identified in this repository.
- **Juno:** no 2026-10-04 commit or merged PR identified in this repository.

## Catch-up correction — 2026-10-04 (CT)

Claude activity was present; the earlier “no Claude activity” line was incorrect. Each item below has an undo pointer.

- **Claude, 2026-10-04 6:31 PM CT — PR #27, merge `8cf842961ddedacc942a17410bf1e2603e59da57`:** notes: Claude full-portfolio review 2026-10-04 (NOTES/CLAUDE.md, AI_CHANGELOG); added `NOTES/CLAUDE.md` and `AI_CHANGELOG.md` (notes/docs only). Undo: `git revert 8cf842961ddedacc942a17410bf1e2603e59da57`.
- **2026-10-04 6:31 PM CT — 313aidaroos:** `notes: Claude full-portfolio review 2026-10-04 (NOTES/CLAUDE.md, AI_CHANGELOG) (#27)` landed as `8cf842961ddedacc942a17410bf1e2603e59da57`. Where: commit `8cf842961ddedacc942a17410bf1e2603e59da57`. Undo: `git revert 8cf842961ddedacc942a17410bf1e2603e59da57`.

## 2026-09-27 (CT) — Developer Bot (hub)
- Wallet registration: added `lyrixis` to `wallet_api_clients` in Supabase project `kzneeksminozmhnqaaun`, with `require_sso=false`.
- Callback URLs registered: https://lyrixis.vercel.app/auth/apixis/callback.
- Vercel env: replaced `WALLET_API_KEY` with a per-product `apx_live_` key, added `APIXIS_CLIENT_ID=lyrixis`, and left legacy `APIXIS_WALLET_API_KEY` present (name-only check); production was redeployed from the same product commit.
- Cleanup status: the attempted deletion of legacy `APIXIS_WALLET_API_KEY` variables was stopped at about 22:45 CT; no deletion was made here.
- Undo: restore `WALLET_API_KEY` to its legacy value and deactivate the `lyrixis` client row.

## 2026-09-27 (CT) — Grok Bot: Apixis Wallet balance pill (PR #6 built on + merged, merge 42c600d)
- What: merged Claude's Apixis ID / shared-Wallet PR #6 (Sign in with Apixis, SDK v3 `lib/apixis-wallet.ts`, `lib/apixis-login.ts`, `/auth/apixis/start|callback`, `GET /api/wallet/balance`, chip in `AppNav`) after updating it with main, plus Grok's commit 7daf776: shared-fetch Ixis pill that refetches on focus/visibility/pageshow and shows "Sign in with Apixis" when not linked; pill also in `SiteNav` for signed-in visitors (desktop + mobile); route returns `linked`.
- Where (Grok commit): `components/ApixisWalletChip.tsx`, `components/SiteNav.tsx`, `app/api/wallet/balance/route.ts`.
- Note: PR #6 (Claude) also changes `app/api/redeem/route.ts` to pass the Apixis `sub` as Wallet owner.
- Not touched by Grok: Wallet code/env/keys, Stripe, checkout, payment links.
- Undo: `git revert -m 1 42c600da733ec75b85da343720a4a99e59f2a100` (all of PR #6), or revert only 7daf776 for the pill.

## 2026-09-28 (CT) — Grok Developer Bot: own Apixis world agent for every new Lyrixis signup
- What: new Lyrixis accounts (created after 2026-09-28 07:30 UTC, email verified or signed in with Apixis ID) get their own Apixis world agent (default Apixis body, customizable later) plus the one-time 200 in-world Ixis starter grant. Creation is server-side: `GET /api/apixis/world-agent` calls Apixis.dev `POST https://www.apixis.dev/api/agent/provision` with the product key `APIXIS_WORLD_KEY` (Vercel env, sensitive). Idempotent (DB unique constraints on the Apixis side; Supabase auth `app_metadata.apixis_world_agent_*` flag here). A one-time welcome card on `/dashboard` (Cixy as guide, agent name, "Enter the world" via Apixis ID, "Not now") and an "Apixis World ↗" link in `AppNav`. No backfill of older accounts.
- Where: `app/api/apixis/world-agent/route.ts`, `components/ApixisWorldWelcome.tsx`, `lib/apixis-world.ts`, `lib/apixis-world-provision.ts`, `lib/apixis-world-agent.ts`, `lib/apixis-world-agent.test.ts`, `app/dashboard/page.tsx`, `components/AppNav.tsx`, `public/cixy/cixy-combo-a-avatar.webp`, `.env.example`.
- Not touched: login/signup pages, Wallet pill/balance route, Stripe/payments, existing accounts.
- Undo: revert the PR's squash commit; optionally remove Vercel env `APIXIS_WORLD_KEY` (the route then does nothing). Agents already created live in Apixis.dev (`apixis.agents`) and are not deleted by reverting.

## 2026-09-29 (CT) — Grok (Lyrixis Lead): footer "Other Ixis companies"
- What: added an "Other Ixis companies" column to the site footer with plain text links (new tab, `rel="noopener noreferrer"`) to the 13 approved Ixis sites (Lyrixis itself excluded; Nexxis/Omnixis, Launchixis, PersonalContentBot, AwadBot, COMMAND intentionally left out). Existing footer classes reused; the footer grid went from `sm:grid-cols-4` to `sm:grid-cols-5` to fit the third column. Approved by Awad via the Developer Bot hub as a one-time exception to the credit pause.
- Where: `lib/ixis-companies.ts` (single list — swap URLs here when custom domains arrive), `components/SiteFooter.tsx`.
- Who: Lyrixis Lead / Grok. PR against main, not merged, not deployed to production.
- Undo: revert the PR (or its merge/squash commit).
- 2026-09-29 (CT) follow-up: removed Qahwah World and Nursery Toons from `lib/ixis-companies.ts` (Awad-approved via hub); footer now lists 11 sites. Same undo.

## 2026-10-05 (CT) — Grok (Lyrixis Lead): footer on every page + Cixy page help
- What: the shared footer (with "Other Ixis companies") now also shows on /companies, /dashboard, /upload, /tracks/[id], /add and /support. The static /enterprise page (`public/index.html`) got the same "Other Ixis companies" column (same 12 links as `lib/ixis-companies.ts`).
- What: Cixy page help (port of Socixis `CixyPageHelp`): a "Need help?" pill bottom-left with Cixy's photo opens a panel with how-this-page-works steps, tips and suggestion chips; "Ask Cixy" opens the ◈ chat prefilled. /enterprise has a static version with per-tab steps (home, pricing, API, enterprise, FAQ); its tabs now also follow hash changes.
- Where: `lib/cixy-page-help.ts`, `components/CixyPageHelp.tsx`, `app/layout.tsx`, `components/CixyWidget.tsx`, `components/CixyChat.tsx` (`initialInput`), the six pages above, `public/index.html`, `lib/__tests__/cixy-page-help.test.ts`.
- Not touched: payments, Wallet, auth, database, env.
- Undo: revert this PR's squash commit.

---
_Backfill below (written 2026-10-02 ~17:30 CT by Grok Developer Bot, notes only, Awad-approved via Developer Bot hub 2026-10-02 17:28 CT). Facts are from git and the GitHub REST API. All PRs in this repo are opened and merged under the `313aidaroos` GitHub account; "who" below comes from branch prefix, PR body, AI_CHANGELOG.md and Co-authored-by lines. Times are America/Chicago._

## 2026-09-28 02:35 (CT) — Grok Developer Bot: WORKBOARD claim for login sweep
- What: one-line claim added to `WORKBOARD.md` for the login sweep (became PR #11).
- Where: direct-to-main commit 6896439 (`workboard: Grok login sweep claim [skip ci]`), `WORKBOARD.md` only.
- Who: commit message names Grok; git author `313aidaroos`.
- Undo: `git revert 6896439`.

## 2026-09-28 02:40 (CT) — Grok Developer Bot: login sweep (PR #11, merged)
- What: `/login` and `/signup` share one LoginForm ("Log in with Apixis ID", Magic link / Password tabs, "Forgot password?"); `/set-password` reset mode; Cixy sign-in help card; wallet pill no longer shows "Sign in with Apixis" to signed-in people ("Link Apixis ID" for email-only accounts); Cixy knows sign-in options.
- Where: PR #11 (branch `grok/login-sweep`), squash commit 290ffe3. Files: `components/LoginForm.tsx`, `components/CixyLoginHelp.tsx` (new), `components/CixyChat.tsx`, `components/CixyWidget.tsx`, `components/ApixisWalletChip.tsx`, `app/api/wallet/balance/route.ts`, `app/login/actions.ts`, `app/login/page.tsx`, `app/signup/page.tsx`, `app/set-password/page.tsx`, `lib/cixy-prompt.ts`.
- Who: Grok Developer Bot (commit body signed "Grok Developer Bot, 2026-09-28").
- Undo: `git revert 290ffe3`.

## 2026-09-28 04:08 (CT) — JunoAI: AI_CHANGELOG.md rule (PR #12, merged)
- What: new `AI_CHANGELOG.md` (every AI must log changes); linked from `CLAUDE.md`.
- Where: PR #12 (branch `junoai/ai-changelog`), squash commit ce82e14. Files: `AI_CHANGELOG.md`, `CLAUDE.md`.
- Who: JunoAI (branch prefix + AI_CHANGELOG entry).
- Undo: `git revert ce82e14`.

## 2026-09-28 04:24 (CT) — JunoAI: shared CI (PR #13, merged)
- What: shared CI caller workflow (`node-ci / ci` check on PRs), `JUNOAI_NOTES.md`, AI_CHANGELOG entry; the CLAUDE.md link added in #12 was removed in conflict resolution (3 lines).
- Where: PR #13 (branch `junoai/ci`), squash commit 33288d4. Files: `.github/workflows/ci.yml`, `AI_CHANGELOG.md`, `CLAUDE.md`, `JUNOAI_NOTES.md`.
- Who: JunoAI (branch prefix + AI_CHANGELOG entry).
- Undo: `git revert 33288d4`.

## 2026-09-29 20:33 (CT) — Grok Developer Bot: footer "Other Ixis companies" (PR #14, OPEN)
- What: footer column with 11 approved sites (`lib/ixis-companies.ts`), grid 4 → 5 columns. Not merged, not on production. As of 2026-10-02 it has merge conflicts with main (mergeable_state `dirty`); CI and Vercel preview passed.
- Where: PR #14 (branch `grok/ixis-footer`, head debe5ed). https://github.com/313aidaroos/Lyrixis/pull/14
- Who: Grok Developer Bot (branch prefix; PR body cites Developer Bot hub approval 2026-09-29).
- Undo: close the PR (nothing on main to revert).

## 2026-09-29 20:51 (CT) — Grok Developer Bot: one account / world agent at first sign-in (PR #15, CLOSED unmerged 2026-10-01 23:18 CT)
- What: proposed world agent at first sign-in + agent link + 200 → 1000 starter copy. Closed without merging; closing comment (posted from the `313aidaroos` account, "Generated by Claude Code") says main already has the world agent at sign-in and agent link via the shared kits, and the 1,000 wording landed in #20. Branch kept. Part of the 10/01–10/02 PR cleanup (10/02 UTC).
- Where: PR #15 (branch `grok/one-account`, head 40d6563). Never on main.
- Who: Grok Developer Bot (branch prefix); closed by Claude Code.
- Undo: re-open PR #15.

## 2026-09-29 22:27 (CT) — Juno: Release Tool v1 (PR #16, OPEN)
- What: pay-per-song `/release` wizard (+1741 lines, 16 files, no new env vars per PR body; needs Wallet product `lyrixis.release.package` registered before pay works). Not merged, not on production. As of 2026-10-02 it has merge conflicts (`dirty`); CI and Vercel preview passed.
- Where: PR #16 (branch `juno/release-tool-v1`, head 9c33467). https://github.com/313aidaroos/Lyrixis/pull/16
- Who: Juno (branch prefix).
- Undo: close the PR (nothing on main to revert).

## 2026-09-29 23:16 (CT) — Vercel env: APIXIS_WORLD_KEY and APIXIS_WORLD_API added
- What: two env vars created on the `lyrixis` Vercel project (production, preview, development): `APIXIS_WORLD_KEY` (encrypted) and `APIXIS_WORLD_API` (plain). Names only recorded here. This is the key the world-agent route (PR #10) needs; without it provisioning returns `apixis_world_key_missing`.
- Where: Vercel project env (created 2026-09-29 23:16:45–46 CT).
- Who: Vercel user `313aidaroos`; which agent or person did it is unknown.
- Undo: remove `APIXIS_WORLD_KEY` and `APIXIS_WORLD_API` in Vercel and redeploy (world-agent route then does nothing).

## 2026-09-29 23:27 (CT) — Awad: test provision endpoint added (later removed)
- What: temporary `app/api/test-provision/route.ts` ("DELETE after QA").
- Where: direct-to-main commit fe7bb4b.
- Who: git author Awad Alaidaroos; whether an agent made it on his behalf is unknown.
- Undo: removed already in 865cbc2 (next entry); nothing to undo.

## 2026-09-29 23:45 (CT) — Awad: new-user sign-in fix in auth callback; /api/test-provision removed
- What: fleet-wide bug where brand-new emails got `otp_expired` on the first magic link. `app/auth/callback/page.tsx` handles `token_hash` with `verifyOtp({ type: 'email' })`, keeps PKCE and implicit flows; adds `scripts/generate_signin.mjs`; deletes `app/api/test-provision/route.ts` (now 404 on production).
- Where: direct-to-main commit 865cbc2. Files: `app/auth/callback/page.tsx`, `scripts/generate_signin.mjs`, `app/api/test-provision/route.ts` (deleted).
- Who: git author Awad Alaidaroos (message references Ominix 3d17c68, 78d2af9); agent involvement unknown.
- Undo: `git revert 865cbc2` (this would also bring back the test route).

## 2026-09-29 23:49 (CT) — Awad: new-user sign-in fix moved into middleware
- What: `middleware.ts` handles `token_hash` `verifyOtp` (type `email`) and sets cookies on the redirect response; most of the callback-page handling from 865cbc2 is removed again.
- Where: direct-to-main commit 84dd537. Files: `middleware.ts`, `app/auth/callback/page.tsx`.
- Who: git author Awad Alaidaroos; agent involvement unknown.
- Undo: `git revert 84dd537`.

## 2026-09-30 01:22 (CT) — Codex: shared-login redirect hardening (PR #17, merged)
- What: canonical ApixisWallet local-redirect validator used at login start and callback, plus regression tests.
- Where: PR #17 (branch `codex/tester-readiness`), squash commit f54e7b9. Files: `lib/apixis-redirect.ts` (new), `lib/apixis-login.ts`, `lib/__tests__/apixis-redirect.test.ts`, `AI_CHANGELOG.md`.
- Who: Codex (branch prefix + AI_CHANGELOG entry); Co-authored-by Awad Alaidaroos.
- Undo: `git revert f54e7b9`.

## 2026-09-30 02:33 (CT) — Claude: re-sync Apixis kits (PR #18, merged)
- What: `lib/apixis-login.ts` re-copied (verifyOtp type `email`), `lib/apixis-wallet.ts` → SDK v3.1 (marketplaceOrder/Settle), world kit re-synced (15 clients, 1,000 starter Ixis).
- Where: PR #18 (branch `claude/awesome-newton-3tygzi`), squash commit e25307d. Files: `lib/apixis-login.ts`, `lib/apixis-wallet.ts`, `lib/apixis-world.ts`, `lib/apixis-world-provision.ts`, `lib/apixis-world-agent.test.ts`, `AI_CHANGELOG.md`.
- Who: Claude (Co-authored-by: Claude).
- Undo: `git revert e25307d`.

## 2026-10-01 20:56 (CT) — Claude: full .env.example (PR #19, merged)
- What: `.env.example` lists every env var the code reads. No code change.
- Where: PR #19, squash commit 1386597. Files: `.env.example`, `AI_CHANGELOG.md`.
- Who: Claude (Co-authored-by: Claude).
- Undo: `git revert 1386597`.

## 2026-10-01 23:10 (CT) — Claude: starter in-world Ixis wording 1,000 not 200 (PR #20, merged)
- What: new-account copy says the Apixis world agent starts with 1,000 in-world Ixis (D11).
- Where: PR #20, squash commit 442363e. Files: `app/api/apixis/world-agent/route.ts`, `components/ApixisWorldWelcome.tsx`, `components/LoginForm.tsx`, `lib/apixis-world-agent.ts`, `lib/apixis-world-agent.test.ts`, `lib/cixy-prompt.ts`, `AI_CHANGELOG.md`.
- Who: Claude (Co-authored-by: Claude).
- Undo: `git revert 442363e`.

## 2026-10-01 23:19–23:20 (CT) — PR cleanup: #1 and #5 closed unmerged
- What: PR #1 (`cursor/lyrixis-upload-platform-6994`, stale draft; "superseded, upload and processing are built on main") closed 23:19 CT; PR #5 (`cursor/cixy-customizer-bd03`, Cixy customizer draft; "never picked up") closed 23:20 CT. Branches kept. Together with #15 these are the only closures in this repo during the 10/01–10/02 cleanup (closed_at on 10/02 UTC).
- Who: closing comments posted from the `313aidaroos` account, "Generated by Claude Code".
- Undo: re-open PR #1 / PR #5.

## 2026-10-02 02:21 (CT) — Codex: Apixis Companies page (PR #21, merged)
- What: new `/companies` page (15 illustrated, animated company cards, reduced-motion support) and an "Apixis Companies" nav item.
- Where: PR #21 (branch `codex/companies-tab-20261002`), squash commit b932930. Files: `app/companies/page.tsx`, `app/companies/companies.css`, `components/SiteNav.tsx`, `public/companies/*.jpg` (6 images).
- Who: Codex (branch prefix; no AI_CHANGELOG entry found).
- Undo: `git revert b932930` (revert #23 and #22 first).

## 2026-10-02 02:46 (CT) — Codex: Companies card motion and copy (PR #22, merged)
- What: removed orbit/spark overlays and badge bounce; card descriptions and links aligned with the approved mockup.
- Where: PR #22 (branch `codex/refine-companies-motion-20261002`), squash commit c413496. Files: `app/companies/page.tsx`, `app/companies/companies.css`.
- Who: Codex (branch prefix).
- Undo: `git revert c413496`.

## 2026-10-02 03:18 (CT) — Codex: Recovra link fix (PR #23, merged) + production deploy
- What: Recovra card points to recovra-three.vercel.app (recovra.vercel.app serves a different app).
- Where: PR #23 (branch `codex/fix-recovra-company-link-20261002`), squash commit 475f737, `app/companies/page.tsx`. Production deployment `dpl_Fb83RLm6kPfGuS2G3KPQsjbzhH1p` built from main 475f737, READY at 03:18 CT.
- Who: Codex (branch prefix); deploy is the Vercel Git integration (creator `313aidaroos`).
- Undo: `git revert 475f737`; or promote/roll back to the previous production deployment `dpl_EbmtyMLb7RRfKS9pcxHcmLKjjEwn` (c413496).

## 2026-10-04 17:55 (CT) — Grok (Lyrixis Lead): upload worker hosting plan (PR, not merged; nothing provisioned)
- What: Awad approved (2026-10-04) getting upload processing running. This PR adds `Dockerfile.worker` (Node 22 + ffmpeg, esbuild ESM bundle), `.dockerignore`, `railway.json` (Railway Docker service, watchPatterns limited to worker code), `worker:build` / `worker:start` scripts, opt-in `WORKER_CONCURRENCY` / `WORKER_DRAIN_DELAY_SEC` / `WORKER_STALLED_INTERVAL_MS` knobs in `workers/index.ts` (unset = previous behavior), `docs/WORKER_HOSTING.md`, `.env.example` lines.
- Found: `npm run worker` (tsx) crashes at startup with ERR_PACKAGE_PATH_NOT_EXPORTED (`file-type` is ESM-only via `music-metadata`), so it's replaced by the ESM bundle. The normalized WAV goes over the 25 MB transcription limit past ~13 min, so use MAX_DURATION_SECONDS=720. Default BullMQ polling is ~1.1M Upstash commands/month (over the free 500K); the tuning knobs bring it to ~95K.
- Recommended (awaiting Awad): Upstash for Redis Free via Vercel Marketplace, a worker service on Railway (already used for awad-command), Groq whisper-large-v3 (free tier, then $0.111/audio-hr).
- Not done: no sign-ups, no Marketplace install, no env vars, no deploys. Branch `grok/lyrixis-voices` not touched.
- Who: Lyrixis Lead / Grok.
- Undo: close the PR, or revert its squash commit if merged. Nothing external to undo.

## 2026-10-04 (CT) — Grok Bot: Feed tab on Lyrixis (PR open, NOT merged)
- Why: Awad asked for the Socixis Social family feed as a Feed tab on every Ixis site. Awad put feed changes on hold, so this PR is for preview review only; do not merge until Awad says so.
- What: new public `/feed` page in Lyrixis's own shell (same header, footer, fonts, colors and buttons). For You is the unfiltered mixed feed from every Apixis company with source-site badges and AI labels; Following, Search · Trending and You tabs; video/photo/text posts, like, comment, follow, save, share, report, tips and boosts in Ixis. Signed-out visitors can browse; the 4th tab says "You" and shows a sign-in card (Apixis ID). Text-only posts use the site's body font, wrap long words and size to their content; media posts keep the full-height layout; feed modals sit above everything.
- Where: `app/feed/` (page with SiteNav/SiteFooter, Lyrixis skin, `feed.css` mapped to Lyrixis tokens), `feed-client/` (shared client), `app/api/feed-session/route.ts`, "Feed" link in `components/SiteNav.tsx` (desktop + mobile), `lib/feed-client.test.ts`.
- Backend: https://www.apixis.dev/api/feed. `/api/feed-session` calls POST /api/feed/session server-side with the existing `APIXIS_WORLD_KEY` + X-Apixis-Client/Sub/Email and returns the short-lived fdt_ token. No new env vars, no DB change, no SVGs.
- Who: Grok Bot (for Awad).
- Undo: close this PR, or `git revert <squash sha>` if it is ever merged.

## 2026-10-04 19:00 (CT) — Grok Bot: Feed phone tab fit (same PR, still NOT merged)
- What: at 375px the 4th "You" tab was pushed off-screen by "Search · Trending". Under 560px the tab now reads "Search", tabs are tighter, and if a wide site font still can't fit the tabs and "+ Post" on one row, Post drops to its own row instead of covering "You". Desktop is unchanged; the site's colors, fonts and buttons are untouched; no SVGs. Also: desktop header (`components/SiteNav.tsx`) uses gap-6 + whitespace-nowrap so the extra Feed link no longer wraps "Use Cases" / "Buy Ixis" / "Sign in" at 1440px.
- Where: feed client `FeedView.tsx` (tab label) and the shared layout section of the site's feed CSS.
- Who: Grok Bot (for Awad). No merge, no production deploy.
- Undo: revert this commit on the PR branch.
## 2026-10-04 — Owner allowlist (Grok)
- What: lib/owners.ts adds isOwner() and currentSessionIsOwner(). An owner is a confirmed email that is alaidaroosawad@gmail.com, awad@apixis.dev or in ADMIN_EMAILS, AND a session with an email-proving sign-in (magic link/OTP, Apixis ID/OAuth, recovery). A password-only session never counts, because neither owner has an account in mkuvgkjakxkytscfvnkf yet. An owner skips the unlock gates: full lyrics and track exports on his own tracks (/api/tracks/[id], /api/tracks/[id]/exports), and catalog exports plus the catalog page unlock state. These are product gates only: no track_unlocks row, no Wallet call, no ledger entry. His real Wallet purchases still work as normal.
- Not changed: Lyrixis has no admin pages (the /admin/support link in support emails has no page), and no new admin UI was built.
- Where: lib/owners.ts (+ lib/owners.test.ts), app/api/catalog/[id]/export/route.ts, app/api/tracks/[id]/route.ts, app/api/tracks/[id]/exports/route.ts, app/catalog/[id]/page.tsx. ADMIN_EMAILS was added to the Vercel project lyrixis.
- Who: Grok.
- Undo: revert this PR and remove ADMIN_EMAILS from Vercel.
## 2026-10-04 catch-up provenance (CT)

The entries below record the day's observed commits and merged PRs. Existing detailed entries above remain the change descriptions; this section supplies exact provenance and undo pointers.

### Commits
- `04b09b3` (2026-10-04T17:57:07-05:00, 313aidaroos; 313aidaroos@users.noreply.github.com) — Upload worker hosting: Dockerfile.worker, railway.json, docs, env example, opt-in polling knobs. Undo: no main change; close/delete the branch (or revert the branch commit before reuse).
- `48c00c3` (2026-10-04T18:11:35-05:00, 313aidaroos; 313aidaroos@users.noreply.github.com) — Feed tab: Socixis Social family feed at /feed (preview only, do not merge). Undo: no main change; close/delete the branch (or revert the branch commit before reuse).
- `bfac9cc` (2026-10-04T18:14:59-05:00, 313aidaroos; alaidaroosawad@gmail.com) — Owner allowlist: proven owner session skips unlock gates (#26). Undo: undo via the merged PR below: git revert bfac9cc.

### Merged PRs
- PR #26, merge `bfac9cc`, `grok/owner-allowlist` → `main`, merged 2026-10-04 CT by 313aidaroos: Owner allowlist: proven owner session skips unlock gates. Undo: `git revert bfac9cc`.

## 2026-10-04 18:45 (CT) — Grok (Lyrixis Lead): Lyrixis Voices (PR open, not merged)
- What: invite-only Arabic/bilingual voice licensing marketplace at `/voices` — catalog, auditions, license flow with frozen terms + Wallet hold/capture, receipts, creator onboarding/consent/permissions, provider (ElevenLabs) verification with admin fallback, admin console, double-entry ledger (creator 60% after 5% fee + provider cost; payout blocked), workspaces, Socixis partner API, Cixy read-only recommendations, metrics. Demo mode on previews (fictional voices, demo Ixis, tone audio). Awad's 2026-10-04 defaults seeded as editable versioned config.
- Where: branch `grok/lyrixis-voices`. `app/voices/**`, `app/api/voices/**`, `app/api/v1/voices/**`, `lib/voices/**`, `components/voices/**`, `database/migrations/0006_lyrixis_voices.sql` (+ rollback, local tests; NOT applied), `scripts/voices-db-test.sh`, `docs/voices/**`, `docs/VOICE_MARKET.md`, `components/SiteNav.tsx` (one link), `.env.example`. Removed old skeleton `lib/voiceMarket.ts`, `components/VoiceFloor.tsx`, `app/api/voices/route.ts` (replaced).
- Who: Grok as Lyrixis Lead, approved by Awad 2026-10-04 17:49 CT.
- Undo: close the PR / delete the branch. After a merge: `git revert <merge commit>`; if 0006 was applied, run `database/migrations/rollback/0006_lyrixis_voices_down.sql`.
## 2026-10-04 6:55 PM (CT) — Grok: PR #14 footer branch brought up to date with main (not merged)
- What: merged `main` (`450c577`) into `grok/ixis-footer` with a normal merge commit (no force-push). Conflicts in `NOTES/GROK.md` and `AI_CHANGELOG.md` resolved by keeping both sides' entries; `WORKBOARD.md` merged cleanly with both sides' lines. `lib/ixis-companies.ts` stays the footer's single list (11 sites). Its header comment now says Ominix (formerly Nexxis/Omnixis) is still excluded, matching the brief. No site added or removed.
- Where: branch `grok/ixis-footer` (PR #14): `lib/ixis-companies.ts` (comment only), `NOTES/GROK.md`, `AI_CHANGELOG.md`.
- Who: Grok (Developer Bot executor), at the hub's request. Not merged; Awad confirms merges.
- Undo: on the branch, `git revert -m 1` the commit "Merge main into grok/ixis-footer" (it carries the merge, the comment change and these notes).
- Preview check (7:00 PM CT, Vercel preview `dpl_Bb4cB9ZeVUPprdeB9i5qbCccqR3E`, merge commit `fcfa751`, CI and Vercel green): the footer shows the "Other Ixis companies" column with 11 links (new tab, `noopener noreferrer`) at 1280 and 390 px, with no sideways scroll and no page errors. Compared with live `lyrixis.vercel.app`, the homepage above the footer is pixel-identical at both widths, and the footer link font and colors are the same. Theme unchanged apart from the new column. Screenshots on the box: `/workspace/lyrixis-footer/v2/`.
## 2026-10-04 6:01 PM / 6:31 PM (CT) — Claude: full-portfolio review notes (PR #27, merged)
- What: notes only. New `NOTES/CLAUDE.md` (this repo's slice of Claude's 24-repo review: what is live, what is open, who owns it, drift found) and a 2026-10-04 entry in `AI_CHANGELOG.md`. No code, env, database or deploy changes.
- Where: branch `claude/great-fermi-6brq7a` (commit `39882db`, 6:01 PM CT, author Claude <noreply@anthropic.com>) → PR #27, squash commit `8cf8429` on `main`, merged 6:31 PM CT by 313aidaroos (body says Awad approved). Vercel production `dpl_GRPjDqkXsrSGsLfS9Tcb1Pq7Fhrn` built from `8cf8429`, READY (auto-deploy from main; notes only, so the site output did not change).
- Who: Claude (Claude Code), merged from the 313aidaroos account.
- Accuracy: `NOTES/CLAUDE.md` says "`main` @ `3fd1b9d` … code unchanged since 10-02", but #26 (owner allowlist, code) had already merged at 6:14 PM CT. The Ominix link drift it lists is fixed in `grok/claude-audit-fixes`.
- Undo: `git revert 8cf8429` (removes `NOTES/CLAUDE.md` and the AI_CHANGELOG lines). The branch `claude/great-fermi-6brq7a` can be deleted once nobody needs it.

## 2026-10-04 6:51 PM (CT) — Grok: Claude-audit lock fixes (PR #29, branch `grok/claude-audit-fixes`, open, not merged)
- What: audit of everything since `3fd1b9d` against Awad's locks; fixed the lock breaks found on `main`:
  - `components/TrackView.tsx` (`/tracks/[id]`, own uploads): removed the dead Stripe checkout button (it POSTed to `/api/checkout`, which is gone and returns 404), the "Stripe confirms the webhook" notice and the USD price from `/api/quote`. It now says plainly that upload unlocks will go through the Apixis Wallet and are not live yet. No charge path added.
  - `components/AuthForm.tsx` and `app/api/support/intake/route.ts`: removed the "As-salamu alaykum" greetings (religious wording belongs only on Halaxis). The support email now opens with "Hi,".
  - `app/companies/page.tsx`: Ominix link `nexxis-tau.vercel.app` (retired host) → `https://ominix-app.vercel.app`.
  - `components/LoginForm.tsx`, `components/ApixisWorldWelcome.tsx`: the 1,000 Ixis wording now says Apixis.dev gives it.
- Not touched: `lib/cixy-prompt.ts` (Cixy prompt, flagged to Awad: it still has Muslim identity, halal and prayer/Ramadan instructions), footer (PR #14), env, database, deploys.
- Who: Grok (Developer Bot executor).
- Undo: close the PR without merging, or after a merge `git revert <squash sha>`.

## 2026-10-04 6:57 PM (CT) — Hub decision + PR #29 refresh (notes only)
- Decision (Developer Bot hub, 2026-10-04): own uploads on `/tracks/[id]` will reuse the existing Wallet product `lyrixis.track.unlock` (300 Ixis), the same SKU as catalog unlocks. **Not built yet.** PR #29 only removes the dead Stripe checkout and shows an honest "not live yet" note. A later PR will add the Wallet redeem path for uploads (today `app/api/redeem/route.ts` only looks up `catalog_recordings`).
- Cixy prompt: `lib/cixy-prompt.ts` is not changed in #29. Developer Bot will sync it after #29.
- Refresh: merged `main` (`450c577`, which had already restored this file's intro line and fixed the 10-04 summary) into `grok/claude-audit-fixes` with a normal merge commit. Kept main's summary lines in the one conflict.
- Who: Grok (Developer Bot executor). Undo: `git revert -m 1` the "Merge main into grok/claude-audit-fixes" commit; this entry goes with it.

## 2026-10-04 (CT) — Grok (Developer Bot hub): Cixy persona v2 sync + Ominix link
- What: lib/cixy-prompt.ts now builds on the v2 kit (new lib/apixis-cixy.ts, same text as the other TS sites); removed 'Muslim AI operator' identity, salaam/Insha'Allah/alhamdulillah, 'NOT a scholar', HALAL-CONSCIOUS (alcohol/pork/gambling/riba/haram lyrics) and PRAYER/RAMADAN AWARE blocks. Added lib/__tests__/cixy-prompt.test.ts (religious-terms guard). The Ominix link and the AuthForm/support-email salam greetings are left to lead PR #29 to avoid conflicting with it.
- Files: lib/cixy-prompt.ts lib/__tests__/cixy-prompt.test.ts lib/apixis-cixy.ts 
- Why: Awad's lock — no religious content in Cixy on any product except Halaxis; she declines only genuinely harmful, deceptive or illegal content, never on religious grounds (9/30). Kit = ApixisWallet `sdk/apixis-cixy.*` v2 (3a22244, PR #50) with two hub edits pending canonical: the religion-derived "clean recommendations" rule (gambling) is replaced by "decline only harmful, deceptive or illegal, never on religious grounds", and the character line reads "draws on Arab culture". Ominix links point to https://ominix-app.vercel.app (checked 200 on 2026-10-04 ~6:55 PM CT).
- Who: Grok (Developer Bot hub), branch `grok/cixy-v2-20261004`, one squash-merged PR.
- Undo: `git revert <squash sha of this PR>` (sha recorded in the PR), then redeploy prod.

## 2026-10-04 19:13 (CT) — Grok Bot: Feed PR #25 approved for production by Awad
- Why: Awad said "make it live" at 7:13 PM CT on Oct 4, 2026, approving the squash-merge of this PR and the production deploy that follows from main.
- What: squash-merge of PR #25 (feed files + Feed nav entry only); Vercel's Git integration deploys main to production.
- Who: Grok Bot (for Awad).
- Undo: `git revert <squash sha of PR #25>` on main and push (the squash sha is on the PR page and in /workspace/feed/STATUS.md), or in Vercel promote the previous production deployment (instant rollback) and then revert.

## 2026-10-04 evening provenance, 6:57 to 9:25 PM (CT)

Recorded by Grok (Developer Bot, notes and status sync at 9:25 PM CT). Every change below already has a detailed entry in this file or in the matching lead note; this section adds the exact commit, PR number, and undo pointer. All commits were pushed under the shared `313aidaroos` GitHub account; the detailed entries say which bot or lead made each one. Text only, no code or settings changed.

- 7:11 PM, PR #30, `cff58a4`: Cixy persona v2 sync (no religious content outside Halaxis) + Ominix link to ominix-app.vercel.app. Undo: `git revert cff58a4` on `main`, then redeploy production.
- 7:17 PM, PR #25, `85388c7`: Feed tab: Socixis Social family feed at /feed. Undo: `git revert 85388c7` on `main`, then redeploy production.

## 2026-10-04 (CT) — Grok: new accounts only through Apixis ID (branch `grok/apixis-id-only-signup`)
- Approval: Awad said go at 10:00 PM CT, Oct 4 2026 ("every Ixis product must allow NEW account creation only through Apixis ID", the shared Wallet SSO at apixis-wallet.vercel.app/sso/authorize).
- What changed: Email magic links now use `shouldCreateUser: false` (server action `app/login/actions.ts` and legacy `POST /api/auth/magic-link`): existing accounts still get a link; a brand-new email gets "No Lyrixis account uses this email yet… use Log in with Apixis ID" (API also returns `apixis_id_url`). `/signup` (LoginForm variant "signup") now shows only "Log in with Apixis ID" plus "Already have an account? Sign in"; `/login` keeps email link + password for existing accounts with one existing-style hint line. No password signup existed. Same classes, no redesign.
- Not changed: Supabase project setting "Allow new users to sign up" stays ON (Apixis SSO callback may create users through it). Theme, layout and styles unchanged. No Wallet, Stripe or Cixy files touched.
- Undo: `git revert <squash sha of this PR>` (the sha is recorded in the PR and in /workspace/apixisid/STATUS.md on the box).

## 2026-10-05 overnight provenance, Oct 4 9:35 PM to Oct 5 12:25 AM (CT)

Recorded by Grok (Developer Bot, notes and status sync at 12:25 AM CT on Oct 5). Each change below either has its own detailed entry earlier in this file (written by whoever made it) or is described here. Commits under the shared `313aidaroos` account were made by the bot or lead named in the detailed entry. Every production deployment for this repo was Ready at the time of this sync. Text only, no code or settings changed.

- Oct 4 10:29 PM, PR #31, `3db2e58`: Apixis ID is the only way to create a Lyrixis account. Undo: `git revert 3db2e58` on `main`, then redeploy production.

## 2026-10-05 8:30 PM (CT): Grok (Lyrixis Lead), upload worker provisioning, part 1 (Awad approved at 8:00 PM CT)
- Approval: at 8:00 PM CT on Oct 5, 2026, Awad approved hosting the upload worker on his existing Railway account with a hard $20/month cap, Redis on Upstash Free, and Groq for transcription.
- Railway (workspace "313aidaroos's Projects" `f59787d4-de34-4d4c-b384-68826490794b`): created project **`lyrixis-worker`** `b40a5741-8d83-40e1-bb43-2dd464866304`, env `production` `61c39fc8-2c24-415e-87bf-f347e832c43a`, and service **`worker`** `653f58ed-e1fd-4596-81f0-aa3ca8e22dce`. No source is connected and nothing is deployed, so it costs $0. Service settings: dockerfilePath `Dockerfile.worker`, the watch patterns from `railway.json`, restart ON_FAILURE ×10, 1 replica, no sleep, limits 1 vCPU / 1 GB. Railway's API now rejects `railwayConfigFile` (Config as Code is deprecated), so these are set at the service level instead.
- Railway variables set (skipDeploys): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (copied from Vercel `lyrixis` Production), STORAGE_BUCKET, TRANSCRIPTION_PROVIDER/API_BASE_URL (Groq)/MODEL/CENTS_PER_MINUTE, LANGUAGE_PROVIDER, MAX_UPLOAD_MB=100, MAX_DURATION_SECONDS=720, WORKER_CONCURRENCY=2, WORKER_DRAIN_DELAY_SEC=60, WORKER_STALLED_INTERVAL_MS=300000, NODE_ENV. **Still missing:** REDIS_URL and TRANSCRIPTION_API_KEY (the Groq key).
- $20 cap: **NOT set.** `usageLimitSet` (soft $15 / hard $20) returned "Usage limits require an active subscription". The workspace is on the Hobby trial (4 days left on Oct 5), with no subscription and no payment method, and $2.83 of trial credit remaining. With no card on file nothing can be charged. Set the cap right after Awad subscribes, before the first deploy. The limit covers the whole workspace, including awad-command (about $1.66 used this period).
- Redis: nothing changed. The Vercel team already has an unused Upstash for Redis **Free** store `upstash-kv-teal-marble` (`store_PP9Mt0uHl6hab9zV`, iad1, eviction off, connected to 0 projects). Free allows one database per account, so this is the store to connect to `lyrixis`. It isn't connected yet on purpose: REDIS_URL on Vercel production without a running worker would let uploads enqueue and then sit unprocessed.
- PR #24 (`grok/upload-worker-hosting`): merged main into it (resolved a NOTES/GROK.md conflict by keeping both sides) and added a status paragraph to docs/WORKER_HOSTING.md. CI is green. Not merged.
- Vercel `lyrixis`: no env changes (no GROQ/TRANSCRIPTION/REDIS vars there).
- Who: Grok (Lyrixis Lead), with Awad's approval.
- Undo: Railway: delete project `lyrixis-worker` (`b40a5741-…`) in the dashboard or with `projectDelete`. Nothing else changed outside git. PR #24: revert merge commit `8a7a54a` and doc commit `5b90e5a` on the branch, or close the PR.

## 2026-10-05 8:15 PM (CT): Grok (Lyrixis Lead), PR #24 squash-merged (Awad approved at 8:12 PM CT)
- What: squash-merged PR #24 "Upload worker hosting: Dockerfile.worker + Railway config + docs" as **`aea9928`** (`aea9928066e83c21ee4dff9c5d9c5274beeb1f3a`) on `main`. It adds `Dockerfile.worker`, `.dockerignore`, `railway.json`, `worker:build`/`worker:start` scripts, the opt-in `WORKER_*` polling knobs in `workers/index.ts`, `docs/WORKER_HOSTING.md` and `.env.example` lines. The branch was up to date with main (`ba67a21`, after #14). CI (node-ci ×2) and the Vercel preview were green before the merge. #28 (Voices) was still open and untouched.
- Prod: Vercel deployment `dpl_75HXXyYkaWtbBUkZVd2BXVryLcv3` is READY and aliased to lyrixis.vercel.app. `/` 200, `/pricing` 200, `/tracks` → `/login?next=%2Ftracks` 200 (the expected auth redirect). The web app's runtime is unchanged: nothing it runs changed, only worker files, docs and scripts.
- Not done (not approved yet): Upstash `upstash-kv-teal-marble` is still connected to 0 projects. The Railway service `worker` (`653f58ed-e1fd-4596-81f0-aa3ca8e22dce`) still has no source and zero deployments, so the merge triggered no Railway build. The Railway subscription and the $20 cap are still pending.
- Who: Grok (Lyrixis Lead), with Awad's approval.
- Undo: `git revert aea9928` on `main` and push (Vercel redeploys automatically), or promote the previous prod deployment `dpl_CjTzhwEVwUcTdsoKEsn77H9AztpU` (`ba67a21`) in Vercel. No Railway or Upstash undo needed.

## 2026-10-05 8:20 PM (CT): Grok (Lyrixis Lead), PRs #29, #14 and #28 squash-merged (approved by Awad)
- Approval: Awad, 7:54 PM CT Oct 5 2026: "merge #29 and #14 once checks pass and the footer screenshots look right." Awad, 8:08 PM CT: Lyrixis Voices PR #28 approved (stay invite-only, labeled demo voice service, no keys, do not apply migration 0006).
- **PR #29**, merged 8:06 PM CT as **`03df856`** (`03df856917b63dd4833bb88c86a514263636cefb`): Claude-audit lock fixes. `/tracks/[id]` has no Stripe checkout button, notice or USD quote (it says the Wallet unlock is not live yet). "As-salamu alaykum" is removed from the magic-link screen and the support auto-reply. The 1,000 Ixis wording names Apixis.dev. Before merging, main (`a6d20f2`) was merged into the branch. The only conflict was in NOTES/GROK.md, where both sides were kept. The Ominix link on `/companies`, the Cixy prompt v2 (#30) and the Apixis-ID-only signup (#31) are main's versions, unchanged. Prod `dpl_3WP79z2SvjGx1ZLFRW1PdVohcXgw` READY.
- **PR #14**, merged 8:08 PM CT as **`ba67a21`** (`ba67a2197e6e0e169b11a6014111ede8a85329ba`): an "Other Ixis companies" footer column (`lib/ixis-companies.ts`, `components/SiteFooter.tsx`, grid 4 → 5 columns). The column now has **12** sites: Ominix was added at `https://ominix-app.vercel.app` (branch commit `c1554f7`), per the hub's instruction for this merge. The 9/29 brief had left Ominix out. The retired nexxis-tau host is not linked anywhere in the footer. Main was merged in twice, with notes-only conflicts both times and both sides kept. Preview checks: footer screenshots at 1280 and 390 px on `/` and `/pricing` look clean, use the same theme, have no sideways scroll and no page errors. All 12 company links and the Wallet link returned 200. Prod `dpl_CjTzhwEVwUcTdsoKEsn77H9AztpU` READY. Screenshots are on the box at `/workspace/lyrixis-footer-shots/`.
- **PR #28**, merged 8:17 PM CT as **`acf2978`** (`acf29787fb8c5f5b9134abde7ee47b93884b4a14`): Lyrixis Voices. Main was merged in twice (after #14, then after #24). The conflicts were only in notes, `.env.example` and WORKBOARD, and both sides were kept. Production stays closed: `VOICES_LIVE` is not set on Vercel and no VOICES_*/ELEVENLABS_* env vars exist. `/voices/*` shows "Opening soon", `/api/voices*` returns 404, and the nav has no Voices link. Previews run the in-memory demo, which is labeled ("Demo mode" banner, "Demo ·" fictional voices, demo Ixis) and invite-only. No keys were added. Prod `dpl_3irdZDMseEX3q4MunZV7hQBS1if4` READY.
  - **Migration `database/migrations/0006_lyrixis_voices.sql` is NOT applied to prod.** A read-only check confirms prod Supabase has no `voice*` tables. Without it, prod does not break, because users get "Opening soon". However, Next still runs the hidden `/voices` page components, so each visit makes one failing read on the missing `voices` table, which shows up as server log noise. Suggested follow-up: an early `voicesOpen()` return in the pages. Apply 0006 only as part of the launch checklist (`docs/voices/LAUNCH_CHECKLIST.md`), before setting `VOICES_LIVE=true`.
- CI (node-ci) and the Vercel previews were green on every merged head. Local runs on Node 22 also passed: lint (warnings only), typecheck, vitest (48 tests before #28, 81 with it) and build.
- Who: Grok (Lyrixis Lead), approved by Awad. Merged from the shared 313aidaroos account.
- Undo (newest first): `git revert acf2978` (Voices), `git revert ba67a21` (footer), `git revert 03df856` (audit fixes) on `main`, then push. Vercel redeploys. Or promote an earlier prod deployment in Vercel, for example `dpl_75HXXyYkaWtbBUkZVd2BXVryLcv3` (state before #28). Nothing to undo in the database or env.

## 2026-10-05 8:40 PM (CT): Grok (Lyrixis Lead), "go cleanup" (Awad approved 8:31 PM CT)
- **World agents (Apixis.dev):** a backfill ran through the same flow as signup (`ensureWorldAgent`, then `POST https://www.apixis.dev/api/agent/provision` with this site's `APIXIS_WORLD_KEY`; idempotent by verified email). It created agents for **awad+lyrixis@apixis.dev** (agent `2a581d91-d10f-4155-85b3-35f466379174`) and **awad+lyrixis-new1@apixis.dev** (agent `0dd434b9-db62-4ae2-a7f4-f756694c8d34`). Both are recorded in auth `app_metadata.apixis_world_agent_*`. **Skipped:** `test-1790536061@lyrixis.test` and `qa-test-1790931718@lyrixis.test` (email not verified, which signup also refuses), plus Grok QA accounts `grok-apixis-1790575604@uberip.com` and `grok-lyrixis-1790733077@uberip.com` (test accounts; run `scripts/backfill-world-agents.ts --apply --only <email>` if Awad wants them).
  - **New signups:** `/auth/apixis/callback` (the only way to create an account since #31) now provisions the agent right after sign-in, using `after()` so the redirect is not delayed. The dashboard card (`GET /api/apixis/world-agent`) still retries if that call failed. Shared wiring is in `lib/lyrixis-world-agent.ts`, and `lib/apixis-login.ts` has an optional `onSignedIn` hook. The script is `scripts/backfill-world-agents.ts` (dry run by default).
- **Test catalog rows removed (prod DB):** `rec_lyrixis_ingest_probe` "Lyrixis Ingest Probe", `rec_night_catalog_one` "Night Catalog One" and `rec_night_catalog_two` "Night Catalog Two". All three are "Lyrixis Ensemble" rows whose license note reads "catalog probe". Their `catalog_lyrics` rows were removed by cascade. Backup of all 3 recordings and 3 lyrics rows: `/workspace/lyrixis-cleanup-backup-2026-10-05.json` on the box. `tracks` (the user uploads list) had 0 rows. The 14 public-domain rows stay.
- **Duplicate 0005:** `supabase_migrations` history has no 0003/0004/0005 entries (those files were run by hand), so this is a file name change only. `0005_cixy_messages.sql` is now `0005b_cixy_messages.sql`; `0005_id_backed_public_domain.sql` was committed first and keeps its name. References in 0006 and `scripts/voices-db-test.sh` are updated. Prod schema is unchanged.
- **Price 300:** prod `pricing_tiers` 1–99 is now 300 (it was 299). This is migration `20261005_track_unlock_price_300.sql`, applied to prod. `/api/pricing/tiers` now returns 300. The "$2.99" text is replaced in `ScaleSection`, `/enterprise` (`public/index.html`), the Cixy prompt, README, `schema.sql`, the brief, the architecture review and `docs/LAUNCH_NOTES.md`. `0001_init.sql` keeps its historical 299 seed, and the new migration overrides it. Not changed: tier 2 is 149 in the DB but 150 in the `PricingCalculator` fallback.
- **DB lockdown:** EXECUTE on `current_app_user_id()` and `current_org_ids()` is revoked from `anon` and `PUBLIC`. `authenticated` keeps it because 20 "own …" RLS policies call these helpers. The app reads those tables only with the service role. This is migration `20261005_revoke_anon_rls_helpers.sql`, applied to prod. After the change, `/`, `/pricing`, `/catalog`, `/api/pricing/tiers`, `/cixy` and `/login` return 200, and `/tracks` redirects to login as before.
- **Voices:** each `/voices` page now returns early when `voicesOpen()` is false, so production makes no reads on the missing `voices` table. A local prod-mode run showed 0 "voices db" errors.
- **Removed:** `components/ListenDesk.tsx` (nothing imported it; it said "after Stripe is live").
- Who: Grok (Lyrixis Lead), approved by Awad.
- Undo:
  - Code: `git revert 80a44d2` (PR #34, squash `80a44d2cde1cc3ecc2318b450c42b76717f6cd28`, merged 8:44 PM CT; prod `dpl_EPBdHvD4ntHDrUEiRY1svDPhfhwo` READY, `/`, `/pricing` 200, `/tracks` → login as expected).
  - Price: `update public.pricing_tiers set rate_cents = 299 where min_songs = 1 and max_songs = 99;`
  - Grants: `grant execute on function public.current_app_user_id(), public.current_org_ids() to public, anon;`
  - Catalog rows: re-insert from the backup JSON (recordings first, then lyrics).
  - World agents: they live on Apixis.dev (citizen and agent per email). To hide them on Lyrixis, clear `apixis_world_agent_*` in auth `app_metadata`. Removing them on Apixis.dev is an Apixis.dev admin action.

## 2026-10-05 ~8:50 PM (CT): Grok (Developer Bot), direct-to-Storage upload + own-upload unlock (PR from `grok/direct-upload-unlock`, NOT merged, NOT deployed)
- What: (1) Uploads no longer send audio through a Vercel function (5 MB POST hit 413 FUNCTION_PAYLOAD_TOO_LARGE). The browser asks `POST /api/tracks/upload-url` (JSON metadata: filename, mime, size, rights) for a one-time signed upload token for exactly `<user id>/<new uuid>/original.<ext>` in private bucket `lyrixis-audio-private` (bucket limit 100 MB), PUTs the file straight to Storage with a progress bar, then `POST /api/tracks` with JSON `{ upload_id, path, filename, title, artist, rights_confirmed }`. The server checks the path belongs to this user, reads only the first 1 MB of the stored object for magic bytes/tags (deletes it if it isn't audio), creates the track (`tracks.id` = upload id) and queues it exactly as before. Multipart `POST /api/tracks` still works for files under 4.5 MB. (2) A user can unlock their own uploaded track: `/api/redeem` with `kind: "upload"` (or a `trx_` id) uses the same Wallet SKU `lyrixis.track.unlock` (300 Ixis) and the same reserve → provision → capture flow; provision sets `tracks.paid = true` on the user's own row (released + flipped back if capture fails), only once lyrics are `completed`/`manual_review`; audit row `unlock` keeps the receipt id. `/tracks/[id]` shows "Unlock full lyrics · 300 Ixis" instead of "not live yet". (3) Transcription docs/defaults switched from Groq to OpenAI (`whisper-1`, base `https://api.openai.com/v1`), `MAX_DURATION_SECONDS` default 900 → 720 (OpenAI 25 MB per request).
- Where: `app/api/tracks/upload-url/route.ts` (new), `app/api/tracks/route.ts`, `services/tracks.ts`, `lib/storage.ts`, `lib/audio.ts`, `lib/env.ts`, `components/UploadForm.tsx`, `app/api/redeem/route.ts`, `components/RedeemButton.tsx`, `components/TrackView.tsx`, `lib/__tests__/direct-upload.test.ts`, `.env.example`, `README.md`, `docs/WORKER_HOSTING.md`.
- No database migration, no env change in this PR. Processing still needs `REDIS_URL` + a running worker (unchanged).
- Who: Grok / Developer Bot, for Awad.
- Undo: close the PR, or after merge `git revert <squash sha>`. Objects uploaded through the new flow stay in Storage under the same path scheme as before.

## 2026-10-05 ~8:55 PM (CT): Grok (Developer Bot), merged #32, #33, #35 (Awad approved merging)
- Order, all squash merges with CI (node-ci) and the Vercel preview green on the merged head:
  - **#32** at 8:46 PM CT as `11c0ef2` (direct-to-Storage upload + 300 Ixis own-upload unlock). Merged main (#34) first; the only conflict was in this file, and both sides were kept.
  - **#33** at 8:49 PM CT as `18b2656` (300 Ixis wording + Cixy prompt). Conflicts with #34 were resolved to the Ixis wording, and ListenDesk stays deleted. I dropped #33's duplicate price migration, because #34's `20261005_track_unlock_price_300.sql` already set prod to 300.
  - **#35** at 8:52 PM CT as `1058522` (footer on every page + Cixy page help). It merged cleanly.
- Production deployment `lyrixis-qvskvrz9w` (commit `1058522`) is Ready. Smoke test results:
  - 14 public pages return 200.
  - /upload, /dashboard and /tracks redirect signed-out visitors to /login?next=…
  - Signed out, POST /api/tracks/upload-url, POST /api/tracks, GET /api/tracks and POST /api/redeem return 401.
  - /api/pricing/tiers returns 300 for 1–99.
  - Catalog search works.
  - /enterprise has the "Other Ixis companies" footer and the Cixy help, with no $2.99.
  - The app pages show the footer and "Need help?".
- Database: nothing applied by me. `20261005_restrict_rls_helper_execute.sql` (re-scope the 21 "own …" policies to authenticated) is NOT applied. Its revoke half is already live from #34.
- Env: `TRANSCRIPTION_API_KEY` (OpenAI) was added to Vercel Production and Preview earlier this evening; there was no separate redeploy for it, but these merges redeployed prod. Lyrics still do not run: there is no REDIS_URL and no worker.
- Undo: `git revert 1058522`, `git revert 18b2656`, `git revert 11c0ef2` (newest first), or promote the #34 prod deployment in Vercel.

## 2026-10-05 ~9:10 PM (CT): Grok (Developer Bot), lyrics run inside Vercel, Option B (PR from `grok/inline-processing`)
- **What:** Awad chose Option B (fewest accounts and clicks): no Redis, no Railway worker.
  - **Trigger:** finalizing an upload (`POST /api/tracks`) schedules `processTrack` with Next `after()`, so the pipeline runs in the same function after the response.
  - **Time limit:** `maxDuration = 300`, the Vercel Hobby + Fluid compute maximum. The plan was checked via the Vercel connector: `hobby`. `vercel.json` sets `"fluid": true`.
  - **ffmpeg:** comes from `ffmpeg-static`. The binary is traced into the function via `outputFileTracingIncludes`, and `FFMPEG_PATH` overrides it.
  - **Audio format:** normalized audio is now 16 kHz mono MP3 64k (`normalized.mp3`, about 0.48 MB/min) instead of WAV, sent to OpenAI `whisper-1` with word and segment timestamps. A 12-minute song is about 6 MB, under the 25 MB limit, so no chunking is needed.
  - **Upload rate limit:** now a DB count (20 tracks per user per rolling hour) instead of Redis. Minting signed URLs also has a light limit (per instance).
  - **Retry:** new `POST /api/tracks/:id/retry` (owner only, maxDuration 300) plus a "Retry processing" button on the track page. It claims the row with a conditional update, so double clicks can't double-process. It resets steps that didn't succeed; steps that already succeeded are skipped, so a finished transcription isn't paid for twice.
  - **Lazy sweep:** a track still "processing" more than 390 s after its last update (the run was killed) is marked failed with a Retry hint when the track or the list is next loaded.
  - **Pipeline fix:** retries can now rebuild local audio if earlier steps were skipped (`ensureLocalAudio`).
  - **Pricing:** the calculator's built-in default for 100–999 is now 149, matching DB `pricing_tiers`.
- **Option A is still available:** set `PROCESSING_MODE=queue` + `REDIS_URL` and run `npm run worker`. `workers/index.ts` and `lib/queue.ts` are unchanged. `next/server` is imported lazily, so the worker bundle (`npm run worker:build`) still builds without Next.
- **Pre-merge E2E against prod infrastructure:** I used the service role from a production `vercel env pull` file in /tmp (mode 600, never printed) and the box OpenAI key. A test user `grok-e2e-…@lyrixis.test` got a 7.6 s TTS clip of "Amazing Grace" (public domain). `processTrack` finished in 6.1 s with all 8 steps succeeded:
  - 2 lyric lines with word timings (for example `Amazing@0-440 grace@440-740 …`).
  - `normalized.mp3` was 61 KB.
  - Cost 0.075¢.
  - Status `manual_review`, because confidence 0.76 is under 0.8.
  - The test rows and files are cleaned up after the prod E2E (see the next entry).
- **Who:** Grok / Developer Bot, for Awad. Awad approved Option B and the merge.
- **Undo:** `git revert <squash sha>`. Then either set nothing (uploads fail at processing) or switch to Option A. No database migration, no env change.

## 2026-10-05 ~9:15 PM (CT): Grok (Developer Bot), #36 merged, prod E2E passed (Option B live)
- **Merge:** PR #36 was squash-merged at 9:05 PM CT as `f06695f`. CI and the Vercel preview were green on `3ad8bd3`. Production deployment `lyrixis-7gob4n75c` went Ready about a minute later.
- **Real end-to-end on production (lyrixis.vercel.app).** Test user `grok-e2e-…@lyrixis.test` was created with the service role. Its session came from a generated magic link (no email sent). Audio was a 7.6 s TTS clip of "Amazing Grace" (public domain).
  - The upload flow:
    - `/upload` signed in returned 200.
    - `POST /api/tracks/upload-url` returned 200.
    - The browser-style PUT to the signed Storage URL returned 200.
    - `POST /api/tracks` returned 201 with `trx_4610aad722cae903`.
  - The Vercel function processed the track in about 8 s and reached `manual_review` (confidence 0.76 is under 0.8).
  - Result: `whisper_v3:whisper-1`, 2 lines with word timings: "Amazing grace, how sweet the sound that saved a wretch like me." [0–3160 ms] and "I once was lost, but now am found, was blind, but now I see." [3640–7260 ms]. `normalized.mp3` was 61 KB. This proves `ffmpeg-static` runs on Vercel and the Vercel `TRANSCRIPTION_API_KEY` works.
  - Retry on a finished track returned 409.
  - Retry on a simulated failed-after-normalize track returned 202, and a second click returned 409. It re-ran only transcribe through complete (transcription v2), finished in about 4 s, and wrote audit `retry`.
- **Cleanup:**
  - Both test tracks deleted (cascade), plus 4 Storage objects, the audit rows, the app user and the auth user. Verified 0 left.
  - The /tmp env pull file is deleted.
- **Not exercised live:** the 390 s stuck sweep, because the `tracks_set_updated_at` trigger prevents back-dating. It's covered by unit tests.

## 2026-10-05 ~9:30 PM (CT): Grok (Developer Bot), font refresh PREVIEW (draft PR, DO NOT MERGE)
- **What:** Awad asked for new fonts ("surprise me, but show me the design first"). Only the fonts change; colors, layout, header and footer stay the same.
  - **Display:** Unbounded (was Special Elite in the app and Familjen Grotesk on /enterprise).
  - **Body:** Manrope (was Special Elite in the app and Inter on /enterprise).
  - **Mono:** Martian Mono (was Special Elite in the app and JetBrains Mono on /enterprise).
  - **App wiring:** the app loads the fonts with `next/font` as `--font-display`, `--font-body` and `--font-mono`, the variables `tailwind.config.ts` already expects. This removes the global `Special Elite !important` rule.
  - **/enterprise:** `public/index.html` swaps the Google Fonts link and its CSS variables. IBM Plex Sans Arabic is kept.
  - **Pricing calculator:** its four number readouts use Manrope extra-bold with tabular figures, because Unbounded 800 is wide enough to wrap "40 Ixis · $0.40".
- **Alternate display fonts shown to Awad:** Syne 800 and Bricolage Grotesque 800 (condensed).
- **Where:** `app/layout.tsx`, `app/globals.css`, `components/PricingCalculator.tsx`, `public/index.html`. Screenshots are in `/workspace/lyrixis-font-preview/` on the box.
- **Not merged, not deployed to production.** Wait for Awad's approval or edits.
- **Undo:** close the PR.

## 2026-10-05 ~9:55 PM (CT): Grok (Developer Bot), font preview round 3: Awad picked Monoton (still DO NOT MERGE, PR #37)
- **Choice:** Awad picked option 5, Monoton, from the options sheet. Monoton replaces Unbounded, but only on big display headlines, because it is unreadable at small sizes.
- **Font roles:**
  - **Monoton:** `--font-marquee` in the app and `--marquee` on /enterprise. It is used only around 40px and up.
  - **Manrope 800:** every smaller heading (card h2/h3, nav, buttons, prices, numbers). `--font-display` now points at Manrope.
  - **Unchanged:** body stays Manrope and labels stay Martian Mono.
- **App:**
  - New `.font-marquee` utility in `globals.css`:
    - Monoton, weight forced to 400 with `font-synthesis:none` (no faux bold).
    - letter-spacing .01em.
    - `font-kerning:none`, because Monoton's kerning opens a gap in "oo" in "Understood.".
  - **Home hero h1:** always Monoton, sized `clamp(2.25rem,10.4vw,3rem)` on phones so "Understood." fits at 360–390px wide (at 48px it overflowed the column), then 72px at sm and 96px at lg.
  - **Section and page titles:** `sm:font-marquee` (Monoton from 640px up, Manrope on phones).
    - **Home h2s:** Pipeline, BeforeAfter, CatalogHealth, Scale, API, pricing teaser, contact and the live demo.
    - **Page h1s:** pricing, feed, cixy, catalog, companies, updates, upload, dashboard, add.
    - A few `sm:text-4xl` became `sm:text-5xl` so Monoton is never below about 48px.
  - **Left on Manrope:** dynamic titles (track/recording/voice names), and the login/support/auth/waitlist h1s.
- **/enterprise (`public/index.html`):**
  - The Google Fonts link now loads Monoton plus Manrope 400–800, Martian Mono and IBM Plex Sans Arabic. Unbounded is dropped.
  - h1 is always Monoton (`clamp(2.25rem,10.4vw,3rem)` under 600px).
  - Section h2s use Monoton only at 910px and up. The Cixy help title and the inline "Talk to Lyrixis" h2 are excluded.
- **Checked:**
  - Lint, typecheck, vitest (107) and build pass.
  - No horizontal scroll at 1280 or 390 on home, pricing, enterprise, companies, catalog, feed and cixy, and no Monoton heading overflows.
- **Pre-existing, not caused by this PR (also on production):**
  - At 1024px the app nav's "Get early access" pokes past the right edge.
  - At 768px the /enterprise nav "Talk to Lyrixis" does the same.
- **Screenshots** (in `/workspace/lyrixis-font-preview/`, background animation paused): `monoton-home.png`, `monoton-pricing.png` and `monoton-enterprise.png` at 1280, and `monoton-home-mobile.png` at 390.
- **Not merged, not deployed to production.** Undo: close the PR.

## 2026-10-05 ~10:00 PM (CT): Grok (Developer Bot), MERGED PR #37: Monoton font refresh is live
- **Approval:** Awad approved going live at about 9:56 PM CT.
- **Before merging:** I removed "DO NOT MERGE" from the PR title and body and marked it ready for review. The branch was already up to date with main, so there were no conflicts. Checks were green: `node-ci` ×2, Vercel, and Vercel Preview Comments.
- **Merge:** squash-merged as `a8aea56` "Font refresh: Monoton headlines + Manrope / Martian Mono (#37)".
- **Production deploy:** Ready (GitHub deployment status `success`) at https://lyrixis-5sn3jadik-313aidaroos-projects.vercel.app, aliased to lyrixis.vercel.app.
- **Live smoke test on lyrixis.vercel.app:**
  - **Status codes:** 200 for `/`, `/pricing`, `/enterprise`, `/companies`, `/catalog`, `/feed`, `/cixy`, `/updates`, `/vision`, `/add`, `/login`, `/waitlist` and `/support`.
  - **Fonts:** the hero h1 renders in Monoton (font loaded) on home and /enterprise at both 1280 and 390. Page h1s are Monoton at 1280 and Manrope on phones, as designed. Login, waitlist and support stay Manrope.
  - **Overflow:** no horizontal scroll on any of those pages at 1280 or 390.
  - **/enterprise:** serves the new Monoton/Manrope/Martian Mono font link.
- **Screenshot:** `/workspace/lyrixis-font-preview/live-home.png` (1280, background animation paused).
- **Rollback:** revert `a8aea56`, or promote the previous production deployment in Vercel.

## 2026-10-05 ~10:15 PM (CT): Grok (Developer Bot), nav overflow fix MERGED (PR #38)
- **Problem (existed before this, visible on production):**
  - At 1024px the app nav pushed "Get early access" to x=1132. That clipped the button, made the page scroll sideways and squashed the LYRIXIS wordmark.
  - At 768px the /enterprise nav pushed "Talk to Lyrixis" to x=805.
- **App fix (`components/SiteNav.tsx`):**
  - 1280px and up: unchanged.
  - 1024–1279px: the full bar stays with slightly tighter gaps.
    - Apixis Companies, Feed and Wallet move into the existing Menu panel. Wallet duplicates Buy Ixis.
    - The Menu button now shows up to 1279px.
    - When signed in, the Buy Ixis button also moves into Menu, to leave room for the wallet chip, Dashboard and Sign out.
  - The logo and the right-hand group no longer shrink.
- **/enterprise fix (`public/index.html`):**
  - 961–1100px: tighter tab padding and nav gap.
  - 960px and below: the tabs collapse into the existing Menu button (was 720px).
  - 721–960px: "Talk to Lyrixis" stays visible next to Menu. It is hidden at 720px and below, as before.
- **Shipped:**
  - Checks green: node-ci ×2, Vercel and Vercel Preview Comments.
  - Squash-merged as `6907db6`. The production deploy is Ready (https://lyrixis-gbauf52ua-313aidaroos-projects.vercel.app).
- **Live smoke test on lyrixis.vercel.app:**
  - All 12 main pages return 200.
  - Home, pricing and /enterprise at 1280, 1024, 900, 768 and 390: no sideways scroll and no clipped header buttons. Header height is unchanged.
- **Screenshots:** `/workspace/lyrixis-font-preview/nav-before-1024.png` and `nav-after-1024.png`.
- **Not verified:** the signed-in layout at 1024–1279px, which was checked by reasoning only (no test account was used).
- **Rollback:** revert `6907db6`.
## 2026-10-06 — Pricing locked
- Prices for Lyrixis were locked by Awad. See NOTES/PRICING.md.
- The site/code still needs updating to match NOTES/PRICING.md where it does not.
