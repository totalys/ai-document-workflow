"""FastAPI application for the document workflow service."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from app.models import DocumentWorkflow, WorkflowEvent
from app.service.workflow_service import (
    apply_event,
    get_workflow,
    list_workflows,
    list_workflows_by_company,
)
from app.transitions import TransitionError

app = FastAPI(title="Document Workflow API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    """Return the service liveness status.

    Returns:
        A dict with a single key ``status`` set to ``"ok"``.
    """
    return {"status": "ok"}


@app.post("/events", response_model=DocumentWorkflow, status_code=200)
def post_event(event: WorkflowEvent) -> DocumentWorkflow:
    """Apply a workflow event and return the updated document workflow.

    Validates the event against the state machine rules and persists it
    to the in-memory store. The first event for a document must be
    ``DOCUMENT_UPLOADED``; subsequent events must follow the allowed
    transition sequence. Duplicate event types for the same document are
    rejected.

    Args:
        event: The incoming workflow event to apply.

    Returns:
        The full ``DocumentWorkflow`` after the event has been applied,
        including the updated status and the complete event history.

    Raises:
        HTTPException: 422 if the transition is invalid, the document does
            not exist yet (and the event is not ``DOCUMENT_UPLOADED``), or
            the same event type has already been recorded for this document.
    """
    try:
        return apply_event(event)
    except TransitionError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc


@app.get("/workflows", response_model=list[DocumentWorkflow])
def get_workflows() -> list[DocumentWorkflow]:
    """Return the current state of all tracked document workflows.

    Returns:
        A list of ``DocumentWorkflow`` objects, one per document that has
        received at least one event. Returns an empty list when no events
        have been processed yet.
    """
    return list_workflows()


@app.get("/workflows/{company_id}", response_model=list[DocumentWorkflow])
def get_workflows_by_company(company_id: str) -> list[DocumentWorkflow]:
    """Return all workflows belonging to a specific company.

    Args:
        company_id: The identifier of the company whose workflows to retrieve.

    Returns:
        A list of ``DocumentWorkflow`` objects for the given company.
        Returns an empty list if the company has no tracked documents.
    """
    return list_workflows_by_company(company_id)


@app.get(
    "/workflows/{company_id}/{document_id}/history",
    response_model=list[WorkflowEvent],
)
def get_document_history(company_id: str, document_id: str) -> list[WorkflowEvent]:
    """Return the full event history for a specific document.

    Events are returned in the order they were applied (oldest first).

    Args:
        company_id: The identifier of the company that owns the document.
        document_id: The identifier of the document.

    Returns:
        An ordered list of ``WorkflowEvent`` objects representing every
        event applied to the document since its creation.

    Raises:
        HTTPException: 404 if no document with the given ``document_id``
            exists under ``company_id``.
    """
    workflow = get_workflow(company_id, document_id)
    if workflow is None:
        raise HTTPException(
            status_code=404,
            detail=f"Document '{document_id}' not found for company '{company_id}'.",
        )
    return workflow.history


_client_dir = Path(__file__).resolve().parent.parent / "client"
if _client_dir.exists():
    app.mount("/", StaticFiles(directory=_client_dir, html=True), name="client")
