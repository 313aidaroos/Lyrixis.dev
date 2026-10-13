-- Label columns on voice_releases, plus the royalty ledger.
-- Apply only after 0008_voice_song_releases.sql. This file was NOT applied to production.
-- Rollback: database/migrations/rollback/0010_label_releases_ledger_down.sql
--
-- Store status is locked to 'pending distributor'. No distributor is contracted,
-- so a row here must not be read as "live on Spotify, Apple Music, or Tidal".
-- The app stores the release details in voice_releases.credits until these columns exist.

alter table public.voice_releases
  add column if not exists genre text,
  add column if not exists release_date date,
  add column if not exists explicit boolean not null default false,
  add column if not exists writers jsonb not null default '[]'::jsonb,
  add column if not exists store_status text not null default 'pending distributor';

alter table public.voice_releases drop constraint if exists voice_releases_store_status_check;
alter table public.voice_releases
  add constraint voice_releases_store_status_check
  check (store_status = 'pending distributor');

comment on column public.voice_releases.store_status is
  'Always pending distributor until a distributor is contracted. This is not a store listing.';

create table if not exists public.voice_royalty_ledger (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.voice_releases(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  period text not null,
  currency text not null default 'USD',
  reported_cents integer not null default 0 check (reported_cents >= 0),
  artist_bps integer not null default 9000 check (artist_bps >= 0 and artist_bps <= 10000),
  lyrixis_bps integer not null default 1000 check (lyrixis_bps >= 0 and lyrixis_bps <= 10000),
  artist_cents integer not null default 0,
  lyrixis_cents integer not null default 0,
  source text not null default 'pending distributor',
  created_at timestamptz not null default now(),
  constraint voice_royalty_ledger_split_check check (artist_bps + lyrixis_bps = 10000),
  constraint voice_royalty_ledger_source_check check (source = 'pending distributor')
);

create index if not exists voice_royalty_ledger_user_idx
  on public.voice_royalty_ledger (user_id, period);

alter table public.voice_royalty_ledger enable row level security;

drop policy if exists voice_royalty_ledger_select on public.voice_royalty_ledger;
create policy voice_royalty_ledger_select on public.voice_royalty_ledger
  for select using (user_id = public.current_app_user_id() or public.voice_songs_is_owner());

revoke all on public.voice_royalty_ledger from anon;
revoke all on public.voice_royalty_ledger from authenticated;
grant select on public.voice_royalty_ledger to authenticated;
grant select, insert, update, delete on public.voice_royalty_ledger to service_role;
