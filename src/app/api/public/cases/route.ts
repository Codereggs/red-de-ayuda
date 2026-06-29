import { randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createCasesRepository } from '@/features/cases/repositories/cases.repository'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'

export const dynamic = 'force-dynamic'

const filtersSchema = z.object({
  cursor: z.string().max(100).optional(),
  search: z.string().trim().max(200).optional(),
  state: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  situationId: z.string().uuid().optional(),
  needCategoryId: z.string().uuid().optional(),
  randomSeed: z.string().min(1).max(100).optional(),
})

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const parsed = filtersSchema.safeParse({
    cursor: params.get('cursor') || undefined,
    search: params.get('search') || undefined,
    state: params.get('state') || undefined,
    city: params.get('city') || undefined,
    situationId: params.get('situation') || undefined,
    needCategoryId: params.get('need') || undefined,
    randomSeed: params.get('seed') || undefined,
  })

  if (!parsed.success) {
    return Response.json({ error: 'Filtros inválidos.' }, { status: 400 })
  }

  try {
    const randomSeed = parsed.data.randomSeed ?? randomUUID()
    const client = await createServerSupabaseClient()
    const result = await createCasesRepository(client).listPublic({
      ...parsed.data,
      randomSeed,
    })
    return Response.json({ ...result, randomSeed })
  } catch (error) {
    console.error('[GET /api/public/cases]', error)
    return Response.json({ error: 'No se pudieron cargar los casos.' }, { status: 500 })
  }
}
