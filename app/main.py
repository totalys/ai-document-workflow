"""FastAPI application for the document workflow service."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from app.models import DocumentWorkflow, WorkflowEvent
from app.state import (
    apply_event,
    get_workflow,
    list_workflows,
    list_workflows_by_company,
)
from app.transitions import TransitionError

app = FastAPI(title="Document Workflow API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/events", response_model=DocumentWorkflow, status_code=200)
def post_event(event: WorkflowEvent) -> DocumentWorkflow:
    """Receive a workflow event and return the updated workflow."""
    try:
        return apply_event(event)
    except TransitionError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc


@app.get("/workflows", response_model=list[DocumentWorkflow])
def get_workflows() -> list[DocumentWorkflow]:
    """Return all tracked document workflows."""
    return list_workflows()


@app.get("/workflows/{company_id}", response_model=list[DocumentWorkflow])
def get_workflows_by_company(company_id: str) -> list[DocumentWorkflow]:
    """Return all workflows for a given company."""
    return list_workflows_by_company(company_id)


@app.get(
    "/workflows/{company_id}/{document_id}/history",
    response_model=list[WorkflowEvent],
)
def get_document_history(company_id: str, document_id: str) -> list[WorkflowEvent]:
    """Return the full event history for a document belonging to a company."""
    workflow = get_workflow(company_id, document_id)
    if workflow is None:
        raise HTTPException(
            status_code=404,
            detail=f"Document '{document_id}' not found for company '{company_id}'.",
        )
    return workflow.history


# Serve the frontend client — must be the last mount (catches all unmatched routes).
_client_dir = Path(__file__).resolve().parent.parent / "client"
if _client_dir.exists():
    app.mount("/", StaticFiles(directory=_client_dir, html=True), name="client")
