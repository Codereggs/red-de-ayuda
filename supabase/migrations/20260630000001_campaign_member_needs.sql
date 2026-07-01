-- ─────────────────────────────────────────────────────────────────────────────
-- campaign_member_needs
-- Free-text needs for campaign members (description + USD price).
-- Linked to campaign_cases (not directly to cases or need_categories).
-- ─────────────────────────────────────────────────────────────────────────────

create table public.campaign_member_needs (
  id                uuid        primary key default gen_random_uuid(),
  campaign_case_id  uuid        not null references public.campaign_cases(id) on delete cascade,
  description       text        not null check (char_length(description) >= 1 and char_length(description) <= 100),
  price_usd         numeric     not null default 0 check (price_usd >= 0),
  created_at        timestamptz not null default now()
);

create index if not exists idx_campaign_member_needs_campaign_case_id
  on public.campaign_member_needs(campaign_case_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Fix campaign_cases public policy: remove is_public_case requirement.
-- Campaign member cases are slim (not individually verified), so they should be
-- readable whenever the parent campaign is public.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "campaign_cases_public_select" on public.campaign_cases;
create policy "campaign_cases_public_select" on public.campaign_cases
  for select using (
    deleted_at is null
    and public.is_public_campaign(campaign_id)
  );

-- Allow reading cases linked to a public campaign (campaign member cases are not
-- individually verified but should be readable as part of their campaign).

drop policy if exists "cases_campaign_member_select" on public.cases;
create policy "cases_campaign_member_select" on public.cases
  for select using (
    deleted_at is null
    and exists (
      select 1 from public.campaign_cases cc
      where cc.case_id = id
        and cc.deleted_at is null
        and public.is_public_campaign(cc.campaign_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS for campaign_member_needs
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.campaign_member_needs enable row level security;

drop policy if exists "campaign_member_needs_public_select" on public.campaign_member_needs;
create policy "campaign_member_needs_public_select" on public.campaign_member_needs
  for select using (
    exists (
      select 1 from public.campaign_cases cc
      where cc.id = campaign_case_id
        and cc.deleted_at is null
        and public.is_public_campaign(cc.campaign_id)
    )
  );

drop policy if exists "campaign_member_needs_internal_all" on public.campaign_member_needs;
create policy "campaign_member_needs_internal_all" on public.campaign_member_needs
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());
