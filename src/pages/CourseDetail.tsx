import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { getCourseDetail } from '../lib/rakuten'
import { formatDate, stats, totals } from '../lib/score'
import CourseInfoCard from '../components/CourseInfoCard'

export default function CourseDetail() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const course = useLiveQuery(async () => (await db.courses.get(id)) ?? null, [id])
  const rounds = useLiveQuery(() => db.rounds.where('courseId').equals(id).reverse().sortBy('date'), [id])
  const [msg, setMsg] = useState('')

  if (course === undefined) return <div className="page"><p className="note">読み込み中…</p></div>
  if (course === null) return <div className="page"><p className="note">ゴルフ場が見つかりません</p></div>
  const s = stats(rounds ?? [])

  const refresh = async () => {
    if (!course.rakutenId) return
    try {
      const d = await getCourseDetail(course.rakutenId)
      if (d) {
        await db.courses.update(id, { ...d, updatedAt: Date.now() })
        setMsg('最新の情報に更新しました')
      }
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  const remove = async () => {
    if (rounds?.length) return setMsg('このゴルフ場のラウンド記録があるため削除できません')
    if (!confirm('このゴルフ場を削除しますか？')) return
    await db.courses.delete(id)
    navigate('/courses', { replace: true })
  }

  return (
    <div className="page">
      <header className="page-head">
        <button type="button" className="btn ghost" onClick={() => navigate(-1)}>‹ 戻る</button>
        <h1>ゴルフ場</h1>
        {course.rakutenId ? <button type="button" className="btn" onClick={refresh}>情報更新</button> : <span />}
      </header>
      {msg && <p className="note">{msg}</p>}
      <section className="card">
        <CourseInfoCard course={course} />
      </section>

      <section className="stats">
        <div className="stat"><span className="lbl">プレー回数</span><span className="val">{s.rounds}</span></div>
        <div className="stat"><span className="lbl">ベスト</span><span className="val">{s.best ?? '-'}</span></div>
        <div className="stat"><span className="lbl">平均</span><span className="val">{s.avgScore?.toFixed(1) ?? '-'}</span></div>
      </section>

      <section className="card">
        <h2>自分用メモ</h2>
        <textarea rows={3} defaultValue={course.memo ?? ''} placeholder="攻略メモ、アクセス、おすすめメニューなど" onBlur={(e) => db.courses.update(id, { memo: e.target.value })} />
      </section>

      <Link to="/rounds/new" className="btn primary wide">＋ ラウンドを記録</Link>

      <h2 className="section-title">このゴルフ場のラウンド</h2>
      <ul className="round-list">
        {rounds?.map((r) => {
          const t = totals(r.holes)
          return (
            <li key={r.id}>
              <Link to={`/rounds/${r.id}`} className="round-item">
                <div className="ri-main">
                  <div className="ri-date">{formatDate(r.date)}</div>
                  <div className="ri-sub">OUT {t.out.strokes || '-'} / IN {t.in.strokes || '-'} ・ パット {t.putts || '-'}</div>
                  {r.meal.menu && <div className="ri-sub">🍴 {r.meal.menu} {'★'.repeat(r.meal.rating)}</div>}
                </div>
                <div className="ri-score">{t.played ? t.strokes : '-'}</div>
              </Link>
            </li>
          )
        })}
      </ul>
      <button type="button" className="btn danger wide" onClick={remove}>このゴルフ場を削除</button>
    </div>
  )
}
