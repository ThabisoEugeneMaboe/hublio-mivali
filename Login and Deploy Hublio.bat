@echo off
title Deploy Hublio - Permanent Link
cd /d "%~dp0"
set LOG=%~dp0deploy-log.txt
echo Deploy started %date% %time% > "%LOG%"

echo.
echo ========================================
echo   HUBLIO - Permanent Azure Deploy
echo ========================================
echo.

echo Step 1: Azure CLI sign-in (browser opens)...
echo Step 1: Azure CLI sign-in >> "%LOG%"
az login --tenant "d8753712-9ca2-455f-bc33-0544f24db01b" >> "%LOG%" 2>&1
if errorlevel 1 (
  echo.
  echo FAILED: Azure sign-in did not complete.
  echo Open deploy-log.txt in this folder for details.
  notepad "%LOG%"
  pause
  exit /b 1
)

echo Step 2: Checking subscription...
az account show >> "%LOG%" 2>&1
if errorlevel 1 (
  echo FAILED: No Azure subscription found after sign-in.
  notepad "%LOG%"
  pause
  exit /b 1
)

echo Step 3: Deploying (3-5 minutes)...
az webapp up --name hublio-mivali-sampra --resource-group rg-hublio-mivali --location southafricanorth --runtime "NODE:20-lts" --sku F1 --os-type Linux >> "%LOG%" 2>&1
if errorlevel 1 (
  echo FAILED: Deploy error. See deploy-log.txt
  notepad "%LOG%"
  pause
  exit /b 1
)

echo.
echo ========================================
echo   SUCCESS - PERMANENT LINK:
echo   https://hublio-mivali-sampra.azurewebsites.net/login.html
echo ========================================
echo SUCCESS >> "%LOG%"
start https://hublio-mivali-sampra.azurewebsites.net/login.html
pause
