-- Apply once in the Supabase SQL editor before enabling question replacement.
-- Repairs remain in generation_usage with action = 'question-replacement'.
-- Only completed action = 'game' requests contribute to generation counters.
-- Requires the existing generation_usage.sql and account_access.sql setup.
begin;

create table if not exists public.question_replacement_allowances (
  user_id uuid not null references auth.users(id) on delete cascade,
  hour_start timestamptz not null,
  request_count integer not null check (request_count between 1 and 20),
  primary key (user_id, hour_start)
);
alter table public.question_replacement_allowances enable row level security;
revoke all on public.question_replacement_allowances from anon, authenticated;

create or replace function public.reserve_question_replacement(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved integer;
begin
  delete from public.question_replacement_allowances where hour_start < now() - interval '2 days';
  insert into public.question_replacement_allowances (user_id, hour_start, request_count)
  values (p_user_id, date_trunc('hour', now()), 1)
  on conflict (user_id, hour_start) do update
    set request_count = question_replacement_allowances.request_count + 1
    where question_replacement_allowances.request_count < 20
  returning request_count into reserved;
  return reserved is not null;
end;
$$;
revoke all on function public.reserve_question_replacement(uuid) from public, anon, authenticated;
grant execute on function public.reserve_question_replacement(uuid) to service_role;

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
        and action = ''game''
        and ($2 is null or created_at >= $2)'
  using p_user_id, p_since;
end;
$$;


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
        and status = ''success''
        and action = ''game'''
  using auth.uid();
end;
$$;


create or replace view public.generation_usage_daily as
select
  created_at::date as day,
  coalesce(client_env, 'unknown') as client_env,
  count(*) filter (where status = 'success' and action = 'game') as successful_generations,
  count(*) filter (where status = 'error' and action = 'game') as failed_generations,
  count(*) as total_requests,
  coalesce(sum(prompt_tokens), 0) as prompt_tokens,
  coalesce(sum(output_tokens), 0) as output_tokens,
  coalesce(sum(thoughts_tokens), 0) as thoughts_tokens,
  coalesce(sum(total_tokens), 0) as total_tokens,
  round(coalesce(sum(estimated_cost_usd), 0)::numeric, 6) as estimated_cost_usd
from public.generation_usage
group by created_at::date, coalesce(client_env, 'unknown')
order by day desc, client_env;

create or replace view public.generation_usage_monthly as
select
  date_trunc('month', created_at)::date as month,
  coalesce(client_env, 'unknown') as client_env,
  count(*) filter (where status = 'success' and action = 'game') as successful_generations,
  count(*) filter (where status = 'error' and action = 'game') as failed_generations,
  count(*) as total_requests,
  coalesce(sum(prompt_tokens), 0) as prompt_tokens,
  coalesce(sum(output_tokens), 0) as output_tokens,
  coalesce(sum(thoughts_tokens), 0) as thoughts_tokens,
  coalesce(sum(total_tokens), 0) as total_tokens,
  round(coalesce(sum(estimated_cost_usd), 0)::numeric, 6) as estimated_cost_usd
from public.generation_usage
group by date_trunc('month', created_at)::date, coalesce(client_env, 'unknown')
order by month desc, client_env;

create or replace view public.generation_usage_totals as
select
  count(*) filter (where status = 'success' and action = 'game') as successful_generations,
  count(*) filter (where status = 'error' and action = 'game') as failed_generations,
  count(*) as total_requests,
  coalesce(sum(prompt_tokens), 0) as prompt_tokens,
  coalesce(sum(output_tokens), 0) as output_tokens,
  coalesce(sum(thoughts_tokens), 0) as thoughts_tokens,
  coalesce(sum(total_tokens), 0) as total_tokens,
  round(coalesce(sum(estimated_cost_usd), 0)::numeric, 6) as estimated_cost_usd,
  min(created_at) as first_request_at,
  max(created_at) as last_request_at
from public.generation_usage;

create or replace view public.generation_usage_by_user as
select
  user_id,
  max(user_email) as user_email,
  count(*) filter (where status = 'success' and action = 'game') as successful_generations,
  count(*) filter (where status = 'error' and action = 'game') as failed_generations,
  count(*) as total_requests,
  coalesce(sum(prompt_tokens), 0) as prompt_tokens,
  coalesce(sum(output_tokens), 0) as output_tokens,
  coalesce(sum(thoughts_tokens), 0) as thoughts_tokens,
  coalesce(sum(total_tokens), 0) as total_tokens,
  round(coalesce(sum(estimated_cost_usd), 0)::numeric, 6) as estimated_cost_usd,
  max(created_at) as last_request_at
from public.generation_usage
group by user_id
order by last_request_at desc;

commit;
