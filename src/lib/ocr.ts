import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { blobToBase64, resizeImage } from './image'
import { loadSettings } from './settings'

const MODEL = 'claude-opus-5-5'

const HoleSchema = z.object({
  hole: z.number().describe('ホール番号 1〜18'),
  par: z.number().nullable(),
  strokes: z.number().nullable().describe('そのホールの総打数（パット含む）'),
  putts: z.number().nullable(),
})

const ScorecardSchema = z.object({
  course_name: z.string().nullable(),
  date: z.string().nullable().describe('YYYY-MM-DD 形式。読み取れなければ null'),
  out_course_name: z.string().nullable().describe('前半(OUT)のコース名。例: 東コース'),
  in_course_name: z.string().nullable().describe('後半(IN)のコース名'),
  players: z.array(
    z.object({
      name: z.string().describe('スコアカードに書かれたプレーヤー名。無ければ「プレーヤー1」等'),
      holes: z.array(HoleSchema),
    }),
  ),
})
export type ScorecardResult = z.infer<typeof ScorecardSchema>

const ReceiptSchema = z.object({
  facility_name: z.string().nullable(),
  date: z.string().nullable().describe('YYYY-MM-DD 形式'),
  items: z.array(z.object({ label: z.string(), amount: z.number().describe('税込金額（円）') })),
  total: z.number().nullable().describe('領収書の合計金額（円）'),
})
export type ReceiptResult = z.infer<typeof ReceiptSchema>

function client() {
  const { anthropicApiKey } = loadSettings()
  if (!anthropicApiKey) throw new Error('設定画面で Anthropic API キーを登録してください')
  // 個人利用のPWAとして、利用者自身のAPIキーを端末内に保存してブラウザから直接呼び出す
  return new Anthropic({ apiKey: anthropicApiKey, dangerouslyAllowBrowser: true })
}

async function imageBlocks(images: Blob[]) {
  return Promise.all(
    images.map(async (img) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: await blobToBase64(await resizeImage(img, 1568, 0.9)) },
    })),
  )
}

async function extract<T>(images: Blob[], instruction: string, schema: z.ZodType<T>): Promise<T> {
  const res = await client().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(schema) },
    messages: [{ role: 'user', content: [...(await imageBlocks(images)), { type: 'text', text: instruction }] }],
  })
  if (res.stop_reason === 'refusal') throw new Error('画像を読み取れませんでした（リクエストが拒否されました）')
  if (res.stop_reason === 'max_tokens') throw new Error('読み取り結果が長すぎて途中で切れました')
  if (!res.parsed_output) throw new Error('読み取り結果を解析できませんでした')
  return res.parsed_output as T
}

export async function readScorecard(images: Blob[]): Promise<ScorecardResult> {
  const { playerName } = loadSettings()
  return extract(
    images,
    `これはゴルフのスコアカードの写真です。記載されている全プレーヤーについて、ホール毎のパー・打数・パット数を読み取ってください。
- 打数は「そのホールの総打数」です。カードが「パット以外の打数＋パット数」や「パーとの差（+1, -1, 0 等）」で書かれている場合は、総打数に換算してください。
- 読み取れない値は推測せず null にしてください。
- 手書きの数字は丁寧に判読してください。
${playerName ? `- 利用者のプレーヤー名は「${playerName}」です。該当する行を players の先頭にしてください。` : ''}`,
    ScorecardSchema,
  )
}

export async function readReceipt(images: Blob[]): Promise<ReceiptResult> {
  return extract(
    images,
    `これはゴルフ場などの領収書・明細書の写真です。費目ごとの金額（税込・円）と合計金額を読み取ってください。
- 費目の例: プレー代、キャディフィ、カート代、利用税、食事、売店、ロッカー、練習場 など。明細の表記をそのまま短く使ってください。
- 読み取れない値は推測せず null にしてください（items には読み取れたものだけを入れてください）。`,
    ReceiptSchema,
  )
}
