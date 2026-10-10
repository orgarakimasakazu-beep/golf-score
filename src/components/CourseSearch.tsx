import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { getCourseDetail, PREFECTURES, searchCourses } from '../lib/rakuten'
import type { CourseInfo } from '../lib/types'
import { loadSettings } from '../lib/settings'

interface Props {
  onSelect: (c: CourseInfo & { id?: number; holePars?: number[] }) => void
  onClose: () => void
}

export default function CourseSearch({ onSelect, onClose }: Props) {
  const [keyword, setKeyword] = useState('')
  const [area, setArea] = useState<number | ''>('')
  const [results, setResults] = useState<CourseInfo[] | null>(null)
  const [page, setPage] = useState({ page: 1, count: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const saved = useLiveQuery(async () => (await db.courses.toArray()).sort((a, b) => b.updatedAt - a.updatedAt), [])
  const hasRakuten = !!loadSettings().rakutenAppId

  const run = async (p = 1) => {
    if (!keyword.trim() && !area) {
      setError('ゴルフ場名か都道府県を指定してください')
      return
    }
    setLoading(true)
    setError('')
    try {
      const r = await searchCourses(keyword.trim(), area || undefined, p)
      setResults(p === 1 ? r.items : [...(results ?? []), ...r.items])
      setPage({ page: r.page, count: r.pageCount })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const pick = async (c: CourseInfo) => {
    setLoading(true)
    try {
      const detail = c.rakutenId ? await getCourseDetail(c.rakutenId).catch(() => null) : null
      onSelect({ ...c, ...(detail ?? {}), imageUrls: detail?.imageUrls?.length ? detail.imageUrls : c.imageUrls })
    } finally {
      setLoading(false)
    }
  }

  const filteredSaved = (saved ?? []).filter((c) => !keyword || c.name.includes(keyword) || c.kana?.includes(keyword))

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>ゴルフ場を選ぶ</h2>
          <button type="button" className="btn ghost" onClick={onClose}>閉じる</button>
        </div>
        <form className="search-row" onSubmit={(e) => { e.preventDefault(); run(1) }}>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="ゴルフ場名（例: 富士）" autoFocus />
          <select value={area} onChange={(e) => setArea(e.target.value ? Number(e.target.value) : '')}>
            <option value="">都道府県</option>
            {PREFECTURES.map((p, i) => (
              <option key={p} value={i + 1}>{p}</option>
            ))}
          </select>
          <button className="btn primary" disabled={loading || !hasRakuten}>検索</button>
        </form>
        {!hasRakuten && <p className="note">楽天GORAで検索するには、設定画面で楽天アプリIDを登録してください。</p>}
        {error && <p className="error">{error}</p>}

        <div className="modal-body">
          {keyword.trim() && (
            <button type="button" className="list-item manual" onClick={() => onSelect({ name: keyword.trim() })}>
              ＋「{keyword.trim()}」を手入力で登録
            </button>
          )}
          {filteredSaved.length > 0 && !results && (
            <>
              <h3 className="list-head">登録済みのゴルフ場</h3>
              {filteredSaved.map((c) => (
                <button type="button" key={c.id} className="list-item" onClick={() => onSelect(c)}>
                  <strong>{c.name}</strong>
                  <small>{c.address}</small>
                </button>
              ))}
            </>
          )}
          {results && (
            <>
              <h3 className="list-head">楽天GORA 検索結果</h3>
              {results.length === 0 && <p className="note">該当するゴルフ場がありません</p>}
              {results.map((c) => (
                <button type="button" key={c.rakutenId} className="list-item course-hit" onClick={() => pick(c)} disabled={loading}>
                  {c.imageUrls?.[0] && <img src={c.imageUrls[0]} alt="" loading="lazy" />}
                  <span>
                    <strong>{c.name}</strong>
                    <small>{c.address}</small>
                    {c.evaluation ? <small className="eval">★ {c.evaluation.toFixed(1)}</small> : null}
                  </span>
                </button>
              ))}
              {page.page < page.count && (
                <button type="button" className="btn wide" onClick={() => run(page.page + 1)} disabled={loading}>
                  もっと見る
                </button>
              )}
            </>
          )}
          {loading && <p className="note">読み込み中…</p>}
        </div>
        <p className="credit">
          <a href="https://webservice.rakuten.co.jp/" target="_blank" rel="noreferrer">Supported by Rakuten Developers</a>
        </p>
      </div>
    </div>
  )
}
