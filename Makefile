# ============================================================================
# LLMark — The Postman for LLM Endpoints
# Makefile for Installation, Development, Testing, and Deployment
# ============================================================================

.DEFAULT_GOAL := help

PYTHON := python
NPM := npm

.PHONY: help
help:
	@echo "======================================================================"
	@echo " ⚡ LLMark CLI Control Center"
	@echo "======================================================================"
	@echo " Available commands:"
	@echo "   make dev         - Run both Backend (FastAPI) and Frontend (Vite)"
	@echo "   make run         - Alias for 'make dev'"
	@echo "   make install     - Install all backend (Python) & frontend (NPM) dependencies"
	@echo "   make test        - Run backend test suite (pytest) & frontend typecheck"
	@echo "   make backend     - Run FastAPI backend service standalone on port 8000"
	@echo "   make frontend    - Run Vite frontend dev server standalone on port 5173"
	@echo "   make build       - Build frontend static production assets"
	@echo "   make clean       - Remove cache files, build artifacts, and temp databases"
	@echo "======================================================================"

.PHONY: install
install:
	@echo "[*] Installing Python backend dependencies..."
	cd backend && $(PYTHON) -m pip install -e .
	@echo "[*] Installing Frontend NPM packages..."
	cd frontend && $(NPM) install
	@echo "[✓] All dependencies installed successfully."

.PHONY: dev run
dev:
	$(PYTHON) run.py

run: dev

.PHONY: backend
backend:
	cd backend && $(PYTHON) -m uvicorn app.main:app --reload --port 8000 --host 127.0.0.1

.PHONY: frontend
frontend:
	cd frontend && $(NPM) run dev

.PHONY: test
test:
	@echo "[*] Running backend test suite..."
	cd backend && $(PYTHON) -m pytest
	@echo "[*] Typechecking and building frontend..."
	cd frontend && $(NPM) run build
	@echo "[✓] All tests passed."

.PHONY: build
build:
	@echo "[*] Building frontend for production..."
	cd frontend && $(NPM) run build
	@echo "[✓] Build complete. Artifacts in frontend/dist"

.PHONY: clean
clean:
	@echo "[*] Cleaning temporary files..."
	-rm -rf backend/.pytest_cache backend/**/__pycache__ frontend/dist
	@echo "[✓] Clean complete."
