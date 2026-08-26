@echo off
setlocal

title Launching Photobooth Management System...

echo Starting Backend server (FastAPI)...
start "Photobooth - Backend (FastAPI :8000)" cmd /k "cd /d %~dp0apps\backend && call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

echo Starting Frontend server (Vite)...
start "Photobooth - Frontend (Vite)" cmd /k "cd /d %~dp0apps\web && npm run dev"

echo.
echo ======================================================================
echo  Both servers have been launched in separate terminal windows!
echo.
echo  Backend:  http://localhost:8000  (API Docs: http://localhost:8000/docs)
echo  Frontend: http://localhost:5173
echo ======================================================================
echo.
pause
