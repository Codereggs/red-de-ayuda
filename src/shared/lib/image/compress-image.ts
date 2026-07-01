interface CompressOptions {
  /** Max width/height in px; image is scaled down to fit. */
  maxDimension?: number
  /** JPEG quality 0–1. */
  quality?: number
  /** Skip compression if the file is already smaller than this (bytes). */
  skipUnderBytes?: number
  /**
   * Always re-encode via canvas even if the result isn't smaller.
   * Guarantees EXIF/GPS metadata is stripped (canvas output has no metadata).
   */
  forceReencode?: boolean
}

/**
 * Compress an image client-side using a canvas (no dependencies).
 * - Scales down to `maxDimension` (keeps aspect ratio).
 * - Re-encodes as JPEG at `quality`.
 * - Returns the original file untouched for non-images, unsupported formats
 *   (e.g. HEIC the browser can't decode), or if compression doesn't help.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const { maxDimension = 1600, quality = 0.7, skipUnderBytes = 200 * 1024, forceReencode = false } = opts

  if (!file.type.startsWith('image/')) return file
  // GIFs would lose animation; skip (unless forcing a metadata-stripping re-encode).
  if (file.type === 'image/gif' && !forceReencode) return file
  if (!forceReencode && file.size <= skipUnderBytes) return file

  try {
    const bitmap = await loadBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    if ('close' in bitmap) bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (!blob) return file
    // Sin forzar: solo usar el resultado si realmente ahorra espacio.
    if (!forceReencode && blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    // Any decode/encode failure → fall back to the original file.
    return file
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }
  // Fallback for browsers without createImageBitmap.
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image decode failed'))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}
