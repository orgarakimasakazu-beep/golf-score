import type { CourseInfo } from '../lib/types'
import { mapUrl } from '../lib/rakuten'
import { yen } from '../lib/score'

export default function CourseInfoCard({ course }: { course: CourseInfo }) {
  const rows: [string, string | undefined][] = [
    ['住所', course.address && `${course.postalCode ? '〒' + course.postalCode + ' ' : ''}${course.address}`],
    ['電話', course.tel],
    ['アクセス', course.highway],
    ['コース', [course.courseType, course.holeCount && `${course.holeCount}H`, course.parCount && `Par${course.parCount}`, course.courseDistance].filter(Boolean).join(' / ') || undefined],
    ['グリーン', course.green],
    ['設計', course.designer],
    ['料金目安', course.weekdayMinPrice || course.holidayMinPrice ? `平日 ${course.weekdayMinPrice ? yen(course.weekdayMinPrice) + '〜' : '-'} / 休日 ${course.holidayMinPrice ? yen(course.holidayMinPrice) + '〜' : '-'}` : undefined],
    ['練習場', course.practiceFacility],
    ['ドレスコード', course.dressCode],
    ['定休日', course.closeDay],
    ['カード', course.creditCard],
    ['その他', course.otherFacility],
  ]
  return (
    <div className="course-card">
      {course.imageUrls && course.imageUrls.length > 0 && (
        <div className="course-images">
          {course.imageUrls.map((u) => (
            <img key={u} src={u} alt="" loading="lazy" />
          ))}
        </div>
      )}
      <h3>{course.name}</h3>
      {course.kana && <p className="kana">{course.kana}</p>}
      {course.evaluation ? (
        <p className="eval">
          ★ {course.evaluation.toFixed(1)}
          {course.ratingNum ? <small>（{course.ratingNum}件のクチコミ）</small> : null}
        </p>
      ) : null}
      {course.ratings && (
        <div className="ratings">
          {course.ratings.map((r) => (
            <div key={r.label} className="rating">
              <span>{r.label}</span>
              <span className="bar"><i style={{ width: `${(r.value / 5) * 100}%` }} /></span>
              <span>{r.value.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
      {course.caption && <p className="caption">{course.caption}</p>}
      <dl className="info">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{k === '電話' ? <a href={`tel:${v}`}>{v}</a> : v}</dd>
          </div>
        ))}
      </dl>
      <div className="links">
        {(course.address || course.latitude) && <a className="btn" href={mapUrl(course)} target="_blank" rel="noreferrer">地図</a>}
        {course.detailUrl && <a className="btn" href={course.detailUrl} target="_blank" rel="noreferrer">楽天GORA</a>}
        {course.reserveUrl && <a className="btn" href={course.reserveUrl} target="_blank" rel="noreferrer">予約</a>}
        {course.layoutUrl && <a className="btn" href={course.layoutUrl} target="_blank" rel="noreferrer">コースレイアウト</a>}
        {course.routeMapUrl && <a className="btn" href={course.routeMapUrl} target="_blank" rel="noreferrer">ルートマップ</a>}
      </div>
    </div>
  )
}
