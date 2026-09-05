begin;
alter table public.wl_profiles add column is_admin boolean not null default false;
alter table public.wl_watchlists add column mode text not null default 'basic' check(mode in ('basic','advanced'));
alter table public.wl_stocks add column quantity numeric check(quantity>0 and quantity<=1000000000);
alter table public.wl_stocks add column cost_per_share numeric check(cost_per_share>0 and cost_per_share<=1000000000);
alter table public.wl_stocks add column acquired_at timestamptz;
alter table public.wl_stocks add column notes text not null default '' check(length(notes)<=500);
create or replace function public.wl_is_pro(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select is_admin or (subscription_status='active' and pro_until>now()) from public.wl_profiles where id=p_user),false);
$$;
create function public.wl_advanced_action(p_user uuid,p_action text,p_list uuid default null,p_name text default null,p_symbol text default null,p_quote jsonb default null,p_stock uuid default null,p_token text default null,p_mode text default 'basic',p_quantity numeric default null,p_cost numeric default null,p_acquired timestamptz default null,p_notes text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_mode text;v_pro boolean;
begin
 perform 1 from public.wl_profiles where id=p_user for update;
 if not found then raise exception 'Account not found' using errcode='P0001';end if;
 v_pro:=public.wl_is_pro(p_user);
 if p_action='createList' then
  if p_mode not in ('basic','advanced') then raise exception 'Choose a valid watchlist type.';end if;
  if p_mode='advanced' and not v_pro then raise exception 'Advanced watchlists require Pro.' using errcode='P0001';end if;
  v_id:=public.wl_account_action(p_user,p_action,p_list,p_name,p_symbol,p_quote,p_stock,p_token);
  update public.wl_watchlists set mode=p_mode where id=v_id;return v_id;
 end if;
 select mode into v_mode from public.wl_watchlists where id=p_list and owner_id=p_user for update;
 if not found then raise exception 'Watchlist not found or you do not own it.' using errcode='P0002';end if;
 if p_action='convertList' then
  if not v_pro then raise exception 'Advanced watchlists require Pro.' using errcode='P0001';end if;
  if exists(select 1 from public.wl_stocks where watchlist_id=p_list and snapshot->>'currency'<>'USD') then raise exception 'Advanced portfolios currently support USD stocks only.' using errcode='P0001';end if;
  update public.wl_watchlists set mode='advanced' where id=p_list;return p_list;
 end if;
 if (p_action='addStock' and v_mode='advanced') or p_action='updatePosition' then
  if not v_pro then raise exception 'Advanced watchlists require Pro.' using errcode='P0001';end if;
  if v_mode<>'advanced' then raise exception 'Choose an advanced watchlist.' using errcode='P0001';end if;
  if p_quantity is null or p_quantity<=0 or p_quantity>1000000000 or p_quantity::text='NaN' or p_cost is null or p_cost<=0 or p_cost>1000000000 or p_cost::text='NaN' then raise exception 'Enter a positive share quantity and cost per share.' using errcode='P0001';end if;
  if p_acquired is null or p_acquired>now() or p_acquired<'1970-01-01'::timestamptz then raise exception 'Enter a valid purchase date, no later than today.' using errcode='P0001';end if;
  if p_notes is null or length(p_notes)>500 then raise exception 'Keep notes under 500 characters.' using errcode='P0001';end if;
  if p_action='addStock' and p_quote->>'currency'<>'USD' then raise exception 'Advanced portfolios currently support USD stocks only.' using errcode='P0001';end if;
  if p_action='updatePosition' then
   update public.wl_stocks set quantity=p_quantity,cost_per_share=p_cost,acquired_at=p_acquired,notes=p_notes where id=p_stock and watchlist_id=p_list and snapshot->>'currency'='USD';
   if not found then raise exception 'Position not found.' using errcode='P0002';end if;return p_list;
  end if;
 end if;
 v_id:=public.wl_account_action(p_user,p_action,p_list,p_name,p_symbol,p_quote,p_stock,p_token);
 if p_action='addStock' and v_mode='advanced' then update public.wl_stocks set quantity=p_quantity,cost_per_share=p_cost,acquired_at=p_acquired,notes=p_notes where watchlist_id=p_list and symbol=p_symbol;end if;
 return v_id;
end $$;
revoke all on function public.wl_advanced_action from public,anon,authenticated;
grant execute on function public.wl_advanced_action to service_role;
commit;
