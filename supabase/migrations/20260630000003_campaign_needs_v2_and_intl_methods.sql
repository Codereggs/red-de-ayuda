-- ─────────────────────────────────────────────────────────────────────────────
-- campaign_member_needs v2: use need_categories (shared entity) + purchased checklist
-- ─────────────────────────────────────────────────────────────────────────────

-- Truncate test data before schema change (description cannot coexist with NOT NULL need_category_id)
truncate table public.campaign_member_needs restart identity;

alter table public.campaign_member_needs drop column if exists description;

alter table public.campaign_member_needs
  add column need_category_id uuid not null references public.need_categories(id);

alter table public.campaign_member_needs
  add column purchased_at timestamptz;

create index if not exists idx_campaign_member_needs_need_category_id
  on public.campaign_member_needs(need_category_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- campaign_assistance_methods: international bank accounts
-- country_code ISO-3166-1 alpha-2, default VE.
-- alias field for Argentina (CBU alias / CVU alias).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.campaign_assistance_methods
  add column if not exists country_code text not null default 'VE'
    check (char_length(country_code) = 2);

alter table public.campaign_assistance_methods
  add column if not exists alias text;
