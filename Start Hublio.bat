@echo off
title Mivali Phase 3
cd /d "%~dp0"
echo.
echo   MIVALI - Learner / Teacher / Admin
echo   Folder: C:\Sampra\Hublio
echo   Login:  http://localhost:3000/login.html
echo   Render: https://hublio-mivali.onrender.com/login.html
echo.
start http://localhost:3000/login.html
node api\server.js
pause
