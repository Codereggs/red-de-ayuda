-- Security hardening
-- 1. Remove public SELECT on case_phones. Phone numbers are PII and part of the
--    reveal scope: they must be served ONLY through the server-side reveal
--    endpoint (service role), which rate-limits and logs every access. A direct
--    public policy let anyone scrape every phone via the anon key, unlogged.
-- 2. Remove public INSERT on the access-log tables. Those inserts are performed
--    by the reveal/copy endpoints using the service role (which bypasses RLS),
--    so an anon-facing INSERT policy only enabled log flooding/poisoning.

-- ── case_phones: drop public read ───────────────────────────────────────────
drop policy if exists "case_phones_public_select_for_public_cases" on public.case_phones;
-- Internal (helper/admin) access remains via "case_phones_internal_all".

-- ── assistance_method_access_logs: drop public insert ───────────────────────
drop policy if exists "assistance_method_access_logs_insert_public"
  on public.assistance_method_access_logs;
-- Inserts continue to work: the reveal/copy endpoints use the service-role
-- client, which bypasses RLS. Admin SELECT policy is unchanged.

-- ── campaign_assistance_method_access_logs: drop public insert ──────────────
drop policy if exists "campaign_am_logs_insert_public"
  on public.campaign_assistance_method_access_logs;
