"""
Download insightface models manually
"""
import os
import urllib.request
import zipfile

# Create models directory
model_root = os.path.expanduser('~/.insightface/models/buffalo_l')
os.makedirs(model_root, exist_ok=True)

print(f"Downloading models to: {model_root}")

# Download from HuggingFace mirror
base_url = "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip"
zip_path = os.path.join(os.path.dirname(model_root), "buffalo_l.zip")

print(f"Downloading buffalo_l models from GitHub...")
try:
    urllib.request.urlretrieve(base_url, zip_path)
    
    # Extract
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(os.path.dirname(model_root))
    
    print("✓ Models downloaded successfully!")
    os.remove(zip_path)
except Exception as e:
    print(f"✗ Download failed: {e}")
    print("\nAlternative: Download manually from:")
    print("https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip")
    print(f"Extract to: {os.path.dirname(model_root)}")
