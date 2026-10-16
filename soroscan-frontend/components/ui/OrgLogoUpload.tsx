"use client"

import * as React from "react"

// ── Types ──────────────────────────────────────────────────────────────────

interface OrgLogoUploadProps {
  /** Called with the final cropped data-URL when the user confirms */
  onSave: (dataUrl: string) => void
  /** Current logo URL to display as initial preview */
  currentLogoUrl?: string
  /** Max file size in bytes (default 2 MB) */
  maxSizeBytes?: number
}

const DEFAULT_MAX = 2 * 1024 * 1024 // 2 MB
const ACCEPTED = ["image/png", "image/jpeg", "image/gif", "image/webp"]

// ── Simple canvas crop helper ──────────────────────────────────────────────

interface CropRect { x: number; y: number; size: number }

function cropImage(src: string, crop: CropRect, outputSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = outputSize
      canvas.height = outputSize
      const ctx = canvas.getContext("2d")
      if (!ctx) return reject(new Error("canvas context unavailable"))
      ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, outputSize, outputSize)
      resolve(canvas.toDataURL("image/png"))
    }
    img.onerror = reject
    img.src = src
  })
}

// ── Crop UI ────────────────────────────────────────────────────────────────

function CropTool({
  src,
  naturalWidth,
  naturalHeight,
  onConfirm,
  onCancel,
}: {
  src: string
  naturalWidth: number
  naturalHeight: number
  onConfirm: (crop: CropRect) => void
  onCancel: () => void
}) {
  const minDim = Math.min(naturalWidth, naturalHeight)
  const [crop, setCrop] = React.useState<CropRect>({
    x: Math.floor((naturalWidth - minDim) / 2),
    y: Math.floor((naturalHeight - minDim) / 2),
    size: minDim,
  })

  // Display scale: show image at max 300px wide
  const displayW = Math.min(300, naturalWidth)
  const scale = displayW / naturalWidth
  const displayH = naturalHeight * scale

  const dCrop = {
    x: crop.x * scale,
    y: crop.y * scale,
    size: crop.size * scale,
  }

  const handleSizeChange = (delta: number) => {
    setCrop((c) => {
      const newSize = Math.max(32, Math.min(minDim, c.size + delta))
      return { ...c, size: newSize }
    })
  }

  return (
    <div className="space-y-3" data-testid="crop-tool">
      <div className="text-[10px] text-terminal-gray">CROP_TOOL — drag to reposition, use buttons to resize</div>

      {/* Image with crop overlay */}
      <div
        className="relative border border-terminal-green/30 inline-block"
        style={{ width: displayW, height: displayH }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Crop preview" width={displayW} height={displayH} className="block" />
        {/* Crop rectangle overlay */}
        <div
          className="absolute border-2 border-terminal-cyan pointer-events-none"
          style={{
            left: dCrop.x,
            top: dCrop.y,
            width: dCrop.size,
            height: dCrop.size,
          }}
          data-testid="crop-rect"
        />
      </div>

      {/* Size controls */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-terminal-gray">SIZE: {crop.size}px</span>
        <button
          type="button"
          onClick={() => handleSizeChange(-16)}
          className="px-2 py-0.5 border border-terminal-green/30 text-terminal-green hover:border-terminal-green transition-colors"
          aria-label="Decrease crop size"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => handleSizeChange(16)}
          className="px-2 py-0.5 border border-terminal-green/30 text-terminal-green hover:border-terminal-green transition-colors"
          aria-label="Increase crop size"
        >
          +
        </button>
      </div>

      {/* Confirm / cancel */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(crop)}
          className="text-[10px] px-4 py-1.5 border border-terminal-green/60 text-terminal-green hover:bg-terminal-green/10 transition-colors"
        >
          CONFIRM_CROP
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[10px] px-4 py-1.5 border border-terminal-gray/30 text-terminal-gray hover:border-terminal-gray transition-colors"
        >
          CANCEL
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function OrgLogoUpload({
  onSave,
  currentLogoUrl,
  maxSizeBytes = DEFAULT_MAX,
}: OrgLogoUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const [rawSrc, setRawSrc]         = React.useState<string | null>(null)
  const [naturalSize, setNaturalSize] = React.useState<{ w: number; h: number } | null>(null)
  const [preview, setPreview]       = React.useState<string | null>(currentLogoUrl ?? null)
  const [error, setError]           = React.useState<string | null>(null)
  const [cropping, setCropping]     = React.useState(false)
  const [saving, setSaving]         = React.useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED.includes(file.type)) {
      setError(`Unsupported file type. Accepted: PNG, JPEG, GIF, WEBP.`)
      return
    }
    if (file.size > maxSizeBytes) {
      setError(`File too large. Maximum size is ${(maxSizeBytes / 1024 / 1024).toFixed(1)} MB.`)
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      // Load image to get natural dimensions
      const img = new Image()
      img.onload = () => {
        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
        setRawSrc(src)
        setCropping(true)
      }
      img.src = src
    }
    reader.readAsDataURL(file)
    // Reset input so same file can be re-selected
    e.target.value = ""
  }

  const handleCropConfirm = async (crop: CropRect) => {
    if (!rawSrc) return
    setSaving(true)
    try {
      const dataUrl = await cropImage(rawSrc, crop)
      setPreview(dataUrl)
      setCropping(false)
      setRawSrc(null)
      onSave(dataUrl)
    } catch {
      setError("Failed to process image.")
    } finally {
      setSaving(false)
    }
  }

  const handleCropCancel = () => {
    setCropping(false)
    setRawSrc(null)
    setNaturalSize(null)
  }

  const handleRemove = () => {
    setPreview(null)
    setRawSrc(null)
    setCropping(false)
    setError(null)
  }

  return (
    <div className="border border-terminal-green/30 bg-terminal-black font-terminal-mono p-4 space-y-4" aria-label="Organization logo upload">
      <div className="text-[10px] text-terminal-green tracking-widest">[ORG_LOGO]</div>

      {/* Current preview */}
      {preview && !cropping && (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Organization logo preview"
            width={64}
            height={64}
            className="w-16 h-16 object-cover border border-terminal-green/30"
            data-testid="logo-preview"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="text-[9px] text-terminal-danger hover:text-terminal-danger/80 transition-colors"
            aria-label="Remove logo"
          >
            REMOVE
          </button>
        </div>
      )}

      {/* Crop tool */}
      {cropping && rawSrc && naturalSize && (
        <CropTool
          src={rawSrc}
          naturalWidth={naturalSize.w}
          naturalHeight={naturalSize.h}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {/* Upload button */}
      {!cropping && (
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Upload logo file"
            data-testid="logo-file-input"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={saving}
            className="text-[10px] px-4 py-2 border border-terminal-green/60 text-terminal-green hover:bg-terminal-green/10 transition-colors disabled:opacity-50"
          >
            {saving ? "PROCESSING…" : preview ? "CHANGE_LOGO" : "UPLOAD_LOGO"}
          </button>
          <div className="text-[9px] text-terminal-gray/60">
            PNG, JPEG, GIF, WEBP · max {(maxSizeBytes / 1024 / 1024).toFixed(0)} MB
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-[10px] text-terminal-danger" role="alert" data-testid="logo-error">
          {error}
        </div>
      )}
    </div>
  )
}
