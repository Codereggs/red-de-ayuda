import { Skeleton } from '@/shared/components/skeleton'

export default function CampaignsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="mt-2 h-4 w-32 rounded-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="bg-card border-border flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center"
          >
            <div className="flex-1">
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="mt-2 h-5 w-56 max-w-full" />
              <Skeleton className="mt-2 h-3 w-28 rounded-full" />
            </div>
            <Skeleton className="h-10 shrink-0 rounded-lg sm:w-56" />
          </div>
        ))}
      </div>
    </div>
  )
}
