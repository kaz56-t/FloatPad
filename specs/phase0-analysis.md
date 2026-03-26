# Phase 0: 現状分析レポート（Electron → Tauri 移管）

作成日: 2026-03-27

---

## 1. Electron固有の依存パッケージ

| パッケージ | 用途 | Tauri代替 |
|---|---|---|
| `electron` | アプリ本体 | Tauri本体 |
| `electron-builder` | パッケージング | `tauri build` |
| `electron-vite` | ビルドツール | `vite` + `@tauri-apps/cli` |
| `@electron/rebuild` | ネイティブモジュール再ビルド | 不要（Rustで実装） |
| `node-pty` | PTY（ターミナル） | Rustの PTYライブラリに置き換え（要検討） |
| `@tauri-apps/cli` | ✅ 既に導入済み | — |
| `@tauri-apps/api` | ✅ 既に導入済み | — |

---

## 2. main processで行っている処理一覧

| 処理カテゴリ | 内容 |
|---|---|
| ウィンドウ管理 | BrowserWindow生成・alwaysOnTop・opacity・ミニモード切替・サイズ保存 |
| ファイルI/O | メモ(CRUD)・設定JSON・スニペットJSONの読み書き |
| ダイアログ | フォルダ選択ダイアログ |
| グローバルショートカット | Ctrl+Shift+Spaceなどホットキーの登録・解除 |
| ターミナル(PTY) | node-pryによるインタラクティブPTYの起動・入出力・リサイズ・終了 |
| 外部URL | `shell.openExternal()` でシステムブラウザを起動 |
| セキュリティ | `setWindowOpenHandler` で target="_blank" をシステムブラウザに誘導 |

---

## 3. IPCハンドラ一覧（ipcMain.handle）

| チャンネル | 処理内容 | Tauriコマンド名（予定） |
|---|---|---|
| `memo:list` | メモメタ一覧取得 | `memo_list` |
| `memo:load` | メモ本文読み込み | `memo_load` |
| `memo:save` | メモ本文保存 | `memo_save` |
| `memo:create` | メモ新規作成 | `memo_create` |
| `memo:delete` | メモ削除 | `memo_delete` |
| `memo:rename` | メモリネーム | `memo_rename` |
| `settings:load` | 設定読み込み | `settings_load` |
| `settings:save` | 設定保存 | `settings_save` |
| `window:setOpacity` | ウィンドウ透明度変更 | `window_set_opacity` |
| `window:setMini` | ミニモード切替 | `window_set_mini` |
| `dialog:chooseFolder` | フォルダ選択ダイアログ | `choose_folder` |
| `globalShortcut:update` | グローバルホットキー更新 | `global_shortcut_update` |
| `snippets:load` | スニペット読み込み | `snippets_load` |
| `snippets:save` | スニペット保存 | `snippets_save` |
| `terminal:spawn` | PTY起動 | `terminal_spawn` |
| `terminal:write` | PTYへの入力 | `terminal_write` |
| `terminal:resize` | PTYリサイズ | `terminal_resize` |
| `terminal:kill` | PTY終了 | `terminal_kill` |

---

## 4. ipcRenderer呼び出し一覧（renderer側 window.api.*）

| メソッド | 呼び出しファイル | 呼び出し数 |
|---|---|---|
| `memoList/Load/Save/Create/Delete/Rename` | `memo.ts` | 14件 |
| `settingsLoad/Save` | `memo.ts`, `webviewer.ts`, `main.ts`, `settings.ts` | 累計25件 |
| `windowSetOpacity`, `windowSetMini` | `settings.ts`, `main.ts` | 4件 |
| `chooseFolder` | `settings.ts` | 1件 |
| `globalShortcutUpdate` | `settings.ts` | 2件 |
| `snippetsLoad/Save` | `snippets.ts` | 4件 |
| `terminalSpawn/Write/Resize/Kill`, `onTerminalData` | `terminal.ts` | 5件 |
| **計** | 6ファイル | **55件** |

---

## 5. Node.js固有API使用箇所

| API | 用途 | 該当ファイル |
|---|---|---|
| `fs/promises` (read/write/mkdir/unlink/rename) | メモ・設定・スニペットファイル操作 | `src/main/index.ts` |
| `path.join` | ファイルパス構築 | `src/main/index.ts` |
| `app.getPath('userData')` / `getAppPath()` | データ保存先取得 | `src/main/index.ts` |
| `node-pty` | PTY（インタラクティブターミナル） | `src/main/index.ts` |
| `shell.openExternal` | 外部URLをブラウザで開く | `src/main/index.ts` |
| `dialog.showOpenDialog` | フォルダ選択UI | `src/main/index.ts` |
| `globalShortcut.register/unregisterAll` | グローバルホットキー | `src/main/index.ts` |
| `process.env`, `process.platform`, `process.cwd` | 環境情報取得 | `src/main/index.ts` |

---

## 6. 移管難易度分類

### Low（そのまま移行可能）

| 機能 | Tauri代替 |
|---|---|
| メモ CRUD（ファイル操作） | Rust `std::fs` または `tauri-plugin-fs` |
| 設定JSON読み書き | Rust `std::fs` + `serde_json` |
| スニペットJSON読み書き | Rust `std::fs` + `serde_json` |
| フォルダ選択ダイアログ | `tauri-plugin-dialog` |
| 外部URLを開く | `tauri-plugin-shell` の `open()` |
| ウィンドウサイズ・位置 | `tauri.conf.json` + Tauri Window API |
| ウィンドウ透明度 | `window.set_decorations()` / CSS |
| テーマ・フォントサイズ | CSS変数（変更不要） |

### Medium（設計変更が必要）

| 機能 | Tauri代替 | 注意点 |
|---|---|---|
| グローバルホットキー | `tauri-plugin-global-shortcut` | API形式が異なる |
| ミニモード（ウィンドウリサイズ） | Tauri Window API (`set_size`) | Rust側で高さ切替実装 |
| パッケージング・配布 | `tauri build` | 設定ファイルが異なる |

### High（大幅な再設計が必要）

| 機能 | 問題 | 選択肢 |
|---|---|---|
| **ターミナルタブ（node-pty）** | Tauriにネイティブなインタラクティブ PTY サポートなし | ① Rustの`portable-pty`クレートで実装<br>② `tauri-plugin-shell` で非インタラクティブなコマンド実行に限定<br>③ ターミナルタブを一時スコープ外にする |
| **WebビューアタブのWebView** | Tauriのwebviewはアプリ全体で1つ。`<webview>` タグ非対応 | ① `<iframe>` に置換（CSPの制限あり）<br>② WebViewタブをシステムブラウザを開くボタンに変更<br>③ Tauri v2の `WebviewWindow` で別ウィンドウ化 |

---

## 7. 推奨移管順序

```
Phase 2: settings, snippets（Low・シンプルなファイルI/O）
Phase 3: memo（Low・CRUD）
Phase 4: window管理、ミニモード、ダイアログ（Medium）
Phase 5: グローバルホットキー、外部URL（Medium）
Phase 5: terminal → portable-ptyかスコープ外（High）
Phase 5: webviewer → iframe化かWebviewWindow化（High）
```
