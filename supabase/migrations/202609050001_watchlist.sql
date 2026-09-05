-- Account-owned storage. Run once in a fresh Supabase project.
begin;
create table public.wl_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Member' check (length(display_name) between 1 and 60),
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  stripe_customer_id text unique,
  subscription_status text not null default 'free',
  pro_until timestamptz,
  billing_checked_at timestamptz
);
create table public.wl_watchlists (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.wl_profiles(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60), created_at timestamptz not null default now(),
  share_token text unique check (share_token is null or share_token ~ '^[A-Za-z0-9_-]{43}$')
);
create unique index wl_watchlists_owner_name on public.wl_watchlists(owner_id,lower(name));
create index wl_watchlists_owner_created on public.wl_watchlists(owner_id,created_at,id);
create table public.wl_stocks (
  id uuid primary key default gen_random_uuid(), watchlist_id uuid not null references public.wl_watchlists(id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z0-9^][A-Z0-9.^=-]{0,24}$'),
  added_at timestamptz not null default now(), snapshot jsonb not null,
  unique(watchlist_id,symbol),
  check ((snapshot->>'price')::numeric > 0 and snapshot ? 'quoteTime' and snapshot ? 'companyName' and snapshot ? 'currency')
);
create index wl_stocks_list_added on public.wl_stocks(watchlist_id,added_at,id);
create table public.wl_quotes (symbol text primary key, quote jsonb not null, fetched_at timestamptz not null default now(), error text);
create table public.wl_stripe_events (id text primary key, processed_at timestamptz not null default now());
create table public.wl_rate_limits (key text primary key, starts_at timestamptz not null, hits integer not null);

alter table public.wl_profiles enable row level security;
alter table public.wl_watchlists enable row level security;
alter table public.wl_stocks enable row level security;
alter table public.wl_quotes enable row level security;
alter table public.wl_stripe_events enable row level security;
alter table public.wl_rate_limits enable row level security;
revoke all on public.wl_profiles, public.wl_watchlists, public.wl_stocks, public.wl_quotes, public.wl_stripe_events, public.wl_rate_limits from anon, authenticated;
grant select on public.wl_profiles, public.wl_watchlists, public.wl_stocks to authenticated;
grant all on public.wl_profiles, public.wl_watchlists, public.wl_stocks, public.wl_quotes, public.wl_stripe_events, public.wl_rate_limits to service_role;
create policy wl_profile_read on public.wl_profiles for select to authenticated using (id=(select auth.uid()));
create policy wl_list_read on public.wl_watchlists for select to authenticated using (owner_id=(select auth.uid()));
create policy wl_stock_read on public.wl_stocks for select to authenticated using (exists(select 1 from public.wl_watchlists l where l.id=watchlist_id and l.owner_id=(select auth.uid())));

create function public.wl_ensure_profile(p_user uuid, p_name text, p_trial_days integer default 0) returns void
language plpgsql security definer set search_path='' as $$
begin
  insert into public.wl_profiles(id,display_name,trial_ends_at) values(p_user,left(coalesce(nullif(btrim(p_name),''),'Member'),60),case when p_trial_days>0 then now()+make_interval(days=>p_trial_days) else null end) on conflict(id) do nothing;
  -- Lock the account to serialize limit checks and initial-list creation.
  perform 1 from public.wl_profiles where id=p_user for update;
  if not exists(select 1 from public.wl_watchlists where owner_id=p_user) then
    insert into public.wl_watchlists(owner_id,name) values(p_user,'My watchlist');
  end if;
end $$;
create function public.wl_is_pro(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select subscription_status='active' and pro_until>now() from public.wl_profiles where id=p_user),false);
$$;
create function public.wl_account_action(p_user uuid,p_action text,p_list uuid default null,p_name text default null,p_symbol text default null,p_quote jsonb default null,p_stock uuid default null,p_token text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_pro boolean; v_max_lists int; v_max_stocks int; v_id uuid; v_expires timestamptz;
begin
  select trial_ends_at into v_expires from public.wl_profiles where id=p_user for update;
  if not found then raise exception 'Account not found' using errcode='P0001'; end if;
  v_pro:=public.wl_is_pro(p_user); v_max_lists:=case when v_pro then 10 else 1 end; v_max_stocks:=case when v_pro then 50 else 10 end;
  if p_action in ('createList','addStock') and not v_pro and v_expires is not null and v_expires<=now() then raise exception 'Your trial has ended. Upgrade to Pro to add more ideas.' using errcode='P0001'; end if;
  if p_action='createList' then
    if (select count(*) from public.wl_watchlists where owner_id=p_user)>=v_max_lists then raise exception 'Watchlist limit reached. Upgrade your plan or remove a watchlist.' using errcode='P0001'; end if;
    if p_name is null or length(btrim(p_name)) not between 1 and 60 then raise exception 'Enter a name between 1 and 60 characters.' using errcode='P0001'; end if;
    insert into public.wl_watchlists(owner_id,name) values(p_user,btrim(p_name)) returning id into v_id; return v_id;
  end if;
  perform 1 from public.wl_watchlists where id=p_list and owner_id=p_user for update;
  if not found then raise exception 'Watchlist not found or you do not own it.' using errcode='P0002'; end if;
  case p_action
    when 'renameList' then
      if p_name is null or length(btrim(p_name)) not between 1 and 60 then raise exception 'Enter a name between 1 and 60 characters.' using errcode='P0001'; end if;
      update public.wl_watchlists set name=btrim(p_name) where id=p_list;
    when 'deleteList' then
      if (select count(*) from public.wl_watchlists where owner_id=p_user)<=1 then raise exception 'Keep at least one watchlist.' using errcode='P0001'; end if;
      delete from public.wl_watchlists where id=p_list;
    when 'addStock' then
      if not v_pro and p_list<>(select id from public.wl_watchlists where owner_id=p_user order by created_at,id limit 1) then raise exception 'This extra watchlist is read-only on your current plan.' using errcode='P0001'; end if;
      if (select count(*) from public.wl_stocks where watchlist_id=p_list)>=v_max_stocks then raise exception 'Stock limit reached for this watchlist.' using errcode='P0001'; end if;
      if p_quote is null or p_symbol is null or p_quote->>'symbol'<>p_symbol then raise exception 'A verified market quote is required.' using errcode='P0001'; end if;
      insert into public.wl_stocks(watchlist_id,symbol,snapshot) values(p_list,p_symbol,p_quote);
    when 'removeStock' then
      delete from public.wl_stocks where id=p_stock and watchlist_id=p_list;
      if not found then raise exception 'Stock not found.' using errcode='P0002'; end if;
    when 'shareList' then
      if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'Invalid share token.' using errcode='P0001'; end if;
      update public.wl_watchlists set share_token=coalesce(share_token,p_token) where id=p_list;
    when 'revokeShare' then update public.wl_watchlists set share_token=null where id=p_list;
    else raise exception 'Unknown action.' using errcode='P0001';
  end case;
  return p_list;
end $$;
create function public.wl_country(p_user uuid,p_country text) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_country is not null and p_country !~ '^[A-Z]{2}$' then raise exception 'Choose a valid country.' using errcode='P0001'; end if;
  update public.wl_profiles set country_code=p_country where id=p_user;
end $$;
create function public.wl_community() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('users',(select count(*) from public.wl_profiles),'countries',coalesce((select jsonb_agg(jsonb_build_object('code',country_code,'users',n)) from (select country_code,count(*) n from public.wl_profiles where country_code is not null group by country_code having count(*)>=3) c),'[]'::jsonb));
$$;
create function public.wl_rate(p_key text,p_max integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare v_hits integer;
begin
 insert into public.wl_rate_limits(key,starts_at,hits) values(p_key,now(),1)
 on conflict(key) do update set hits=case when public.wl_rate_limits.starts_at<=now()-make_interval(secs=>p_seconds) then 1 else public.wl_rate_limits.hits+1 end,
 starts_at=case when public.wl_rate_limits.starts_at<=now()-make_interval(secs=>p_seconds) then now() else public.wl_rate_limits.starts_at end returning hits into v_hits;
 return v_hits<=p_max;
end $$;
create function public.wl_apply_billing(p_user uuid,p_customer text,p_status text,p_until timestamptz,p_checked timestamptz,p_event text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_event is not null and exists(select 1 from public.wl_stripe_events where id=p_event) then return; end if;
 update public.wl_profiles set subscription_status=p_status,pro_until=p_until,billing_checked_at=p_checked
 where id=p_user and stripe_customer_id=p_customer and (billing_checked_at is null or billing_checked_at<=p_checked);
 if p_event is not null then insert into public.wl_stripe_events(id) values(p_event) on conflict do nothing; end if;
end $$;
-- Write RPCs are callable ONLY by the backend service role, never by browsers.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname like 'wl_%' loop
 execute format('revoke all on function %s from public, anon, authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
commit;
