# LLMark Frontend Application

Modern, high-performance React 19 web application for streaming microsecond LLM benchmarking telemetry, real-time waterfall latency visualization, visual head-to-head diffing, and interactive AI queuing theory guidance.

---

## Technology Stack

- **Framework:** React 19 (`react`, `react-dom`)
- **Build Tool:** Vite 6 + TypeScript 5.6
- **Styling:** Tailwind CSS v4 + `@tailwindcss/vite` + Lucide Icons
- **Animation & Transitions:** Framer Motion (`framer-motion`)
- **Charts & Visualizations:** Recharts (SVG high-frequency time-series buffering) & Tremor-inspired KPI widgets
- **Data Fetching & State:** `@tanstack/react-query` v5 + native Server-Sent Events (SSE) stream reducer
- **Math & Markdown:** KaTeX (`katex`, `rehype-katex`, `remark-math`) + React Markdown for LaTeX formula rendering

---

## Component Directory Layout

```
frontend/src/
├── App.tsx                          # App shell, navigation routing & QueryClient provider
├── index.css                        # Tailwind CSS v4 directives & custom theme glows
├── theme.css                        # Dark / Light theme tokens
│
├── components/
│   ├── admin-layout/
│   │   ├── AdminHeader.tsx          # Top navigation bar, theme toggle & status indicators
│   │   └── AppSidebar.tsx           # Sidebar navigation (Benchmark, Diff, History, Copilot)
│   │
│   ├── common/
│   │   ├── AskExpertDrawer.tsx      # Interactive AI Expert Copilot drawer with LaTeX formatting
│   │   ├── BrandLogos.tsx           # High-resolution vector logos (OpenAI, Claude, DeepSeek, Groq, etc.)
│   │   ├── Header.tsx               # Header title bar
│   │   └── MarkdownRenderer.tsx     # Rich markdown & mathematical KaTeX renderer
│   │
│   ├── credential-vault/
│   │   └── CredentialVault.tsx      # In-memory ephemeral API key & base URL manager
│   │
│   ├── test-configurator/
│   │   ├── TestConfigurator.tsx     # 16 Workload Presets, traffic curve sliders & spend guardrails
│   │   ├── GoodputSievePipeline.tsx # Interactive visual 4-stage reliability sieve
│   │   ├── LatencyWaterfallInspector.tsx # Pre-flight DNS/TCP/TLS connection breakdown
│   │   ├── VramAllocationMatrix.tsx # Live KV cache memory sizing estimator
│   │   ├── SpendTrajectoryGraph.tsx # Projected spend envelope vs Hard Spend Cap
│   │   └── WaveformSimulationGraph.tsx # Constant / Poisson / Spike load wave visualizer
│   │
│   ├── live-dashboard/
│   │   ├── LiveDashboard.tsx        # Real-time telemetry dashboard & instant Abort controller
│   │   ├── MetricCards.tsx          # Glowing KPI cards (TTFT P95, ITL P95, TPS, Goodput %, Spend)
│   │   ├── WaterfallBar.tsx         # Real-time DNS -> TCP -> TLS -> Prefill -> Decode progress bar
│   │   ├── StreamingChart.tsx       # 40-point rolling time-series chart
│   │   ├── TokenTerminal.tsx        # Live streaming token feed viewer
│   │
│   ├── tremor/                      # Metric badges, category bars & donut charts
│   └── ui/                          # Radix UI primitives (Button, Dialog, Select, Tabs, Badge, Card, etc.)
│
├── hooks/
│   └── useBenchmarkSSE.ts           # Server-Sent Events hook with rolling time-series buffer
│
├── pages/
│   ├── BenchmarkPage.tsx            # Full-page benchmarking workflow (Configure -> Stream -> Report)
│   ├── DiffPage.tsx                 # Multi-run head-to-head percentage delta matrix
│   └── HistoryPage.tsx              # Historical runs table with JSON / CSV / PDF export modals
│
└── lib/
    ├── api.ts                       # Typed Axios/Fetch API client for backend communication
    ├── types.ts                     # TypeScript data contracts mirroring Pydantic schemas
    └── utils.ts                     # Formatting helpers (formatMs, formatUsd, formatPct, cn)
```

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server (proxies API requests to http://127.0.0.1:8000)
npm run dev

# 3. Typecheck and build production bundle
npm run build
```

---

## Standalone Docker Container (Nginx)

```bash
# Build standalone Nginx frontend image
docker build -t llmark-frontend:latest --build-arg VITE_API_URL=http://localhost:8000 .

# Run standalone frontend container on port 3000
docker run -p 3000:80 llmark-frontend:latest
```

---

## Security & Privacy Notice

All vendor credentials (API keys, endpoints) entered into the **Credential Vault** are stored exclusively in client browser memory for the duration of the session. They are dispatched via ephemeral payloads for benchmark execution and are **never** persisted to disk, local storage, or server databases.

