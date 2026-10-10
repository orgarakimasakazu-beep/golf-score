import { useRef, useState } from 'react'
import { loadSettings, saveSettings, type Settings as S } from '../lib/settings'
import { exportBackup, importBackup } from '../lib/backup'
import { downloadBlob } from '../lib/share'

export default function Settings() {
  const [s, setS] = useState<S>(loadSettings)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (p: Partial<S>) => setS((x) => ({ ...x, ...p }))

  const save = () => {
    saveSettings(s)
    setMsg('保存しました')
  }

  const doExport = async () => {
    const d = new Date()
    downloadBlob(await exportBackup(), `golf-score-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`)
  }

  const doImport = async (file?: File) => {
    if (!file) return
    if (!confirm('バックアップを読み込むと、現在のデータはすべて置き換えられます。よろしいですか？')) return
    try {
      const r = await importBackup(file)
      setMsg(`読み込みました（ラウンド ${r.rounds}件 / ゴルフ場 ${r.courses}件 / 写真 ${r.photos}枚）`)
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  return (
    <div className="page">
      <header className="app-head">
        <h1>設定</h1>
      </header>

      <section className="card">
        <h2>写真の読み取り（Claude API）</h2>
        <label className="field">
          <span>Anthropic API キー</span>
          <input type="password" autoComplete="off" value={s.anthropicApiKey} onChange={(e) => set({ anthropicApiKey: e.target.value.trim() })} placeholder="sk-ant-..." />
        </label>
        <p className="hint">
          <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer">Claude Console</a> で発行したキーを入力してください。キーはこの端末内にのみ保存され、読み取り時に Anthropic へ直接送信されます。利用料金は従量課金です。
        </p>
        <label className="field">
          <span>スコアカード上の自分の名前</span>
          <input value={s.playerName} onChange={(e) => set({ playerName: e.target.value })} placeholder="例: 山田" />
        </label>
      </section>

      <section className="card">
        <h2>ゴルフ場情報（楽天GORA API）</h2>
        <label className="field">
          <span>楽天アプリID（applicationId）</span>
          <input value={s.rakutenAppId} onChange={(e) => set({ rakutenAppId: e.target.value.trim() })} />
        </label>
        <label className="field">
          <span>アクセスキー（accessKey・発行された場合のみ）</span>
          <input type="password" autoComplete="off" value={s.rakutenAccessKey} onChange={(e) => set({ rakutenAccessKey: e.target.value.trim() })} />
        </label>
        <p className="hint">
          <a href="https://webservice.rakuten.co.jp/" target="_blank" rel="noreferrer">楽天ウェブサービス</a> でアプリを登録して取得してください（無料）。アプリ登録時の「許可されたWebサイト」に、このアプリのURLのドメインを登録してください。
        </p>
      </section>

      <section className="card">
        <h2>SNS投稿</h2>
        <label className="field">
          <span>ハッシュタグ</span>
          <input value={s.hashtags} onChange={(e) => set({ hashtags: e.target.value })} />
        </label>
      </section>

      <button type="button" className="btn primary wide big" onClick={save}>設定を保存</button>
      {msg && <p className="note center">{msg}</p>}

      <section className="card">
        <h2>データのバックアップ</h2>
        <p className="hint">データはこの端末のブラウザ内に保存されています。機種変更やブラウザのデータ削除に備えて、定期的にバックアップしてください。</p>
        <div className="grid2">
          <button type="button" className="btn" onClick={doExport}>バックアップを保存</button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>バックアップを読込</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { doImport(e.target.files?.[0]); e.target.value = '' }} />
      </section>
    </div>
  )
}
