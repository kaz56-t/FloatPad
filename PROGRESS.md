# PROGRESS.md

## 最終更新
2026-03-23 (セッション1)

## 完了済みフェーズ
- [x] フェーズ1: プロジェクト初期化（設定ファイル一式作成）
- [x] フェーズ2: タブUI・ウィンドウ制御（alwaysOnTop, frameless, drag, close）
- [x] フェーズ3: メモタブ（debounce自動保存, Ctrl+S, 文字数表示）
- [x] フェーズ4: 電卓タブ（状態機械, キーボード入力, クリップボードコピー, 履歴5件）
- [x] フェーズ5: Webビューアタブ（webview, 戻る/進む/更新, エラー表示, URL復元）
- [ ] フェーズ6: 仕上げ・動作確認（npm install → npm run dev で確認要）

## 最後のgit commit
4e68384 update to vite（セッション開始時点）

## 現在作業中
npm install 待ち → npm run dev で動作確認

## ブロッカー
- resources/icon.ico, icon.icns が未作成（npm run dev には不要、ビルド時に必要）
- npm install 未実行（ユーザーが実行する必要あり）

## 次にやること
1. `npm install` を実行
2. `npm run dev` で起動確認
3. `npm run typecheck` でTypeScriptエラーが0件であることを確認
4. 全タブの動作確認後に git commit

## 作成ファイル一覧
- package.json
- tsconfig.json / tsconfig.node.json / tsconfig.web.json
- electron.vite.config.ts
- electron-builder.yml
- src/main/index.ts
- src/preload/index.ts
- src/renderer/index.html
- src/renderer/src/main.ts
- src/renderer/src/style.css
- src/renderer/src/memo.ts
- src/renderer/src/calculator.ts
- src/renderer/src/webviewer.ts
- src/renderer/src/global.d.ts
- .gitignore（更新）
