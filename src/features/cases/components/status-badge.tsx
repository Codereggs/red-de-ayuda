interface StatusBadgeProps {
  status: 'active' | 'archived'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'active') {
    return (
      <span className="bg-secondary/70 text-secondary-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
        Activo
      </span>
    )
  }
  return (
    <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
      Archivado
    </span>
  )
}

interface CaseTypeBadgeProps {
  type: 'person' | 'family'
}

export function CaseTypeBadge({ type }: CaseTypeBadgeProps) {
  return (
    <span className="border-border text-muted-foreground inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
      {type === 'person' ? 'Persona' : 'Familia'}
    </span>
  )
}
