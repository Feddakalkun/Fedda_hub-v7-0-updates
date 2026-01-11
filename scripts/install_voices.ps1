# ============================================================================
# VoxCPM Voice Pack Installer
# Downloads curated voice samples for TTS
# ============================================================================

$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
$RootPath = Split-Path -Parent $ScriptPath
$VoicesDir = Join-Path $RootPath "VoxCPM\voxcpm-plus\voices"

Write-Host "============================================================================"
Write-Host "  VoxCPM Voice Pack Installer"
Write-Host "============================================================================"
Write-Host ""

# Create voices directory if it doesn't exist
if (-not (Test-Path $VoicesDir)) {
    New-Item -ItemType Directory -Path $VoicesDir -Force | Out-Null
}

# Voice Pack URLs - DISABLED (using custom voices from assets/TTS instead)
$VoicePacks = @()

# Sync custom voices from assets/TTS
$AssetsPath = Join-Path $RootPath "assets\TTS"
if (Test-Path $AssetsPath) {
    Write-Host "Syncing custom voices from assets/TTS..." -ForegroundColor Cyan
    Copy-Item "$AssetsPath\*" $VoicesDir -Recurse -Force
    Write-Host "Custom voices synced successfully." -ForegroundColor Green
}

Write-Host "Downloading $($VoicePacks.Count) voice samples..."
Write-Host ""

$Downloaded = 0
$Failed = 0

foreach ($voice in $VoicePacks) {
    $voiceName = $voice.Name
    $voiceDir = Join-Path $VoicesDir $voiceName
    
    # Create voice directory
    if (-not (Test-Path $voiceDir)) {
        New-Item -ItemType Directory -Path $voiceDir -Force | Out-Null
    }
    
    # Determine file extension
    $ext = if ($voice.URL -match '\.mp3$') { ".mp3" } else { ".wav" }
    $audioFile = Join-Path $voiceDir "voice$ext"
    $txtFile = Join-Path $voiceDir "voice.txt"
    $infoFile = Join-Path $voiceDir "info.txt"
    
    # Skip if already downloaded
    if (Test-Path $audioFile) {
        Write-Host "[SKIP] $voiceName - already exists" -ForegroundColor Yellow
        continue
    }
    
    try {
        Write-Host "[DOWN] $voiceName - $($voice.Description)" -ForegroundColor Cyan
        
        # Download audio file with retry logic
        $maxRetries = 3
        $retryCount = 0
        $success = $false
        
        while (-not $success -and $retryCount -lt $maxRetries) {
            try {
                Invoke-WebRequest -Uri $voice.URL -OutFile $audioFile -UseBasicParsing -TimeoutSec 30
                $success = $true
            }
            catch {
                $retryCount++
                if ($retryCount -lt $maxRetries) {
                    Write-Host "  Retry $retryCount/$maxRetries..." -ForegroundColor Yellow
                    Start-Sleep -Seconds 2
                }
                else {
                    throw
                }
            }
        }
        
        # Save transcript
        Set-Content -Path $txtFile -Value $voice.Transcript -Encoding UTF8
        
        # Save info
        Set-Content -Path $infoFile -Value "Voice: $voiceName`nDescription: $($voice.Description)`nSource: $($voice.URL)" -Encoding UTF8
        
        Write-Host "[OK]   $voiceName downloaded successfully" -ForegroundColor Green
        $Downloaded++
    }
    catch {
        Write-Host "[FAIL] $voiceName - $($_.Exception.Message)" -ForegroundColor Red
        $Failed++
        
        # Clean up partial download
        if (Test-Path $audioFile) {
            Remove-Item $audioFile -Force
        }
    }
}

Write-Host ""
Write-Host "============================================================================"
Write-Host "  Voice Pack Installation Complete"
Write-Host "============================================================================"
Write-Host "Downloaded: $Downloaded voices"
Write-Host "Failed: $Failed voices"
Write-Host "Total Available: $((Get-ChildItem $VoicesDir -Directory -ErrorAction SilentlyContinue | Measure-Object).Count) voices"
Write-Host ""
Write-Host "Voices installed in: $VoicesDir"
Write-Host ""

if ($Failed -gt 0 -and $Downloaded -eq 0) {
    Write-Host "[WARNING] All downloads failed. Check your internet connection." -ForegroundColor Red
    Write-Host "You can retry by running download-voices.bat again." -ForegroundColor Yellow
}
