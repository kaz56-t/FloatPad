# FloatPad — CLAUDE.md

## このファイルについて
Claude Code がセッションをまたいで読み返す「プロジェクトの永続記憶」。
実装前に必ずこのファイルを読み、PROGRESS.md も存在すれば必ず読むこと。

---

## プロジェクト概要

**FloatPad** — メモ・電卓・Webビューアの3タブを切り替えられる、常に最前面（Always on Top）表示の軽量デスクトップアプリ。macOS / Windows 両対応。

---

## 技術スタック

| 項目 | 内容 |
|------|------|
| フレームワーク | Electron（Node.js + Chromium内蔵） |
| 言語 | **TypeScript 5.x**（strict: true） |
| ビルドツール | **electron-vite**（Viteベース、HMR付き） |
| UI | HTML + CSS + Vanilla TypeScript |
| ファイル保存 | Node.js `fs/promises` モジュール |
| パッケージング | `electron-builder`（electron-vite に統合済み） |
| Node.js | 18以上推奨 |
| 型定義 | `electron`・`@types/node` |

---

## プロジェクト作成コマンド（初回のみ）

```bash
# electron-vite の公式テンプレートで生成（TypeScript + Vanilla）
npm create @quick-start/electron floatpad -- --template vanilla-ts
cd floatpad
npm install
```

## 開発・ビルドコマンド

```bash
npm run dev          # 開発起動（HMR付き・動作確認はこれで行う）
npm run build        # tsc + electron-builder（全プラットフォーム）
npm run build:mac    # macOS向けビルド (.dmg)
npm run build:win    # Windows向けビルド (.exe)
npm run typecheck    # 型チェックのみ（tsc --noEmit）
```

---

## ディレクトリ構成（electron-vite 標準構成）

```
floatpad/
├── CLAUDE.md                        ← このファイル
├── PROGRESS.md                      ← 進捗ログ（自分で更新し続けること）
├── package.json
├── tsconfig.json                    # ルート tsconfig
├── tsconfig.node.json               # main/preload 用
├── tsconfig.web.json                # renderer 用
├── electron.vite.config.ts          # electron-vite 設定
├── electron-builder.yml             # パッケージング設定
├── .claude/
│   └── settings.json                # Claude Code 権限設定
├── src/
│   ├── main/
│   │   └── index.ts                 # Electronメインプロセス
│   ├── preload/
│   │   └── index.ts                 # contextBridge / IPC定義
│   └── renderer/
│       ├── index.html               # メインUI（タブバー含む）
│       └── src/
│           ├── main.ts              # エントリーポイント
│           ├── style.css
│           ├── memo.ts              # メモ機能
│           ├── calculator.ts        # 電卓機能
│           └── webviewer.ts         # Webビューア機能
└── resources/
    ├── icon.icns                    # macOS アイコン
    └── icon.ico                     # Windows アイコン
```

---

## 実装タスク（この順序で進めること）

### フェーズ1: プロジェクト初期化
- [ ] `npm create @quick-start/electron floatpad -- --template vanilla-ts` でプロジェクト生成
- [ ] `npm install` 実行
- [ ] `tsconfig.json` の `strict: true` を確認
- [ ] `electron.vite.config.ts` にwebview有効化オプションを追加（`webviewTag: true`）
- [ ] `npm run dev` で起動確認（デフォルト画面が出ればOK）
- [ ] **git commit: "feat: project init with electron-vite"**

### フェーズ2: タブUI・ウィンドウ制御
- [ ] `src/main/index.ts` でBrowserWindowを設定（alwaysOnTop, frame: false）
- [ ] `src/renderer/index.html` にタブバー（メモ / 電卓 / Web）を実装
- [ ] タブバーをドラッグハンドルとして機能させる（`-webkit-app-region: drag`）
- [ ] ✕ボタン実装（`window.close()`）
- [ ] タブ切り替え時に各パネルの状態を保持
- [ ] ウィンドウサイズ・位置を `settings.json` に保存・復元
- [ ] **git commit: "feat: tab UI and window control"**

### フェーズ3: メモタブ
- [ ] `src/renderer/src/memo.ts` に複数行テキストエリアのロジック実装
- [ ] 入力1秒後に自動保存（debounce）
- [ ] `Ctrl+S` / `Cmd+S` でも保存
- [ ] `src/preload/index.ts` に `memo:save` / `memo:load` IPC を公開
- [ ] `src/main/index.ts` で `ipcMain.handle` による fs 操作を実装
- [ ] 保存先: `app.getPath('documents')/FloatPad/memo.txt`
- [ ] 起動時に memo.txt を自動ロード
- [ ] 右下に文字数表示
- [ ] **git commit: "feat: memo tab"**

### フェーズ4: 電卓タブ
- [ ] `src/renderer/src/calculator.ts` に状態機械（state machine）で電卓ロジック実装
- [ ] 4×5ボタンレイアウト実装（下記参照）
- [ ] 基本四則演算（+ - × ÷）・AC / C / +/- / %
- [ ] 小数点入力対応
- [ ] キーボード入力対応（数字・演算子・Enter・Backspace）
- [ ] 結果表示エリアをクリックでクリップボードにコピー
- [ ] 直近5件の計算履歴表示
- [ ] **git commit: "feat: calculator tab"**

### フェーズ5: Webビューアタブ
- [ ] `src/renderer/src/webviewer.ts` にURL入力・ナビゲーションロジック実装
- [ ] `electron.vite.config.ts` で `webviewTag: true` が設定済みか確認
- [ ] `<webview>` タグでページ表示
- [ ] ◀ ▶ リロードボタン実装
- [ ] ローディングスピナー・エラー表示
- [ ] 最後に開いたURLを settings.json に保存・復元
- [ ] `target="_blank"` リンクはシステムブラウザで開く（`shell.openExternal`）
- [ ] **git commit: "feat: webviewer tab"**

### フェーズ6: 仕上げ・動作確認
- [ ] `npm run typecheck` でTypeScriptエラーが0件であることを確認
- [ ] `npm run dev` で全タブの動作確認
- [ ] PROGRESS.md に最終状態を記録
- [ ] **git commit: "feat: v1.0 complete"**

---

## 各機能の詳細仕様

### electron.vite.config.ts に必要な設定
```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    define: {},
    // webview タグを有効化（Webビューアタブで必須）
    server: { headers: { 'Content-Security-Policy': '' } }
  }
})
```

### src/main/index.ts — BrowserWindow 設定
```typescript
import { BrowserWindow } from 'electron'
import { join } from 'path'

const win = new BrowserWindow({
  width: 420,
  height: 560,
  minWidth: 320,
  minHeight: 400,
  alwaysOnTop: true,
  frame: false,           // カスタムタイトルバー
  resizable: true,
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    nodeIntegration: false,
    contextIsolation: true,
    webviewTag: true,     // Webビューアタブで必須
  }
})
```

### 電卓ボタンレイアウト
```
[ AC ] [+/-] [ % ] [ ÷ ]
[  7 ] [  8 ] [  9 ] [ × ]
[  4 ] [  5 ] [  6 ] [ - ]
[  1 ] [  2 ] [  3 ] [ + ]
[    0    ] [ . ] [ = ]   ← 0は2カラム分
```

### IPCチャンネル（src/preload/index.ts で公開するもの）
| チャンネル | 方向 | 用途 |
|-----------|------|------|
| `memo:save` | renderer → main | テキストをファイル保存 |
| `memo:load` | renderer → main | ファイルからテキスト読み込み |
| `settings:save` | renderer → main | settings.json 保存 |
| `settings:load` | renderer → main | settings.json 読み込み |

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  memoSave: (text: string) => ipcRenderer.invoke('memo:save', text),
  memoLoad: () => ipcRenderer.invoke('memo:load'),
  settingsSave: (data: object) => ipcRenderer.invoke('settings:save', data),
  settingsLoad: () => ipcRenderer.invoke('settings:load'),
})
```

### settings.json スキーマ
```json
{
  "alwaysOnTop": true,
  "windowBounds": { "x": 100, "y": 100, "width": 420, "height": 560 },
  "lastTab": "memo",
  "lastUrl": "https://www.google.com",
  "opacity": 100
}
```

### 保存パス（`app.getPath()` で取得）
```
メモ:     ~/Documents/FloatPad/memo.txt
設定:     macOS → ~/Library/Application Support/FloatPad/settings.json
          Windows → %APPDATA%\FloatPad\settings.json
```

---

## コーディング規約

- **TypeScript strict モード**（`strict: true`）を維持すること
- `any` 型は原則禁止。型が不明な場合は `unknown` を使い適切にナローイングすること
- **ES Modules** を使用（`import` / `export`）
- **async/await** を使用（Promiseチェーンは使わない）
- ファイル保存には `fs/promises` を使用（コールバック形式は使わない）
- コメントは日本語でOK
- エラーは `try/catch` で必ずハンドリングし、コンソールに出力すること
- `eval()` を使った電卓実装は禁止。状態機械（state machine）で実装すること
- webview の `nodeIntegration` は絶対に `true` にしないこと
- renderer から Node.js API に直接アクセスしないこと（必ず preload 経由）

---

## 詰まったときのルール（重要）

1. **30分以上詰まったらスキップ**して次のタスクへ進む
2. 詰まった内容を `PROGRESS.md` の「ブロッカー」セクションに記録する
3. 代替実装があれば採用して先に進む（完璧より動くことを優先）
4. **軽微なUIバグは許容**。動作する状態でコミットすること
5. `npm start` でクラッシュする場合は、そのタブを無効化して他のタブを完成させる

---

## PROGRESS.md の書き方

各フェーズ完了時・コンテキストが切れそうなとき・セッション終了時に必ず更新すること。

```markdown
# PROGRESS.md

## 最終更新
2026-XX-XX HH:MM

## 完了済みフェーズ
- [x] フェーズ1: プロジェクト初期化
- [x] フェーズ2: タブUI
- [ ] フェーズ3: メモタブ（進行中）

## 最後のgit commit
abc1234 feat: tab UI and window control

## 現在作業中
renderer/js/memo.js — debounce自動保存の実装

## ブロッカー（詰まっていること）
- なし

## 次にやること
memo.jsのdebounce実装を完了させ、git commitする
```

---

## セッション開始時のチェックリスト

新しいセッションを開始したら、必ずこの順番で確認すること：

1. `cat PROGRESS.md` — 前回の進捗を確認
2. `git log --oneline -10` — 最近のコミット履歴を確認
3. `ls src/main src/preload src/renderer/src` — ファイル存在確認
4. `npm run typecheck` — 型エラーの現状把握
5. 上記タスクリストの未完了フェーズから再開

---

## 完了の定義

以下をすべて満たしたら v1.0 完了とする：

- `npm run typecheck` でTypeScriptエラーが0件
- `npm run dev` でアプリが起動する
- 3タブ（メモ・電卓・Web）が切り替えられる
- ウィンドウが常に最前面に表示される
- メモが `memo.txt` に自動保存・起動時に復元される
- 電卓で基本四則演算ができる
- WebタブにURLを入力してページが表示される
- アプリを再起動しても設定・メモ・最後のURLが復元される
- .gitignoreの更新により必要なファイルのみがcommitされている