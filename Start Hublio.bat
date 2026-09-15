@echo off
title Hublio Wellness App (separate from Sampra)
cd /d "%~dp0"
echo.
echo ========================================
echo   HUBLIO ONLY - not Sampra
echo   Folder: C:\Projects\Hublio
echo   Port:   3000
echo ========================================
echo.
echo   Login:    http://localhost:3000/login.html
echo   Learner:  http://localhost:3000/
echo   Teacher:  http://localhost:3000/dashboard.html
echo.
start http://localhost:3000/login.html
node api\server.js
pause
