export {}

interface Settings {
  alwaysOnTop: boolean
  windowBounds: { x: number; y: number; width: number; height: number }
  lastTab: string
  lastUrl: string
  opacity: number
}

declare global {
  interface Window {
    api: {
      memoSave: (text: string) => Promise<boolean>
      memoLoad: () => Promise<string>
      settingsSave: (data: object) => Promise<boolean>
      settingsLoad: () => Promise<Settings>
    }
  }
}
