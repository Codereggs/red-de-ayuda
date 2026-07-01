-- Red de Ayuda — Schema
-- Run order: 1 of 3
-- Execute in Supabase SQL editor or via Supabase CLI.

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles
-- Linked 1-to-1 to auth.users. Created manually for MVP (no public sign-up).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null,
  full_name   text        not null,
  role        text        not null check (role in ('admin', 'helper')),
  status      text        not null default 'active' check (status in ('active', 'inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Dynamic catalogs
-- Auto-expandable by helpers/admins. Deduplicated by normalized_name.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.need_categories (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  normalized_name     text        not null,
  created_by_user_id  uuid        references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  unique (normalized_name)
);

create table if not exists public.help_types (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  normalized_name     text        not null,
  created_by_user_id  uuid        references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  unique (normalized_name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Public code sequence + generator
-- ─────────────────────────────────────────────────────────────────────────────

create sequence if not exists public.case_public_code_seq start 1;

create or replace function public.generate_case_public_code()
returns text
language plpgsql
as $$
declare
  next_number bigint;
begin
  next_number := nextval('public.case_public_code_seq');
  return 'RA-' || lpad(next_number::text, 6, '0');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Cases
-- Core domain object. Public visibility requires:
--   status = 'active' AND verified = true AND archived_at IS NULL AND deleted_at IS NULL
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.cases (
  id                    uuid        primary key default gen_random_uuid(),
  public_code           text        not null unique default public.generate_case_public_code(),
  case_type             text        not null check (case_type in ('person', 'family')),
  full_name             text        not null,
  short_description     text,
  public_notes          text,
  public_contact_place  text,
  country               text        not null default 'Venezuela',
  state                 text,
  city                  text,
  status                text        not null default 'active' check (status in ('active', 'archived')),
  verified              boolean     not null default true,
  -- Denormalized from help_records. Kept in sync by the sync_last_helped_at trigger.
  -- Used for public grid ordering (no help first → oldest help first) without a subquery.
  last_helped_at        date,
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
-- Case private data
-- One row per case (unique case_id). Always upsert — never plain INSERT.
-- Visible only to active helpers/admins via RLS.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.case_private_data (
  id                      uuid        primary key default gen_random_uuid(),
  case_id                 uuid        not null references public.cases(id) on delete cascade,
  id_number               text,
  birth_date              date,
  previous_full_address   text,
  current_full_address    text,
  verification_notes      text,
  private_notes           text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz,
  unique (case_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Case phones
-- Shown publicly in the help modal Step 1 for cases that pass the visibility rule.
-- Also returned by the reveal endpoint alongside assistance methods.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.case_phones (
  id          uuid        primary key default gen_random_uuid(),
  case_id     uuid        not null references public.cases(id) on delete cascade,
  phone       text        not null,
  label       text,
  is_primary  boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Assistance methods
-- No public RLS SELECT — all public access goes through the server-side
-- reveal endpoint using the service role key (see spec/05).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.assistance_methods (
  id                    uuid        primary key default gen_random_uuid(),
  case_id               uuid        not null references public.cases(id) on delete cascade,
  type                  text        not null check (type in ('bank_transfer', 'pago_movil', 'cash_contact', 'physical_delivery')),
  label                 text        not null,
  is_primary            boolean     not null default false,
  is_active             boolean     not null default true,
  holder_full_name      text        not null,
  id_number             text        not null,
  phone                 text        not null,
  bank_name             text,
  account_number        text,
  account_type          text,
  previous_full_address text        not null,
  current_full_address  text        not null,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Case needs
-- Individual, specific needs. Not closed by help records.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.case_needs (
  id                  uuid      primary key default gen_random_uuid(),
  case_id             uuid      not null references public.cases(id) on delete cascade,
  need_category_id    uuid      not null references public.need_categories(id),
  quantity            numeric   not null check (quantity > 0),
  unit                text,
  comments            text,
  created_by_user_id  uuid      references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Help records
-- Always anonymous publicly (created_by_user_id never exposed via public RLS).
-- helped_at is date only — helpers pick the date help was given, not a timestamp.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.help_records (
  id                  uuid        primary key default gen_random_uuid(),
  case_id             uuid        not null references public.cases(id) on delete cascade,
  help_type_id        uuid        not null references public.help_types(id),
  created_by_user_id  uuid        references public.profiles(id),
  title               text        not null,
  description         text,
  amount_usd          numeric     check (amount_usd is null or amount_usd >= 0),
  helped_at           date        not null default current_date,
  private_notes       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Help record needs
-- Associates a help record with one or more case needs.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.help_record_needs (
  id              uuid        primary key default gen_random_uuid(),
  help_record_id  uuid        not null references public.help_records(id) on delete cascade,
  case_need_id    uuid        not null references public.case_needs(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (help_record_id, case_need_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Assistance method access logs
-- Every view or copy of assistance data is logged here.
-- ip_hash: sha256(raw_ip + IP_HASH_SECRET) — raw IP is never stored.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.assistance_method_access_logs (
  id                    uuid        primary key default gen_random_uuid(),
  case_id               uuid        not null references public.cases(id),
  assistance_method_id  uuid        references public.assistance_methods(id),
  action                text        not null check (action in ('viewed', 'copied')),
  ip_hash               text,
  user_agent            text,
  created_at            timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit logs
-- Immutable record of important internal actions. Admin-only via RLS.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.audit_logs (
  id              uuid        primary key default gen_random_uuid(),
  actor_user_id   uuid        references public.profiles(id),
  entity_type     text        not null,
  entity_id       uuid,
  action          text        not null,
  old_values      jsonb,
  new_values      jsonb,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Webhook events
-- Storage only in MVP. All events are inserted with status = 'disabled'.
-- External HTTP delivery is a post-MVP feature.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.webhook_events (
  id          uuid        primary key default gen_random_uuid(),
  event_type  text        not null,
  payload     jsonb       not null default '{}'::jsonb,
  status      text        not null default 'disabled' check (status in ('pending', 'sent', 'failed', 'disabled')),
  attempts    integer     not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Public grid: visibility filter
create index if not exists idx_cases_public_visibility
  on public.cases(status, verified, archived_at, deleted_at);

-- Public grid: ordering (no help first → oldest help date first)
create index if not exists idx_cases_last_helped_at
  on public.cases(last_helped_at asc nulls first);

-- Public grid: location filters
create index if not exists idx_cases_location
  on public.cases(state, city);

-- Public + private search by name (full-text)
create index if not exists idx_cases_full_name
  on public.cases using gin (to_tsvector('simple', full_name));

-- Duplicate detection
create index if not exists idx_case_private_data_id_number
  on public.case_private_data(id_number);

create index if not exists idx_case_phones_phone
  on public.case_phones(phone);

create index if not exists idx_assistance_methods_phone
  on public.assistance_methods(phone);

-- Help records
create index if not exists idx_case_needs_case_id
  on public.case_needs(case_id);

create index if not exists idx_help_records_case_id_helped_at
  on public.help_records(case_id, helped_at desc);

-- Access logs and audit
create index if not exists idx_assistance_method_access_logs_case_id
  on public.assistance_method_access_logs(case_id, created_at desc);

create index if not exists idx_audit_logs_entity
  on public.audit_logs(entity_type, entity_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: sync cases.last_helped_at
-- Fires after any INSERT, UPDATE, or DELETE on help_records.
-- Keeps the denormalized date current so the public grid ordering query is fast.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.sync_case_last_helped_at()
returns trigger
language plpgsql
as $$
declare
  target_case_id uuid;
begin
  target_case_id := case tg_op when 'DELETE' then old.case_id else new.case_id end;

  update public.cases
  set last_helped_at = (
    select max(helped_at)
    from public.help_records
    where case_id = target_case_id
      and deleted_at is null
  )
  where id = target_case_id;

  return null;
end;
$$;

drop trigger if exists sync_last_helped_at on public.help_records;
create trigger sync_last_helped_at
  after insert or update or delete on public.help_records
  for each row execute function public.sync_case_last_helped_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: set updated_at on every UPDATE
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles',
    'need_categories',
    'help_types',
    'cases',
    'case_private_data',
    'case_phones',
    'assistance_methods',
    'case_needs',
    'help_records',
    'webhook_events',
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
-- Campaigns
-- ─────────────────────────────────────────────────────────────────────────────

create sequence if not exists public.campaign_public_code_seq start 1;

create or replace function public.generate_campaign_public_code()
returns text language plpgsql as $$
declare next_number bigint;
begin
  next_number := nextval('public.campaign_public_code_seq');
  return 'CMP-' || lpad(next_number::text, 6, '0');
end; $$;

create table if not exists public.campaigns (
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

create table if not exists public.campaign_cases (
  id                  uuid        primary key default gen_random_uuid(),
  campaign_id         uuid        not null references public.campaigns(id) on delete cascade,
  case_id             uuid        not null references public.cases(id) on delete cascade,
  created_by_user_id  uuid        references public.profiles(id),
  created_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  unique (campaign_id, case_id)
);

create table if not exists public.campaign_member_needs (
  id                uuid        primary key default gen_random_uuid(),
  campaign_case_id  uuid        not null references public.campaign_cases(id) on delete cascade,
  description       text        not null check (char_length(description) >= 1 and char_length(description) <= 100),
  price_usd         numeric     not null default 0 check (price_usd >= 0),
  created_at        timestamptz not null default now()
);

create table if not exists public.campaign_assistance_methods (
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

create table if not exists public.campaign_contributions (
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

create table if not exists public.campaign_assistance_method_access_logs (
  id                              uuid        primary key default gen_random_uuid(),
  campaign_id                     uuid        not null references public.campaigns(id),
  campaign_assistance_method_id   uuid        references public.campaign_assistance_methods(id),
  action                          text        not null check (action in ('viewed', 'copied')),
  ip_hash                         text,
  user_agent                      text,
  created_at                      timestamptz not null default now()
);

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

create or replace function public.sync_campaign_raised_amount()
returns trigger language plpgsql as $$
declare target_campaign_id uuid;
begin
  target_campaign_id := case tg_op when 'DELETE' then old.campaign_id else new.campaign_id end;
  update public.campaigns
  set raised_amount_usd = (
    select coalesce(sum(amount_usd), 0)
    from public.campaign_contributions
    where campaign_id = target_campaign_id and status = 'verified' and deleted_at is null
  )
  where id = target_campaign_id;
  return null;
end; $$;

drop trigger if exists sync_raised_amount on public.campaign_contributions;
create trigger sync_raised_amount
  after insert or update or delete on public.campaign_contributions
  for each row execute function public.sync_campaign_raised_amount();
