@echo off
title Hublio Phase 3 (Mivali)
cd /d "%~dp0"
echo.
echo   HUBLIO PHASE 3 - Learner / Teacher / Admin
echo   Folder: C:\Sampra\Hublio  (or this folder if running from Projects)
echo   Login:  http://localhost:3000/login.html
echo   Render: https://hublio-mivali.onrender.com/login.html
echo.
start http://localhost:3000/login.html
node api\server.js
pause
