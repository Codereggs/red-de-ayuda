'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { loginFormSchema } from '../schemas/auth.schema'
import type { ActionResult } from '@/shared/types/action-result'
import type { Profile } from '@/shared/types/database.types'

export async function loginAction(rawData: unknown): Promise<ActionResult<void>> {
  const parsed = loginFormSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { email, password } = parsed.data
  const client = await createServerSupabaseClient()

  const { data, error } = await client.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return { success: false, error: 'Credenciales incorrectas. Verifica tu email y contraseña.' }
  }

  const { data: profile } = (await client
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()) as { data: Profile | null; error: unknown }

  if (!profile) {
    await client.auth.signOut()
    return {
      success: false,
      error: 'No se encontró un perfil asociado a esta cuenta. Contacta a un administrador.',
    }
  }

  if (profile.status !== 'active') {
    await client.auth.signOut()
    return {
      success: false,
      error: 'Tu cuenta está desactivada. Contacta a un administrador.',
    }
  }

  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  const client = await createServerSupabaseClient()
  await client.auth.signOut()
  redirect('/login')
}
