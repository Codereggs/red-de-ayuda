-- Red de Ayuda — Seed Data
-- Run order: 3 of 3 (after schema.sql and policies.sql)
-- For local dev and MVP validation only.
--
-- Prerequisites:
--   1. Create a Supabase Auth user manually in the dashboard.
--   2. Insert a matching row in public.profiles with role = 'admin'.
--   3. Then run this script — it finds the first active admin automatically.
--
-- WARNING: The seed case (Mayreth Izturriaga) uses placeholder bank data.
--          Replace id_number, bank_name, account_number, account_type
--          with verified real data before going to production.

do $$
declare
  admin_id              uuid;

  -- Need categories
  need_olmesartan_40    uuid;
  need_olmesartan_20    uuid;
  need_amlodipina       uuid;
  need_levotiroxina     uuid;

  -- Help types
  help_type_medicine    uuid;
  help_type_transfer    uuid;
  help_type_food        uuid;
  help_type_transport   uuid;
  help_type_clothes     uuid;

  -- Seed case
  mayreth_case_id       uuid;

begin

  -- ── Find first active admin ──────────────────────────────────────────────
  select id into admin_id
  from public.profiles
  where role = 'admin' and status = 'active'
  limit 1;

  if admin_id is null then
    raise exception 'No active admin profile found. Create one in Supabase Auth + profiles table first.';
  end if;

  -- ── Need categories ───────────────────────────────────────────────────────
  insert into public.need_categories (name, normalized_name, created_by_user_id)
  values ('Olmesartan 40mg', 'olmesartan 40mg', admin_id)
  on conflict (normalized_name) do update set name = excluded.name
  returning id into need_olmesartan_40;

  insert into public.need_categories (name, normalized_name, created_by_user_id)
  values ('Olmesartan 20mg', 'olmesartan 20mg', admin_id)
  on conflict (normalized_name) do update set name = excluded.name
  returning id into need_olmesartan_20;

  insert into public.need_categories (name, normalized_name, created_by_user_id)
  values ('Amlodipina 5mg', 'amlodipina 5mg', admin_id)
  on conflict (normalized_name) do update set name = excluded.name
  returning id into need_amlodipina;

  insert into public.need_categories (name, normalized_name, created_by_user_id)
  values ('Levotiroxina 200mg', 'levotiroxina 200mg', admin_id)
  on conflict (normalized_name) do update set name = excluded.name
  returning id into need_levotiroxina;

  insert into public.need_categories (name, normalized_name, created_by_user_id)
  values ('Comida', 'comida', admin_id)
  on conflict (normalized_name) do nothing;

  insert into public.need_categories (name, normalized_name, created_by_user_id)
  values ('Pañales', 'panales', admin_id)
  on conflict (normalized_name) do nothing;

  -- ── Help types ────────────────────────────────────────────────────────────
  insert into public.help_types (name, normalized_name, created_by_user_id)
  values ('Medicamento', 'medicamento', admin_id)
  on conflict (normalized_name) do update set name = excluded.name
  returning id into help_type_medicine;

  insert into public.help_types (name, normalized_name, created_by_user_id)
  values ('Transferencia', 'transferencia', admin_id)
  on conflict (normalized_name) do update set name = excluded.name
  returning id into help_type_transfer;

  insert into public.help_types (name, normalized_name, created_by_user_id)
  values ('Comida', 'comida ayuda', admin_id)
  on conflict (normalized_name) do update set name = excluded.name
  returning id into help_type_food;

  insert into public.help_types (name, normalized_name, created_by_user_id)
  values ('Transporte', 'transporte', admin_id)
  on conflict (normalized_name) do update set name = excluded.name
  returning id into help_type_transport;

  insert into public.help_types (name, normalized_name, created_by_user_id)
  values ('Ropa', 'ropa', admin_id)
  on conflict (normalized_name) do update set name = excluded.name
  returning id into help_type_clothes;

  -- ── Seed case: Mayreth Izturriaga ─────────────────────────────────────────
  insert into public.cases (
    case_type,
    full_name,
    short_description,
    public_notes,
    public_contact_place,
    country,
    state,
    city,
    status,
    verified,
    created_by_user_id
  ) values (
    'person',
    'Mayreth Izturriaga',
    'Damnificada',
    'Caso registrado para recibir ayuda por situación de damnificada.',
    'Liceo Carlos Fiol, en Marapa Marina',
    'Venezuela',
    'La Guaira',
    'Marapa Marina',
    'active',
    true,
    admin_id
  ) returning id into mayreth_case_id;

  -- Private data — placeholder id_number, complete before production use
  insert into public.case_private_data (
    case_id,
    id_number,
    previous_full_address,
    current_full_address,
    verification_notes,
    private_notes
  ) values (
    mayreth_case_id,
    'V-00000000',
    'Estado La Guaira, localidad Marapa Marina, calle/casa pendiente por confirmar',
    'Liceo Carlos Fiol, Marapa Marina',
    'Caso cargado inicialmente para prueba del MVP. Datos sensibles incompletos deben ser confirmados por helpers.',
    'Seed inicial. Completar cédula y direcciones reales antes de usar en producción.'
  );

  -- Phones
  insert into public.case_phones (case_id, phone, label, is_primary)
  values
    (mayreth_case_id, '04242938593', 'Teléfono principal',   true),
    (mayreth_case_id, '04166314314', 'Teléfono alternativo', false);

  -- Needs
  insert into public.case_needs (case_id, need_category_id, quantity, unit, created_by_user_id)
  values
    (mayreth_case_id, need_olmesartan_40, 1, 'caja', admin_id),
    (mayreth_case_id, need_olmesartan_20, 1, 'caja', admin_id),
    (mayreth_case_id, need_amlodipina,    1, 'caja', admin_id),
    (mayreth_case_id, need_levotiroxina,  1, 'caja', admin_id);

  -- Assistance method — placeholder bank data, complete before production use
  insert into public.assistance_methods (
    case_id,
    type,
    label,
    is_primary,
    is_active,
    holder_full_name,
    id_number,
    phone,
    bank_name,
    account_number,
    account_type,
    previous_full_address,
    current_full_address,
    notes
  ) values (
    mayreth_case_id,
    'bank_transfer',
    'Datos para transferencia',
    true,
    true,
    'Mayreth Izturriaga',
    'V-00000000',
    '04242938593',
    'PENDIENTE',
    'PENDIENTE',
    'PENDIENTE',
    'Estado La Guaira, localidad Marapa Marina, calle/casa pendiente por confirmar',
    'Liceo Carlos Fiol, Marapa Marina',
    'Completar datos bancarios reales antes de usar en producción.'
  );

end $$;
