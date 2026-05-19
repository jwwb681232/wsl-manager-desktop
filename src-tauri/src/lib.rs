mod error;
mod wsl;

use std::sync::atomic::{AtomicU64, Ordering};

use tauri::Emitter;
use tracing::{error, info};

use wsl::{DistributionDetail, ResourceInfo, WslDistribution};

static POLL_INTERVAL_SECS: AtomicU64 = AtomicU64::new(5);

async fn poll_wsl_state(app_handle: tauri::AppHandle) {
    let mut prev = Vec::new();
    loop {
        let secs = POLL_INTERVAL_SECS.load(Ordering::Relaxed);
        tokio::time::sleep(std::time::Duration::from_secs(secs)).await;

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

// ── Tauri commands ──────────────────────────────────────────────────

#[tauri::command]
async fn list_wsl_distributions() -> Result<Vec<WslDistribution>, String> {
    wsl::list_distributions().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn start_wsl_distribution(name: String) -> Result<(), String> {
    info!("Starting WSL distribution: {}", name);
    wsl::start_distribution(&name).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn stop_wsl_distribution(name: String) -> Result<(), String> {
    info!("Stopping WSL distribution: {}", name);
    wsl::stop_distribution(&name).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_distribution_detail(name: String) -> Result<DistributionDetail, String> {
    wsl::get_detail(&name).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_default_distribution(name: String) -> Result<(), String> {
    info!("Setting default distribution: {}", name);
    wsl::set_default(&name).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn convert_distribution_version(name: String, version: u8) -> Result<(), String> {
    info!("Converting {} to WSL {}", name, version);
    wsl::convert_version(&name, version)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn unregister_distribution(name: String) -> Result<(), String> {
    info!("Unregistering distribution: {}", name);
    wsl::unregister(&name).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn export_distribution(name: String, path: String) -> Result<(), String> {
    info!("Exporting {} to {}", name, path);
    wsl::export_distro(&name, &path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn import_distribution(name: String, install_path: String, tar_path: String) -> Result<(), String> {
    info!("Importing {} from {}", name, tar_path);
    wsl::import_distro(&name, &install_path, &tar_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_distribution_resources(name: String) -> Result<ResourceInfo, String> {
    wsl::get_resources(&name).await.map_err(|e| e.to_string())
}

#[tauri::command]
fn get_polling_interval() -> u64 {
    POLL_INTERVAL_SECS.load(Ordering::Relaxed)
}

#[tauri::command]
fn set_polling_interval(secs: u64) {
    POLL_INTERVAL_SECS.store(secs.clamp(2, 60), Ordering::Relaxed);
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
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_wsl_distributions,
            start_wsl_distribution,
            stop_wsl_distribution,
            get_distribution_detail,
            set_default_distribution,
            convert_distribution_version,
            unregister_distribution,
            export_distribution,
            import_distribution,
            get_distribution_resources,
            get_polling_interval,
            set_polling_interval,
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
