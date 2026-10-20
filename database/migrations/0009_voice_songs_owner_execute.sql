-- voice_songs_is_owner() returns only a boolean for the current session.
-- It must not be callable by anon or PUBLIC over /rest/v1/rpc.
-- Authenticated keeps EXECUTE because the select policies call it.
-- service_role bypasses RLS and does not need the body, but keeps EXECUTE for checks.

revoke all on function public.voice_songs_is_owner() from public;
revoke execute on function public.voice_songs_is_owner() from public, anon;
grant execute on function public.voice_songs_is_owner() to authenticated, service_role;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and roles = '{public}'
       and policyname in (
         'voice_profiles_select',
         'voice_samples_select',
         'voice_songs_select',
         'voice_song_takes_select',
         'voice_purchases_select',
         'voice_releases_select'
       )
  loop
    execute format('alter policy %I on %I.%I to authenticated', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;
