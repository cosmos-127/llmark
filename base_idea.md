# ⚡ LLMark — Full Technical Project Frame

---

## 🧭 The One-Liner

> **"LLMark is the Postman for LLM endpoints — drop in any vendor's API key, run a full benchmark suite in under 60 seconds, and walk away with a downloadable performance report. No CLI. No scripts. No PhD required."**

---

## 🌍 The World It Lives In

The AI infrastructure landscape in 2026 is fragmented by design. Teams run OpenAI, Anthropic, Azure OpenAI, GCP Vertex AI, AWS Bedrock, OpenRouter, Groq, Together AI, DeepSeek, and self-hosted vLLM/Ollama — often simultaneously — with no standardized way to compare them. Vendor-supplied benchmark numbers are best-case, co-located, empty-queue figures that evaporate the moment real traffic hits.

No benchmark from any source can tell you how models perform on **your prompts, your input lengths, your traffic patterns.** The most-referenced cross-vendor benchmark tool — LLMPerf — was archived and went read-only in December 2025. Generic load tools like k6 and Locust drive concurrency but understand nothing about token streaming, TTFT, ITL, reasoning tokens, or prefix caching. NVIDIA's GenAI-Perf is NVIDIA-only.

**The gap is real, the timing is perfect, and LLMark fills it exactly.**

---

## 🔴 The 3 Problems LLMark Solves

### Problem 1 — No Apples-to-Apples Vendor Comparison
Every vendor defines and computes metrics differently. Prefill caching, token batching, and reasoning streams make synthetic vendor claims deceptive. LLMark enforces **one consistent metric definition** computed the same way across every vendor adapter.

### Problem 2 — Every Existing Tool Has a Hard Ceiling
- **LLMPerf** → Archived Dec 2025. Was API-only but not truly multi-vendor portable.
- **GenAI-Perf** → NVIDIA/Triton ecosystem only. No UI.
- **k6 / Locust / Gatling** → Great at HTTP load, blind to token streaming semantics and token usage.
- **llm-optimizer** → Self-hosted open-source only. No multi-vendor credential support.

**Nothing in the ecosystem offers a browser UI, multi-vendor ephemeral credential vaulting, tail latency analytics, prompt workload presets, and multi-format downloadable reports in a single tool.**

### Problem 3 — Tail Latency & Stream Stalls Are Invisible
Average TPOT tells you speed. **P99 ITL tells you pain.** A user notices a 200ms pause mid-response far more than a steady 20ms/token average. Even LLMPerf averaged ITL per-request before aggregating — losing every individual latency spike in the process. LLMark captures every token gap, every time, at the stream level.

---

## 🔍 Stack Audit & Clean Scope

The core ethos of LLMark is **simplicity, speed, portability, and enterprise privacy**. An oversized stack loaded with agent orchestration frameworks, vector databases, and knowledge graphs contradicts this mission.

### 🔴 Cut Out of Scope (18+ Monorepo / Agentic Dependencies Removed)
- **LangGraph / LangChain Core / LangSmith:** No multi-step reasoning agents or chain graphs; benchmark runs are pure, concurrent HTTP streaming calls.
- **ChromaDB / Qdrant / Neo4j / GraphRAG / Trino:** No vector embeddings, graph traversals, or federated query engines needed.
- **Ragas / Promptfoo:** LLMark measures latency, throughput, and error rates — not output quality or RAG evaluation.

### 🟠 Streamlined for Maximum Portability, Power & Security
- **Local-First / Private VPC Architecture:** Run anywhere via Docker with 100% data privacy. Zero external telemetry, zero proxy middleman hops.
- **FastAPI BackgroundTasks + SSE:** Handles 30–120s benchmark runs natively without Celery and Redis broker dependencies for v1.
- **Pre-Flight Cost Estimator & Hard Budget Cap:** Real-time pre-run cost calculation with automated spend cutoffs to prevent accidental credit burn.
- **Graceful Run Cancellation:** Immediate abort control (`POST /benchmark/{id}/abort`) to cancel in-flight tasks and close connection pools.
- **Network Latency Waterfall Profiler:** Microsecond separation of DNS, TCP, and TLS connection handshakes from server-side TTFT and decode time.
- **Run Diffing Engine:** Instant baseline comparison (Run A vs Run B) with visual percentile deltas and Goodput score shifts.
- **Structured Output & Multimodal Profiles:** Tests guided JSON decoding latency overhead and vision image prefill encoding speed.
- **Portable `.llmark` File Bundles:** Zero-cloud 1-click import/export of complete benchmark runs for frictionless team collaboration.
- **Headless CI Runner (`llmark` CLI):** Automated performance regression gate for GitHub Actions / CI pipelines with exit codes keyed to SLO Goodput thresholds.
- **SQLite (`aiosqlite`) for v1 → PostgreSQL (`asyncpg`) for v2:** Zero-container database setup locally via SQLAlchemy 2.0 async.
- **Tremor Raw / shadcn Charts UI:** Clean, unified charting built natively on Tailwind CSS v4 & React 19 without heavy duplicate chart dependencies.
- **Pure Ephemeral Key Handling:** API keys reside in browser/memory only during active benchmark execution — never written to disk, SQLite, logs, or persistent telemetry.
- **Token Accounting with Fallback Tokenizer:** Primary exact counts via upstream `stream_options.usage` with fallback fast token estimation (`tiktoken` / lightweight tokenizers) when self-hosted endpoints omit usage chunks.
- **Multi-Format Report Hub:** Executive PDF report, 1-click Markdown comparison tables, CSV data export, and raw microsecond JSON telemetry.
- **External Endpoint Adapters:** LLMark benchmarks external vLLM, Ollama, and cloud providers via standard API adapters; it does not host heavy inference servers inside its own stack.

---

## 🏗️ Full System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND  (React 19 + Vite + TypeScript)          │
│                                                                         │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────────┐  │
│  │ CredentialVault │  │  TestConfigurator │  │    LiveRunDashboard    │  │
│  │                 │  │                  │  │                        │  │
│  │ React Hook Form │  │ Workload Presets │  │  TanStack Query (SSE)  │  │
│  │ + Zod Schemas   │  │ (Chat/RAG/Code/  │  │  Tremor Raw KPI Cards  │  │
│  │ In-memory only  │  │  Vision/JSON/    │  │  P95/P99 Stream Gauge  │  │
│  │ Ephemeral keys  │  │  Multi-Turn)     │  │  Waterfall Latency Bar │  │
│  │ Never in DB/logs│  │ Load Curves      │  │  Live Cost Tracker     │  │
│  │                 │  │ (Ramp/Spike/Flat)│  │  Abort / Cancel Button │  │
│  │                 │  │ Pre-Run Cost Est.│  │  Goodput Gauge Table   │  │
│  │                 │  │ Hard Budget Cap  │  │                        │  │
│  └─────────────────┘  └──────────────────┘  └────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │               ResultsExplorer, Diff Hub & Exporters                 ││
│  │   TanStack Table (sortable · filterable · latency breakdown)        ││
│  │   Visual Run Diffing Engine (Run A vs Run B Percentage Delta)       ││
│  │   Multi-vendor overlay charts & context degradation curves          ││
│  │   Export Hub: PDF Report · CSV · Markdown Table · `.llmark` Bundle  ││
│  │   shadcn-admin layout shell + dark mode                             ││
│  └─────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────┬──────────────────────────────────────────┘
                               │  REST + SSE (Server-Sent Events)
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                        BACKEND  (FastAPI + Python 3.12)                  │
│                                                                         │
│   FastAPI Routes          Pydantic v2 Schemas        Uvicorn / CLI       │
│   ─────────────           ──────────────────        ───────────────     │
│   POST /benchmark/run     BenchmarkConfig            Async ASGI Dev &    │
│   POST /benchmark/abort   VendorCredential (in-mem)  Headless CI Runner  │
│   GET  /benchmark/stream  MetricsSnapshot            (`llmark run` CLI)  │
│   GET  /benchmark/cost-est RunDiffPayload                               │
│   GET  /report/{id}/pdf   SLOThreshold                                   │
│   GET  /report/{id}/csv   ReportExport                                   │
│   GET  /report/{id}/bundle (.llmark JSON/gzip package)                  │
│   GET  /history                                                         │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                  BenchmarkOrchestrator                            │   │
│  │                                                                  │   │
│  │   Cost & Budget Guard  → Pre-flight estimate & in-flight hard cap│   │
│  │   Waterfall Profiler   → DNS, TCP & TLS microsecond latency clock│   │
│  │   Warmup Engine        → 1-2 pre-flight calls to prime TLS/DNS   │   │
│  │   Workload Engine      → Chat / RAG / Code / Vision / Multi-Turn │   │
│  │   Load Curve Generator → Flat Concurrency, Ramp-Up, or Spikes    │   │
│  │   A/B Runner           → Simultaneous dual-model comparative run │   │
│  │   Cache-Bust Injector  → Dynamic nonces to defeat prefix caching │   │
│  │   asyncio TaskGroup    → Concurrent workers + CancellationToken  │   │
│  │   httpx / SDK Clients  → Microsecond timestamps & token stream   │   │
│  │   SSE Event Streamer   → Live broadcast to browser UI            │   │
│  └───────────────────────┬──────────────────────────────────────────┘   │
│                           │                                             │
│  ┌────────────────────────▼──────────────────────────────────────────┐  │
│  │               VendorAdapterRegistry                                │  │
│  │                                                                    │  │
│  │  ┌──────────┐ ┌───────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ │  │
│  │  │  OpenAI  │ │ Anthropic │ │   GCP   │ │ Bedrock │ │ OpenAI-   │ │  │
│  │  │  Python  │ │  Messages │ │ Vertex  │ │  boto3  │ │ Compat    │ │  │
│  │  │   SDK    │ │    SDK    │ │aiplatfm │ │converse │ │(Groq,vLLM)│ │  │
│  │  └──────────┘ └───────────┘ └─────────┘ └─────────┘ └───────────┘ │  │
│  └────────────────────────┬──────────────────────────────────────────┘  │
│                            │                                            │
│  ┌─────────────────────────▼─────────────────────────────────────────┐  │
│  │              MetricsCollector & Token Accounting                   │  │
│  │                                                                    │  │
│  │  t_dns..t_tls               → Connection waterfall handshake time  │  │
│  │  t0 = request sent          → Client RTT baseline measured         │  │
│  │  t_first = first chunk      → TTFT / TTFA (reasoning) recorded     │  │
│  │  t_n..t_n+1 = chunk gaps    → ICL captured & normalized to ITL     │  │
│  │  stream_options.usage       → Exact token counts extracted         │  │
│  │  Fallback Tokenizer         → tiktoken / estimator if usage absent │  │
│  │  t_last = stream closed     → TTLT, E2E, exact TPOT computed       │  │
│  └─────────────────────────┬─────────────────────────────────────────┘  │
│                             │                                           │
│  ┌──────────────────────────▼────────────────────────────────────────┐  │
│  │              Statistics & Diff Engine                              │  │
│  │                                                                    │  │
│  │  numpy / statistics → P50, P75, P95, P99 for TTFT, TTFA, ITL      │  │
│  │  Goodput engine     → % requests satisfying ALL user SLO targets   │  │
│  │  Cost & Burn engine → Verified token costs vs configured budget    │  │
│  │  Run Diffing Engine → Relative delta calculations (% diff matrix)  │  │
│  └─────────────────────────┬─────────────────────────────────────────┘  │
│                             │                                           │
│  ┌──────────────────────────▼────────────────────────────────────────┐  │
│  │              ReportExporter & Collaboration Hub                    │  │
│  │                                                                    │  │
│  │  PDF Report             → ReportLab executive & technical PDF      │  │
│  │  Markdown Table         → Copy-ready summary for PRs, RFCs & Slack │  │
│  │  CSV Data Export        → Tabular latency & token telemetry        │  │
│  │  .llmark Bundle         → 1-click portable run archive             │  │
│  │  JSON Export            → Full microsecond-level raw data dump     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Data & State Layer                             │  │
│  │                                                                   │  │
│  │  SQLite (aiosqlite v1) / Postgres (v2) → run metadata & metrics   │  │
│  │  SQLAlchemy 2.0 (async)                → modern async ORM         │  │
│  │  Alembic                               → schema migrations        │  │
│  │  Ephemeral Memory Storage              → API keys scrubbed on exit│  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                  Observability Stack                              │  │
│  │                                                                   │  │
│  │  structlog              → structured JSON logs, sanitized secrets │  │
│  │  prometheus-client      → TTFT, TPS, error rate telemetry         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
llmark/
│
├── frontend/                          # React 19 + Vite + TypeScript
│   ├── src/
│   │   ├── app/                       # shadcn-admin shell, layout, routing
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui primitives
│   │   │   ├── credential-vault/      # Ephemeral in-memory masked credential inputs
│   │   │   ├── test-configurator/     # Presets (Chat, RAG, Vision, JSON), Load curves, Spend cap
│   │   │   ├── live-dashboard/        # SSE consumer, live charts, waterfall timing, abort button
│   │   │   ├── results-explorer/      # TanStack Table, cross-vendor comparison
│   │   │   ├── diff-viewer/           # Run A vs Run B visual delta comparison & overlay charts
│   │   │   └── report-viewer/         # PDF preview, Markdown copy, CSV & .llmark bundle export
│   │   ├── hooks/
│   │   │   ├── useBenchmarkSSE.ts     # SSE connection + live streaming state + abort
│   │   │   ├── useBenchmarkHistory.ts # TanStack Query history & run fetcher
│   │   │   ├── useRunDiff.ts          # Run A vs Run B comparison query
│   │   │   └── useVendorForm.ts       # React Hook Form + Zod validation
│   │   ├── lib/
│   │   │   ├── schemas/               # Zod validation schemas
│   │   │   ├── api/                   # Typed fetch, SSE wrappers & .llmark bundle importer
│   │   │   └── constants/             # Vendor models, workload presets, load curves, pricing matrices
│   │   └── pages/
│   │       ├── Benchmark.tsx          # Main run configurator, live view & cost estimator
│   │       ├── Diff.tsx               # Run A vs Run B side-by-side comparison page
│   │       ├── Results.tsx            # Historical runs & cross-model comparison
│   │       └── Report.tsx             # Single run deep-dive & multi-format export
│   ├── tailwind.config.ts             # Tailwind CSS v4
│   └── vite.config.ts
│
├── backend/                           # FastAPI + Python 3.12+
│   ├── app/
│   │   ├── main.py                    # FastAPI app, lifespan, CORS, routes
│   │   ├── cli.py                     # Headless CI Runner (`llmark run --config ... --fail-under-goodput 95`)
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── benchmark.py       # POST /run, POST /{id}/abort, GET /stream (SSE), GET /cost-estimate
│   │   │   │   ├── report.py          # GET /report/{id}/pdf, /csv, /json, /markdown, /bundle
│   │   │   │   ├── diff.py            # GET /diff?run_a={id}&run_b={id}
│   │   │   │   └── history.py         # GET /history with pagination
│   │   │   └── deps.py                # Dependencies (DB session, config)
│   │   ├── core/
│   │   │   ├── config.py              # pydantic-settings + python-dotenv
│   │   │   ├── orchestrator.py        # BenchmarkOrchestrator (Warmup, TaskGroup, A/B, Abort)
│   │   │   ├── load_generators.py     # Constant, Linear Ramp-Up, and Spike traffic curves
│   │   │   ├── cost_guard.py          # Pre-flight cost calculator & hard spend cap watcher
│   │   │   ├── waterfall_collector.py # DNS, TCP, TLS, TTFT, and Decode microsecond timers
│   │   │   ├── metrics_collector.py   # Per-token/chunk ITL/TTFT capture stream
│   │   │   ├── fallback_tokenizer.py  # Fast token estimator when upstream usage is absent
│   │   │   ├── diff_engine.py         # Run A vs Run B percentile delta & metric shift math
│   │   │   ├── statistics_engine.py   # P50/P95/P99 math, Goodput, Cost
│   │   │   └── report_exporter.py     # PDF generation, CSV builder, Markdown formatter, .llmark bundler
│   │   ├── adapters/
│   │   │   ├── base.py                # Abstract VendorAdapter (Text, Vision, Structured JSON)
│   │   │   ├── openai_adapter.py      # OpenAI + OpenRouter + Groq + Together + vLLM + DeepSeek
│   │   │   ├── anthropic_adapter.py   # Native Anthropic Messages API streaming
│   │   │   ├── gcp_adapter.py         # google-cloud-aiplatform (Vertex AI)
│   │   │   ├── bedrock_adapter.py     # boto3 converse_stream (AWS Bedrock)
│   │   │   └── registry.py            # VendorAdapterRegistry
│   │   ├── models/
│   │   │   ├── schemas.py             # Pydantic v2 request/response models
│   │   │   └── db/                    # SQLAlchemy 2.0 async ORM models
│   │   ├── db/
│   │   │   ├── session.py             # aiosqlite (v1) / asyncpg engine
│   │   │   └── migrations/            # Alembic schema versions
│   │   └── observability/
│   │       ├── logging.py             # structlog JSON config (credential sanitization)
│   │       └── metrics.py             # prometheus-client exporters
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── test_statistics_engine.py # P99 tail math, Goodput logic, cost calc, token accounting
│   │   │   ├── test_diff_engine.py       # Run A vs Run B comparison math
│   │   │   ├── test_cost_guard.py        # Pre-run estimation & budget cap cutoffs
│   │   │   ├── test_waterfall.py         # Network timing & handshake isolation
│   │   │   ├── test_tokenizers.py        # Fallback tokenizer validation
│   │   │   └── test_adapters.py          # pytest-mock — zero external API calls
│   │   └── integration/
│   │       ├── test_routes.py            # httpx TestClient route & abort tests
│   │       ├── test_cli.py               # Headless CLI regression runner tests
│   │       └── test_sse_stream.py        # SSE event sequence and live metric push validation
│   ├── pyproject.toml                    # uv-managed packaging and dependencies
│   └── Dockerfile
│
├── docker-compose.yml                    # Clean 1-command startup: frontend + backend
├── .github/
│   └── workflows/
│       ├── pr-checks.yml                 # Ruff lint, mypy, pytest on every PR
│       └── deploy.yml                    # Release artifact & container build
└── README.md
```

---

## 📊 Complete Metrics Architecture

### 🔴 Layer 1 — Latency Core & Network Waterfall
| Metric | Captured At | How |
|---|---|---|
| **DNS / TCP / TLS Waterfall** | Connection initiation | Microsecond hooks measuring network handshake latency before request body dispatch |
| **TTFT** (P50/P75/P95/P99) | First streamed chunk | `t_first_chunk - t_request_sent` (server inference prefill time) |
| **TTFA** *(Reasoning Models)* | First non-thinking chunk | `t_first_answer_chunk - t_request_sent` (isolates `<think>` / reasoning delta) |
| **Vision Prefill TTFT** | Multimodal request | `t_first_chunk - t_request_sent` on image+text payloads (measures visual encoding overhead) |
| **Structured Output Latency** | JSON Schema stream | Delta between unstructured vs schema-constrained first token generation |
| **TPOT** (Time Per Output Token) | Per request | `(t_last - t_first_chunk) / actual_output_tokens` *(via stream usage or fallback tokenizer)* |
| **ITL / ICL** (P99 + Max) | Every consecutive chunk pair | `t_n+1 - t_n` recorded in microsecond array; normalized by chunk token count for true ITL |
| **E2E / TTLT** | Stream close | `t_last - t_request_sent` |

### 🟠 Layer 2 — Workload Presets & Load Profiles
| Preset / Mode | Description & Traffic Profile |
|---|---|
| **Interactive Chat** | ~200 prompt tokens / ~150 gen tokens (UI responsiveness & streaming conversational flow) |
| **RAG Synthesis** | ~3,500 prompt tokens / ~400 gen tokens (heavy prefill with moderate output generation) |
| **Code Generation** | ~1,200 prompt tokens / ~800 gen tokens (sustained decode throughput & long token generation) |
| **Long-Context Document** | ~16k–32k prompt tokens / ~500 gen tokens (large KV cache performance & prefill degradation) |
| **Multimodal Vision** | 1080p chart image + prompt (measures vision token encoding speed & multimodal prefill) |
| **Structured JSON Schema** | Pydantic / JSON schema enforced payload (evaluates guided decoding latency penalty) |
| **Multi-Turn Conversation** | 3-turn sequential context (measures KV cache reuse hit rate and TTFT speedup) |
| **Custom Dataset / Sweep** | User-defined prompt list or JSONL file upload for domain-specific benchmark suites |
| **Load Curve: Constant** | Flat concurrency (1 → 50 parallel workers) for saturation testing |
| **Load Curve: Ramp-Up** | Linear ramp (e.g. 1 → 50 workers over 60s) to test queue elasticity and autoscaler latency |
| **Load Curve: Spike Burst** | Low baseline with sudden surges (e.g. 2 → 30 workers) to expose cold nodes and queue drops |
| **Open-Loop Mode (Poisson)** | Fixed arrival rate (e.g. 5, 10, 20 RPS) to evaluate real queueing delays under variable load |
| **A/B Head-to-Head Mode** | Simultaneous dual-model execution under identical client network conditions to eliminate time-of-day bias |
| **TPS / Decode TPS** | `total_output_tokens / total_wall_time` and `output_tokens / (t_last - t_first_chunk)` |

### 🟡 Layer 3 — Tail Latency *(Key Differentiator)*
| Metric | What It Exposes |
|---|---|
| **P95 TTFT** | High-percentile latency for real-world user requests |
| **P99 TTFT** | The worst 1% — severe prefill queueing, cold nodes, or backend rate-limiting |
| **P99 ITL** | KV cache preemption, chunked prefill stalls, network hiccups mid-stream |
| **Max ITL** | Single worst token pause in entire run (the "stream freeze" metric) |
| **Network Jitter Ratio** | Ratio of TLS handshake variance to inference TTFT variance |

> All percentiles computed via `numpy.percentile` over the raw collected microsecond arrays — **never averaged before aggregation.**

### 🟢 Layer 4 — SLO, Goodput & Cost Guard *(Business Layer)*
| Metric | Logic |
|---|---|
| **Goodput** | `% of requests where TTFT < X AND TPOT < Y AND E2E < Z` |
| **Error Rate** | `(timeouts + 429 rate limits + 5xx server errors) / total_requests` |
| **Pre-Flight Cost Estimate** | `(estimated_requests × prompt_tokens × prompt_rate) + (estimated_requests × gen_tokens × gen_rate)` |
| **Hard Budget Cap** | Real-time circuit breaker halting the benchmark if accumulated spend exceeds user ceiling (e.g. `$2.00`) |
| **Cost / 1K Tokens** | `(prompt_tokens × prompt_rate) + (gen_tokens × gen_rate)` |
| **Cost / Successful Request** | `total_run_cost / successful_requests_meeting_slo` (true ROI metric) |

### 🔵 Layer 5 — Vendor Intelligence & Diff Signals
| Signal | Detection Method |
|---|---|
| **Run Diff Matrix (A vs B)** | Relative percentage shift across TTFT, ITL, Goodput, and Cost between any two runs |
| **Prefix / KV Cache Efficiency** | Cache-Warm vs Cache-Busted nonces & multi-turn speedup to expose true prefill cost vs cache speedup |
| **Network vs Inference Isolation** | Latency waterfall separating DNS/TCP/TLS from backend provider processing time |
| **Structured Output Penalty** | Percentage latency overhead when enforcing JSON schemas vs unstructured generation |
| **Cold Start Flag** | First request TTFT > 2.5× median TTFT → flagged as cold start |
| **Rate Limit Tracking** | 429 status counter & backoff retry tracking per vendor |
| **Context Length Degradation** | Sweep prompt lengths (256 → 512 → 1K → 4K → 8K → 16K) and plot the TTFT latency curve |

---

## 🔌 Vendor Adapter Design

The adapter pattern ensures **adding a new vendor = one new class, zero changes to core engine.**

```python
# app/adapters/base.py
from abc import ABC, abstractmethod
from typing import AsyncIterator
from app.models.schemas import BenchmarkRequest, TokenEvent, VendorCredential

class VendorAdapter(ABC):
    @abstractmethod
    async def stream_completion(
        self,
        credential: VendorCredential,
        request: BenchmarkRequest
    ) -> AsyncIterator[TokenEvent]:
        """Stream tokens/chunks with microsecond timestamps, waterfall timing, and usage stats."""
        ...

# app/adapters/openai_adapter.py — covers OpenAI, vLLM, OpenRouter, Groq, Together, DeepSeek
from openai import AsyncOpenAI
import time

class OpenAICompatAdapter(VendorAdapter):
    async def stream_completion(self, credential, request):
        client = AsyncOpenAI(
            api_key=credential.api_key,
            base_url=credential.base_url  # handles external vLLM, Ollama, Groq, OpenRouter
        )
        kwargs = {
            "model": request.model,
            "messages": request.messages or [{"role": "user", "content": request.prompt}],
            "max_tokens": request.max_tokens,
            "stream": True,
            "stream_options": {"include_usage": True}  # extract verified token counts
        }
        # Structured Output JSON schema support
        if request.json_schema:
            kwargs["response_format"] = {"type": "json_object"}
            
        stream = await client.chat.completions.create(**kwargs)
        async for chunk in stream:
            t_now = time.perf_counter()
            delta = chunk.choices[0].delta.content if chunk.choices else ""
            # Extract reasoning tokens (e.g. DeepSeek R1 / o1 / o3)
            reasoning = getattr(chunk.choices[0].delta, "reasoning_content", None) if chunk.choices else None
            usage = chunk.usage if hasattr(chunk, "usage") and chunk.usage else None
            yield TokenEvent(token=delta or "", reasoning=reasoning, timestamp=t_now, usage=usage)

# app/adapters/anthropic_adapter.py — Native Anthropic Messages API (Text, Vision, System Prompts)
from anthropic import AsyncAnthropic

class AnthropicAdapter(VendorAdapter):
    async def stream_completion(self, credential, request):
        client = AsyncAnthropic(api_key=credential.api_key)
        async with client.messages.stream(
            model=request.model,
            max_tokens=request.max_tokens,
            messages=request.messages or [{"role": "user", "content": request.prompt}]
        ) as stream:
            async for text in stream.text_stream:
                t_now = time.perf_counter()
                yield TokenEvent(token=text, timestamp=t_now)
            # Final message verified usage stats
            final_msg = await stream.get_final_message()
            yield TokenEvent(token="", timestamp=time.perf_counter(), usage=final_msg.usage)

# app/adapters/gcp_adapter.py (Vertex AI / Gemini)
class GCPVertexAdapter(VendorAdapter):
    async def stream_completion(self, credential, request):
        # google-cloud-aiplatform SDK async streaming
        ...

# app/adapters/bedrock_adapter.py (AWS Bedrock)
class BedrockAdapter(VendorAdapter):
    async def stream_completion(self, credential, request):
        # boto3 converse_stream / invoke_model_with_response_stream via asyncio threadpool
        ...
```

---

## 🔄 Request Lifecycle — End to End

```
User selects Workload Preset (e.g. RAG 3.5k or Vision) & Traffic Curve (Ramp-Up)
        │
        ▼
Pre-Flight Check → GET /api/benchmark/cost-estimate (calculates token bounds & cost)
        │
        ▼
React Hook Form (Zod-validated + Spend Cap) → POST /api/benchmark/run
        │
        ▼
FastAPI route → BenchmarkOrchestrator
        │
        ├─── Credentials held in ephemeral memory only (never written to DB/disk)
        │
        ├─── Step 1: Pre-run budget check (Arms hard spend cap circuit breaker)
        │
        ├─── Step 2: Connection Waterfall profiler (DNS, TCP, TLS handshake recorded)
        │
        ├─── Step 3: Warmup requests (1-2 discarded requests to prime connection pool)
        │
        ├─── Step 4: Prompt preparation (Cache-Warm vs Cache-Bust, JSON schema, Vision image)
        │
        ├─── Step 5: Workload Execution (Constant, Linear Ramp-Up, Spike, or A/B Dual Run)
        │         via asyncio TaskGroup with CancellationToken (Supports immediate Abort & Spend Cap cutoff)
        │
        ├─── Step 6: Adapter stream → MetricsCollector records waterfall, t0, t_first (TTFT/TTFA), 
        │         chunk gaps (ICL/ITL), usage (or fallback tokenizer count), and t_last
        │
        ├─── Step 7: Live SSE endpoint /benchmark/stream → TanStack Query, live gauges, and cost tracker
        │
        ▼
Run Complete (or Aborted / Budget-Capped) → Statistics & Diff Engine
        │
        ├─── Microsecond numpy percentiles (P50/P75/P95/P99) for TTFT, TTFA, and ITL
        ├─── Goodput score against user SLO thresholds
        ├─── True Cost computed per verified input/output token counts
        ├─── Optional: Diff Matrix generated against baseline run (Run A vs Run B % deltas)
        │
        ▼
SQLite / PostgreSQL (SQLAlchemy async) → Run metadata & aggregated metrics persisted
        │
        ▼
ReportExporter & Collaboration Hub
        │
        ├─── PDF Report (ReportLab) — Executive & technical breakdown
        ├─── Markdown Table — 1-click copy for PRs, RFCs & Slack
        ├─── CSV Data Export — Tabular raw data for spreadsheet analysis
        ├─── .llmark Bundle — 1-click portable single-file archive (zero-cloud sharing)
        └─── JSON Export — Full microsecond-level raw telemetry dump
        │
        ▼
User downloads, shares, or embeds performance results in under 60 seconds
```

---

## 🧪 Testing Strategy & Headless CI Mode

```
tests/
├── unit/
│   ├── test_statistics_engine.py # P99 tail math, Goodput logic, cost calc, token accounting
│   ├── test_diff_engine.py       # Run A vs Run B comparison math and percentage shift
│   ├── test_cost_guard.py        # Pre-flight cost calculator & hard spend cap trip logic
│   ├── test_waterfall.py         # Network timing & handshake isolation
│   ├── test_metrics_collector.py # ITL/TTFT capture from mock token stream with usage chunks
│   ├── test_fallback_tokenizer.py# Token count fallback when upstream usage chunks are missing
│   └── test_adapters.py          # pytest-mock — all adapters, zero external API calls
│
└── integration/
    ├── test_benchmark_routes.py  # httpx TestClient — full route coverage + abort endpoint
    ├── test_cli.py               # Headless CLI regression runner tests & exit codes
    └── test_sse_stream.py        # SSE event sequence and live metric push validation
```

### ⚙️ Headless CLI Mode (Performance Regression Gate)
For automated CI/CD pipelines, LLMark provides a lightweight CLI runner:
```bash
# Run automated benchmark and fail if SLO Goodput is under 95%
llmark run --config benchmark.yaml --fail-under-goodput 95.0 --output summary.md
```

---

## 🐳 DevOps — One Command Setup

```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend          # Vite dev server / static build
    ports: ["5173:5173"]
    depends_on: [backend]

  backend:
    build: ./backend           # FastAPI / Uvicorn
    ports: ["8000:8000"]
    env_file: .env
    volumes:
      - ./backend/data:/app/data  # SQLite database volume
```

```bash
# Entire stack running in one command (Local-first, zero telemetry)
docker compose up
```

---

## 🚀 CI/CD Pipeline

```
PR opened
    │
    └── GitHub Actions: pr-checks.yml
            ├── uv sync (ultra-fast dependency install)
            ├── ruff check + ruff format --check
            ├── mypy (strict type checking)
            ├── pytest --asyncio-mode=auto
            └── llmark run (Optional: canary model regression check)

merge to main
    │
    └── GitHub Actions Deploy / Release
            ├── Docker multi-stage build & push
            ├── Smoke integration test suite
            └── Release artifact generation
```

---

## 💡 LLMark vs Everything Else

| Capability | LLMPerf *(archived)* | GenAI-Perf | k6/Locust | **LLMark** |
|---|---|---|---|---|
| Multi-vendor API support (OpenAI, Anthropic, GCP, Bedrock) | ✅ | ❌ NVIDIA only | ❌ | ✅ |
| External vLLM/Ollama/OpenRouter support | ❌ | ✅ | ✅ | ✅ |
| Browser UI — zero CLI required | ❌ | ❌ | ❌ | ✅ |
| P95/P99 tail latency analytics | Partial | ✅ | ❌ | ✅ |
| ITL captured per-token gap (with ICL normalization) | ❌ averaged | ✅ | ❌ | ✅ |
| Latency Waterfall (DNS/TCP/TLS vs TTFT isolation) | ❌ | ❌ | ❌ | ✅ |
| Reasoning Models (TTFT vs TTFA isolation) | ❌ | ❌ | ❌ | ✅ |
| Workload Presets (Chat, RAG, Code, Long-Context, Vision) | ❌ | ❌ | ❌ | ✅ |
| Structured Output / JSON Schema Latency Testing | ❌ | ❌ | ❌ | ✅ |
| Traffic Profiles (Constant, Ramp-Up, Spike Curves) | ❌ | Partial | ✅ | ✅ |
| Simultaneous A/B Head-to-Head Testing | ❌ | ❌ | ❌ | ✅ |
| Visual Run Diffing (Run A vs Run B Matrix) | ❌ | ❌ | ❌ | ✅ |
| Pre-Flight Cost Estimator & Hard Budget Cap | ❌ | ❌ | ❌ | ✅ |
| Warmup & Cache-Busting controls | ❌ | Partial | ❌ | ✅ |
| Run Cancellation / Immediate Abort | ❌ | ❌ | Partial | ✅ |
| Goodput / SLO thresholds | ❌ | ❌ | ❌ | ✅ |
| Multi-format Reports (PDF, Markdown Table, CSV, JSON) | ❌ | ❌ | ❌ | ✅ |
| Portable `.llmark` Single-File Bundle (Zero-Cloud Sharing) | ❌ | ❌ | ❌ | ✅ |
| Headless CI Mode (`llmark` CLI regression runner) | ✅ CLI only | ✅ CLI only | ✅ | ✅ UI + CLI |
| Live streaming results via SSE | ❌ | ❌ | Partial | ✅ |
| Ephemeral keys (zero disk/database storage) | ❌ | ❌ | N/A | ✅ |
| Local-First / Private VPC Security | ❌ | ❌ | ✅ | ✅ |
| Zero-bloat single container setup | ❌ | ❌ | ✅ | ✅ |
| Actively maintained 2026 | ❌ | ✅ | ✅ | ✅ |

---

## 📝 README Pitch

```markdown
# LLMark ⚡
> The Postman for LLM endpoints.

Benchmark any LLM vendor in 60 seconds — no CLI, no scripts, no setup.

Drop in credentials for OpenAI · Anthropic · Azure OpenAI · GCP Vertex AI ·
AWS Bedrock · OpenRouter · Groq · Together AI · DeepSeek · external vLLM / Ollama.

Select workload presets (Chat, RAG, Vision, JSON Schema, Multi-Turn), configure traffic curves 
(Constant, Ramp-Up, Spike), set pre-flight spend caps, and test cache sensitivity.
Hit Run. Watch results stream live. Download your PDF, CSV, Markdown report, or `.llmark` bundle.

## What You Get
- TTFT, TTFA (reasoning), TPOT, ITL, E2E latency — at P50/P75/P95/P99
- Network Latency Waterfall — Microsecond isolation of DNS/TCP/TLS handshake vs model inference
- Workload Presets — Chat (200 in / 150 out), RAG (3.5k in / 400 out), Code, Long-Context, Vision, and Structured JSON
- Load Curves — Flat concurrency (1 → 50 workers), Linear Ramp-Up, Spike bursts, and Poisson RPS
- Comparative Benchmarking — Simultaneous A/B Head-to-Head & historical Run Diffing matrix
- Financial Guardrails — Pre-flight cost estimator & hard spend cap circuit breaker
- Cache sensitivity testing — evaluate raw prefill vs prompt caching gains & multi-turn KV cache hit rates
- Goodput score — % of requests satisfying all your latency & error SLOs
- Graceful run cancellation — stop active benchmarks immediately to save API credits
- Multi-format exports — Executive PDF report, 1-click Markdown comparison table, CSV data, and portable `.llmark` bundles
- CI/CD Ready — Headless CLI runner (`llmark run`) for automated performance regression gates
- Ephemeral security & Local-First — API keys never written to database, disk, or logs; zero telemetry

## Streamlined Stack
Frontend: React 19 · Vite · TypeScript · Tailwind CSS v4 · shadcn/ui · Tremor Raw · TanStack Table & Query
Backend:  FastAPI · Python 3.12 · Pydantic v2 · asyncio · httpx · SQLite (v1) / Postgres · structlog · uv
```

---

**LLMark is the tool that the community built toward but never finished. You're finishing it — with a UI, with tail latency, with workload presets, with A/B testing, with cost safety, and with a report you can hand to your CTO.** Ship it.