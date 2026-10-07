// Hardware commands (printer ESC/POS, cash drawer, scale, fingerprint) will live in `hardware/` modules
// and be registered below. Keep each peripheral behind one command set so the web app stays hardware-agnostic.

#[tauri::command]
fn hello(name: String) -> String {
    format!("Hello {name}, from Rust (Tauri)")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![hello])
        .run(tauri::generate_context!())
        .expect("error while running Pharma ERP desktop");
}
