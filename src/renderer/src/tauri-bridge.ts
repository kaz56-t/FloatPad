/**
 * Tauri環境でのみ実行される window.api ブリッジ。
 * Electron環境では preload が window.api を設定するため何もしない。
 *
 * 検出方法: window.__TAURI_INTERNALS__ が存在すれば Tauri
 */

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

if (isTauri()) {
  const tauriApi: Window['api'] = {
    // --- メモ ---
    memoList: () =>
      invoke('memo_list'),

    memoSave: (id: number, text: string) =>
      invoke('memo_save', { id, text }),

    memoLoad: (id: number) =>
      invoke('memo_load', { id }),

    memoCreate: (name: string) =>
      invoke('memo_create', { name }),

    memoDelete: (id: number) =>
      invoke('memo_delete', { id }),

    memoRename: (id: number, name: string) =>
      invoke('memo_rename', { id, name }),

    // --- 設定 ---
    settingsLoad: () =>
      invoke('settings_load'),

    settingsSave: (data: object) =>
      invoke('settings_save', { data }),

    // --- ウィンドウ ---
    windowSetOpacity: (opacity: number) => {
      // CSS で即時反映し、Rust 側には保存通知
      document.documentElement.style.opacity = String(opacity / 100)
      return invoke('window_set_opacity', { opacity })
    },

    windowSetMini: (mini: boolean) =>
      invoke('window_set_mini', { mini }),

    // --- ダイアログ ---
    chooseFolder: () =>
      invoke('choose_folder'),

    // --- グローバルショートカット ---
    globalShortcutUpdate: (accelerator: string) =>
      invoke('global_shortcut_update', { accelerator }),

    // --- スニペット ---
    snippetsLoad: () =>
      invoke('snippets_load'),

    snippetsSave: (data: SnippetItem[]) =>
      invoke('snippets_save', { data }),

    // --- ターミナル（Tauri では未対応・スタブ）---
    terminalSpawn: () => {
      console.warn('[Tauri] terminal機能は未対応です')
      return Promise.resolve(false)
    },
    terminalWrite: (_data: string) => Promise.resolve(false),
    terminalResize: (_cols: number, _rows: number) => Promise.resolve(false),
    terminalKill: () => Promise.resolve(false),
    onTerminalData: (_cb: (data: string) => void) => { /* Tauri未対応 */ },
  }

  window.api = tauriApi

  // Rust 側からの透明度変更イベントをリッスン
  listen<number>('window-set-opacity', (event) => {
    document.documentElement.style.opacity = String(event.payload / 100)
  }).catch(console.error)

  // 起動時に保存済みの透明度を復元
  window.api.settingsLoad()
    .then((s) => {
      const opacity = (s as { opacity?: number }).opacity
      if (typeof opacity === 'number' && opacity < 100) {
        document.documentElement.style.opacity = String(opacity / 100)
      }
    })
    .catch(console.error)
}
