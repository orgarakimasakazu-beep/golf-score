import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, upsertCourse } from '../lib/db'
import { totals } from '../lib/score'
import CourseSearch from '../components/CourseSearch'

export default function Courses() {
  const navigate = useNavigate()
  const [search, setSearch] = useState(false)
  const data = useLiveQuery(async () => {
    const [courses, rounds] = await Promise.all([db.courses.toArray(), db.rounds.toArray()])
    return courses
      .map((c) => {
        const rs = rounds.filter((r) => r.courseId === c.id)
        const scores = rs.filter((r) => totals(r.holes).played === 18).map((r) => totals(r.holes).strokes)
        return { c, count: rs.length, best: scores.length ? Math.min(...scores) : null, last: rs.map((r) => r.date).sort().pop() }
      })
      .sort((a, b) => (b.last ?? '').localeCompare(a.last ?? '') || b.c.updatedAt - a.c.updatedAt)
  }, [])

  return (
    <div className="page">
      <header className="app-head">
        <h1>ゴルフ場</h1>
        <button type="button" className="btn primary" onClick={() => setSearch(true)}>＋ 追加</button>
      </header>
      {data?.length === 0 && <p className="note center">ゴルフ場が登録されていません。「追加」から楽天GORAで検索できます。</p>}
      <ul className="round-list">
        {data?.map(({ c, count, best, last }) => (
          <li key={c.id}>
            <Link to={`/courses/${c.id}`} className="round-item course-item">
              {c.imageUrls?.[0] ? <img src={c.imageUrls[0]} alt="" loading="lazy" /> : <div className="noimg">⛳</div>}
              <div className="ri-main">
                <div className="ri-course">{c.name}</div>
                <div className="ri-sub">{c.address}</div>
                <div className="ri-sub">{count}回プレー{last && ` ・ 最終 ${last.replaceAll('-', '/')}`}{c.evaluation ? ` ・ ★${c.evaluation.toFixed(1)}` : ''}</div>
              </div>
              <div className="ri-score">{best ?? '-'}<small>BEST</small></div>
            </Link>
          </li>
        ))}
      </ul>
      {search && (
        <CourseSearch
          onClose={() => setSearch(false)}
          onSelect={async (c) => {
            const { id, ...info } = c
            const cid = id ?? (await upsertCourse(info))
            setSearch(false)
            navigate(`/courses/${cid}`)
          }}
        />
      )}
    </div>
  )
}
