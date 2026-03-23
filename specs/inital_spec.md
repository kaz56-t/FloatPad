# FloatPad — 仕様書

**バージョン:** 1.0.0  
**作成日:** 2026-03-23  
**対象プラットフォーム:** macOS / Windows (Cross-Platform)

---

## 1. 概要

FloatPad は「メモ」「電卓」「Webビューア」の3機能をタブで切り替えて使える、**常に最前面（Always on Top）表示**の軽量デスクトップアプリです。

---

## 2. 技術スタック

| 項目 | 採用技術 | 理由 |
|------|----------|------|
| フレームワーク | **Electron** (Node.js + Chromium) | macOS / Windows 両対応。Webビューアも内蔵WebViewで実現 |
| 言語 | **TypeScript 5.x**（strict: true） | 型安全・補完・リファクタリング容易性 |
| ビルドツール | **electron-vite** | Viteベース。HMR付き開発環境・electron-builder統合済み |
| UI | HTML + CSS + Vanilla TypeScript | 軽量、シンプル、フレームワーク不要 |
| ファイル保存 | Node.js `fs/promises` モジュール | ローカルファイルへの非同期読み書き |
| パッケージング | `electron-builder`（electron-vite に統合） | Mac (.dmg / .app) / Windows (.exe インストーラー) を出力 |

> **代替案:** Tauri (Rust + WebView) でもよいが、Webビューアタブの実装が Electron より複雑なため Electron を推奨。

---

## 3. ウィンドウ仕様

| 項目 | 値 |
|------|----|
| デフォルトサイズ | 420 × 560 px |
| 最小サイズ | 320 × 400 px |
| リサイズ | 可 |
| Always on Top | **常に有効**（`alwaysOnTop: true`） |
| フレーム | カスタムタイトルバー（ドラッグ移動対応） |
| 透明度 | オプション設定で 60〜100% 調整可（将来拡張） |

---

## 4. 機能要件

### 4.1 共通 UI

- 上部に **タブバー**（メモ / 電卓 / Web の3タブ）
- タブバー自体がドラッグハンドル（ウィンドウ移動）
- 右上に **✕ 閉じるボタン**（トレイに格納 or 終了）
- タブ切り替え時、各タブの状態を保持する

---

### 4.2 タブ① — メモ

#### 機能
| # | 機能 | 詳細 |
|---|------|------|
| M-1 | テキスト入力 | 複数行のプレーンテキスト入力エリア |
| M-2 | 自動保存 | 入力から 1 秒後に自動保存（デバウンス） |
| M-3 | 手動保存 | `Ctrl+S` / `Cmd+S` でも保存 |
| M-4 | ファイル保存形式 | UTF-8 プレーンテキスト（`.txt`） |
| M-5 | 保存先 | ユーザーのドキュメントフォルダ内 `FloatPad/memo.txt` |
| M-6 | 起動時読み込み | 前回保存した内容を自動ロード |
| M-7 | 文字数表示 | 右下に現在の文字数を表示 |

#### 保存パス
```
macOS : ~/Documents/FloatPad/memo.txt
Windows: %USERPROFILE%\Documents\FloatPad\memo.txt
```

---

### 4.3 タブ② — 電卓

#### 機能
| # | 機能 | 詳細 |
|---|------|------|
| C-1 | 基本四則演算 | `+` `-` `×` `÷` |
| C-2 | パーセント計算 | `%` ボタン |
| C-3 | 符号反転 | `+/-` ボタン |
| C-4 | クリア | `AC`（全クリア）/ `C`（入力クリア） |
| C-5 | 小数点 | `.` 入力対応 |
| C-6 | キーボード入力 | 数字キー・演算子キー・Enter・Backspace 対応 |
| C-7 | 計算結果コピー | 結果表示エリアをクリックでクリップボードにコピー |
| C-8 | 履歴表示 | 直近5件の計算式をサブ表示 |

#### ボタンレイアウト（4×5）
```
[ AC ] [+/-] [ % ] [ ÷ ]
[  7 ] [  8 ] [  9 ] [ × ]
[  4 ] [  5 ] [  6 ] [ - ]
[  1 ] [  2 ] [  3 ] [ + ]
[  0  (span2) ] [ . ] [ = ]
```

---

### 4.4 タブ③ — Web ビューア

#### 機能
| # | 機能 | 詳細 |
|---|------|------|
| W-1 | URL 入力バー | テキストフィールドに URL を入力して Enter でロード |
| W-2 | ページ表示 | Electron `<webview>` タグを使用 |
| W-3 | 戻る / 進む | ◀ ▶ ボタン |
| W-4 | リロード | 🔄 ボタン |
| W-5 | ロード状態表示 | ローディングスピナー表示 |
| W-6 | エラー表示 | 接続失敗時にエラーメッセージを表示 |
| W-7 | 最後のURL保持 | アプリ再起動時に最後に開いたURLを復元 |
| W-8 | 外部リンク | `target="_blank"` リンクはシステムブラウザで開く |

> **セキュリティ:** `nodeIntegration: false`、`contextIsolation: true` を webview に設定。

---

## 5. 設定・永続化

設定ファイルは JSON 形式でアプリデータディレクトリに保存する。

```json
// settings.json
{
  "alwaysOnTop": true,
  "windowBounds": { "x": 100, "y": 100, "width": 420, "height": 560 },
  "lastTab": "memo",
  "lastUrl": "https://www.google.com",
  "opacity": 100
}
```

| キー | 説明 |
|------|------|
| `alwaysOnTop` | 常に最前面（固定 true） |
| `windowBounds` | 前回のウィンドウ位置・サイズ |
| `lastTab` | 前回開いていたタブ |
| `lastUrl` | Webタブの最後のURL |
| `opacity` | ウィンドウ不透明度（将来拡張） |

**保存パス:**
```
macOS : ~/Library/Application Support/FloatPad/settings.json
Windows: %APPDATA%\FloatPad\settings.json
```

---

## 6. ディレクトリ構成

```
floatpad/
├── package.json
├── tsconfig.json                    # ルート tsconfig（strict: true）
├── tsconfig.node.json               # main / preload 用
├── tsconfig.web.json                # renderer 用
├── electron.vite.config.ts          # electron-vite 設定
├── electron-builder.yml
├── src/
│   ├── main/
│   │   └── index.ts                 # Electron メインプロセス
│   ├── preload/
│   │   └── index.ts                 # Context Bridge (IPC)
│   └── renderer/
│       ├── index.html               # メインUI
│       └── src/
│           ├── main.ts              # レンダラーエントリーポイント
│           ├── style.css
│           ├── memo.ts              # メモ機能
│           ├── calculator.ts        # 電卓機能
│           └── webviewer.ts         # Webビューア機能
└── resources/
    ├── icon.icns                    # macOS アイコン
    └── icon.ico                     # Windows アイコン
```

---

## 7. IPC 通信（Main ↔ Renderer）

| チャンネル名 | 方向 | 説明 |
|-------------|------|------|
| `memo:save` | Renderer → Main | メモ内容をファイルに保存 |
| `memo:load` | Renderer → Main | メモファイルを読み込む |
| `settings:save` | Renderer → Main | 設定を保存 |
| `settings:load` | Renderer → Main | 設定を読み込む |
| `window:setAlwaysOnTop` | Renderer → Main | 最前面設定の切り替え（将来拡張） |

---

## 8. ビルド・配布

### 開発環境
```bash
# プロジェクト生成（初回のみ）
npm create @quick-start/electron floatpad -- --template vanilla-ts
cd floatpad
npm install

npm run dev          # 開発起動（HMR付き）
npm run typecheck    # 型チェック
```

### ビルド
```bash
npm run build            # tsc + electron-builder（全プラットフォーム）
npm run build:mac        # macOS: .dmg + .app
npm run build:win        # Windows: .exe インストーラー
```

### electron-builder 設定（抜粋）
```yaml
appId: com.floatpad.app
productName: FloatPad
mac:
  category: public.app-category.productivity
  target: [dmg, zip]
win:
  target: [nsis]
  icon: assets/icon.ico
```

---

## 9. 非機能要件

| 項目 | 目標値 |
|------|--------|
| 起動時間 | 3秒以内 |
| メモリ使用量 | 通常時 150MB 以下（Electron の制約上） |
| メモ自動保存レスポンス | 入力後 1秒以内 |
| 電卓レスポンス | 即時（< 50ms） |
| Webページロード | ネットワーク速度依存 |

---

## 10. 将来拡張（v2 候補）

- [ ] メモの複数ファイル管理（タブ内タブ）
- [ ] ウィンドウ透明度のスライダー調整
- [ ] ダークモード / ライトモード切り替え
- [ ] メモのMarkdownプレビュー
- [ ] 電卓の関数電卓モード
- [ ] Webタブのブックマーク機能
- [ ] グローバルホットキーでウィンドウ表示/非表示

---

*以上が FloatPad v1.0 の仕様書です。*