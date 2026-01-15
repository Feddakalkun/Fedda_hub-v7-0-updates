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

:: Copy UI redesign files
mkdir "%UPDATES%\fanvue-hub\app"
mkdir "%UPDATES%\fanvue-hub\app\(dashboard)\characters"
mkdir "%UPDATES%\fanvue-hub\app\(dashboard)\characters\[slug]"
mkdir "%UPDATES%\fanvue-hub\app\(dashboard)\studio\character"
mkdir "%UPDATES%\fanvue-hub\components\navigation"

copy "fanvue-hub\app\page.tsx" "%UPDATES%\fanvue-hub\app\" >nul
copy "fanvue-hub\app\globals.css" "%UPDATES%\fanvue-hub\app\" >nul
copy "fanvue-hub\app\(dashboard)\characters\page.tsx" "%UPDATES%\fanvue-hub\app\(dashboard)\characters\" >nul
copy "fanvue-hub\app\(dashboard)\characters\[slug]\page.tsx" "%UPDATES%\fanvue-hub\app\(dashboard)\characters\[slug]\" >nul
copy "fanvue-hub\app\(dashboard)\studio\character\page.tsx" "%UPDATES%\fanvue-hub\app\(dashboard)\studio\character\" >nul
copy "fanvue-hub\components\navigation\TabNavigation.tsx" "%UPDATES%\fanvue-hub\components\navigation\" >nul
copy ".gitignore" "%UPDATES%\" >nul
copy "UPDATES_README.md" "%UPDATES%\README.md" >nul

echo.
echo Updates package created at: %UPDATES%
echo.
echo Professional UI redesign files packaged:
echo - Character Studio (New!)
echo - Navigation updates
echo - Landing page (removed promotional text)
echo - Characters gallery (1:1 portrait layout)
echo - Character detail page (full-width professional design)
echo.
echo Next steps:
echo 1. cd %UPDATES%
echo 2. git init
echo 3. git add .
echo 4. git commit -m "Update: Professional UI redesign"
echo 5. git remote add origin https://github.com/Feddakalkun/Fanvue_hub-v6-0-updates.git
echo 6. git push -u origin main --force
echo.
pause
