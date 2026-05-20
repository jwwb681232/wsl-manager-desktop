use std::process::Output;

use serde::{Deserialize, Serialize};

use crate::error::WslError;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn wsl_command() -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new("wsl.exe");
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

// ── types ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WslDistribution {
    pub name: String,
    pub state: String,
    pub version: u8,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistributionDetail {
    pub name: String,
    pub state: String,
    pub version: u8,
    pub is_default: bool,
    pub default_user: String,
    pub disk_info: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceInfo {
    pub cpu_percent: f32,
    pub memory_mb: f32,
}

// ── helpers ─────────────────────────────────────────────────────────

fn check_output(output: &Output) -> Result<(), WslError> {
    if !output.status.success() {
        let stderr = decode_wsl_output(&output.stderr);
        return Err(WslError::WslExeError(stderr));
    }
    Ok(())
}

/// Decode output from a Windows native executable.
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

// ── commands ────────────────────────────────────────────────────────

pub async fn list_distributions() -> Result<Vec<WslDistribution>, WslError> {
    let output = wsl_command()
        .args(["-l", "-v"])
        .output()
        .await?;

    check_output(&output)?;
    let stdout = decode_wsl_output(&output.stdout);
    parse_wsl_output(&stdout)
}

pub async fn start_distribution(name: &str) -> Result<(), WslError> {
    let output = wsl_command()
        .args(["--distribution", name])
        .output()
        .await?;
    check_output(&output)?;
    Ok(())
}

pub fn open_terminal(name: &str) -> Result<(), WslError> {
    std::process::Command::new("wsl.exe")
        .args(["--distribution", name])
        .spawn()
        .map_err(WslError::from)?;
    Ok(())
}

pub async fn stop_distribution(name: &str) -> Result<(), WslError> {
    let output = wsl_command()
        .args(["--terminate", name])
        .output()
        .await?;
    check_output(&output)?;
    Ok(())
}

pub async fn get_detail(name: &str) -> Result<DistributionDetail, WslError> {
    let list = list_distributions().await?;
    let distro = list
        .into_iter()
        .find(|d| d.name.eq_ignore_ascii_case(name))
        .ok_or_else(|| WslError::WslExeError(format!("Distribution '{}' not found", name)))?;

    let default_user = get_default_user(name).await.unwrap_or_default();
    let disk_info = get_disk_info(name).await.unwrap_or_default();

    Ok(DistributionDetail {
        name: distro.name,
        state: distro.state,
        version: distro.version,
        is_default: distro.is_default,
        default_user,
        disk_info,
    })
}

async fn get_default_user(name: &str) -> Result<String, WslError> {
    let output = wsl_command()
        .args(["-d", name, "--exec", "whoami"])
        .output()
        .await?;
    check_output(&output)?;
    Ok(decode_wsl_output(&output.stdout).trim().to_string())
}

async fn get_disk_info(name: &str) -> Result<String, WslError> {
    let output = wsl_command()
        .args(["-d", name, "--exec", "df", "-h", "/"])
        .output()
        .await?;
    check_output(&output)?;
    Ok(decode_wsl_output(&output.stdout).trim().to_string())
}

pub async fn set_default(name: &str) -> Result<(), WslError> {
    let output = wsl_command()
        .args(["--set-default", name])
        .output()
        .await?;
    check_output(&output)?;
    Ok(())
}

pub async fn convert_version(name: &str, version: u8) -> Result<(), WslError> {
    let output = wsl_command()
        .args(["--set-version", name, &version.to_string()])
        .output()
        .await?;
    check_output(&output)?;
    Ok(())
}

pub async fn unregister(name: &str) -> Result<(), WslError> {
    let output = wsl_command()
        .args(["--unregister", name])
        .output()
        .await?;
    check_output(&output)?;
    Ok(())
}

pub async fn export_distro(name: &str, path: &str) -> Result<(), WslError> {
    let output = wsl_command()
        .args(["--export", name, path])
        .output()
        .await?;
    check_output(&output)?;
    Ok(())
}

pub async fn import_distro(name: &str, install_path: &str, tar_path: &str) -> Result<(), WslError> {
    let output = wsl_command()
        .args(["--import", name, install_path, tar_path])
        .output()
        .await?;
    check_output(&output)?;
    Ok(())
}

pub async fn get_resources(name: &str) -> Result<ResourceInfo, WslError> {
    // Use /proc/stat and /proc/meminfo inside the WSL distro
    let cpu_output = wsl_command()
        .args([
            "-d",
            name,
            "--exec",
            "sh",
            "-c",
            "cat /proc/loadavg | awk '{print $1*100}'",
        ])
        .output()
        .await?;

    // Run top -bn1 to get memory info
    let mem_output = wsl_command()
        .args([
            "-d",
            name,
            "--exec",
            "sh",
            "-c",
            "free -m | awk '/Mem:/{print $3}'",
        ])
        .output()
        .await?;

    let cpu_percent = if cpu_output.status.success() {
        decode_wsl_output(&cpu_output.stdout)
            .trim()
            .parse::<f32>()
            .unwrap_or(0.0)
    } else {
        0.0
    };

    let memory_mb = if mem_output.status.success() {
        decode_wsl_output(&mem_output.stdout)
            .trim()
            .parse::<f32>()
            .unwrap_or(0.0)
    } else {
        0.0
    };

    Ok(ResourceInfo {
        cpu_percent,
        memory_mb,
    })
}
