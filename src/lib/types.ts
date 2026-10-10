export interface HoleScore {
  par: number
  strokes: number | null
  putts: number | null
}

export interface FeeItem {
  label: string
  amount: number
}

export interface Meal {
  rating: number // 0〜5（0は未評価）
  menu: string
  comment: string
}

/** 楽天GORA API などから取得したゴルフ場情報 */
export interface CourseInfo {
  rakutenId?: number
  name: string
  kana?: string
  caption?: string
  address?: string
  postalCode?: string
  tel?: string
  latitude?: number
  longitude?: number
  highway?: string
  imageUrls?: string[]
  evaluation?: number
  ratingNum?: number
  detailUrl?: string
  reserveUrl?: string
  layoutUrl?: string
  routeMapUrl?: string
  courseType?: string
  designer?: string
  green?: string
  holeCount?: number
  parCount?: number
  courseDistance?: string
  weekdayMinPrice?: number
  holidayMinPrice?: number
  dressCode?: string
  practiceFacility?: string
  otherFacility?: string
  creditCard?: string
  closeDay?: string
  ratings?: { label: string; value: number }[]
}

export interface Course extends CourseInfo {
  id?: number
  /** 前回登録したホール毎のパー（次回入力時の初期値に使う） */
  holePars?: number[]
  memo?: string
  updatedAt: number
}

export interface Round {
  id?: number
  date: string // YYYY-MM-DD
  startTime?: string
  courseId?: number
  courseName: string
  courseSubName?: string // 例: 東→西
  weather?: string
  companions?: string
  holes: HoleScore[]
  fees: FeeItem[]
  meal: Meal
  memo: string
  createdAt: number
  updatedAt: number
}

export type PhotoKind = 'scorecard' | 'receipt' | 'meal' | 'other'

export interface Photo {
  id?: number
  roundId: number
  kind: PhotoKind
  blob: Blob
  createdAt: number
}

export const PHOTO_KIND_LABEL: Record<PhotoKind, string> = {
  scorecard: 'スコアカード',
  receipt: '領収書',
  meal: '食事',
  other: 'その他',
}

export const DEFAULT_PARS = [4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5]

export function emptyHoles(pars: number[] = DEFAULT_PARS): HoleScore[] {
  return Array.from({ length: 18 }, (_, i) => ({ par: pars[i] ?? 4, strokes: null, putts: null }))
}
