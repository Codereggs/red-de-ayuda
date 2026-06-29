# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**Red de Ayuda** is a verified aid registry for people and family groups in Venezuela. Admins and helpers register verified cases with their needs and assistance methods. The public can browse active cases and access assistance data only after a responsible-use confirmation flow.

This repo contains a Software Design Document (SDD) harness under `red-de-ayuda-sdd/`. The actual Next.js app has not yet been scaffolded.

## SDD Reference

Before modifying or generating code, read the relevant spec files:

- `red-de-ayuda-sdd/spec/` — full product and technical specification
- `red-de-ayuda-sdd/supabase/schema.sql` — canonical DB schema
- `red-de-ayuda-sdd/supabase/policies.sql` — RLS policies
- `red-de-ayuda-sdd/Codex/DESIGN_SYSTEM.md` — authoritative UI/styling reference
- `red-de-ayuda-sdd/spec/14-implementation-checklist.md` — verify each step against this

The SDD takes precedence over assumptions. Follow it.

## Stack

- Next.js App Router + TypeScript strict mode
- Supabase (Auth, PostgreSQL, RLS)
- React Query (reads), Server Actions (writes)
- Repository Pattern (Supabase access layer)
- React Hook Form + Zod (forms and validation)
- Tailwind CSS v4+ (dark mode only — app background is warm cream, not black)
- `pnpm` as package manager

## Architecture

Feature-based FLUX-style folder structure:

```
src/
  app/
    (public)/       # public case browsing
    (auth)/login/   # Supabase Auth login
    dashboard/      # helper/admin panel
  features/
    cases/          # components, actions, queries, repositories, schemas, types
    needs/
    help-records/
    assistance-methods/
    users/
    audit-logs/
  shared/
    components/
    lib/
    hooks/
    utils/
    constants/
```

Data flow: UI → React Hook Form → Server Action → Repository → Supabase → React Query cache invalidation → UI.

All Server Actions must return:
```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
```

## Language Rules

- **UI copy**: Spanish
- **Code, DB tables, columns, variables, functions**: English
- **User-facing errors**: Spanish
- **Dev logs**: English

## Key Constraints

- No public registration — users are created manually in Supabase.
- No hard delete — use `deleted_at` / `archived_at` (soft delete).
- Public users only see `active + verified + not archived` cases.
- Assistance methods (bank transfers, pago móvil, etc.) have **no public RLS SELECT** — access exclusively via `POST /api/public/cases/[id]/reveal-assistance-methods` using `SUPABASE_SERVICE_ROLE_KEY` server-side. Every view/copy is logged in `assistance_method_access_logs`. Rate limited: 10 reveals/min, 30/hour per ip_hash.
- `case_phones` are also part of the reveal scope — they are returned by the same endpoint, not via direct public query.
- Help records are always anonymous publicly (`created_by_user_id` is never exposed).
- `case_private_data` has one row per case. Repository must always use upsert (`ON CONFLICT (case_id) DO UPDATE`) — never plain INSERT.
- `cases.last_helped_at` (date) is a denormalized column kept in sync by a DB trigger on `help_records`. Use it for the public grid ordering — do not run `MAX(helped_at)` subqueries.
- `help_records.helped_at` is type `date` (not timestamptz). Capture date only in the form.
- Webhooks are storage-only in MVP. All events are inserted with `status = 'disabled'` — no external HTTP delivery.
- `profiles.status = 'active'` is required for all authenticated access — inactive users lose access even with a valid session.
- Never store raw IP addresses — hash with `sha256(ip + IP_HASH_SECRET)`.
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to client components.

## Styling Rules (Tailwind v4+)

The design system uses warm earth tones, not a dark-mode palette — it's light-colored but dark-mode-free.

- Use `size-*` instead of `w-* h-*` when both dimensions are equal.
- Never use arbitrary color values (`bg-[#B5704A]`) — always use semantic tokens (`bg-primary`).
- No `style={{ ... }}` for layout, color, or spacing — inline Tailwind only.
- No arbitrary values `[]` when a native class exists.
- Key semantic tokens: `background` (#FAF7F2 warm cream), `primary` (#B5704A terracotta/helpers), `secondary` (#E4EBE1 sage/recipients), `muted`, `accent` (#E8C9B5 dusty rose/connection), `destructive`.
- Fonts: `--font-display` (Lora, serif — headings), `--font-body` (Nunito, sans-serif — all UI), `--font-mono` (DM Mono — IDs, dates, metadata).
- Icons from `lucide-react`, sized with `size-*`.

See `red-de-ayuda-sdd/Codex/DESIGN_SYSTEM.md` for full component patterns and token reference.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
IP_HASH_SECRET=
APP_BASE_URL=
```

## Do Not Use

- `any` unless unavoidable and documented
- Redux or Zustand
- Raw Supabase calls inside UI components
- Hard deletes on important records
- Public sign-up flows
- English UI copy or Spanish code/DB names
