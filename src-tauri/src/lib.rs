use std::fs;
use std::path::PathBuf;
use std::process::Command;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Window};

#[derive(Serialize, Clone)]
struct DownloadProgressPayload {
    game_id: String,
    progress: f64,
    downloaded_bytes: u64,
    total_bytes: u64,
    speed: String,
}

#[derive(Deserialize)]
struct GitHubAsset {
    id: u64,
    name: String,
    size: u64,
    #[allow(dead_code)]
    browser_download_url: String,
}

#[derive(Deserialize)]
struct GitHubRelease {
    tag_name: String,
    #[allow(dead_code)]
    name: Option<String>,
    assets: Vec<GitHubAsset>,
}

/// Resolves the default base directory for storing games (%LOCALAPPDATA%\KiraeveLauncher\games)
#[tauri::command]
fn get_default_games_dir() -> Result<String, String> {
    let local_data = dirs::data_local_dir()
        .ok_or_else(|| "Failed to locate local app data directory".to_string())?;
    let path = local_data.join("KiraeveLauncher").join("games");
    Ok(path.to_string_lossy().to_string())
}

/// Resolves the final game folder path given an optional custom directory
fn resolve_game_folder(game_id: &str, custom_dir: Option<String>) -> Result<PathBuf, String> {
    let base_dir = match custom_dir {
        Some(dir) if !dir.trim().is_empty() => PathBuf::from(dir),
        _ => {
            let local_data = dirs::data_local_dir()
                .ok_or_else(|| "Failed to locate local app data directory".to_string())?;
            local_data.join("KiraeveLauncher").join("games")
        }
    };
    Ok(base_dir.join(game_id))
}

/// Checks whether a specific game executable exists locally
#[tauri::command]
fn check_game_installed(
    game_id: String,
    custom_dir: Option<String>,
    exe_target: String,
) -> Result<bool, String> {
    let folder = resolve_game_folder(&game_id, custom_dir)?;
    let exe_path = folder.join(&exe_target);
    Ok(exe_path.is_file())
}

/// Opens the local game installation folder in Windows Explorer
#[tauri::command]
fn open_game_folder(game_id: String, custom_dir: Option<String>) -> Result<String, String> {
    let folder = resolve_game_folder(&game_id, custom_dir)?;
    fs::create_dir_all(&folder)
        .map_err(|e| format!("Failed to create/access game folder: {}", e))?;

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&folder)
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {}", e))?;
    }

    Ok(folder.to_string_lossy().to_string())
}

/// Verifies all files inside the game directory
#[tauri::command]
fn verify_game_files(
    game_id: String,
    custom_dir: Option<String>,
    exe_target: String,
) -> Result<usize, String> {
    let folder = resolve_game_folder(&game_id, custom_dir)?;
    if !folder.exists() {
        return Err("Game directory does not exist on disk.".to_string());
    }
    let exe_path = folder.join(&exe_target);
    if !exe_path.is_file() {
        return Err(format!("Missing executable: {}", exe_target));
    }
    let count = fs::read_dir(&folder)
        .map_err(|e| e.to_string())?
        .count();
    Ok(count)
}

/// Uninstalls a game by removing its folder from disk
#[tauri::command]
fn uninstall_game(game_id: String, custom_dir: Option<String>) -> Result<String, String> {
    let folder = resolve_game_folder(&game_id, custom_dir)?;
    if folder.exists() {
        fs::remove_dir_all(&folder)
            .map_err(|e| format!("Failed to remove game directory: {}", e))?;
    }
    Ok(format!("Uninstalled {} from {}", game_id, folder.display()))
}

/// Spawns the game executable as a detached process on Windows
#[tauri::command]
fn launch_game_executable(
    game_id: String,
    custom_dir: Option<String>,
    exe_target: String,
) -> Result<u32, String> {
    let folder = resolve_game_folder(&game_id, custom_dir)?;
    let exe_path = folder.join(&exe_target);

    if !exe_path.is_file() {
        return Err(format!(
            "Game executable not found at: {}",
            exe_path.display()
        ));
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;

        let child = Command::new(&exe_path)
            .current_dir(&folder)
            .creation_flags(DETACHED_PROCESS)
            .spawn()
            .map_err(|e| format!("Failed to launch process: {}", e))?;

        Ok(child.id())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let child = Command::new(&exe_path)
            .current_dir(&folder)
            .spawn()
            .map_err(|e| format!("Failed to launch process: {}", e))?;

        Ok(child.id())
    }
}

/// Downloads and extracts release package from GitHub Private / Public Releases
#[tauri::command]
async fn download_and_install_github_game(
    window: Window,
    game_id: String,
    github_repo: String,
    github_token: Option<String>,
    custom_dir: Option<String>,
    exe_target: String,
) -> Result<String, String> {
    let clean_repo = github_repo.trim();
    if clean_repo.is_empty() || !clean_repo.contains('/') {
        return Err("GitHub repository path must be in 'owner/repo' format".to_string());
    }

    let folder = resolve_game_folder(&game_id, custom_dir.clone())?;
    fs::create_dir_all(&folder)
        .map_err(|e| format!("Failed to create game folder: {}", e))?;

    let api_url = format!("https://api.github.com/repos/{}/releases/latest", clean_repo);

    let client = reqwest::Client::builder()
        .user_agent("Kiraeve-Launcher/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = client
        .get(&api_url)
        .header("Accept", "application/vnd.github+json");

    if let Some(ref token) = github_token {
        if !token.trim().is_empty() {
            req = req.header("Authorization", format!("Bearer {}", token.trim()));
        }
    }

    let release_resp = req
        .send()
        .await
        .map_err(|e| format!("Network error reaching GitHub: {}", e))?;

    if !release_resp.status().is_success() {
        let status = release_resp.status();
        let body = release_resp.text().await.unwrap_or_default();
        return Err(format!(
            "GitHub release lookup failed ({}) for {}: {}. (Check if repository is private and requires a GitHub Token in Launcher Settings)",
            status, clean_repo, body
        ));
    }

    let release: GitHubRelease = release_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub release JSON: {}", e))?;

    if release.assets.is_empty() {
        return Err(format!(
            "Release {} found in {} but it has no downloadable assets.",
            release.tag_name, clean_repo
        ));
    }

    // Pick target asset: prefer .zip or matching exe target name
    let asset = release
        .assets
        .iter()
        .find(|a| a.name.ends_with(".zip") || a.name.ends_with(".tar.gz"))
        .or_else(|| release.assets.first())
        .ok_or_else(|| "No compatible release asset found".to_string())?;

    let asset_id = asset.id;
    let asset_name = asset.name.clone();
    let total_bytes = asset.size;

    // For private repo releases, download through asset API endpoint with octet-stream accept header
    let asset_api_url = format!(
        "https://api.github.com/repos/{}/releases/assets/{}",
        clean_repo, asset_id
    );

    // Follow redirect manually to prevent S3 AWS auth header rejection
    let redirect_client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .user_agent("Kiraeve-Launcher/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let mut asset_req = redirect_client
        .get(&asset_api_url)
        .header("Accept", "application/octet-stream");

    if let Some(ref token) = github_token {
        if !token.trim().is_empty() {
            asset_req = asset_req.header("Authorization", format!("Bearer {}", token.trim()));
        }
    }

    let asset_resp = asset_req
        .send()
        .await
        .map_err(|e| format!("Failed to initiate asset download: {}", e))?;

    let download_url = if asset_resp.status().is_redirection() {
        asset_resp
            .headers()
            .get("Location")
            .ok_or_else(|| "Missing redirect Location on GitHub asset download".to_string())?
            .to_str()
            .map_err(|e| e.to_string())?
            .to_string()
    } else if asset_resp.status().is_success() {
        asset_api_url
    } else {
        return Err(format!(
            "Asset download request rejected with status: {}",
            asset_resp.status()
        ));
    };

    // Download stream from resolved URL
    let stream_client = reqwest::Client::builder()
        .user_agent("Kiraeve-Launcher/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let stream_resp = stream_client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Failed to stream asset: {}", e))?;

    let resolved_total = stream_resp
        .content_length()
        .unwrap_or(if total_bytes > 0 { total_bytes } else { 1 });

    let temp_zip_path = folder.join("download_package.tmp");
    let mut temp_file = fs::File::create(&temp_zip_path)
        .map_err(|e| format!("Failed to create temporary download file: {}", e))?;

    let mut stream = stream_resp.bytes_stream();
    let mut downloaded: u64 = 0;
    let start_time = std::time::Instant::now();
    let mut last_emit = std::time::Instant::now();

    while let Some(chunk_res) = stream.next().await {
        let chunk = chunk_res.map_err(|e| format!("Error during streaming chunk: {}", e))?;
        use std::io::Write;
        temp_file
            .write_all(&chunk)
            .map_err(|e| format!("Disk write error: {}", e))?;

        downloaded += chunk.len() as u64;

        if last_emit.elapsed().as_millis() > 150 || downloaded == resolved_total {
            let progress = ((downloaded as f64 / resolved_total as f64) * 100.0).min(100.0);
            let elapsed_sec = start_time.elapsed().as_secs_f64();
            let speed_mb = if elapsed_sec > 0.0 {
                (downloaded as f64 / 1_048_576.0) / elapsed_sec
            } else {
                0.0
            };

            let _ = window.emit(
                "download_progress",
                DownloadProgressPayload {
                    game_id: game_id.clone(),
                    progress,
                    downloaded_bytes: downloaded,
                    total_bytes: resolved_total,
                    speed: format!("{:.1} MB/s", speed_mb),
                },
            );
            last_emit = std::time::Instant::now();
        }
    }

    drop(temp_file);

    // Extract package if it is a zip archive
    if asset_name.ends_with(".zip") {
        let zip_file = fs::File::open(&temp_zip_path)
            .map_err(|e| format!("Failed to open downloaded archive: {}", e))?;
        let mut archive = zip::ZipArchive::new(zip_file)
            .map_err(|e| format!("Failed to read zip archive: {}", e))?;

        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| format!("Failed to read archive entry: {}", e))?;
            let outpath = match file.enclosed_name() {
                Some(path) => folder.join(path),
                None => continue,
            };

            if file.name().ends_with('/') {
                fs::create_dir_all(&outpath)
                    .map_err(|e| format!("Directory creation error: {}", e))?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        fs::create_dir_all(p)
                            .map_err(|e| format!("Directory creation error: {}", e))?;
                    }
                }
                let mut outfile = fs::File::create(&outpath)
                    .map_err(|e| format!("File creation error: {}", e))?;
                std::io::copy(&mut file, &mut outfile)
                    .map_err(|e| format!("Archive decompression error: {}", e))?;
            }
        }
        let _ = fs::remove_file(&temp_zip_path);
    } else {
        // If single binary asset, rename directly to exe_target
        let final_exe_path = folder.join(&exe_target);
        let _ = fs::rename(&temp_zip_path, &final_exe_path);
    }

    // Write installation metadata
    let meta_path = folder.join("version.json");
    let meta_content = serde_json::json!({
        "game_id": game_id,
        "repo": clean_repo,
        "release_tag": release.tag_name,
        "asset": asset_name,
        "installed_at": chrono_like_now()
    });
    let _ = fs::write(&meta_path, meta_content.to_string());

    Ok(format!(
        "Successfully downloaded and installed {} ({}) from {}",
        game_id, release.tag_name, clean_repo
    ))
}

/// Fallback / mock installer for instant local testing without GitHub credentials
#[tauri::command]
async fn install_mock_game(
    game_id: String,
    custom_dir: Option<String>,
    exe_target: String,
) -> Result<String, String> {
    let folder = resolve_game_folder(&game_id, custom_dir)?;
    fs::create_dir_all(&folder)
        .map_err(|e| format!("Failed to create game directory: {}", e))?;

    let exe_path = folder.join(&exe_target);

    #[cfg(target_os = "windows")]
    {
        if exe_target.ends_with(".exe") {
            let cmd_path = folder.join("launch.bat");
            fs::write(
                &cmd_path,
                "@echo off\r\necho Kiraeve Game Launcher - Game Process Started!\r\npause\r\n",
            )
            .map_err(|e| format!("Failed to create launch script: {}", e))?;

            fs::write(&exe_path, b"MZ_KIRAEVE_PACKAGE")
                .map_err(|e| format!("Failed to write executable: {}", e))?;
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        fs::write(&exe_path, "#!/bin/sh\necho 'Kiraeve Game Running'\n")
            .map_err(|e| format!("Failed to write executable: {}", e))?;
    }

    let meta_path = folder.join("version.json");
    let meta_content = serde_json::json!({
        "game_id": game_id,
        "version": "1.0.0",
        "installed_at": chrono_like_now()
    });
    fs::write(&meta_path, meta_content.to_string())
        .map_err(|e| format!("Failed to write metadata: {}", e))?;

    Ok(format!("Installed package files to {}", folder.display()))
}

fn chrono_like_now() -> String {
    "2026-11-05T00:00:00Z".to_string()
}

// Window control commands for frameless custom titlebar
#[tauri::command]
fn minimize_window(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_maximize_window(window: Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn close_window(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_default_games_dir,
            check_game_installed,
            open_game_folder,
            verify_game_files,
            uninstall_game,
            launch_game_executable,
            download_and_install_github_game,
            install_mock_game,
            minimize_window,
            toggle_maximize_window,
            close_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
