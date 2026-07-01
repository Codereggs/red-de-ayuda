import type { HTMLAttributes } from 'react'

/** Pulsing placeholder block. Compose these to build route skeletons. */
export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} {...props} />
}

/** Standard page header skeleton (back link + title + subtitle). */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-4 w-28 rounded-full" />
      <Skeleton className="mt-3 h-9 w-56 max-w-full rounded-xl" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full rounded-full" />
    </div>
  )
}

/** Card list skeleton (used inside sections). */
export function ListRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  )
}
