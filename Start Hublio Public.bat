@echo off
title Hublio Public Link (Cloudflare Tunnel)
cd /d "%~dp0"
echo Starting Hublio locally...
start /B node api\server.js
timeout /t 2 /nobreak >nul
echo.
echo Creating public link (works while this window stays open)...
echo Share the URL shown below ending in trycloudflare.com
echo.
npx --yes cloudflared tunnel --url http://localhost:3000
pause
