import { db } from './db'
import { blobToDataUrl, dataUrlToBlob } from './image'
import type { Course, Photo, Round } from './types'

interface BackupFile {
  app: 'golf-score'
  version: 1
  exportedAt: string
  rounds: Round[]
  courses: Course[]
  photos: (Omit<Photo, 'blob'> & { dataUrl: string })[]
}

export async function exportBackup(): Promise<Blob> {
  const [rounds, courses, photos] = await Promise.all([db.rounds.toArray(), db.courses.toArray(), db.photos.toArray()])
  const data: BackupFile = {
    app: 'golf-score',
    version: 1,
    exportedAt: new Date().toISOString(),
    rounds,
    courses,
    photos: await Promise.all(photos.map(async ({ blob, ...p }) => ({ ...p, dataUrl: await blobToDataUrl(blob) }))),
  }
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

/** バックアップを読み込み、既存データを置き換える */
export async function importBackup(file: Blob) {
  const data = JSON.parse(await file.text()) as BackupFile
  if (data.app !== 'golf-score') throw new Error('このアプリのバックアップファイルではありません')
  const photos: Photo[] = await Promise.all(data.photos.map(async ({ dataUrl, ...p }) => ({ ...p, blob: await dataUrlToBlob(dataUrl) })))
  await db.transaction('rw', db.rounds, db.courses, db.photos, async () => {
    await Promise.all([db.rounds.clear(), db.courses.clear(), db.photos.clear()])
    await db.rounds.bulkAdd(data.rounds)
    await db.courses.bulkAdd(data.courses)
    await db.photos.bulkAdd(photos)
  })
  return { rounds: data.rounds.length, courses: data.courses.length, photos: photos.length }
}
