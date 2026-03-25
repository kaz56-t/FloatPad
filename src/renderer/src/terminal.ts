import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

export function initTerminal(): void {
  const panel = document.getElementById('panel-terminal')!
  const container = document.getElementById('terminal-container')!

  let term: Terminal | null = null
  let fitAddon: FitAddon | null = null
  let spawned = false

  function openTerminal(): void {
    // テーマ変数を CSS から取得
    const style = getComputedStyle(document.documentElement)
    const bg = style.getPropertyValue('--bg').trim() || '#1e1e1e'
    const fg = style.getPropertyValue('--text').trim() || '#e0e0e0'
    const accent = style.getPropertyValue('--accent').trim() || '#4a9eff'

    term = new Terminal({
      theme: { background: bg, foreground: fg, cursor: accent },
      fontSize: 13,
      fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
      cursorBlink: true,
      allowTransparency: true,
    })
    fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(container)
    fitAddon.fit()

    // PTYスポーン
    window.api.terminalSpawn().catch(console.error)

    // PTYからのデータを表示
    window.api.onTerminalData((data) => term?.write(data))

    // ユーザー入力をPTYへ送信
    term.onData((data) => window.api.terminalWrite(data).catch(console.error))

    // リサイズ時にPTYのサイズも更新
    term.onResize(({ cols, rows }) => {
      window.api.terminalResize(cols, rows).catch(console.error)
    })
  }

  // タブの active クラスを監視して初回オープンとリサイズを処理
  const observer = new MutationObserver(() => {
    if (panel.classList.contains('active')) {
      if (!spawned) {
        openTerminal()
        spawned = true
      } else {
        fitAddon?.fit()
      }
    }
  })
  observer.observe(panel, { attributes: true, attributeFilter: ['class'] })

  // ウィンドウリサイズ時にfitを再実行
  window.addEventListener('resize', () => {
    if (panel.classList.contains('active')) {
      fitAddon?.fit()
    }
  })
}
