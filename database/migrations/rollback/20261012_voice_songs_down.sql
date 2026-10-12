-- Undo 20261012_voice_songs.sql. Drops Voice Songs tables and the private bucket.
drop policy if exists voice_song_releases_own on public.voice_song_releases;
drop policy if exists voice_song_usage_own on public.voice_song_usage;
drop policy if exists voice_song_payments_own on public.voice_song_payments;
drop policy if exists voice_song_takes_own on public.voice_song_takes;
drop policy if exists voice_song_songs_own on public.voice_song_songs;
drop policy if exists voice_song_voices_own on public.voice_song_voices;

drop table if exists public.voice_song_usage;
drop table if exists public.voice_song_payments;
drop table if exists public.voice_song_releases;
drop table if exists public.voice_song_takes;
drop table if exists public.voice_song_songs;
drop table if exists public.voice_song_voices;

delete from storage.objects where bucket_id = 'voice-songs-private';
delete from storage.buckets where id = 'voice-songs-private';
