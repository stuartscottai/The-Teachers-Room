-- Make student self-study/QR share links expire three months after creation.
-- Safe to run more than once in the Supabase SQL Editor.

begin;

alter table public.student_game_shares
  alter column expires_at set default (now() + interval '3 months');

-- Give every existing link the same three-month lifetime, measured from when
-- the link was originally created.
update public.student_game_shares
set expires_at = created_at + interval '3 months'
where expires_at is null;

create or replace function public.get_student_game_share(p_share_id uuid)
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
as $function$
  select s.id, s.game_id, s.title, s.selected_items, s.expires_at, s.revoked_at
  from public.student_game_shares s
  join public.saved_games g on g.id = s.game_id
  where s.id = p_share_id
    and s.revoked_at is null
    and coalesce(s.expires_at, s.created_at + interval '3 months') > timezone('utc', now())
    and g.is_public = true
  limit 1;
$function$;

revoke all on function public.get_student_game_share(uuid) from public;
grant execute on function public.get_student_game_share(uuid) to anon, authenticated;

commit;

-- The existing GDPR cleanup job permanently removes expired share rows after
-- a further 30-day grace period.
