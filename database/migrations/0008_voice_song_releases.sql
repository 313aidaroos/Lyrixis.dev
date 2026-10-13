-- Purchases and store releases for Voice Songs.
-- Rollback: database/migrations/rollback/0008_voice_song_releases_down.sql

create table if not exists public.voice_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  sku text not null,
  price_ixis integer not null,
  method text not null check (method in ('ixis','card','owner_bypass','all_access')),
  status text not null default 'pending' check (status in ('pending','captured','failed','released')),
  song_id uuid references public.voice_songs(id) on delete set null,
  wallet_reservation_id text,
  wallet_receipt_id text,
  stripe_session_id text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_releases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  song_id uuid not null references public.voice_songs(id) on delete cascade,
  artist_name text not null,
  title text not null,
  cover_path text,
  credits jsonb not null default '{}'::jsonb,
  ai_vocals boolean not null default true,
  ai_music boolean not null default true,
  ai_lyrics boolean not null default true,
  rights_accepted_at timestamptz,
  royalty_user_bps integer not null default 9000,
  royalty_lyrixis_bps integer not null default 1000,
  status text not null default 'draft'
    check (status in ('draft','submitted','in_review','approved','rejected','delivered','failed','held')),
  reviewer_note text,
  distributor text,
  distributor_ref text,
  funding text not null default 'unpaid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_purchases_user_idx on public.voice_purchases (user_id, created_at desc);
create index if not exists voice_releases_status_idx on public.voice_releases (status, created_at desc);

alter table public.voice_purchases enable row level security;
alter table public.voice_releases enable row level security;

drop policy if exists voice_purchases_select on public.voice_purchases;
create policy voice_purchases_select on public.voice_purchases
  for select using (user_id = public.current_app_user_id() or public.voice_songs_is_owner());

drop policy if exists voice_releases_select on public.voice_releases;
create policy voice_releases_select on public.voice_releases
  for select using (user_id = public.current_app_user_id() or public.voice_songs_is_owner());

revoke all on public.voice_purchases from anon;
revoke all on public.voice_releases from anon;
grant select on public.voice_purchases to authenticated;
grant select on public.voice_releases to authenticated;
grant select, insert, update, delete on public.voice_purchases to service_role;
grant select, insert, update, delete on public.voice_releases to service_role;

update storage.buckets
  set allowed_mime_types = array[
    'audio/webm','audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/ogg','audio/flac','application/zip',
    'image/jpeg','image/png','image/webp'
  ]
  where id = 'voice-songs-private';
