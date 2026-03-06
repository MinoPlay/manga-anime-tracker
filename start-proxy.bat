@echo off
REM Start the CORS Proxy Server for MyAnimeList API
REM This script requires Node.js to be installed

echo.
echo 🔄 Starting CORS Proxy Server...
echo.

REM Check if Node.js is installed
set NODE_EXE="C:\Program Files\nodejs\node.exe"
if exist %NODE_EXE% (
    set NODE_CMD=%NODE_EXE%
) else (
    node --version >nul 2>&1
    if %errorlevel% equ 0 (
        set NODE_CMD=node
    ) else (
        echo ❌ Node.js is not installed!
        echo.
        echo To fix this:
        echo 1. Download Node.js from: https://nodejs.org/
        echo 2. Install it (accept all defaults)
        echo 3. Restart this script
        echo.
        pause
        exit /b 1
    )
)

echo ✅ Node.js found
echo.
echo Starting proxy server on port 3000...
echo Keep this window open while testing!
echo.

%NODE_CMD% proxy-server.js
