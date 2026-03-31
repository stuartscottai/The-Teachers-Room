create table if not exists public.generation_usage (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default timezone('utc', now()),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text,
  action text not null,
  model text not null,
  status text not null check (status in ('success', 'error')),
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  thoughts_tokens integer not null default 0 check (thoughts_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  estimated_cost_usd numeric(12, 6) not null default 0,
  latency_ms integer,
  client_env text,
  request_origin text,
  response_id text,
  model_version text,
  error_message text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists generation_usage_created_at_idx
  on public.generation_usage (created_at desc);

create index if not exists generation_usage_user_id_idx
  on public.generation_usage (user_id, created_at desc);

create index if not exists generation_usage_action_idx
  on public.generation_usage (action, created_at desc);

alter table public.generation_usage enable row level security;

comment on table public.generation_usage is
  'Server-side Gemini generation usage log. Insert with the Supabase service role key only.';

create or replace view public.generation_usage_daily as
select
  created_at::date as day,
  coalesce(client_env, 'unknown') as client_env,
  count(*) filter (where status = 'success') as successful_generations,
  count(*) filter (where status = 'error') as failed_generations,
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
  count(*) filter (where status = 'success') as successful_generations,
  count(*) filter (where status = 'error') as failed_generations,
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
  count(*) filter (where status = 'success') as successful_generations,
  count(*) filter (where status = 'error') as failed_generations,
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
  count(*) filter (where status = 'success') as successful_generations,
  count(*) filter (where status = 'error') as failed_generations,
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
