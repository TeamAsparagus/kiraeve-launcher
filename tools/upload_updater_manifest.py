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

manifest = {
    "version": "0.1.2",
    "notes": "Kiraeve Launcher v0.1.2: Added Patch Notes hub, custom game library folder picker, manual/auto update switch, and direct cloud authentication.",
    "pub_date": "2026-11-07T13:30:00Z",
    "platforms": {
        "windows-x86_64": {
            "signature": "",
            "url": f"{public_url}/launcher/KiraeveLauncher-Setup.exe"
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
