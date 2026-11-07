import os
import json
import boto3
from upload_r2 import load_env_file

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_env_file(os.path.join(root, ".env"))

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{os.getenv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
    region_name="auto"
)

bucket = os.getenv("R2_BUCKET_NAME")
public_url = os.getenv("R2_PUBLIC_URL").rstrip("/")

sig_path = os.path.join(root, "src-tauri", "target", "release", "bundle", "nsis", "Asparagus_1.0.3_x64-setup.exe.sig")
sig_text = ""
if os.path.exists(sig_path):
    with open(sig_path, "r", encoding="utf-8") as sf:
        sig_text = sf.read().strip()

manifest = {
    "version": "1.0.3",
    "notes": "Asparagus Launcher v1.0.3: Compact Steam-style login window, Friend profile viewer, Right-click disabled, and Anime Battle verified release.",
    "pub_date": "2026-11-07T15:15:00Z",
    "platforms": {
        "windows-x86_64": {
            "signature": sig_text,
            "url": f"{public_url}/launcher/Asparagus-Setup.exe"
        }
    }
}

json_bytes = json.dumps(manifest, indent=2).encode("utf-8")
print("Uploading latest.json to Cloudflare R2...")
s3.put_object(
    Bucket=bucket,
    Key="launcher/latest.json",
    Body=json_bytes,
    ContentType="application/json"
)
print(f"SUCCESS: {public_url}/launcher/latest.json")
