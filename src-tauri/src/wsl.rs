use std::process::Output;

use serde::{Deserialize, Serialize};

use crate::error::WslError;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WslDistribution {
    pub name: String,
    pub state: String,
    pub version: u8,
    pub is_default: bool,
}

fn check_output(output: &Output) -> Result<(), WslError> {
    if !output.status.success() {
        let stderr = decode_wsl_output(&output.stderr);
        return Err(WslError::WslExeError(stderr));
    }
    Ok(())
}

/// Decode output from a Windows native executable.
/// Tries BOM detection first, then UTF-8, then falls back to UTF-16LE.
fn decode_wsl_output(bytes: &[u8]) -> String {
    if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        let utf16: Vec<u16> = bytes[2..]
            .chunks(2)
            .filter(|c| c.len() == 2)
            .map(|c| u16::from_le_bytes([c[0], c[1]]))
            .collect();
        return String::from_utf16_lossy(&utf16);
    }
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

/// Parse `wsl.exe -l -v` output.
///
/// The output format uses the last two whitespace-separated tokens per line as
/// [state] [version], with everything before them forming the distribution name.
/// This correctly handles names containing spaces.
fn parse_wsl_output(output: &str) -> Result<Vec<WslDistribution>, WslError> {
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
            return Err(WslError::ParseError(line.to_string()));
        }

        let version: u8 = parts[parts.len() - 1]
            .parse()
            .map_err(|_| WslError::InvalidVersion(parts[parts.len() - 1].to_string()))?;

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

pub async fn list_distributions() -> Result<Vec<WslDistribution>, WslError> {
    let output = tokio::process::Command::new("wsl.exe")
        .args(["-l", "-v"])
        .output()
        .await?;

    check_output(&output)?;
    let stdout = decode_wsl_output(&output.stdout);
    parse_wsl_output(&stdout)
}

pub async fn start_distribution(name: &str) -> Result<(), WslError> {
    let output = tokio::process::Command::new("wsl.exe")
        .args(["--distribution", name])
        .output()
        .await?;

    check_output(&output)?;
    Ok(())
}

pub async fn stop_distribution(name: &str) -> Result<(), WslError> {
    let output = tokio::process::Command::new("wsl.exe")
        .args(["--terminate", name])
        .output()
        .await?;

    check_output(&output)?;
    Ok(())
}
