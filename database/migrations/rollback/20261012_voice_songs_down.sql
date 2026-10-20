-- Undo 20261012_voice_songs.sql. Drops the desk Voice Songs tables.
-- The private bucket is shared with 0007_voice_songs.sql, so this rollback leaves it in place.
drop policy if exists voice_song_releases_own on public.voice_song_releases;
drop policy if exists voice_song_usage_own on public.voice_song_usage;
drop policy if exists voice_song_payments_own on public.voice_song_payments;
drop policy if exists voice_desk_takes_own on public.voice_desk_takes;
drop policy if exists voice_song_songs_own on public.voice_song_songs;
drop policy if exists voice_song_voices_own on public.voice_song_voices;

drop table if exists public.voice_song_usage;
drop table if exists public.voice_song_payments;
drop table if exists public.voice_song_releases;
drop table if exists public.voice_desk_takes;
drop table if exists public.voice_song_songs;
drop table if exists public.voice_song_voices;
