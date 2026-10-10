import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, upsertCourse } from '../lib/db'
import { emptyHoles, type CourseInfo, type FeeItem, type HoleScore, type PhotoKind, type Round } from '../lib/types'
import ScorecardTable from '../components/ScorecardTable'
import HoleEditor from '../components/HoleEditor'
import PhotoStrip, { type PhotoItem } from '../components/PhotoStrip'
import CourseSearch from '../components/CourseSearch'
import Stars from '../components/Stars'
import type { ScorecardResult } from '../lib/ocr'
import { feeTotal, yen } from '../lib/score'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const FEE_PRESETS = ['プレー代', 'キャディフィ', 'カート代', '利用税', '食事', '売店', '交通費', 'その他']
const WEATHER = ['☀️ 晴れ', '⛅ 曇り', '☔ 雨', '💨 強風', '❄️ 雪']

type PhotoMap = Record<PhotoKind, PhotoItem[]>
const emptyPhotos = (): PhotoMap => ({ scorecard: [], receipt: [], meal: [], other: [] })
let keySeq = 0
const newKey = () => `p${Date.now()}_${keySeq++}`

export default function RoundForm() {
  const { id } = useParams()
  const editId = id ? Number(id) : undefined
  const navigate = useNavigate()

  const [round, setRound] = useState<Round>(() => ({
    date: today(),
    courseName: '',
    holes: emptyHoles(),
    fees: [],
    meal: { rating: 0, menu: '', comment: '' },
    memo: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }))
  const [course, setCourse] = useState<(CourseInfo & { id?: number; holePars?: number[] }) | null>(null)
  const [photos, setPhotos] = useState<PhotoMap>(emptyPhotos)
  const [removed, setRemoved] = useState<number[]>([])
  const [hole, setHole] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [busy, setBusy] = useState<'' | 'scorecard' | 'receipt' | 'save'>('')
  const [message, setMessage] = useState('')
  const [players, setPlayers] = useState<ScorecardResult | null>(null)

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 6000)
    return () => clearTimeout(t)
  }, [message])

  useEffect(() => {
    if (!editId) return
    ;(async () => {
      const r = await db.rounds.get(editId)
      if (!r) return
      setRound(r)
      if (r.courseId) setCourse((await db.courses.get(r.courseId)) ?? null)
      const ps = await db.photos.where('roundId').equals(editId).toArray()
      const map = emptyPhotos()
      for (const p of ps) map[p.kind].push({ key: `db${p.id}`, id: p.id, blob: p.blob })
      setPhotos(map)
    })()
  }, [editId])

  const patch = (p: Partial<Round>) => setRound((r) => ({ ...r, ...p }))
  const setHoles = (holes: HoleScore[]) => patch({ holes })
  const setFees = (fees: FeeItem[]) => patch({ fees })

  const addPhotos = (kind: PhotoKind) => (blobs: Blob[]) =>
    setPhotos((m) => ({ ...m, [kind]: [...m[kind], ...blobs.map((blob) => ({ key: newKey(), blob }))] }))
  const removePhoto = (kind: PhotoKind) => (key: string) =>
    setPhotos((m) => {
      const item = m[kind].find((p) => p.key === key)
      if (item?.id) setRemoved((r) => [...r, item.id!])
      return { ...m, [kind]: m[kind].filter((p) => p.key !== key) }
    })

  const selectCourse = (c: CourseInfo & { id?: number; holePars?: number[] }) => {
    setCourse(c)
    setSearchOpen(false)
    const pars = c.holePars
    const untouched = round.holes.every((h) => h.strokes == null)
    patch({ courseName: c.name, ...(pars && untouched ? { holes: emptyHoles(pars) } : {}) })
  }

  const applyPlayer = (p: ScorecardResult['players'][number], card: ScorecardResult) => {
    const holes = round.holes.map((h, i) => {
      const x = p.holes.find((y) => y.hole === i + 1)
      if (!x) return h
      return { par: x.par ?? h.par, strokes: x.strokes ?? h.strokes, putts: x.putts ?? h.putts }
    })
    const sub = [card.out_course_name, card.in_course_name].filter(Boolean).join(' → ')
    patch({
      holes,
      ...(card.date && /^\d{4}-\d{2}-\d{2}$/.test(card.date) && !editId ? { date: card.date } : {}),
      ...(!round.courseName && card.course_name ? { courseName: card.course_name } : {}),
      ...(sub && !round.courseSubName ? { courseSubName: sub } : {}),
    })
    setPlayers(null)
    setMessage(`「${p.name}」のスコアを反映しました。内容を確認してください。`)
  }

  const runScorecardOcr = async () => {
    if (!photos.scorecard.length) return setMessage('先にスコアカードの写真を追加してください')
    setBusy('scorecard')
    setMessage('')
    try {
      const { readScorecard } = await import('../lib/ocr')
      const card = await readScorecard(photos.scorecard.map((p) => p.blob))
      if (!card.players.length) throw new Error('スコアを読み取れませんでした')
      if (card.players.length === 1) applyPlayer(card.players[0], card)
      else setPlayers(card)
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy('')
    }
  }

  const runReceiptOcr = async () => {
    if (!photos.receipt.length) return setMessage('先に領収書の写真を追加してください')
    setBusy('receipt')
    setMessage('')
    try {
      const { readReceipt } = await import('../lib/ocr')
      const r = await readReceipt(photos.receipt.map((p) => p.blob))
      const items = r.items.filter((x) => x.amount)
      setFees([...round.fees, ...items.map((x) => ({ label: x.label, amount: x.amount }))])
      const sum = items.reduce((a, x) => a + x.amount, 0)
      setMessage(
        `領収書から ${items.length} 件を追加しました。` + (r.total && r.total !== sum ? `（領収書の合計 ${yen(r.total)} と明細の合計 ${yen(sum)} が一致しません。確認してください）` : ''),
      )
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy('')
    }
  }

  const save = async () => {
    if (!round.courseName.trim()) return setMessage('ゴルフ場を入力してください')
    setBusy('save')
    try {
      const pars = round.holes.map((h) => h.par)
      const { id: _cid, ...courseInfo } = course ?? { name: round.courseName }
      void _cid
      const courseId = await upsertCourse({ ...courseInfo, name: course?.name ?? round.courseName.trim(), holePars: pars })
      const data: Round = { ...round, courseName: round.courseName.trim(), courseId, fees: round.fees.filter((f) => f.label || f.amount), updatedAt: Date.now() }
      const roundId = await db.transaction('rw', db.rounds, db.photos, async () => {
        const rid = editId ?? ((await db.rounds.add(data)) as number)
        if (editId) await db.rounds.put({ ...data, id: editId })
        if (removed.length) await db.photos.bulkDelete(removed)
        const added = (Object.keys(photos) as PhotoKind[]).flatMap((kind) =>
          photos[kind].filter((p) => !p.id).map((p) => ({ roundId: rid, kind, blob: p.blob, createdAt: Date.now() })),
        )
        if (added.length) await db.photos.bulkAdd(added)
        return rid
      })
      navigate(`/rounds/${roundId}`, { replace: true })
    } catch (e) {
      setMessage((e as Error).message)
      setBusy('')
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <button type="button" className="btn ghost" onClick={() => navigate(-1)}>‹ 戻る</button>
        <h1>{editId ? 'ラウンドを編集' : 'ラウンドを記録'}</h1>
        <button type="button" className="btn primary" onClick={save} disabled={busy === 'save'}>保存</button>
      </header>

      <section className="card">
        <h2>いつ・どこで</h2>
        <div className="grid2">
          <label className="field">
            <span>プレー日</span>
            <input type="date" value={round.date} onChange={(e) => patch({ date: e.target.value })} />
          </label>
          <label className="field">
            <span>スタート時間</span>
            <input type="time" value={round.startTime ?? ''} onChange={(e) => patch({ startTime: e.target.value })} />
          </label>
        </div>
        <div className="field">
          <span>ゴルフ場</span>
          <button type="button" className="course-picker" onClick={() => setSearchOpen(true)}>
            {round.courseName || 'タップしてゴルフ場を検索'}
            {course?.address && <small>{course.address}</small>}
          </button>
        </div>
        <label className="field">
          <span>コース（OUT → IN）</span>
          <input value={round.courseSubName ?? ''} onChange={(e) => patch({ courseSubName: e.target.value })} placeholder="例: 東 → 西" />
        </label>
        <div className="field">
          <span>天気</span>
          <div className="chips">
            {WEATHER.map((w) => (
              <button key={w} type="button" className={`chip ${round.weather === w ? 'on' : ''}`} onClick={() => patch({ weather: round.weather === w ? undefined : w })}>
                {w}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>同伴者</span>
          <input value={round.companions ?? ''} onChange={(e) => patch({ companions: e.target.value })} placeholder="例: 山田さん、佐藤さん" />
        </label>
      </section>

      <section className="card">
        <h2>スコア</h2>
        <div className="ocr-box">
          <p className="hint">スコアカードを撮影すると、AIがホール毎の打数・パットを読み取ります。</p>
          <PhotoStrip photos={photos.scorecard} onAdd={addPhotos('scorecard')} onRemove={removePhoto('scorecard')} addLabel="画像から" />
          {photos.scorecard.length > 0 && (
            <button type="button" className="btn accent wide" onClick={runScorecardOcr} disabled={!!busy}>
              {busy === 'scorecard' ? 'スコアカードを読み取り中…' : '🤖 写真からスコアを読み取る'}
            </button>
          )}
        </div>
        <HoleEditor holes={round.holes} index={hole} onChange={setHoles} onIndex={setHole} />
        <ScorecardTable holes={round.holes} current={hole} onSelect={setHole} />
      </section>

      <section className="card">
        <h2>料金 <span className="sum-badge">{yen(feeTotal(round))}</span></h2>
        <div className="ocr-box">
          <p className="hint">領収書を撮影すると、AIが費目と金額を読み取ります。</p>
          <PhotoStrip photos={photos.receipt} onAdd={addPhotos('receipt')} onRemove={removePhoto('receipt')} addLabel="画像から" />
          {photos.receipt.length > 0 && (
            <button type="button" className="btn accent wide" onClick={runReceiptOcr} disabled={!!busy}>
              {busy === 'receipt' ? '領収書を読み取り中…' : '🤖 写真から料金を読み取る'}
            </button>
          )}
        </div>
        {round.fees.map((f, i) => (
          <div key={i} className="fee-row">
            <input list="fee-presets" value={f.label} placeholder="費目" onChange={(e) => setFees(round.fees.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <input type="number" inputMode="numeric" value={f.amount || ''} placeholder="金額" onChange={(e) => setFees(round.fees.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)))} />
            <button type="button" className="btn ghost" onClick={() => setFees(round.fees.filter((_, j) => j !== i))} aria-label="削除">×</button>
          </div>
        ))}
        <datalist id="fee-presets">
          {FEE_PRESETS.map((p) => <option key={p} value={p} />)}
        </datalist>
        <div className="chips">
          {FEE_PRESETS.slice(0, 5).map((p) => (
            <button key={p} type="button" className="chip" onClick={() => setFees([...round.fees, { label: p, amount: 0 }])}>＋{p}</button>
          ))}
          <button type="button" className="chip" onClick={() => setFees([...round.fees, { label: '', amount: 0 }])}>＋その他</button>
        </div>
      </section>

      <section className="card">
        <h2>食事</h2>
        <div className="field">
          <span>評価</span>
          <Stars value={round.meal.rating} onChange={(rating) => patch({ meal: { ...round.meal, rating } })} />
        </div>
        <label className="field">
          <span>メニュー</span>
          <input value={round.meal.menu} onChange={(e) => patch({ meal: { ...round.meal, menu: e.target.value } })} placeholder="例: カツカレー" />
        </label>
        <label className="field">
          <span>感想</span>
          <textarea rows={3} value={round.meal.comment} onChange={(e) => patch({ meal: { ...round.meal, comment: e.target.value } })} placeholder="味・ボリューム・雰囲気など" />
        </label>
        <PhotoStrip photos={photos.meal} onAdd={addPhotos('meal')} onRemove={removePhoto('meal')} />
      </section>

      <section className="card">
        <h2>メモ・写真</h2>
        <textarea rows={4} value={round.memo} onChange={(e) => patch({ memo: e.target.value })} placeholder="ラウンドの振り返り、コースの特徴など" />
        <PhotoStrip photos={photos.other} onAdd={addPhotos('other')} onRemove={removePhoto('other')} />
      </section>

      <button type="button" className="btn primary wide big" onClick={save} disabled={busy === 'save'}>
        {busy === 'save' ? '保存中…' : '保存する'}
      </button>

      {message && (
        <div className="toast" onClick={() => setMessage('')}>
          {message}
        </div>
      )}
      {searchOpen && <CourseSearch onSelect={selectCourse} onClose={() => setSearchOpen(false)} />}
      {players && (
        <div className="modal-back" onClick={() => setPlayers(null)}>
          <div className="modal small" onClick={(e) => e.stopPropagation()}>
            <h2>どのプレーヤーのスコアですか？</h2>
            {players.players.map((p, i) => (
              <button type="button" key={i} className="list-item" onClick={() => applyPlayer(p, players)}>
                <strong>{p.name}</strong>
                <small>合計 {p.holes.reduce((a, h) => a + (h.strokes ?? 0), 0)}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
