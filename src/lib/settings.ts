export interface Settings {
  anthropicApiKey: string
  rakutenAppId: string
  rakutenAccessKey: string
  playerName: string
  hashtags: string
}

const KEY = 'golf-score-settings'
const DEFAULTS: Settings = {
  anthropicApiKey: '',
  rakutenAppId: '',
  rakutenAccessKey: '',
  playerName: '',
  hashtags: '#ゴルフ #ゴルフスコア',
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // 保存できない環境（プライベートモード等）では無視
  }
}
