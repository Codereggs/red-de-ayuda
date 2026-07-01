-- ─────────────────────────────────────────────────────────────────────────────
-- campaign_images: galería pública de imágenes por campaña.
-- Se guardan en el bucket público 'campaign-covers'. Visibles para el público
-- cuando la campaña es pública; escritura solo admin / campaign_admin.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.campaign_images (
  id                  uuid        primary key default gen_random_uuid(),
  campaign_id         uuid        not null references public.campaigns(id) on delete cascade,
  storage_path        text        not null,
  sort_order          integer     not null default 0,
  created_by_user_id  uuid        references public.profiles(id),
  created_at          timestamptz not null default now()
);

create index if not exists idx_campaign_images_campaign_id
  on public.campaign_images(campaign_id, sort_order);

alter table public.campaign_images enable row level security;

-- Público: puede ver imágenes de campañas públicas.
drop policy if exists "campaign_images_public_select" on public.campaign_images;
create policy "campaign_images_public_select" on public.campaign_images
  for select using (public.is_public_campaign(campaign_id));

-- Interno: helpers/admin ven todas.
drop policy if exists "campaign_images_internal_select" on public.campaign_images;
create policy "campaign_images_internal_select" on public.campaign_images
  for select using (public.is_helper_or_admin());

-- Escritura: solo admin / campaign_admin.
drop policy if exists "campaign_images_write_insert" on public.campaign_images;
create policy "campaign_images_write_insert" on public.campaign_images
  for insert with check (public.is_campaign_admin_or_admin());

drop policy if exists "campaign_images_write_update" on public.campaign_images;
create policy "campaign_images_write_update" on public.campaign_images
  for update using (public.is_campaign_admin_or_admin())
  with check (public.is_campaign_admin_or_admin());

drop policy if exists "campaign_images_write_delete" on public.campaign_images;
create policy "campaign_images_write_delete" on public.campaign_images
  for delete using (public.is_campaign_admin_or_admin());

-- Endurecer subida al bucket de covers: solo admin / campaign_admin (antes helper).
drop policy if exists "covers_upload" on storage.objects;
create policy "covers_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'campaign-covers'
    and public.is_campaign_admin_or_admin()
  );

-- Permitir borrar objetos del bucket de covers a admin / campaign_admin.
drop policy if exists "covers_delete" on storage.objects;
create policy "covers_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'campaign-covers'
    and public.is_campaign_admin_or_admin()
  );
