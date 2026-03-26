# Electron → Tauri 移管ガイド（ClaudeCode指示用）

> 既存のElectronリポジトリ内で作業する前提です。  
> 各Phaseは**必ず動作確認してから次へ**進めてください。

---

## 前提：作業方針

- 既存の `src/`（フロントエンド）は**極力触らない**
- `src-tauri/` を新規追加してElectronと**並走させながら**移管する
- 1機能ずつ移管し、差分をGitで管理する

---

## Phase 0：現状分析

```
このElectronアプリの構造を分析してください。

以下を調査してリストアップしてください：
1. package.jsonの依存パッケージ（特にElectron固有のもの）
2. main processで行っている処理の一覧
3. ipcMain.handle / ipcMain.on の呼び出し箇所をすべて洗い出す
4. ipcRenderer.invoke / ipcRenderer.send の呼び出し箇所をすべて洗い出す
5. 以下のAPIを使っている箇所を特定する
   - fs / path（ファイル操作）
   - child_process（外部プロセス）
   - shell（シェル実行）
   - Notification / Tray / Menu
   - autoUpdater
   - その他Node.js固有API

最後に、移管難易度をHigh/Medium/Lowで分類した一覧表を作成してください。
```

---

## Phase 1：Tauriプロジェクトのセットアップ

```
このElectronリポジトリにTauriを追加導入します。

【条件】
- 既存の src/ および package.json は変更しない
- src-tauri/ ディレクトリを新規作成してTauriをセットアップする
- フロントエンドのビルドツールは現在の [Vite / webpack / CRA] をそのまま使う
- tauri.conf.json の frontendDist と devUrl を既存の設定に合わせる

手順：
1. `npm create tauri-app` ではなく手動で src-tauri/ を構成する
2. src-tauri/Cargo.toml に必要な依存を追加する
3. package.json に以下のスクリプトを追記する
   - "tauri:dev": "tauri dev"
   - "tauri:build": "tauri build"
4. .gitignore に src-tauri/target/ を追加する

設定後、`npm run tauri:dev` で起動確認できる状態にしてください。
```

---

## Phase 2：IPCの移管（シンプルなものから）

```
Phase 0で洗い出したIPCハンドラを、難易度Lowのものから1つずつ移管します。

【移管ルール】
- ipcMain.handle('コマンド名', ...) 
  → src-tauri/src/commands/ に {コマンド名}.rs を作成
  → #[tauri::command] で実装
  → src-tauri/src/main.rs の invoke_handler に登録

- ipcRenderer.invoke('コマンド名', ...) 
  → フロントエンドでは @tauri-apps/api/core の invoke('コマンド名') に置換

- エラーハンドリングは Result<T, String> で統一する

まず最初に「[最もシンプルなハンドラ名]」だけを移管し、
動作確認できる状態にしてください。確認後に次のハンドラに進みます。
```

---

## Phase 3：ファイルシステム操作の移管

```
Electronの fs / path による操作をTauriに移管してください。

【方針】
- 基本操作（read/write/exists）は tauri-plugin-fs を使う
- src-tauri/Cargo.toml に tauri-plugin-fs を追加
- tauri.conf.json の permissions に必要なファイルシステム権限を追加
- フロントエンドは @tauri-apps/plugin-fs のAPIに置換

【注意】
- アクセスパスが $APPDATA / $HOME など環境依存の場合は
  Rust側で tauri::path::app_data_dir() を使って解決する

対象ファイル: [該当ファイルのパスを列挙]
```

---

## Phase 4：ウィンドウ・メニュー・トレイの移管

```
ElectronのBrowserWindow / Menu / Tray の設定をTauriに移管してください。

【ウィンドウ設定】
- new BrowserWindow({width, height, ...}) 
  → tauri.conf.json の windows[] セクションに記述

【システムトレイ】
- Tray + contextMenu 
  → src-tauri/src/tray.rs を作成してSystemTray + SystemTrayMenuで実装
  → main.rs の setup フックで初期化

【アプリケーションメニュー】
- Menu.buildFromTemplate(...) 
  → Rust側の tauri::menu::Menu で再構築

既存の設定値（アイコンパス・メニュー項目・ウィンドウサイズ）を
そのまま引き継いでください。
```

---

## Phase 5：外部プロセス・シェル実行の移管

```
Electronの child_process / shell.openExternal をTauriに移管してください。

【外部URLを開く】
- shell.openExternal(url) 
  → tauri-plugin-shell の open(url) に置換

【コマンド実行】
- child_process.exec / spawn 
  → tauri-plugin-shell の Command::new('...').spawn() で実装
  → tauri.conf.json の allowlist に実行コマンドを明示的に許可する

【注意】
- Tauriはセキュリティのためコマンドの事前登録が必須
- 許可するコマンドを最小限にするよう設計する

対象箇所: [該当ファイルのパスを列挙]
```

---

## Phase 6：自動アップデートの移管（該当する場合）

```
Electronの autoUpdater を tauri-plugin-updater に移管してください。

1. Cargo.toml に tauri-plugin-updater を追加
2. tauri.conf.json の updater セクションを設定
   - endpoints: アップデートサーバーのURL
   - pubkey: 署名検証用の公開鍵（tauri signer generate で生成）
3. main.rs でアップデートチェックのロジックを実装
4. フロントエンドの自動更新UIを @tauri-apps/plugin-updater で置換

署名鍵は .env に保存し、.gitignore に追加してください。
```

---

## Phase 7：Electronの削除と最終整理

```
移管が完了したので、Electronの依存を削除して最終整理を行ってください。

1. package.json から以下を削除
   - electron
   - electron-builder / electron-forge
   - その他Electron固有パッケージ

2. 以下のファイル・ディレクトリを削除
   - electron/ または main/ ディレクトリ
   - preload.ts
   - electron-builder.yml / forge.config.js

3. package.json の scripts を整理
   - "dev": "tauri dev" に変更
   - "build": "tauri build" に変更

4. README.md のセットアップ手順をTauri向けに更新する

削除前に `git status` で差分を確認し、問題なければコミットしてください。
```

---

## 共通：エラーが出たときの指示テンプレート

```
以下のエラーが発生しました：

[エラーメッセージをここに貼る]

発生箇所: [ファイル名・行番号]
実行コマンド: [npm run tauri:dev など]

原因を調査して修正してください。
修正後に再度動作確認を行ってください。
```

---

## 参考：よく使うTauriプラグイン対応表

| Electron API | Tauriの代替 |
|---|---|
| `fs` | `tauri-plugin-fs` |
| `shell.openExternal` | `tauri-plugin-shell` |
| `child_process` | `tauri-plugin-shell` |
| `Notification` | `tauri-plugin-notification` |
| `autoUpdater` | `tauri-plugin-updater` |
| `clipboard` | `tauri-plugin-clipboard-manager` |
| `globalShortcut` | `tauri-plugin-global-shortcut` |
| `dialog` | `tauri-plugin-dialog` |
| `store` (electron-store) | `tauri-plugin-store` |

---

## チェックリスト

- [ ] Phase 0: 現状分析・難易度分類完了
- [ ] Phase 1: Tauriセットアップ・起動確認完了
- [ ] Phase 2: IPC全件移管完了
- [ ] Phase 3: ファイルシステム移管完了
- [ ] Phase 4: ウィンドウ・メニュー・トレイ移管完了
- [ ] Phase 5: 外部プロセス移管完了
- [ ] Phase 6: 自動アップデート移管完了（該当する場合）
- [ ] Phase 7: Electron削除・最終整理完了