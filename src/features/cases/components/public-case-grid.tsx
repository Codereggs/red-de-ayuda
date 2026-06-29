'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, Loader2, RotateCcw } from 'lucide-react'
import { usePublicCases } from '../queries/cases.queries'
import { useNeedCategories } from '@/features/needs/queries/needs.queries'
import { PublicCaseCard } from './public-case-card'
import { HelpModal } from './help-modal'
import type { PublicCaseFilters, PublicCase } from '../types/cases.types'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  return debounced
}

export function PublicCaseGrid({ isHelper }: { isHelper: boolean }) {
  const [search, setSearch] = useState('')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [needCategoryId, setNeedCategoryId] = useState('')
  const [randomSeed] = useState(() => Math.random().toString(36).slice(2))
  const debouncedSearch = useDebounce(search, 350)
  const needCategoriesQuery = useNeedCategories()

  const filters: PublicCaseFilters = {
    search: debouncedSearch || undefined,
    state: state || undefined,
    city: city || undefined,
    needCategoryId: needCategoryId || undefined,
    randomSeed,
  }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    usePublicCases(filters)

  const allCases: PublicCase[] = data?.pages.flatMap((p) => p.data) ?? []

  const [helpTarget, setHelpTarget] = useState<PublicCase | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const openHelp = useCallback((c: PublicCase) => {
    setHelpTarget(c)
  }, [])

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element || !hasNextPage) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage()
      },
      { rootMargin: '240px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="bg-card border-border grid grid-cols-1 gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Buscar por nombre o ubicación…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-input bg-input-background focus-visible:ring-primary/50 w-full rounded-xl border py-2.5 pr-4 pl-9 text-sm focus:outline-none focus-visible:ring-2"
          />
        </div>
        <input
          type="text"
          placeholder="Estado"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="border-input bg-input-background focus-visible:ring-primary/50 w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2"
        />
        <input
          type="text"
          placeholder="Ciudad"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="border-input bg-input-background focus-visible:ring-primary/50 w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2"
        />
        <select
          value={needCategoryId}
          onChange={(event) => setNeedCategoryId(event.target.value)}
          className="border-input bg-input-background focus-visible:ring-primary/50 w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2"
          aria-label="Filtrar por necesidad"
        >
          <option value="">Todas las necesidades</option>
          {(needCategoriesQuery.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setSearch('')
            setState('')
            setCity('')
            setNeedCategoryId('')
          }}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors"
        >
          <RotateCcw className="size-4" />
          Limpiar
        </button>
      </div>

      {/* Grid */}
      {isLoading && (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-20">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Cargando casos…</span>
        </div>
      )}

      {isError && (
        <p className="text-destructive py-12 text-center text-sm">
          Error al cargar los casos. Recarga la página.
        </p>
      )}

      {!isLoading && !isError && allCases.length === 0 && (
        <p className="text-muted-foreground py-16 text-center text-sm">
          No se encontraron casos con esos filtros.
        </p>
      )}

      {allCases.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allCases.map((c) => (
            <PublicCaseCard
              key={c.id}
              case={c}
              search={debouncedSearch}
              onHelp={() => openHelp(c)}
            />
          ))}
        </div>
      )}

      <div ref={loadMoreRef} className="flex h-10 items-center justify-center" aria-hidden="true">
        {isFetchingNextPage && <Loader2 className="text-primary size-5 animate-spin" />}
      </div>

      {helpTarget && (
        <HelpModal
          caseData={helpTarget}
          isHelper={isHelper}
          onClose={() => setHelpTarget(null)}
        />
      )}
    </div>
  )
}
