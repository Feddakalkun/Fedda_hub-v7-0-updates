#!/usr/bin/env python3
"""LTX-2 ComfyUI Workflow Manager"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
from typing import List, Dict, Tuple

# Paths
SCRIPT_DIR = Path(__file__).parent
COMFY_DIR = SCRIPT_DIR / "ComfyUI"
MODELS_DIR = COMFY_DIR / "models"
WORKFLOWS_DIR = SCRIPT_DIR / "workflows" / "ltx2"

# ComfyUI files
EMBEDDINGS_CONNECTOR_FILE = COMFY_DIR / "comfy" / "ldm" / "lightricks" / "embeddings_connector.py"
EMBEDDINGS_CONNECTOR_URL = "https://raw.githubusercontent.com/gjnave/cogni-scripts/refs/heads/main/workflows/ltx-2/embeddings_connector.py"
EMBEDDINGS_CONNECTOR_BACKUP = EMBEDDINGS_CONNECTOR_FILE.with_suffix(".py._bak")

# Model folders
FOLDERS = {
    "checkpoints": MODELS_DIR / "checkpoints",
    "diffusion_models": MODELS_DIR / "diffusion_models",
    "text_encoders": MODELS_DIR / "text_encoders",
    "vae": MODELS_DIR / "vae",
    "loras": MODELS_DIR / "loras",
    "latent_upscale_models": MODELS_DIR / "latent_upscale_models",
    "unet": MODELS_DIR / "unet",
}

# Workflow definitions
WORKFLOWS = {
    "itv": {
        "name": "I2V (Image to Video)",
        "files": [
            ("ltx-2-19b-dev-fp8.safetensors", "diffusion_models", 
             "https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-19b-dev-fp8.safetensors"),
            ("gemma_3_12B_it.safetensors", "text_encoders",
             "https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/text_encoders/gemma_3_12B_it.safetensors"),
            ("ltx-2-19b-lora-camera-control-dolly-left.safetensors", "loras",
             "https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/loras/ltx-2-19b-lora-camera-control-dolly-left.safetensors"),
            ("ltx-2-19b-distilled-lora-384.safetensors", "loras",
             "https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/loras/ltx-2-19b-distilled-lora-384.safetensors"),
            ("ltx-2-spatial_upscaler-x2-1.0.safetensors", "latent_upscale_models",
             "https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-spatial-upscaler-x2-1.0.safetensors"),
        ],
        "workflow": ("video_ltx2_i2v.json",
                    "https://raw.githubusercontent.com/gjnave/cogni-scripts/refs/heads/main/workflows/ltx-2/video_ltx2_i2v.json")
    },
    "t2v": {
        "name": "T2V (Text to Video)",
        "files": [
            ("ltx-2-19b-dev-fp8.safetensors", "diffusion_models",
             "https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-19b-dev-fp8.safetensors"),
            ("gemma_3_12B_it.safetensors", "text_encoders",
             "https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/text_encoders/gemma_3_12B_it.safetensors"),
            ("ltx-2-19b-lora-camera-control-dolly-left.safetensors", "loras",
             "https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/loras/ltx-2-19b-lora-camera-control-dolly-left.safetensors"),
            ("ltx-2-19b-distilled-lora-384.safetensors", "loras",
             "https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/loras/ltx-2-19b-distilled-lora-384.safetensors"),
            ("ltx-2-spatial_upscaler-x2-1.0.safetensors", "latent_upscale_models",
             "https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-spatial-upscaler-x2-1.0.safetensors"),
        ],
        "workflow": ("video_ltx2_t2v.json",
                    "https://raw.githubusercontent.com/gjnave/cogni-scripts/refs/heads/main/workflows/ltx-2/video_ltx2_t2v.json")
    },
    "v2v": {
        "name": "V2V Detailer (ComfyUI)",
        "files": [
            ("ltx-2-19b-dev.safetensors", "checkpoints",
             "https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-19b-dev-fp8.safetensors"),
            ("ltx-2-19b-ic-lora-detailer.safetensors", "loras",
             "https://huggingface.co/Lightricks/LTX-2-19b-IC-LoRA-Detailer/resolve/main/ltx-2-19b-ic-lora-detailer.safetensors"),
            ("gemma_3_12B_it_fp8_e4m3fn.safetensors", "text_encoders",
             "https://huggingface.co/GitMylo/LTX-2-comfy_gemma_fp8_e4m3fn/resolve/main/gemma_3_12B_it_fp8_e4m3fn.safetensors"),
            ("ltx-2-19b-dev.safetensors", "text_encoders",
             "https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-19b-dev.safetensors"),
        ],
        "workflow": ("LTX-2_V2V_Detailer.json",
                    "https://raw.githubusercontent.com/gjnave/cogni-scripts/refs/heads/main/workflows/ltx-2/LTX-2_V2V_Detailer.json")
    },
    "infinity": {
        "name": "LTX-Infinity (ComfyUI)",
        "files": [
            ("ltx-2-19b-dev-fp8.safetensors", "checkpoints",
             "https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-19b-dev-fp8.safetensors"),
            ("gemma_3_12B_it.safetensors", "text_encoders",
             "https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/text_encoders/gemma_3_12B_it.safetensors"),
            ("ltx-2-19b-ic-lora-detailer.safetensors", "loras",
             "https://huggingface.co/Lightricks/LTX-2-19b-IC-LoRA-Detailer/resolve/main/ltx-2-19b-ic-lora-detailer.safetensors?download=true"),
            ("ltx-2-19b-distilled-lora-384.safetensors", "loras",
             "https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-19b-distilled-lora-384.safetensors"),
        ],
        "workflow": ("LTX-Infinity__v0.5.7.json",
                    "https://raw.githubusercontent.com/gjnave/cogni-scripts/refs/heads/main/workflows/ltx-2/LTX-Infinity__v0.5.7.json")
    },
    "lipsync": {
        "name": "LTX2 Lipsync (Kijai)",
        "files": [
            ("ltx-2-19b-dev-fp8_transformer_only.safetensors", "checkpoints",
             "https://huggingface.co/Kijai/LTXV2_comfy/resolve/main/diffusion_models/ltx-2-19b-dev-fp8_transformer_only.safetensors?download=true"),
            ("LTX2_video_vae_bf16.safetensors", "vae",
             "https://huggingface.co/Kijai/LTXV2_comfy/resolve/main/VAE/LTX2_video_vae_bf16.safetensors"),
            ("LTX2_audio_vae_bf16.safetensors", "vae",
             "https://huggingface.co/Kijai/LTXV2_comfy/resolve/main/VAE/LTX2_audio_vae_bf16.safetensors"),
            ("gemma_3_12B_it_fp8_scaled.safetensors", "text_encoders",
             "https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/text_encoders/gemma_3_12B_it_fp8_scaled.safetensors"),
            ("ltx-2-19b-embeddings_connector_distill_bf16.safetensors", "text_encoders",
             "https://huggingface.co/Kijai/LTXV2_comfy/resolve/main/text_encoders/ltx-2-19b-embeddings_connector_distill_bf16.safetensors"),
            ("MelBandRoformer_fp16.safetensors", "diffusion_models",
             "https://huggingface.co/Kijai/MelBandRoFormer_comfy/resolve/main/MelBandRoformer_fp16.safetensors"),
            ("ltx-2-19b-ic-lora-detailer.safetensors", "loras",
             "https://huggingface.co/Lightricks/LTX-2-19b-IC-LoRA-Detailer/resolve/main/ltx-2-19b-ic-lora-detailer.safetensors?download=true"),
            ("ltx-2-19b-distilled-lora-384.safetensors", "loras",
             "https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-19b-distilled-lora-384.safetensors"),
            ("HeroCam_LTX2_bucket113_step_1500.safetensors", "loras",
             "https://huggingface.co/Nebsh/LTX2_Herocam_Lora/resolve/main/HeroCam_LTX2_bucket113_step_1500.safetensors?download=true"),
        ],
        "workflow": ("LTX2 - Lipsync.json",
                    "https://raw.githubusercontent.com/gjnave/cogni-scripts/refs/heads/main/workflows/ltx-2/LTX2%20-%20Lipsync.json")
    }
}

KIJAI_COMMON = [
    ("gemma_3_12B_it_fp8_scaled.safetensors", "text_encoders",
     "https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/text_encoders/gemma_3_12B_it_fp8_scaled.safetensors"),
    ("ltx-2-19b-embeddings_connector_distill_bf16.safetensors", "text_encoders",
     "https://huggingface.co/Kijai/LTXV2_comfy/resolve/main/text_encoders/ltx-2-19b-embeddings_connector_distill_bf16.safetensors"),
    ("LTX2_video_vae_bf16_KJ.safetensors", "vae",
     "https://huggingface.co/Kijai/LTXV2_comfy/resolve/main/VAE/LTX2_video_vae_bf16.safetensors"),
    ("LTX2_audio_vae_bf16.safetensors", "vae",
     "https://huggingface.co/Kijai/LTXV2_comfy/resolve/main/VAE/LTX2_audio_vae_bf16.safetensors"),
]

KIJAI_WORKFLOWS = [
    ("LTX-2 - Kijai-I2V Basic.json",
     "https://raw.githubusercontent.com/gjnave/cogni-scripts/refs/heads/main/workflows/ltx-2/LTX-2%20-%20Kijai-I2V%20Basic.json"),
    ("LTX-2 - Kijai - I2V Basic 2nd pass upscale.json",
     "https://raw.githubusercontent.com/gjnave/cogni-scripts/refs/heads/main/workflows/ltx-2/LTX-2%20-%20Kijai%20-%20I2V%20Basic%202nd%20pass%20upscale.json"),
]

KIJAI_DIFFUSION_MODELS = {
    "phr00tmerge": ("ltx-2-19b-phr00tmerge-nsfw-v3.safetensors",
                    "https://huggingface.co/Phr00t/LTX2-Rapid-Merges/resolve/main/nsfw/ltx-2-19b-phr00tmerge-nsfw-v3.safetensors"),
    "distilled": ("ltx-2-19b-dev-fp8_transformer_only",
                  "https://huggingface.co/Kijai/LTXV2_comfy/resolve/main/diffusion_models/ltx-2-19b-dev-fp8_transformer_only.safetensors"),
}

GGUF_VARIANTS = {
    "distilled": [f"ltx-2-19b-distilled-{q}.gguf" for q in 
                  ["Q3_K_M", "Q3_K_S", "Q4_0", "Q4_1", "Q4_K_M", "Q4_K_S",
                   "Q5_0", "Q5_1", "Q5_K_M", "Q5_K_S", "Q6_K", "Q8_0"]],
    "dev": [f"ltx-2-19b-dev-{q}.gguf" for q in
            ["Q3_K_M", "Q3_K_S", "Q4_0", "Q4_1", "Q4_K_M", "Q4_K_S",
             "Q5_0", "Q5_1", "Q5_K_M", "Q5_K_S", "Q6_K", "Q8_0"]],
}


def clear_screen():
    """Clear terminal screen"""
    os.system('cls' if os.name == 'nt' else 'clear')


def create_dirs():
    """Create necessary directories"""
    WORKFLOWS_DIR.mkdir(parents=True, exist_ok=True)
    for folder in FOLDERS.values():
        folder.mkdir(parents=True, exist_ok=True)


def download_file(filename: str, folder: str, url: str, force: bool = False) -> bool:
    """Download a file using curl"""
    dest = FOLDERS[folder] / filename
    
    if dest.exists() and not force:
        print(f"[SKIP] {filename} already exists")
        return True
    
    print(f"[DOWN] {filename}")
    try:
        result = subprocess.run(
            ["curl", "-L", "--progress-bar", "-o", str(dest), url],
            check=True
        )
        print(f"[DONE] {filename}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[FAIL] {filename} - Error code: {e.returncode}")
        return False


def download_workflow(filename: str, url: str) -> bool:
    """Download workflow file"""
    dest = WORKFLOWS_DIR / filename
    if dest.exists():
        print(f"[SKIP] {filename} already exists")
        return True
    
    print(f"[DOWN] {filename}")
    try:
        subprocess.run(
            ["curl", "-L", "--progress-bar", "-o", str(dest), url],
            check=True
        )
        print(f"[DONE] {filename}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[FAIL] {filename}")
        return False


def check_workflow_status(workflow_key: str) -> Tuple[int, int, List]:
    """Check which files are installed for a workflow"""
    workflow = WORKFLOWS.get(workflow_key)
    if not workflow:
        return 0, 0, []
    
    status = []
    installed = 0
    missing = 0
    
    for filename, folder, url in workflow["files"]:
        exists = (FOLDERS[folder] / filename).exists()
        status.append((filename, folder, exists))
        if exists:
            installed += 1
        else:
            missing += 1
    
    # Check workflow file
    wf_name, wf_url = workflow["workflow"]
    wf_exists = (WORKFLOWS_DIR / wf_name).exists()
    status.append((wf_name, "workflows", wf_exists))
    if wf_exists:
        installed += 1
    else:
        missing += 1
    
    return missing, installed, status


def display_status(status: List):
    """Display file status"""
    for filename, folder, exists in status:
        marker = "[OK]" if exists else "[X]"
        missing_text = "" if exists else " - MISSING"
        print(f"{marker} {filename} ({folder}){missing_text}")


def install_workflow_menu():
    """Install workflows and models"""
    while True:
        clear_screen()
        print("\n" + "="*50)
        print("  INSTALL WORKFLOWS & MODELS")
        print("="*50 + "\n")
        print("ComfyUI Workflows:")
        print("  1. I2V (Image to Video)")
        print("  2. T2V (Text to Video)")
        print("  3. V2V Detailer (Video Enhancement)")
        print("  4. LTX-Infinity (Extended Generation)")
        print("\nKijai Workflows:")
        print("  5. I2V Basic (Kijai)")
        print("  6. LTX2 Lipsync (Audio Sync)")
        print("\nOther:")
        print("  7. Back to Main Menu")
        
        choice = input("\nSelect workflow: ").strip()
        
        if choice == "1":
            install_standard_workflow("itv")
        elif choice == "2":
            install_standard_workflow("t2v")
        elif choice == "3":
            install_standard_workflow("v2v")
        elif choice == "4":
            install_standard_workflow("infinity")
        elif choice == "5":
            install_kijai_menu()
        elif choice == "6":
            install_standard_workflow("lipsync")
        elif choice == "7":
            break


def install_standard_workflow(workflow_key: str):
    """Install a standard workflow"""
    workflow = WORKFLOWS[workflow_key]
    
    while True:
        missing, installed, status = check_workflow_status(workflow_key)
        
        clear_screen()
        print(f"\n{workflow['name']} - Status\n")
        display_status(status)
        print(f"\nMissing: {missing} | Installed: {installed}\n")
        print("1. Download Missing Files")
        print("2. Re-download All Files")
        print("3. Back")
        
        choice = input("\nChoice: ").strip()
        
        if choice == "1":
            download_workflow_files(workflow_key, force=False)
        elif choice == "2":
            download_workflow_files(workflow_key, force=True)
        elif choice == "3":
            break


def download_workflow_files(workflow_key: str, force: bool = False):
    """Download files for a workflow"""
    workflow = WORKFLOWS[workflow_key]
    
    clear_screen()
    print("\nDownloading...\n")
    
    # Download model files
    for filename, folder, url in workflow["files"]:
        download_file(filename, folder, url, force)
    
    # Download workflow
    wf_name, wf_url = workflow["workflow"]
    download_workflow(wf_name, wf_url)
    
    print("\nDownload complete!")
    input("Press Enter to continue...")


def install_kijai_menu():
    """Kijai model type selection"""
    while True:
        clear_screen()
        print("\n" + "="*50)
        print("  I2V (KIJAI) - SELECT MODEL TYPE")
        print("="*50 + "\n")
        print("  1. Diffusion Models (Safetensors)")
        print("  2. GGUF (Quantized)")
        print("  3. Back to Previous Menu")
        
        choice = input("\nSelect option: ").strip()
        
        if choice == "1":
            install_kijai_diffusion()
        elif choice == "2":
            install_kijai_gguf()
        elif choice == "3":
            break


def install_kijai_diffusion():
    """Install Kijai diffusion models"""
    while True:
        # Check status
        status = []
        installed = 0
        missing = 0
        
        # Check if either diffusion model exists
        has_model = any((FOLDERS["diffusion_models"] / name).exists() 
                       for name, _ in KIJAI_DIFFUSION_MODELS.values())
        status.append(("Diffusion model (choose one)", "diffusion_models", has_model))
        if has_model:
            installed += 1
        else:
            missing += 1
        
        # Check common files
        for filename, folder, url in KIJAI_COMMON:
            exists = (FOLDERS[folder] / filename).exists()
            status.append((filename, folder, exists))
            if exists:
                installed += 1
            else:
                missing += 1
        
        # Check workflows
        for wf_name, wf_url in KIJAI_WORKFLOWS:
            exists = (WORKFLOWS_DIR / wf_name).exists()
            status.append((wf_name, "workflows", exists))
            if exists:
                installed += 1
            else:
                missing += 1
        
        clear_screen()
        print("\ni2v Kijai (Diffusion) - Status\n")
        display_status(status)
        print(f"\nMissing: {missing} | Installed: {installed}\n")
        print("1. Download Missing Files")
        print("2. Re-download All Files")
        print("3. Back")
        
        choice = input("\nChoice: ").strip()
        
        if choice == "1":
            download_kijai_diffusion(force=False)
        elif choice == "2":
            download_kijai_diffusion(force=True)
        elif choice == "3":
            break


def download_kijai_diffusion(force: bool = False):
    """Download Kijai diffusion model files"""
    clear_screen()
    print("\nChoose Diffusion Model\n")
    print("1. ltx-2-19b-phr00tmerge-nsfw-v3.safetensors")
    print("2. ltx-2-19b-dev-fp8_transformer_only")
    print("3. Back")
    
    choice = input("\nChoice: ").strip()
    
    if choice == "3":
        return
    
    model_key = "phr00tmerge" if choice == "1" else "distilled"
    filename, url = KIJAI_DIFFUSION_MODELS[model_key]
    
    clear_screen()
    print("\nDownloading...\n")
    
    # Download selected diffusion model
    download_file(filename, "diffusion_models", url, force)
    
    # Download common files
    for filename, folder, url in KIJAI_COMMON:
        download_file(filename, folder, url, force)
    
    # Download workflows
    for wf_name, wf_url in KIJAI_WORKFLOWS:
        download_workflow(wf_name, wf_url)
    
    print("\nDownload complete!")
    input("Press Enter to continue...")


def install_kijai_gguf():
    """Install Kijai GGUF models"""
    while True:
        # Check status
        status = []
        installed = 0
        missing = 0
        
        # Check GGUF files
        gguf_files = list(FOLDERS["unet"].glob("*.gguf"))
        if gguf_files:
            for f in gguf_files:
                status.append((f.name, "unet", True))
            installed += len(gguf_files)
        else:
            status.append(("GGUF models (choose at least one)", "unet", False))
            missing += 1
        
        # Check common files
        for filename, folder, url in KIJAI_COMMON:
            exists = (FOLDERS[folder] / filename).exists()
            status.append((filename, folder, exists))
            if exists:
                installed += 1
            else:
                missing += 1
        
        # Check workflows
        for wf_name, wf_url in KIJAI_WORKFLOWS:
            exists = (WORKFLOWS_DIR / wf_name).exists()
            status.append((wf_name, "workflows", exists))
            if exists:
                installed += 1
            else:
                missing += 1
        
        clear_screen()
        print("\ni2v Kijai (GGUF) - Status\n")
        display_status(status)
        print(f"\nMissing: {missing} | Installed: {installed}\n")
        print("1. Download Missing Files")
        print("2. Re-download All Files")
        print("3. Back")
        
        choice = input("\nChoice: ").strip()
        
        if choice == "1":
            download_kijai_gguf(force=False)
        elif choice == "2":
            download_kijai_gguf(force=True)
        elif choice == "3":
            break


def download_kijai_gguf(force: bool = False):
    """Download GGUF models with selection menu"""
    clear_screen()
    print("\nChoose GGUF Variants (space-separated numbers)\n")
    print("Distilled:")
    for i, variant in enumerate(GGUF_VARIANTS["distilled"], 1):
        print(f"{i:2d}. {variant}")
    
    print("\nDev:")
    offset = len(GGUF_VARIANTS["distilled"])
    for i, variant in enumerate(GGUF_VARIANTS["dev"], offset + 1):
        print(f"{i:2d}. {variant}")
    
    print(f"\nA. Select All Distilled")
    print(f"B. Select All Dev")
    print(f"C. Continue")
    
    selection = input("\nEnter choices (e.g., 1 5 12): ").strip().upper()
    
    selected = []
    if selection == "A":
        selected = GGUF_VARIANTS["distilled"]
    elif selection == "B":
        selected = GGUF_VARIANTS["dev"]
    elif selection == "C":
        return
    else:
        try:
            all_variants = GGUF_VARIANTS["distilled"] + GGUF_VARIANTS["dev"]
            indices = [int(x) - 1 for x in selection.split()]
            selected = [all_variants[i] for i in indices if 0 <= i < len(all_variants)]
        except (ValueError, IndexError):
            print("Invalid selection")
            input("Press Enter to continue...")
            return
    
    if not selected:
        return
    
    clear_screen()
    print("\nDownloading...\n")
    
    # Download selected GGUF files
    for variant in selected:
        if "distilled" in variant:
            url = f"https://huggingface.co/vantagewithai/LTX-2-GGUF/resolve/main/distilled/{variant}"
        else:
            url = f"https://huggingface.co/vantagewithai/LTX-2-GGUF/resolve/main/dev/{variant}"
        download_file(variant, "unet", url, force)
    
    # Download common files
    for filename, folder, url in KIJAI_COMMON:
        download_file(filename, folder, url, force)
    
    # Download workflows
    for wf_name, wf_url in KIJAI_WORKFLOWS:
        download_workflow(wf_name, wf_url)
    
    print("\nDownload complete!")
    input("Press Enter to continue...")


def delete_models_menu():
    """Delete models menu"""
    while True:
        clear_screen()
        print("\n" + "="*50)
        print("  DELETE MODELS")
        print("="*50 + "\n")
        
        # Check which folders have files
        folder_options = {}
        option_num = 1
        
        for name, path in FOLDERS.items():
            pattern = "*.gguf" if name == "unet" else "*.safetensors"
            files = list(path.glob(pattern))
            if files:
                display_name = name.replace("_", " ").title()
                if name == "unet":
                    display_name = "UNet (GGUF)"
                print(f"  {option_num}. {display_name}")
                folder_options[option_num] = (name, path, pattern)
                option_num += 1
        
        if not folder_options:
            print("No model files found.")
            input("\nPress Enter to continue...")
            break
        
        print(f"\n  {option_num}. Back to Main Menu")
        
        choice = input("\nSelect option: ").strip()
        
        try:
            choice_num = int(choice)
            if choice_num == option_num:
                break
            if choice_num in folder_options:
                delete_from_folder(*folder_options[choice_num])
        except ValueError:
            pass


def delete_from_folder(folder_name: str, folder_path: Path, pattern: str):
    """Delete files from a specific folder"""
    while True:
        files = sorted(folder_path.glob(pattern))
        
        if not files:
            clear_screen()
            print(f"\nNo files found in {folder_name}")
            input("\nPress Enter to continue...")
            break
        
        clear_screen()
        print("\n" + "="*50)
        print(f"  FILES IN {folder_name.upper()}")
        print("="*50 + "\n")
        
        for i, f in enumerate(files, 1):
            print(f"  {i}. {f.name}")
        
        print("\n  B. Back to Previous Menu")
        
        choice = input("\nSelect file to delete (or B): ").strip().upper()
        
        if choice == "B":
            break
        
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(files):
                file_to_delete = files[idx]
                confirm = input(f"\nDelete {file_to_delete.name}? (Y/N): ").strip().upper()
                if confirm == "Y":
                    file_to_delete.unlink()
                    print(f"File deleted successfully.")
                    input("Press Enter to continue...")
        except (ValueError, IndexError):
            pass


def download_workflows_menu():
    """Download workflows only"""
    while True:
        clear_screen()
        print("\n" + "="*50)
        print("  DOWNLOAD WORKFLOWS ONLY")
        print("="*50 + "\n")
        
        all_workflows = []
        
        # Standard workflows
        for key, data in WORKFLOWS.items():
            wf_name, wf_url = data["workflow"]
            if not (WORKFLOWS_DIR / wf_name).exists():
                all_workflows.append((wf_name, wf_url))
        
        # Kijai workflows
        for wf_name, wf_url in KIJAI_WORKFLOWS:
            if not (WORKFLOWS_DIR / wf_name).exists():
                all_workflows.append((wf_name, wf_url))
        
        if not all_workflows:
            print("All workflows are already downloaded.")
            input("\nPress Enter to continue...")
            break
        
        for i, (name, _) in enumerate(all_workflows, 1):
            print(f"  {i}. {name}")
        
        print(f"\n  {len(all_workflows) + 1}. Back to Main Menu")
        
        choice = input("\nSelect workflow: ").strip()
        
        try:
            choice_num = int(choice)
            if choice_num == len(all_workflows) + 1:
                break
            if 1 <= choice_num <= len(all_workflows):
                wf_name, wf_url = all_workflows[choice_num - 1]
                clear_screen()
                print("\nDownloading...")
                download_workflow(wf_name, wf_url)
                print("\nDownload complete!")
                input("Press Enter to continue...")
        except ValueError:
            pass


def manage_comfyui_files_menu():
    """Manage ComfyUI Files Menu"""
    while True:
        clear_screen()
        print("\n" + "="*50)
        print("  MANAGE COMFYUI FILES")
        print("="*50 + "\n")
        print("  1. Install/Update embeddings_connector.py")
        print("  2. Restore Original embeddings_connector.py")
        print("  3. Check embeddings_connector.py Status")
        print("  4. Back to Main Menu")
        
        choice = input("\nSelect option: ").strip()
        
        if choice == "1":
            install_embeddings_connector()
        elif choice == "2":
            restore_embeddings_connector()
        elif choice == "3":
            check_embeddings_connector()
        elif choice == "4":
            break


def install_embeddings_connector():
    """Install or update embeddings_connector.py"""
    clear_screen()
    print("\n" + "="*50)
    print("  INSTALL/UPDATE EMBEDDINGS_CONNECTOR.PY")
    print("="*50 + "\n")
    
    # Create parent directory if it doesn't exist
    EMBEDDINGS_CONNECTOR_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    # Backup existing file if not already backed up
    if EMBEDDINGS_CONNECTOR_FILE.exists():
        if not EMBEDDINGS_CONNECTOR_BACKUP.exists():
            print("Backing up original embeddings_connector.py...")
            shutil.copy2(EMBEDDINGS_CONNECTOR_FILE, EMBEDDINGS_CONNECTOR_BACKUP)
            print(f"Backup created: {EMBEDDINGS_CONNECTOR_BACKUP.name}\n")
        else:
            print(f"Backup already exists: {EMBEDDINGS_CONNECTOR_BACKUP.name}\n")
    else:
        print(f"Warning: Original file does not exist at:")
        print(f"{EMBEDDINGS_CONNECTOR_FILE}\n")
    
    print("Downloading updated embeddings_connector.py...")
    try:
        result = subprocess.run(
            ["curl", "-L", "--fail", "--show-error", "--progress-bar",
             "-o", str(EMBEDDINGS_CONNECTOR_FILE), EMBEDDINGS_CONNECTOR_URL],
            check=True
        )
        print("\nSuccessfully installed embeddings_connector.py")
    except subprocess.CalledProcessError:
        print("\nFailed to download embeddings_connector.py")
    
    input("\nPress Enter to continue...")


def restore_embeddings_connector():
    """Restore original embeddings_connector.py from backup"""
    clear_screen()
    print("\n" + "="*50)
    print("  RESTORE ORIGINAL EMBEDDINGS_CONNECTOR.PY")
    print("="*50 + "\n")
    
    if not EMBEDDINGS_CONNECTOR_BACKUP.exists():
        print("Error: No backup file found!")
        print(f"Backup location: {EMBEDDINGS_CONNECTOR_BACKUP}")
        print("\nCannot restore original file.")
        input("\nPress Enter to continue...")
        return
    
    print("Backup file found.\n")
    confirm = input("Type YES to restore original embeddings_connector.py: ").strip()
    
    if confirm.upper() == "YES":
        print("\nRestoring original file...")
        try:
            shutil.copy2(EMBEDDINGS_CONNECTOR_BACKUP, EMBEDDINGS_CONNECTOR_FILE)
            print("Successfully restored original embeddings_connector.py\n")
            print("The backup file (._bak) has been kept in case you need it.")
        except Exception as e:
            print(f"Failed to restore file: {e}")
    else:
        print("\nRestore cancelled.")
    
    input("\nPress Enter to continue...")


def check_embeddings_connector():
    """Check status of embeddings_connector.py"""
    clear_screen()
    print("\n" + "="*50)
    print("  EMBEDDINGS_CONNECTOR.PY STATUS")
    print("="*50 + "\n")
    
    print(f"File location: {EMBEDDINGS_CONNECTOR_FILE}\n")
    
    if EMBEDDINGS_CONNECTOR_FILE.exists():
        print("[x] embeddings_connector.py exists")
    else:
        print("[ ] embeddings_connector.py NOT found")
    
    print()
    
    if EMBEDDINGS_CONNECTOR_BACKUP.exists():
        print("[x] Backup exists (._bak)")
    else:
        print("[ ] No backup found")
    
    input("\n\nPress Enter to continue...")



def main_menu():
    """Main menu"""
    create_dirs()
    while True:
        clear_screen()
        if os.path.exists("about.nfo"):
            with open("about.nfo", "r", encoding="utf-8", errors="ignore") as f:
                print(f.read())
        print("\n" + "="*50)
        print("  LTX-2 WORKFLOW MANAGER")
        print("="*50 + "\n")
        print("  1. Install Workflows & Models")
        print("  2. Delete Models")
        print("  3. Download Workflows Only")
        print("  4. Manage ComfyUI Files")
        print("  5. Exit")
        
        choice = input("\nSelect option: ").strip()
        
        if choice == "1":
            install_workflow_menu()
        elif choice == "2":
            delete_models_menu()
        elif choice == "3":
            download_workflows_menu()
        elif choice == "4":
            manage_comfyui_files_menu()
        elif choice == "5":
            break


if __name__ == "__main__":
    try:
        main_menu()
    except KeyboardInterrupt:
        print("\n\nExiting...")
        sys.exit(0)
