import os
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

installer = os.path.join(root, "src-tauri", "target", "release", "bundle", "nsis", "Asparagus_1.0.3_x64-setup.exe")
bucket = os.getenv("R2_BUCKET_NAME")
public_url = os.getenv("R2_PUBLIC_URL").rstrip("/")

print(f"Uploading {installer} ({os.path.getsize(installer)} bytes) to R2...")
s3.upload_file(installer, bucket, "launcher/Asparagus-Setup.exe", ExtraArgs={"ContentType": "application/vnd.microsoft.portable-executable"})
s3.upload_file(installer, bucket, "launcher/KiraeveLauncher-Setup.exe", ExtraArgs={"ContentType": "application/vnd.microsoft.portable-executable"})
print(f"UPLOAD SUCCESSFUL: {public_url}/launcher/Asparagus-Setup.exe")
