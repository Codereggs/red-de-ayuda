interface CaseDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = await params

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <p className="text-muted-foreground text-sm font-mono">
        Próximamente — detalle del caso {id}.
      </p>
    </div>
  )
}
