# FloatPad

メモ・電卓・Webビューアの3タブを切り替えられる、常に最前面（Always on Top）表示の軽量デスクトップアプリ。

## 機能

- **メモ** — 複数行テキスト。入力1秒後に自動保存、`Ctrl+S` でも保存
- **電卓** — 四則演算・キーボード入力対応。結果クリックでクリップボードコピー
- **Webビューア** — URL入力・戻る/進む/更新。最後に開いたURLを復元

## 必要環境

- Node.js 18 以上
- npm 9 以上

## セットアップ

```bash
npm install
```

## 開発（動作確認）

```bash
npm run dev
```

HMR（ホットリロード）付きで起動します。ウィンドウが表示されれば正常です。

## 型チェック

```bash
npm run typecheck
```

## 自動動作確認（Playwright）

```bash
# 初回のみ
npx playwright install

# ビルド後に実行
npm run build:unpack
npx ts-node --project tsconfig.scripts.json scripts/verify.ts
```

結果は `test-results/report.md`、スクリーンショットは `test-results/*.png` に出力されます。

## ビルド

```bash
# Windows (.exe インストーラー)
npm run build:win

# macOS (.dmg)
npm run build:mac

# 出力先: dist/
```

## データ保存先

アプリのデータはすべてプロジェクトフォルダ内の `user-data/` に保存されます。

| ファイル | 内容 |
|---------|------|
| `user-data/memo.txt` | メモの内容 |
| `user-data/settings.json` | ウィンドウ位置・最後のタブ・最後のURL |

## 技術スタック

| 項目 | 内容 |
|------|------|
| フレームワーク | Electron 28 |
| 言語 | TypeScript 5（strict: true） |
| ビルドツール | electron-vite |
| テスト | Playwright |
