-- Migration: Create banners table
-- Justification: Section 50 of MASTER_PLAN_v1.2 defines this as an official product feature.
-- Rules: RLS enabled; public read for active banners within date range; write restricted to platform_admin.

create table if not exists public.banners (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  image_url_desktop  text not null,
  image_url_mobile   text,
  destination_url text not null,
  position        text not null,       -- home_hero | home_after_featured | home_editorial | search_top | search_middle | property_bottom
  status          text not null default 'inactive', -- active | inactive | archived
  start_at        timestamptz,
  end_at          timestamptz,
  priority        integer not null default 0,
  advertiser_id   uuid references public.agencies(id) on delete set null,
  campaign_id     uuid,
  impressions     bigint not null default 0,
  clicks          bigint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint banners_position_check check (
    position in (
      'home_hero',
      'home_after_featured',
      'home_editorial',
      'search_top',
      'search_middle',
      'property_bottom'
    )
  ),
  constraint banners_status_check check (
    status in ('active', 'inactive', 'archived')
  )
);

-- Efficient index for the public query pattern: position + active + date range
create index if not exists idx_banners_position_active
  on public.banners (position, status, priority desc)
  where status = 'active';

-- updated_at auto-update trigger
create or replace function public.update_banners_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger banners_updated_at
  before update on public.banners
  for each row execute function public.update_banners_updated_at();

-- RLS
alter table public.banners enable row level security;

-- Public read: only active banners within their valid date range
create policy "banners_public_read" on public.banners
  for select
  using (
    status = 'active'
    and (start_at is null or start_at <= now())
    and (end_at is null or end_at >= now())
  );

-- Write access: platform_admin only (via service_role on server — never exposed to frontend)
-- No INSERT/UPDATE/DELETE policies for anon or authenticated roles intentionally.
-- All mutations happen server-side via admin client.
