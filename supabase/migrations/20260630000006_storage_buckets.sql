-- Create storage buckets for campaign files.
-- campaign-receipts: private (signed URLs only), 10 MB limit
-- campaign-covers:   public read, 5 MB limit

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'campaign-receipts',
    'campaign-receipts',
    false,
    10485760,
    array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
  ),
  (
    'campaign-covers',
    'campaign-covers',
    true,
    5242880,
    array['image/jpeg','image/png','image/webp']
  )
on conflict (id) do nothing;

-- RLS on storage.objects
-- campaign-receipts: any internal role can upload; reading is via signed URL (service role)
drop policy if exists "receipts_upload" on storage.objects;
create policy "receipts_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'campaign-receipts'
    and public.is_helper_or_admin()
  );

-- Allow internal users to read their own receipt objects (needed for direct access; signed URLs bypass this)
drop policy if exists "receipts_read" on storage.objects;
create policy "receipts_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'campaign-receipts'
    and public.is_helper_or_admin()
  );

-- campaign-covers: internal roles upload; public reads (bucket is public so objects are accessible)
drop policy if exists "covers_upload" on storage.objects;
create policy "covers_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'campaign-covers'
    and public.is_helper_or_admin()
  );

drop policy if exists "covers_public_read" on storage.objects;
create policy "covers_public_read" on storage.objects
  for select
  using (bucket_id = 'campaign-covers');
