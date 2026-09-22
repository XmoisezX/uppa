-- Migration: Add atomic increment RPC for banner counters
-- This avoids race conditions when multiple concurrent requests hit the same banner.

create or replace function public.increment_banner_counter(
  banner_id uuid,
  counter_field text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if counter_field = 'impressions' then
    update public.banners
    set impressions = impressions + 1
    where id = banner_id;
  elsif counter_field = 'clicks' then
    update public.banners
    set clicks = clicks + 1
    where id = banner_id;
  end if;
end;
$$;

-- Grant execute to service_role (used by the API route via admin client)
grant execute on function public.increment_banner_counter(uuid, text) to service_role;
