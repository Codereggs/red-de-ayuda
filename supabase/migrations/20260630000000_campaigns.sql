-- Red de Ayuda — Campaigns
-- Adds the campaign aggregate entity (jornada de recaudación).
-- Run after: 20260629030000_remove_situation_categories_add_short_description.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Relax NOT NULL constraints on cases (slim member support)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.cases alter column short_description drop not null;
alter table public.cases alter column public_contact_place drop not null;
alter table public.cases alter column state drop not null;
alter table public.cases alter column city drop not null;

alter table public.case_private_data alter column id_number drop not null;
alter table public.case_private_data alter column previous_full_address drop not null;
alter table public.case_private_data alter column current_full_address drop not null;
alter table public.case_private_data alter column verification_notes drop not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Campaign public code sequence + generator
-- ─────────────────────────────────────────────────────────────────────────────

create sequence if not exists public.campaign_public_code_seq start 1;

create or replace function public.generate_campaign_public_code()
returns text
language plpgsql
as $$
declare
  next_number bigint;
begin
  next_number := nextval('public.campaign_public_code_seq');
  return 'CMP-' || lpad(next_number::text, 6, '0');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. campaigns
-- Aggregate entity grouping multiple cases for a joint fundraiser.
-- Visible publicly when verified = true AND archived_at IS NULL AND deleted_at IS NULL.
-- status tracks the workflow (not visibility): collecting → purchasing → shipping → completed.
-- raised_amount_usd is denormalized via trigger on campaign_contributions.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.campaigns (
  id                    uuid        primary key default gen_random_uuid(),
  public_code           text        not null unique default public.generate_campaign_public_code(),
  title                 text        not null,
  description           text,
  goal_amount_usd       numeric     not null check (goal_amount_usd > 0),
  raised_amount_usd     numeric     not null default 0,
  status                text        not null default 'collecting'
                          check (status in ('collecting', 'purchasing', 'shipping', 'completed')),
  verified              boolean     not null default true,
  cover_image_path      text,
  created_by_user_id    uuid        references public.profiles(id),
  updated_by_user_id    uuid        references public.profiles(id),
  archived_by_user_id   uuid        references public.profiles(id),
  archive_reason        text,
  archived_at           timestamptz,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. campaign_cases — join between a campaign and its member cases
-- ─────────────────────────────────────────────────────────────────────────────

create table public.campaign_cases (
  id                    uuid        primary key default gen_random_uuid(),
  campaign_id           uuid        not null references public.campaigns(id) on delete cascade,
  case_id               uuid        not null references public.cases(id) on delete cascade,
  created_by_user_id    uuid        references public.profiles(id),
  created_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  unique (campaign_id, case_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. campaign_assistance_methods
-- Mirrors assistance_methods but scoped to a campaign (no address fields).
-- NO public SELECT — revealed only via the service-role endpoint.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.campaign_assistance_methods (
  id                uuid        primary key default gen_random_uuid(),
  campaign_id       uuid        not null references public.campaigns(id) on delete cascade,
  type              text        not null check (type in ('bank_transfer', 'pago_movil', 'cash_contact', 'physical_delivery')),
  label             text        not null,
  is_primary        boolean     not null default false,
  is_active         boolean     not null default true,
  holder_full_name  text        not null,
  id_number         text,
  phone             text,
  bank_name         text,
  account_number    text,
  account_type      text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. campaign_contributions
-- One row per transfer registered by a helper/admin.
-- Only verified contributions (and not deleted) count toward raised_amount_usd.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.campaign_contributions (
  id                    uuid        primary key default gen_random_uuid(),
  campaign_id           uuid        not null references public.campaigns(id) on delete cascade,
  amount_usd            numeric     not null check (amount_usd > 0),
  status                text        not null default 'pending'
                          check (status in ('pending', 'verified', 'rejected')),
  contributor_name      text,
  reference             text,
  receipt_image_path    text,
  transferred_at        date        not null default current_date,
  notes                 text,
  created_by_user_id    uuid        references public.profiles(id),
  verified_by_user_id   uuid        references public.profiles(id),
  verified_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. campaign_assistance_method_access_logs
-- Every reveal of campaign banking data is logged (mirrors assistance_method_access_logs).
-- ─────────────────────────────────────────────────────────────────────────────

create table public.campaign_assistance_method_access_logs (
  id                              uuid        primary key default gen_random_uuid(),
  campaign_id                     uuid        not null references public.campaigns(id),
  campaign_assistance_method_id   uuid        references public.campaign_assistance_methods(id),
  action                          text        not null check (action in ('viewed', 'copied')),
  ip_hash                         text,
  user_agent                      text,
  created_at                      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Indexes
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists idx_campaigns_public_visibility
  on public.campaigns(verified, archived_at, deleted_at);

create index if not exists idx_campaigns_status
  on public.campaigns(status);

create index if not exists idx_campaigns_created_at
  on public.campaigns(created_at desc);

create index if not exists idx_campaign_cases_campaign_id
  on public.campaign_cases(campaign_id) where deleted_at is null;

create index if not exists idx_campaign_cases_case_id
  on public.campaign_cases(case_id);

create index if not exists idx_campaign_contributions_campaign_status
  on public.campaign_contributions(campaign_id, status) where deleted_at is null;

create index if not exists idx_campaign_am_access_logs_campaign_id
  on public.campaign_assistance_method_access_logs(campaign_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Trigger: sync campaigns.raised_amount_usd
-- Fires after INSERT, UPDATE, or DELETE on campaign_contributions.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.sync_campaign_raised_amount()
returns trigger
language plpgsql
as $$
declare
  target_campaign_id uuid;
begin
  target_campaign_id := case tg_op when 'DELETE' then old.campaign_id else new.campaign_id end;

  update public.campaigns
  set raised_amount_usd = (
    select coalesce(sum(amount_usd), 0)
    from public.campaign_contributions
    where campaign_id = target_campaign_id
      and status = 'verified'
      and deleted_at is null
  )
  where id = target_campaign_id;

  return null;
end;
$$;

drop trigger if exists sync_raised_amount on public.campaign_contributions;
create trigger sync_raised_amount
  after insert or update or delete on public.campaign_contributions
  for each row execute function public.sync_campaign_raised_amount();

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Trigger: set_updated_at for new tables
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'campaigns',
    'campaign_assistance_methods',
    'campaign_contributions'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.campaigns                            enable row level security;
alter table public.campaign_cases                       enable row level security;
alter table public.campaign_assistance_methods          enable row level security;
alter table public.campaign_contributions               enable row level security;
alter table public.campaign_assistance_method_access_logs enable row level security;

-- Helper: is_public_campaign
create or replace function public.is_public_campaign(campaign_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaigns
    where id = campaign_uuid
      and verified = true
      and archived_at is null
      and deleted_at is null
  );
$$;

-- campaigns: public can read verified non-archived non-deleted campaigns
drop policy if exists "campaigns_public_select" on public.campaigns;
create policy "campaigns_public_select" on public.campaigns
  for select using (
    verified = true
    and archived_at is null
    and deleted_at is null
  );

drop policy if exists "campaigns_internal_all" on public.campaigns;
create policy "campaigns_internal_all" on public.campaigns
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

-- campaign_cases: public can read non-deleted links for public campaigns + public cases
drop policy if exists "campaign_cases_public_select" on public.campaign_cases;
create policy "campaign_cases_public_select" on public.campaign_cases
  for select using (
    deleted_at is null
    and public.is_public_campaign(campaign_id)
    and public.is_public_case(case_id)
  );

drop policy if exists "campaign_cases_internal_all" on public.campaign_cases;
create policy "campaign_cases_internal_all" on public.campaign_cases
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

-- campaign_assistance_methods: NO public SELECT
drop policy if exists "campaign_assistance_methods_internal_all" on public.campaign_assistance_methods;
create policy "campaign_assistance_methods_internal_all" on public.campaign_assistance_methods
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

-- campaign_contributions: NO public SELECT (public sees raised_amount_usd on campaigns row only)
drop policy if exists "campaign_contributions_internal_all" on public.campaign_contributions;
create policy "campaign_contributions_internal_all" on public.campaign_contributions
  for all using (public.is_helper_or_admin()) with check (public.is_helper_or_admin());

-- campaign_assistance_method_access_logs: open INSERT, admin-only SELECT
drop policy if exists "campaign_am_logs_insert_public" on public.campaign_assistance_method_access_logs;
create policy "campaign_am_logs_insert_public" on public.campaign_assistance_method_access_logs
  for insert with check (true);

drop policy if exists "campaign_am_logs_admin_select" on public.campaign_assistance_method_access_logs;
create policy "campaign_am_logs_admin_select" on public.campaign_assistance_method_access_logs
  for select using (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Storage buckets
-- Run in the Supabase dashboard SQL editor or via the Storage UI:
--
-- insert into storage.buckets (id, name, public) values ('campaign-receipts', 'campaign-receipts', false);
-- insert into storage.buckets (id, name, public) values ('campaign-covers', 'campaign-covers', true);
--
-- Then add storage policies so helpers/admins can upload:
-- create policy "helpers can upload receipts" on storage.objects for insert
--   to authenticated with check (bucket_id = 'campaign-receipts' and public.is_helper_or_admin());
-- create policy "helpers can read receipts" on storage.objects for select
--   to authenticated using (bucket_id = 'campaign-receipts' and public.is_helper_or_admin());
-- create policy "helpers can upload covers" on storage.objects for insert
--   to authenticated with check (bucket_id = 'campaign-covers' and public.is_helper_or_admin());
-- create policy "public can read covers" on storage.objects for select
--   using (bucket_id = 'campaign-covers');
-- ─────────────────────────────────────────────────────────────────────────────
