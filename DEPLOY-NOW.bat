@echo off
title Hublio Permanent Deploy - Azure
color 0A
cd /d "%~dp0"
echo.
echo ============================================================
echo   HUBLIO - Azure Permanent Deploy
echo ============================================================
echo.
echo IMPORTANT: Use DEVICE CODE login (more reliable).
echo.
echo Step 1 - A code will appear below.
echo Step 2 - Open https://login.microsoft.com/device in browser.
echo Step 3 - Enter the code and sign in with SAMPRA account.
echo Step 4 - Wait here until you see DEPLOY SUCCESS.
echo.
pause
echo.
echo Requesting device login code...
az logout 2>nul
az login --use-device-code --tenant "d8753712-9ca2-455f-bc33-0544f24db01b"
if errorlevel 1 (
  echo.
  echo LOGIN FAILED. Try again or use Render deploy (see PERMANENT-LINK.txt).
  pause
  exit /b 1
)
echo.
echo Signed in as:
az account show --query "{subscription:name, user:user.name}" -o table
echo.
echo Deploying (3-5 minutes)...
az webapp up --name hublio-mivali-sampra --resource-group rg-hublio-mivali --location southafricanorth --runtime "NODE:20-lts" --sku F1 --os-type Linux
if errorlevel 1 (
  echo DEPLOY FAILED - see error above.
  pause
  exit /b 1
)
echo.
echo ============================================================
echo   DEPLOY SUCCESS
echo   https://hublio-mivali-sampra.azurewebsites.net/login.html
echo ============================================================
start https://hublio-mivali-sampra.azurewebsites.net/login.html
pause
