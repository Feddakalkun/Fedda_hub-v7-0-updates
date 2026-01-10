@echo off
cd /d "%~dp0"
title Fanvue Hub Universe Launcher

:: ============================================================================
:: RE-ENTRANT SECTIONS (For separate windows)
:: ============================================================================
if "%1"==":launch_ollama" goto :launch_ollama
if "%1"==":launch_comfy" goto :launch_comfy
if "%1"==":launch_vox" goto :launch_vox
if "%1"==":launch_browser" goto :launch_browser

:: ============================================================================
:: MAIN LAUNCHER
:: ============================================================================

echo ============================================================================
echo   LAUNCHING MULTIVERSE SYSTEM
echo ============================================================================
echo.

:: 1. SETUP ENVIRONMENT
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"

set "PYTHON=%BASE_DIR%\python_embeded\python.exe"
set "OLLAMA=%BASE_DIR%\ollama_embeded\ollama.exe"
set "PATH=%BASE_DIR%\python_embeded;%BASE_DIR%\python_embeded\Scripts;%BASE_DIR%\git\cmd;%BASE_DIR%\node_embeded;%PATH%"

:: 2. Start Ollama
echo [1/5] Starting Ollama LLM Engine...
start "Ollama LLM Engine" /MIN cmd /k "call "%~f0" :launch_ollama"
timeout /t 2 /nobreak >nul

:: 3. Start ComfyUI
echo [2/5] Starting ComfyUI (Port 8188)...
start "ComfyUI Launcher" /MIN cmd /k "call "%~f0" :launch_comfy"

:: 4. Start Browser Waiter
echo [INFO] Browser will open automatically when ComfyUI is ready.
start "ComfyUI Browser Waiter" /MIN cmd /c "call "%~f0" :launch_browser"

:: 5. Start VoxCPM
echo [3/5] Starting VoxCPM (Port 7860)...
start "VoxCPM Engine" /MIN cmd /k "call "%~f0" :launch_vox"

:: 6. Start HTTPS Proxy
echo [4/5] Starting HTTPS Proxy...
if exist "fanvue-hub\start-https.bat" (
    start "Fanvue Hub HTTPS Proxy" /MIN cmd /k "cd fanvue-hub & call start-https.bat"
)

:: 7. Start Fanvue Hub
echo [5/5] Starting Fanvue Hub Dashboard (Port 3000)...

echo Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000"') do taskkill /F /PID %%a 2>nul
timeout /t 1 >nul

cd fanvue-hub
if not exist .env.local (
    echo # Fanvue Hub Config > .env.local
)

if not exist node_modules (
    echo [INFO] First run detected. Installing Fanvue Hub dependencies...
    call npm install --legacy-peer-deps
    echo [INFO] Initializing Database...
    call npx prisma generate
    call npx prisma db push
)

echo.
echo System launching... 
echo Press any key to clean exit launcher (background services will keep running).
call npm run dev

pause
exit /b

:: ============================================================================
:: SUBROUTINE: OLLAMA
:: ============================================================================
:launch_ollama
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
set "OLLAMA=%BASE_DIR%\ollama_embeded\ollama.exe"
set "OLLAMA_MODELS=%BASE_DIR%\ollama_embeded\models"
set "OLLAMA_HOST=127.0.0.1:11435"

if exist "%OLLAMA%" (
    echo Running Portable Ollama...
    "%OLLAMA%" serve
) else (
    echo Portable Ollama not found. Trying system Ollama...
    ollama serve
)
if %errorlevel% neq 0 (
    echo [ERROR] Ollama crashed!
    pause
)
exit /b

:: ============================================================================
:: SUBROUTINE: COMFYUI
:: ============================================================================
:launch_comfy
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
set "COMFYUI_DIR=%BASE_DIR%\ComfyUI"
set "PYTHON=%BASE_DIR%\python_embeded\python.exe"
set "PATH=%BASE_DIR%\python_embeded;%BASE_DIR%\python_embeded\Scripts;%BASE_DIR%\git\cmd;%BASE_DIR%\node_embeded;%PATH%"

set COMFYUI_OFFLINE=1
set TORIO_USE_FFMPEG=0
set PYTHONUNBUFFERED=1
set PYTHONIOENCODING=utf-8
set PYTHONPATH=%COMFYUI_DIR%;%PYTHONPATH%

echo Clearing port 8188...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8188"') do taskkill /F /PID %%a 2>nul
timeout /t 1 >nul

cd /d "%COMFYUI_DIR%"
"%PYTHON%" -u main.py --windows-standalone-build --port 8188 --listen 127.0.0.1 --reserve-vram 4

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] ComfyUI crashed with error code %errorlevel%
    pause
)
exit /b

:: ============================================================================
:: SUBROUTINE: VOXCPM
:: ============================================================================
:launch_vox
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
set "VOX_DIR=%BASE_DIR%\VoxCPM"
set "PYTHON=%BASE_DIR%\python_embeded\python.exe"
set "PATH=%BASE_DIR%\python_embeded;%BASE_DIR%\python_embeded\Scripts;%BASE_DIR%\git\cmd;%BASE_DIR%\node_embeded;%PATH%"

if not exist "%VOX_DIR%" (
    echo [ERROR] VoxCPM directory missing: %VOX_DIR%
    pause
    exit /b
)

cd /d "%VOX_DIR%"
REM Force CPU usage
set CUDA_VISIBLE_DEVICES=-1
"%PYTHON%" app.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] VoxCPM crashed with error code %errorlevel%
    pause
)
exit /b

:: ============================================================================
:: SUBROUTINE: BROWSER WAITER
:: ============================================================================
:launch_browser
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
set "PYTHON=%BASE_DIR%\python_embeded\python.exe"

echo Waiting for ComfyUI (localhost:8188)...
:wait_loop
timeout /t 1 >nul
"%PYTHON%" -c "import socket; s = socket.socket(); s.connect(('127.0.0.1', 8188))" >nul 2>&1
if %errorlevel% equ 0 (
    echo ComfyUI is up! Launching browser...
    start "" http://127.0.0.1:8188
    exit
)
goto wait_loop
exit /b
