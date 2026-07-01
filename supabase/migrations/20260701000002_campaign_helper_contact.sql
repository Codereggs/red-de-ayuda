-- ─────────────────────────────────────────────────────────────────────────────
-- campaigns: link + párrafo para que visitantes pidan unirse como helpers.
-- Ambos opcionales. El párrafo solo tiene sentido si hay link.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.campaigns
  add column if not exists helper_contact_url  text,
  add column if not exists helper_contact_note text;
