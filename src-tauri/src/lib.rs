use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WslDistribution {
    pub name: String,
    pub state: String,
    pub version: u8,
    pub is_default: bool,
}

/// Decode output from a Windows native executable.
/// Tries UTF-8 first; falls back to UTF-16LE (common for Windows CLI tools).
fn decode_wsl_output(bytes: &[u8]) -> String {
    if let Ok(s) = std::str::from_utf8(bytes) {
        return s.to_string();
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
fn list_wsl_distributions() -> Result<Vec<WslDistribution>, String> {
    let output = std::process::Command::new("wsl.exe")
        .args(["-l", "-v"])
        .output()
        .map_err(|e| format!("Failed to execute wsl.exe: {}", e))?;

    if !output.status.success() {
        let stderr = decode_wsl_output(&output.stderr);
        return Err(format!("wsl.exe failed: {}", stderr));
    }

    let stdout = decode_wsl_output(&output.stdout);
    parse_wsl_output(&stdout)
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, list_wsl_distributions])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
