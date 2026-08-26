@echo off
setlocal EnableDelayedExpansion

title Photobooth Management System - Developer Setup

echo ======================================================================
echo          Photobooth Management System - Environment Setup
echo ======================================================================
echo.

:: 1. Check Python installation
echo [1/4] Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    py --version >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Python is not installed or not in PATH!
        echo Please install Python 3.11+ from https://www.python.org/downloads/
        echo (Make sure to check "Add Python to PATH" during installation)
        pause
        exit /b 1
    )
    set "PYTHON_CMD=py"
) else (
    set "PYTHON_CMD=python"
)
for /f "tokens=*" %%v in ('!PYTHON_CMD! --version') do echo       Found: %%v

:: 2. Check Node.js and NPM installation
echo.
echo [2/4] Checking Node.js and NPM...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (LTS recommended) from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo       Found Node.js: %%v
for /f "tokens=*" %%v in ('npm --version') do echo       Found NPM: v%%v

:: 3. Setup Backend (Python Virtual Environment & Dependencies)
echo.
echo [3/4] Setting up Backend environment (apps/backend)...
cd /d "%~dp0apps\backend"

if not exist ".venv" (
    echo       Creating Python virtual environment (.venv)...
    !PYTHON_CMD! -m venv .venv
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
) else (
    echo       Virtual environment (.venv) already exists.
)

echo       Installing backend dependencies from requirements.txt...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)
call deactivate

:: 4. Setup Frontend (Node Modules)
echo.
echo [4/4] Setting up Frontend environment (apps/web)...
cd /d "%~dp0apps\web"

echo       Installing frontend npm packages...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Node dependencies.
    pause
    exit /b 1
)

:: Return to project root
cd /d "%~dp0"

echo.
echo ======================================================================
echo                      Setup Completed Successfully!
echo ======================================================================
echo.
echo How to run the project:
echo.
echo   Option A: Double-click 'start.bat' (starts both backend & frontend)
echo.
echo   Option B: Manual start:
echo     1. Backend:
echo        cd apps\backend
echo        .venv\Scripts\activate
echo        uvicorn app.main:app --reload --port 8000
echo.
echo     2. Frontend:
echo        cd apps\web
echo        npm run dev
echo.
echo ======================================================================
pause
