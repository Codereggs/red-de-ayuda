'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlus, Trash2, Loader2, X } from 'lucide-react'
import { uploadCampaignImageFromClient } from '@/shared/lib/supabase/storage.client'
import {
  addCampaignImagesAction,
  deleteCampaignImageAction,
} from '../actions/campaigns.actions'
import type { CampaignImage } from '../types/campaigns.types'

interface CampaignImagesManagerProps {
  campaignId: string
  initialImages: CampaignImage[]
  readOnly?: boolean
}

export function CampaignImagesManager({
  campaignId,
  initialImages,
  readOnly = false,
}: CampaignImagesManagerProps) {
  const [images, setImages] = useState<CampaignImage[]>(initialImages)
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<CampaignImage | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    setError(null)
    const list = Array.from(files)
    setUploading({ done: 0, total: list.length })
    const paths: string[] = []
    try {
      for (let i = 0; i < list.length; i++) {
        const path = await uploadCampaignImageFromClient(campaignId, list[i])
        paths.push(path)
        setUploading({ done: i + 1, total: list.length })
      }
      const result = await addCampaignImagesAction(campaignId, paths)
      if (!result.success) { setError(result.error); return }
      setImages((prev) => [...prev, ...result.data.images])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imágenes.')
    } finally {
      setUploading(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteCampaignImageAction(campaignId, id)
      if (!result.success) { setError(result.error); return }
      setImages((prev) => prev.filter((img) => img.id !== id))
    })
  }

  return (
    <section className="bg-card border-border rounded-2xl border p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-foreground text-base font-medium">
            Imágenes ({images.length})
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Se comprimen y se les eliminan los metadatos al subir. Visibles en la página pública.
          </p>
        </div>
        {!readOnly && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) void handleFiles(e.target.files) }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!!uploading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ImagePlus className="size-3.5" />
              )}
              {uploading ? `Subiendo ${uploading.done}/${uploading.total}…` : 'Subir imágenes'}
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive mb-4 rounded-xl p-3 text-sm">{error}</div>
      )}

      {images.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay imágenes cargadas.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            <li key={img.id} className="group relative aspect-square overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.publicUrl}
                alt="Imagen de campaña"
                loading="lazy"
                onClick={() => setPreview(img)}
                className="size-full cursor-pointer object-cover transition-transform group-hover:scale-105"
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  disabled={isPending}
                  className="absolute right-1.5 top-1.5 rounded-lg bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80 disabled:opacity-50"
                  aria-label="Eliminar imagen"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute right-4 top-4 text-white/80 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="size-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.publicUrl}
            alt="Imagen de campaña"
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}
