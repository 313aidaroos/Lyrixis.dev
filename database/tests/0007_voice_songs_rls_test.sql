-- LOCAL TEST ONLY. Users see only their own voice songs.
begin;
set local client_min_messages = warning;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'singer-a@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'singer-b@example.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'awad@apixis.dev');

create temp table ids as
  select (select id from public.users where email = 'singer-a@example.test') ua,
         (select id from public.users where email = 'singer-b@example.test') ub,
         (select id from public.users where email = 'awad@apixis.dev') uo;
grant select on ids to anon, authenticated;

insert into public.voice_profiles (id, user_id, status, sample_path)
  select 'aa000000-0000-0000-0000-000000000001', ua, 'sample_ready', 'a/sample.webm' from ids
  union all
  select 'bb000000-0000-0000-0000-000000000002', ub, 'sample_ready', 'b/sample.webm' from ids;

create or replace function pg_temp.act_as(auth_id text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', auth_id, true);
  execute 'set local role authenticated';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  if (select count(*) from public.voice_profiles) <> 1 then raise exception 'FAIL user A sees another voice'; end if;
  if (select sample_path from public.voice_profiles) <> 'a/sample.webm' then raise exception 'FAIL user A saw the wrong sample'; end if;
  begin
    insert into public.voice_profiles (user_id, status) select ua, 'draft' from ids;
    raise exception 'FAIL authenticated insert allowed';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
do $$ begin
  if (select count(*) from public.voice_profiles) <> 2 then raise exception 'FAIL owner cannot review voices'; end if;
end $$;

reset role;
set local role anon;
do $$ begin
  begin
    if (select count(*) from public.voice_profiles) <> 0 then raise exception 'FAIL anon sees voices'; end if;
  exception when insufficient_privilege then null;
  end;
end $$;

select 'voice songs rls ok';
rollback;
