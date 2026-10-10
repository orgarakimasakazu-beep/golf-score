import { useEffect, useMemo, useState } from 'react'
import { resizeImage } from '../lib/image'

export interface PhotoItem {
  key: string
  id?: number
  blob: Blob
}

interface Props {
  photos: PhotoItem[]
  onAdd?: (blobs: Blob[]) => void
  onRemove?: (key: string) => void
  addLabel?: string
}

function Thumb({ blob, onClick }: { blob: Blob; onClick: () => void }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <img src={url} alt="" onClick={onClick} />
}

export function Lightbox({ blob, onClose }: { blob: Blob; onClose: () => void }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div className="lightbox" onClick={onClose}>
      <img src={url} alt="" />
    </div>
  )
}

export default function PhotoStrip({ photos, onAdd, onRemove, addLabel = '写真を追加' }: Props) {
  const [view, setView] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || !onAdd) return
    setBusy(true)
    try {
      onAdd(await Promise.all([...files].map((f) => resizeImage(f))))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="photo-strip">
      {photos.map((p) => (
        <div key={p.key} className="photo">
          <Thumb blob={p.blob} onClick={() => setView(p.blob)} />
          {onRemove && (
            <button type="button" className="photo-del" onClick={() => onRemove(p.key)} aria-label="削除">
              ×
            </button>
          )}
        </div>
      ))}
      {onAdd && (
        <>
          <label className="photo-add">
            <input type="file" accept="image/*" capture="environment" onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} hidden />
            <span className="icon">📷</span>
            <span>{busy ? '処理中…' : '撮影'}</span>
          </label>
          <label className="photo-add">
            <input type="file" accept="image/*" multiple onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} hidden />
            <span className="icon">🖼️</span>
            <span>{addLabel}</span>
          </label>
        </>
      )}
      {view && <Lightbox blob={view} onClose={() => setView(null)} />}
    </div>
  )
}
