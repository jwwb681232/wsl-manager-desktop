# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
pnpm tauri dev       # Full Tauri dev mode (frontend + Rust backend)
pnpm dev             # Vite frontend dev server only (port 1420)
pnpm build           # TypeScript check + Vite production build
pnpm tauri build     # Production build of the Tauri desktop app
pnpm preview         # Preview Vite production build
```

- Rust code lives in `src-tauri/` and is built via `cargo` (invoked through `pnpm tauri`).
- `pnpm tauri dev` runs `pnpm dev` as `beforeDevCommand` then serves the frontend at `http://localhost:1420`.
- `pnpm tauri build` runs `pnpm build` as `beforeBuildCommand`, distributing output from `src-tauri/dist/`.

## Architecture

**Tauri v2 app** with a Rust backend and React+TypeScript frontend.

- **`src/`** — React 19 frontend (TypeScript, Vite 7). Entry point is `src/main.tsx`, root component is `src/App.tsx`.
- **`src-tauri/src/lib.rs`** — Rust backend entry. Tauri commands are defined here with `#[tauri::command]` and registered via `invoke_handler`. The `greet` command demonstrates the IPC pattern.
- **`src-tauri/src/main.rs`** — Binary entry point (just calls `lib.rs::run()`). On Windows release builds, suppresses the console window.
- **`src-tauri/tauri.conf.json`** — Tauri app config: window size (800x600), build hooks, security CSP (null = no restrictions), bundle targets and icons.
- **`src-tauri/capabilities/default.json`** — Tauri v2 permissions (currently `core:default` and `opener:default`).
- **`src-tauri/Cargo.toml`** — Rust dependencies: tauri 2, tauri-plugin-opener 2, serde 1, serde_json 1.
- **`package.json`** — Frontend dependencies: react 19, @tauri-apps/api v2, vite 7, typescript 5.8, pnpm workspace.

### IPC Pattern

Frontend calls Rust backend via `invoke("command_name", { args })` from `@tauri-apps/api/core`. Rust commands are plain functions annotated with `#[tauri::command]` and registered in `lib.rs`.

### Key Config

- Vite dev server is pinned to port 1420 (strict), ignores `src-tauri/` directory for file watching.
- TypeScript strict mode enabled, `noUnusedLocals` and `noUnusedParameters` are on.
- pnpm-workspace has esbuild builds disabled (`allowBuilds: esbuild: false`).

### Tauri v2 Plugin Pattern

Plugins are registered on both sides: Rust `Cargo.toml` dependency + `tauri::Builder::default().plugin(...)` in `lib.rs`, and matching npm package in `package.json`. Currently only `opener` is used.
