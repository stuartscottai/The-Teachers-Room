-- Account tiers + school management setup
-- Run this once in Supabase SQL Editor (or as a migration).

create extension if not exists pgcrypto;

-- Profiles (keeps account type + display data)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  account_type text not null default 'free' check (account_type in ('free', 'teacher', 'school')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists account_type text not null default 'free';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_type_check
      check (account_type in ('free', 'teacher', 'school'));
  end if;
end $$;

-- Ensure profile row is deleted automatically when auth user is deleted.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      drop constraint profiles_id_fkey;
  end if;
exception when undefined_table then
  null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_id_fkey
    foreign key (id) references auth.users (id) on delete cascade;
exception when duplicate_object then
  null;
end $$;

-- Ensure saved games are deleted automatically when auth user is deleted.
do $$
declare
  v_constraint_name text;
begin
  for v_constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.saved_games'::regclass
      and c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.saved_games drop constraint %I', v_constraint_name);
  end loop;

  alter table public.saved_games
    add constraint saved_games_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;
exception
  when undefined_table then
    null;
  when duplicate_object then
    null;
end $$;

-- Ensure saved worksheets are deleted automatically when auth user is deleted.
do $$
declare
  v_constraint_name text;
begin
  for v_constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.saved_worksheets'::regclass
      and c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.saved_worksheets drop constraint %I', v_constraint_name);
  end loop;

  alter table public.saved_worksheets
    add constraint saved_worksheets_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;
exception
  when undefined_table then
    null;
  when duplicate_object then
    null;
end $$;

-- Schools + centres + memberships + invites
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_storage_path text,
  join_code text,
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.schools
  add column if not exists logo_storage_path text,
  add column if not exists join_code text;

create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'teacher' check (role in ('admin', 'teacher')),
  status text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (school_id, user_id)
);

create table if not exists public.school_centres (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  teacher_seat_limit integer not null default 10 check (teacher_seat_limit > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (school_id, name)
);

create table if not exists public.centre_memberships (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.school_centres (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (centre_id, user_id)
);

create table if not exists public.centre_invites (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  centre_id uuid not null references public.school_centres (id) on delete cascade,
  email text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_by uuid references auth.users (id) on delete set null,
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '7 days',
  accepted_at timestamptz
);

create index if not exists school_memberships_school_idx on public.school_memberships (school_id, status, role);
create index if not exists school_memberships_user_idx on public.school_memberships (user_id, status);
create index if not exists school_centres_school_idx on public.school_centres (school_id);
create index if not exists centre_memberships_centre_idx on public.centre_memberships (centre_id, status);
create index if not exists centre_memberships_user_idx on public.centre_memberships (user_id, status);
create index if not exists centre_invites_school_idx on public.centre_invites (school_id, status);
create index if not exists centre_invites_email_idx on public.centre_invites (lower(email), status);
create unique index if not exists schools_join_code_idx on public.schools (join_code);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'school_memberships_status_check'
      and conrelid = 'public.school_memberships'::regclass
  ) then
    alter table public.school_memberships
      drop constraint school_memberships_status_check;
  end if;
exception when undefined_table then
  null;
end $$;

do $$
begin
  alter table public.school_memberships
    add constraint school_memberships_status_check
    check (status in ('active', 'inactive', 'pending'));
exception when duplicate_object then
  null;
end $$;

create or replace function public.generate_school_join_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (
      select 1
      from public.schools s
      where s.join_code = v_code
    );
  end loop;

  return v_code;
end;
$$;

create or replace function public.set_school_join_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.join_code is null or btrim(new.join_code) = '' then
    new.join_code := public.generate_school_join_code();
  else
    new.join_code := upper(btrim(new.join_code));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_school_join_code on public.schools;
create trigger trg_set_school_join_code
before insert or update of join_code on public.schools
for each row
execute function public.set_school_join_code();

do $$
declare
  v_school_id uuid;
begin
  for v_school_id in
    select s.id
    from public.schools s
    where s.join_code is null
       or btrim(s.join_code) = ''
  loop
    update public.schools
    set join_code = public.generate_school_join_code()
    where id = v_school_id;
  end loop;
end $$;

-- Optional usage columns for richer analytics
alter table if exists public.generation_usage
  add column if not exists account_type text,
  add column if not exists school_id uuid,
  add column if not exists centre_id uuid,
  add column if not exists access_decision text,
  add column if not exists blocked_reason text;

create index if not exists generation_usage_account_type_idx
  on public.generation_usage (account_type, created_at desc);
create index if not exists generation_usage_school_idx
  on public.generation_usage (school_id, created_at desc);

-- Optional play-count column on saved games (for trending + creator analytics)
alter table if exists public.saved_games
  add column if not exists play_count integer not null default 0;

create index if not exists saved_games_user_created_idx
  on public.saved_games (user_id, created_at desc);
create index if not exists saved_games_play_count_idx
  on public.saved_games (play_count desc, created_at desc);

-- Per-user play event tracking for school analytics
create table if not exists public.game_play_events (
  id bigint generated always as identity primary key,
  played_at timestamptz not null default timezone('utc', now()),
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id uuid references public.saved_games (id) on delete set null,
  game_owner_id uuid references auth.users (id) on delete set null,
  game_title text
);

create index if not exists game_play_events_user_idx
  on public.game_play_events (user_id, played_at desc);
create index if not exists game_play_events_owner_idx
  on public.game_play_events (game_owner_id, played_at desc);
create index if not exists game_play_events_game_idx
  on public.game_play_events (game_id, played_at desc);

drop function if exists public.increment_game_play(uuid);
create or replace function public.increment_game_play(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_game_id is null then
    return;
  end if;

  -- Only public games contribute to community/trending counts.
  update public.saved_games sg
  set play_count = coalesce(sg.play_count, 0) + 1
  where sg.id = p_game_id
    and sg.is_public = true;
end;
$$;

drop function if exists public.record_game_play_event(uuid);
create or replace function public.record_game_play_event(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_game_owner_id uuid;
  v_game_title text;
begin
  if v_user_id is null then
    return;
  end if;

  if p_game_id is null then
    return;
  end if;

  select sg.user_id, sg.title
    into v_game_owner_id, v_game_title
  from public.saved_games sg
  where sg.id = p_game_id
    and (sg.is_public = true or sg.user_id = v_user_id)
  limit 1;

  if v_game_owner_id is null then
    return;
  end if;

  insert into public.game_play_events (user_id, game_id, game_owner_id, game_title)
  values (v_user_id, p_game_id, v_game_owner_id, v_game_title);
end;
$$;

-- Helper: is caller an active school admin?
create or replace function public.current_user_is_school_admin(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = p_school_id
      and sm.user_id = auth.uid()
      and sm.role = 'admin'
      and sm.status = 'active'
  );
$$;

create or replace function public.get_school_join_code(p_school_id uuid)
returns table (join_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_join_code text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized';
  end if;

  select s.join_code
    into v_join_code
  from public.schools s
  where s.id = p_school_id;

  if v_join_code is null or btrim(v_join_code) = '' then
    update public.schools
    set join_code = public.generate_school_join_code()
    where id = p_school_id
    returning schools.join_code into v_join_code;
  end if;

  return query select v_join_code;
end;
$$;

create or replace function public.regenerate_school_join_code(p_school_id uuid)
returns table (join_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_join_code text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized';
  end if;

  update public.schools
  set join_code = public.generate_school_join_code()
  where id = p_school_id
  returning schools.join_code into v_join_code;

  return query select v_join_code;
end;
$$;

create or replace function public.request_school_join_with_code(p_join_code text)
returns table (
  school_id uuid,
  school_name text,
  membership_status text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_join_code, '')));
  v_school_id uuid;
  v_school_name text;
  v_existing_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_code = '' then
    raise exception 'School code is required';
  end if;

  select s.id, s.name
    into v_school_id, v_school_name
  from public.schools s
  where s.join_code = v_code
  limit 1;

  if v_school_id is null then
    raise exception 'Invalid school code';
  end if;

  if exists (
    select 1
    from public.school_memberships sm
    where sm.user_id = v_user_id
      and sm.status = 'active'
      and sm.school_id <> v_school_id
  ) then
    raise exception 'You already belong to another school account.';
  end if;

  select sm.status
    into v_existing_status
  from public.school_memberships sm
  where sm.school_id = v_school_id
    and sm.user_id = v_user_id
  limit 1;

  if v_existing_status = 'active' then
    return query select v_school_id, v_school_name, 'active';
    return;
  end if;

  update public.school_memberships sm
  set status = 'inactive'
  where sm.user_id = v_user_id
    and sm.school_id <> v_school_id
    and sm.status = 'pending';

  insert into public.school_memberships as sm (school_id, user_id, role, status)
  values (v_school_id, v_user_id, 'teacher', 'pending')
  on conflict (school_id, user_id)
  do update set
    role = 'teacher',
    status = 'pending';

  return query select v_school_id, v_school_name, 'pending';
end;
$$;

create or replace function public.get_my_pending_school_join_request()
returns table (
  school_id uuid,
  school_name text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return;
  end if;

  return query
  select
    sm.school_id,
    s.name as school_name,
    sm.created_at as requested_at
  from public.school_memberships sm
  join public.schools s on s.id = sm.school_id
  where sm.user_id = v_user_id
    and sm.status = 'pending'
  order by sm.created_at desc
  limit 1;
end;
$$;

create or replace function public.list_school_join_requests(p_school_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    sm.user_id,
    coalesce(p.full_name, split_part(u.email, '@', 1), 'Teacher') as full_name,
    u.email::text,
    sm.created_at as requested_at
  from public.school_memberships sm
  left join public.profiles p on p.id = sm.user_id
  left join auth.users u on u.id = sm.user_id
  where sm.school_id = p_school_id
    and sm.role = 'teacher'
    and sm.status = 'pending'
  order by sm.created_at asc;
end;
$$;

create or replace function public.approve_school_join_request(
  p_school_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_centre_id uuid;
  v_spot_limit integer := 0;
  v_teacher_count integer := 0;
  v_already_active boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = p_school_id
      and sm.user_id = p_user_id
      and sm.role = 'teacher'
      and sm.status = 'pending'
  ) then
    raise exception 'Pending request not found';
  end if;

  v_centre_id := public.get_school_primary_centre_id(p_school_id, true);
  if v_centre_id is null then
    raise exception 'School teacher setup is missing';
  end if;

  select sc.teacher_seat_limit
    into v_spot_limit
  from public.school_centres sc
  where sc.id = v_centre_id;

  select exists (
    select 1
    from public.centre_memberships cm
    where cm.centre_id = v_centre_id
      and cm.user_id = p_user_id
      and cm.status = 'active'
  ) into v_already_active;

  select count(*)
    into v_teacher_count
  from public.centre_memberships cm
  where cm.centre_id = v_centre_id
    and cm.status = 'active'
    and cm.user_id <> p_user_id;

  if not v_already_active and v_teacher_count >= coalesce(v_spot_limit, 0) then
    raise exception 'No available teacher spots. Add spots before approving.';
  end if;

  update public.school_memberships
  set status = 'active'
  where school_id = p_school_id
    and user_id = p_user_id
    and role = 'teacher'
    and status = 'pending';

  update public.centre_memberships cm
  set status = 'inactive'
  from public.school_centres sc
  where cm.user_id = p_user_id
    and cm.status = 'active'
    and cm.centre_id = sc.id
    and sc.school_id = p_school_id
    and cm.centre_id <> v_centre_id;

  insert into public.centre_memberships (centre_id, user_id, status)
  values (v_centre_id, p_user_id, 'active')
  on conflict (centre_id, user_id)
  do update set status = 'active';

  insert into public.profiles (id, account_type)
  values (p_user_id, 'school')
  on conflict (id)
  do update set account_type = 'school';

  update auth.users
  set raw_user_meta_data =
    coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('account_type', 'school')
  where id = p_user_id;
end;
$$;

create or replace function public.reject_school_join_request(
  p_school_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized';
  end if;

  update public.school_memberships
  set status = 'inactive'
  where school_id = p_school_id
    and user_id = p_user_id
    and role = 'teacher'
    and status = 'pending';

  if not found then
    raise exception 'Pending request not found';
  end if;
end;
$$;

-- Parse school id from school-logo storage path: schools/<school_id>/...
create or replace function public.school_id_from_logo_object_name(p_object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_school_id_text text;
begin
  if p_object_name is null then
    return null;
  end if;

  if split_part(p_object_name, '/', 1) <> 'schools' then
    return null;
  end if;

  v_school_id_text := split_part(p_object_name, '/', 2);
  if v_school_id_text is null
    or v_school_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;

  return v_school_id_text::uuid;
end;
$$;

-- Claim invites automatically for logged-in user email.
create or replace function public.claim_my_school_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_claimed integer := 0;
  v_invite record;
  v_seat_limit integer;
  v_active_count integer;
  v_has_active_slot boolean;
begin
  if v_user_id is null then
    return 0;
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_user_id;

  if v_email is null then
    return 0;
  end if;

  update public.centre_invites ci
  set status = 'expired'
  where ci.status = 'pending'
    and ci.expires_at < timezone('utc', now());

  for v_invite in
    select ci.*
    from public.centre_invites ci
    where lower(ci.email) = lower(v_email)
      and ci.status = 'pending'
      and ci.expires_at >= timezone('utc', now())
    order by ci.created_at asc
  loop
    select sc.teacher_seat_limit
      into v_seat_limit
    from public.school_centres sc
    where sc.id = v_invite.centre_id
      and sc.school_id = v_invite.school_id;

    if v_seat_limit is null then
      continue;
    end if;

    select exists (
      select 1
      from public.centre_memberships cm
      where cm.centre_id = v_invite.centre_id
        and cm.user_id = v_user_id
        and cm.status = 'active'
    ) into v_has_active_slot;

    select count(*)
      into v_active_count
    from public.centre_memberships cm
    where cm.centre_id = v_invite.centre_id
      and cm.status = 'active'
      and cm.user_id <> v_user_id;

    if not v_has_active_slot and v_active_count >= v_seat_limit then
      continue;
    end if;

    insert into public.school_memberships (school_id, user_id, role, status)
    values (v_invite.school_id, v_user_id, 'teacher', 'active')
    on conflict (school_id, user_id)
    do update set status = 'active';

    update public.centre_memberships cm
    set status = 'inactive'
    from public.school_centres sc
    where cm.user_id = v_user_id
      and cm.status = 'active'
      and cm.centre_id = sc.id
      and sc.school_id = v_invite.school_id
      and cm.centre_id <> v_invite.centre_id;

    insert into public.centre_memberships (centre_id, user_id, status)
    values (v_invite.centre_id, v_user_id, 'active')
    on conflict (centre_id, user_id)
    do update set status = 'active';

    update public.centre_invites
    set status = 'accepted',
        accepted_by = v_user_id,
        accepted_at = timezone('utc', now())
    where id = v_invite.id;

    insert into public.profiles (id, account_type)
    values (v_user_id, 'school')
    on conflict (id)
    do update set account_type = 'school';

    update auth.users
    set raw_user_meta_data =
      coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('account_type', 'school')
    where id = v_user_id;

    v_claimed := v_claimed + 1;
  end loop;

  return v_claimed;
end;
$$;

-- Entitlements payload used by frontend and API checks.
create or replace function public.get_my_entitlements()
returns table (
  account_type text,
  can_use_ai boolean,
  school_id uuid,
  school_name text,
  school_role text,
  centre_id uuid,
  centre_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_type text := 'free';
  v_school_id uuid;
  v_school_name text;
  v_school_role text;
  v_centre_id uuid;
  v_centre_name text;
begin
  if v_user_id is null then
    return;
  end if;

  select coalesce(p.account_type, 'free')
    into v_account_type
  from public.profiles p
  where p.id = v_user_id;

  if v_account_type not in ('free', 'teacher', 'school') then
    v_account_type := 'free';
  end if;

  -- Membership is authoritative for school access.
  select sm.school_id, s.name, sm.role
    into v_school_id, v_school_name, v_school_role
  from public.school_memberships sm
  join public.schools s on s.id = sm.school_id
  where sm.user_id = v_user_id
    and sm.status = 'active'
  order by case when sm.role = 'admin' then 0 else 1 end, sm.created_at asc
  limit 1;

  if v_school_id is not null then
    v_account_type := 'school';
    select cm.centre_id, sc.name
      into v_centre_id, v_centre_name
    from public.centre_memberships cm
    join public.school_centres sc on sc.id = cm.centre_id
    where cm.user_id = v_user_id
      and cm.status = 'active'
      and sc.school_id = v_school_id
    order by cm.created_at desc
    limit 1;
  end if;

  return query
  select
    v_account_type,
    case
      when v_account_type = 'teacher' then true
      when v_account_type = 'school' then v_centre_id is not null
      else false
    end,
    v_school_id,
    v_school_name,
    v_school_role,
    v_centre_id,
    v_centre_name;
end;
$$;

create or replace function public.create_school_invite(
  p_school_id uuid,
  p_centre_id uuid,
  p_email text
)
returns table (
  id uuid,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(16), 'hex');
  v_expires_at timestamptz := timezone('utc', now()) + interval '7 days';
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized to create invites for this school';
  end if;

  if not exists (
    select 1
    from public.school_centres sc
    where sc.id = p_centre_id
      and sc.school_id = p_school_id
  ) then
    raise exception 'Centre does not belong to school';
  end if;

  update public.centre_invites ci
  set status = 'revoked'
  where ci.school_id = p_school_id
    and ci.centre_id = p_centre_id
    and lower(ci.email) = lower(trim(p_email))
    and ci.status = 'pending';

  insert into public.centre_invites (
    school_id, centre_id, email, token, status, created_by, expires_at
  )
  values (
    p_school_id,
    p_centre_id,
    lower(trim(p_email)),
    v_token,
    'pending',
    auth.uid(),
    v_expires_at
  )
  returning centre_invites.id into v_id;

  return query select v_id, v_token, v_expires_at;
end;
$$;

-- Resolve one "primary" centre per school to keep school management simple.
create or replace function public.get_school_primary_centre_id(
  p_school_id uuid,
  p_create_if_missing boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_centre_id uuid;
begin
  if p_school_id is null then
    return null;
  end if;

  select sc.id
    into v_centre_id
  from public.school_centres sc
  where sc.school_id = p_school_id
  order by sc.created_at asc
  limit 1;

  if v_centre_id is not null then
    return v_centre_id;
  end if;

  if not p_create_if_missing then
    return null;
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized';
  end if;

  insert into public.school_centres (school_id, name, teacher_seat_limit)
  values (p_school_id, 'Main Teachers', 10)
  on conflict (school_id, name)
  do update set teacher_seat_limit = public.school_centres.teacher_seat_limit
  returning id into v_centre_id;

  return v_centre_id;
end;
$$;

-- School-level invite API (no centre selection in UI).
drop function if exists public.create_school_invite(uuid, text);
create or replace function public.create_school_invite(
  p_school_id uuid,
  p_email text
)
returns table (
  id uuid,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_centre_id uuid;
begin
  v_centre_id := public.get_school_primary_centre_id(p_school_id, true);
  if v_centre_id is null then
    raise exception 'School teacher setup is missing';
  end if;

  return query
  select *
  from public.create_school_invite(p_school_id, v_centre_id, p_email);
end;
$$;

create or replace function public.get_school_teacher_spot_summary(p_school_id uuid)
returns table (
  teacher_spot_limit integer,
  teacher_count integer,
  spots_remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_centre_id uuid;
  v_spot_limit integer := 0;
  v_teacher_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized';
  end if;

  v_centre_id := public.get_school_primary_centre_id(p_school_id, true);
  if v_centre_id is null then
    return query select 0, 0, 0;
    return;
  end if;

  select coalesce(sc.teacher_seat_limit, 0)
    into v_spot_limit
  from public.school_centres sc
  where sc.id = v_centre_id;

  select count(*)
    into v_teacher_count
  from public.centre_memberships cm
  where cm.centre_id = v_centre_id
    and cm.status = 'active';

  return query
  select
    v_spot_limit,
    v_teacher_count,
    greatest(v_spot_limit - v_teacher_count, 0);
end;
$$;

create or replace function public.change_school_teacher_spots(
  p_school_id uuid,
  p_delta integer
)
returns table (
  teacher_spot_limit integer,
  teacher_count integer,
  spots_remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_centre_id uuid;
  v_current_limit integer;
  v_next_limit integer;
  v_teacher_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized';
  end if;

  if p_delta is null or p_delta = 0 then
    raise exception 'Spot change must be non-zero';
  end if;

  v_centre_id := public.get_school_primary_centre_id(p_school_id, true);
  if v_centre_id is null then
    raise exception 'School teacher setup is missing';
  end if;

  select sc.teacher_seat_limit
    into v_current_limit
  from public.school_centres sc
  where sc.id = v_centre_id
  for update;

  select count(*)
    into v_teacher_count
  from public.centre_memberships cm
  where cm.centre_id = v_centre_id
    and cm.status = 'active';

  v_next_limit := coalesce(v_current_limit, 0) + p_delta;
  if v_next_limit < 1 then
    raise exception 'Teacher spots must be at least 1';
  end if;

  if v_next_limit < v_teacher_count then
    raise exception 'Cannot set teacher spots below active teacher count';
  end if;

  update public.school_centres
  set teacher_seat_limit = v_next_limit
  where id = v_centre_id;

  return query
  select
    v_next_limit,
    v_teacher_count,
    greatest(v_next_limit - v_teacher_count, 0);
end;
$$;

drop function if exists public.get_user_generation_usage_summary(uuid, timestamptz);
create or replace function public.get_user_generation_usage_summary(
  p_user_id uuid,
  p_since timestamptz default null
)
returns table (
  total_ai_generations bigint,
  last_generated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass('public.generation_usage') is null then
    return query
    select 0::bigint, null::timestamptz;
    return;
  end if;

  return query execute
    'select count(*)::bigint, max(created_at)
       from public.generation_usage
      where user_id = $1
        and status = ''success''
        and ($2 is null or created_at >= $2)'
  using p_user_id, p_since;
end;
$$;

drop function if exists public.get_my_ai_generation_stats();
create or replace function public.get_my_ai_generation_stats()
returns table (
  total_ai_generations bigint,
  last_generated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if to_regclass('public.generation_usage') is null then
    return query
    select 0::bigint, null::timestamptz;
    return;
  end if;

  return query execute
    'select count(*)::bigint, max(created_at)
       from public.generation_usage
      where user_id = $1
        and status = ''success'''
  using auth.uid();
end;
$$;

drop function if exists public.get_school_teacher_directory(uuid);
create or replace function public.get_school_teacher_directory(p_school_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  status text,
  is_owner boolean,
  centre_id uuid,
  centre_name text,
  joined_at timestamptz,
  total_games_created bigint,
  total_game_plays bigint,
  total_play_events bigint,
  total_ai_generations bigint,
  last_played_at timestamptz,
  last_generated_at timestamptz,
  last_game_created_at timestamptz,
  last_activity_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized to view this directory';
  end if;

  return query
  select
    sm.user_id,
    coalesce(p.full_name, split_part(u.email, '@', 1), 'Teacher')::text as full_name,
    u.email::text,
    sm.role::text,
    (case when cm.centre_id is null then 'inactive' else 'active' end)::text as status,
    (sm.user_id = s.owner_user_id) as is_owner,
    cm.centre_id,
    sc.name::text as centre_name,
    sm.created_at as joined_at,
    coalesce(gs.total_games_created, 0)::bigint as total_games_created,
    coalesce(gs.total_game_plays, 0)::bigint as total_game_plays,
    coalesce(ps.total_play_events, 0)::bigint as total_play_events,
    coalesce(ai.total_ai_generations, 0)::bigint as total_ai_generations,
    ps.last_played_at,
    ai.last_generated_at,
    gs.last_game_created_at,
    greatest(
      coalesce(gs.last_game_created_at, '-infinity'::timestamptz),
      coalesce(ps.last_played_at, '-infinity'::timestamptz),
      coalesce(ai.last_generated_at, '-infinity'::timestamptz),
      sm.created_at
    ) as last_activity_at
  from public.school_memberships sm
  join public.schools s on s.id = sm.school_id
  left join public.profiles p on p.id = sm.user_id
  left join auth.users u on u.id = sm.user_id
  left join lateral (
    select cm2.centre_id
    from public.centre_memberships cm2
    join public.school_centres sc2 on sc2.id = cm2.centre_id
    where cm2.user_id = sm.user_id
      and cm2.status = 'active'
      and sc2.school_id = p_school_id
    order by cm2.created_at desc
    limit 1
  ) cm on true
  left join public.school_centres sc on sc.id = cm.centre_id
  left join lateral (
    select
      count(*)::bigint as total_games_created,
      coalesce(sum(coalesce(sg.play_count, 0)), 0)::bigint as total_game_plays,
      max(sg.created_at) as last_game_created_at
    from public.saved_games sg
    where sg.user_id = sm.user_id
      and sg.created_at >= sm.created_at
  ) gs on true
  left join lateral (
    select
      count(*)::bigint as total_play_events,
      max(gpe.played_at) as last_played_at
    from public.game_play_events gpe
    where gpe.user_id = sm.user_id
      and gpe.played_at >= sm.created_at
  ) ps on true
  left join lateral public.get_user_generation_usage_summary(sm.user_id, sm.created_at) ai on true
  where sm.school_id = p_school_id
    and sm.status = 'active'
  order by sm.created_at asc;
end;
$$;

drop function if exists public.list_school_teacher_play_events(uuid, uuid, integer);
create or replace function public.list_school_teacher_play_events(
  p_school_id uuid,
  p_user_id uuid,
  p_limit integer default 100
)
returns table (
  event_id bigint,
  played_at timestamptz,
  player_user_id uuid,
  player_name text,
  game_id uuid,
  game_title text,
  game_owner_user_id uuid,
  game_owner_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 500));
  v_membership_created_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized to view teacher activity';
  end if;

  select sm.created_at
    into v_membership_created_at
  from public.school_memberships sm
  where sm.school_id = p_school_id
    and sm.user_id = p_user_id
    and sm.status = 'active'
  limit 1;

  if v_membership_created_at is null then
    raise exception 'Teacher not found in this school';
  end if;

  return query
  select
    gpe.id as event_id,
    gpe.played_at,
    gpe.user_id as player_user_id,
    coalesce(pp.full_name, split_part(up.email, '@', 1), 'Teacher')::text as player_name,
    gpe.game_id,
    coalesce(sg.title, gpe.game_title, 'Untitled Game')::text as game_title,
    coalesce(sg.user_id, gpe.game_owner_id) as game_owner_user_id,
    coalesce(po.full_name, split_part(uo.email, '@', 1), 'Unknown')::text as game_owner_name
  from public.game_play_events gpe
  left join public.saved_games sg on sg.id = gpe.game_id
  left join public.profiles pp on pp.id = gpe.user_id
  left join auth.users up on up.id = gpe.user_id
  left join public.profiles po on po.id = coalesce(sg.user_id, gpe.game_owner_id)
  left join auth.users uo on uo.id = coalesce(sg.user_id, gpe.game_owner_id)
  where gpe.user_id = p_user_id
    and gpe.played_at >= v_membership_created_at
  order by gpe.played_at desc
  limit v_limit;
end;
$$;

create or replace function public.set_school_member_role(
  p_school_id uuid,
  p_user_id uuid,
  p_role text
)
returns table (
  user_id uuid,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := lower(trim(coalesce(p_role, '')));
  v_owner_user_id uuid;
  v_active_admins integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized';
  end if;

  if v_role not in ('admin', 'teacher') then
    raise exception 'Invalid school role';
  end if;

  select s.owner_user_id
    into v_owner_user_id
  from public.schools s
  where s.id = p_school_id;

  if v_owner_user_id is null then
    raise exception 'School not found';
  end if;

  if p_user_id = v_owner_user_id and v_role <> 'admin' then
    raise exception 'School owner must remain an admin';
  end if;

  if v_role = 'teacher'
    and exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = p_school_id
        and sm.user_id = p_user_id
        and sm.role = 'admin'
        and sm.status = 'active'
    ) then
    select count(*)
      into v_active_admins
    from public.school_memberships sm
    where sm.school_id = p_school_id
      and sm.role = 'admin'
      and sm.status = 'active';

    if v_active_admins <= 1 then
      raise exception 'Cannot remove the last active school admin';
    end if;
  end if;

  update public.school_memberships sm
  set role = v_role
  where sm.school_id = p_school_id
    and sm.user_id = p_user_id
    and sm.status = 'active';

  if not found then
    raise exception 'Active school membership not found';
  end if;

  return query
  select p_user_id, v_role;
end;
$$;

create or replace function public.assign_teacher_to_centre(
  p_school_id uuid,
  p_user_id uuid,
  p_centre_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_active_count integer;
  v_already_active boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized';
  end if;

  select sc.teacher_seat_limit
    into v_limit
  from public.school_centres sc
  where sc.id = p_centre_id
    and sc.school_id = p_school_id;

  if v_limit is null then
    raise exception 'Target centre not found in school';
  end if;

  if not exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = p_school_id
      and sm.user_id = p_user_id
      and sm.status = 'active'
  ) then
    raise exception 'Teacher is not active in this school';
  end if;

  select exists (
    select 1
    from public.centre_memberships cm
    where cm.centre_id = p_centre_id
      and cm.user_id = p_user_id
      and cm.status = 'active'
  ) into v_already_active;

  select count(*)
    into v_active_count
  from public.centre_memberships cm
  where cm.centre_id = p_centre_id
    and cm.status = 'active'
    and cm.user_id <> p_user_id;

  if not v_already_active and v_active_count >= v_limit then
    raise exception 'Centre seat limit reached';
  end if;

  update public.centre_memberships cm
  set status = 'inactive'
  from public.school_centres sc
  where cm.user_id = p_user_id
    and cm.status = 'active'
    and cm.centre_id = sc.id
    and sc.school_id = p_school_id
    and cm.centre_id <> p_centre_id;

  insert into public.centre_memberships (centre_id, user_id, status)
  values (p_centre_id, p_user_id, 'active')
  on conflict (centre_id, user_id)
  do update set status = 'active';

  insert into public.profiles (id, account_type)
  values (p_user_id, 'school')
  on conflict (id)
  do update set account_type = 'school';

  update auth.users
  set raw_user_meta_data =
    coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('account_type', 'school')
  where id = p_user_id;
end;
$$;

create or replace function public.set_school_member_activity(
  p_school_id uuid,
  p_user_id uuid,
  p_is_active boolean
)
returns table (
  user_id uuid,
  activity_status text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_centre_id uuid;
  v_spot_limit integer := 0;
  v_active_count integer := 0;
  v_already_active boolean := false;
  v_membership_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized';
  end if;

  select sm.status
    into v_membership_status
  from public.school_memberships sm
  where sm.school_id = p_school_id
    and sm.user_id = p_user_id
  limit 1;

  if v_membership_status is null then
    raise exception 'School membership not found';
  end if;

  if v_membership_status = 'pending' then
    raise exception 'Pending members must be approved before changing activity';
  end if;

  if v_membership_status = 'inactive' then
    update public.school_memberships sm_fix
    set status = 'active'
    where sm_fix.school_id = p_school_id
      and sm_fix.user_id = p_user_id
      and sm_fix.status = 'inactive';
  end if;

  v_centre_id := public.get_school_primary_centre_id(p_school_id, true);
  if v_centre_id is null then
    raise exception 'School teacher setup is missing';
  end if;

  if coalesce(p_is_active, false) then
    select sc.teacher_seat_limit
      into v_spot_limit
    from public.school_centres sc
    where sc.id = v_centre_id;

    select exists (
      select 1
      from public.centre_memberships cm
      where cm.centre_id = v_centre_id
        and cm.user_id = p_user_id
        and cm.status = 'active'
    ) into v_already_active;

    select count(*)
      into v_active_count
    from public.centre_memberships cm
    where cm.centre_id = v_centre_id
      and cm.status = 'active'
      and cm.user_id <> p_user_id;

    if not v_already_active and v_active_count >= coalesce(v_spot_limit, 0) then
      raise exception 'No available teacher spots. Add spots before re-activating this member.';
    end if;

    update public.centre_memberships cm
    set status = 'inactive'
    from public.school_centres sc
    where cm.user_id = p_user_id
      and cm.status = 'active'
      and cm.centre_id = sc.id
      and sc.school_id = p_school_id
      and cm.centre_id <> v_centre_id;

    insert into public.centre_memberships (centre_id, user_id, status)
    values (v_centre_id, p_user_id, 'active')
    on conflict (centre_id, user_id)
    do update set status = 'active';
  else
    update public.centre_memberships cm
    set status = 'inactive'
    from public.school_centres sc
    where cm.user_id = p_user_id
      and cm.status = 'active'
      and cm.centre_id = sc.id
      and sc.school_id = p_school_id;
  end if;

  insert into public.profiles (id, account_type)
  values (p_user_id, 'school')
  on conflict (id)
  do update set account_type = 'school';

  update auth.users
  set raw_user_meta_data =
    coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('account_type', 'school')
  where id = p_user_id;

  return query
  select p_user_id, case when coalesce(p_is_active, false) then 'active' else 'inactive' end;
end;
$$;

create or replace function public.deactivate_school_teacher(
  p_school_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_user_id uuid;
  v_active_admins integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_school_admin(p_school_id) then
    raise exception 'Not authorized';
  end if;

  select s.owner_user_id
    into v_owner_user_id
  from public.schools s
  where s.id = p_school_id;

  if v_owner_user_id is null then
    raise exception 'School not found';
  end if;

  if p_user_id = v_owner_user_id then
    raise exception 'School owner cannot be removed from the school account';
  end if;

  if exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = p_school_id
      and sm.user_id = p_user_id
      and sm.role = 'admin'
      and sm.status = 'active'
  ) then
    select count(*)
      into v_active_admins
    from public.school_memberships sm
    where sm.school_id = p_school_id
      and sm.role = 'admin'
      and sm.status = 'active';

    if v_active_admins <= 1 then
      raise exception 'Cannot remove the last active school admin';
    end if;
  end if;

  delete from public.school_memberships
  where school_id = p_school_id
    and user_id = p_user_id;

  delete from public.centre_memberships cm
  using public.school_centres sc
  where cm.user_id = p_user_id
    and cm.centre_id = sc.id
    and sc.school_id = p_school_id;

  if not exists (
    select 1
    from public.school_memberships sm
    where sm.user_id = p_user_id
      and sm.status = 'active'
  ) then
    insert into public.profiles (id, account_type)
    values (p_user_id, 'free')
    on conflict (id)
    do update set account_type = 'free';

    update auth.users
    set raw_user_meta_data =
      coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('account_type', 'free')
    where id = p_user_id;
  end if;
end;
$$;

-- Self-serve upgrades from Profile
create or replace function public.upgrade_my_account_to_teacher()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_account_type text := 'free';
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(p.account_type, 'free')
    into v_current_account_type
  from public.profiles p
  where p.id = v_user_id;

  -- Do not downgrade School accounts.
  if v_current_account_type = 'school' then
    return;
  end if;

  insert into public.profiles (id, account_type)
  values (v_user_id, 'teacher')
  on conflict (id)
  do update set account_type = 'teacher';

  update auth.users
  set raw_user_meta_data =
    coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('account_type', 'teacher')
  where id = v_user_id;
end;
$$;

create or replace function public.upgrade_my_account_to_school(
  p_school_name text,
  p_primary_centre_name text default 'Main Centre',
  p_teacher_seat_limit integer default 10
)
returns table (school_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_account_type text := 'free';
  v_existing_school_id uuid;
  v_new_school_id uuid;
  v_new_centre_id uuid;
  v_school_name text;
  v_centre_name text;
  v_seat_limit integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(p.account_type, 'free')
    into v_current_account_type
  from public.profiles p
  where p.id = v_user_id;

  -- If this user already admins a school, return that school.
  select sm.school_id
    into v_existing_school_id
  from public.school_memberships sm
  where sm.user_id = v_user_id
    and sm.role = 'admin'
    and sm.status = 'active'
  order by sm.created_at asc
  limit 1;

  if v_existing_school_id is not null then
    return query select v_existing_school_id;
    return;
  end if;

  if v_current_account_type <> 'teacher' then
    raise exception 'Only Teacher accounts can upgrade to School';
  end if;

  v_school_name := nullif(trim(p_school_name), '');
  if v_school_name is null then
    raise exception 'School name is required';
  end if;

  v_centre_name := coalesce(nullif(trim(p_primary_centre_name), ''), 'Main Centre');
  v_seat_limit := greatest(1, coalesce(p_teacher_seat_limit, 10));

  insert into public.schools (name, owner_user_id)
  values (v_school_name, v_user_id)
  returning id into v_new_school_id;

  insert into public.school_memberships (school_id, user_id, role, status)
  values (v_new_school_id, v_user_id, 'admin', 'active')
  on conflict (school_id, user_id)
  do update set role = 'admin', status = 'active';

  insert into public.school_centres (school_id, name, teacher_seat_limit)
  values (v_new_school_id, v_centre_name, v_seat_limit)
  returning id into v_new_centre_id;

  insert into public.centre_memberships (centre_id, user_id, status)
  values (v_new_centre_id, v_user_id, 'active')
  on conflict (centre_id, user_id)
  do update set status = 'active';

  insert into public.profiles (id, account_type)
  values (v_user_id, 'school')
  on conflict (id)
  do update set account_type = 'school';

  update auth.users
  set raw_user_meta_data =
    coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('account_type', 'school')
  where id = v_user_id;

  return query select v_new_school_id;
end;
$$;

-- Generic plan switcher (upgrades + downgrades) for Profile/Plan pages.
drop function if exists public.change_my_account_plan(text, text, text, integer);
create or replace function public.change_my_account_plan(
  p_target_account_type text,
  p_school_name text default null,
  p_primary_centre_name text default 'Main Centre',
  p_teacher_seat_limit integer default 10
)
returns table (
  result_account_type text,
  result_school_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_target text := lower(trim(coalesce(p_target_account_type, '')));
  v_current text := 'free';
  v_school_name text;
  v_centre_name text;
  v_seat_limit integer;
  v_school_id uuid;
  v_new_centre_id uuid;
  v_owned_school_with_active_members_count integer := 0;
  v_owned_school_ids uuid[] := '{}'::uuid[];
  v_affected_user_ids uuid[] := '{}'::uuid[];
  v_affected_user_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_target not in ('free', 'teacher', 'school') then
    raise exception 'Invalid target account type';
  end if;

  select coalesce(p.account_type, 'free')
    into v_current
  from public.profiles p
  where p.id = v_user_id;

  if v_current not in ('free', 'teacher', 'school') then
    v_current := 'free';
  end if;

  -- Leaving school account type:
  -- allow school admins/owners to downgrade only when their administered schools have no active members.
  if v_target in ('free', 'teacher') and v_current = 'school' then
    select count(*)
      into v_owned_school_with_active_members_count
    from public.schools s
    where s.owner_user_id = v_user_id
      and exists (
        select 1
        from public.school_centres sc
        join public.centre_memberships cm on cm.centre_id = sc.id
        where sc.school_id = s.id
          and cm.status = 'active'
      );

    if v_owned_school_with_active_members_count > 0 then
      raise exception 'School accounts can only downgrade when all school members are inactive.';
    end if;

    if exists (
      select 1
      from public.school_memberships sm
      where sm.user_id = v_user_id
        and sm.role = 'admin'
        and sm.status = 'active'
        and exists (
          select 1
          from public.school_centres sc
          join public.centre_memberships cm on cm.centre_id = sc.id
          where sc.school_id = sm.school_id
            and cm.status = 'active'
        )
    ) then
      raise exception 'School accounts can only downgrade when all school members are inactive.';
    end if;

    select coalesce(array_agg(s.id), '{}'::uuid[])
      into v_owned_school_ids
    from public.schools s
    where s.owner_user_id = v_user_id;

    if coalesce(array_length(v_owned_school_ids, 1), 0) > 0 then
      select coalesce(array_agg(distinct sm.user_id), '{}'::uuid[])
        into v_affected_user_ids
      from public.school_memberships sm
      where sm.school_id = any(v_owned_school_ids);

      delete from public.schools s
      where s.id = any(v_owned_school_ids);

      if coalesce(array_length(v_affected_user_ids, 1), 0) > 0 then
        for v_affected_user_id in
          select distinct unnest(v_affected_user_ids)
        loop
          if not exists (
            select 1
            from public.school_memberships sm
            where sm.user_id = v_affected_user_id
              and sm.status = 'active'
          ) then
            insert into public.profiles (id, account_type)
            values (v_affected_user_id, 'free')
            on conflict (id)
            do update set account_type = 'free';

            update auth.users
            set raw_user_meta_data =
              coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('account_type', 'free')
            where id = v_affected_user_id;
          end if;
        end loop;
      end if;
    end if;

    update public.centre_memberships
    set status = 'inactive'
    where user_id = v_user_id
      and status = 'active';

    update public.school_memberships
    set status = 'inactive'
    where user_id = v_user_id
      and status = 'active';
  end if;

  -- Moving to school: reuse existing admin membership or create a new admin school.
  if v_target = 'school' then
    select sm.school_id
      into v_school_id
    from public.school_memberships sm
    where sm.user_id = v_user_id
      and sm.status = 'active'
      and sm.role = 'admin'
    order by sm.created_at asc
    limit 1;

    if v_school_id is null then
      v_school_name := nullif(trim(p_school_name), '');
      if v_school_name is null then
        raise exception 'School name is required';
      end if;

      v_centre_name := coalesce(nullif(trim(p_primary_centre_name), ''), 'Main Centre');
      v_seat_limit := greatest(1, coalesce(p_teacher_seat_limit, 10));

      insert into public.schools (name, owner_user_id)
      values (v_school_name, v_user_id)
      returning id into v_school_id;

      insert into public.school_memberships (school_id, user_id, role, status)
      values (v_school_id, v_user_id, 'admin', 'active')
      on conflict (school_id, user_id)
      do update set role = 'admin', status = 'active';

      insert into public.school_centres (school_id, name, teacher_seat_limit)
      values (v_school_id, v_centre_name, v_seat_limit)
      returning id into v_new_centre_id;

      insert into public.centre_memberships (centre_id, user_id, status)
      values (v_new_centre_id, v_user_id, 'active')
      on conflict (centre_id, user_id)
      do update set status = 'active';
    end if;

    -- Guarantee that self-setup School accounts are admins.
    insert into public.school_memberships (school_id, user_id, role, status)
    values (v_school_id, v_user_id, 'admin', 'active')
    on conflict (school_id, user_id)
    do update set role = 'admin', status = 'active';

    -- Ensure this user is active in the school's primary seat container.
    v_new_centre_id := public.get_school_primary_centre_id(v_school_id, true);
    if v_new_centre_id is not null then
      update public.centre_memberships cm
      set status = 'inactive'
      from public.school_centres sc
      where cm.user_id = v_user_id
        and cm.status = 'active'
        and cm.centre_id = sc.id
        and sc.school_id = v_school_id
        and cm.centre_id <> v_new_centre_id;

      insert into public.centre_memberships (centre_id, user_id, status)
      values (v_new_centre_id, v_user_id, 'active')
      on conflict (centre_id, user_id)
      do update set status = 'active';
    end if;
  end if;

  insert into public.profiles (id, account_type)
  values (v_user_id, v_target)
  on conflict (id)
  do update set account_type = v_target;

  update auth.users
  set raw_user_meta_data =
    coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('account_type', v_target)
  where id = v_user_id;

  return query
  select
    v_target as result_account_type,
    v_school_id as result_school_id;
end;
$$;

-- Self-serve account cancellation.
create or replace function public.cancel_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_owned_school_count integer := 0;
  v_owned_school_with_active_members_count integer := 0;
  v_owned_school_ids uuid[] := '{}'::uuid[];
  v_affected_user_ids uuid[] := '{}'::uuid[];
  v_affected_user_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select count(*)
    into v_owned_school_count
  from public.schools s
  where s.owner_user_id = v_user_id;

  select count(*)
    into v_owned_school_with_active_members_count
  from public.schools s
  where s.owner_user_id = v_user_id
    and exists (
      select 1
      from public.school_centres sc
      join public.centre_memberships cm on cm.centre_id = sc.id
      where sc.school_id = s.id
        and cm.status = 'active'
    );

  if v_owned_school_with_active_members_count > 0 then
    raise exception 'School owner accounts can only be cancelled when all school members are inactive.';
  end if;

  if v_owned_school_count > 0 then
    select coalesce(array_agg(s.id), '{}'::uuid[])
      into v_owned_school_ids
    from public.schools s
    where s.owner_user_id = v_user_id;

    select coalesce(array_agg(distinct sm.user_id), '{}'::uuid[])
      into v_affected_user_ids
    from public.school_memberships sm
    where sm.school_id = any(v_owned_school_ids);

    delete from public.schools s
    where s.id = any(v_owned_school_ids);

    if coalesce(array_length(v_affected_user_ids, 1), 0) > 0 then
      for v_affected_user_id in
        select distinct unnest(v_affected_user_ids)
      loop
        if v_affected_user_id <> v_user_id
          and not exists (
            select 1
            from public.school_memberships sm
            where sm.user_id = v_affected_user_id
              and sm.status = 'active'
          ) then
          insert into public.profiles (id, account_type)
          values (v_affected_user_id, 'free')
          on conflict (id)
          do update set account_type = 'free';

          update auth.users
          set raw_user_meta_data =
            coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('account_type', 'free')
          where id = v_affected_user_id;
        end if;
      end loop;
    end if;
  end if;

  delete from auth.users
  where id = v_user_id;
end;
$$;

-- Grants for RPC usage
grant execute on function public.current_user_is_school_admin(uuid) to authenticated;
grant execute on function public.generate_school_join_code() to authenticated;
grant execute on function public.get_school_join_code(uuid) to authenticated;
grant execute on function public.regenerate_school_join_code(uuid) to authenticated;
grant execute on function public.request_school_join_with_code(text) to authenticated;
grant execute on function public.get_my_pending_school_join_request() to authenticated;
grant execute on function public.list_school_join_requests(uuid) to authenticated;
grant execute on function public.approve_school_join_request(uuid, uuid) to authenticated;
grant execute on function public.reject_school_join_request(uuid, uuid) to authenticated;
grant execute on function public.school_id_from_logo_object_name(text) to authenticated;
grant execute on function public.claim_my_school_invites() to authenticated;
grant execute on function public.get_my_entitlements() to authenticated;
grant execute on function public.get_my_ai_generation_stats() to authenticated;
grant execute on function public.create_school_invite(uuid, uuid, text) to authenticated;
grant execute on function public.create_school_invite(uuid, text) to authenticated;
grant execute on function public.get_school_primary_centre_id(uuid, boolean) to authenticated;
grant execute on function public.get_school_teacher_spot_summary(uuid) to authenticated;
grant execute on function public.change_school_teacher_spots(uuid, integer) to authenticated;
grant execute on function public.increment_game_play(uuid) to authenticated;
grant execute on function public.record_game_play_event(uuid) to authenticated;
grant execute on function public.get_school_teacher_directory(uuid) to authenticated;
grant execute on function public.list_school_teacher_play_events(uuid, uuid, integer) to authenticated;
grant execute on function public.set_school_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.set_school_member_activity(uuid, uuid, boolean) to authenticated;
grant execute on function public.assign_teacher_to_centre(uuid, uuid, uuid) to authenticated;
grant execute on function public.deactivate_school_teacher(uuid, uuid) to authenticated;
grant execute on function public.upgrade_my_account_to_teacher() to authenticated;
grant execute on function public.upgrade_my_account_to_school(text, text, integer) to authenticated;
grant execute on function public.change_my_account_plan(text, text, text, integer) to authenticated;
grant execute on function public.cancel_my_account() to authenticated;

-- Table grants (RLS still applies)
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.schools to authenticated;
grant select, insert, update, delete on public.school_memberships to authenticated;
grant select, insert, update, delete on public.school_centres to authenticated;
grant select, insert, update, delete on public.centre_memberships to authenticated;
grant select, insert, update, delete on public.centre_invites to authenticated;
grant select, insert on public.game_play_events to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.school_memberships enable row level security;
alter table public.school_centres enable row level security;
alter table public.centre_memberships enable row level security;
alter table public.centre_invites enable row level security;
alter table public.game_play_events enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select
using (auth.uid() = id);

drop policy if exists profiles_select_school_admin_members on public.profiles;
create policy profiles_select_school_admin_members on public.profiles
for select
using (
  exists (
    select 1
    from public.school_memberships sm_member
    join public.school_memberships sm_admin
      on sm_admin.school_id = sm_member.school_id
     and sm_admin.user_id = auth.uid()
     and sm_admin.role = 'admin'
     and sm_admin.status = 'active'
    where sm_member.user_id = profiles.id
      and sm_member.status in ('active', 'pending')
  )
);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists schools_select_member on public.schools;
create policy schools_select_member on public.schools
for select
using (
  exists (
    select 1 from public.school_memberships sm
    where sm.school_id = schools.id
      and sm.user_id = auth.uid()
      and sm.status = 'active'
  )
);

drop policy if exists schools_insert_owner on public.schools;
create policy schools_insert_owner on public.schools
for insert
with check (owner_user_id = auth.uid());

drop policy if exists schools_update_admin on public.schools;
create policy schools_update_admin on public.schools
for update
using (public.current_user_is_school_admin(id))
with check (public.current_user_is_school_admin(id));

drop policy if exists school_memberships_select_visible on public.school_memberships;
create policy school_memberships_select_visible on public.school_memberships
for select
using (
  user_id = auth.uid()
  or public.current_user_is_school_admin(school_id)
);

drop policy if exists school_memberships_manage_admin on public.school_memberships;
create policy school_memberships_manage_admin on public.school_memberships
for all
using (public.current_user_is_school_admin(school_id))
with check (public.current_user_is_school_admin(school_id));

drop policy if exists school_centres_select_member on public.school_centres;
create policy school_centres_select_member on public.school_centres
for select
using (
  exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = school_centres.school_id
      and sm.user_id = auth.uid()
      and sm.status = 'active'
  )
);

drop policy if exists school_centres_manage_admin on public.school_centres;
create policy school_centres_manage_admin on public.school_centres
for all
using (public.current_user_is_school_admin(school_id))
with check (public.current_user_is_school_admin(school_id));

drop policy if exists centre_memberships_select_member on public.centre_memberships;
create policy centre_memberships_select_member on public.centre_memberships
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.school_centres sc
    where sc.id = centre_memberships.centre_id
      and public.current_user_is_school_admin(sc.school_id)
  )
);

drop policy if exists centre_memberships_manage_admin on public.centre_memberships;
create policy centre_memberships_manage_admin on public.centre_memberships
for all
using (
  exists (
    select 1
    from public.school_centres sc
    where sc.id = centre_memberships.centre_id
      and public.current_user_is_school_admin(sc.school_id)
  )
)
with check (
  exists (
    select 1
    from public.school_centres sc
    where sc.id = centre_memberships.centre_id
      and public.current_user_is_school_admin(sc.school_id)
  )
);

drop policy if exists centre_invites_select_scope on public.centre_invites;
create policy centre_invites_select_scope on public.centre_invites
for select
using (
  public.current_user_is_school_admin(school_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists centre_invites_manage_admin on public.centre_invites;
create policy centre_invites_manage_admin on public.centre_invites
for all
using (public.current_user_is_school_admin(school_id))
with check (public.current_user_is_school_admin(school_id));

drop policy if exists game_play_events_select_own on public.game_play_events;
create policy game_play_events_select_own on public.game_play_events
for select
using (auth.uid() = user_id);

drop policy if exists game_play_events_insert_own on public.game_play_events;
create policy game_play_events_insert_own on public.game_play_events
for insert
with check (auth.uid() = user_id);

-- Ensure shared assets bucket exists (used for worksheets, game images, and school logos).
insert into storage.buckets (id, name, public)
values ('worksheet-assets', 'worksheet-assets', false)
on conflict (id) do nothing;

-- School logo object policies (path: schools/<school_id>/logo-*.ext).
drop policy if exists school_logo_select_member on storage.objects;
create policy school_logo_select_member on storage.objects
for select
to authenticated
using (
  bucket_id = 'worksheet-assets'
  and public.school_id_from_logo_object_name(name) is not null
  and exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = public.school_id_from_logo_object_name(name)
      and sm.user_id = auth.uid()
      and sm.status = 'active'
  )
);

drop policy if exists school_logo_insert_admin on storage.objects;
create policy school_logo_insert_admin on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'worksheet-assets'
  and public.current_user_is_school_admin(public.school_id_from_logo_object_name(name))
);

drop policy if exists school_logo_update_admin on storage.objects;
create policy school_logo_update_admin on storage.objects
for update
to authenticated
using (
  bucket_id = 'worksheet-assets'
  and public.current_user_is_school_admin(public.school_id_from_logo_object_name(name))
)
with check (
  bucket_id = 'worksheet-assets'
  and public.current_user_is_school_admin(public.school_id_from_logo_object_name(name))
);

drop policy if exists school_logo_delete_admin on storage.objects;
create policy school_logo_delete_admin on storage.objects
for delete
to authenticated
using (
  bucket_id = 'worksheet-assets'
  and public.current_user_is_school_admin(public.school_id_from_logo_object_name(name))
);

comment on table public.schools is 'School-level accounts.';
comment on table public.school_centres is 'Internal school teacher-capacity container (single primary row used by UI).';
comment on table public.school_memberships is 'School members and roles (admin/teacher).';
comment on table public.centre_memberships is 'Internal teacher seat tracking for school membership.';
comment on table public.centre_invites is 'Email-based school invite queue.';
comment on table public.game_play_events is 'Per-user game play starts for school analytics and engagement tracking.';
