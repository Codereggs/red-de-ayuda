export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-8">
        <div className="bg-muted h-4 w-28 rounded-full" />
        <div className="bg-muted mt-3 h-9 w-48 rounded-xl" />
        <div className="bg-muted mt-3 h-4 w-80 max-w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="bg-card border-border h-36 rounded-2xl border p-5">
            <div className="bg-muted size-9 rounded-xl" />
            <div className="bg-muted mt-4 h-7 w-20 rounded-lg" />
            <div className="bg-muted mt-2 h-4 w-28 rounded-full" />
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="bg-card border-border h-80 rounded-2xl border p-5">
            <div className="bg-muted h-6 w-40 rounded-lg" />
            <div className="mt-6 flex flex-col gap-4">
              {Array.from({ length: 4 }, (_, row) => (
                <div key={row} className="bg-muted h-12 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
