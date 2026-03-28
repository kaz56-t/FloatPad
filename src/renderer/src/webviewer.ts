import { invoke } from '@tauri-apps/api/core'

// webview 要素の最小限の型定義
interface WebviewElement extends HTMLElement {
  src: string
  getURL(): string
  canGoBack(): boolean
  canGoForward(): boolean
  goBack(): void
  goForward(): void
  reload(): void
  setZoomFactor(factor: number): void
  getZoomFactor(): number
}

const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0]
const ZOOM_STEPS_REVERSED = [...ZOOM_STEPS].reverse()

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function initWebViewer(): void {
  if (isTauri()) {
    initWebViewerTauri()
  } else {
    initWebViewerElectron()
  }
}

// ===== Tauri 版: WebviewWindow を別ウィンドウで表示 =====

function initWebViewerTauri(): void {
  const urlInput = document.getElementById('web-url') as HTMLInputElement
  const backBtn = document.getElementById('web-back')!
  const forwardBtn = document.getElementById('web-forward')!
  const reloadBtn = document.getElementById('web-reload')!
  const webContent = document.getElementById('web-content')!
  const zoomOutBtn = document.getElementById('web-zoom-out') as HTMLButtonElement | null
  const zoomInBtn = document.getElementById('web-zoom-in') as HTMLButtonElement | null
  const zoomLevelBtn = document.getElementById('web-zoom-level') as HTMLButtonElement | null
  const panelWeb = document.getElementById('panel-web')!

  // <webview> を非表示にして代わりにメッセージを表示
  const webviewEl = document.getElementById('webview')
  if (webviewEl) webviewEl.style.display = 'none'
  const spinnerEl = document.getElementById('web-spinner')
  if (spinnerEl) spinnerEl.style.display = 'none'

  const placeholder = document.createElement('div')
  placeholder.style.cssText =
    'display:flex;align-items:center;justify-content:center;height:100%;' +
    'color:var(--text-dim);font-size:13px;text-align:center;padding:16px;'
  placeholder.textContent = 'Webコンテンツは別ウィンドウで表示されます\nURLを入力してEnterで開く'
  webContent.appendChild(placeholder)

  // ズームボタンは別ウィンドウのため無効化
  if (zoomOutBtn) zoomOutBtn.disabled = true
  if (zoomInBtn) zoomInBtn.disabled = true
  if (zoomLevelBtn) zoomLevelBtn.disabled = true

  async function navigate(rawUrl: string): Promise<void> {
    let url = rawUrl.trim()
    if (!url) return
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url
      } else {
        url = 'https://www.google.com/search?q=' + encodeURIComponent(url)
      }
    }
    urlInput.value = url
    await invoke('webviewer_navigate', { url })
    window.api.settingsLoad()
      .then((s) => window.api.settingsSave({ ...s, lastUrl: url }))
      .catch(console.error)
  }

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigate(urlInput.value).catch(console.error)
  })
  urlInput.addEventListener('focus', () => urlInput.select())

  backBtn.addEventListener('click', () => invoke('webviewer_back').catch(console.error))
  forwardBtn.addEventListener('click', () => invoke('webviewer_forward').catch(console.error))
  reloadBtn.addEventListener('click', () => invoke('webviewer_reload').catch(console.error))

  // タブの active 状態を監視してWebviewWindow の表示/非表示を制御
  const observer = new MutationObserver(() => {
    if (panelWeb.classList.contains('active')) {
      if (urlInput.value) {
        invoke('webviewer_show').catch(console.error)
      }
    } else {
      invoke('webviewer_hide').catch(console.error)
    }
  })
  observer.observe(panelWeb, { attributes: true, attributeFilter: ['class'] })

  // 設定から最後のURLを復元（自動ナビゲートはしない、URLだけ表示）
  window.api.settingsLoad().then((settings) => {
    const lastUrl = settings?.lastUrl
    if (lastUrl && lastUrl !== 'about:blank') {
      urlInput.value = lastUrl
    }
  }).catch(console.error)
}

// ===== Electron 版: <webview> タグを直接使用 =====

function initWebViewerElectron(): void {
  const webviewEl = document.getElementById('webview') as WebviewElement
  const urlInput = document.getElementById('web-url') as HTMLInputElement
  const backBtn = document.getElementById('web-back')!
  const forwardBtn = document.getElementById('web-forward')!
  const reloadBtn = document.getElementById('web-reload')!
  const spinner = document.getElementById('web-spinner')!
  const errorEl = document.getElementById('web-error')!
  const zoomOutBtn = document.getElementById('web-zoom-out')!
  const zoomInBtn = document.getElementById('web-zoom-in')!
  const zoomLevelBtn = document.getElementById('web-zoom-level')!
  const panelWeb = document.getElementById('panel-web')!

  function updateZoomUI(factor: number): void {
    zoomLevelBtn.textContent = Math.round(factor * 100) + '%'
    zoomOutBtn.toggleAttribute('disabled', factor <= ZOOM_STEPS[0])
    zoomInBtn.toggleAttribute('disabled', factor >= ZOOM_STEPS[ZOOM_STEPS.length - 1])
  }

  function setZoom(factor: number): void {
    webviewEl.setZoomFactor(factor)
    updateZoomUI(factor)
  }

  function zoomIn(): void {
    const current = webviewEl.getZoomFactor()
    const next = ZOOM_STEPS.find((s) => s > current + 0.01)
    if (next !== undefined) setZoom(next)
  }

  function zoomOut(): void {
    const current = webviewEl.getZoomFactor()
    const prev = ZOOM_STEPS_REVERSED.find((s) => s < current - 0.01)
    if (prev !== undefined) setZoom(prev)
  }

  zoomInBtn.addEventListener('click', zoomIn)
  zoomOutBtn.addEventListener('click', zoomOut)
  zoomLevelBtn.addEventListener('click', () => setZoom(1.0))

  document.addEventListener('keydown', (e) => {
    if (!panelWeb.classList.contains('active')) return
    if (!e.ctrlKey && !e.metaKey) return
    if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn() }
    else if (e.key === '-') { e.preventDefault(); zoomOut() }
    else if (e.key === '0') { e.preventDefault(); setZoom(1.0) }
  })

  function navigate(rawUrl: string): void {
    let url = rawUrl.trim()
    if (!url) return
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url
      } else {
        url = 'https://www.google.com/search?q=' + encodeURIComponent(url)
      }
    }
    urlInput.value = url
    webviewEl.src = url
    window.api.settingsLoad().then((settings) => {
      return window.api.settingsSave({ ...settings, lastUrl: url })
    }).catch(console.error)
  }

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigate(urlInput.value)
  })
  urlInput.addEventListener('focus', () => urlInput.select())

  backBtn.addEventListener('click', () => {
    if (webviewEl.canGoBack()) webviewEl.goBack()
  })
  forwardBtn.addEventListener('click', () => {
    if (webviewEl.canGoForward()) webviewEl.goForward()
  })
  reloadBtn.addEventListener('click', () => {
    webviewEl.reload()
  })

  webviewEl.addEventListener('did-start-loading', () => {
    spinner.classList.remove('hidden')
    errorEl.classList.add('hidden')
  })

  webviewEl.addEventListener('did-stop-loading', () => {
    spinner.classList.add('hidden')
    const currentUrl = webviewEl.getURL()
    if (currentUrl && currentUrl !== 'about:blank') {
      urlInput.value = currentUrl
    }
    updateZoomUI(webviewEl.getZoomFactor())
  })

  webviewEl.addEventListener('did-fail-load', (e) => {
    spinner.classList.add('hidden')
    const errorCode = (e as unknown as { errorCode: number }).errorCode
    if (errorCode !== -3) {
      errorEl.textContent = 'ページを読み込めませんでした\n別のURLを試してください'
      errorEl.classList.remove('hidden')
    }
  })

  window.api.settingsLoad().then((settings) => {
    const lastUrl = settings?.lastUrl
    if (lastUrl && lastUrl !== 'about:blank') {
      urlInput.value = lastUrl
      navigate(lastUrl)
    }
  }).catch(console.error)
}
