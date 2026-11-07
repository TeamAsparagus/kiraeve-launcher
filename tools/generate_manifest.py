#!/usr/bin/env python3
"""
Steam-like Game Manifest Generator & Local Distribution Server.
Scans a built game folder, computes SHA-256 for every file, and generates manifest.json.
"""

import argparse
import hashlib
import json
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

def compute_sha256(file_path: str) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def generate_manifest(build_dir: str, game_id: str, version: str, base_url: str) -> dict:
    build_dir = os.path.abspath(build_dir)
    if not os.path.isdir(build_dir):
        raise FileNotFoundError(f"Build directory not found: {build_dir}")

    files = []
    print(f"Scanning directory: {build_dir}...")
    
    for root, dirs, filenames in os.walk(build_dir):
        # Exclude burst debug symbols and temporary directories
        dirs[:] = [d for d in dirs if not d.endswith("_DoNotShip") and d != ".git"]
        for name in filenames:
            # Skip manifest itself, temp files, and build logs
            if (
                name in ("manifest.json", "installed_manifest.json", "build.log")
                or name.endswith(".tmp")
                or name.endswith(".kiraeve_tmp")
            ):
                continue
            
            full_path = os.path.join(root, name)
            rel_path = os.path.relpath(full_path, build_dir).replace("\\", "/")
            size = os.path.getsize(full_path)
            sha256 = compute_sha256(full_path)
            
            files.append({
                "path": rel_path,
                "size": size,
                "sha256": sha256
            })
            print(f"  + {rel_path} ({size} bytes, sha256: {sha256[:8]}...)")

    manifest = {
        "game_id": game_id,
        "version": version,
        "base_url": base_url,
        "files": files
    }
    return manifest

def main():
    parser = argparse.ArgumentParser(description="Generate Steam-like Game Manifest")
    parser.add_argument("--dir", "-d", default=r"C:\Users\Kittinan\AnimeBattle", help="Built game folder")
    parser.add_argument("--game-id", default="anime-battle", help="Unique Game ID")
    parser.add_argument("--version", "-v", default="1.0.0", help="Game Version string")
    parser.add_argument("--base-url", default="http://localhost:8080", help="Base download URL")
    parser.add_argument("--out", "-o", default=None, help="Output manifest file (default: <dir>/manifest.json)")
    parser.add_argument("--serve", "-s", type=int, default=None, help="Run local HTTP test server on given port (e.g. 8080)")

    args = parser.parse_args()

    manifest = generate_manifest(args.dir, args.game_id, args.version, args.base_url)

    out_path = args.out or os.path.join(args.dir, "manifest.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"\nManifest successfully written to: {out_path}")
    print(f"Total files: {len(manifest['files'])}, Version: {manifest['version']}")

    if args.serve:
        port = args.serve
        os.chdir(args.dir)
        server_address = ("", port)
        httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
        print(f"\nServing {args.dir} on http://localhost:{port}/")
        print("Launcher can now download & sync from http://localhost:{port}/manifest.json")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()
