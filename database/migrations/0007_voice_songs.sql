-- Voice Songs (Sing it yourself). One private voice per Apixis account.
-- Users can read only their own rows. Writes go through server routes (service role).
-- Apply in the Supabase SQL editor. Rollback: database/migrations/rollback/0007_voice_songs_down.sql

create table if not exists public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft','sample_ready','consent_signed','liveness_passed','training','ready','failed','deleted')),
  consent_version text,
  consent_hash text,
  consent_accepted_at timestamptz,
  liveness_phrase text,
  liveness_passed_at timestamptz,
  liveness_method text,
  sample_path text,
  sample_seconds numeric,
  sample_mime text,
  quality jsonb,
  training_prediction_id text,
  model_url text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_samples (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.voice_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('training','liveness')),
  storage_bucket text not null default 'voice-songs-private',
  storage_path text not null,
  mime_type text not null,
  bytes integer not null default 0,
  duration_seconds numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  profile_id uuid not null references public.voice_profiles(id) on delete cascade,
  title text not null default 'Untitled',
  theme text,
  mood text,
  genre text,
  lyrics text not null default '',
  status text not null default 'draft'
    check (status in ('draft','training','composing','separating','converting','ready','failed','not_configured','payment_required')),
  funding text not null default 'unpaid'
    check (funding in ('unpaid','owner_bypass','wallet','card','all_access','mock')),
  takes_allowed integer not null default 3,
  takes_used integer not null default 0,
  guide_path text,
  stems_path text,
  voice_prediction_id text,
  output_path text,
  output_mime text,
  provider_music text,
  provider_voice text,
  error_message text,
  watermarked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_song_takes (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.voice_songs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  take_number integer not null,
  status text not null,
  storage_path text,
  mime_type text,
  watermarked boolean not null default true,
  provider_music text,
  provider_voice text,
  created_at timestamptz not null default now(),
  unique (song_id, take_number)
);

create index if not exists voice_samples_user_idx on public.voice_samples (user_id);
create index if not exists voice_songs_user_idx on public.voice_songs (user_id, created_at desc);
create index if not exists voice_song_takes_user_idx on public.voice_song_takes (user_id);

create or replace function public.voice_songs_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = public.current_app_user_id()
      and lower(email) in ('alaidaroosawad@gmail.com', 'awad@apixis.dev')
  );
$$;

revoke all on function public.voice_songs_is_owner() from public, anon;
grant execute on function public.voice_songs_is_owner() to authenticated;

alter table public.voice_profiles enable row level security;
alter table public.voice_samples enable row level security;
alter table public.voice_songs enable row level security;
alter table public.voice_song_takes enable row level security;

drop policy if exists voice_profiles_select on public.voice_profiles;
create policy voice_profiles_select on public.voice_profiles
  for select using (user_id = public.current_app_user_id() or public.voice_songs_is_owner());

drop policy if exists voice_samples_select on public.voice_samples;
create policy voice_samples_select on public.voice_samples
  for select using (user_id = public.current_app_user_id() or public.voice_songs_is_owner());

drop policy if exists voice_songs_select on public.voice_songs;
create policy voice_songs_select on public.voice_songs
  for select using (user_id = public.current_app_user_id() or public.voice_songs_is_owner());

drop policy if exists voice_song_takes_select on public.voice_song_takes;
create policy voice_song_takes_select on public.voice_song_takes
  for select using (user_id = public.current_app_user_id() or public.voice_songs_is_owner());

revoke all on public.voice_profiles from anon;
revoke all on public.voice_samples from anon;
revoke all on public.voice_songs from anon;
revoke all on public.voice_song_takes from anon;
grant select on public.voice_profiles to authenticated;
grant select on public.voice_samples to authenticated;
grant select on public.voice_songs to authenticated;
grant select on public.voice_song_takes to authenticated;
grant select, insert, update, delete on public.voice_profiles to service_role;
grant select, insert, update, delete on public.voice_samples to service_role;
grant select, insert, update, delete on public.voice_songs to service_role;
grant select, insert, update, delete on public.voice_song_takes to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('voice-songs-private', 'voice-songs-private', false, 104857600,
   array['audio/webm','audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/ogg','audio/flac','application/zip'])
on conflict (id) do update
  set public = false,
      file_size_limit = 104857600;
