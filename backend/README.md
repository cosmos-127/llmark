# LLMark Backend Service

FastAPI-powered, async streaming benchmarking engine for evaluating LLM inference endpoints with microsecond precision, financial circuit breakers, self-healing persistence, and AI-assisted performance analysis.

---

## Architecture & Module Layout

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py               # Dependency injection (Database sessions)
│   │   └── routes/
│   │       ├── benchmark.py      # /api/benchmark/run, /stream, /{id}/abort, /cost-estimate, /models, /presets
│   │       ├── diff.py           # /api/diff (Head-to-head run comparison matrix)
│   │       ├── expert.py         # /api/expert/ask, /status (Groq AI Copilot & 37+ Knowledge Engine articles)
│   │       ├── export.py         # /api/export (ReportLab PDF, Markdown, CSV, .llmark bundle)
│   │       └── history.py        # /api/history (Paginated run list and single run inspection)
│   │
│   ├── core/
│   │   ├── config.py             # Settings, CORS, multi-vendor 2026 model pricing defaults
│   │   ├── orchestrator.py       # BenchmarkOrchestrator (asyncio.TaskGroup & CancellationToken)
│   │   ├── statistics_engine.py  # Unaggregated numpy percentiles & Goodput 4-gate evaluator
│   │   ├── diff_engine.py        # Percentage delta and regression calculator
│   │   ├── prompt_presets.py     # 16 production workload prompt templates
│   │   ├── report_exporter.py    # ReportLab executive PDF, Markdown, CSV, and bundle serializers
│   │   ├── cost_guard.py         # Pre-flight cost calculator & hard spend cap circuit breaker
│   │   ├── waterfall_collector.py# Socket-level DNS/TCP/TLS handshake latency profiler
│   │   └── fallback_tokenizer.py # Fast tiktoken & char-ratio fallback token counter
│   │
│   ├── adapters/
│   │   ├── base.py               # Abstract VendorAdapter interface
│   │   ├── openai_adapter.py     # OpenAI, Groq, Together, DeepSeek, vLLM, Ollama, SGLang
│   │   ├── anthropic_adapter.py  # Native Anthropic Messages API streaming
│   │   ├── azure_openai_adapter.py# Azure OpenAI Service streaming
│   │   ├── mock_adapter.py       # Realistic local simulation engine with reasoning support
│   │   └── registry.py           # Dynamic adapter resolver & factory
│   │
│   ├── models/
│   │   ├── schemas.py            # Pydantic v2 data contracts & metric snapshots
│   │   └── db/models.py          # SQLAlchemy 2.0 async BenchmarkRun ORM model
│   │
│   ├── db/session.py             # Async SQLite engine (aiosqlite) with self-healing ensure_db_initialized
│   ├── observability/logging.py  # Structlog with sensitive credential masking
│   ├── cli.py                    # Headless CI runner entrypoint with assertion evaluation
│   └── main.py                   # FastAPI app entrypoint, CORS, global exception handlers & static mount
│
├── tests/                        # 63 pytest unit & integration tests
│   ├── conftest.py               # Database clean-row fixtures and HTTP client fixtures
│   ├── unit/                     # Statistics, Adapters, Tokenizer, Waterfall, Diff, Exporters, CLI
│   └── integration/              # REST routes, SSE streams, abort lifecycle, expert AI, history, diff & exports
└── pyproject.toml                # Project configuration managed by pip/uv
```

---

## Database Resilience & Error Architecture

- **Self-Healing Initialization (`ensure_db_initialized`)**: An asynchronous lock-protected check verifies table schema integrity on every connection. If the database file is fresh, moved, or accessed outside FastAPI lifespan (e.g. CLI, worker subprocesses), tables are automatically created without runtime failures.
- **FastAPI Global Exception Handlers**: Registered handlers for `SQLAlchemyError`, `RequestValidationError`, `StarletteHTTPException`, and uncaught `Exception` guarantee consistent, structured JSON responses (`{"detail": "...", "error_type": "..."}`) and comprehensive server-side logs.
- **Non-Destructive Test Isolation**: `tests/conftest.py` utilizes table-row truncation rather than destructive DDL `drop_all` teardowns, eliminating asynchronous task race conditions.

---

## Running the Backend

### Local Setup
```bash
# 1. Install dependencies
pip install -e ".[dev]"

# 2. Start development server with hot-reload
python -m uvicorn app.main:app --port 8000 --reload
```

- **API Base:** `http://127.0.0.1:8000/api`
- **Swagger Docs:** `http://127.0.0.1:8000/api/docs`
- **Health Check:** `http://127.0.0.1:8000/health`

---

## Headless CI Mode (`app/cli.py`)

```bash
# Run benchmark from YAML configuration with Goodput threshold
python app/cli.py run --config ../benchmark_ci.yaml --fail-under-goodput 95.0 --output-md report.md

# Run with custom assertions
python app/cli.py run --vendor mock --model gpt-4o -a "p95_ttft < 500" -a "goodput >= 90"

# Exit codes:
# 0 -> All SLO thresholds and quality assertions satisfied
# 1 -> Goodput fell below threshold or assertion violated (Performance Regression)
# 2 -> Execution Error
```

---

## Running Tests & Quality Checks

```bash
# Run complete test suite (63 test cases)
pytest -v

# Run Ruff linter and formatter
python -m ruff check .
python -m ruff format --check .

# Run Mypy static typecheck
python -m mypy app
```

---

## Standalone Docker Container

```bash
# Build standalone backend image
docker build -t llmark-backend:latest -f Dockerfile .

# Run standalone backend container
docker run -p 8000:8000 -e PORT=8000 -e BACKEND_CORS_ORIGINS="*" llmark-backend:latest
```


