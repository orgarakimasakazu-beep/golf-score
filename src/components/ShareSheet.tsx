import { useEffect, useMemo, useState } from 'react'
import type { Photo, Round } from '../lib/types'
import { downloadBlob, renderShareImage, shareNative, shareText, xIntentUrl } from '../lib/share'
import { loadSettings } from '../lib/settings'

interface Props {
  round: Round
  photos: Photo[]
  onClose: () => void
}

export default function ShareSheet({ round, photos, onClose }: Props) {
  const candidates = useMemo(() => photos.filter((p) => p.kind === 'other' || p.kind === 'meal'), [photos])
  const [bg, setBg] = useState<number | null>(candidates[0]?.id ?? null)
  const [image, setImage] = useState<Blob | null>(null)
  const [text, setText] = useState(() => shareText(round, loadSettings().hashtags))
  const [msg, setMsg] = useState('')
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : ''), [image])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  useEffect(() => {
    let alive = true
    renderShareImage(round, candidates.find((p) => p.id === bg)?.blob).then((b) => alive && setImage(b))
    return () => { alive = false }
  }, [round, bg, candidates])

  const filename = `golf-${round.date}.png`

  const onShare = async () => {
    if (!image) return
    try {
      const r = await shareNative(image, text)
      if (r === 'unsupported') setMsg('この端末は共有機能に対応していません。下の「画像を保存」と「Xに投稿」をお使いください。')
      else if (r === 'shared') onClose()
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setMsg('投稿文をコピーしました')
    } catch {
      setMsg('コピーできませんでした')
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>SNSに投稿</h2>
          <button type="button" className="btn ghost" onClick={onClose}>閉じる</button>
        </div>
        <div className="modal-body">
          {preview ? <img className="share-preview" src={preview} alt="投稿画像プレビュー" /> : <p className="note">画像を作成中…</p>}
          {candidates.length > 0 && (
            <div className="field">
              <span>背景写真</span>
              <div className="chips">
                <button type="button" className={`chip ${bg == null ? 'on' : ''}`} onClick={() => setBg(null)}>なし</button>
                {candidates.map((p, i) => (
                  <button type="button" key={p.id} className={`chip ${bg === p.id ? 'on' : ''}`} onClick={() => setBg(p.id ?? null)}>写真{i + 1}</button>
                ))}
              </div>
            </div>
          )}
          <label className="field">
            <span>投稿文</span>
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <button type="button" className="btn primary wide big" onClick={onShare} disabled={!image}>
            共有（X・Instagram など）
          </button>
          <p className="hint">共有メニューから X や Instagram を選んでください。Instagram は投稿文が自動入力されないため、先に「投稿文をコピー」してから貼り付けてください。</p>
          <div className="grid2">
            <button type="button" className="btn" onClick={copyText}>投稿文をコピー</button>
            <button type="button" className="btn" onClick={() => image && downloadBlob(image, filename)} disabled={!image}>画像を保存</button>
          </div>
          <a className="btn wide x" href={xIntentUrl(text)} target="_blank" rel="noreferrer">X に文章だけ投稿</a>
          {msg && <p className="note">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
