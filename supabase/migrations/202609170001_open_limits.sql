begin;
create or replace function public.wl_account_action(p_user uuid,p_action text,p_list uuid default null,p_name text default null,p_symbol text default null,p_quote jsonb default null,p_stock uuid default null,p_token text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_max_lists int; v_max_stocks int; v_id uuid;
begin
  perform 1 from public.wl_profiles where id=p_user for update;
  if not found then raise exception 'Account not found' using errcode='P0001'; end if;
  v_max_lists:=5; v_max_stocks:=20;
  if p_action='createList' then
    if (select count(*) from public.wl_watchlists where owner_id=p_user)>=v_max_lists then raise exception 'Watchlist limit reached. Remove a watchlist to create another.' using errcode='P0001'; end if;
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
revoke all on function public.wl_account_action(uuid,text,uuid,text,text,jsonb,uuid,text) from public, anon, authenticated;
grant execute on function public.wl_account_action(uuid,text,uuid,text,text,jsonb,uuid,text) to service_role;
commit;
