@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

title Download Lila Character Models
color 0D

echo.
echo ============================================================================
echo                    LILA - CHARACTER MODEL DOWNLOADER
echo ============================================================================
echo.
echo This will download Lila character LoRA models from Fedda Hub.
echo.
echo Files to download:
echo  1. Lila_zimage.safetensors (for Image Generation)
echo  2. Lila_wan22_high_noise.safetensors (for Wan 2.2 Video)
echo  3. Lila_wan22_low_noise.safetensors (for Wan 2.2 Video)
echo.
echo Location: ComfyUI/models/loras/lila/
echo.
pause

:: Setup paths
set "PYTHON=python_embeded\python.exe"
set "LORA_DIR=ComfyUI\models\loras\lila"

:: Check Python exists
if not exist "%PYTHON%" (
    echo [ERROR] Python not found! Please run install.bat first.
    pause
    exit /b 1
)

:: Create directory
if not exist "%LORA_DIR%" (
    echo Establishing directory...
    mkdir "%LORA_DIR%"
)

:: Create download script
echo import os > download_lila.py
echo import urllib.request >> download_lila.py
echo import sys >> download_lila.py
echo. >> download_lila.py
echo base_url = "https://huggingface.co/datasets/FeddaKalkun/Fedda-hub/resolve/main/loras/lila" >> download_lila.py
echo target_dir = r"%LORA_DIR%" >> download_lila.py
echo. >> download_lila.py
echo files = [ >> download_lila.py
echo     ("zimage/Lila_zimage.safetensors", "Lila_zimage.safetensors"), >> download_lila.py
echo     ("wan22/Lila_wan22_high_noise.safetensors", "Lila_wan22_high_noise.safetensors"), >> download_lila.py
echo     ("wan22/Lila_wan22_low_noise.safetensors", "Lila_wan22_low_noise.safetensors") >> download_lila.py
echo ] >> download_lila.py
echo. >> download_lila.py
echo def download_file(url, filepath): >> download_lila.py
echo     print(f"Downloading {os.path.basename(filepath)}...") >> download_lila.py
echo     try: >> download_lila.py
echo         urllib.request.urlretrieve(url, filepath) >> download_lila.py
echo         print("Done.") >> download_lila.py
echo     except Exception as e: >> download_lila.py
echo         print(f"Error downloading {url}: {e}") >> download_lila.py
echo         sys.exit(1) >> download_lila.py
echo. >> download_lila.py
echo print("Starting downloads...") >> download_lila.py
echo for remote_path, local_name in files: >> download_lila.py
echo     url = f"{base_url}/{remote_path}?download=true" >> download_lila.py
echo     local_path = os.path.join(target_dir, local_name) >> download_lila.py
echo     if os.path.exists(local_path): >> download_lila.py
echo         print(f"Skipping {local_name} (already exists)") >> download_lila.py
echo         continue >> download_lila.py
echo     download_file(url, local_path) >> download_lila.py

:: Run downloader
echo.
"%PYTHON%" download_lila.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Download failed!
    del download_lila.py
    pause
    exit /b 1
)

:: Cleanup
del download_lila.py

echo.
echo ============================================================================
echo                        DOWNLOAD COMPLETE!
echo ============================================================================
echo.
echo Lila models installed to: %LORA_DIR%
echo.
echo Press any key to exit...
pause >nul
