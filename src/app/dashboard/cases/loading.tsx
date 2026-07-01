import { Skeleton } from '@/shared/components/skeleton'

export default function CasesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="mt-2 h-4 w-32 rounded-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        <div className="bg-muted/40 border-border border-b p-4">
          <Skeleton className="h-4 w-40 rounded-full" />
        </div>
        <div className="divide-border flex flex-col divide-y">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 p-4">
              <div className="flex-1">
                <Skeleton className="h-4 w-48 max-w-full rounded-full" />
                <Skeleton className="mt-2 h-3 w-24 rounded-full" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
