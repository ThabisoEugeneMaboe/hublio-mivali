@echo off
title Hublio - Deploy to Render.com
color 0B
cd /d "%~dp0"
echo.
echo ============================================================
echo   HUBLIO - Render.com Permanent Deploy
echo ============================================================
echo.
echo Step 1: GitHub sign-in (browser opens)
echo Step 2: Create public repo and upload code
echo Step 3: Open Render one-click deploy page
echo.
pause
echo.
where gh >nul 2>&1
if errorlevel 1 set "GH=C:\Program Files\GitHub CLI\gh.exe" else set "GH=gh"
"%GH%" auth login -h github.com -p https -w
if errorlevel 1 goto fail
echo.
echo Creating GitHub repo hublio-mivali...
git add -A
git commit -m "Prepare Hublio for Render deployment" 2>nul
"%GH%" repo create hublio-mivali --public --source=. --remote=origin --push --description "Hublio wellness app - Powered by Mivali"
if errorlevel 1 (
  echo Repo may already exist - pushing latest code...
  git remote remove origin 2>nul
  git remote add origin https://github.com/%USERNAME%/hublio-mivali.git 2>nul
  git push -u origin main --force
)
echo.
for /f "delims=" %%i in ('"%GH%" api user -q .login') do set GHUSER=%%i
echo ============================================================
echo   NEXT: Render will open in your browser
echo   Click "Apply" to deploy (free plan)
echo.
echo   Your permanent link will be:
echo   https://hublio-mivali.onrender.com/login.html
echo ============================================================
start https://render.com/deploy?repo=https://github.com/%GHUSER%/hublio-mivali
pause
exit /b 0
:fail
echo FAILED - screenshot this window and ask for help.
pause
exit /b 1
