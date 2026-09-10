begin;
create table public.wl_analytics_uniques (
  day date not null,
  event text not null,
  visitor_hash text not null,
  first_at timestamptz not null default now(),
  primary key (day, event, visitor_hash)
);
create table public.wl_analytics_totals (
  day date not null,
  event text not null,
  n integer not null default 0,
  primary key (day, event)
);
alter table public.wl_analytics_uniques enable row level security;
alter table public.wl_analytics_totals enable row level security;
revoke all on public.wl_analytics_uniques from anon, authenticated;
revoke all on public.wl_analytics_totals from anon, authenticated;
grant all on public.wl_analytics_uniques to service_role;
grant all on public.wl_analytics_totals to service_role;

create function public.wl_analytics_track(p_event text, p_visitor text) returns void
language plpgsql security definer set search_path='' as $$
declare v_day date := (timezone('utc', now()))::date;
begin
  if p_event not in ('visit','dashboard','stock_search','watchlist_created','signup') then
    raise exception 'Unknown event.' using errcode='P0001';
  end if;
  if p_visitor is null or p_visitor !~ '^[0-9a-f]{16,64}$' then
    raise exception 'Invalid visitor.' using errcode='P0001';
  end if;
  insert into public.wl_analytics_uniques(day, event, visitor_hash)
    values (v_day, p_event, p_visitor) on conflict do nothing;
  insert into public.wl_analytics_totals(day, event, n) values (v_day, p_event, 1)
    on conflict (day, event) do update set n = public.wl_analytics_totals.n + 1;
end $$;
revoke all on function public.wl_analytics_track(text, text) from public, anon, authenticated;
grant execute on function public.wl_analytics_track(text, text) to service_role;

create function public.wl_analytics_summary(p_days integer default 14) returns jsonb
language sql stable security definer set search_path='' as $$
  with days as (
    select generate_series(((timezone('utc', now()))::date - (greatest(1, least(coalesce(p_days, 14), 90)) - 1)), (timezone('utc', now()))::date, interval '1 day')::date as day
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'day', d.day,
    'visit', jsonb_build_object('unique', coalesce(u.visit,0), 'total', coalesce(t.visit,0)),
    'dashboard', jsonb_build_object('unique', coalesce(u.dashboard,0), 'total', coalesce(t.dashboard,0)),
    'stock_search', jsonb_build_object('unique', coalesce(u.stock_search,0), 'total', coalesce(t.stock_search,0)),
    'watchlist_created', jsonb_build_object('unique', coalesce(u.watchlist_created,0), 'total', coalesce(t.watchlist_created,0)),
    'signup', jsonb_build_object('unique', coalesce(u.signup,0), 'total', coalesce(t.signup,0))
  ) order by d.day desc), '[]'::jsonb)
  from days d
  left join (
    select day,
      count(*) filter (where event='visit') as visit,
      count(*) filter (where event='dashboard') as dashboard,
      count(*) filter (where event='stock_search') as stock_search,
      count(*) filter (where event='watchlist_created') as watchlist_created,
      count(*) filter (where event='signup') as signup
    from public.wl_analytics_uniques group by day
  ) u on u.day=d.day
  left join (
    select day,
      sum(n) filter (where event='visit') as visit,
      sum(n) filter (where event='dashboard') as dashboard,
      sum(n) filter (where event='stock_search') as stock_search,
      sum(n) filter (where event='watchlist_created') as watchlist_created,
      sum(n) filter (where event='signup') as signup
    from public.wl_analytics_totals group by day
  ) t on t.day=d.day
$$;
revoke all on function public.wl_analytics_summary(integer) from public, anon, authenticated;
grant execute on function public.wl_analytics_summary(integer) to service_role;

create or replace function public.wl_ensure_profile(p_user uuid, p_name text, p_trial_days integer default 0) returns void
language plpgsql security definer set search_path='' as $$
declare v_inserted integer;
begin
  insert into public.wl_profiles(id,display_name,trial_ends_at) values(p_user,left(coalesce(nullif(btrim(p_name),''),'Member'),60),case when p_trial_days>0 then now()+make_interval(days=>p_trial_days) else null end) on conflict(id) do nothing;
  get diagnostics v_inserted = row_count;
  perform 1 from public.wl_profiles where id=p_user for update;
  if not exists(select 1 from public.wl_watchlists where owner_id=p_user) then
    insert into public.wl_watchlists(owner_id,name) values(p_user,'My watchlist');
  end if;
  if v_inserted>0 then
    perform public.wl_analytics_track('signup', replace(p_user::text, '-', ''));
  end if;
end $$;
commit;
