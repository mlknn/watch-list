begin;
alter table public.wl_stocks add column orders jsonb not null default '[]'::jsonb;
update public.wl_stocks set orders=jsonb_build_array(jsonb_build_object('id',1,'quantity',quantity,'costPerShare',cost_per_share,'acquiredAt',acquired_at,'notes',notes)) where quantity is not null;
-- Keep the original validated first-purchase path and immutable purchase columns.
alter function public.wl_advanced_action(uuid,text,uuid,text,text,jsonb,uuid,text,text,numeric,numeric,timestamptz,text) rename to wl_first_position_action;
create function public.wl_advanced_action(p_user uuid,p_action text,p_list uuid default null,p_name text default null,p_symbol text default null,p_quote jsonb default null,p_stock uuid default null,p_token text default null,p_mode text default 'advanced',p_quantity numeric default null,p_cost numeric default null,p_acquired timestamptz default null,p_notes text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare v_stock public.wl_stocks; v_id uuid; v_order integer;
begin
 perform 1 from public.wl_profiles where id=p_user for update;
 if not found then raise exception 'Account not found';end if;
 if p_action in ('addOrder','addStock','initializePosition') then
  perform 1 from public.wl_watchlists where id=p_list and owner_id=p_user for update;
  if not found then raise exception 'Watchlist not found or you do not own it.';end if;
  select * into v_stock from public.wl_stocks where watchlist_id=p_list and (case when p_action='addStock' then symbol=p_symbol else id=p_stock end) for update;
  if p_action='addOrder' or (p_action='addStock' and v_stock.id is not null) then
   if v_stock.id is null then raise exception 'Stock not found.';end if;
   if p_action='addStock' and v_stock.snapshot->>'currency' is distinct from p_quote->>'currency' then raise exception 'Quote currency does not match.';end if;
   if p_quantity is null or p_quantity<=0 or p_quantity>1000000000 or p_quantity::text='NaN' or p_cost is null or p_cost<=0 or p_cost>1000000000 or p_cost::text='NaN' then raise exception 'Enter a positive share quantity and cost per share.';end if;
   if p_acquired is null or p_acquired>now() or p_acquired<'1970-01-01'::timestamptz then raise exception 'Enter a valid purchase date, no later than today.';end if;
   if p_notes is null or length(p_notes)>500 then raise exception 'Keep notes under 500 characters.';end if;
   if v_stock.quantity is null then
    perform public.wl_first_position_action(p_user,'initializePosition',p_list,p_name,p_symbol,p_quote,v_stock.id,p_token,p_mode,p_quantity,p_cost,p_acquired,p_notes);
   end if;
   v_order:=jsonb_array_length(v_stock.orders)+1;
   update public.wl_stocks set orders=orders||jsonb_build_array(jsonb_build_object('id',v_order,'quantity',p_quantity,'costPerShare',p_cost,'acquiredAt',p_acquired,'notes',p_notes)) where id=v_stock.id;
   return p_list;
  end if;
 end if;
 v_id:=public.wl_first_position_action(p_user,p_action,p_list,p_name,p_symbol,p_quote,p_stock,p_token,p_mode,p_quantity,p_cost,p_acquired,p_notes);
 if p_action in ('addStock','initializePosition') and p_quantity is not null then
  update public.wl_stocks set orders=jsonb_build_array(jsonb_build_object('id',1,'quantity',quantity,'costPerShare',cost_per_share,'acquiredAt',acquired_at,'notes',notes)) where watchlist_id=p_list and (case when p_action='addStock' then symbol=p_symbol else id=p_stock end);
 end if;
 return v_id;
end $$;
revoke all on function public.wl_advanced_action(uuid,text,uuid,text,text,jsonb,uuid,text,text,numeric,numeric,timestamptz,text) from public,anon,authenticated;
grant execute on function public.wl_advanced_action(uuid,text,uuid,text,text,jsonb,uuid,text,text,numeric,numeric,timestamptz,text) to service_role;
commit;
