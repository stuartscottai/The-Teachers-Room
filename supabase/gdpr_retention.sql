-- Automatic personal-data retention cleanup.
-- Safe to run more than once in Supabase SQL Editor.

create extension if not exists pg_cron with schema extensions;

create or replace function public.run_gdpr_retention_cleanup()
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  -- The existing foreign keys delete participants, answers, and questions with
  -- each live-quiz session.
  delete from public.live_quiz_sessions
  where created_at < timezone('utc', now()) - interval '24 hours';

  -- Operational AI usage records are retained for at most 12 months.
  if to_regclass('public.generation_usage') is not null then
    delete from public.generation_usage
    where created_at < timezone('utc', now()) - interval '12 months';
  end if;

  -- Expired or revoked student sharing records no longer need to remain.
  if to_regclass('public.student_game_shares') is not null then
    delete from public.student_game_shares
    where coalesce(revoked_at, expires_at) is not null
      and coalesce(revoked_at, expires_at) < timezone('utc', now()) - interval '30 days';
  end if;

  -- Remove old school invitation email records after their short audit window.
  if to_regclass('public.centre_invites') is not null then
    delete from public.centre_invites
    where expires_at < timezone('utc', now()) - interval '30 days';
  end if;

  -- Contact messages are kept for no more than 24 months when the table has
  -- the expected timestamp column.
  if to_regclass('public.contact_messages') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'contact_messages'
         and column_name = 'created_at'
     ) then
    execute 'delete from public.contact_messages where created_at < timezone(''utc'', now()) - interval ''24 months''';
  end if;
end;
$function$;

revoke all on function public.run_gdpr_retention_cleanup() from public, anon, authenticated;

do $schedule$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'teachers-room-gdpr-retention'
  loop
    perform cron.unschedule(existing_job);
  end loop;

  perform cron.schedule(
    'teachers-room-gdpr-retention',
    '15 * * * *',
    'select public.run_gdpr_retention_cleanup();'
  );
end;
$schedule$;
