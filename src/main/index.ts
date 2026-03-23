import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

interface Settings {
  alwaysOnTop: boolean
  windowBounds: WindowBounds
  lastTab: string
  lastUrl: string
  opacity: number
  memoDir: string  // 空文字 = user-data/ を使用
}

const defaultSettings: Settings = {
  alwaysOnTop: true,
  windowBounds: { x: 100, y: 100, width: 420, height: 560 },
  lastTab: 'memo',
  lastUrl: 'https://www.google.com',
  opacity: 100,
  memoDir: ''
}

// データはプロジェクトフォルダ内の user-data/ に保存
function getDataDir(): string {
  return join(app.getAppPath(), 'user-data')
}

function getSettingsPath(): string {
  return join(getDataDir(), 'settings.json')
}

function getMemoPath(): string {
  const dir = currentSettings.memoDir
  return dir ? join(dir, 'memo.txt') : join(getDataDir(), 'memo.txt')
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
    alwaysOnTop: true,
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

// IPC: メモ読み込み
ipcMain.handle('memo:load', async () => {
  try {
    return await fs.readFile(getMemoPath(), 'utf-8')
  } catch {
    return ''
  }
})

// IPC: メモ保存
ipcMain.handle('memo:save', async (_, text: string) => {
  try {
    await fs.mkdir(getDataDir(), { recursive: true })
    await fs.writeFile(getMemoPath(), text, 'utf-8')
    return true
  } catch (err) {
    console.error('メモの保存に失敗しました:', err)
    return false
  }
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
