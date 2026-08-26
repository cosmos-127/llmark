# ⚡ LLMark Frontend Application

Modern, high-performance React 19 web application for streaming microsecond LLM benchmarking telemetry.

---

## 🛠️ Technology Stack

- **Framework:** React 19 (`react`, `react-dom`)
- **Build Tool:** Vite 6 + TypeScript 5.6
- **Styling:** Tailwind CSS v4 + `@tailwindcss/vite`
- **Charts:** Recharts (SVG rendering with high-performance time-series buffering)
- **Data Fetching & Caching:** `@tanstack/react-query` v5
- **Table Exploration:** `@tanstack/react-table` v8
- **Icons:** Lucide React

---

## 📁 Component Directory Layout

```
frontend/src/
├── app/
├── components/
│   ├── common/
│   │   └── Header.tsx               # Top navigation, status indicator & security badge
│   ├── credential-vault/
│   │   └── CredentialVault.tsx      # In-memory masked API key & Base URL inputs
│   ├── test-configurator/
│   │   └── TestConfigurator.tsx     # 6 Workload presets, traffic sliders & pre-flight cost badge
│   └── live-dashboard/
│       ├── LiveDashboard.tsx        # Main live telemetry container & instant Abort button
│       ├── MetricCards.tsx          # Glowing KPI cards (TTFT, ITL, TPS, Goodput %, Spend)
│       ├── WaterfallBar.tsx         # DNS -> TCP -> TLS -> Prefill -> Decode latency bar
│       └── StreamingChart.tsx       # Live Recharts time-series stream
├── hooks/
│   └── useBenchmarkSSE.ts           # Server-Sent Events (SSE) hook with 40-point time-series reducer
├── pages/
│   ├── BenchmarkPage.tsx            # Main benchmarking page
│   ├── DiffPage.tsx                 # Head-to-Head Run A vs Run B comparison matrix
│   └── HistoryPage.tsx              # Historical benchmark table & detailed modal inspection
├── lib/
│   ├── api.ts                       # Frontend API client
│   ├── types.ts                     # TypeScript data models matching backend schemas
│   └── utils.ts                     # Formatting helpers (formatMs, formatUsd, formatPct, cn)
├── App.tsx                          # App shell & QueryClient provider
└── index.css                        # Tailwind CSS v4 directives & custom glow animations
```

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start Vite dev server (with backend proxy to http://127.0.0.1:8000)
npm run dev

# 3. Production build & typecheck
npm run build
```
