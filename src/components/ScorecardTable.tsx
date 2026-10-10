import type { HoleScore } from '../lib/types'
import { half, scoreClass, totals } from '../lib/score'

interface Props {
  holes: HoleScore[]
  current?: number
  onSelect?: (index: number) => void
  outName?: string
  inName?: string
}

function HalfTable({ holes, start, label, current, onSelect, name }: { holes: HoleScore[]; start: number; label: 'OUT' | 'IN'; current?: number; onSelect?: (i: number) => void; name?: string }) {
  const hs = holes.slice(start, start + 9)
  const h = half(holes, label === 'OUT' ? 'out' : 'in')
  const cls = (i: number) => (current === start + i ? 'cur' : '') + (onSelect ? ' tap' : '')
  return (
    <table className="scorecard">
      <thead>
        <tr>
          <th className="rowhead">{name || 'HOLE'}</th>
          {hs.map((_, i) => (
            <th key={i} className={cls(i)} onClick={() => onSelect?.(start + i)}>
              {start + i + 1}
            </th>
          ))}
          <th className="sum">{label}</th>
        </tr>
      </thead>
      <tbody>
        <tr className="par">
          <th className="rowhead">PAR</th>
          {hs.map((x, i) => (
            <td key={i} className={cls(i)} onClick={() => onSelect?.(start + i)}>
              {x.par}
            </td>
          ))}
          <td className="sum">{h.par}</td>
        </tr>
        <tr className="score">
          <th className="rowhead">SCORE</th>
          {hs.map((x, i) => (
            <td key={i} className={cls(i)} onClick={() => onSelect?.(start + i)}>
              <span className={`mark ${scoreClass(x.strokes, x.par)}`}>{x.strokes ?? ''}</span>
            </td>
          ))}
          <td className="sum strong">{h.played ? h.strokes : ''}</td>
        </tr>
        <tr className="putt">
          <th className="rowhead">PUTT</th>
          {hs.map((x, i) => (
            <td key={i} className={cls(i)} onClick={() => onSelect?.(start + i)}>
              {x.putts ?? ''}
            </td>
          ))}
          <td className="sum">{h.putts || ''}</td>
        </tr>
      </tbody>
    </table>
  )
}

export default function ScorecardTable({ holes, current, onSelect, outName, inName }: Props) {
  const t = totals(holes)
  const diff = t.strokes - holes.filter((h) => h.strokes != null).reduce((a, h) => a + h.par, 0)
  return (
    <div className="scorecard-wrap">
      <HalfTable holes={holes} start={0} label="OUT" current={current} onSelect={onSelect} name={outName} />
      <HalfTable holes={holes} start={9} label="IN" current={current} onSelect={onSelect} name={inName} />
      <div className="scorecard-total">
        <div>
          <span className="lbl">TOTAL</span>
          <span className="val">{t.played ? t.strokes : '-'}</span>
          {t.played > 0 && <span className="diff">({diff >= 0 ? '+' : ''}{diff})</span>}
        </div>
        <div>
          <span className="lbl">PUTT</span>
          <span className="val small">{t.putts || '-'}</span>
        </div>
        <div>
          <span className="lbl">PAR</span>
          <span className="val small">{t.par}</span>
        </div>
      </div>
      <div className="legend">
        <span><i className="mark eagle">●</i>イーグル</span>
        <span><i className="mark birdie">●</i>バーディ</span>
        <span><i className="mark bogey">■</i>ボギー</span>
        <span><i className="mark dbogey">■</i>ダボ以上</span>
      </div>
    </div>
  )
}
