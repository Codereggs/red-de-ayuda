import { requireAuth } from '@/shared/lib/auth/guards'
import { ProfileSettings } from '@/features/users/components/profile-settings'

export default async function ProfilePage() {
  const { profile } = await requireAuth()

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-foreground text-3xl font-medium">Mi cuenta</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Actualiza tus datos personales y tu contraseña.
      </p>

      <div className="mt-8">
        <ProfileSettings fullName={profile.full_name} email={profile.email} />
      </div>
    </div>
  )
}
