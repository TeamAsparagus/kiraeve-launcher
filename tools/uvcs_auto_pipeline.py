#!/usr/bin/env python3
"""
Unity Version Control (UVCS / Plastic SCM) Automated CI/CD Pipeline.
Automatically monitors Unity VCS for new changesets, pulls updates,
compiles the Unity standalone player, and differential-uploads to Cloudflare R2.
"""

import argparse
import json
import os
import subprocess
import sys
import time

CM_EXE = r"C:\Users\Kittinan\AppData\Roaming\UnityHub\external-modules\plastic\client\cm.exe"
UNITY_EXE = r"C:\Program Files\Unity\Hub\Editor\6000.3.28f1\Editor\Unity.exe"
WORKSPACE_DIR = r"C:\Users\Kittinan\AnimeBattle"
BUILD_OUTPUT_DIR = r"C:\Users\Kittinan\AnimeBattle\Build"
BUILD_EXE_PATH = r"C:\Users\Kittinan\AnimeBattle\Build\AnimeBattle.exe"
BUILD_LOG_PATH = r"C:\Users\Kittinan\AnimeBattle\build.log"
REPO_SPEC = "AnimeBattle/AnimeBattle@bonikiwazari@unity"

STATE_FILE = os.path.join(os.path.dirname(__file__), ".last_synced_changeset.json")

def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"last_changeset": 51}

def save_state(state: dict):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)

def query_latest_remote_changeset() -> int:
    """Queries Unity VCS repository for the latest changeset ID."""
    cmd = [
        CM_EXE,
        "find",
        "changeset",
        f"on repository '{REPO_SPEC}'",
        "--format={changesetid}",
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    lines = [line.strip() for line in res.stdout.strip().splitlines() if line.strip().isdigit()]
    if not lines:
        raise RuntimeError("No changesets returned from repository")
    return int(lines[-1])

def pull_vcs_updates(workspace_dir: str):
    """Pulls latest files from Unity VCS workspace."""
    print(f"\n[1/3] Pulling latest changes from Unity VCS into {workspace_dir}...")
    cmd = [CM_EXE, "update", workspace_dir]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Warning/Error from cm update:\n{res.stderr}")
    else:
        print("VCS update completed successfully.")

def build_unity_game():
    """Compiles standalone 64-bit Unity game in batchmode."""
    print(f"\n[2/3] Compiling Unity standalone player in batchmode...")
    os.makedirs(BUILD_OUTPUT_DIR, exist_ok=True)
    cmd = [
        UNITY_EXE,
        "-batchmode",
        "-quit",
        "-projectPath", WORKSPACE_DIR,
        "-buildWindows64Player", BUILD_EXE_PATH,
        "-logFile", BUILD_LOG_PATH,
    ]
    res = subprocess.run(cmd)
    if res.returncode != 0:
        raise RuntimeError(f"Unity build failed with return code {res.returncode}. See log at {BUILD_LOG_PATH}")
    if not os.path.exists(BUILD_EXE_PATH):
        raise RuntimeError(f"Build output executable not found: {BUILD_EXE_PATH}")
    print(f"Unity standalone build succeeded -> {BUILD_EXE_PATH}")

def upload_diff_to_r2(version: str):
    """Invokes smart differential uploader to Cloudflare R2."""
    print(f"\n[3/3] Running Smart Differential Uploader to Cloudflare R2 (v{version})...")
    upload_script = os.path.join(os.path.dirname(__file__), "upload_r2.py")
    cmd = [
        sys.executable,
        upload_script,
        "--dir", BUILD_OUTPUT_DIR,
        "--game-id", "anime-battle",
        "--version", version,
    ]
    res = subprocess.run(cmd)
    if res.returncode != 0:
        raise RuntimeError("Differential upload to Cloudflare R2 failed.")
    print(f"Successfully published Anime Battle v{version} to Cloudflare R2!")

def run_sync_cycle(target_changeset: int):
    version = f"1.0.{target_changeset}"
    print(f"\n=======================================================")
    print(f" Triggering Pipeline for Changeset {target_changeset} (v{version})")
    print(f"=======================================================")
    pull_vcs_updates(WORKSPACE_DIR)
    build_unity_game()
    upload_diff_to_r2(version)
    save_state({"last_changeset": target_changeset, "timestamp": time.time()})
    print(f"\nPipeline successfully completed for changeset {target_changeset}!")

def main():
    parser = argparse.ArgumentParser(description="Unity VCS CI/CD Auto-Pipeline")
    parser.add_argument("--watch", action="store_true", help="Run as continuous background watcher")
    parser.add_argument("--interval", type=int, default=60, help="Polling interval in seconds for --watch (default: 60)")
    parser.add_argument("--sync-now", action="store_true", help="Force pull, build, and publish current changeset immediately")
    parser.add_argument("--check", action="store_true", help="Check if remote Unity VCS has newer changesets")
    args = parser.parse_args()

    state = load_state()
    last_cs = state.get("last_changeset", 0)

    if args.sync_now:
        latest = query_latest_remote_changeset()
        run_sync_cycle(latest)
        return

    if args.check:
        latest = query_latest_remote_changeset()
        print(f"Local registered changeset: {last_cs}")
        print(f"Latest Unity VCS changeset: {latest}")
        if latest > last_cs:
            print(f"UPDATE AVAILABLE: {latest - last_cs} new changeset(s) on remote.")
        else:
            print("Up to date.")
        return

    if args.watch:
        print(f"Starting Unity VCS Pipeline Watcher (polling every {args.interval}s)...")
        print(f"Initial synced changeset: {last_cs}")
        while True:
            try:
                latest = query_latest_remote_changeset()
                if latest > last_cs:
                    print(f"\n[NEW CHANGESET DETECTED] Remote changeset {latest} > Last synced {last_cs}")
                    run_sync_cycle(latest)
                    last_cs = latest
                else:
                    print(f"[{time.strftime('%H:%M:%S')}] VCS check: changeset {latest} (no changes). Waiting...", end="\r")
            except Exception as e:
                print(f"\nError in watcher cycle: {e}")
            time.sleep(args.interval)
    else:
        # Default: check and if newer, sync
        latest = query_latest_remote_changeset()
        if latest > last_cs:
            print(f"New changeset detected on Unity VCS: {latest} > {last_cs}")
            run_sync_cycle(latest)
        else:
            print(f"No new changesets on Unity VCS (current: {latest}). Everything is up to date.")

if __name__ == "__main__":
    main()
