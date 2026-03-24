import { app, BrowserWindow, ipcMain, shell, dialog, globalShortcut } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

interface MemoMeta {
  id: number
  name: string
}

interface SnippetItem {
  id: number
  title: string
  text: string
}

interface Settings {
  alwaysOnTop: boolean
  windowBounds: WindowBounds
  lastTab: string
  lastUrl: string
  opacity: number
  memoDir: string  // 空文字 = user-data/ を使用
  theme: 'auto' | 'light' | 'dark'
  accentColor: string
  activeMemoId: number
  showLineNumbers: boolean
  hotkey: string
}

const defaultSettings: Settings = {
  alwaysOnTop: true,
  windowBounds: { x: 100, y: 100, width: 420, height: 560 },
  lastTab: 'memo',
  lastUrl: 'https://www.google.com',
  opacity: 100,
  memoDir: '',
  theme: 'auto',
  accentColor: 'blue',
  activeMemoId: 1,
  showLineNumbers: false,
  hotkey: 'Ctrl+Shift+Space'
}

// データ保存先：
//   開発中 (npm run dev)  → プロジェクト内 user-data/  （確認しやすい）
//   パッケージ済み        → %APPDATA%\floatpad\        （書き込み可能な標準パス）
function getDataDir(): string {
  if (app.isPackaged) {
    return app.getPath('userData')
  }
  return join(app.getAppPath(), 'user-data')
}

function getSettingsPath(): string {
  return join(getDataDir(), 'settings.json')
}

function getMemoBaseDir(): string {
  return currentSettings.memoDir || getDataDir()
}

function getMemoListPath(): string {
  return join(getMemoBaseDir(), 'memos.json')
}

function getMemoFilePath(id: number): string {
  return join(getMemoBaseDir(), `memo-${id}.txt`)
}

async function loadMemoList(): Promise<MemoMeta[]> {
  try {
    const data = await fs.readFile(getMemoListPath(), 'utf-8')
    return JSON.parse(data) as MemoMeta[]
  } catch {
    // 旧 memo.txt からの移行
    const list: MemoMeta[] = [{ id: 1, name: 'メモ 1' }]
    const oldPath = join(getMemoBaseDir(), 'memo.txt')
    try {
      const oldContent = await fs.readFile(oldPath, 'utf-8')
      await fs.mkdir(getMemoBaseDir(), { recursive: true })
      await fs.writeFile(getMemoFilePath(1), oldContent, 'utf-8')
    } catch {
      // 旧ファイルなし: そのまま空のメモ1を使う
    }
    await saveMemoList(list)
    return list
  }
}

async function saveMemoList(list: MemoMeta[]): Promise<void> {
  await fs.mkdir(getDataDir(), { recursive: true })
  await fs.writeFile(getMemoListPath(), JSON.stringify(list, null, 2), 'utf-8')
}

async function loadSettings(): Promise<Settings> {
  try {
    const data = await fs.readFile(getSettingsPath(), 'utf-8')
    return { ...defaultSettings, ...(JSON.parse(data) as Partial<Settings>) }
  } catch {
    return { ...defaultSettings }
  }
}

async function saveSettings(data: Settings): Promise<void> {
  try {
    await fs.mkdir(getDataDir(), { recursive: true })
    await fs.writeFile(getSettingsPath(), JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('設定の保存に失敗しました:', err)
  }
}

let currentSettings: Settings = { ...defaultSettings }
// ミニモード用: 折りたたむ前の高さを記録
let savedWindowHeight = 560

async function createWindow(): Promise<void> {
  currentSettings = await loadSettings()
  const { x, y, width, height } = currentSettings.windowBounds

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 320,
    minHeight: 400,
    frame: false,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true
    }
  })

  // 保存された透過度を反映
  if (currentSettings.opacity < 100) {
    win.setOpacity(currentSettings.opacity / 100)
  }

  // グローバルホットキー登録
  function registerHotkey(accelerator: string): void {
    globalShortcut.unregisterAll()
    const ok = globalShortcut.register(accelerator, () => {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    })
    if (!ok) {
      console.error('グローバルホットキーの登録に失敗しました:', accelerator)
    }
  }
  registerHotkey(currentSettings.hotkey || 'Ctrl+Shift+Space')

  // ウィンドウ閉時に位置・サイズを保存
  win.on('close', () => {
    const bounds = win.getBounds()
    currentSettings.windowBounds = bounds
    saveSettings(currentSettings).catch(console.error)
  })

  // 開発時はViteのdev server、本番時はビルド済みファイルをロード
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC: メモ一覧取得
ipcMain.handle('memo:list', async () => {
  return await loadMemoList()
})

// IPC: メモ読み込み
ipcMain.handle('memo:load', async (_, id: number) => {
  try {
    return await fs.readFile(getMemoFilePath(id), 'utf-8')
  } catch {
    return ''
  }
})

// IPC: メモ保存
ipcMain.handle('memo:save', async (_, id: number, text: string) => {
  try {
    await fs.mkdir(getMemoBaseDir(), { recursive: true })
    await fs.writeFile(getMemoFilePath(id), text, 'utf-8')
    return true
  } catch (err) {
    console.error('メモの保存に失敗しました:', err)
    return false
  }
})

// IPC: メモ新規作成
ipcMain.handle('memo:create', async (_, name: string) => {
  const list = await loadMemoList()
  const maxId = list.reduce((max, m) => Math.max(max, m.id), 0)
  const newMemo: MemoMeta = { id: maxId + 1, name }
  list.push(newMemo)
  await saveMemoList(list)
  return newMemo
})

// IPC: メモ削除
ipcMain.handle('memo:delete', async (_, id: number) => {
  try {
    await fs.unlink(getMemoFilePath(id))
  } catch { /* ファイルなしは無視 */ }
  const list = await loadMemoList()
  await saveMemoList(list.filter((m) => m.id !== id))
  return true
})

// IPC: メモ名変更
ipcMain.handle('memo:rename', async (_, id: number, name: string) => {
  const list = await loadMemoList()
  const memo = list.find((m) => m.id === id)
  if (memo) {
    memo.name = name
    await saveMemoList(list)
    return true
  }
  return false
})

// IPC: 設定読み込み
ipcMain.handle('settings:load', async () => {
  return currentSettings
})

// IPC: 設定保存
ipcMain.handle('settings:save', async (_, data: Partial<Settings>) => {
  currentSettings = { ...currentSettings, ...data }
  await saveSettings(currentSettings)
  return true
})

// IPC: 透過度変更
ipcMain.handle('window:setOpacity', async (event, opacity: number) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.setOpacity(Math.max(0.3, Math.min(1, opacity / 100)))
    currentSettings.opacity = opacity
    await saveSettings(currentSettings)
  }
  return true
})

// IPC: フォルダ選択ダイアログ
ipcMain.handle('dialog:chooseFolder', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(win!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'メモ保存フォルダを選択'
  })
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

// IPC: グローバルホットキー更新
ipcMain.handle('globalShortcut:update', async (_, accelerator: string) => {
  try {
    globalShortcut.unregisterAll()
    const wins = BrowserWindow.getAllWindows()
    if (wins.length === 0) return false
    const win = wins[0]
    const ok = globalShortcut.register(accelerator, () => {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    })
    if (ok) {
      currentSettings.hotkey = accelerator
      await saveSettings(currentSettings)
    }
    return ok
  } catch (err) {
    console.error('ホットキー更新エラー:', err)
    return false
  }
})

// IPC: ミニモード切り替え
ipcMain.handle('window:setMini', async (event, mini: boolean) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return false
  if (mini) {
    savedWindowHeight = win.getBounds().height
    win.setMinimumSize(320, 34)
    win.setSize(win.getBounds().width, 34)
  } else {
    win.setMinimumSize(320, 400)
    win.setSize(win.getBounds().width, savedWindowHeight)
  }
  return true
})

// IPC: 定型文読み込み
ipcMain.handle('snippets:load', async () => {
  try {
    const filePath = join(getDataDir(), 'snippets.json')
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data) as SnippetItem[]
  } catch {
    return []
  }
})

// IPC: 定型文保存
ipcMain.handle('snippets:save', async (_, data: SnippetItem[]) => {
  try {
    await fs.mkdir(getDataDir(), { recursive: true })
    const filePath = join(getDataDir(), 'snippets.json')
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('定型文の保存に失敗しました:', err)
    return false
  }
})

// target="_blank" リンクをシステムブラウザで開く
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(console.error)
    return { action: 'deny' }
  })
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
