-- Run this once in Supabase > SQL Editor > New query > Run
create table if not exists public.ledger (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.ledger enable row level security;

drop policy if exists "ledger select own" on public.ledger;
create policy "ledger select own" on public.ledger for select using (auth.uid() = user_id);
drop policy if exists "ledger insert own" on public.ledger;
create policy "ledger insert own" on public.ledger for insert with check (auth.uid() = user_id);
drop policy if exists "ledger update own" on public.ledger;
create policy "ledger update own" on public.ledger for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "ledger delete own" on public.ledger;
create policy "ledger delete own" on public.ledger for delete using (auth.uid() = user_id);
