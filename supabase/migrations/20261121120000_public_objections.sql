-- Public read-only objection summary for the Registered Teams page.
create or replace function public.public_objections()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    json_agg(
      json_build_object(
        'id', o.id,
        'reason', o.reason,
        'details', o.details,
        'raised_by', o.raised_by,
        'status', o.status,
        'created_at', o.created_at,
        'player_name', p.name,
        'team_name', t.name,
        'source_team_name', st.name
      )
      order by o.created_at desc
    ),
    '[]'::json
  )
  from player_objections o
  left join players p on p.id = o.player_id
  left join teams t on t.id = o.team_id
  left join teams st on st.id = o.source_team_id;
$$;

grant execute on function public.public_objections() to anon, authenticated;
