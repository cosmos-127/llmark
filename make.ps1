param(
    [Parameter(Position=0)]
    [string]$Target = "dev"
)

$RootDir = $PSScriptRoot
Set-Location $RootDir

switch ($Target.ToLower()) {
    "dev" {
        python run.py
    }
    "run" {
        python run.py
    }
    "test" {
        Write-Host "[*] Running backend test suite..." -ForegroundColor Cyan
        if (Test-Path "backend\.venv\Scripts\pytest.exe") {
            & "backend\.venv\Scripts\pytest.exe" backend\tests
        } else {
            python -m pytest backend\tests
        }
        Write-Host "[*] Typechecking and building frontend..." -ForegroundColor Cyan
        Set-Location "$RootDir\frontend"
        npm run build
        Set-Location $RootDir
    }
    "install" {
        Write-Host "[*] Installing backend dependencies..." -ForegroundColor Cyan
        if (Test-Path "backend\.venv\Scripts\pip.exe") {
            & "backend\.venv\Scripts\pip.exe" install -e backend
        } else {
            python -m pip install -e backend
        }
        Write-Host "[*] Installing frontend dependencies..." -ForegroundColor Cyan
        Set-Location "$RootDir\frontend"
        npm install
        Set-Location $RootDir
    }
    "backend" {
        if (Test-Path "backend\.venv\Scripts\uvicorn.exe") {
            & "backend\.venv\Scripts\uvicorn.exe" app.main:app --reload --port 8000 --app-dir backend
        } else {
            python -m uvicorn app.main:app --reload --port 8000 --app-dir backend
        }
    }
    "frontend" {
        Set-Location "$RootDir\frontend"
        npm run dev
    }
    "build" {
        Set-Location "$RootDir\frontend"
        npm run build
        Set-Location $RootDir
    }
    "clean" {
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue backend\.pytest_cache, frontend\dist
        Get-ChildItem -Path backend -Filter "__pycache__" -Recurse | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "[OK] Clean complete." -ForegroundColor Green
    }
    default {
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host " LLMark PowerShell Control Center" -ForegroundColor Cyan
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host " Usage: .\make.ps1 <target>"
        Write-Host " Targets:"
        Write-Host "   dev       - Start Backend & Frontend concurrently"
        Write-Host "   test      - Run backend pytest and frontend build"
        Write-Host "   install   - Install all Python and NPM packages"
        Write-Host "   backend   - Run FastAPI service only"
        Write-Host "   frontend  - Run Vite dev server only"
        Write-Host "   build     - Build frontend production bundle"
        Write-Host "   clean     - Clean temporary caches"
    }
}
