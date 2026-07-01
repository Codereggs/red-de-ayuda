alter table public.campaign_member_needs
  add column if not exists price_usd numeric not null default 0 check (price_usd >= 0);
