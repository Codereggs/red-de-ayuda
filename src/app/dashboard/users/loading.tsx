import { Skeleton, ListRowsSkeleton } from '@/shared/components/skeleton'

export default function UsersLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Skeleton className="h-9 w-48 rounded-xl" />
      <Skeleton className="mt-2 h-4 w-64 max-w-full rounded-full" />
      <div className="mt-8">
        <ListRowsSkeleton rows={6} />
      </div>
    </div>
  )
}
