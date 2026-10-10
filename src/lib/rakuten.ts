import type { CourseInfo } from './types'
import { loadSettings } from './settings'

// 楽天ウェブサービス 楽天GORA API
// https://webservice.rakuten.co.jp/documentation/gora-golf-course-search
const BASE = 'https://app.rakuten.co.jp/services/api/Gora'
const SEARCH = `${BASE}/GoraGolfCourseSearch/20170623`
const DETAIL = `${BASE}/GoraGolfCourseDetail/20170623`

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県',
  '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県',
  '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

type Params = Record<string, string | number | undefined>

function buildUrl(base: string, params: Params) {
  const s = loadSettings()
  if (!s.rakutenAppId) throw new Error('設定画面で楽天アプリIDを登録してください')
  const u = new URL(base)
  u.searchParams.set('applicationId', s.rakutenAppId)
  if (s.rakutenAccessKey) u.searchParams.set('accessKey', s.rakutenAccessKey)
  u.searchParams.set('format', 'json')
  u.searchParams.set('formatVersion', '2')
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') u.searchParams.set(k, String(v))
  return u
}

let jsonpSeq = 0
function jsonp(url: URL): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const cb = `__gora_cb_${Date.now()}_${jsonpSeq++}`
    const script = document.createElement('script')
    const w = window as unknown as Record<string, unknown>
    const cleanup = () => {
      delete w[cb]
      script.remove()
    }
    w[cb] = (data: unknown) => {
      cleanup()
      resolve(data)
    }
    url.searchParams.set('callback', cb)
    script.src = url.toString()
    script.onerror = () => {
      cleanup()
      reject(new Error('楽天APIへの接続に失敗しました'))
    }
    document.head.appendChild(script)
  })
}

async function call(base: string, params: Params): Promise<Record<string, unknown>> {
  const url = buildUrl(base, params)
  let data: unknown
  try {
    const res = await fetch(url)
    data = await res.json()
  } catch {
    // CORS で弾かれる環境向けに JSONP で再試行
    data = await jsonp(url)
  }
  const obj = data as Record<string, unknown>
  if (obj.error) {
    const desc = String(obj.error_description ?? obj.error)
    if (obj.error === 'not_found') return {}
    throw new Error(`楽天API: ${desc}`)
  }
  return obj
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined)
const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : undefined
}

function toCourseInfo(it: Record<string, unknown>): CourseInfo {
  const images = [it.golfCourseImageUrl, it.golfCourseImageUrl1, it.golfCourseImageUrl2, it.golfCourseImageUrl3, it.golfCourseImageUrl4, it.golfCourseImageUrl5]
    .map(str)
    .filter((x): x is string => !!x)
  const ratingKeys: [string, string][] = [
    ['staff', 'スタッフ'], ['facility', '設備'], ['meal', '食事'], ['course', 'コース'],
    ['costperformance', 'コスパ'], ['distance', '距離'], ['fairway', 'フェアウェイ'],
  ]
  const ratings = ratingKeys
    .map(([k, label]) => ({ label, value: num(it[k]) }))
    .filter((r): r is { label: string; value: number } => r.value != null && r.value > 0)
  return {
    rakutenId: num(it.golfCourseId),
    name: str(it.golfCourseName) ?? '',
    kana: str(it.golfCourseNameKana),
    caption: str(it.golfCourseCaption),
    address: str(it.address),
    postalCode: str(it.postalCode),
    tel: str(it.telephoneNo),
    latitude: num(it.latitude),
    longitude: num(it.longitude),
    highway: str(it.highway),
    imageUrls: [...new Set(images)],
    evaluation: num(it.evaluation),
    ratingNum: num(it.ratingNum),
    detailUrl: str(it.golfCourseDetailUrl),
    reserveUrl: str(it.reserveCalUrl),
    layoutUrl: str(it.layoutUrl),
    routeMapUrl: str(it.routeMapUrl),
    courseType: str(it.courseType),
    designer: str(it.designer),
    green: str(it.green),
    holeCount: num(it.holeCount),
    parCount: num(it.parCount),
    courseDistance: str(it.courseDistance),
    weekdayMinPrice: num(it.weekdayMinPrice),
    holidayMinPrice: num(it.holidayMinPrice),
    dressCode: str(it.dressCode),
    practiceFacility: str(it.practiceFacility),
    otherFacility: str(it.otherFacility),
    creditCard: str(it.creditCard),
    closeDay: str(it.closeDay),
    ratings: ratings.length ? ratings : undefined,
  }
}

export async function searchCourses(keyword: string, areaCode?: number, page = 1) {
  const data = await call(SEARCH, { keyword: keyword || undefined, areaCode, page, hits: 30 })
  const items = (data.Items as Record<string, unknown>[] | undefined) ?? []
  return {
    items: items.map(toCourseInfo),
    pageCount: num(data.pageCount) ?? 1,
    page: num(data.page) ?? page,
  }
}

export async function getCourseDetail(golfCourseId: number): Promise<CourseInfo | null> {
  const data = await call(DETAIL, { golfCourseId })
  const item = data.Item as Record<string, unknown> | undefined
  return item ? toCourseInfo(item) : null
}

export function mapUrl(c: CourseInfo) {
  const q = c.latitude && c.longitude ? `${c.latitude},${c.longitude}` : `${c.name} ${c.address ?? ''}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}
