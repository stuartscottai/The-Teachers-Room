-- GDPR/privacy hardening for live quizzes.
-- Run after live_quiz_challenge.sql.
--
-- This removes broad anonymous table reads. Teachers keep direct access to
-- sessions they own; students use narrowly scoped functions and must present
-- both a join code or their unguessable participant ID.

-- Take-home QR links use one unguessable share ID. Anonymous visitors may fetch
-- that one share through the function, but cannot list every teacher's links.
drop policy if exists student_game_shares_select_valid on public.student_game_shares;
drop policy if exists student_game_shares_select_teacher on public.student_game_shares;
create policy student_game_shares_select_teacher
  on public.student_game_shares
  for select
  using (auth.uid() = teacher_id);

drop function if exists public.get_student_game_share(uuid);
create function public.get_student_game_share(p_share_id uuid)
returns table (
  id uuid,
  game_id uuid,
  title text,
  selected_items jsonb,
  expires_at timestamptz,
  revoked_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select s.id, s.game_id, s.title, s.selected_items, s.expires_at, s.revoked_at
  from public.student_game_shares s
  join public.saved_games g on g.id = s.game_id
  where s.id = p_share_id
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > timezone('utc', now()))
    and g.is_public = true
  limit 1;
$$;

revoke all on function public.get_student_game_share(uuid) from public;
grant execute on function public.get_student_game_share(uuid) to anon, authenticated;

-- Teachers may read only their own live-quiz records directly.
drop policy if exists live_quiz_sessions_select_open on public.live_quiz_sessions;
drop policy if exists live_quiz_sessions_select_teacher on public.live_quiz_sessions;
create policy live_quiz_sessions_select_teacher
  on public.live_quiz_sessions
  for select
  to authenticated
  using (auth.uid() = teacher_id);

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

-- Students must join through the controlled function below.
drop policy if exists live_quiz_participants_insert_open on public.live_quiz_participants;
drop policy if exists live_quiz_participants_update_seen on public.live_quiz_participants;

drop function if exists public.get_live_quiz_session_by_code(text);
create function public.get_live_quiz_session_by_code(p_join_code text)
returns table (
  id uuid,
  source_game_id uuid,
  title text,
  join_code text,
  status text,
  current_question_index integer,
  timer_seconds integer,
  question_started_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  host_last_seen_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.source_game_id,
    s.title,
    s.join_code,
    s.status,
    s.current_question_index,
    s.timer_seconds,
    s.question_started_at,
    s.started_at,
    s.ended_at,
    s.host_last_seen_at,
    s.created_at
  from public.live_quiz_sessions s
  where s.join_code = upper(btrim(p_join_code))
    and s.status <> 'ended'
    and s.created_at > timezone('utc', now()) - interval '24 hours'
  limit 1;
$$;

drop function if exists public.join_live_quiz_session(text, text);
create function public.join_live_quiz_session(
  p_join_code text,
  p_display_name text
)
returns table (
  id uuid,
  session_id uuid,
  display_name text,
  score integer,
  joined_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_name text := left(btrim(coalesce(p_display_name, '')), 40);
begin
  if v_name = '' then
    raise exception 'Enter a name or team label to join';
  end if;

  select s.id into v_session_id
  from public.live_quiz_sessions s
  where s.join_code = upper(btrim(p_join_code))
    and s.status <> 'ended'
    and s.created_at > timezone('utc', now()) - interval '24 hours'
  limit 1;

  if v_session_id is null then
    raise exception 'This live quiz is not accepting new players';
  end if;

  return query
  insert into public.live_quiz_participants (session_id, display_name)
  values (v_session_id, v_name)
  returning
    live_quiz_participants.id,
    live_quiz_participants.session_id,
    live_quiz_participants.display_name,
    live_quiz_participants.score,
    live_quiz_participants.joined_at,
    live_quiz_participants.last_seen_at;
end;
$$;

drop function if exists public.get_live_quiz_student_session(uuid, uuid);
create function public.get_live_quiz_student_session(
  p_session_id uuid,
  p_participant_id uuid
)
returns table (
  id uuid,
  title text,
  status text,
  current_question_index integer,
  timer_seconds integer,
  question_started_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  host_last_seen_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.title,
    s.status,
    s.current_question_index,
    s.timer_seconds,
    s.question_started_at,
    s.started_at,
    s.ended_at,
    s.host_last_seen_at,
    s.created_at
  from public.live_quiz_sessions s
  where s.id = p_session_id
    and exists (
      select 1
      from public.live_quiz_participants p
      where p.id = p_participant_id
        and p.session_id = s.id
    )
  limit 1;
$$;

drop function if exists public.list_live_quiz_student_participants(uuid, uuid);
create function public.list_live_quiz_student_participants(
  p_session_id uuid,
  p_participant_id uuid
)
returns table (
  id uuid,
  session_id uuid,
  display_name text,
  score integer,
  joined_at timestamptz,
  last_seen_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    case
      when p.id = p_participant_id then p.id
      else md5(p.id::text || ':' || p.session_id::text)::uuid
    end as id,
    p.session_id,
    p.display_name,
    p.score,
    p.joined_at,
    p.last_seen_at
  from public.live_quiz_participants p
  where p.session_id = p_session_id
    and exists (
      select 1
      from public.live_quiz_participants caller
      where caller.id = p_participant_id
        and caller.session_id = p_session_id
    )
  order by p.score desc, p.joined_at;
$$;

drop function if exists public.list_live_quiz_own_submissions(uuid, uuid);
create function public.list_live_quiz_own_submissions(
  p_session_id uuid,
  p_participant_id uuid
)
returns table (
  id uuid,
  session_id uuid,
  participant_id uuid,
  question_index integer,
  answer text,
  is_correct boolean,
  response_ms integer,
  points_awarded integer,
  submitted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    sub.id,
    sub.session_id,
    sub.participant_id,
    sub.question_index,
    sub.answer,
    sub.is_correct,
    sub.response_ms,
    sub.points_awarded,
    sub.submitted_at
  from public.live_quiz_submissions sub
  where sub.session_id = p_session_id
    and sub.participant_id = p_participant_id
    and exists (
      select 1
      from public.live_quiz_participants p
      where p.id = p_participant_id
        and p.session_id = p_session_id
    )
  order by sub.submitted_at;
$$;

drop function if exists public.reconnect_live_quiz_participant(uuid, uuid);
create function public.reconnect_live_quiz_participant(
  p_session_id uuid,
  p_participant_id uuid
)
returns table (
  id uuid,
  session_id uuid,
  display_name text,
  score integer,
  joined_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.live_quiz_participants p
  set last_seen_at = timezone('utc', now())
  from public.live_quiz_sessions s
  where p.id = p_participant_id
    and p.session_id = p_session_id
    and s.id = p.session_id
    and s.status <> 'ended'
  returning p.id, p.session_id, p.display_name, p.score, p.joined_at, p.last_seen_at;
end;
$$;

drop function if exists public.update_live_quiz_participant_name(uuid, uuid, text);
create function public.update_live_quiz_participant_name(
  p_session_id uuid,
  p_participant_id uuid,
  p_display_name text
)
returns table (
  id uuid,
  session_id uuid,
  display_name text,
  score integer,
  joined_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(btrim(coalesce(p_display_name, '')), 40);
begin
  if v_name = '' then
    raise exception 'Enter a name or team label';
  end if;

  return query
  update public.live_quiz_participants p
  set display_name = v_name,
      last_seen_at = timezone('utc', now())
  where p.id = p_participant_id
    and p.session_id = p_session_id
  returning p.id, p.session_id, p.display_name, p.score, p.joined_at, p.last_seen_at;
end;
$$;

-- Replace the old question function, which accepted a session ID alone.
drop function if exists public.get_live_quiz_student_question(uuid);
drop function if exists public.get_live_quiz_student_question(uuid, uuid);
create function public.get_live_quiz_student_question(
  p_session_id uuid,
  p_participant_id uuid
)
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
    and exists (
      select 1
      from public.live_quiz_participants p
      where p.id = p_participant_id
        and p.session_id = p_session_id
    )
  limit 1;
$$;

revoke all on function public.get_live_quiz_session_by_code(text) from public;
revoke all on function public.join_live_quiz_session(text, text) from public;
revoke all on function public.get_live_quiz_student_session(uuid, uuid) from public;
revoke all on function public.list_live_quiz_student_participants(uuid, uuid) from public;
revoke all on function public.list_live_quiz_own_submissions(uuid, uuid) from public;
revoke all on function public.reconnect_live_quiz_participant(uuid, uuid) from public;
revoke all on function public.update_live_quiz_participant_name(uuid, uuid, text) from public;
revoke all on function public.get_live_quiz_student_question(uuid, uuid) from public;

grant execute on function public.get_live_quiz_session_by_code(text) to anon, authenticated;
grant execute on function public.join_live_quiz_session(text, text) to anon, authenticated;
grant execute on function public.get_live_quiz_student_session(uuid, uuid) to anon, authenticated;
grant execute on function public.list_live_quiz_student_participants(uuid, uuid) to anon, authenticated;
grant execute on function public.list_live_quiz_own_submissions(uuid, uuid) to anon, authenticated;
grant execute on function public.reconnect_live_quiz_participant(uuid, uuid) to anon, authenticated;
grant execute on function public.update_live_quiz_participant_name(uuid, uuid, text) to anon, authenticated;
grant execute on function public.get_live_quiz_student_question(uuid, uuid) to anon, authenticated;

-- Keep the existing Supabase scheduled cleanup enabled. It should delete
-- sessions (and cascading participant/submission rows) once they reach 24 hours.
