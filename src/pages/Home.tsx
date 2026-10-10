import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { feeTotal, formatDate, stats, totals, yen } from '../lib/score'
import type { Round } from '../lib/types'

function ScoreChart({ rounds }: { rounds: Round[] }) {
  const pts = rounds
    .filter((r) => totals(r.holes).played === 18)
    .slice(0, 20)
    .reverse()
    .map((r) => ({ date: r.date, score: totals(r.holes).strokes }))
  if (pts.length < 2) return null
  const W = 320
  const H = 120
  const pad = 22
  const min = Math.min(...pts.map((p) => p.score)) - 3
  const max = Math.max(...pts.map((p) => p.score)) + 3
  const x = (i: number) => pad + (i * (W - pad * 2)) / (pts.length - 1)
  const y = (s: number) => pad / 2 + ((s - min) / (max - min)) * (H - pad * 1.5)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="スコア推移">
      <polyline points={pts.map((p, i) => `${x(i)},${y(p.score)}`).join(' ')} fill="none" stroke="var(--green)" strokeWidth="2.5" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.score)} r="4" fill="var(--surface)" stroke="var(--green)" strokeWidth="2" />
          <text x={x(i)} y={y(p.score) - 8} textAnchor="middle" className="chart-label">{p.score}</text>
        </g>
      ))}
    </svg>
  )
}

export default function Home() {
  const rounds = useLiveQuery(() => db.rounds.orderBy('date').reverse().toArray(), [])
  if (!rounds) return <div className="page"><p className="note">読み込み中…</p></div>
  const s = stats(rounds)
  const totalDist = Object.values(s.dist).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="page">
      <header className="app-head">
        <h1>⛳ ゴルフスコア</h1>
      </header>

      <section className="stats">
        <div className="stat"><span className="lbl">ベスト</span><span className="val">{s.best ?? '-'}</span></div>
        <div className="stat"><span className="lbl">平均スコア</span><span className="val">{s.avgScore?.toFixed(1) ?? '-'}</span></div>
        <div className="stat"><span className="lbl">平均パット</span><span className="val">{s.avgPutts?.toFixed(1) ?? '-'}</span></div>
        <div className="stat"><span className="lbl">ラウンド数</span><span className="val">{s.rounds}</span></div>
      </section>

      {s.holesPlayed > 0 && (
        <section className="card">
          <h2>スコア推移</h2>
          <ScoreChart rounds={rounds} />
          <div className="dist">
            {(['eagle', 'birdie', 'par', 'bogey', 'dbogey'] as const).map((k) => (
              <i key={k} className={`d-${k}`} style={{ flex: s.dist[k] }} />
            ))}
          </div>
          <div className="dist-legend">
            <span>イーグル以下 {((s.dist.eagle / totalDist) * 100).toFixed(0)}%</span>
            <span>バーディ {((s.dist.birdie / totalDist) * 100).toFixed(0)}%</span>
            <span>パー {((s.dist.par / totalDist) * 100).toFixed(0)}%</span>
            <span>ボギー {((s.dist.bogey / totalDist) * 100).toFixed(0)}%</span>
            <span>ダボ以上 {((s.dist.dbogey / totalDist) * 100).toFixed(0)}%</span>
          </div>
          <p className="note">累計プレー料金 {yen(s.totalFees)}</p>
        </section>
      )}

      <Link to="/rounds/new" className="btn primary wide big">＋ ラウンドを記録</Link>

      <h2 className="section-title">ラウンド履歴</h2>
      {rounds.length === 0 && <p className="note center">まだ記録がありません。「ラウンドを記録」から始めましょう。</p>}
      <ul className="round-list">
        {rounds.map((r) => {
          const t = totals(r.holes)
          return (
            <li key={r.id}>
              <Link to={`/rounds/${r.id}`} className="round-item">
                <div className="ri-main">
                  <div className="ri-date">{formatDate(r.date)} {r.weather?.split(' ')[0]}</div>
                  <div className="ri-course">{r.courseName}</div>
                  <div className="ri-sub">
                    OUT {t.out.strokes || '-'} / IN {t.in.strokes || '-'} ・ パット {t.putts || '-'}
                    {feeTotal(r) > 0 && ` ・ ${yen(feeTotal(r))}`}
                  </div>
                </div>
                <div className="ri-score">
                  {t.played ? t.strokes : '-'}
                  {t.played > 0 && t.played < 18 && <small>{t.played}H</small>}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
