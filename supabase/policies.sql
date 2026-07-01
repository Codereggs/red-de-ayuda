-- Red de Ayuda — RLS Policies
-- Run order: 2 of 3 (after schema.sql)
-- Execute in Supabase SQL editor or via Supabase CLI.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS on all tables
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles                       enable row level security;
alter table public.need_categories                enable row level security;
alter table public.help_types                     enable row level security;
alter table public.cases                          enable row level security;
alter table public.case_private_data              enable row level security;
alter table public.case_phones                    enable row level security;
alter table public.assistance_methods             enable row level security;
alter table public.case_needs                     enable row level security;
alter table public.help_records                   enable row level security;
alter table public.help_record_needs              enable row level security;
alter table public.assistance_method_access_logs  enable row level security;
alter table public.audit_logs                     enable row level security;
alter table public.webhook_events                 enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper functions
-- security definer so they run with the function owner's privileges,
-- not the calling user's — prevents privilege escalation via RLS bypass.
-- ─────────────────────────────────────────────────────────────────────────────

-- Returns the active role of the current user, or null if inactive/anonymous.
create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and status = 'active';
$$;

-- Returns true if the current user is an active admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
      and role = 'admin'
  );
$$;

-- Returns true if the current user is an active helper or admin.
create or replace function public.is_helper_or_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
      and role in ('admin', 'helper')
  );
$$;

-- Returns true if a case passes the public visibility rule.
create or replace function public.is_public_case(case_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cases
    where id = case_uuid
      and status = 'active'
      and verified = true
      and archived_at is null
      and deleted_at is null
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- Users can read their own profile. Admins can read and write all profiles.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Dynamic catalogs (need_categories, help_types)
-- Public can read active (non-deleted) entries.
-- Helpers/admins can write.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "need_categories_public_select" on public.need_categories;
create policy "need_categories_public_select" on public.need_categories
  for select using (deleted_at is null);

drop policy if exists "need_categories_internal_write" on public.need_categories;
create policy "need_categories_internal_write" on public.need_categories
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

drop policy if exists "help_types_public_select" on public.help_types;
create policy "help_types_public_select" on public.help_types
  for select using (deleted_at is null);

drop policy if exists "help_types_internal_write" on public.help_types;
create policy "help_types_internal_write" on public.help_types
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- cases
-- Public can read cases that pass the visibility rule.
-- Helpers/admins can read and write all cases (including archived).
-- Two policies on the same table coexist — Postgres applies the permissive union.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "cases_public_select_active" on public.cases;
create policy "cases_public_select_active" on public.cases
  for select using (
    status = 'active'
    and verified = true
    and archived_at is null
    and deleted_at is null
  );

drop policy if exists "cases_internal_all" on public.cases;
create policy "cases_internal_all" on public.cases
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- case_private_data
-- Only active helpers/admins can access private case data.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "case_private_data_internal_all" on public.case_private_data;
create policy "case_private_data_internal_all" on public.case_private_data
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- case_phones
-- Public can read non-deleted phones for public cases (shown in help modal Step 1).
-- Helpers/admins can manage all phones.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "case_phones_public_select_for_public_cases" on public.case_phones;
create policy "case_phones_public_select_for_public_cases" on public.case_phones
  for select using (deleted_at is null and public.is_public_case(case_id));

drop policy if exists "case_phones_internal_all" on public.case_phones;
create policy "case_phones_internal_all" on public.case_phones
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- assistance_methods
-- NO public SELECT. All public access goes through the server-side reveal
-- endpoint (service role), which rate-limits and logs every view.
-- This prevents bypassing the access log via direct anon client queries.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "assistance_methods_internal_all" on public.assistance_methods;
create policy "assistance_methods_internal_all" on public.assistance_methods
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- case_needs
-- Public can read non-deleted needs for public cases.
-- Helpers/admins can manage all needs.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "case_needs_public_select_for_public_cases" on public.case_needs;
create policy "case_needs_public_select_for_public_cases" on public.case_needs
  for select using (deleted_at is null and public.is_public_case(case_id));

drop policy if exists "case_needs_internal_all" on public.case_needs;
create policy "case_needs_internal_all" on public.case_needs
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- help_records
-- Public can read non-deleted records for public cases (created_by_user_id
-- is excluded from the public-safe columns at the application layer, not here).
-- Helpers/admins can manage all records.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "help_records_public_select_for_public_cases" on public.help_records;
create policy "help_records_public_select_for_public_cases" on public.help_records
  for select using (deleted_at is null and public.is_public_case(case_id));

drop policy if exists "help_records_internal_all" on public.help_records;
create policy "help_records_internal_all" on public.help_records
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- help_record_needs
-- Public can read the associations for public help records.
-- Subquery avoids calling is_public_case() twice — joins directly.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "help_record_needs_public_select" on public.help_record_needs;
create policy "help_record_needs_public_select" on public.help_record_needs
  for select using (
    exists (
      select 1
      from public.help_records hr
      join public.cases c on c.id = hr.case_id
      where hr.id = help_record_id
        and hr.deleted_at is null
        and c.status = 'active'
        and c.verified = true
        and c.archived_at is null
        and c.deleted_at is null
    )
  );

drop policy if exists "help_record_needs_internal_all" on public.help_record_needs;
create policy "help_record_needs_internal_all" on public.help_record_needs
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- assistance_method_access_logs
-- Anyone can INSERT (logged by the reveal endpoint and copy action).
-- Only admins can SELECT.
-- Application is responsible for validating case_id and method_id before insert.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "assistance_method_access_logs_insert_public" on public.assistance_method_access_logs;
create policy "assistance_method_access_logs_insert_public" on public.assistance_method_access_logs
  for insert with check (true);

drop policy if exists "assistance_method_access_logs_admin_select" on public.assistance_method_access_logs;
create policy "assistance_method_access_logs_admin_select" on public.assistance_method_access_logs
  for select using (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_logs
-- Immutable: helpers/admins can INSERT, only admins can SELECT.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select" on public.audit_logs
  for select using (public.is_admin());

drop policy if exists "audit_logs_internal_insert" on public.audit_logs;
create policy "audit_logs_internal_insert" on public.audit_logs
  for insert with check (public.is_helper_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- webhook_events
-- MVP: storage only. Helpers/admins can INSERT (status always 'disabled').
-- Only admins can SELECT and UPDATE.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "webhook_events_admin_select" on public.webhook_events;
create policy "webhook_events_admin_select" on public.webhook_events
  for select using (public.is_admin());

drop policy if exists "webhook_events_internal_insert" on public.webhook_events;
create policy "webhook_events_internal_insert" on public.webhook_events
  for insert with check (public.is_helper_or_admin());

drop policy if exists "webhook_events_admin_update" on public.webhook_events;
create policy "webhook_events_admin_update" on public.webhook_events
  for update using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- campaigns
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.campaigns                              enable row level security;
alter table public.campaign_cases                         enable row level security;
alter table public.campaign_member_needs                  enable row level security;
alter table public.campaign_assistance_methods            enable row level security;
alter table public.campaign_contributions                 enable row level security;
alter table public.campaign_assistance_method_access_logs enable row level security;

create or replace function public.is_public_campaign(campaign_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.campaigns
    where id = campaign_uuid and verified = true and archived_at is null and deleted_at is null
  );
$$;

drop policy if exists "campaigns_public_select" on public.campaigns;
create policy "campaigns_public_select" on public.campaigns
  for select using (verified = true and archived_at is null and deleted_at is null);

drop policy if exists "campaigns_internal_all" on public.campaigns;
create policy "campaigns_internal_all" on public.campaigns
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

drop policy if exists "campaign_cases_public_select" on public.campaign_cases;
create policy "campaign_cases_public_select" on public.campaign_cases
  for select using (
    deleted_at is null
    and public.is_public_campaign(campaign_id)
  );

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

drop policy if exists "campaign_cases_internal_all" on public.campaign_cases;
create policy "campaign_cases_internal_all" on public.campaign_cases
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

drop policy if exists "campaign_assistance_methods_internal_all" on public.campaign_assistance_methods;
create policy "campaign_assistance_methods_internal_all" on public.campaign_assistance_methods
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

drop policy if exists "campaign_contributions_internal_all" on public.campaign_contributions;
create policy "campaign_contributions_internal_all" on public.campaign_contributions
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

drop policy if exists "campaign_am_logs_insert_public" on public.campaign_assistance_method_access_logs;
create policy "campaign_am_logs_insert_public" on public.campaign_assistance_method_access_logs
  for insert with check (true);

drop policy if exists "campaign_am_logs_admin_select" on public.campaign_assistance_method_access_logs;
create policy "campaign_am_logs_admin_select" on public.campaign_assistance_method_access_logs
  for select using (public.is_admin());
