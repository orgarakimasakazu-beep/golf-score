import type { Round } from './types'
import { formatDate, half, scoreClass, totals } from './score'

const W = 1080
const H = 1350

const COLORS: Record<string, string> = {
  ace: '#c2185b',
  eagle: '#c2185b',
  birdie: '#e53935',
  par: '#1b1b1b',
  bogey: '#1e5bb8',
  dbogey: '#283593',
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight = 'bold') {
  let s = size
  do {
    ctx.font = `${weight} ${s}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
    s -= 2
  } while (ctx.measureText(text).width > maxWidth && s > 20)
}

/** SNS投稿用のスコア画像（Instagram 4:5 縦長）を生成 */
export async function renderShareImage(round: Round, photo?: Blob): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const t = totals(round.holes)

  // 背景
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#1f7a3a')
  g.addColorStop(1, '#0f4d24')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  if (photo) {
    const bmp = await createImageBitmap(photo).catch(() => null)
    if (bmp) {
      const scale = Math.max(W / bmp.width, 560 / bmp.height)
      const dw = bmp.width * scale
      const dh = bmp.height * scale
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, W, 560)
      ctx.clip()
      ctx.drawImage(bmp, (W - dw) / 2, (560 - dh) / 2, dw, dh)
      const shade = ctx.createLinearGradient(0, 200, 0, 560)
      shade.addColorStop(0, 'rgba(15,77,36,0)')
      shade.addColorStop(1, 'rgba(15,77,36,0.95)')
      ctx.fillStyle = shade
      ctx.fillRect(0, 0, W, 560)
      ctx.restore()
      bmp.close()
    }
  }

  // ヘッダー
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '500 40px "Hiragino Sans", "Noto Sans JP", sans-serif'
  ctx.fillText(formatDate(round.date), 64, photo ? 360 : 120)
  fitText(ctx, round.courseName || 'ゴルフ場', W - 128, 64)
  ctx.fillText(round.courseName || 'ゴルフ場', 64, photo ? 440 : 210)
  if (round.courseSubName) {
    ctx.font = '500 34px "Hiragino Sans", "Noto Sans JP", sans-serif'
    ctx.fillText(round.courseSubName, 64, photo ? 494 : 264)
  }

  // スコア大表示
  const top = photo ? 590 : 330
  ctx.font = 'bold 200px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(String(t.strokes || '-'), 64, top + 170)
  const scoreW = ctx.measureText(String(t.strokes || '-')).width
  ctx.font = '500 40px "Hiragino Sans", "Noto Sans JP", sans-serif'
  const diff = t.strokes - t.par
  ctx.fillText(`(${diff > 0 ? '+' : ''}${diff})`, 64 + scoreW + 20, top + 170)

  ctx.textAlign = 'right'
  ctx.font = '500 36px "Hiragino Sans", "Noto Sans JP", sans-serif'
  const o = half(round.holes, 'out')
  const i = half(round.holes, 'in')
  ctx.fillText(`OUT ${o.strokes}  /  IN ${i.strokes}`, W - 64, top + 90)
  ctx.fillText(`パット ${t.putts || '-'}`, W - 64, top + 160)
  ctx.textAlign = 'left'

  // スコア表
  const tableTop = top + 230
  const cardH = H - tableTop - 90
  ctx.fillStyle = '#fff'
  roundRect(ctx, 40, tableTop, W - 80, cardH, 24)
  ctx.fill()

  const cellW = (W - 80 - 40) / 10
  const drawHalf = (start: number, y: number, label: string, total: number) => {
    const rowH = (cardH - 40) / 2 / 3
    ctx.textAlign = 'center'
    for (let k = 0; k < 10; k++) {
      const x = 60 + cellW * k + cellW / 2
      const hIdx = start + k
      ctx.fillStyle = '#6b7a70'
      ctx.font = '500 26px "Helvetica Neue", Arial, sans-serif'
      ctx.fillText(k < 9 ? String(hIdx + 1) : label, x, y + rowH * 0.7)
      ctx.font = '500 24px "Helvetica Neue", Arial, sans-serif'
      ctx.fillText(k < 9 ? `P${round.holes[hIdx].par}` : '', x, y + rowH * 1.5)
      if (k < 9) {
        const h = round.holes[hIdx]
        const cls = scoreClass(h.strokes, h.par)
        ctx.fillStyle = COLORS[cls] ?? '#1b1b1b'
        ctx.font = 'bold 44px "Helvetica Neue", Arial, sans-serif'
        ctx.fillText(h.strokes == null ? '-' : String(h.strokes), x, y + rowH * 2.6)
        if (cls === 'birdie' || cls === 'eagle' || cls === 'ace') {
          ctx.strokeStyle = COLORS[cls]
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(x, y + rowH * 2.6 - 15, 32, 0, Math.PI * 2)
          ctx.stroke()
        }
      } else {
        ctx.fillStyle = '#1f7a3a'
        ctx.font = 'bold 44px "Helvetica Neue", Arial, sans-serif'
        ctx.fillText(String(total), x, y + rowH * 2.6)
      }
    }
    ctx.textAlign = 'left'
  }
  drawHalf(0, tableTop + 20, 'OUT', o.strokes)
  ctx.strokeStyle = '#e1e7e2'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(70, tableTop + cardH / 2)
  ctx.lineTo(W - 70, tableTop + cardH / 2)
  ctx.stroke()
  drawHalf(9, tableTop + cardH / 2, 'IN', i.strokes)

  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '500 28px "Hiragino Sans", "Noto Sans JP", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('⛳ ゴルフスコア管理', W - 64, H - 36)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('画像生成に失敗しました'))), 'image/png'))
}

export function shareText(round: Round, hashtags: string) {
  const t = totals(round.holes)
  const lines = [
    `${formatDate(round.date)} ${round.courseName}`,
    `スコア ${t.strokes}（OUT ${t.out.strokes} / IN ${t.in.strokes}）パット ${t.putts}`,
  ]
  if (round.meal.menu) lines.push(`ランチ: ${round.meal.menu}${round.meal.rating ? ' ' + '★'.repeat(round.meal.rating) : ''}`)
  if (hashtags.trim()) lines.push(hashtags.trim())
  return lines.join('\n')
}

export type ShareResult = 'shared' | 'cancelled' | 'unsupported'

/** OS の共有シート（X・Instagram 等）で画像とテキストを共有 */
export async function shareNative(image: Blob, text: string): Promise<ShareResult> {
  const file = new File([image], 'golf-score.png', { type: 'image/png' })
  const data: ShareData = { files: [file], text }
  if (!navigator.canShare?.(data)) return 'unsupported'
  try {
    await navigator.share(data)
    return 'shared'
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return 'cancelled'
    throw e
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function xIntentUrl(text: string) {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`
}
