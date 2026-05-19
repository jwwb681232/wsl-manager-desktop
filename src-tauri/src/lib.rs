mod error;
mod wsl;

use tauri::Emitter;
use tracing::{error, info};

use wsl::WslDistribution;

/// Periodically polls WSL state in a background thread and emits events on change.
async fn poll_wsl_state(app_handle: tauri::AppHandle) {
    let mut prev = Vec::new();
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;

        match wsl::list_distributions().await {
            Ok(d) if d != prev => {
                let _ = app_handle.emit("wsl-state-changed", &d);
                prev = d;
            }
            Ok(_) => {}
            Err(e) => error!("WSL poll failed: {}", e),
        }
    }
}

#[tauri::command]
async fn list_wsl_distributions() -> Result<Vec<WslDistribution>, String> {
    wsl::list_distributions().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn start_wsl_distribution(name: String) -> Result<(), String> {
    info!("Starting WSL distribution: {}", name);
    wsl::start_distribution(&name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn stop_wsl_distribution(name: String) -> Result<(), String> {
    info!("Stopping WSL distribution: {}", name);
    wsl::stop_distribution(&name)
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    info!("Starting WSL Manager");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_wsl_distributions,
            start_wsl_distribution,
            stop_wsl_distribution
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new()
                    .expect("Failed to create tokio runtime for WSL polling");
                rt.block_on(poll_wsl_state(handle));
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
