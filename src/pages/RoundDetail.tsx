import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteRound } from '../lib/db'
import ScorecardTable from '../components/ScorecardTable'
import PhotoStrip from '../components/PhotoStrip'
import CourseInfoCard from '../components/CourseInfoCard'
import Stars from '../components/Stars'
import { feeTotal, formatDate, totals, yen } from '../lib/score'
import { PHOTO_KIND_LABEL, type PhotoKind } from '../lib/types'
import ShareSheet from '../components/ShareSheet'

export default function RoundDetail() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const round = useLiveQuery(async () => (await db.rounds.get(id)) ?? null, [id])
  const course = useLiveQuery(async () => (round?.courseId ? db.courses.get(round.courseId) : undefined), [round?.courseId])
  const photos = useLiveQuery(() => db.photos.where('roundId').equals(id).toArray(), [id])
  const [share, setShare] = useState(false)

  if (round === undefined) return <div className="page"><p className="note">読み込み中…</p></div>
  if (round === null) return <div className="page"><p className="note">ラウンドが見つかりません</p></div>

  const t = totals(round.holes)
  const playedPar = round.holes.filter((h) => h.strokes != null).reduce((a, h) => a + h.par, 0)
  const diff = t.strokes - playedPar
  const byKind = (k: PhotoKind) => (photos ?? []).filter((p) => p.kind === k).map((p) => ({ key: String(p.id), id: p.id, blob: p.blob }))
  const [outName, inName] = (round.courseSubName ?? '').split(/\s*(?:→|->|\/)\s*/)

  const remove = async () => {
    if (!confirm('このラウンドを削除しますか？（写真も削除されます）')) return
    await deleteRound(id)
    navigate('/', { replace: true })
  }

  return (
    <div className="page">
      <header className="page-head">
        <button type="button" className="btn ghost" onClick={() => navigate(-1)}>‹ 戻る</button>
        <h1>ラウンド詳細</h1>
        <Link className="btn" to={`/rounds/${id}/edit`}>編集</Link>
      </header>

      <section className="hero">
        <div className="hero-date">{formatDate(round.date)}{round.startTime && ` ${round.startTime}スタート`} {round.weather}</div>
        <div className="hero-course">{round.courseName}</div>
        {round.courseSubName && <div className="hero-sub">{round.courseSubName}</div>}
        <div className="hero-score">
          <span className="big">{t.played ? t.strokes : '-'}</span>
          {t.played > 0 && <span className="diff">{diff >= 0 ? '+' : ''}{diff}</span>}
          <div className="hero-meta">
            <span>OUT {t.out.strokes || '-'}</span>
            <span>IN {t.in.strokes || '-'}</span>
            <span>パット {t.putts || '-'}</span>
          </div>
        </div>
        {round.companions && <div className="hero-sub">同伴: {round.companions}</div>}
        <button type="button" className="btn share wide" onClick={() => setShare(true)}>X・Instagramに投稿</button>
      </section>

      <section className="card">
        <h2>スコアカード</h2>
        <ScorecardTable holes={round.holes} outName={outName || undefined} inName={inName || undefined} />
      </section>

      <section className="card">
        <h2>料金 <span className="sum-badge">{yen(feeTotal(round))}</span></h2>
        {round.fees.length === 0 ? (
          <p className="note">未登録</p>
        ) : (
          <table className="fees">
            <tbody>
              {round.fees.map((f, i) => (
                <tr key={i}><th>{f.label || '（費目なし）'}</th><td>{yen(f.amount)}</td></tr>
              ))}
              <tr className="total"><th>合計</th><td>{yen(feeTotal(round))}</td></tr>
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>食事</h2>
        {round.meal.rating > 0 && <Stars value={round.meal.rating} size={22} />}
        {round.meal.menu && <p className="meal-menu">{round.meal.menu}</p>}
        {round.meal.comment && <p className="pre">{round.meal.comment}</p>}
        {!round.meal.rating && !round.meal.menu && !round.meal.comment && <p className="note">未登録</p>}
        <PhotoStrip photos={byKind('meal')} />
      </section>

      {round.memo && (
        <section className="card">
          <h2>メモ</h2>
          <p className="pre">{round.memo}</p>
        </section>
      )}

      {(['scorecard', 'receipt', 'other'] as PhotoKind[]).map((k) =>
        byKind(k).length ? (
          <section className="card" key={k}>
            <h2>{PHOTO_KIND_LABEL[k]}の写真</h2>
            <PhotoStrip photos={byKind(k)} />
          </section>
        ) : null,
      )}

      {course && (
        <section className="card">
          <h2>ゴルフ場情報</h2>
          <CourseInfoCard course={course} />
          <Link className="btn wide" to={`/courses/${course.id}`}>このゴルフ場の記録を見る</Link>
        </section>
      )}

      <button type="button" className="btn danger wide" onClick={remove}>このラウンドを削除</button>

      {share && <ShareSheet round={round} photos={photos ?? []} onClose={() => setShare(false)} />}
    </div>
  )
}
