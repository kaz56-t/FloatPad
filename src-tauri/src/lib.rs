use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// メモの保存パス: ~/Documents/FloatPad/memo.txt
fn memo_path(app: &AppHandle) -> PathBuf {
    app.path()
        .document_dir()
        .expect("documents dir の取得に失敗")
        .join("FloatPad")
        .join("memo.txt")
}

/// 設定の保存パス: %APPDATA%/FloatPad/settings.json (Windows)
///                 ~/Library/Application Support/FloatPad/settings.json (macOS)
fn settings_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("app data dir の取得に失敗")
        .join("settings.json")
}

/// メモをファイルに保存する
#[tauri::command]
fn memo_save(app: AppHandle, text: String) -> Result<(), String> {
    let path = memo_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, text).map_err(|e| e.to_string())
}

/// メモをファイルから読み込む（ファイルが存在しない場合は空文字を返す）
#[tauri::command]
fn memo_load(app: AppHandle) -> Result<String, String> {
    let path = memo_path(&app);
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

/// 設定をJSONファイルに保存する
#[tauri::command]
fn settings_save(app: AppHandle, data: Value) -> Result<(), String> {
    let path = settings_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

/// 設定をJSONファイルから読み込む（ファイルが存在しない場合は空オブジェクトを返す）
#[tauri::command]
fn settings_load(app: AppHandle) -> Result<Value, String> {
    let path = settings_path(&app);
    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(serde_json::json!({}))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            memo_save,
            memo_load,
            settings_save,
            settings_load,
        ])
        .run(tauri::generate_context!())
        .expect("Tauri アプリケーションの起動中にエラーが発生しました");
}
