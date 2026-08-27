# 🐳 LLMark Docker Reference

This document covers all Docker configurations in the monorepo, when to use each, and how to build, run, and deploy them.

---

## 📂 Dockerfile Overview

| File | Purpose | Context |
| :--- | :--- | :--- |
| [`Dockerfile`](./Dockerfile) | **Monolith** – builds React 19 frontend and embeds the static bundle inside the FastAPI container. Single container, single URL. | Production (single-service PaaS) |
| [`backend/Dockerfile`](./backend/Dockerfile) | **Standalone Python/FastAPI API** – no frontend assets included. Used with a separate frontend deployment (Netlify) or `docker-compose`. | Production (split-deployment) |
| [`frontend/Dockerfile`](./frontend/Dockerfile) | **Standalone Nginx frontend** – multi-stage build (Node 22 builder → nginx:alpine runner). Accepts `VITE_API_URL` build-arg to point at backend. | Production (split-deployment) |
| [`docker-compose.yml`](./docker-compose.yml) | **Orchestrator** – launches `backend` + `frontend` together locally with health checks. | Local development / self-hosted |

---

## 1️⃣ Monolith Container (`Dockerfile`)

> **Best for:** Render.com (single Web Service), simple single-URL deployment.

React 19 frontend is built in Stage 1 and its `dist/` is copied into the FastAPI container. FastAPI mounts the `dist/` directory at `/` and serves it as static files, while all `/api/*` routes are handled by FastAPI.

```
┌─────────────────────────────────────┐
│   Docker Container (port 8000)      │
│                                     │
│   FastAPI + Uvicorn                 │
│   ├── /api/*  → Python routes       │
│   ├── /health → health probe        │
│   └── /*      → React 19 SPA       │
└─────────────────────────────────────┘
```

### Build & Run

```bash
# Build monolith image
docker build -t llmark:latest .

# Run (port 8000)
docker run -p 8000:8000 llmark:latest

# With optional environment variables
docker run -p 8000:8000 \
  -e GROQ_API_KEY=your_key \
  -e BACKEND_CORS_ORIGINS="*" \
  llmark:latest
```

### Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | Port Uvicorn binds to (auto-injected by Render, Railway, Fly.io) |
| `BACKEND_CORS_ORIGINS` | `*` | Allowed CORS origins |
| `GROQ_API_KEY` | *(empty)* | Groq key for AI Expert Copilot |
| `DATABASE_URL` | `sqlite+aiosqlite:///llmark.db` | SQLite database path |
| `DEBUG` | `false` | Enable verbose error details |

---

## 2️⃣ Standalone Backend (`backend/Dockerfile`)

> **Best for:** Render.com Backend Web Service when frontend is on Netlify.

Pure FastAPI/Uvicorn container. No frontend assets are embedded. CORS must be configured to allow requests from your Netlify domain.

```
┌─────────────────────────────────────┐
│   backend/Dockerfile (port 8000)    │
│                                     │
│   FastAPI + Uvicorn                 │
│   ├── /api/*  → Python routes       │
│   └── /health → health probe        │
└─────────────────────────────────────┘
```

### Build & Run

```bash
# Build from backend/ directory
docker build -t llmark-backend:latest -f backend/Dockerfile backend/

# Run (port 8000)
docker run -p 8000:8000 \
  -e BACKEND_CORS_ORIGINS="https://your-app.netlify.app" \
  llmark-backend:latest

# With Groq key
docker run -p 8000:8000 \
  -e BACKEND_CORS_ORIGINS="*" \
  -e GROQ_API_KEY=your_key \
  llmark-backend:latest
```

### Environment Variables

Same as Monolith — `PORT`, `BACKEND_CORS_ORIGINS`, `GROQ_API_KEY`, `DATABASE_URL`, `DEBUG`.

---

## 3️⃣ Standalone Frontend (`frontend/Dockerfile`)

> **Best for:** Local docker-compose or self-hosted Nginx; Netlify handles this automatically for cloud deployments.

Two-stage build: **Stage 1** uses `node:22-alpine` to run `npm ci` + `npm run build`, producing `dist/`. **Stage 2** copies `dist/` into an `nginx:alpine` container with a production-tuned Nginx config ([`frontend/nginx.conf`](./frontend/nginx.conf)).

```
┌─────────────────────────────────────┐
│   frontend/Dockerfile (port 80)     │
│                                     │
│   nginx:alpine                      │
│   ├── /* → React 19 SPA (dist/)    │
│   └── /health → 200 JSON probe      │
└─────────────────────────────────────┘
```

The **`VITE_API_URL`** build argument is baked into the JavaScript bundle at build time via Vite's `import.meta.env.VITE_API_URL`. This tells the frontend where to send all `/api/*` requests.

### Build & Run

```bash
# Build with VITE_API_URL pointing at your backend
docker build -t llmark-frontend:latest \
  --build-arg VITE_API_URL=http://localhost:8000 \
  -f frontend/Dockerfile frontend/

# Run on port 3000
docker run -p 3000:80 llmark-frontend:latest
```

> [!IMPORTANT]
> `VITE_API_URL` is a **build-time** argument (not a runtime env var). You must rebuild the image when your backend URL changes. For Netlify, set it as an environment variable in the Netlify dashboard — it is injected automatically at build time.

---

## 4️⃣ Docker Compose (Multi-Container Local Development)

> **Best for:** Running both containers together locally or on a self-hosted VPS.

[`docker-compose.yml`](./docker-compose.yml) launches:
- **`backend`** service from `backend/Dockerfile` → port `8000`
- **`frontend`** service from `frontend/Dockerfile` → port `3000`, waits for backend health check

```bash
# Start both containers
docker compose up --build

# Start in detached (background) mode
docker compose up -d --build

# Stop and remove containers
docker compose down

# View logs
docker compose logs -f
```

- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Swagger Docs**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 🏗️ Architecture Comparison

```
MODE 1: Monolith (Dockerfile)                MODE 2: Split (docker-compose / Netlify+Render)
─────────────────────────────                ─────────────────────────────────────────────────
                                              Netlify CDN (edge, 0ms)
Internet ──→ :8000                            ┌─────────────────────────┐
             │                                │  frontend/Dockerfile    │
   FastAPI/Uvicorn                            │  nginx:alpine           │
   ├── /* React SPA                           │  React 19 SPA           │
   └── /api/* Python API                      └──────────┬──────────────┘
                                                         │ VITE_API_URL
                                              ┌──────────▼──────────────┐
                                              │  backend/Dockerfile     │
                                              │  FastAPI/Uvicorn :8000  │
                                              └─────────────────────────┘
```

| | Monolith | Split |
| :--- | :---: | :---: |
| **Cold start affects UI?** | Yes | **No** — UI loads from CDN |
| **CORS configuration** | Not needed | Required |
| **Number of deployments** | 1 | 2 |
| **Local setup** | `docker run` | `docker compose up` |
| **Render.com** | 1 Web Service | 1 Web Service (backend only) |
| **Netlify** | Not used | 1 Site (frontend) |

---

## 🔁 Render Deployment (`render.yaml`)

The [`render.yaml`](./render.yaml) Blueprint deploys the **monolith** `Dockerfile` as a single Render Web Service. To deploy the standalone backend instead, change the `dockerfilePath` field in `render.yaml`:

```yaml
# Monolith (default):
dockerfilePath: ./Dockerfile

# Standalone backend only:
dockerfilePath: ./backend/Dockerfile
```

---

## 📋 Quick Reference

```bash
# ── Monolith ────────────────────────────────────────────────────────────────
docker build -t llmark .
docker run -p 8000:8000 llmark

# ── Backend only ─────────────────────────────────────────────────────────────
docker build -t llmark-backend -f backend/Dockerfile backend/
docker run -p 8000:8000 llmark-backend

# ── Frontend only ─────────────────────────────────────────────────────────────
docker build -t llmark-frontend --build-arg VITE_API_URL=http://localhost:8000 -f frontend/Dockerfile frontend/
docker run -p 3000:80 llmark-frontend

# ── Both containers via Compose ───────────────────────────────────────────────
docker compose up --build
```
