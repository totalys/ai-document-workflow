# document-workflow

API service that processes document workflow events for an AI-enabled IP marketplace platform.

Companies upload intellectual property documents that move through a scoring pipeline — parsing, AI analysis, optional human review, and final approval. This service receives workflow events and maintains each document's current status and full event history.

## Table of Contents

- [Architecture](#architecture)
- [State Machine](#state-machine)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Design Decisions and Trade-offs](#design-decisions-and-trade-offs)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)

---

## Architecture

```
POST /events  -->  validate transition  -->  update in-memory store  -->  return updated workflow
GET /workflows -->  read in-memory store  -->  return all workflows
```

**Stack:**

| Layer | Technology |
|---|---|
| Framework | FastAPI + Pydantic v2 |
| Runtime | Python 3.12+ |
| Storage | In-memory (`dict`) |
| Package manager | uv |
| Lint / Format | ruff |
| Type checker | mypy |
| Tests | pytest + pytest-cov |

---

## State Machine

Each document follows a strict state machine. Invalid transitions and duplicate events return `HTTP 422`.

```
DOCUMENT_UPLOADED   -->  UPLOADED
                              |
                     DOCUMENT_PARSED
                              |
                           PARSED
                              |
                     SCORING_STARTED
                              |
                    SCORING_IN_PROGRESS
                              |
                    SCORING_COMPLETED
                              |
                           SCORED
                          /       \
              REVIEW_REQUIRED    APPROVED
                    |
                 APPROVED
```

`FAILED` is a terminal state reachable from any status.

| Event | Required current status | Resulting status |
|---|---|---|
| `DOCUMENT_UPLOADED` | _(none — new document)_ | `UPLOADED` |
| `DOCUMENT_PARSED` | `UPLOADED` | `PARSED` |
| `SCORING_STARTED` | `PARSED` | `SCORING_IN_PROGRESS` |
| `SCORING_COMPLETED` | `SCORING_IN_PROGRESS` | `SCORED` |
| `REVIEW_REQUIRED` | `SCORED` | `REVIEW_REQUIRED` |
| `APPROVED` | `SCORED` or `REVIEW_REQUIRED` | `APPROVED` |
| `FAILED` | any | `FAILED` |

---

## API Reference

### `POST /events`

Receives a workflow event and returns the updated document workflow.

**Request body**

```json
{
  "company_id": "acme",
  "document_id": "doc-001",
  "type": "DOCUMENT_UPLOADED",
  "timestamp": "2024-01-10T10:00:00Z",
  "score": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `company_id` | string | yes | Identifier of the company |
| `document_id` | string | yes | Identifier of the document |
| `type` | WorkflowEventType | yes | One of the seven event types |
| `timestamp` | string | yes | ISO 8601 timestamp |
| `score` | float \| null | no | Score value; expected on `SCORING_COMPLETED` |

**Response `200`**

```json
{
  "company_id": "acme",
  "document_id": "doc-001",
  "status": "UPLOADED",
  "updated_at": "2024-01-10T10:00:00Z",
  "score": null,
  "history": [
    {
      "company_id": "acme",
      "document_id": "doc-001",
      "type": "DOCUMENT_UPLOADED",
      "timestamp": "2024-01-10T10:00:00Z",
      "score": null
    }
  ]
}
```

**Response `422`** — invalid transition or duplicate event

```json
{
  "detail": "Cannot process 'DOCUMENT_PARSED' when status is 'SCORED'. Expected current status: 'UPLOADED'."
}
```

---

### `GET /workflows`

Returns the current state of all tracked document workflows.

**Response `200`**

```json
[
  {
    "company_id": "acme",
    "document_id": "doc-001",
    "status": "APPROVED",
    "updated_at": "2024-01-10T11:30:00Z",
    "score": 0.87,
    "history": [...]
  }
]
```

---

### `GET /health`

```json
{ "status": "ok" }
```

---

## Getting Started

**Prerequisites:** Python 3.12+ and [uv](https://docs.astral.sh/uv/).

```bash
# Install dependencies
uv sync

# Run development server (hot-reload)
uv run uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

**Example walkthrough — normal flow:**

```bash
# 1. Upload a document
curl -s -X POST http://localhost:8000/events \
  -H "Content-Type: application/json" \
  -d '{"company_id":"acme","document_id":"doc-1","type":"DOCUMENT_UPLOADED","timestamp":"2024-01-10T10:00:00Z"}'

# 2. Parse it
curl -s -X POST http://localhost:8000/events \
  -H "Content-Type: application/json" \
  -d '{"company_id":"acme","document_id":"doc-1","type":"DOCUMENT_PARSED","timestamp":"2024-01-10T10:01:00Z"}'

# 3. Run scoring
curl -s -X POST http://localhost:8000/events \
  -H "Content-Type: application/json" \
  -d '{"company_id":"acme","document_id":"doc-1","type":"SCORING_STARTED","timestamp":"2024-01-10T10:02:00Z"}'

curl -s -X POST http://localhost:8000/events \
  -H "Content-Type: application/json" \
  -d '{"company_id":"acme","document_id":"doc-1","type":"SCORING_COMPLETED","timestamp":"2024-01-10T10:03:00Z","score":0.92}'

# 4. Approve
curl -s -X POST http://localhost:8000/events \
  -H "Content-Type: application/json" \
  -d '{"company_id":"acme","document_id":"doc-1","type":"APPROVED","timestamp":"2024-01-10T10:04:00Z"}'

# 5. Check all workflows
curl -s http://localhost:8000/workflows
```

---

## Development

```bash
# Lint
uv run ruff check .

# Format check
uv run ruff format --check .

# Fix lint + format
uv run ruff check --fix . && uv run ruff format .

# Type check
uv run mypy app

# Tests with coverage
uv run pytest --cov=app --cov-report=term-missing
```

Minimum coverage for new code: **90%**.

---

## Project Structure

```
app/
  main.py          # FastAPI app — routes only, no business logic
  models.py        # Pydantic models: WorkflowEvent, DocumentWorkflow
  state.py         # In-memory store + apply_event / list_workflows
  transitions.py   # TRANSITION_MAP + validate_transition

tests/
  test_events.py       # POST /events — happy paths and error cases
  test_workflows.py    # GET /workflows — response shape and history
  test_transitions.py  # State machine edge cases (duplicates, bad order)
```

---

## Design Decisions and Trade-offs

**In-memory storage:** Chosen for simplicity and to keep the focus on the state machine logic. The store is a plain `dict[str, DocumentWorkflow]` keyed by `document_id`. All reads and writes are synchronous — no locking needed for a single-process server.

**Strict state machine via `TRANSITION_MAP`:** All valid transitions are declared in one place (`transitions.py`). Adding a new event type requires a single line. The function `validate_transition` enforces invariants and raises `TransitionError`, which the route converts to `HTTP 422`.

**Duplicate detection:** A duplicate event is one that would result in the same `(document_id, type)` combination already present in the history. It is rejected with `HTTP 422` to ensure idempotency at the application level.

**`DOCUMENT_UPLOADED` starts a new document:** Sending `DOCUMENT_UPLOADED` for an existing document is treated as an error rather than a re-upload, keeping the history append-only.

**`score` propagation:** The score is captured when `SCORING_COMPLETED` is received and carried forward in `DocumentWorkflow.score` for quick access, without discarding the original event.

---

## Deployment

The project is deployed on [Railway](https://railway.app) as a single service that serves both the API and the web client from the same origin.

### Architecture

```
GitHub (main branch)
        │
        │  push
        ▼
  Railway CI/CD
        │
        │  nixpacks build
        ▼
  Python 3.12 container
        │
        │  Procfile start command
        ▼
  uvicorn app.main:app
        │
        ├──  /events, /workflows, /health  →  FastAPI routes
        └──  /*                            →  StaticFiles (client/)
```

API and frontend run in the same process on the same port. No CORS configuration is required.

### Files

| File | Purpose |
|---|---|
| `Procfile` | Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| `requirements.txt` | Production dependencies exported from `uv` (used by Nixpacks) |
| `app/main.py` | Mounts `client/` as `StaticFiles` at `/` after all API routes |

### Continuous Deployment

Railway is connected to the GitHub repository via the Railway GitHub App. Every push to the `main` branch triggers an automatic deploy:

```
git push origin main
        │
        ▼
  GitHub webhook  →  Railway detects new commit
        │
        ▼
  Nixpacks build
    - detects requirements.txt + pyproject.toml
    - installs Python 3.12
    - pip install -r requirements.txt
        │
        ▼
  Container starts
    - Procfile: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    - Railway injects $PORT automatically
        │
        ▼
  Zero-downtime swap  →  new container goes live
```

No manual steps are required after merging to `main`. Railway keeps the previous deployment available as a rollback target in the dashboard.

### Environment Variables

| Variable | Set by | Description |
|---|---|---|
| `PORT` | Railway (automatic) | Port uvicorn binds to |

No application secrets are required for the current in-memory configuration.

### Local vs Production

| Aspect | Local | Railway |
|---|---|---|
| Start command | `uv run uvicorn app.main:app --reload` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Port | 8000 | Assigned by Railway (typically 8080) |
| Hot reload | Yes (`--reload`) | No |
| Storage | In-memory, reset on restart | In-memory, reset on each deploy |

---

## Future Improvements

| Area | Description |
|---|---|
| **Persistence** | Replace in-memory dict with PostgreSQL (SQLAlchemy + Alembic) for durability and horizontal scaling |
| **Idempotency keys** | Accept a client-supplied `event_id` and use it for true at-least-once delivery deduplication |
| **Background workers** | Offload AI scoring to a task queue (Celery / ARQ) and push progress events back via webhooks or SSE |
| **Authentication** | Add JWT/API-key middleware; scope `GET /workflows` to `company_id` |
| **Pagination** | Add cursor-based pagination to `GET /workflows` for large datasets |
| **Frontend** | Real-time status board using Server-Sent Events or WebSockets |
| **Retries** | Configurable retry policy on `FAILED` documents with back-off |
| **AI scoring evaluation** | Hook `SCORING_COMPLETED` to an LLM-based evaluation step before the score is accepted |
