# ── Build stage ──────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Install uv for fast, reproducible dependency installation
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy lockfile and project metadata first to leverage layer caching.
# Dependencies are only reinstalled when pyproject.toml or uv.lock change.
COPY pyproject.toml uv.lock ./

# Install production dependencies into an isolated virtualenv
RUN uv sync --frozen --no-dev --no-cache

# ── Runtime stage ─────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy only the virtualenv from the builder — no uv, no build tools
COPY --from=builder /app/.venv /app/.venv

# Copy application code and static client
COPY app/ app/
COPY client/ client/

# Put the virtualenv's bin directory first in PATH
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Railway injects $PORT at runtime; default to 8000 for local docker run
EXPOSE 8000

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
