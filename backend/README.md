# ⚡ LLMark Backend Service

FastAPI-powered, async streaming benchmarking engine for evaluating LLM inference endpoints with microsecond precision.

---

## 🏗️ Architecture & Module Layout

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py               # Dependency injection (Database sessions)
│   │   └── routes/
│   │       ├── benchmark.py      # /api/benchmark/run, /stream, /{id}/abort, /cost-estimate
│   │       ├── diff.py           # /api/diff (Run A vs Run B comparison)
│   │       ├── export.py         # /api/export (PDF, Markdown, CSV, .llmark bundle)
│   │       └── history.py        # /api/history (Paginated run queries)
│   │
│   ├── core/
│   │   ├── config.py             # Settings, CORS, model pricing defaults
│   │   ├── orchestrator.py       # BenchmarkOrchestrator (asyncio.TaskGroup & CancellationToken)
│   │   ├── statistics_engine.py  # Unaggregated numpy percentiles & Goodput evaluator
│   │   ├── diff_engine.py        # Percentage delta calculator
│   │   ├── report_exporter.py    # ReportLab PDF, Markdown, CSV, and bundle serializers
│   │   ├── cost_guard.py         # Pre-flight cost calculator & hard spend cap circuit breaker
│   │   ├── waterfall_collector.py# Socket-level DNS/TCP/TLS handshake latency profiler
│   │   └── fallback_tokenizer.py # Fast tiktoken & char-ratio fallback token counter
│   │
│   ├── adapters/
│   │   ├── base.py               # Abstract VendorAdapter interface
│   │   ├── openai_adapter.py     # OpenAI, Groq, Together, DeepSeek, vLLM, Ollama
│   │   ├── anthropic_adapter.py  # Native Anthropic Messages API streaming
│   │   ├── mock_adapter.py       # Realistic local simulation engine
│   │   └── registry.py           # Dynamic adapter resolver & factory
│   │
│   ├── models/
│   │   ├── schemas.py            # Pydantic v2 data contracts
│   │   └── db/models.py          # SQLAlchemy 2.0 async BenchmarkRun ORM model
│   │
│   ├── db/session.py             # Async SQLite engine (aiosqlite)
│   ├── observability/logging.py  # Structlog with sensitive credential masking
│   ├── cli.py                    # Headless CI runner entrypoint
│   └── main.py                   # FastAPI app entrypoint, CORS, lifespan & static mount
│
├── tests/                        # 34 pytest unit & integration tests
│   ├── conftest.py               # Database and HTTP client fixtures
│   ├── unit/                     # Statistics, Adapters, Tokenizer, Waterfall, Diff, Exporters, CLI
│   └── integration/              # REST, SSE stream, abort, and export route tests
└── pyproject.toml                # Project configuration managed by uv
```

---

## 🚀 Running the Backend

### Local Setup with `uv`
```bash
# 1. Create virtualenv and install dependencies
uv venv
uv pip install -e .

# 2. Start development server with hot-reload
.venv/Scripts/uvicorn app.main:app --port 8000 --reload
```

- **API Base:** `http://127.0.0.1:8000/api`
- **Swagger Docs:** `http://127.0.0.1:8000/api/docs`
- **Health Check:** `http://127.0.0.1:8000/health`

---

## 💻 Headless CI Mode (`cli.py`)

```bash
# Run benchmark from YAML configuration with Goodput threshold
python cli.py run --config ../benchmark_ci.yaml --fail-under-goodput 95.0 --output-md report.md

# Exit codes:
# 0 -> All SLO thresholds satisfied
# 1 -> Goodput fell below threshold (SLO Regression)
# 2 -> Execution Error
```

---

## 🧪 Running Tests

```bash
.venv/Scripts/pytest -v
```

All 34 test cases test:
- Microsecond percentile math and Goodput calculations.
- Ephemeral in-memory API key handling.
- Streaming chunk parsing, reasoning token extraction, and fallback token counting.
- Headless CLI execution and exit codes.
- ReportLab PDF, Markdown, CSV, and `.llmark` bundle serialization.
- Server-Sent Events (SSE) live broadcast lifecycle.
