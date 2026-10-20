-- Undo 0007_voice_songs.sql. Drops the voice-song tables and the private bucket.
drop policy if exists voice_profiles_select on public.voice_profiles;
drop policy if exists voice_samples_select on public.voice_samples;
drop policy if exists voice_songs_select on public.voice_songs;
drop policy if exists voice_song_takes_select on public.voice_song_takes;
drop table if exists public.voice_song_takes;
drop table if exists public.voice_songs;
drop table if exists public.voice_samples;
drop table if exists public.voice_profiles;
drop function if exists public.voice_songs_is_owner();
delete from storage.objects where bucket_id = 'voice-songs-private';
delete from storage.buckets where id = 'voice-songs-private';
