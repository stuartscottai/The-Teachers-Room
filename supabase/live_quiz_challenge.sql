create extension if not exists pgcrypto;

-- After this base schema, also run gdpr_hardening.sql to install the narrowly
-- scoped student functions used by the live-quiz interface.

create table if not exists public.live_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  source_game_id uuid references public.saved_games (id) on delete set null,
  title text not null,
  join_code text not null unique,
  status text not null default 'lobby'
    check (status in ('lobby', 'question', 'locked', 'reveal', 'leaderboard', 'ended')),
  current_question_index integer not null default 0,
  timer_seconds integer not null default 20,
  selected_items jsonb not null default '[]'::jsonb,
  question_started_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint live_quiz_sessions_selected_items_array
    check (jsonb_typeof(selected_items) = 'array')
);

alter table public.live_quiz_sessions
  add column if not exists host_last_seen_at timestamptz not null default now();

create table if not exists public.live_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_quiz_sessions (id) on delete cascade,
  question_index integer not null,
  source_item_id text,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  answer text not null,
  points integer not null default 1000,
  category text,
  image jsonb,
  created_at timestamptz not null default now(),
  constraint live_quiz_questions_options_array
    check (jsonb_typeof(options) = 'array'),
  unique (session_id, question_index)
);

create table if not exists public.live_quiz_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_quiz_sessions (id) on delete cascade,
  display_name text not null,
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.live_quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_quiz_sessions (id) on delete cascade,
  participant_id uuid not null references public.live_quiz_participants (id) on delete cascade,
  question_index integer not null,
  answer text not null,
  is_correct boolean not null default false,
  response_ms integer not null default 0,
  points_awarded integer not null default 0,
  submitted_at timestamptz not null default now(),
  unique (participant_id, question_index)
);

create index if not exists live_quiz_sessions_teacher_idx
  on public.live_quiz_sessions (teacher_id, created_at desc);

create index if not exists live_quiz_sessions_join_code_idx
  on public.live_quiz_sessions (join_code);

create index if not exists live_quiz_questions_session_idx
  on public.live_quiz_questions (session_id, question_index);

create index if not exists live_quiz_participants_session_idx
  on public.live_quiz_participants (session_id, score desc);

create index if not exists live_quiz_submissions_session_idx
  on public.live_quiz_submissions (session_id, question_index);

alter table public.live_quiz_sessions enable row level security;
alter table public.live_quiz_questions enable row level security;
alter table public.live_quiz_participants enable row level security;
alter table public.live_quiz_submissions enable row level security;

drop policy if exists live_quiz_sessions_select_open on public.live_quiz_sessions;
drop policy if exists live_quiz_sessions_select_teacher on public.live_quiz_sessions;
create policy live_quiz_sessions_select_teacher
  on public.live_quiz_sessions
  for select
  to authenticated
  using (auth.uid() = teacher_id);

drop policy if exists live_quiz_sessions_insert_teacher on public.live_quiz_sessions;
create policy live_quiz_sessions_insert_teacher
  on public.live_quiz_sessions
  for insert
  with check (auth.uid() = teacher_id);

drop policy if exists live_quiz_sessions_update_teacher on public.live_quiz_sessions;
create policy live_quiz_sessions_update_teacher
  on public.live_quiz_sessions
  for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

drop policy if exists live_quiz_sessions_delete_teacher on public.live_quiz_sessions;
create policy live_quiz_sessions_delete_teacher
  on public.live_quiz_sessions
  for delete
  using (auth.uid() = teacher_id);

drop policy if exists live_quiz_questions_select_teacher on public.live_quiz_questions;
create policy live_quiz_questions_select_teacher
  on public.live_quiz_questions
  for select
  using (
    exists (
      select 1
      from public.live_quiz_sessions s
      where s.id = live_quiz_questions.session_id
        and s.teacher_id = auth.uid()
    )
  );

drop policy if exists live_quiz_questions_insert_teacher on public.live_quiz_questions;
create policy live_quiz_questions_insert_teacher
  on public.live_quiz_questions
  for insert
  with check (
    exists (
      select 1
      from public.live_quiz_sessions s
      where s.id = live_quiz_questions.session_id
        and s.teacher_id = auth.uid()
    )
  );

drop policy if exists live_quiz_participants_select_session on public.live_quiz_participants;
drop policy if exists live_quiz_participants_select_teacher on public.live_quiz_participants;
create policy live_quiz_participants_select_teacher
  on public.live_quiz_participants
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.live_quiz_sessions s
      where s.id = live_quiz_participants.session_id
        and s.teacher_id = auth.uid()
    )
  );

drop policy if exists live_quiz_participants_insert_open on public.live_quiz_participants;

drop policy if exists live_quiz_participants_update_seen on public.live_quiz_participants;

drop policy if exists live_quiz_participants_delete_teacher on public.live_quiz_participants;
create policy live_quiz_participants_delete_teacher
  on public.live_quiz_participants
  for delete
  using (
    exists (
      select 1
      from public.live_quiz_sessions s
      where s.id = live_quiz_participants.session_id
        and s.teacher_id = auth.uid()
    )
  );

drop policy if exists live_quiz_submissions_select_session on public.live_quiz_submissions;
drop policy if exists live_quiz_submissions_select_teacher on public.live_quiz_submissions;
create policy live_quiz_submissions_select_teacher
  on public.live_quiz_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.live_quiz_sessions s
      where s.id = live_quiz_submissions.session_id
        and s.teacher_id = auth.uid()
    )
  );

drop function if exists public.get_live_quiz_student_question(uuid);
create function public.get_live_quiz_student_question(p_session_id uuid)
returns table (
  question_index integer,
  question text,
  options jsonb,
  points integer,
  category text,
  image jsonb,
  revealed_answer text
)
language sql
security definer
set search_path = public
as $$
  select
    q.question_index,
    q.question,
    q.options,
    q.points,
    q.category,
    q.image,
    case
      when s.status in ('reveal', 'leaderboard', 'ended') then q.answer
      else null
    end as revealed_answer
  from public.live_quiz_questions q
  join public.live_quiz_sessions s on s.id = q.session_id
  where q.session_id = p_session_id
    and q.question_index = s.current_question_index
    and s.status in ('question', 'locked', 'reveal', 'leaderboard')
  limit 1;
$$;

create or replace function public.submit_live_quiz_answer(
  p_session_id uuid,
  p_participant_id uuid,
  p_question_index integer,
  p_answer text
)
returns table (
  is_correct boolean,
  points_awarded integer,
  response_ms integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.live_quiz_sessions%rowtype;
  v_question public.live_quiz_questions%rowtype;
  v_response_ms integer;
  v_base_points integer;
  v_elapsed_ratio numeric;
  v_points integer;
  v_correct boolean;
begin
  select * into v_session
  from public.live_quiz_sessions
  where id = p_session_id;

  if not found or v_session.status <> 'question' then
    raise exception 'Question is not accepting answers';
  end if;

  if v_session.current_question_index <> p_question_index then
    raise exception 'This question is no longer active';
  end if;

  if not exists (
    select 1
    from public.live_quiz_participants
    where id = p_participant_id
      and session_id = p_session_id
  ) then
    raise exception 'Participant is not in this session';
  end if;

  select * into v_question
  from public.live_quiz_questions
  where session_id = p_session_id
    and question_index = p_question_index;

  if not found then
    raise exception 'Question not found';
  end if;

  v_response_ms := greatest(0, floor(extract(epoch from (now() - coalesce(v_session.question_started_at, now()))) * 1000)::integer);
  v_base_points := greatest(1000, coalesce(v_question.points, 1000));
  v_correct := lower(trim(p_answer)) = lower(trim(v_question.answer))
    and v_response_ms <= greatest(1000, v_session.timer_seconds * 1000);

  if v_correct then
    v_elapsed_ratio := least(1, v_response_ms::numeric / greatest(1000, v_session.timer_seconds * 1000));
    v_points := greatest(
      100,
      round(v_base_points * (0.1 + (0.9 * power(1 - v_elapsed_ratio, 1.6))))::integer
    );
  else
    v_points := 0;
  end if;

  insert into public.live_quiz_submissions (
    session_id,
    participant_id,
    question_index,
    answer,
    is_correct,
    response_ms,
    points_awarded
  )
  values (
    p_session_id,
    p_participant_id,
    p_question_index,
    p_answer,
    v_correct,
    v_response_ms,
    v_points
  );

  update public.live_quiz_participants
  set score = score + v_points,
      last_seen_at = now()
  where id = p_participant_id
    and session_id = p_session_id;

  return query select v_correct, v_points, v_response_ms;
end;
$$;

create or replace function public.remove_live_quiz_participant(
  p_session_id uuid,
  p_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid;
begin
  select teacher_id into v_teacher_id
  from public.live_quiz_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Live quiz session not found';
  end if;

  if auth.uid() is null or auth.uid() <> v_teacher_id then
    raise exception 'Only the host teacher can remove players from this live quiz';
  end if;

  delete from public.live_quiz_participants
  where id = p_participant_id
    and session_id = p_session_id;
end;
$$;

create or replace function public.reset_live_quiz_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid;
begin
  select teacher_id into v_teacher_id
  from public.live_quiz_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Live quiz session not found';
  end if;

  if auth.uid() is null or auth.uid() <> v_teacher_id then
    raise exception 'Only the host teacher can reset this live quiz';
  end if;

  delete from public.live_quiz_submissions
  where session_id = p_session_id;

  update public.live_quiz_participants
  set score = 0,
      last_seen_at = now()
  where session_id = p_session_id;

  update public.live_quiz_sessions
  set status = 'lobby',
      current_question_index = 0,
      question_started_at = null,
      started_at = null,
      ended_at = null
  where id = p_session_id;
end;
$$;

create or replace function public.update_live_quiz_status(
  p_session_id uuid,
  p_status text,
  p_current_question_index integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid;
begin
  if p_status not in ('lobby', 'question', 'locked', 'reveal', 'leaderboard', 'ended') then
    raise exception 'Invalid live quiz status';
  end if;

  select teacher_id into v_teacher_id
  from public.live_quiz_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Live quiz session not found';
  end if;

  if auth.uid() is null or auth.uid() <> v_teacher_id then
    raise exception 'Only the host teacher can update this live quiz';
  end if;

  update public.live_quiz_sessions
  set status = p_status,
      current_question_index = coalesce(p_current_question_index, current_question_index),
      question_started_at = case
        when p_status = 'question' then now()
        else question_started_at
      end,
      started_at = case
        when p_status = 'question' then coalesce(started_at, now())
        else started_at
      end,
      ended_at = case
        when p_status = 'ended' then now()
        else ended_at
      end
  where id = p_session_id;
end;
$$;
