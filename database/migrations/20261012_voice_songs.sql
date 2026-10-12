-- Voice Songs (Sing it yourself). Approved by Awad, 2026-10-12.
-- Users read only their own voices, songs, takes, payments, and releases.
-- Reviewers (Awad's owner emails) can read the release queue. They cannot read
-- another person's voice sample through these policies.
-- Writes go through server routes with the service role. No browser insert/update/delete.
-- Apply on the Lyrixis Supabase project when Awad approves the migration.
-- Undo: database/migrations/rollback/20261012_voice_songs_down.sql

create extension if not exists pgcrypto;

create table public.voice_song_voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','recorded','consented','verified','training','ready','failed','deleted')),
  sample_path text,
  sample_seconds numeric,
  sample_mime text,
  quality jsonb,
  consent_text text,
  consent_accepted_at timestamptz,
  liveness_phrase text,
  liveness_transcript text,
  liveness_score numeric,
  liveness_passed boolean not null default false,
  provider text check (provider in ('replicate','kits','demo')),
  provider_model_ref text,
  train_error text,
  is_demo boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index voice_song_voices_one_active on public.voice_song_voices (user_id) where deleted_at is null;

create table public.voice_song_songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  voice_id uuid not null references public.voice_song_voices(id) on delete cascade,
  title text not null,
  theme text not null default '',
  mood text not null default '',
  genre text not null default '',
  lyrics text not null default '',
  messages jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','generating','preview','failed')),
  funding text check (funding in ('ixis','card','allowance','owner','demo')),
  receipt_id text,
  takes_included integer not null default 3 check (takes_included >= 1),
  error text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index voice_song_songs_user on public.voice_song_songs (user_id, created_at desc);

create table public.voice_song_takes (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.voice_song_songs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  take_number integer not null check (take_number >= 1),
  kind text not null check (kind in ('included','extra')),
  status text not null check (status in ('queued','running','ready','failed')),
  mix_path text,
  mime text,
  voice_mix integer not null default 65 check (voice_mix between 0 and 100),
  music_provider text,
  voice_provider text,
  watermarked boolean not null default true,
  notes jsonb not null default '[]'::jsonb,
  error text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (song_id, take_number)
);

create table public.voice_song_releases (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.voice_song_songs(id) on delete cascade,
  take_id uuid not null references public.voice_song_takes(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete cascade,
  artist_name text not null,
  title text not null,
  artwork_path text,
  credits text not null default '',
  ai_disclosure jsonb not null,
  rights_accepted_at timestamptz,
  royalty_user_bps integer not null default 9000 check (royalty_user_bps between 0 and 10000),
  royalty_lyrixis_bps integer not null default 1000 check (royalty_lyrixis_bps between 0 and 10000),
  status text not null default 'queued' check (status in ('queued','in_review','approved','rejected','submitted')),
  review_note text,
  distributor text not null default 'unconfigured' check (distributor in ('toolost','revelator','unconfigured')),
  distributor_status text not null default 'not_configured' check (distributor_status in ('not_configured','queued','submitted','failed')),
  distributor_ref text,
  distributor_message text,
  funding text check (funding in ('ixis','card','allowance','owner','demo')),
  receipt_id text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (royalty_user_bps + royalty_lyrixis_bps = 10000)
);
create index voice_song_releases_user on public.voice_song_releases (user_id, created_at desc);
create index voice_song_releases_queue on public.voice_song_releases (status, created_at);

create table public.voice_song_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  sku text not null check (sku in ('setup','song','take','release')),
  method text not null check (method in ('ixis','card','allowance','owner')),
  ixis integer not null check (ixis >= 0),
  usd_cents integer not null check (usd_cents >= 0),
  status text not null check (status in ('pending','captured','released')),
  receipt_id text,
  idempotency_key text not null unique,
  song_id uuid references public.voice_song_songs(id) on delete set null,
  consumed boolean not null default false,
  checkout_url text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index voice_song_payments_user on public.voice_song_payments (user_id, sku, consumed);

create table public.voice_song_usage (
  user_id uuid not null references public.users(id) on delete cascade,
  period text not null check (period ~ '^[0-9]{4}-[0-9]{2}$'),
  songs_used integer not null default 0 check (songs_used >= 0),
  releases_used integer not null default 0 check (releases_used >= 0 and releases_used <= 4),
  setup_covered boolean not null default false,
  primary key (user_id, period)
);

alter table public.voice_song_voices enable row level security;
alter table public.voice_song_songs enable row level security;
alter table public.voice_song_takes enable row level security;
alter table public.voice_song_releases enable row level security;
alter table public.voice_song_payments enable row level security;
alter table public.voice_song_usage enable row level security;

create policy voice_song_voices_own on public.voice_song_voices
  for select using (user_id = public.current_app_user_id());
create policy voice_song_songs_own on public.voice_song_songs
  for select using (user_id = public.current_app_user_id());
create policy voice_song_takes_own on public.voice_song_takes
  for select using (user_id = public.current_app_user_id());
create policy voice_song_payments_own on public.voice_song_payments
  for select using (user_id = public.current_app_user_id());
create policy voice_song_usage_own on public.voice_song_usage
  for select using (user_id = public.current_app_user_id());

-- Releases: the owner, plus the Lyrixis reviewer accounts (queue only is enforced in the app;
-- the policy allows those emails to read release rows so the admin page can load under RLS).
create policy voice_song_releases_own on public.voice_song_releases
  for select using (
    user_id = public.current_app_user_id()
    or exists (
      select 1 from public.users u
      where u.id = public.current_app_user_id()
        and lower(u.email) in ('alaidaroosawad@gmail.com', 'awad@apixis.dev')
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-songs-private',
  'voice-songs-private',
  false,
  104857600,
  array['audio/mpeg','audio/wav','audio/x-wav','audio/webm','audio/mp4','audio/ogg','audio/flac','image/png','image/jpeg','image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 104857600;

-- No storage.objects policies: the service role mints access after an ownership check.
-- Raw voice audio is never public.
