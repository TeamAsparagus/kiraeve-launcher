#!/usr/bin/env python3
"""
Upload game build & differential manifest to Cloudflare R2.
Uses S3-compatible API via boto3.
"""

import argparse
import mimetypes
import os
import sys
import boto3
from botocore.config import Config
from generate_manifest import generate_manifest, compute_sha256
import json

def load_env_file(filepath: str):
    if not os.path.exists(filepath):
        return
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip("'\"")
            if key not in os.environ:
                os.environ[key] = val

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    load_env_file(os.path.join(root_dir, ".env"))

    parser = argparse.ArgumentParser(description="Upload Game Build to Cloudflare R2")
    parser.add_argument("--dir", "-d", default=r"C:\Users\Kittinan\AnimeBattle\Build", help="Game build directory")
    parser.add_argument("--game-id", default="anime-battle", help="Game ID in Launcher")
    parser.add_argument("--version", "-v", default="1.0.0", help="Game Version")
    parser.add_argument("--account-id", default=os.getenv("R2_ACCOUNT_ID"), help="Cloudflare Account ID")
    parser.add_argument("--access-key", default=os.getenv("R2_ACCESS_KEY_ID"), help="R2 Access Key ID")
    parser.add_argument("--secret-key", default=os.getenv("R2_SECRET_ACCESS_KEY"), help="R2 Secret Access Key")
    parser.add_argument("--bucket", default=os.getenv("R2_BUCKET_NAME"), help="R2 Bucket Name")
    parser.add_argument("--public-url", default=os.getenv("R2_PUBLIC_URL"), help="Public CDN/Worker URL (e.g. https://r2.example.com)")

    args = parser.parse_args()

    missing = []
    if not args.account_id: missing.append("R2_ACCOUNT_ID")
    if not args.access_key: missing.append("R2_ACCESS_KEY_ID")
    if not args.secret_key: missing.append("R2_SECRET_ACCESS_KEY")
    if not args.bucket: missing.append("R2_BUCKET_NAME")
    if not args.public_url: missing.append("R2_PUBLIC_URL")

    if missing:
        print(f"Error: Missing required R2 credentials: {', '.join(missing)}")
        print("Please configure them in .env or pass as command-line arguments.")
        sys.exit(1)

    build_dir = os.path.abspath(args.dir)
    if not os.path.isdir(build_dir):
        print(f"Error: Build folder not found: {build_dir}")
        sys.exit(1)

    base_url = f"{args.public_url.rstrip('/')}/games/{args.game_id}"
    print(f"\n1. Generating game manifest for version {args.version}...")
    manifest = generate_manifest(build_dir, args.game_id, args.version, base_url)
    manifest_path = os.path.join(build_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    endpoint_url = f"https://{args.account_id}.r2.cloudflarestorage.com"
    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=args.access_key,
        aws_secret_access_key=args.secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto"
    )

    # Fetch existing manifest from R2 if available for smart diff upload
    old_file_hashes = {}
    try:
        manifest_key = f"games/{args.game_id}/manifest.json"
        print(f"Checking existing manifest on R2: {manifest_key}...")
        resp = s3.get_object(Bucket=args.bucket, Key=manifest_key)
        old_data = json.loads(resp["Body"].read().decode("utf-8"))
        for f_item in old_data.get("files", []):
            old_file_hashes[f_item["path"]] = f_item["sha256"]
        print(f"Found existing remote manifest with {len(old_file_hashes)} registered files.")
    except Exception as e:
        print("No prior remote manifest found or bucket empty for this game. Uploading all files.")

    print(f"\n2. Uploading build files to R2 bucket '{args.bucket}' under prefix 'games/{args.game_id}/'...")
    total_files = len(manifest["files"])
    uploaded_count = 0
    skipped_count = 0

    for idx, item in enumerate(manifest["files"], 1):
        rel_path = item["path"]
        local_file = os.path.join(build_dir, rel_path.replace("/", os.sep))
        r2_key = f"games/{args.game_id}/{rel_path}"

        # If file hash matches remote hash exactly, skip upload!
        if rel_path in old_file_hashes and old_file_hashes[rel_path] == item["sha256"]:
            skipped_count += 1
            continue

        mime, _ = mimetypes.guess_type(local_file)
        extra_args = {"ContentType": mime or "application/octet-stream"}

        print(f"  [{idx}/{total_files}] Uploading {rel_path} ({item['size']} bytes)...", end="", flush=True)
        s3.upload_file(local_file, args.bucket, r2_key, ExtraArgs=extra_args)
        print(" Done.")
        uploaded_count += 1

    print(f"\nSummary: {uploaded_count} files uploaded, {skipped_count} unchanged files skipped.")

    print(f"\n3. Uploading manifest.json...")
    manifest_key = f"games/{args.game_id}/manifest.json"
    s3.upload_file(
        manifest_path,
        args.bucket,
        manifest_key,
        ExtraArgs={"ContentType": "application/json", "CacheControl": "no-cache"}
    )
    print(" Manifest uploaded.")

    full_manifest_url = f"{args.public_url.rstrip('/')}/{manifest_key}"
    print("\n========================================================")
    print(" Upload successfully completed!")
    print(f" Manifest URL: {full_manifest_url}")
    print(" Launcher can now download and delta-update from this URL.")
    print("========================================================")

if __name__ == "__main__":
    main()
