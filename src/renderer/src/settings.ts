// アクセントカラープリセット
const ACCENT_COLORS: Record<string, { accent: string; hover: string }> = {
  blue:   { accent: '#4a9eff', hover: '#65adff' },
  green:  { accent: '#48bb78', hover: '#68d391' },
  orange: { accent: '#ed8936', hover: '#f6ad55' },
  purple: { accent: '#9f7aea', hover: '#b794f4' },
  pink:   { accent: '#fc8181', hover: '#feb2b2' },
}

// OSのダークモード判定
function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// テーマをDOMに適用
export function applyTheme(theme: string, accentColor: string): void {
  const html = document.documentElement
  if (theme === 'auto') {
    html.setAttribute('data-theme', prefersDark() ? 'dark' : 'light')
  } else {
    html.setAttribute('data-theme', theme)
  }

  const colors = ACCENT_COLORS[accentColor] ?? ACCENT_COLORS.blue
  html.style.setProperty('--accent', colors.accent)
  html.style.setProperty('--accent-hover', colors.hover)
}

export function applyFontSize(size: number): void {
  document.documentElement.style.setProperty('--memo-font-size', `${size}px`)
}

export function initSettings(): void {
  const memoDirInput = document.getElementById('memo-dir-input') as HTMLInputElement
  const memoDirBrowse = document.getElementById('memo-dir-browse') as HTMLButtonElement
  const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement
  const opacityValue = document.getElementById('opacity-value')!
  const fontSizeSlider = document.getElementById('font-size-slider') as HTMLInputElement
  const fontSizeValue = document.getElementById('font-size-value')!
  const resetBtn = document.getElementById('settings-reset') as HTMLButtonElement
  const themeBtns = document.querySelectorAll<HTMLButtonElement>('.theme-btn')
  const accentSwatches = document.querySelectorAll<HTMLButtonElement>('.accent-swatch')

  // 現在の設定を反映
  window.api.settingsLoad().then((settings) => {
    memoDirInput.value = settings.memoDir || ''
    const op = settings.opacity ?? 100
    opacitySlider.value = String(op)
    opacityValue.textContent = `${op}%`
    const fs = settings.fontSize ?? 14
    fontSizeSlider.value = String(fs)
    fontSizeValue.textContent = `${fs}px`
    applyFontSize(fs)
    setActiveTheme(settings.theme ?? 'auto')
    setActiveAccent(settings.accentColor ?? 'blue')
  }).catch(console.error)

  // テーマボタンのアクティブ状態を更新
  function setActiveTheme(theme: string): void {
    themeBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.theme === theme))
  }

  // アクセントスウォッチのアクティブ状態を更新
  function setActiveAccent(accentColor: string): void {
    accentSwatches.forEach((s) => s.classList.toggle('active', s.dataset.accent === accentColor))
  }

  // テーマ切り替え
  themeBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const theme = (btn.dataset.theme ?? 'auto') as 'auto' | 'light' | 'dark'
      setActiveTheme(theme)
      applyTheme(theme, getActiveAccent())
      const settings = await window.api.settingsLoad()
      await window.api.settingsSave({ ...settings, theme })
    })
  })

  function getActiveAccent(): string {
    return document.querySelector<HTMLButtonElement>('.accent-swatch.active')?.dataset.accent ?? 'blue'
  }

  // アクセントカラー切り替え
  accentSwatches.forEach((swatch) => {
    swatch.addEventListener('click', async () => {
      const accentColor = swatch.dataset.accent ?? 'blue'
      setActiveAccent(accentColor)
      const settings = await window.api.settingsLoad()
      applyTheme(settings.theme ?? 'auto', accentColor)
      await window.api.settingsSave({ ...settings, accentColor })
    })
  })

  // OSテーマ変更を監視（Autoモード時のみ反映）
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const settings = await window.api.settingsLoad()
    if ((settings.theme ?? 'auto') === 'auto') {
      applyTheme('auto', settings.accentColor ?? 'blue')
    }
  })

  // フォルダ選択
  memoDirBrowse.addEventListener('click', async () => {
    const folder = await window.api.chooseFolder()
    if (folder) {
      memoDirInput.value = folder
      const settings = await window.api.settingsLoad()
      await window.api.settingsSave({ ...settings, memoDir: folder })
    }
  })

  // 透過度スライダー
  opacitySlider.addEventListener('input', () => {
    const value = parseInt(opacitySlider.value)
    opacityValue.textContent = `${value}%`
    window.api.windowSetOpacity(value).catch(console.error)
  })

  // フォントサイズスライダー
  fontSizeSlider.addEventListener('input', async () => {
    const size = parseInt(fontSizeSlider.value)
    fontSizeValue.textContent = `${size}px`
    applyFontSize(size)
    const settings = await window.api.settingsLoad()
    await window.api.settingsSave({ ...settings, fontSize: size })
  })

  // デフォルトに戻す
  resetBtn.addEventListener('click', async () => {
    memoDirInput.value = ''
    opacitySlider.value = '100'
    opacityValue.textContent = '100%'
    fontSizeSlider.value = '14'
    fontSizeValue.textContent = '14px'
    applyFontSize(14)
    setActiveTheme('auto')
    setActiveAccent('blue')
    applyTheme('auto', 'blue')
    const settings = await window.api.settingsLoad()
    await window.api.settingsSave({ ...settings, memoDir: '', opacity: 100, theme: 'auto', accentColor: 'blue', fontSize: 14 })
    await window.api.windowSetOpacity(100)
  })
}
