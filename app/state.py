"""In-memory store and event application logic."""

from app.models import DocumentWorkflow, WorkflowEvent
from app.transitions import TransitionError, validate_transition

_workflows: dict[tuple[str, str], DocumentWorkflow] = {}


def get_store() -> dict[tuple[str, str], DocumentWorkflow]:
    """Return the internal workflow store (useful for testing)."""
    return _workflows


def clear_store() -> None:
    """Clear all workflows (useful for testing)."""
    _workflows.clear()


def list_workflows() -> list[DocumentWorkflow]:
    """Return all tracked document workflows."""
    return list(_workflows.values())


def list_workflows_by_company(company_id: str) -> list[DocumentWorkflow]:
    """Return all workflows belonging to a given company."""
    return [w for w in _workflows.values() if w.company_id == company_id]


def get_workflow(company_id: str, document_id: str) -> DocumentWorkflow | None:
    """Return a single workflow, or None if not found."""
    return _workflows.get((company_id, document_id))


def apply_event(event: WorkflowEvent) -> DocumentWorkflow:
    """Apply a workflow event to the store and return the updated document workflow.

    Validates the event against the state machine rules and rejects duplicates.
    On success, appends the event to the document's history and updates its status.
    The score field is updated whenever a SCORING_COMPLETED event is received.

    Args:
        event: The incoming workflow event to apply.

    Returns:
        The updated DocumentWorkflow reflecting the new status and history.

    Raises:
        TransitionError: If the event type is not allowed from the document's
            current status, if the document does not exist yet, or if the same
            event type has already been recorded for this document.
    """
    key = (event.company_id, event.document_id)
    existing = _workflows.get(key)
    current_status = existing.status if existing else None

    if existing:
        for past_event in existing.history:
            if past_event.type == event.type:
                raise TransitionError(
                    f"Duplicate event: '{event.type}' was already processed "
                    f"for document '{event.document_id}'."
                )

    next_status = validate_transition(event.type, current_status)

    score = existing.score if existing else None
    if event.type == "SCORING_COMPLETED":
        score = event.score

    if existing:
        history = existing.history + [event]
        workflow = DocumentWorkflow(
            company_id=existing.company_id,
            document_id=existing.document_id,
            status=next_status,
            updated_at=event.timestamp,
            score=score,
            history=history,
        )
    else:
        workflow = DocumentWorkflow(
            company_id=event.company_id,
            document_id=event.document_id,
            status=next_status,
            updated_at=event.timestamp,
            score=score,
            history=[event],
        )

    _workflows[key] = workflow
    return workflow
