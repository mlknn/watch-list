begin;
create or replace function public.wl_is_pro(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select subscription_status='active' and pro_until>now() from public.wl_profiles where id=p_user),false);
$$;
alter table public.wl_profiles drop column if exists is_admin;
commit;
