import Dexie, { type EntityTable } from 'dexie'
import type { Course, Photo, Round } from './types'

export const db = new Dexie('golf-score') as Dexie & {
  rounds: EntityTable<Round, 'id'>
  courses: EntityTable<Course, 'id'>
  photos: EntityTable<Photo, 'id'>
}

db.version(1).stores({
  rounds: '++id, date, courseId',
  courses: '++id, rakutenId, name',
  photos: '++id, roundId, kind',
})

export async function deleteRound(id: number) {
  await db.transaction('rw', db.rounds, db.photos, async () => {
    await db.photos.where('roundId').equals(id).delete()
    await db.rounds.delete(id)
  })
}

/** 楽天IDまたは名前で既存のゴルフ場を探し、無ければ登録して id を返す */
export async function upsertCourse(info: Partial<Course> & { name: string }): Promise<number> {
  let existing: Course | undefined
  if (info.rakutenId) existing = await db.courses.where('rakutenId').equals(info.rakutenId).first()
  if (!existing) existing = await db.courses.where('name').equals(info.name).first()
  if (existing?.id != null) {
    await db.courses.update(existing.id, { ...info, updatedAt: Date.now() })
    return existing.id
  }
  return (await db.courses.add({ ...info, updatedAt: Date.now() })) as number
}
