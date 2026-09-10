begin;
create table public.wl_dashboard_favorites (
  user_id uuid not null references public.wl_profiles(id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z0-9^][A-Z0-9.^=-]{0,24}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, symbol)
);
create index wl_dashboard_favorites_user_created on public.wl_dashboard_favorites(user_id, created_at);
alter table public.wl_dashboard_favorites enable row level security;
revoke all on public.wl_dashboard_favorites from anon, authenticated;
grant select on public.wl_dashboard_favorites to authenticated;
grant all on public.wl_dashboard_favorites to service_role;
create policy wl_dashboard_favorites_read on public.wl_dashboard_favorites for select to authenticated using (user_id=(select auth.uid()));

create function public.wl_favorite_action(p_user uuid, p_action text, p_symbol text) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.wl_profiles where id=p_user for update;
  if not found then raise exception 'Account not found' using errcode='P0001'; end if;
  if p_symbol is null or p_symbol !~ '^[A-Z0-9^][A-Z0-9.^=-]{0,24}$' then raise exception 'Use a ticker such as AAPL, BRK-B, or VOD.L.' using errcode='P0001'; end if;
  if p_action='add' then
    if (select count(*) from public.wl_dashboard_favorites where user_id=p_user)>=30 then
      raise exception 'You can favorite up to 30 stocks on the dashboard.' using errcode='P0001';
    end if;
    insert into public.wl_dashboard_favorites(user_id,symbol) values(p_user,p_symbol) on conflict do nothing;
  elsif p_action='remove' then
    delete from public.wl_dashboard_favorites where user_id=p_user and symbol=p_symbol;
  else
    raise exception 'Unknown action.' using errcode='P0001';
  end if;
end $$;
revoke all on function public.wl_favorite_action(uuid,text,text) from public, anon, authenticated;
grant execute on function public.wl_favorite_action(uuid,text,text) to service_role;
commit;
