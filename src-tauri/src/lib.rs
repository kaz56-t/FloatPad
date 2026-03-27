use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, ShortcutState};

// ===== アプリ状態 =====

struct AppState {
    /// ミニモード折りたたみ前のウィンドウ高さ（論理ピクセル）
    saved_window_height: Mutex<f64>,
}

// ===== 型定義 =====

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MemoMeta {
    id: u32,
    name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SnippetItem {
    id: u32,
    title: Option<String>,
    text: String,
}

// ===== パスヘルパー =====

fn app_data_dir(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().expect("app_data_dir の取得に失敗")
}

fn settings_path(app: &AppHandle) -> PathBuf {
    app_data_dir(app).join("settings.json")
}

fn memo_base_dir(app: &AppHandle, settings: &Value) -> PathBuf {
    if let Some(dir) = settings.get("memoDir").and_then(|v| v.as_str()) {
        if !dir.is_empty() {
            return PathBuf::from(dir);
        }
    }
    app_data_dir(app)
}

fn memo_list_path(base: &PathBuf) -> PathBuf {
    base.join("memos.json")
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if "/\\:*?\"<>|".contains(c) { '_' } else { c })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("_")
        .chars()
        .take(50)
        .collect()
}

fn memo_file_path(base: &PathBuf, id: u32, name: &str) -> PathBuf {
    let safe = sanitize_filename(name);
    if !safe.is_empty() {
        base.join(format!("{}-{}.txt", safe, id))
    } else {
        base.join(format!("memo-{}.txt", id))
    }
}

// ===== 設定コマンド =====

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

#[tauri::command]
fn settings_save(app: AppHandle, data: Value) -> Result<bool, String> {
    let path = settings_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(true)
}

// ===== メモコマンド =====

fn load_memo_list(base: &PathBuf) -> Vec<MemoMeta> {
    let list_path = memo_list_path(base);
    if let Ok(content) = fs::read_to_string(&list_path) {
        if let Ok(list) = serde_json::from_str::<Vec<MemoMeta>>(&content) {
            return list;
        }
    }
    vec![MemoMeta { id: 1, name: "メモ 1".to_string() }]
}

fn save_memo_list(base: &PathBuf, list: &[MemoMeta]) -> Result<(), String> {
    fs::create_dir_all(base).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(list).map_err(|e| e.to_string())?;
    fs::write(memo_list_path(base), json).map_err(|e| e.to_string())
}

#[tauri::command]
fn memo_list(app: AppHandle) -> Result<Vec<MemoMeta>, String> {
    let settings = settings_load(app.clone()).unwrap_or(serde_json::json!({}));
    let base = memo_base_dir(&app, &settings);
    Ok(load_memo_list(&base))
}

#[tauri::command]
fn memo_load(app: AppHandle, id: u32) -> Result<String, String> {
    let settings = settings_load(app.clone()).unwrap_or(serde_json::json!({}));
    let base = memo_base_dir(&app, &settings);
    let list = load_memo_list(&base);
    let name = list.iter().find(|m| m.id == id).map(|m| m.name.as_str()).unwrap_or("");

    let path = memo_file_path(&base, id, name);
    if path.exists() {
        return fs::read_to_string(&path).map_err(|e| e.to_string());
    }
    // フォールバック: memo-{id}.txt
    let fallback = base.join(format!("memo-{}.txt", id));
    if fallback.exists() {
        return fs::read_to_string(&fallback).map_err(|e| e.to_string());
    }
    Ok(String::new())
}

#[tauri::command]
fn memo_save(app: AppHandle, id: u32, text: String) -> Result<bool, String> {
    let settings = settings_load(app.clone()).unwrap_or(serde_json::json!({}));
    let base = memo_base_dir(&app, &settings);
    let list = load_memo_list(&base);
    let name = list.iter().find(|m| m.id == id).map(|m| m.name.clone()).unwrap_or_default();

    fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    fs::write(memo_file_path(&base, id, &name), text).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn memo_create(app: AppHandle, name: String) -> Result<MemoMeta, String> {
    let settings = settings_load(app.clone()).unwrap_or(serde_json::json!({}));
    let base = memo_base_dir(&app, &settings);
    let mut list = load_memo_list(&base);
    let max_id = list.iter().map(|m| m.id).max().unwrap_or(0);
    let new_memo = MemoMeta { id: max_id + 1, name };
    list.push(new_memo.clone());
    save_memo_list(&base, &list)?;
    Ok(new_memo)
}

#[tauri::command]
fn memo_delete(app: AppHandle, id: u32) -> Result<bool, String> {
    let settings = settings_load(app.clone()).unwrap_or(serde_json::json!({}));
    let base = memo_base_dir(&app, &settings);
    let list = load_memo_list(&base);

    if let Some(m) = list.iter().find(|m| m.id == id) {
        let _ = fs::remove_file(memo_file_path(&base, id, &m.name));
    }
    let _ = fs::remove_file(base.join(format!("memo-{}.txt", id)));

    let new_list: Vec<MemoMeta> = list.into_iter().filter(|m| m.id != id).collect();
    save_memo_list(&base, &new_list)?;
    Ok(true)
}

#[tauri::command]
fn memo_rename(app: AppHandle, id: u32, name: String) -> Result<bool, String> {
    let settings = settings_load(app.clone()).unwrap_or(serde_json::json!({}));
    let base = memo_base_dir(&app, &settings);
    let mut list = load_memo_list(&base);

    if let Some(memo) = list.iter_mut().find(|m| m.id == id) {
        let old_path = memo_file_path(&base, id, &memo.name);
        memo.name = name.clone();
        let new_path = memo_file_path(&base, id, &name);
        if old_path != new_path {
            if old_path.exists() {
                let _ = fs::rename(&old_path, &new_path);
            } else {
                let fallback = base.join(format!("memo-{}.txt", id));
                if fallback.exists() {
                    let _ = fs::rename(&fallback, &new_path);
                }
            }
        }
        save_memo_list(&base, &list)?;
        return Ok(true);
    }
    Ok(false)
}

// ===== スニペットコマンド =====

#[tauri::command]
fn snippets_load(app: AppHandle) -> Result<Vec<SnippetItem>, String> {
    let path = app_data_dir(&app).join("snippets.json");
    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
fn snippets_save(app: AppHandle, data: Vec<SnippetItem>) -> Result<bool, String> {
    let dir = app_data_dir(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(dir.join("snippets.json"), json).map_err(|e| e.to_string())?;
    Ok(true)
}

// ===== ウィンドウコマンド =====

/// 透明度変更: ネイティブAPIが非公開のためイベントで通知し CSS 側で対応する
#[tauri::command]
fn window_set_opacity(window: WebviewWindow, opacity: f64) -> Result<bool, String> {
    window.emit("window-set-opacity", opacity).map_err(|e| e.to_string())?;
    Ok(true)
}

/// ミニモード切替: Tauri Window API でウィンドウ高さを変更する
#[tauri::command]
fn window_set_mini(
    window: WebviewWindow,
    state: tauri::State<AppState>,
    mini: bool,
) -> Result<bool, String> {
    use tauri::LogicalSize;

    if mini {
        let physical = window.inner_size().map_err(|e| e.to_string())?;
        let scale = window.scale_factor().unwrap_or(1.0);
        let logical = physical.to_logical::<f64>(scale);
        *state.saved_window_height.lock().unwrap() = logical.height;

        window
            .set_min_size(Some(LogicalSize::new(320_f64, 34_f64)))
            .map_err(|e| e.to_string())?;
        window
            .set_size(LogicalSize::new(logical.width, 34_f64))
            .map_err(|e| e.to_string())?;
    } else {
        let saved = *state.saved_window_height.lock().unwrap();
        let restore_h = if saved < 100.0 { 560.0 } else { saved };

        window
            .set_min_size(Some(LogicalSize::new(320_f64, 400_f64)))
            .map_err(|e| e.to_string())?;
        let physical = window.inner_size().map_err(|e| e.to_string())?;
        let scale = window.scale_factor().unwrap_or(1.0);
        let logical = physical.to_logical::<f64>(scale);
        window
            .set_size(LogicalSize::new(logical.width, restore_h))
            .map_err(|e| e.to_string())?;
    }
    Ok(true)
}

// ===== ダイアログコマンド =====

#[tauri::command]
fn choose_folder(app: AppHandle) -> Result<Option<String>, String> {
    use std::sync::mpsc;
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = mpsc::channel::<Option<tauri_plugin_dialog::FilePath>>();

    app.dialog()
        .file()
        .set_title("メモ保存フォルダを選択")
        .pick_folder(move |f| {
            let _ = tx.send(f);
        });

    let folder = rx.recv().map_err(|e| e.to_string())?;
    Ok(folder.map(|p| p.to_string()))
}

// ===== グローバルショートカットコマンド =====

/// Electron形式のアクセラレータ文字列を Tauri の Shortcut に変換する
/// 例: "Ctrl+Shift+Space" → Shortcut::new(CONTROL|SHIFT, Space)
fn parse_accelerator(
    accelerator: &str,
) -> Result<tauri_plugin_global_shortcut::Shortcut, String> {
    let mut modifiers = Modifiers::empty();
    let mut key_code: Option<Code> = None;

    for part in accelerator.split('+') {
        match part.trim().to_uppercase().as_str() {
            "CTRL" | "CONTROL" | "CMDORCTRL" => modifiers |= Modifiers::CONTROL,
            "SHIFT" => modifiers |= Modifiers::SHIFT,
            "ALT" | "OPTION" => modifiers |= Modifiers::ALT,
            "META" | "CMD" | "COMMAND" | "SUPER" | "WIN" => modifiers |= Modifiers::META,
            "SPACE" => key_code = Some(Code::Space),
            "ENTER" | "RETURN" => key_code = Some(Code::Enter),
            "TAB" => key_code = Some(Code::Tab),
            "ESCAPE" | "ESC" => key_code = Some(Code::Escape),
            "BACKSPACE" => key_code = Some(Code::Backspace),
            "DELETE" | "DEL" => key_code = Some(Code::Delete),
            "HOME" => key_code = Some(Code::Home),
            "END" => key_code = Some(Code::End),
            "PAGEUP" => key_code = Some(Code::PageUp),
            "PAGEDOWN" => key_code = Some(Code::PageDown),
            "F1" => key_code = Some(Code::F1),
            "F2" => key_code = Some(Code::F2),
            "F3" => key_code = Some(Code::F3),
            "F4" => key_code = Some(Code::F4),
            "F5" => key_code = Some(Code::F5),
            "F6" => key_code = Some(Code::F6),
            "F7" => key_code = Some(Code::F7),
            "F8" => key_code = Some(Code::F8),
            "F9" => key_code = Some(Code::F9),
            "F10" => key_code = Some(Code::F10),
            "F11" => key_code = Some(Code::F11),
            "F12" => key_code = Some(Code::F12),
            s if s.len() == 1 => {
                let c = s.chars().next().unwrap();
                key_code = Some(match c {
                    'A' => Code::KeyA,
                    'B' => Code::KeyB,
                    'C' => Code::KeyC,
                    'D' => Code::KeyD,
                    'E' => Code::KeyE,
                    'F' => Code::KeyF,
                    'G' => Code::KeyG,
                    'H' => Code::KeyH,
                    'I' => Code::KeyI,
                    'J' => Code::KeyJ,
                    'K' => Code::KeyK,
                    'L' => Code::KeyL,
                    'M' => Code::KeyM,
                    'N' => Code::KeyN,
                    'O' => Code::KeyO,
                    'P' => Code::KeyP,
                    'Q' => Code::KeyQ,
                    'R' => Code::KeyR,
                    'S' => Code::KeyS,
                    'T' => Code::KeyT,
                    'U' => Code::KeyU,
                    'V' => Code::KeyV,
                    'W' => Code::KeyW,
                    'X' => Code::KeyX,
                    'Y' => Code::KeyY,
                    'Z' => Code::KeyZ,
                    '0' => Code::Digit0,
                    '1' => Code::Digit1,
                    '2' => Code::Digit2,
                    '3' => Code::Digit3,
                    '4' => Code::Digit4,
                    '5' => Code::Digit5,
                    '6' => Code::Digit6,
                    '7' => Code::Digit7,
                    '8' => Code::Digit8,
                    '9' => Code::Digit9,
                    _ => return Err(format!("不明なキー: '{}'", c)),
                });
            }
            s => return Err(format!("不明なキー: '{}'", s)),
        }
    }

    key_code
        .map(|code| {
            tauri_plugin_global_shortcut::Shortcut::new(
                if modifiers.is_empty() { None } else { Some(modifiers) },
                code,
            )
        })
        .ok_or_else(|| format!("キーが指定されていません: {}", accelerator))
}

#[tauri::command]
fn global_shortcut_update(app: AppHandle, accelerator: String) -> Result<bool, String> {
    let shortcut = match parse_accelerator(&accelerator) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("ショートカット解析エラー: {}", e);
            return Ok(false);
        }
    };

    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())?;

    app.global_shortcut()
        .register(shortcut)
        .map_err(|e| e.to_string())?;

    Ok(true)
}

// ===== エントリーポイント =====

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            saved_window_height: Mutex::new(560.0),
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().ok();
                            window.set_focus().ok();
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            // 保存済み設定からホットキーを読み込んで登録する
            let hotkey = {
                let path = settings_path(app.handle());
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(settings) = serde_json::from_str::<Value>(&content) {
                        settings
                            .get("hotkey")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Ctrl+Shift+Space")
                            .to_string()
                    } else {
                        "Ctrl+Shift+Space".to_string()
                    }
                } else {
                    "Ctrl+Shift+Space".to_string()
                }
            };

            if let Ok(shortcut) = parse_accelerator(&hotkey) {
                if let Err(e) = app.global_shortcut().register(shortcut) {
                    eprintln!("グローバルショートカット登録エラー: {}", e);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            settings_load,
            settings_save,
            memo_list,
            memo_load,
            memo_save,
            memo_create,
            memo_delete,
            memo_rename,
            snippets_load,
            snippets_save,
            window_set_opacity,
            window_set_mini,
            choose_folder,
            global_shortcut_update,
        ])
        .run(tauri::generate_context!())
        .expect("Tauri アプリケーションの起動中にエラーが発生しました");
}
