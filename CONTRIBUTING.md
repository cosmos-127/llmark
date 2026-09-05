# Contributing to LLMark

Thank you for your interest in contributing to **LLMark**! We welcome bug fixes, performance improvements, new LLM vendor adapters, workload presets, and documentation enhancements.

---

## Code of Conduct

We are committed to fostering an inclusive, welcoming, and harassment-free community. Please treat all contributors and maintainers with respect.

---

## Development Prerequisites

Before getting started, ensure you have the following installed:

- **Python 3.12+** (Backend engine and CLI)
- **Node.js 18+** & **npm 9+** (Frontend React 19 application)
- **Git**

*(Optional but recommended tools)*:
- **make** (or PowerShell / cmd on Windows)
- **uv** (ultra-fast Python package installer)
- **Docker** (for containerized testing)

---

## Local Development Setup

### 1. Fork and Clone
```bash
git clone https://github.com/<your-username>/llmark.git
cd llmark
```

### 2. Configure Environment
```bash
cp .env.example .env
```
> **Note:** API keys are completely optional for local development. The built-in `mock` engine lets you run full streaming benchmarks without external API credentials.

### 3. Install Dependencies
Using Makefile (Linux / macOS / Git Bash):
```bash
make install
```
Or on Windows PowerShell:
```powershell
.\make.ps1 install
```
Or manually:
```bash
# Backend
cd backend
python -m pip install -e ".[dev]"
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### 4. Run Development Servers
Start both backend (port 8000) and frontend (port 5173) with unified logging and graceful shutdown:
```bash
python run.py
# Or: make dev | .\run.ps1 | npm run dev
```

- **Frontend UI:** http://localhost:5173
- **Backend API & Swagger:** http://127.0.0.1:8000/api/docs
- **Health Check:** http://127.0.0.1:8000/health

---

## Development Cheatsheet

| Task | Command (Make) | Windows PowerShell | Manual Command |
|---|---|---|---|
| **Run Full Stack** | `make dev` | `.\run.ps1` | `python run.py` |
| **Run Backend Only** | `make backend` | `.\make.ps1 backend` | `cd backend && uvicorn app.main:app --reload --port 8000` |
| **Run Frontend Only** | `make frontend` | `.\make.ps1 frontend` | `cd frontend && npm run dev` |
| **Run All Tests** | `make test` | `.\make.ps1 test` | `pytest backend/tests && cd frontend && npm run build` |
| **Lint & Format Check** | `make lint` | `.\make.ps1 lint` | `cd backend && ruff check . && ruff format --check .` |
| **Type Check** | `make typecheck` | `.\make.ps1 typecheck` | `cd backend && mypy app` |
| **Clean Temp Files** | `make clean` | `.\make.ps1 clean` | `rm -rf backend/.pytest_cache llmark.db` |

---

## Adding New Features

### Adding a New Provider Adapter
1. Create a new adapter file in `backend/app/adapters/your_vendor_adapter.py`.
2. Inherit from `VendorAdapter` in `backend/app/adapters/base.py`.
3. Implement the `stream_completion` async generator yielding `TokenEvent` objects.
4. Register your new adapter in `backend/app/adapters/registry.py`.
5. Add unit tests in `backend/tests/unit/test_adapters.py`.

### Adding a New Workload Preset
1. Open `backend/app/core/prompt_presets.py`.
2. Define a new `PromptPreset` enum value and corresponding `PresetConfig`.
3. Specify realistic prompt token counts, output target ranges, and evaluation dimensions.
4. Add frontend preset options in `frontend/src/components/test-configurator/TestConfigurator.tsx`.

---

## Coding Standards & Git Guidelines

### Python (Backend)
- Formatted with **Ruff** (line length 100).
- Type annotations required on all public functions (checked with **Mypy**).
- Asynchronous routes and database queries must use `async`/`await`.

### TypeScript / React (Frontend)
- Strict TypeScript (`tsc --noEmit`).
- Tailwind CSS v4 for utility-first styling.
- Lucide React or Hugeicons for UI iconography.

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat(adapter): add Mistral AI streaming adapter`
- `fix(orchestrator): handle socket disconnect during ITL calculation`
- `docs(readme): clarify local development prerequisites`
- `perf(engine): optimize unaggregated percentile calculation with numpy`
- `test(cli): add assertions for goodput threshold exit codes`

---

## Submitting a Pull Request

1. Create a feature branch:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Ensure all tests and static analysis pass:
   ```bash
   make test
   make lint
   make typecheck
   ```
3. Push to your fork:
   ```bash
   git push origin feat/my-new-feature
   ```
4. Open a Pull Request on GitHub with a clear description of the changes and testing evidence.
