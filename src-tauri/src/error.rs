use thiserror::Error;

#[derive(Error, Debug)]
pub enum WslError {
    #[error("Failed to execute wsl.exe: {0}")]
    CommandFailed(#[from] std::io::Error),

    #[error("wsl.exe error: {0}")]
    WslExeError(String),

    #[error("Unexpected wsl output format on line: '{0}'")]
    ParseError(String),

    #[error("Invalid version number: '{0}'")]
    InvalidVersion(String),
}
