---
name: tauri-dev
description: >
  Tauri desktop application development for Kiraeve Game Launcher:
  Rust backend commands (IPC), process execution for launching game executables,
  safe archive extraction, Windows path handling, and release updates.
  Trigger: /tauri-dev, /tauri.
argument-hint: "[command|ipc|build|status]"
---

# Tauri Development Skill (Game Launcher)

Guidelines and conventions for developing the desktop game launcher using Tauri (Rust + Web).

## 1. Core Principles
- **Minimalist & Lean (Ponytail)**: Use standard library and lightweight crates. Avoid heavy, unneeded dependencies.
- **Windows First**: Ensure path separators, working directories, and process invocation are properly handled on Windows (`std::path::PathBuf`, raw strings, executable extensions).
- **Safe Process Spawning**: When launching games, spawn detached processes so launcher stability is decoupled from game processes.

## 2. Tauri IPC Architecture (`tauri::command`)
All native interactions must pass through explicit Tauri commands exposed to the frontend:

- `check_game_installed(game_id: String) -> Result<bool, String>`
- `download_game_release(repo: String, tag: String, target_path: String) -> Result<(), String>`
- `launch_game_executable(exe_path: String, args: Vec<String>) -> Result<u32, String>`
- `verify_local_files(game_id: String) -> Result<bool, String>`

## 3. Development Workflow & Commands
- **Dev Server**: `npm run tauri dev` or `cargo tauri dev`
- **Production Build**: `npm run tauri build` or `cargo tauri build`
- **Build Requirements**:
  - MSVC C++ Build Tools installed.
  - WebView2 runtime (pre-installed on Windows 10/11).
  - Rust stable toolchain.

## 4. GitHub Releases & Update Flow
- Fetch latest release via GitHub REST API: `https://api.github.com/repos/{owner}/{repo}/releases/latest`
- Compare release semantic version tag against local metadata file (`version.json`).
- Download binary or archive directly to cache directory, extract, and update local state.
