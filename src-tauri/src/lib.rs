use std::process::Output;

use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WslDistribution {
    pub name: String,
    pub state: String,
    pub version: u8,
    pub is_default: bool,
}

fn check_output(output: &Output) -> Result<(), String> {
    if !output.status.success() {
        let stderr = decode_wsl_output(&output.stderr);
        return Err(format!("wsl.exe failed: {}", stderr));
    }
    Ok(())
}

/// Decode output from a Windows native executable.
/// Tries UTF-8 first; falls back to UTF-16LE (common for Windows CLI tools).
fn decode_wsl_output(bytes: &[u8]) -> String {
    // Check for UTF-16LE BOM (0xFF 0xFE) first — Windows tools often emit this.
    if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        let utf16: Vec<u16> = bytes[2..]
            .chunks(2)
            .filter(|c| c.len() == 2)
            .map(|c| u16::from_le_bytes([c[0], c[1]]))
            .collect();
        return String::from_utf16_lossy(&utf16);
    }
    // If UTF-8 decode succeeds but contains null bytes, it's actually UTF-16LE without BOM.
    if let Ok(s) = std::str::from_utf8(bytes) {
        if !s.contains('\0') {
            return s.to_string();
        }
    }
    let utf16: Vec<u16> = bytes
        .chunks(2)
        .filter(|c| c.len() == 2)
        .map(|c| u16::from_le_bytes([c[0], c[1]]))
        .collect();
    String::from_utf16_lossy(&utf16)
}

fn parse_wsl_output(output: &str) -> Result<Vec<WslDistribution>, String> {
    let mut distributions = Vec::new();

    for line in output.lines().skip(1) {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let is_default = trimmed.starts_with('*');
        let content = if is_default {
            trimmed[1..].trim_start()
        } else {
            trimmed
        };

        let parts: Vec<&str> = content.split_whitespace().collect();
        if parts.len() < 3 {
            return Err(format!("Unexpected wsl output format on line: '{}'", line));
        }

        let version: u8 = parts[parts.len() - 1]
            .parse()
            .map_err(|_| format!("Invalid version number: '{}'", parts[parts.len() - 1]))?;

        let state = parts[parts.len() - 2].to_string();
        let name = parts[..parts.len() - 2].join(" ");

        distributions.push(WslDistribution {
            name,
            state,
            version,
            is_default,
        });
    }

    Ok(distributions)
}

#[tauri::command]
async fn list_wsl_distributions() -> Result<Vec<WslDistribution>, String> {
    let output = tokio::process::Command::new("wsl.exe")
        .args(["-l", "-v"])
        .output()
        .await
        .map_err(|e| format!("Failed to execute wsl.exe: {}", e))?;

    check_output(&output)?;

    let stdout = decode_wsl_output(&output.stdout);
    parse_wsl_output(&stdout)
}

#[tauri::command]
async fn start_wsl_distribution(name: &str) -> Result<(), String> {
    let output = tokio::process::Command::new("wsl.exe")
        .args(["--distribution", name, "--exec", "/bin/true"])
        .output()
        .await
        .map_err(|e| format!("Failed to execute wsl.exe: {}", e))?;

    check_output(&output)?;
    Ok(())
}

#[tauri::command]
async fn stop_wsl_distribution(name: &str) -> Result<(), String> {
    let output = tokio::process::Command::new("wsl.exe")
        .args(["--terminate", name])
        .output()
        .await
        .map_err(|e| format!("Failed to execute wsl.exe: {}", e))?;

    check_output(&output)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
async fn poll_wsl_state(app_handle: tauri::AppHandle) {
    let mut prev_state: Vec<WslDistribution> = vec![];
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;

        let output = match tokio::process::Command::new("wsl.exe")
            .args(["-l", "-v"])
            .output()
            .await
        {
            Ok(o) => o,
            Err(_) => continue,
        };
        if !output.status.success() {
            continue;
        }
        let stdout = decode_wsl_output(&output.stdout);
        let distros = match parse_wsl_output(&stdout) {
            Ok(d) => d,
            Err(_) => continue,
        };
        if distros != prev_state {
            let _ = app_handle.emit("wsl-state-changed", &distros);
            prev_state = distros;
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
                let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
                rt.block_on(poll_wsl_state(handle));
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
