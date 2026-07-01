import { Skeleton } from '@/shared/components/skeleton'

export default function CampaignDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Skeleton className="mb-6 h-4 w-32 rounded-full" />

      {/* Header card */}
      <div className="bg-card border-border mb-6 rounded-2xl border p-6">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="mt-2 h-8 w-72 max-w-full rounded-xl" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-5 h-3 w-full rounded-full" />
        <Skeleton className="mt-4 h-4 w-96 max-w-full rounded-full" />
      </div>

      {/* Contributions */}
      <div className="bg-card border-border rounded-2xl border p-6">
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Members + methods */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="bg-card border-border rounded-2xl border p-6">
            <Skeleton className="h-6 w-40" />
            <div className="mt-4 flex flex-col gap-3">
              {Array.from({ length: 3 }, (_, r) => (
                <Skeleton key={r} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
