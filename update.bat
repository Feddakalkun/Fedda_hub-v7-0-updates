@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

:: ============================================================================
:: FANVUE HUB - SMART UPDATE SYSTEM
:: Downloads only changed files from updates repository
:: ============================================================================

title Fanvue Hub - Update System
color 0A

echo.
echo ============================================================================
echo                    FANVUE HUB UPDATE SYSTEM
echo ============================================================================
echo.
echo This will download and install the latest updates.
echo Your personal data, models, and settings will not be affected.
echo.
pause

:: Configuration
set "UPDATES_REPO=https://github.com/Feddakalkun/Fedda_hub-v7-0-updates.git"
set "TEMP_DIR=%TEMP%\fanvue_updates"
set "GIT=git_embeded\cmd\git.exe"

:: Check if git is available
if not exist "%GIT%" (
    echo [ERROR] git_embeded not found!
    echo Please reinstall the application.
    pause
    exit /b 1
)

echo [1/4] Preparing update environment...
:: Clean up old temp directory
if exist "%TEMP_DIR%" (
    rd /s /q "%TEMP_DIR%" 2>nul
)

echo [2/4] Downloading updates from GitHub...
echo Repository: %UPDATES_REPO%
echo.

:: Clone updates repository to temp directory
"%GIT%" clone --depth 1 --quiet "%UPDATES_REPO%" "%TEMP_DIR%"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to download updates!
    echo.
    echo Possible causes:
    echo  - No internet connection
    echo  - GitHub is down
    echo  - Repository URL is incorrect
    echo.
    pause
    exit /b 1
)

echo [3/4] Installing updates...

:: Copy all files from temp directory, preserving structure
xcopy "%TEMP_DIR%\*" "%CD%\" /E /Y /I /Q /EXCLUDE:"%TEMP_DIR%\.git"

:: Delete .git folder if it was copied
if exist ".git" rd /s /q ".git" 2>nul

echo [4/4] Post-update tasks...

:: Regenerate Prisma client if needed
if exist "fanvue-hub\prisma\schema.prisma" (
    echo [INFO] Updating database client...
    cd fanvue-hub
    if exist node_modules (
        call npx prisma generate >nul 2>&1
    )
    cd ..
)

:: Clean up temp directory
if exist "%TEMP_DIR%" (
    rd /s /q "%TEMP_DIR%" 2>nul
)

echo.
echo ============================================================================
echo                        UPDATE COMPLETE!
echo ============================================================================
echo.
echo Latest version installed successfully.
echo You can now restart the application.
echo.
echo Press any key to exit...
pause >nul
