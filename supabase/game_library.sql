-- Small, paginated cards for Community and My Library. Full game content is
-- fetched separately when opening a card. SECURITY INVOKER preserves the
-- saved_games row-level access rules; this function never gains owner access.
create or replace function public.get_game_library_page(
  p_scope text default 'community',
  p_page integer default 1,
  p_limit integer default 10,
  p_search text default '',
  p_type text default 'all',
  p_sort text default 'newest',
  p_source text default 'all',
  p_image text default 'all',
  p_author uuid default null,
  p_school uuid default null
) returns jsonb
language sql stable security invoker
set search_path = public, pg_temp
as $function$
  with recent as (
    select * from public.get_public_game_play_counts_since(
      case when p_sort = 'trending' then
        array(select id from public.saved_games where is_public = true)
      else array[]::uuid[] end,
      now() - interval '7 days'
    )
  ), candidates as (
    select g.id, g.title, g.created_at, coalesce(g.play_count, 0) as plays,
      coalesce(r.play_count, 0) as weekly_plays
    from public.saved_games g
    left join recent r on r.game_id = g.id
    where ((p_scope = 'community' and g.is_public = true)
      or (p_scope = 'own' and g.user_id = (select auth.uid())))
      and (p_author is null or g.user_id = p_author)
      and (p_school is null or g.school_id = p_school)
      and (p_search = '' or g.title ilike '%' || p_search || '%'
        or g.config->>'topic' ilike '%' || p_search || '%'
        or (p_scope = 'community' and g.author_name ilike '%' || p_search || '%'))
      and (p_type = 'all' or g.config->>'type' = p_type)
      and (p_source = 'all' or g.config->>'isAI' = case when p_source = 'ai' then 'true' else 'false' end)
      and (p_image = 'all' or (p_image = 'with-images') = exists (
        select 1 from jsonb_path_query(
          jsonb_build_array(g.questions, g.jeopardy_board, g.pub_quiz_rounds), '$.**.image'
        ) as images(image)
        where case jsonb_typeof(image)
          when 'string' then (image #>> '{}') ~ '[^[:space:]]'
          when 'object' then concat_ws('', image->>'url', image->>'thumbUrl', image->>'thumbnailUrl',
            image->>'storagePath', image->>'storage_path', image->>'stockId') ~ '[^[:space:]]'
          else false end
      ))
  ), ranked as (
    select id, row_number() over (order by
      case when p_sort = 'trending' then weekly_plays end desc nulls last,
      case when p_sort in ('trending', 'plays') then plays end desc nulls last,
      case when p_sort = 'oldest' then created_at end asc,
      case when p_sort = 'az' then title end asc,
      case when p_sort = 'za' then title end desc,
      created_at desc, id asc
    ) as position
    from candidates
  ), page as (
    select * from ranked order by position
    limit greatest(1, least(coalesce(p_limit, 10), 50))
    offset (greatest(1, coalesce(p_page, 1))::bigint - 1) * greatest(1, least(coalesce(p_limit, 10), 50))
  ), cards as (
    select page.position, jsonb_build_object(
      'id', g.id, 'title', g.title, 'user_id', g.user_id,
      'author_name', g.author_name, 'created_at', g.created_at,
      'is_public', g.is_public, 'play_count', g.play_count,
      'config', jsonb_build_object(
        'type', g.config->'type', 'topic', g.config->'topic',
        'isAI', g.config->'isAI', 'questionType', g.config->'questionType',
        'coverImage', g.config->'coverImage', 'authorAvatar', g.config->'authorAvatar'
      ),
      'library_summary', jsonb_build_object(
        'questionCount', case g.config->>'type'
          when 'Jeopardy' then (select coalesce(sum(jsonb_array_length(case when jsonb_typeof(c->'questions') = 'array' then c->'questions' else '[]'::jsonb end)), 0) from jsonb_array_elements(case when jsonb_typeof(g.jeopardy_board) = 'array' then g.jeopardy_board else '[]'::jsonb end) c)
          when 'Pub Quiz' then (select coalesce(sum(jsonb_array_length(case when jsonb_typeof(c->'questions') = 'array' then c->'questions' else '[]'::jsonb end)), 0) from jsonb_array_elements(case when jsonb_typeof(g.pub_quiz_rounds) = 'array' then g.pub_quiz_rounds else '[]'::jsonb end) c)
          else jsonb_array_length(case when jsonb_typeof(g.questions) = 'array' then g.questions else '[]'::jsonb end) end,
        'categoryCount', case when g.config->>'type' = 'Jeopardy'
          then jsonb_array_length(case when jsonb_typeof(g.jeopardy_board) = 'array' then g.jeopardy_board else '[]'::jsonb end)
          else jsonb_array_length(case when jsonb_typeof(g.config->'stopTheFireCategories') = 'array' then g.config->'stopTheFireCategories' else '[]'::jsonb end) end,
        'roundCount', jsonb_array_length(case when jsonb_typeof(g.pub_quiz_rounds) = 'array' then g.pub_quiz_rounds else '[]'::jsonb end)
      )
    ) as card
    from page join public.saved_games g on g.id = page.id
  )
  select jsonb_build_object(
    'data', coalesce((select jsonb_agg(card order by position) from cards), '[]'::jsonb),
    'count', (select count(*) from candidates)
  );
$function$;

revoke all on function public.get_game_library_page(text, integer, integer, text, text, text, text, text, uuid, uuid) from public;
grant execute on function public.get_game_library_page(text, integer, integer, text, text, text, text, text, uuid, uuid) to anon, authenticated;
notify pgrst, 'reload schema';
