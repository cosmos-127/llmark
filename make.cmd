@echo off
set TARGET=%1
if "%TARGET%"=="" set TARGET=dev

if "%TARGET%"=="dev" goto DEV
if "%TARGET%"=="run" goto DEV
if "%TARGET%"=="test" goto TEST
if "%TARGET%"=="install" goto INSTALL
if "%TARGET%"=="backend" goto BACKEND
if "%TARGET%"=="frontend" goto FRONTEND
if "%TARGET%"=="build" goto BUILD
if "%TARGET%"=="clean" goto CLEAN

:HELP
echo ============================================================
echo  LLMark Batch Control Center
echo ============================================================
echo  Usage: make ^<target^>
echo  Targets:
echo    dev       - Start Backend ^& Frontend concurrently
echo    test      - Run backend pytest and frontend build
echo    install   - Install all Python and NPM packages
echo    backend   - Run FastAPI service only
echo    frontend  - Run Vite dev server only
echo    build     - Build frontend production bundle
echo    clean     - Clean temporary caches
goto END

:DEV
python run.py
goto END

:TEST
echo [*] Running backend test suite...
python -m pytest backend/tests
echo [*] Typechecking and building frontend...
cd frontend && npm run build && cd ..
goto END

:INSTALL
echo [*] Installing backend dependencies...
python -m pip install -e backend
echo [*] Installing frontend dependencies...
cd frontend && npm install && cd ..
goto END

:BACKEND
cd backend && python -m uvicorn app.main:app --reload --port 8000
goto END

:FRONTEND
cd frontend && npm run dev
goto END

:BUILD
cd frontend && npm run build && cd ..
goto END

:CLEAN
rmdir /s /q backend\.pytest_cache 2>nul
rmdir /s /q frontend\dist 2>nul
echo [OK] Clean complete.
goto END

:END
