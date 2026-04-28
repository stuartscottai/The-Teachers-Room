create extension if not exists pgcrypto;

create table if not exists public.student_game_shares (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.saved_games (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text,
  selected_items jsonb not null default '[]'::jsonb,
  play_count integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  constraint student_game_shares_selected_items_array
    check (jsonb_typeof(selected_items) = 'array')
);

create index if not exists student_game_shares_game_idx
  on public.student_game_shares (game_id, created_at desc);

create index if not exists student_game_shares_teacher_idx
  on public.student_game_shares (teacher_id, created_at desc);

alter table public.student_game_shares enable row level security;

drop policy if exists student_game_shares_select_valid on public.student_game_shares;
create policy student_game_shares_select_valid
  on public.student_game_shares
  for select
  using (
    revoked_at is null
    and (expires_at is null or expires_at > now())
    and exists (
      select 1
      from public.saved_games sg
      where sg.id = student_game_shares.game_id
        and sg.is_public = true
    )
  );

drop policy if exists student_game_shares_insert_teacher on public.student_game_shares;
create policy student_game_shares_insert_teacher
  on public.student_game_shares
  for insert
  with check (
    auth.uid() = teacher_id
    and jsonb_array_length(selected_items) > 0
    and exists (
      select 1
      from public.saved_games sg
      where sg.id = student_game_shares.game_id
        and sg.is_public = true
    )
  );

drop policy if exists student_game_shares_update_own on public.student_game_shares;
create policy student_game_shares_update_own
  on public.student_game_shares
  for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

drop policy if exists student_game_shares_delete_own on public.student_game_shares;
create policy student_game_shares_delete_own
  on public.student_game_shares
  for delete
  using (auth.uid() = teacher_id);
