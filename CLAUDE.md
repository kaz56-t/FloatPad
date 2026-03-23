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
| UI | HTML + CSS + Vanilla JS |
| ファイル保存 | Node.js `fs` モジュール |
| パッケージング | `electron-builder` |
| Node.js | 18以上推奨 |

---

## コマンド一覧

```bash
npm install          # 初回セットアップ
npm start            # 開発起動（動作確認はこれで行う）
npm run build:mac    # macOS向けビルド (.dmg)
npm run build:win    # Windows向けビルド (.exe)
npm run build:all    # 両プラットフォーム同時ビルド
```

---

## ディレクトリ構成（作成すべきファイル）

```
floatpad/
├── CLAUDE.md                  ← このファイル
├── PROGRESS.md                ← 進捗ログ（自分で更新し続けること）
├── package.json
├── electron-builder.yml
├── main.js                    # Electronメインプロセス
├── preload.js                 # contextBridge / IPC定義
└── renderer/
    ├── index.html             # メインUI（タブバー含む）
    ├── style.css
    └── js/
        ├── app.js             # タブ管理・初期化
        ├── memo.js            # メモ機能
        ├── calculator.js      # 電卓機能
        └── webviewer.js       # Webビューア機能
```

---

## 実装タスク（この順序で進めること）

### フェーズ1: プロジェクト初期化
- [ ] `package.json` 作成（electron, electron-builder を含む）
- [ ] `main.js` 作成（BrowserWindow, alwaysOnTop: true, カスタムフレーム）
- [ ] `preload.js` 作成（contextBridge で IPC チャンネルを公開）
- [ ] `renderer/index.html` 作成（3タブのスケルトンUI）
- [ ] `npm install` 実行・`npm start` で起動確認
- [ ] **git commit: "feat: project init"**

### フェーズ2: タブUI・ウィンドウ制御
- [ ] タブバー実装（メモ / 電卓 / Web の3タブ）
- [ ] タブバーをドラッグハンドルとして機能させる（`-webkit-app-region: drag`）
- [ ] ✕ボタン実装（`window.close()`）
- [ ] タブ切り替え時に各パネルの状態を保持
- [ ] ウィンドウサイズ・位置を `settings.json` に保存・復元
- [ ] **git commit: "feat: tab UI and window control"**

### フェーズ3: メモタブ
- [ ] 複数行テキストエリア配置
- [ ] 入力1秒後に自動保存（debounce）
- [ ] `Ctrl+S` / `Cmd+S` でも保存
- [ ] 保存先: `~/Documents/FloatPad/memo.txt`（Windows: `%USERPROFILE%\Documents\FloatPad\memo.txt`）
- [ ] 起動時に memo.txt を自動ロード
- [ ] 右下に文字数表示
- [ ] **git commit: "feat: memo tab"**

### フェーズ4: 電卓タブ
- [ ] 4×5ボタンレイアウト実装（下記参照）
- [ ] 基本四則演算（+ - × ÷）
- [ ] AC（全クリア）/ C（入力クリア）/ +/- / %
- [ ] 小数点入力対応
- [ ] キーボード入力対応（数字・演算子・Enter・Backspace）
- [ ] 結果表示エリアをクリックでクリップボードにコピー
- [ ] 直近5件の計算履歴表示
- [ ] **git commit: "feat: calculator tab"**

### フェーズ5: Webビューアタブ
- [ ] URL入力バー（Enterでロード）
- [ ] `<webview>` タグでページ表示（`nodeIntegration: false`, `contextIsolation: true`）
- [ ] ◀ ▶ ボタン（戻る・進む）
- [ ] 🔄 リロードボタン
- [ ] ローディングスピナー表示
- [ ] エラー時のフォールバック表示
- [ ] 最後に開いたURLを `settings.json` に保存・復元
- [ ] `target="_blank"` リンクはシステムブラウザで開く
- [ ] **git commit: "feat: webviewer tab"**

### フェーズ6: 仕上げ・動作確認
- [ ] `npm start` で全タブの動作確認
- [ ] PROGRESS.md に最終状態を記録
- [ ] **git commit: "feat: v1.0 complete"**

---

## 各機能の詳細仕様

### ウィンドウ
```javascript
new BrowserWindow({
  width: 420,
  height: 560,
  minWidth: 320,
  minHeight: 400,
  alwaysOnTop: true,
  frame: false,           // カスタムタイトルバー
  resizable: true,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    nodeIntegration: false,
    contextIsolation: true,
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

### IPCチャンネル（preload.js で公開するもの）
| チャンネル | 方向 | 用途 |
|-----------|------|------|
| `memo:save` | renderer → main | テキストをファイル保存 |
| `memo:load` | renderer → main | ファイルからテキスト読み込み |
| `settings:save` | renderer → main | settings.json 保存 |
| `settings:load` | renderer → main | settings.json 読み込み |

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

- **ES Modules** を使用（`import` / `export`）
- **async/await** を使用（Promiseチェーンは使わない）
- コメントは日本語でOK
- エラーは `try/catch` で必ずハンドリングし、コンソールに出力すること
- `eval()` を使った電卓実装は禁止。状態機械（state machine）で実装すること
- webview の `nodeIntegration` は絶対に `true` にしないこと

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
3. `ls -la` — ファイル存在確認
4. 上記タスクリストの未完了フェーズから再開

---

## 完了の定義

以下をすべて満たしたら v1.0 完了とする：

- `npm start` でアプリが起動する
- 3タブ（メモ・電卓・Web）が切り替えられる
- ウィンドウが常に最前面に表示される
- メモが `memo.txt` に自動保存・起動時に復元される
- 電卓で基本四則演算ができる
- WebタブにURLを入力してページが表示される
- アプリを再起動しても設定・メモ・最後のURLが復元される
- .gitignoreの更新により必要なファイルのみがCommitされている