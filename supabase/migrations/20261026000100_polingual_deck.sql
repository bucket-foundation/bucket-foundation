create schema if not exists bucket;

create table if not exists bucket.polingual_deck_cards (
  user_id        uuid        not null references auth.users (id) on delete cascade,
  deck           text        not null default 'default' check (deck ~ '^[A-Za-z0-9][A-Za-z0-9 _-]{0,47}$'),
  lang           text        not null check (lang ~ '^[a-z]{2,3}$'),
  surface        text        not null check (length(surface) between 1 and 120),
  meaning_en     text        check (meaning_en is null or length(meaning_en) <= 240),
  ipa            text        check (ipa is null or length(ipa) <= 80),
  source_surface text        check (source_surface is null or length(source_surface) <= 120),
  source_lang    text        check (source_lang is null or source_lang ~ '^[a-z]{2,3}$'),
  created_at     timestamptz not null default now(),
  constraint polingual_deck_cards_pkey primary key (user_id, deck, lang, surface)
);

alter table bucket.polingual_deck_cards enable row level security;

drop policy if exists own_select on bucket.polingual_deck_cards;
create policy own_select on bucket.polingual_deck_cards for select using (auth.uid() = user_id);
drop policy if exists own_insert on bucket.polingual_deck_cards;
create policy own_insert on bucket.polingual_deck_cards for insert with check (auth.uid() = user_id);
drop policy if exists own_delete on bucket.polingual_deck_cards;
create policy own_delete on bucket.polingual_deck_cards for delete using (auth.uid() = user_id);

revoke all on bucket.polingual_deck_cards from public, anon, authenticated;
grant usage on schema bucket to service_role;
grant select, insert, update, delete on bucket.polingual_deck_cards to service_role;
