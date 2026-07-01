import { Skeleton, PageHeaderSkeleton } from '@/shared/components/skeleton'

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <PageHeaderSkeleton />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="bg-card border-border h-36 rounded-2xl border p-5">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="mt-4 h-7 w-20" />
            <Skeleton className="mt-2 h-4 w-28 rounded-full" />
          </div>
        ))}
      </div>

      {/* Campañas recientes */}
      <div className="bg-card border-border mt-8 rounded-2xl border p-5">
        <Skeleton className="h-6 w-48" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="bg-card border-border h-80 rounded-2xl border p-5">
            <Skeleton className="h-6 w-40" />
            <div className="mt-6 flex flex-col gap-4">
              {Array.from({ length: 4 }, (_, row) => (
                <Skeleton key={row} className="h-12 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
