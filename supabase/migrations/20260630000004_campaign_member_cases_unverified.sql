-- Campaign member cases are slim/incomplete records — they must never appear in
-- the public cases listing. Mark all existing campaign-linked cases as unverified
-- and change the column default so future inserts require an explicit opt-in.

-- Fix existing campaign member cases that were inserted with default verified=true
update public.cases
set verified = false
where id in (
  select case_id from public.campaign_cases where deleted_at is null
);

-- Change default so new cases start unverified (admin must explicitly verify).
-- Normal case creation via the admin UI already passes verified=false or the UI
-- handles verification separately; seeds that need verified=true pass it explicitly.
alter table public.cases alter column verified set default false;
