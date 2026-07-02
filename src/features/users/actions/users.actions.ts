'use server'

import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requireAuth } from '@/shared/lib/auth/guards'
import {
  createServiceSupabaseClient,
  createServerSupabaseClient,
} from '@/shared/lib/supabase/server'
import {
  createHelperFormSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../schemas/auth.schema'
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

const toggleStatusSchema = z.object({
  userId: z.string().uuid(),
  active: z.boolean(),
})

/** Admin-only: enable/disable a user account. An admin cannot disable itself. */
export async function toggleUserStatusAction(rawData: unknown): Promise<ActionResult<Profile>> {
  const { profile: current } = await requireAdmin()

  const parsed = toggleStatusSchema.safeParse(rawData)
  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos.' }
  }

  if (parsed.data.userId === current.id) {
    return { success: false, error: 'No puedes cambiar el estado de tu propia cuenta.' }
  }

  try {
    const client = createServiceSupabaseClient()
    const updated = await createUsersRepository(client).update({
      userId: parsed.data.userId,
      status: parsed.data.active ? 'active' : 'inactive',
    })
    revalidatePath('/dashboard/users')
    return { success: true, data: updated }
  } catch (error) {
    console.error('[toggleUserStatusAction]', error)
    return { success: false, error: 'No se pudo actualizar el estado del usuario.' }
  }
}

/** Any authenticated user: update their own profile data (name only). */
export async function updateOwnProfileAction(rawData: unknown): Promise<ActionResult<Profile>> {
  const { profile } = await requireAuth()

  const parsed = updateProfileSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    // Service role, but scoped strictly to the caller's own id and only the
    // full_name column — role/status can never be changed here.
    const client = createServiceSupabaseClient()
    const updated = await createUsersRepository(client).update({
      userId: profile.id,
      fullName: parsed.data.fullName,
    })
    revalidatePath('/dashboard/profile')
    return { success: true, data: updated }
  } catch (error) {
    console.error('[updateOwnProfileAction]', error)
    return { success: false, error: 'No se pudieron guardar los cambios. Intenta de nuevo.' }
  }
}

/** Any authenticated user: change their own password (requires current password). */
export async function changePasswordAction(rawData: unknown): Promise<ActionResult<void>> {
  const { user } = await requireAuth()

  const parsed = changePasswordSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  if (!user.email) {
    return { success: false, error: 'La cuenta no tiene un email asociado.' }
  }

  // Verify the current password with a throwaway client (no session cookies),
  // so a hijacked session can't silently change the password.
  const verifier = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  })
  if (verifyError) {
    return {
      success: false,
      error: 'La contraseña actual es incorrecta.',
      fieldErrors: { currentPassword: ['La contraseña actual es incorrecta.'] },
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const { error } = await client.auth.updateUser({ password: parsed.data.newPassword })
    if (error) throw new Error(error.message)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[changePasswordAction]', error)
    return { success: false, error: 'No se pudo cambiar la contraseña. Intenta de nuevo.' }
  }
}
