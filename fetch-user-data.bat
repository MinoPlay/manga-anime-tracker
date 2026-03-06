@echo off
REM Fetch MyAnimeList user data and save locally
REM This script fetches anime and manga lists from MyAnimeList API

echo.
echo ╔════════════════════════════════════════╗
echo ║  MyAnimeList User Data Fetcher         ║
echo ╚════════════════════════════════════════╝
echo.

REM Check if proxy server is running (optional)
echo Checking for proxy server on port 3000...
netstat -an | findstr ":3000" >nul
if errorlevel 1 (
    echo ⚠️  Proxy server not running (port 3000)
    echo    To use proxy, run in another terminal: node proxy-server.js
    echo    The script will use direct API calls
    echo.
)

REM Run the fetcher script
echo Starting data fetch...
node fetch-user-data.js

if errorlevel 1 (
    echo.
    echo ❌ Script failed!
    echo.
    pause
    exit /b 1
)

echo.
pause
