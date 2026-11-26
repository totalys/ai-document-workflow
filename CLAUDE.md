# document-workflow

API service in Python/FastAPI that processes document workflow events for an AI-enabled IP marketplace platform.

## Stack

- Python 3.12+
- FastAPI + Pydantic v2
- pytest + pytest-cov (tests)
- ruff (lint + format)
- uv (package/venv management)

## Setup

```bash
uv sync
```

## Commands

| Action       | Command                                                |
|--------------|--------------------------------------------------------|
| Run dev      | `uv run uvicorn app.main:app --reload`                 |
| Lint         | `uv run ruff check .`                                  |
| Format check | `uv run ruff format --check .`                         |
| Format fix   | `uv run ruff format .`                                 |
| Lint fix     | `uv run ruff check --fix .`                            |
| Type check   | `uv run mypy app`                                      |
| Tests        | `uv run pytest`                                        |
| Coverage     | `uv run pytest --cov=app --cov-report=term-missing`    |

Minimum coverage for new code: **90%**.

## Project structure

```
app/
  main.py          # FastAPI app and routes
  models.py        # Pydantic models (WorkflowEvent, DocumentWorkflow)
  state.py         # In-memory store and state transition logic
  transitions.py   # Allowed event -> status transitions + validation rules
tests/
  test_events.py      # POST /events — happy paths and error cases
  test_workflows.py   # GET /workflows — response shape and history
  test_transitions.py # State machine edge cases (duplicates, invalid order)
```

## State machine

```
DOCUMENT_UPLOADED   -> UPLOADED
DOCUMENT_PARSED     -> PARSED              (requires UPLOADED)
SCORING_STARTED     -> SCORING_IN_PROGRESS (requires PARSED)
SCORING_COMPLETED   -> SCORED              (requires SCORING_IN_PROGRESS)
REVIEW_REQUIRED     -> REVIEW_REQUIRED     (requires SCORED)
APPROVED            -> APPROVED            (requires SCORED or REVIEW_REQUIRED)
FAILED              -> FAILED              (any state)
```

Invalid transitions and duplicate events must return HTTP 422 with a clear message.

## Multi-agent workflow

Non-trivial tasks follow: **orchestrator -> coder -> reviewer -> tester**.

Agent specs: `C:\Users\Tiago\.claude\agents\`
Work artifacts: `.claude/work/` (spec, coder reports, review, test report)

### How to invoke

```
Use agent: orchestrator
Task: <description of what to build or fix>
Spec: document-workflow-spec.md
```

The orchestrator will:
1. Write `.claude/work/spec.md` with goal and acceptance criteria.
2. Spawn one or more `coder` agents (parallel when files do not overlap).
3. Run `reviewer` (receives only spec + diff, never coder reasoning).
4. Run `tester` (runs full suite, writes `.claude/work/test-report.md`).
5. Iterate up to 3 cycles on reviewer findings before escalating.

### Trivial tasks (typo, one-liner)

Skip the full workflow — apply directly with the `coder` agent or inline.

## Code style conventions

- **No inline comments.** Code must be readable without them. Inline comments are allowed only when explaining a non-obvious external constraint (e.g. a known library bug, a regulatory requirement, or a deliberately counter-intuitive value).
- **Docstrings on every public function, method, and class.** Use Google-style docstrings (`Args:`, `Returns:`, `Raises:`). Docstrings must describe intent and contract from the caller's perspective — not restate what the code does line by line.
- **Private/internal helpers** (`_` prefix) do not require docstrings unless their contract is non-obvious.

## Lint and test rules for agents

- **coder**: after every change run `uv run ruff check --fix . && uv run ruff format . && uv run pytest`; fix anything that breaks before writing the report.
- **tester**: run `uv run pytest --cov=app --cov-report=term-missing`; fail the report if coverage of changed files drops below 90%.
- **reviewer**: run `uv run ruff check .` and `uv run mypy app` to confirm static analysis is clean before writing the verdict.
- Tests must be deterministic — no real time, no network, no external I/O.
