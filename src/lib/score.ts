import type { HoleScore, Round } from './types'

const sum = (xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0)

export function half(holes: HoleScore[], which: 'out' | 'in') {
  const hs = which === 'out' ? holes.slice(0, 9) : holes.slice(9, 18)
  return {
    par: sum(hs.map((h) => h.par)),
    strokes: sum(hs.map((h) => h.strokes)),
    putts: sum(hs.map((h) => h.putts)),
    played: hs.filter((h) => h.strokes != null).length,
  }
}

export function totals(holes: HoleScore[]) {
  const o = half(holes, 'out')
  const i = half(holes, 'in')
  return {
    out: o,
    in: i,
    par: o.par + i.par,
    strokes: o.strokes + i.strokes,
    putts: o.putts + i.putts,
    played: o.played + i.played,
  }
}

export function feeTotal(r: Round) {
  return r.fees.reduce((a, f) => a + (Number(f.amount) || 0), 0)
}

/** スコアとパーの差を「バーディ」等の区分に */
export function scoreClass(strokes: number | null, par: number) {
  if (strokes == null) return ''
  const d = strokes - par
  if (strokes === 1) return 'ace'
  if (d <= -2) return 'eagle'
  if (d === -1) return 'birdie'
  if (d === 0) return 'par'
  if (d === 1) return 'bogey'
  return 'dbogey'
}

export function stats(rounds: Round[]) {
  const full = rounds.filter((r) => totals(r.holes).played === 18)
  const scores = full.map((r) => totals(r.holes).strokes)
  const putts = full.map((r) => totals(r.holes).putts).filter((p) => p > 0)
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const dist = { eagle: 0, birdie: 0, par: 0, bogey: 0, dbogey: 0 }
  let holesPlayed = 0
  for (const r of full)
    for (const h of r.holes) {
      if (h.strokes == null) continue
      holesPlayed++
      const c = scoreClass(h.strokes, h.par)
      if (c === 'ace' || c === 'eagle') dist.eagle++
      else if (c) dist[c as keyof typeof dist]++
    }
  return {
    rounds: rounds.length,
    fullRounds: full.length,
    best: scores.length ? Math.min(...scores) : null,
    avgScore: avg(scores),
    avgPutts: avg(putts),
    recentAvg: avg(scores.slice(0, 5)),
    totalFees: rounds.reduce((a, r) => a + feeTotal(r), 0),
    dist,
    holesPlayed,
  }
}

export const yen = (n: number) => `¥${Math.round(n).toLocaleString('ja-JP')}`

export function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  if (Number.isNaN(dt.getTime())) return d
  const w = '日月火水木金土'[dt.getDay()]
  return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}(${w})`
}
