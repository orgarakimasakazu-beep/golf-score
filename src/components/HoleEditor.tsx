import type { HoleScore } from '../lib/types'
import { scoreClass } from '../lib/score'

interface Props {
  holes: HoleScore[]
  index: number
  onChange: (holes: HoleScore[]) => void
  onIndex: (i: number) => void
}

const LABEL: Record<string, string> = {
  ace: 'ホールインワン',
  eagle: 'イーグル',
  birdie: 'バーディ',
  par: 'パー',
  bogey: 'ボギー',
  dbogey: 'ダブルボギー以上',
}

function Stepper({ label, value, onChange, min = 0, placeholder }: { label: string; value: number | null; onChange: (v: number | null) => void; min?: number; placeholder: number }) {
  return (
    <div className="stepper">
      <div className="stepper-label">{label}</div>
      <div className="stepper-row">
        <button type="button" className="step" onClick={() => onChange(value == null ? placeholder - 1 : Math.max(min, value - 1))} aria-label={`${label}を減らす`}>
          −
        </button>
        <button type="button" className={`step-val ${value == null ? 'empty' : ''}`} onClick={() => onChange(value == null ? placeholder : null)} title="タップで未入力/入力を切替">
          {value ?? placeholder}
        </button>
        <button type="button" className="step" onClick={() => onChange(value == null ? placeholder + 1 : value + 1)} aria-label={`${label}を増やす`}>
          ＋
        </button>
      </div>
    </div>
  )
}

export default function HoleEditor({ holes, index, onChange, onIndex }: Props) {
  const h = holes[index]
  const set = (patch: Partial<HoleScore>) => onChange(holes.map((x, i) => (i === index ? { ...x, ...patch } : x)))
  const cls = scoreClass(h.strokes, h.par)
  return (
    <div className="hole-editor">
      <div className="hole-nav">
        <button type="button" className="btn ghost" disabled={index === 0} onClick={() => onIndex(index - 1)}>
          ‹ 前
        </button>
        <div className="hole-title">
          <span className="hole-no">{index + 1}</span>
          <span className="hole-unit">H</span>
          <div className="par-select">
            {[3, 4, 5, 6].map((p) => (
              <button key={p} type="button" className={`chip ${h.par === p ? 'on' : ''}`} onClick={() => set({ par: p })}>
                Par{p}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn ghost" disabled={index === 17} onClick={() => onIndex(index + 1)}>
          次 ›
        </button>
      </div>
      <div className="steppers">
        <Stepper label="打数" value={h.strokes} placeholder={h.par} min={1} onChange={(v) => set({ strokes: v })} />
        <Stepper label="パット" value={h.putts} placeholder={2} onChange={(v) => set({ putts: v })} />
      </div>
      <div className={`hole-result ${cls}`}>{cls ? LABEL[cls] : '数字をタップすると入力されます'}</div>
    </div>
  )
}
