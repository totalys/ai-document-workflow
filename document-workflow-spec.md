# Live Coding Challenge

> Fonte: https://empirical-team.notion.site/Live-Coding-Challenge-3810904e579b80738f4fe83407c0c673

## Scenario

You are building part of an **AI-enabled IP marketplace platform**.

Companies upload intellectual property documents. Those documents move through a scoring workflow that may include parsing, AI analysis, human review, and final approval.

Your task is to build a small API service that processes workflow events and keeps track of each document's current status.

Example events:

```
DOCUMENT_UPLOADED
DOCUMENT_PARSED
SCORING_STARTED
SCORING_COMPLETED
REVIEW_REQUIRED
APPROVED
FAILED
```

## Goal

Demonstrate your ability to:

- Write clean backend code
- Model simple workflow state transitions
- Handle event-driven updates
- Think about correctness and maintainability
- Explain how the API could support a frontend workflow or AI pipeline

## Your Task — Python + FastAPI

Implement a small API service that processes document workflow events.

You may use:

- FastAPI
- Plain Python
- In-memory storage

AI-assisted development workflows are allowed and encouraged. You may use AI tools to help structure or implement your solution, but you should be able to explain the code and trade-offs clearly.

### Data Model

```python
from typing import Literal, Optional

WorkflowEventType = Literal[
    "DOCUMENT_UPLOADED",
    "DOCUMENT_PARSED",
    "SCORING_STARTED",
    "SCORING_COMPLETED",
    "REVIEW_REQUIRED",
    "APPROVED",
    "FAILED",
]


class WorkflowEvent:
    company_id: str
    document_id: str
    type: WorkflowEventType
    timestamp: str
    score: Optional[float] = None
```

## Requirements

### 1. Process Events

Endpoint:

```
POST /events
```

The API receives a workflow event and updates the current status for that document.

A normal flow may look like:

```
DOCUMENT_UPLOADED
→ DOCUMENT_PARSED
→ SCORING_STARTED
→ SCORING_COMPLETED
→ APPROVED
```

A review flow may look like:

```
DOCUMENT_UPLOADED
→ DOCUMENT_PARSED
→ SCORING_STARTED
→ SCORING_COMPLETED
→ REVIEW_REQUIRED
→ APPROVED
```

### 2. Retrieve Workflows

Endpoint:

```
GET /workflows
```

Returns the current state of all document workflows.

Each workflow should include:

- company ID
- document ID
- current status
- latest score, if available
- last updated timestamp
- event history

### 3. Handle Basic Correctness

Think about:

- invalid event ordering
- duplicate events
- clear error responses

## Optional — If Time Allows

Discuss or implement:

- a simple frontend status view
- background workers
- PostgreSQL persistence
- retries
- AI scoring evaluation
- human review workflows

## What We're Evaluating

- Backend structure and code clarity
- Workflow/state modeling
- API design fundamentals
- Basic idempotency awareness
- Production-oriented thinking
- Ability to use AI effectively without losing ownership
- Communication and trade-off reasoning

## Notes

- Keep the solution practical and focused.
- You do not need authentication, databases, real LLM calls, or frontend code.
- Think aloud and explain your decisions.

## Starter Python / FastAPI

```python
from typing import Dict, List, Literal, Optional

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

WorkflowEventType = Literal[
    "DOCUMENT_UPLOADED",
    "DOCUMENT_PARSED",
    "SCORING_STARTED",
    "SCORING_COMPLETED",
    "REVIEW_REQUIRED",
    "APPROVED",
    "FAILED",
]

WorkflowStatus = Literal[
    "UPLOADED",
    "PARSED",
    "SCORING_IN_PROGRESS",
    "SCORED",
    "REVIEW_REQUIRED",
    "APPROVED",
    "FAILED",
]


class WorkflowEvent(BaseModel):
    company_id: str
    document_id: str
    type: WorkflowEventType
    timestamp: str
    score: Optional[float] = None


class DocumentWorkflow(BaseModel):
    company_id: str
    document_id: str
    status: WorkflowStatus
    updated_at: str
    score: Optional[float] = None
    history: List[WorkflowEvent] = []


workflows: Dict[str, DocumentWorkflow] = {}

# TODO:
# - Implement POST /events
# - Implement GET /workflows
# - Validate basic event ordering
# - Handle duplicate events
# - Maintain event history
# - Track score when SCORING_COMPLETED is received


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/events")
def process_event(event: WorkflowEvent):
    pass


@app.get("/workflows")
def get_workflows():
    pass
```
