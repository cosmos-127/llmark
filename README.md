# ⚡ LLMark — The Postman for LLM Endpoints

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12+](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Tests Passing](https://img.shields.io/badge/Tests-63%2F63%20Passing-emerald.svg)](https://github.com/)

> **Benchmark any LLM vendor in under 60 seconds.**  
> Measure microsecond tail latency (TTFT P95/P99, ITL P95/P99, Max Freeze), Goodput (SLO Yield %), and true cost per successful request — with ephemeral zero-cloud privacy and self-healing local storage.

---

## 📑 Table of Contents

- [The Thesis: Why LLMark Exists](#-the-thesis-why-llmark-exists)
- [Key Features](#-key-features)
- [Architecture & Request Flow](#-architecture--request-flow)
- [Quickstart (Single Command)](#-quickstart-single-command)
- [Mathematical Measurement Rigor](#-mathematical-measurement-rigor)
- [Production Workload Presets](#-production-workload-presets)
- [Self-Healing Database & Error Handling Architecture](#-self-healing-database--error-handling-architecture)
- [AI Inference Copilot & Knowledge Engine](#-ai-inference-copilot--knowledge-engine)
- [Head-to-Head Diffing & Export Hub](#-head-to-head-diffing--export-hub)
- [Headless CI/CD Mode (`llmark` CLI)](#-headless-cicd-mode-llmark-cli)
- [API Reference](#-api-reference)
- [Provider Setup Guide](#-provider-setup-guide)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Project Documentation Deep Dives](#-project-documentation-deep-dives)

---

## 🎯 The Thesis: Why LLMark Exists

In 2026, competitive advantage in AI engineering is determined by **how fast, reliable, and cost-effective model endpoints run under production traffic.**

- **The Problem:** Vendor marketing claims are empty-queue best-case numbers. Generic load tools (k6, Locust) cannot parse Server-Sent Events (SSE) or calculate token economics. LLMPerf was archived in December 2025.
- **The Solution:** LLMark is the **"Postman for LLM Endpoints"** — an open-source, local-first benchmarking platform that streams microsecond tail analytics, enforces financial circuit breakers, and generates executive reports in 60 seconds.

---

## ✨ Key Features

- ⏱️ **Microsecond Stream Capture:** Measures **Time to First Token (TTFT)**, **Inter-Token Latency (ITL)**, and **Decode TPS** without smoothing out tail spikes.
- 🧠 **Reasoning Model Isolation:** Measures **Time to First Answer (TTFA)** to decouple internal thinking tokens (`<think>` / `reasoning_content`) in DeepSeek-R1, OpenAI o-series, and Claude reasoning modes.
- 🌊 **Network Waterfall Profiler:** Socket-level timing isolates client **DNS lookup**, **TCP connection**, and **TLS handshake** from server prefill time.
- 🎯 **Goodput (SLO Yield %):** Measures the strict percentage of requests that meet **all** user latency criteria ($\text{TTFT} \le X \land \text{TPOT} \le Y \land \text{E2E} \le Z \land 200\text{ OK}$).
- 🛡️ **Zero Bill-Shock Circuit Breakers:** Pre-flight token calculation & real-time **Hard Spend Cap circuit breakers** to immediately terminate runs if dollar spend reaches your limit.
- 🤖 **Inference Copilot & Knowledge Engine:** Built-in AI assistant powered by Groq LLM (with model auto-discovery) or offline 37+ expert architectural Q&A articles.
- 🔄 **Self-Healing Storage:** Idempotent, thread-safe asynchronous SQLite persistence that automatically verifies table schemas on demand.
- 🛡️ **Robust Error Handling:** Comprehensive FastAPI exception handlers intercepting database, validation, and transport exceptions with structured JSON diagnostics.
- ⚖️ **Run Diffing Matrix:** Head-to-head comparison of Run A vs Run B with automated improvement/regression percentage change indicators.
- 📑 **Multi-Format Export Hub:** 1-click **ReportLab PDF**, **Markdown tables**, **CSV spreadsheets**, and single-file **`.llmark` bundles** (JSON/gzip).
- 🔒 **Local-First & Ephemeral Memory:** Zero telemetry. API keys are kept strictly in memory during execution and never written to disk or database.
- 💻 **Headless CI Runner:** Exit code-driven CLI (`0` = PASS, `1` = SLO FAIL, `2` = ERROR) for automated regression testing in GitHub Actions.

---

## 🏗️ Architecture & Request Flow

```mermaid
flowchart TD
    subgraph UI["Frontend (React 19 + Tailwind v4)"]
        CV["Credential Vault (In-Memory)"]
        TC["Test Configurator & 16 Presets"]
        LD["Live SSE Telemetry Dashboard"]
        DV["Run Diffing Matrix"]
        EX["AI Expert Copilot Drawer"]
    end

    subgraph API["FastAPI Backend (:8000)"]
        EH["Global Exception Handlers (DB, Validation, HTTP)"]
        BO["BenchmarkOrchestrator (asyncio.TaskGroup)"]
        WC["WaterfallCollector (DNS/TCP/TLS)"]
        CG["CostGuard & Circuit Breaker"]
        SE["StatisticsEngine (numpy percentiles)"]
        DE["DiffEngine"]
        RE["ReportExporter (PDF/MD/CSV/.llmark)"]
        EXP["ExpertRouter (Groq LLM / Knowledge Engine)"]
    end

    subgraph Adapters["Vendor Adapters"]
        A1["OpenAI (GPT-4o, o1, o3, GPT-5 series)"]
        A2["Anthropic (Claude 3.5 / 3.7 Sonnet)"]
        A3["Inference Clouds (Groq, Together, DeepSeek, Fireworks)"]
        A4["Self-Hosted (vLLM, Ollama, SGLang)"]
        A5["Zero-Cost Mock Engine"]
    end

    subgraph DB["Local State & Storage"]
        SQL[("Async SQLite (aiosqlite) with Auto-Init")]
    end

    TC -->|POST /run| BO
    BO --> WC
    BO --> CG
    BO --> Adapters
    Adapters -->|TokenEvents| BO
    BO -->|SSE Snapshot 100ms| LD
    BO --> SE
    SE --> SQL
    SQL --> DV
    SQL --> RE
    EX --> EXP
```

---

## 🚀 Quickstart

### Option 1: Docker (Single Command or Multi-Container)

```bash
# Multi-container setup (Backend on :8000 + Nginx Frontend on :3000)
docker compose up --build

# Or build & run standalone containers individually:
# Backend:
docker build -t llmark-backend -f backend/Dockerfile backend/
docker run -p 8000:8000 llmark-backend

# Frontend:
docker build -t llmark-frontend -f frontend/Dockerfile frontend/
docker run -p 3000:80 llmark-frontend
```
- **Frontend UI:** [http://localhost:3000](http://localhost:3000) (or [http://localhost:8000](http://localhost:8000) in monolith mode)
- **Backend API:** [http://localhost:8000](http://localhost:8000)

📖 See **[DOCKER.md](./DOCKER.md)** for the complete Docker reference — all three Dockerfiles, environment variables, architecture diagrams, and Render/Netlify deployment instructions.

---

### Option 2: Local One-Command Concurrent Runner

From the repository root (`llmark/`), use any of the unified launchers:

```bash
# Using Python
python run.py

# Using PowerShell (Windows)
.\run.ps1

# Using Make
make dev

# Using NPM
npm run dev
```

- **Frontend UI:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Swagger Documentation:** [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)
- **Health Check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### Option 3: Deploy Separate Frontend & Backend (Netlify + Render)

This architecture provides **0ms instantaneous UI loads** from Netlify's global CDN, with the Python inference engine running on Render.

#### Part 1: Deploy Backend on Render (Python API)
1. Push or fork this repository to your **GitHub** / **GitLab** account.
2. Go to **[dashboard.render.com](https://dashboard.render.com)** → **New +** → **Blueprint** (or **Web Service**).
3. Connect your repository. Render will automatically read [`render.yaml`](./render.yaml).
4. Note your public backend URL: `https://your-llmark-backend.onrender.com`.

#### Part 2: Deploy Frontend on Netlify (React 19)
1. Go to **[app.netlify.com](https://app.netlify.com)** → **Add new site** → **Import an existing project**.
2. Select your `llmark` repository.
3. Configure build settings (pre-configured via [`netlify.toml`](./netlify.toml)):
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Under **Environment variables**, add:
   - `VITE_API_URL`: `https://your-llmark-backend.onrender.com`
5. Click **Deploy Site**. Netlify will deploy your UI globally with 0 cold starts.

---

### Option 4: Deploy as Single Container on Render (Zero Cold Start with Uptime Ping)

LLMark is also pre-configured with a [`render.yaml`](./render.yaml) Blueprint and multi-stage `Dockerfile` to serve both frontend and backend from a single container:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. Deploy the blueprint on **[Render](https://dashboard.render.com)**.
2. *(Keep-Alive)* Set up a free monitor at **[UptimeRobot](https://uptimerobot.com)** pinging `https://<your-app>.onrender.com/health` every **10 minutes** to keep the container awake 24/7 for free.

---

## 🧮 Mathematical Measurement Rigor

```
Request Sent (t0)
   │
   ├─ [DNS + TCP + TLS Handshake] ──── (Network Connection Phase)
   │
   ├─ [Server Queue & Prefill] ────── (Inference Engine Prefill Phase)
   │
First Chunk (t_first) ─────────────── TTFT = t_first - t0
   │                                  TTFA = t_first_answer - t0 (Reasoning isolation)
   ├─ Token Gap (t2 - t1) ─────────── Chunk Gap 1 (ICL / ITL)
   ├─ Token Gap (t3 - t2) ─────────── Chunk Gap 2 (ICL / ITL)
   │
Stream Closed (t_last) ────────────── TTLT / E2E = t_last - t0
                                      TPOT = (t_last - t_first) / output_tokens
```

### 1. Time to First Token (TTFT)
$$\text{TTFT} = t_{\text{first\_chunk}} - t_{\text{request\_sent}}$$

### 2. Time to First Answer (TTFA) — Reasoning Isolation
$$\text{TTFA} = t_{\text{first\_answer\_chunk}} - t_{\text{request\_sent}}$$
$$\text{Reasoning Overhead} = \text{TTFA} - \text{TTFT}$$

### 3. Inter-Token Latency (ITL) vs Inter-Chunk Latency (ICL)
$$\text{ITL}_n = \frac{t_{n+1} - t_n}{\text{token\_count}(\text{chunk}_{n+1})}$$
*All delta intervals across all requests are aggregated into a single unaggregated population array to compute true P50, P75, P95, P99, and Max ITL.*

### 4. Goodput (SLO Yield %)
$$\text{Goodput} = \frac{\sum_{i=1}^{N} \mathbb{I}(\text{TTFT}_i \le \text{SLO}_{\text{TTFT}} \land \text{TPOT}_i \le \text{SLO}_{\text{TPOT}} \land \text{E2E}_i \le \text{SLO}_{\text{E2E}} \land \text{Status}_i = 200)}{N} \times 100\%$$

---

## 📦 Production Workload Presets

LLMark includes 16 production-grade workload presets calibrated for distinct hardware, network, and token dimensions:

| Workload Preset | Prompt Tokens | Output Tokens | Purpose & Target Stress Dimension |
|---|---|---|---|
| **Rate Limit & Quota Probing** (`rate_limit_probe`) | ~5 | 1–2 | Micro-token calls probing RPM/TPM ceilings, HTTP 429 backoff handling & gateway queues |
| **Prefill Scaling & TTFT** (`prefill_ttft`) | ~4,000 | 1–2 | Isolates pure KV prefill computation speed, prompt processing throughput (tok/s) & tail TTFT (P95/P99) |
| **Streaming Decode & Jitter** (`decode_throughput`) | ~40 | ~800 | Sustained autoregressive decode speed (tok/s), Inter-Token Latency (ITL) jitter & TPOT stability |
| **Reasoning & CoT Deep-Dive** (`reasoning_cot`) | ~300 | ~800 | Multi-constraint fleet scheduling & optimization DAG triggering deep Chain-of-Thought thinking (TTFA & token multiplier) |
| **Agentic Tool & Function Calling** (`agentic_tool_calling`) | ~1,200 | ~150 | Multi-tool JSON schemas evaluating function invocation latency, schema correctness & parameter precision under incident triage |
| **Code Generation & Syntax Stream** (`code_generation`) | ~1,500 | ~800 | Code generation throughput, syntax tree indentation jitter, strict typing & token emission smoothness |
| **Enterprise RAG Synthesis** (`rag_synthesis`) | ~3,500 | ~400 | Ingests 5 enterprise technical documents, evaluating multi-source cross-referencing, conflict resolution & grounded citation synthesis |
| **Long-Context & Needle Retrieval** (`long_context_retrieval`) | ~16,000 | ~300 | Massive 16k context window with 3 cryptographic/operational needles at 15%, 50%, and 85% depth measuring attention scaling & memory pressure |
| **Document Summarization & Distill** (`summarization_distill`) | ~4,500 | ~300 | Dense Annual Infrastructure & FinOps audit report evaluating information distillation speed into executive briefs |
| **Structured JSON & Grammar** (`structured_json`) | ~600 | ~300 | Guided grammar decoding evaluating parser compliance, syntax validity & constrained decode latency penalty |
| **Interactive Conversational** (`chat_interactive`) | ~200 | ~150 | Conversational responsiveness, end-user perceived latency (TTFT P50/P95) & human reading speed cadence |
| **Few-Shot In-Context Classification** (`fewshot_classification`) | ~1,200 | ~10 | 12 production incident exemplars evaluating in-context classification latency & ultra-low decode routing |
| **Multimodal Vision & OCR** (`multimodal_vision`) | ~1,800 | ~200 | 4K system topology diagram and telemetry heatmap evaluating vision encoder projection latency & OCR layout extraction |
| **Multi-Turn Session Context** (`multiturn_agentic`) | ~2,500 | ~350 | Deep 5-turn collaborative DevOps incident response history evaluating KV cache memory expansion & turn latency drift |
| **Prompt Prefix Cache Warm / Hit** (`kv_cache_reuse`) | ~3,200 | ~150 | Deterministic static architecture specification measuring KV cache hit speedup ratio, TTFT reduction & caching discount throughput |
| **Custom Workload Studio** (`custom`) | User Defined | User Defined | Full flexibility with custom prompt payload, token bounds & multi-dimensional telemetry matrix |

---

## 🛡️ Self-Healing Database & Error Handling Architecture

LLMark features a robust resilience architecture designed to handle real-world deployment anomalies gracefully:

1. **Self-Healing Storage (`ensure_db_initialized`)**:
   - The async SQLite session generator and background worker tasks execute an idempotent schema check on first connection.
   - If tables are missing or uninitialized (e.g. cold starts, container restarts, or CLI executions outside lifespan), schemas are automatically constructed with zero runtime crash.
2. **Global Exception Handlers**:
   - `SQLAlchemyError`: Logs structured diagnostics and emits clean `500 Internal Server Error` JSON (`{"detail": "...", "error_type": "DatabaseError"}`).
   - `RequestValidationError`: Formats unprocessable payload issues into structured `422 Unprocessable Entity` responses.
   - `StarletteHTTPException`: Standardizes status codes and user-facing messages.
   - `Exception`: Catch-all protection ensuring unexpected server errors never expose raw stack traces.
3. **Route-Level Guardrails**:
   - `/api/history`, `/api/diff`, `/api/export`, and `/api/benchmark` handlers wrap queries and file generators with granular logging and structured HTTPExceptions.

---

## 🤖 AI Inference Copilot & Knowledge Engine

LLMark includes an integrated **Inference Copilot** (`/api/expert`):
- **Live Groq LLM Assistant**: Answers custom questions regarding queuing theory, GPU VRAM sizing formulas, Continuous Batching, and TTFT optimization.
- **Offline Knowledge Engine**: Over 37 dedicated curated architectural articles accessible instantly with zero API keys required.

---

## ⚖️ Head-to-Head Diffing & Export Hub

### Visual Diffing Matrix
Select any two benchmark runs in the **Diff Runs** tab to see immediate comparison deltas:
- **Green Badges:** Performance improvements (e.g. $-45.2\%$ TTFT P95, $+120.5\%$ TPS).
- **Red Badges:** Performance regressions.

### Export Hub
- **Executive PDF:** Multi-page branded PDF with summary cards, percentiles table, and waterfall baseline.
- **Markdown Summary:** Copy-ready Markdown table for PR descriptions and issue tracking.
- **CSV Data:** Per-metric RFC 4180 spreadsheet.
- **`.llmark` Bundle:** Portable compressed JSON archive for cross-team sharing without central databases.

---

## 💻 Headless CI/CD Mode (`llmark` CLI)

Integrate automated model performance gates into your CI/CD pipelines:

```bash
# Run benchmark from configuration file
python backend/app/cli.py run --config benchmark_ci.yaml --fail-under-goodput 95.0 --output-md report.md

# Exit codes:
# 0 -> Benchmark passed all SLO Goodput criteria
# 1 -> SLO Goodput failed (performance regression detected)
# 2 -> Execution error
```

### GitHub Actions CI Example (`.github/workflows/benchmark.yml`)
```yaml
name: LLM Performance Canary Gate
on: [pull_request, push]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: |
          cd backend
          pip install -e ".[dev]"
      - name: Run LLMark Canary Benchmark
        run: |
          python backend/app/cli.py run \
            --vendor mock \
            --model gpt-4o \
            --preset chat \
            --concurrency 5 \
            --duration 15 \
            --fail-under-goodput 90.0 \
            --output-md canary_report.md
      - name: Publish Benchmark Summary to PR
        if: always()
        run: cat canary_report.md >> $GITHUB_STEP_SUMMARY
```

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/benchmark/run` | `POST` | Start a new concurrent benchmark run (returns `benchmark_id`). |
| `/api/benchmark/stream` | `GET` | SSE stream emitting microsecond progress snapshots and waterfall data. |
| `/api/benchmark/{id}/abort` | `POST` | Instantly abort an in-flight benchmark run. |
| `/api/benchmark/cost-estimate` | `GET` | Pre-flight token calculation & estimated dollar spend. |
| `/api/benchmark/models` | `POST` | Fetch listed models from remote vendor endpoint. |
| `/api/benchmark/presets` | `GET` | Retrieve 16 production workload presets with prompt metadata. |
| `/api/diff` | `GET` | Compare Run A vs Run B and compute metric percentage deltas. |
| `/api/export/pdf/{id}` | `GET` | Download executive ReportLab PDF report. |
| `/api/export/markdown/{id}` | `GET` | Retrieve raw Markdown summary table. |
| `/api/export/csv/{id}` | `GET` | Download RFC 4180 CSV telemetry spreadsheet. |
| `/api/export/bundle/{id}` | `GET` | Download portable `.llmark` compressed JSON archive. |
| `/api/history` | `GET` | Paginated list of historical benchmark runs. |
| `/api/history/{run_id}` | `GET` | Full telemetry and percentiles for a specific historical benchmark run. |
| `/api/expert/ask` | `POST` | Ask queuing theory & benchmark optimization questions to AI Expert. |
| `/api/expert/status` | `GET` | Check AI Expert Copilot status and available models. |
| `/health` | `GET` | Health check endpoint. |

---

## 🔌 Provider Setup Guide

### 1. OpenAI & Flagship Models
```json
{
  "vendor": "openai",
  "model": "gpt-4o",
  "credential": { "api_key": "sk-..." }
}
```

### 2. Anthropic
```json
{
  "vendor": "anthropic",
  "model": "claude-3-7-sonnet",
  "credential": { "api_key": "sk-ant-..." }
}
```

### 3. Self-Hosted vLLM / Ollama / SGLang
```json
{
  "vendor": "openai_compatible",
  "model": "meta-llama/llama-3.3-70b-instruct",
  "credential": {
    "api_key": "EMPTY",
    "base_url": "http://localhost:8000/v1"
  }
}
```

### 4. Groq / Together AI / DeepSeek / Fireworks
```json
{
  "vendor": "openai_compatible",
  "model": "deepseek-ai/deepseek-r1",
  "credential": {
    "api_key": "gsk_...",
    "base_url": "https://api.groq.com/openai/v1"
  }
}
```

---

## 🧪 Testing & Quality Assurance

Run the comprehensive test suite (63 unit & integration test cases):

```bash
# Run backend pytest suite
cd backend
pytest -v

# Run linting & formatting checks
python -m ruff check .
python -m ruff format --check .

# Run static type checking
python -m mypy app

# Run frontend build & typecheck
cd ../frontend
npm run build
```

---

## 📚 Project Documentation Deep Dives

For in-depth architectural and technical blueprints:
- [backend/README.md](backend/README.md) — Backend architecture, module layout, and database lifecycle.
- [frontend/README.md](frontend/README.md) — Frontend architecture, React 19 UI component structure, and SSE state management.
- [base_idea.md](base_idea.md) — Initial Architectural Blueprint & Value Proposition.

---

## 📜 License
MIT License. Built for the global AI engineering community.

