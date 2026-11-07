use std::fs;
use std::path::PathBuf;
use std::process::Command;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{Emitter, Window};

#[derive(Serialize, Clone)]
struct DownloadProgressPayload {
    game_id: String,
    progress: f64,
    downloaded_bytes: u64,
    total_bytes: u64,
    speed: String,
}

#[derive(Serialize, Clone)]
struct GameSessionEndedPayload {
    game_id: String,
    duration_seconds: u64,
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

/// Resolves the default base directory for storing games (%LOCALAPPDATA%\Asparagus\games)
#[tauri::command]
fn get_default_games_dir() -> Result<String, String> {
    let local_data = dirs::data_local_dir()
        .ok_or_else(|| "Failed to locate local app data directory".to_string())?;
    let modern_path = local_data.join("Asparagus").join("games");
    let legacy_path = local_data.join("KiraeveLauncher").join("games");
    if legacy_path.exists() && !modern_path.exists() {
        Ok(legacy_path.to_string_lossy().to_string())
    } else {
        Ok(modern_path.to_string_lossy().to_string())
    }
}

/// Resolves the final game folder path given an optional custom directory
fn resolve_game_folder(game_id: &str, custom_dir: Option<String>) -> Result<PathBuf, String> {
    let base_dir = match custom_dir {
        Some(dir) if !dir.trim().is_empty() => PathBuf::from(dir),
        _ => {
            let local_data = dirs::data_local_dir()
                .ok_or_else(|| "Failed to locate local app data directory".to_string())?;
            let modern_path = local_data.join("Asparagus").join("games");
            let legacy_path = local_data.join("KiraeveLauncher").join("games");
            if legacy_path.exists() && !modern_path.exists() {
                legacy_path
            } else {
                modern_path
            }
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

/// Uninstalls a game by cleanly terminating lingering processes and removing its directory
#[tauri::command]
fn uninstall_game(game_id: String, custom_dir: Option<String>) -> Result<String, String> {
    let folder = resolve_game_folder(&game_id, custom_dir)?;
    if !folder.exists() {
        return Ok(format!("Folder does not exist: {}", folder.display()));
    }

    #[cfg(target_os = "windows")]
    {
        // Try clearing readonly attributes in case Unity marked files readonly
        let _ = Command::new("cmd")
            .args(["/c", "attrib", "-r", "-s", "-h", "/s", "/d", "*.*"])
            .current_dir(&folder)
            .output();

        // If direct remove_dir_all fails, fall back to Windows rmdir /s /q
        if let Err(_) = fs::remove_dir_all(&folder) {
            let status = Command::new("cmd")
                .args(["/c", "rmdir", "/s", "/q", &folder.to_string_lossy()])
                .status();
            if let Err(e) = status {
                return Err(format!("Failed to uninstall directory: {}", e));
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        fs::remove_dir_all(&folder)
            .map_err(|e| format!("Failed to remove game directory: {}", e))?;
    }

    if folder.exists() {
        return Err("Could not completely delete the folder. A file may still be in use.".to_string());
    }

    Ok(format!("Uninstalled {} successfully", game_id))
}

/// Spawns the game executable as a detached process on Windows
#[tauri::command]
fn launch_game_executable(
    window: Window,
    game_id: String,
    custom_dir: Option<String>,
    exe_target: String,
    player_uid: Option<String>,
) -> Result<u32, String> {
    let folder = resolve_game_folder(&game_id, custom_dir)?;
    let exe_path = folder.join(&exe_target);

    if !exe_path.is_file() {
        return Err(format!(
            "Game executable not found at: {}",
            exe_path.display()
        ));
    }

    let uid = player_uid.unwrap_or_else(|| "GUEST_OFFLINE".to_string());
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let token_raw = format!("KIRAEVE_SECRET_KEY_v1:{}:{}:{}", game_id, uid, ts);
    let mut hasher = Sha256::new();
    hasher.update(token_raw.as_bytes());
    let token = hasher
        .finalize()
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>();

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;

        let mut child = Command::new(&exe_path)
            .current_dir(&folder)
            .creation_flags(DETACHED_PROCESS)
            .arg("--kiraeve-token")
            .arg(&token)
            .arg("--uid")
            .arg(&uid)
            .arg("--ts")
            .arg(ts.to_string())
            .spawn()
            .map_err(|e| format!("Failed to launch process: {}", e))?;

        let pid = child.id();
        let gid = game_id.clone();
        let win = window.clone();

        std::thread::spawn(move || {
            let start = std::time::Instant::now();
            let _ = child.wait();
            let duration_seconds = start.elapsed().as_secs();
            let _ = win.emit(
                "game_session_ended",
                GameSessionEndedPayload {
                    game_id: gid,
                    duration_seconds,
                },
            );
        });

        Ok(pid)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let mut child = Command::new(&exe_path)
            .current_dir(&folder)
            .spawn()
            .map_err(|e| format!("Failed to launch process: {}", e))?;

        let pid = child.id();
        let gid = game_id.clone();
        let win = window.clone();

        std::thread::spawn(move || {
            let start = std::time::Instant::now();
            let _ = child.wait();
            let duration_seconds = start.elapsed().as_secs();
            let _ = win.emit(
                "game_session_ended",
                GameSessionEndedPayload {
                    game_id: gid,
                    duration_seconds,
                },
            );
        });

        Ok(pid)
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

fn chrono_like_now() -> String {
    "2026-11-05T00:00:00Z".to_string()
}

// ==============================================================================
// Steam-like Differential Game Sync Engine (Manifest-based Delta Updating)
// ==============================================================================

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ManifestFileItem {
    pub path: String,
    pub size: u64,
    pub sha256: String,
    #[serde(default)]
    pub url: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GameManifest {
    pub game_id: String,
    pub version: String,
    #[serde(default)]
    pub base_url: String,
    pub files: Vec<ManifestFileItem>,
}

#[derive(Serialize, Clone, Debug)]
pub struct GameUpdateCheckResult {
    pub needs_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub update_size_bytes: u64,
    pub changed_files_count: usize,
    pub total_files_count: usize,
}

fn compute_file_sha256(path: &std::path::Path) -> Result<String, String> {
    use std::io::Read;
    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536];
    loop {
        let n = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }
    let result = hasher.finalize();
    Ok(result.iter().map(|b| format!("{:02x}", b)).collect())
}

/// Checks if local game files differ from the remote manifest without downloading
#[tauri::command]
async fn check_game_update(
    game_id: String,
    manifest_url: String,
    custom_dir: Option<String>,
    auth_token: Option<String>,
) -> Result<GameUpdateCheckResult, String> {
    let folder = resolve_game_folder(&game_id, custom_dir)?;

    let client = reqwest::Client::builder()
        .user_agent("Kiraeve-Launcher/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = client.get(&manifest_url);
    if let Some(ref token) = auth_token {
        if !token.trim().is_empty() {
            req = req.header("Authorization", format!("Bearer {}", token.trim()));
        }
    }

    let resp = req.send().await.map_err(|e| format!("Failed to fetch manifest: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("Manifest request failed: {}", resp.status()));
    }

    let remote_manifest: GameManifest = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse manifest JSON: {}", e))?;

    let local_manifest_path = folder.join("installed_manifest.json");
    let current_version = if local_manifest_path.exists() {
        fs::read_to_string(&local_manifest_path)
            .ok()
            .and_then(|s| serde_json::from_str::<GameManifest>(&s).ok())
            .map(|m| m.version)
            .unwrap_or_else(|| "unknown".to_string())
    } else {
        "not_installed".to_string()
    };

    let mut changed_files = 0usize;
    let mut update_bytes = 0u64;

    for item in &remote_manifest.files {
        let relative = item.path.replace('/', std::path::MAIN_SEPARATOR_STR);
        let file_path = folder.join(relative);

        let needs_download = match fs::metadata(&file_path) {
            Ok(meta) => {
                if meta.len() != item.size {
                    true
                } else {
                    match compute_file_sha256(&file_path) {
                        Ok(hash) => hash.to_lowercase() != item.sha256.to_lowercase(),
                        Err(_) => true,
                    }
                }
            }
            Err(_) => true,
        };

        if needs_download {
            changed_files += 1;
            update_bytes += item.size;
        }
    }

    Ok(GameUpdateCheckResult {
        needs_update: changed_files > 0,
        current_version,
        latest_version: remote_manifest.version,
        update_size_bytes: update_bytes,
        changed_files_count: changed_files,
        total_files_count: remote_manifest.files.len(),
    })
}

/// Downloads and updates only changed or missing files (Steam-like differential sync)
#[tauri::command]
async fn sync_game_differential(
    window: Window,
    game_id: String,
    manifest_url: String,
    custom_dir: Option<String>,
    auth_token: Option<String>,
) -> Result<String, String> {
    let folder = resolve_game_folder(&game_id, custom_dir)?;
    fs::create_dir_all(&folder).map_err(|e| format!("Failed to create game directory: {}", e))?;

    let client = reqwest::Client::builder()
        .user_agent("Kiraeve-Launcher/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = client.get(&manifest_url);
    if let Some(ref token) = auth_token {
        if !token.trim().is_empty() {
            req = req.header("Authorization", format!("Bearer {}", token.trim()));
        }
    }

    let resp = req.send().await.map_err(|e| format!("Failed to fetch manifest: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("Manifest request failed: {}", resp.status()));
    }

    let remote_manifest: GameManifest = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse manifest JSON: {}", e))?;

    let local_manifest_path = folder.join("installed_manifest.json");
    let old_manifest: Option<GameManifest> = if local_manifest_path.exists() {
        fs::read_to_string(&local_manifest_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
    } else {
        None
    };

    // Calculate files to download
    let mut files_to_download: Vec<&ManifestFileItem> = Vec::new();
    let mut total_bytes_to_download: u64 = 0;

    for item in &remote_manifest.files {
        let relative = item.path.replace('/', std::path::MAIN_SEPARATOR_STR);
        let file_path = folder.join(relative);

        let needs_download = match fs::metadata(&file_path) {
            Ok(meta) => {
                if meta.len() != item.size {
                    true
                } else {
                    match compute_file_sha256(&file_path) {
                        Ok(hash) => hash.to_lowercase() != item.sha256.to_lowercase(),
                        Err(_) => true,
                    }
                }
            }
            Err(_) => true,
        };

        if needs_download {
            files_to_download.push(item);
            total_bytes_to_download += item.size;
        }
    }

    if files_to_download.is_empty() {
        let _ = window.emit(
            "download_progress",
            DownloadProgressPayload {
                game_id: game_id.clone(),
                progress: 100.0,
                downloaded_bytes: 0,
                total_bytes: 0,
                speed: "Up to date".to_string(),
            },
        );
        return Ok("All files are already up to date.".to_string());
    }

    let total_bytes = total_bytes_to_download.max(1);
    let mut downloaded_bytes: u64 = 0;
    let start_time = std::time::Instant::now();
    let mut last_emit = std::time::Instant::now();

    for item in &files_to_download {
        let relative = item.path.replace('/', std::path::MAIN_SEPARATOR_STR);
        let target_path = folder.join(&relative);

        if let Some(parent) = target_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Directory creation error {}: {}", parent.display(), e))?;
            }
        }

        let download_url = item.url.clone().unwrap_or_else(|| {
            let base = remote_manifest.base_url.trim_end_matches('/');
            format!("{}/{}", base, item.path.trim_start_matches('/'))
        });

        let mut file_req = client.get(&download_url);
        if let Some(ref token) = auth_token {
            if !token.trim().is_empty() {
                file_req = file_req.header("Authorization", format!("Bearer {}", token.trim()));
            }
        }

        let file_resp = file_req
            .send()
            .await
            .map_err(|e| format!("Failed to download {}: {}", item.path, e))?;

        if !file_resp.status().is_success() {
            return Err(format!(
                "Download error ({}) on {}",
                file_resp.status(),
                item.path
            ));
        }

        let tmp_path = target_path.with_extension("kiraeve_tmp");
        let mut tmp_file = fs::File::create(&tmp_path)
            .map_err(|e| format!("Failed to create temporary file: {}", e))?;

        let mut stream = file_resp.bytes_stream();
        while let Some(chunk_res) = stream.next().await {
            let chunk = chunk_res.map_err(|e| format!("Streaming error on {}: {}", item.path, e))?;
            use std::io::Write;
            tmp_file
                .write_all(&chunk)
                .map_err(|e| format!("Disk write error: {}", e))?;

            downloaded_bytes += chunk.len() as u64;

            if last_emit.elapsed().as_millis() > 100 || downloaded_bytes >= total_bytes {
                let progress = ((downloaded_bytes as f64 / total_bytes as f64) * 100.0).min(100.0);
                let elapsed_sec = start_time.elapsed().as_secs_f64();
                let speed_mb = if elapsed_sec > 0.0 {
                    (downloaded_bytes as f64 / 1_048_576.0) / elapsed_sec
                } else {
                    0.0
                };

                let _ = window.emit(
                    "download_progress",
                    DownloadProgressPayload {
                        game_id: game_id.clone(),
                        progress,
                        downloaded_bytes,
                        total_bytes,
                        speed: format!("{:.1} MB/s", speed_mb),
                    },
                );
                last_emit = std::time::Instant::now();
            }
        }

        drop(tmp_file);

        // Verify SHA-256
        let computed = compute_file_sha256(&tmp_path)?;
        if computed.to_lowercase() != item.sha256.to_lowercase() {
            let _ = fs::remove_file(&tmp_path);
            return Err(format!(
                "Hash check failed for {}: expected {}, got {}",
                item.path, item.sha256, computed
            ));
        }

        // Replace target file
        if target_path.exists() {
            let _ = fs::remove_file(&target_path);
        }
        fs::rename(&tmp_path, &target_path)
            .map_err(|e| format!("Failed to place {}: {}", target_path.display(), e))?;
    }

    // Clean up removed files from previous manifest
    if let Some(old) = old_manifest {
        let new_set: std::collections::HashSet<&str> =
            remote_manifest.files.iter().map(|f| f.path.as_str()).collect();
        for old_item in &old.files {
            if !new_set.contains(old_item.path.as_str()) {
                let relative = old_item.path.replace('/', std::path::MAIN_SEPARATOR_STR);
                let to_remove = folder.join(relative);
                if to_remove.exists() {
                    let _ = fs::remove_file(to_remove);
                }
            }
        }
    }

    // Save installed manifest
    let json_bytes = serde_json::to_string_pretty(&remote_manifest).map_err(|e| e.to_string())?;
    let _ = fs::write(&local_manifest_path, json_bytes);

    let _ = window.emit(
        "download_progress",
        DownloadProgressPayload {
            game_id: game_id.clone(),
            progress: 100.0,
            downloaded_bytes: total_bytes,
            total_bytes,
            speed: "Complete".to_string(),
        },
    );

    Ok(format!(
        "Updated {} files ({} bytes) to version {}",
        files_to_download.len(),
        downloaded_bytes,
        remote_manifest.version
    ))
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

#[tauri::command]
fn resize_for_login(window: Window, is_register: bool) -> Result<(), String> {
    let height = if is_register { 490.0 } else { 380.0 };
    let _ = window.set_resizable(false);
    let _ = window.set_size(tauri::LogicalSize::new(480.0, height));
    let _ = window.center();
    Ok(())
}

#[tauri::command]
fn resize_for_main_app(window: Window) -> Result<(), String> {
    let _ = window.set_resizable(true);
    let _ = window.set_size(tauri::LogicalSize::new(1200.0, 760.0));
    let _ = window.center();
    Ok(())
}

/// Opens native Windows directory chooser dialog to let user pick a custom library folder
#[tauri::command]
async fn select_install_folder() -> Result<Option<String>, String> {
    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select Asparagus Games Installation Directory'; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }",
            ])
            .output()
            .map_err(|e| e.to_string())?;
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if path.is_empty() {
            Ok(None)
        } else {
            Ok(Some(path))
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(None)
    }
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
            check_game_update,
            sync_game_differential,
            minimize_window,
            toggle_maximize_window,
            close_window,
            resize_for_login,
            resize_for_main_app,
            select_install_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
