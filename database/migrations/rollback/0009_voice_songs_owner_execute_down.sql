-- Restores the 0007 grants. The function still returns only a boolean.
grant execute on function public.voice_songs_is_owner() to authenticated;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and roles = '{authenticated}'
       and policyname in (
         'voice_profiles_select',
         'voice_samples_select',
         'voice_songs_select',
         'voice_song_takes_select',
         'voice_purchases_select',
         'voice_releases_select'
       )
  loop
    execute format('alter policy %I on %I.%I to public', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;
