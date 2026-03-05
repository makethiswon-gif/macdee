@echo off
echo ========================================
echo    MACDEE Server Starting...
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Installing dependencies...
call npm install

echo.
echo [2/2] Starting dev server...
echo.
echo   Local:  http://localhost:3000
echo ========================================
echo.

call npm run dev
