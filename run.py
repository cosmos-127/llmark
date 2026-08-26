#!/usr/bin/env python3
"""
LLMark Concurrent Development Runner
Starts both the FastAPI backend and Vite frontend concurrently with unified logging and graceful shutdown.
"""

import os
import sys
import subprocess
import time
import shutil
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    if sys.stdout.encoding != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

def get_backend_python() -> str:
    """Locate the Python executable in the backend virtualenv or fallback to sys.executable."""
    if os.name == "nt":
        venv_py = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"
        if venv_py.exists():
            return str(venv_py)
    else:
        venv_py = BACKEND_DIR / ".venv" / "bin" / "python"
        if venv_py.exists():
            return str(venv_py)
    return sys.executable

def get_npm_command() -> str:
    """Return npm command suitable for Windows / POSIX."""
    if os.name == "nt":
        npm_path = shutil.which("npm.cmd") or shutil.which("npm")
        return npm_path or "npm"
    return "npm"

def main():
    print("=" * 60)
    print(" [LLMark] - The Postman for LLM Endpoints")
    print("=" * 60)

    py_exec = get_backend_python()
    npm_cmd = get_npm_command()

    print(f"[*] Backend Directory  : {BACKEND_DIR}")
    print(f"[*] Frontend Directory : {FRONTEND_DIR}")
    print(f"[*] Python Executable  : {py_exec}")
    print(f"[*] NPM Executable     : {npm_cmd}")
    print("-" * 60)
    print("   Frontend UI  : http://localhost:5173")
    print("   Backend API  : http://127.0.0.1:8000")
    print("   Swagger Docs : http://127.0.0.1:8000/api/docs")
    print("-" * 60)
    print("Press CTRL+C anytime to gracefully stop all services.")
    print("=" * 60)

    # 1. Start Backend Process (uvicorn)
    backend_cmd = [
        py_exec,
        "-m",
        "uvicorn",
        "app.main:app",
        "--reload",
        "--port",
        "8000",
        "--host",
        "127.0.0.1",
    ]

    # 2. Start Frontend Process (vite dev)
    frontend_cmd = [
        npm_cmd,
        "run",
        "dev",
    ]

    backend_proc = None
    frontend_proc = None

    try:
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=str(BACKEND_DIR),
            env=os.environ.copy(),
        )

        frontend_proc = subprocess.Popen(
            frontend_cmd,
            cwd=str(FRONTEND_DIR),
            env=os.environ.copy(),
        )

        while True:
            # Check if any process terminated prematurely
            b_ret = backend_proc.poll()
            f_ret = frontend_proc.poll()

            if b_ret is not None:
                print(f"\n[!] Backend exited with status code: {b_ret}")
                break
            if f_ret is not None:
                print(f"\n[!] Frontend exited with status code: {f_ret}")
                break

            time.sleep(0.5)

    except KeyboardInterrupt:
        print("\n\n[*] Shutting down LLMark services...")
    finally:
        if backend_proc and backend_proc.poll() is None:
            backend_proc.terminate()
            try:
                backend_proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                backend_proc.kill()

        if frontend_proc and frontend_proc.poll() is None:
            if os.name == "nt":
                # On Windows, npm spawns node as child process
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                frontend_proc.terminate()
                try:
                    frontend_proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    frontend_proc.kill()

        print("[OK] LLMark services stopped successfully.")

if __name__ == "__main__":
    main()
