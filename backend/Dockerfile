# ==========================================
# LLMark Backend - Standalone Dockerfile
# Python 3.12 Slim + uv Package Manager
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

# Copy backend definition and install dependencies
COPY pyproject.toml README.md ./
RUN uv pip install --system -e .

# Copy backend application source
COPY . ./

EXPOSE 8000

# Run Uvicorn server dynamically binding to $PORT (compatible with Render, Railway, Fly.io)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
