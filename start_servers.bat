@echo off
echo ====================================================================
echo  AI-Powered Railway Maintenance Block Optimizer (Indian Railways)
echo ====================================================================
echo.
echo Starting FastAPI Backend on http://localhost:8000 ...
start cmd /k "cd /d %~dp0backend && ..\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Vite React Frontend on http://localhost:5173 ...
start cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend API Docs: http://localhost:8000/docs
echo ====================================================================
