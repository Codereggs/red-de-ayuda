'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

interface UseSearchPagerOptions<T> {
  items: T[]
  filterFn: (item: T, query: string) => boolean
  pageSize?: number
  /** Show the search box only once the list is at least this long. */
  searchThreshold?: number
}

export function useSearchPager<T>({
  items,
  filterFn,
  pageSize = 8,
  searchThreshold = 6,
}: UseSearchPagerOptions<T>) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => filterFn(item, q))
  }, [items, query, filterFn])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const pageItems = filtered.slice(start, start + pageSize)

  function updateQuery(value: string) {
    setQuery(value)
    setPage(1)
  }

  return {
    query,
    setQuery: updateQuery,
    page: currentPage,
    setPage,
    filtered,
    pageItems,
    totalPages,
    start,
    pageSize,
    showSearch: items.length >= searchThreshold,
    showPager: filtered.length > pageSize,
  }
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'Buscar…',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="border-input bg-background focus-within:ring-primary/50 flex items-center gap-2 rounded-lg border px-3 py-2 focus-within:ring-2">
      <Search className="text-muted-foreground size-3.5 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm focus:outline-none"
      />
    </div>
  )
}

export function Pager({
  page,
  totalPages,
  start,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  totalPages: number
  start: number
  pageSize: number
  total: number
  onPageChange: (updater: (p: number) => number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <span className="text-muted-foreground text-xs">
        {start + 1}–{Math.min(start + pageSize, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="border-border text-muted-foreground hover:bg-muted flex size-7 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-foreground min-w-[3rem] text-center text-xs font-medium">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="border-border text-muted-foreground hover:bg-muted flex size-7 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Página siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

/** Convenience wrapper for simple `<ul>` lists. */
export function ListSearchPager<T>({
  items,
  renderItem,
  getKey,
  filterFn,
  emptyMessage,
  pageSize = 8,
  searchThreshold = 6,
  searchPlaceholder = 'Buscar…',
  listClassName = 'flex flex-col gap-2',
}: {
  items: T[]
  renderItem: (item: T) => ReactNode
  getKey: (item: T) => string
  filterFn: (item: T, query: string) => boolean
  emptyMessage: string
  pageSize?: number
  searchThreshold?: number
  searchPlaceholder?: string
  listClassName?: string
}) {
  const pager = useSearchPager({ items, filterFn, pageSize, searchThreshold })

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {pager.showSearch && (
        <SearchBox value={pager.query} onChange={pager.setQuery} placeholder={searchPlaceholder} />
      )}

      {pager.filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sin resultados para “{pager.query.trim()}”.</p>
      ) : (
        <ul className={listClassName}>
          {pager.pageItems.map((item) => (
            <li key={getKey(item)}>{renderItem(item)}</li>
          ))}
        </ul>
      )}

      {pager.showPager && (
        <Pager
          page={pager.page}
          totalPages={pager.totalPages}
          start={pager.start}
          pageSize={pager.pageSize}
          total={pager.filtered.length}
          onPageChange={pager.setPage}
        />
      )}
    </div>
  )
}
