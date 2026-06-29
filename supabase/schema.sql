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

create table if not exists public.situation_categories (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  normalized_name     text        not null,
  created_by_user_id  uuid        references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  unique (normalized_name)
);

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
  situation_category_id uuid        not null references public.situation_categories(id),
  public_notes          text,
  public_contact_place  text        not null,
  country               text        not null default 'Venezuela',
  state                 text        not null,
  city                  text        not null,
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
  id_number               text        not null,
  birth_date              date,
  previous_full_address   text        not null,
  current_full_address    text        not null,
  verification_notes      text        not null,
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
    'situation_categories',
    'need_categories',
    'help_types',
    'cases',
    'case_private_data',
    'case_phones',
    'assistance_methods',
    'case_needs',
    'help_records',
    'webhook_events'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;
