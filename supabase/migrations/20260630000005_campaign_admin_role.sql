-- Add campaign_admin role and split permissions:
--   admin           → full system access (unchanged)
--   campaign_admin  → create/manage campaigns, members, payment methods
--   helper          → read-only + one contribution per campaign

-- 1. Extend role check constraint
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
    check (role in ('admin', 'campaign_admin', 'helper'));

-- 2. Helper functions

create or replace function public.is_campaign_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'active'
      and role = 'campaign_admin'
  );
$$;

create or replace function public.is_campaign_admin_or_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'active'
      and role in ('admin', 'campaign_admin')
  );
$$;

-- is_helper_or_admin now includes campaign_admin (all internal roles can read)
create or replace function public.is_helper_or_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'active'
      and role in ('admin', 'campaign_admin', 'helper')
  );
$$;

-- 3. Campaign RLS — split write access from read access

-- campaigns: public reads verified; all internal roles read all; only admin/campaign_admin write
drop policy if exists "campaigns_internal_all" on public.campaigns;

drop policy if exists "campaigns_internal_select" on public.campaigns;
create policy "campaigns_internal_select" on public.campaigns
  for select using (public.is_helper_or_admin());

drop policy if exists "campaigns_internal_write" on public.campaigns;
create policy "campaigns_internal_write" on public.campaigns
  for all using (public.is_campaign_admin_or_admin())
  with check (public.is_campaign_admin_or_admin());

-- campaign_cases: all internal roles read; only admin/campaign_admin write
drop policy if exists "campaign_cases_internal_all" on public.campaign_cases;

drop policy if exists "campaign_cases_internal_select" on public.campaign_cases;
create policy "campaign_cases_internal_select" on public.campaign_cases
  for select using (public.is_helper_or_admin());

drop policy if exists "campaign_cases_internal_write" on public.campaign_cases;
create policy "campaign_cases_internal_write" on public.campaign_cases
  for all using (public.is_campaign_admin_or_admin())
  with check (public.is_campaign_admin_or_admin());

-- campaign_assistance_methods: all internal roles read; only admin/campaign_admin write
drop policy if exists "campaign_assistance_methods_internal_all" on public.campaign_assistance_methods;

drop policy if exists "campaign_assistance_methods_internal_select" on public.campaign_assistance_methods;
create policy "campaign_assistance_methods_internal_select" on public.campaign_assistance_methods
  for select using (public.is_helper_or_admin());

drop policy if exists "campaign_assistance_methods_internal_write" on public.campaign_assistance_methods;
create policy "campaign_assistance_methods_internal_write" on public.campaign_assistance_methods
  for all using (public.is_campaign_admin_or_admin())
  with check (public.is_campaign_admin_or_admin());

-- campaign_member_needs: all internal roles read; only admin/campaign_admin write
drop policy if exists "campaign_member_needs_internal_all" on public.campaign_member_needs;

drop policy if exists "campaign_member_needs_internal_select" on public.campaign_member_needs;
create policy "campaign_member_needs_internal_select" on public.campaign_member_needs
  for select using (public.is_helper_or_admin());

drop policy if exists "campaign_member_needs_internal_write" on public.campaign_member_needs;
create policy "campaign_member_needs_internal_write" on public.campaign_member_needs
  for all using (public.is_campaign_admin_or_admin())
  with check (public.is_campaign_admin_or_admin());

-- campaign_contributions:
--   SELECT / UPDATE / DELETE → admin or campaign_admin
--   INSERT                   → any internal role (once-per-campaign for helpers enforced at app level)
drop policy if exists "campaign_contributions_internal_all" on public.campaign_contributions;

drop policy if exists "campaign_contributions_select" on public.campaign_contributions;
create policy "campaign_contributions_select" on public.campaign_contributions
  for select using (public.is_helper_or_admin());

drop policy if exists "campaign_contributions_insert" on public.campaign_contributions;
create policy "campaign_contributions_insert" on public.campaign_contributions
  for insert with check (public.is_helper_or_admin());

drop policy if exists "campaign_contributions_write" on public.campaign_contributions;
create policy "campaign_contributions_write" on public.campaign_contributions
  for update using (public.is_campaign_admin_or_admin())
  with check (public.is_campaign_admin_or_admin());

drop policy if exists "campaign_contributions_delete" on public.campaign_contributions;
create policy "campaign_contributions_delete" on public.campaign_contributions
  for delete using (public.is_campaign_admin_or_admin());
