-- Undo 0010_label_releases_ledger.sql. Drops the ledger and the label columns.
-- Does not drop voice_releases.

drop policy if exists voice_royalty_ledger_select on public.voice_royalty_ledger;
drop table if exists public.voice_royalty_ledger;

alter table public.voice_releases drop constraint if exists voice_releases_store_status_check;
alter table public.voice_releases drop column if exists store_status;
alter table public.voice_releases drop column if exists writers;
alter table public.voice_releases drop column if exists explicit;
alter table public.voice_releases drop column if exists release_date;
alter table public.voice_releases drop column if exists genre;
