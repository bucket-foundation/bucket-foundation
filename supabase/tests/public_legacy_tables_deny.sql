begin;

\ir ../migrations/20260924090000_public_legacy_tables_deny.sql

create table if not exists public.author (id bigserial primary key, wallet_address text unique, first_name text, last_name text);
create table if not exists public.cite_tokens (id bigserial primary key, author_id bigint, research_id bigint, txn_hash text);
create table if not exists public.ip_metadata (id bigserial primary key, research_id bigint, ip_blob_id text);
create table if not exists public.research (id bigserial primary key, title text, author_id bigint);
create table if not exists public.research_cite (id bigserial primary key, research_id bigint, cited_research_id bigint);

grant all on public.author, public.cite_tokens, public.ip_metadata, public.research, public.research_cite to anon, authenticated;
create policy open_all on public.author for all using (true) with check (true);
create policy open_all on public.cite_tokens for all using (true) with check (true);
insert into public.author (wallet_address, first_name, last_name) values ('0xfixture', 'Anon', 'John');

\ir ../migrations/20260924090000_public_legacy_tables_deny.sql
\ir ../migrations/20260924090000_public_legacy_tables_deny.sql

do $$
declare
  t text;
  r text;
  denied boolean;
begin
  foreach t in array array['author', 'cite_tokens', 'ip_metadata', 'research', 'research_cite'] loop
    assert (select relrowsecurity and relforcerowsecurity from pg_class where oid = format('public.%I', t)::regclass),
      t || ' has forced row level security';
    assert not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t),
      t || ' carries no policy';
    foreach r in array array['anon', 'authenticated'] loop
      execute format('set local role %I', r);
      denied := false;
      begin
        execute format('select count(*) from public.%I', t);
      exception when insufficient_privilege then
        denied := true;
      end;
      reset role;
      assert denied, r || ' is refused select on ' || t;
      execute format('set local role %I', r);
      denied := false;
      begin
        execute format('insert into public.%I default values', t);
      exception when insufficient_privilege then
        denied := true;
      end;
      reset role;
      assert denied, r || ' is refused insert on ' || t;
    end loop;
  end loop;
end $$;

rollback;
