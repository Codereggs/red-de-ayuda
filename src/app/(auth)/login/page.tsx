import { redirect } from 'next/navigation'
import { getSession } from '@/shared/lib/auth/get-session'
import { LoginForm } from '@/features/users/components/login-form'

export default async function LoginPage() {
  const session = await getSession()
  if (session?.profile?.status === 'active') {
    redirect('/dashboard')
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-sm">
      <div className="mb-8">
        <h1
          className="text-2xl font-medium text-foreground"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Iniciar sesión
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Accede a la plataforma de gestión.
        </p>
      </div>
      <LoginForm />
    </div>
  )
}
