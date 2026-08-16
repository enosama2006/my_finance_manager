@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo        MyFinMan Local Launcher
echo ========================================

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Install Node.js LTS from https://nodejs.org/ then run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [1/2] Installing dependencies...
  call npm install
  if errorlevel 1 goto :fail
) else (
  echo [1/2] Dependencies already installed.
)

echo [2/2] Starting MyFinMan at http://localhost:5173
start "MyFinMan" http://localhost:5173
call npm run dev
exit /b %errorlevel%

:fail
echo.
echo [ERROR] Setup failed. Review the messages above.
pause
exit /b 1
