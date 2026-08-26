# ==========================================
# Stage 1: Build React 19 Frontend
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Python 3.12 Slim Backend
# ==========================================
FROM python:3.12-slim AS runner

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy backend definitions and install dependencies
COPY backend/pyproject.toml backend/README.md ./backend/
WORKDIR /app/backend
RUN uv pip install --system -e .

# Copy application source
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 8000

# Run Uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
