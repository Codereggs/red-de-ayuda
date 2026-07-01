-- ─────────────────────────────────────────────────────────────────────────────
-- campaign_assistance_methods: extra fields required for international transfers
-- to Venezuela (e.g. Brubank AR → VE). Recipient address, document type and
-- transfer purpose are mandatory at the form level for VE bank transfers.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.campaign_assistance_methods
  add column if not exists document_type   text,
  add column if not exists address_country text,
  add column if not exists address_state   text,
  add column if not exists address_city    text,
  add column if not exists address_line    text,
  add column if not exists purpose         text;
