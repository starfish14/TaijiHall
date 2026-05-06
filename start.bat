@echo off
setlocal

cd /d "%~dp0"

if not exist "package.json" (
  echo [ERROR] package.json not found in current directory.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not installed or not in PATH.
  echo Please install Node.js first: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] node_modules not found, installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo [INFO] Starting Vite dev server...
call npm run dev
set "EXIT_CODE=%errorlevel%"

if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Dev server exited with code %EXIT_CODE%.
)

pause
exit /b %EXIT_CODE%
