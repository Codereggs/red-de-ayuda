'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/shared/lib/auth/guards'
import { createServiceSupabaseClient } from '@/shared/lib/supabase/server'
import { createHelperFormSchema } from '../schemas/auth.schema'
import { createUsersRepository } from '../repositories/users.repository'
import type { ActionResult } from '@/shared/types/action-result'
import type { Profile } from '@/shared/types/database.types'

export async function createHelperAction(rawData: unknown): Promise<ActionResult<Profile>> {
  await requireAdmin()

  const parsed = createHelperFormSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const client = createServiceSupabaseClient()
    const profile = await createUsersRepository(client).create(parsed.data)
    revalidatePath('/dashboard/users')
    return { success: true, data: profile }
  } catch (error) {
    console.error('[createHelperAction]', error)
    const message = error instanceof Error ? error.message : ''
    if (message.includes('already been registered') || message.includes('duplicate')) {
      return { success: false, error: 'Ya existe un usuario registrado con ese email.' }
    }
    return { success: false, error: 'No se pudo registrar al helper. Intenta de nuevo.' }
  }
}
