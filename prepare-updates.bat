@echo off
cd /d "%~dp0"

:: Script to prepare updates folder for pushing to updates repository
:: Only includes files that were actually changed

echo Creating updates package...

set "UPDATES=..\fanvue-updates-package"

:: Clean old package
if exist "%UPDATES%" rd /s /q "%UPDATES%"

:: Create structure
mkdir "%UPDATES%\fanvue-hub\components"
mkdir "%UPDATES%\fanvue-hub\types"

:: Copy only changed files
copy "fanvue-hub\components\ImageGenerator.tsx" "%UPDATES%\fanvue-hub\components\" >nul
copy "fanvue-hub\components\WorkflowChainBuilder.tsx" "%UPDATES%\fanvue-hub\components\" >nul
copy "fanvue-hub\types\workflow-chain.ts" "%UPDATES%\fanvue-hub\types\" >nul
copy ".gitignore" "%UPDATES%\" >nul
copy "UPDATES_README.md" "%UPDATES%\README.md" >nul

echo.
echo Updates package created at: %UPDATES%
echo.
echo Next steps:
echo 1. cd %UPDATES%
echo 2. git init
echo 3. git add .
echo 4. git commit -m "Update: Queue system rewrite"
echo 5. git remote add origin https://github.com/Feddakalkun/Fanvue_hub-v6-0-updates.git
echo 6. git push -u origin main --force
echo.
pause
