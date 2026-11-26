"""Pydantic models for the document workflow API."""

from typing import Literal

from pydantic import BaseModel

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
    """An event that moves a document through the workflow."""

    company_id: str
    document_id: str
    type: WorkflowEventType
    timestamp: str  # ISO-8601 string
    score: float | None = None


class DocumentWorkflow(BaseModel):
    """Current state of a document in the workflow."""

    company_id: str
    document_id: str
    status: WorkflowStatus
    updated_at: str
    score: float | None = None
    history: list[WorkflowEvent] = []
