import { app, BrowserWindow, ipcMain, shell } from 'electron'
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
}

const defaultSettings: Settings = {
  alwaysOnTop: true,
  windowBounds: { x: 100, y: 100, width: 420, height: 560 },
  lastTab: 'memo',
  lastUrl: 'https://www.google.com',
  opacity: 100
}

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function getMemoPath(): string {
  return join(app.getPath('documents'), 'FloatPad', 'memo.txt')
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
    const dir = join(getSettingsPath(), '..')
    await fs.mkdir(dir, { recursive: true })
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
    const dir = join(getMemoPath(), '..')
    await fs.mkdir(dir, { recursive: true })
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
