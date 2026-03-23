# PROGRESS.md

## 最終更新
2026-03-24

## 完了済みフェーズ
- [x] フェーズ1: プロジェクト初期化
- [x] フェーズ2: タブUI・ウィンドウ制御
- [x] フェーズ3: メモタブ
- [x] フェーズ4: 電卓タブ
- [x] フェーズ5: Webビューアタブ
- [x] フェーズ6: 仕上げ・自動動作確認（Playwright全項目 OK）

## 最後のgit commit
（次のコミットで v1.0 complete）

## 現在作業中
なし（v1.0 完了）

## ブロッカー
なし

## テスト結果（npx ts-node --project tsconfig.scripts.json scripts/verify.ts）
- ウィンドウ起動: OK
- メモ自動保存: OK
- 電卓演算: OK
- Webビューア: OK (スクリーンショット確認)

## データ保存先（変更済み）
- メモ・設定ともに `<project_root>/user-data/` に保存
- Documents/OneDriveへの依存なし
- user-data/ と test-results/ は .gitignore 済み

## 次にやること
なし（完了）
