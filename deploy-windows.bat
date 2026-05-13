@echo off
REM ============================================================
REM   Folio Cards - Windows One-Click Auto Deploy
REM   Double-click this file to start. Admin rights auto-requested.
REM   v2.55.4 (2026.05) - FULL AUTO MODE
REM
REM   IMPORTANT: This BAT uses ASCII only to avoid Windows code page
REM   issues (CP949/UTF-8 mixing). All Korean messages are printed
REM   by PowerShell (which handles UTF-8 correctly).
REM
REM   v2.55.4: All user prompts removed. Only OAuth clicks needed.
REM ============================================================

REM Switch console to UTF-8 (required for Korean output later)
chcp 65001 >nul 2>&1

REM Move to script directory (handles spaces and Korean paths)
cd /d "%~dp0"

cls
echo.
echo ============================================================
echo   Folio Cards - One-Click Deploy Wizard for Windows
echo   v2.55.4 - FULL AUTO MODE
echo ============================================================
echo.
echo  This script will automatically:
echo    1. Install required tools (Git, Node.js, GitHub CLI, Vercel CLI)
echo    2. Auto-connect to GitHub repo (seong-ro/nest-alum1)
echo    3. Auto-pull environment variables from Vercel Dashboard
echo    4. Auto-link Vercel project (nest-alum1)
echo    5. Auto-deploy to production
echo.
echo  ONLY USER INPUT REQUIRED:
echo    - GitHub OAuth click (browser, 30 seconds)
echo    - Vercel OAuth click (browser, 30 seconds)
echo.
echo  Starting in 3 seconds... (Ctrl+C to cancel)
timeout /t 3 /nobreak >nul

REM Check if PowerShell is available
where powershell >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: PowerShell not found. Windows 10 or later required.
  echo.
  pause
  exit /b 1
)

REM Locate the deploy script (handle both "scripts\windows\" and "scripts/windows/")
set "PS_SCRIPT=%~dp0scripts\windows\deploy-windows.ps1"

if not exist "%PS_SCRIPT%" (
  echo.
  echo ERROR: deploy-windows.ps1 not found at:
  echo   %PS_SCRIPT%
  echo.
  echo  Make sure you extracted folio-cards.zip completely
  echo  to a folder before running this BAT file.
  echo.
  pause
  exit /b 1
)

REM Run PowerShell with bypass execution policy
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

if %errorlevel% neq 0 (
  echo.
  echo ============================================================
  echo   Deploy FAILED - check the log above for details.
  echo ============================================================
  echo.
  pause
  exit /b %errorlevel%
)

echo.
echo ============================================================
echo   Deploy COMPLETE!
echo ============================================================
echo.
pause
