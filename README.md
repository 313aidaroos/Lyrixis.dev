# Lyrixis

Pay-per-song music intelligence. Apixis Dev LLC · Lyrixis@Apixis.dev

This repository contains the static marketing site and the MVP web app + worker from [LYRIXIS_DEVELOPER_BRIEF.md](./LYRIXIS_DEVELOPER_BRIEF.md) §8.

## What ships in the MVP

A person can sign up, upload one song (with rights confirmation), watch it process, preview the first 30 seconds of synced lyrics, unlock the track with Ixis (300 Ixis = $3, paid through Apixis Wallet), correct a line (versioned), and download TXT / SRT / LRC / JSON.

The live homepage is a **public catalog**: search recordings (`?q=` filters title, artist, writers, year, ISRC/ISWC/UPC), open metadata, and view lyrics that persist in Supabase (`catalog_recordings`, `catalog_lyrics`). Add a recording at `/add` or bulk CSV at the same page (public-domain or original lyrics only). ISRC/ISWC/UPC are normalized and unique. Extra ID-backed public-domain rows: `database/seeds/public-domain-id-backed.json` and `database/migrations/0005_id_backed_public_domain.sql`. Enterprise marketing lives at `/enterprise`.

Deferred (schema only): public API keys UI, batch upload, org admin, translation, TTML/VTT/CSV, balance top-ups.

## Architecture

| Piece | Where it runs |
|---|---|
| Marketing (`public/index.html`) | Static, rewritten to `/` |
| Next.js App Router | Vercel (or `npm run dev`) — auth, dashboard, upload, Wallet redeem, APIs |
| Lyrixis pipeline (`workers/pipeline.ts`) | Inside Vercel. Finalizing an upload (`POST /api/tracks`) or pressing Retry (`POST /api/tracks/:id/retry`) runs `processTrack` via Next `after()` (maxDuration 300 s). ffmpeg comes from `ffmpeg-static`. Whisper transcribes. |
| Postgres + Auth + private Storage | Supabase |
| Transcription | Env-selected provider (`TRANSCRIPTION_PROVIDER=whisper_v3`) |

Pricing is read from `pricing_tiers` on the server. The frontend never calculates a charged price. Single-track jobs use job size = 1 (the 300 Ixis tier, same as the Wallet product `lyrixis.track.unlock`, unless an org `custom_rate_cents` is set).

## Local setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

ffmpeg is the bundled `ffmpeg-static` binary. Set `FFMPEG_PATH` only if you want a different binary.

### 2. Supabase

1. Create a project.
2. Run `database/migrations/0001_init.sql` in the SQL editor (creates tables, seeds `pricing_tiers`, RLS, auth → `public.users` trigger, private bucket `lyrixis-audio-private`). Then run `database/migrations/0002_enterprise_leads_source.sql` (adds `enterprise_leads.source` for the marketing waitlist).
3. Auth → enable Email and Google. Add redirect URL `{APP_URL}/auth/callback`.
4. Copy project URL, anon key, and **service role** key into `.env.local`.
5. Confirm Storage bucket `lyrixis-audio-private` is **private**.

### 3. Payments

Ixis stays in the Apixis Wallet. A track unlock is the Wallet product `lyrixis.track.unlock` (300 Ixis). `POST /api/redeem` holds the Ixis, records the unlock in `track_unlocks`, then captures (released if recording fails). Set `WALLET_API_KEY` from `npm run family-keys` in the ApixisWallet repo.

Card checkout is optional. Set `STRIPE_SECRET_KEY` (and `STRIPE_WEBHOOK_SECRET` for the renewal notice) to open it. Without those keys the site shows “Card coming soon” and Ixis keeps working. Card payments do not create an Ixis balance.

### 4. Transcription provider

Set a real key. There is no mock path.

```bash
TRANSCRIPTION_PROVIDER=whisper_v3
TRANSCRIPTION_API_KEY=sk-...
# OpenAI (default base https://api.openai.com/v1). whisper-1 is required for word timestamps:
TRANSCRIPTION_MODEL=whisper-1
LANGUAGE_PROVIDER=whisper
```

`costCents` is computed from the **actual audio duration sent to the vendor** × `TRANSCRIPTION_CENTS_PER_MINUTE` (OpenAI Whisper published rate is $0.006/min = 0.6 cents/minute). Override the rate env if you use another vendor.

If `TRANSCRIPTION_API_KEY` is missing, the job fails with a clear error.

### 5. Run

```bash
npm run dev          # http://localhost:3000  (marketing at /, app at /login)
```

Then: Sign in → Upload → wait for status → preview → Unlock (Ixis) → exports.

## Marketing waitlist

The enterprise / early-access form on `public/index.html` posts JSON to `POST /api/waitlist`. The route validates that **work email is required**, rate-limits lightly by IP, and inserts a row into `enterprise_leads` with the service role (`source = waitlist`). Secrets stay on the server; the static page only calls `/api/waitlist`.

Hero **Request early access**, **Start a catalog pilot**, **Talk to Lyrixis**, and footer **Enterprise sales** jump to that form. Other `mailto:` links (direct line, API access, legal) are unchanged.

Query new leads in Supabase:

```sql
select id, name, company, work_email, track_count, use_case, source, created_at
from enterprise_leads
order by created_at desc;
```

### Quality checks

```bash
npm run lint && npm run typecheck && npm run build
```

## Production credentials still required

Nothing in this repo talks to live vendors without keys. Before a paying-customer deploy you need:

| Secret / service | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth, DB, Storage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + SSR auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged API (never expose to the browser) |
| `WALLET_API_KEY` | Apixis Wallet key for track unlocks (from `npm run family-keys`) |
| `STRIPE_SECRET_KEY` | Optional. Card checkout. Leave unset to show “Card coming soon”. |
| `TRANSCRIPTION_API_KEY` | Whisper (or OpenAI-compatible) transcription |
| ffmpeg | Bundled (`ffmpeg-static`); `FFMPEG_PATH` overrides. Normalizes to 16 kHz mono MP3 64k (a 12-min song is ~6 MB, under Whisper's 25 MB limit) |
| `APP_URL` | Public URL for links and OAuth redirects |

Google OAuth also needs the client ID/secret configured **inside the Supabase dashboard**, not in this repo.

Deploy the Next.js app to Vercel. Lyrics processing runs there (`ffmpeg-static` + Whisper). A track left processing past the 300 s limit is marked failed on the next view and gets a **Retry processing** button. For songs that need more time, move to Vercel Pro and raise `maxDuration` to 800 in `app/api/tracks/route.ts` and `app/api/tracks/[id]/retry/route.ts`.

## Docs

| File | Purpose |
|---|---|
| `LYRIXIS_DEVELOPER_BRIEF.md` | Build spec (source of truth) |
| `LYRIXIS_ARCHITECTURE_REVIEW.md` | Strategy; do not expand MVP past brief §8 |
| `schema.sql` | Original schema; applied as `database/migrations/0001_init.sql` |
| `database/migrations/0002_enterprise_leads_source.sql` | Additive `enterprise_leads.source` for waitlist |
| `public/index.html` | Marketing site (Cursor-built look preserved) |
