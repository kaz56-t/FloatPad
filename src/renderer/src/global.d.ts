export {}

declare global {
  interface MemoMeta {
    id: number
    name: string
  }

  interface SnippetItem {
    id: number
    title?: string
    text: string
  }
}

interface Settings {
  alwaysOnTop: boolean
  windowBounds: { x: number; y: number; width: number; height: number }
  lastTab: string
  lastUrl: string
  opacity: number
  memoDir: string
  theme: 'auto' | 'light' | 'dark'
  accentColor: string
  activeMemoId: number
  showLineNumbers: boolean
  fontSize: number
  hotkey: string
}

declare global {
  interface Window {
    api: {
      memoList: () => Promise<MemoMeta[]>
      memoSave: (id: number, text: string) => Promise<boolean>
      memoLoad: (id: number) => Promise<string>
      memoCreate: (name: string) => Promise<MemoMeta>
      memoDelete: (id: number) => Promise<boolean>
      memoRename: (id: number, name: string) => Promise<boolean>
      settingsSave: (data: object) => Promise<boolean>
      settingsLoad: () => Promise<Settings>
      windowSetOpacity: (opacity: number) => Promise<boolean>
      windowSetMini: (mini: boolean) => Promise<boolean>
      chooseFolder: () => Promise<string | null>
      globalShortcutUpdate: (accelerator: string) => Promise<boolean>
      snippetsLoad: () => Promise<SnippetItem[]>
      snippetsSave: (data: SnippetItem[]) => Promise<boolean>
    }
  }
}
