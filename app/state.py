"""In-memory store and event application logic."""

from app.models import DocumentWorkflow, WorkflowEvent
from app.transitions import TransitionError, validate_transition

# In-memory store keyed by (company_id, document_id).
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
    """Validate a workflow event and apply it to the in-memory store.

    Args:
        event: The incoming workflow event.

    Returns:
        The updated DocumentWorkflow.

    Raises:
        TransitionError: If the transition or event is invalid.
    """
    key = (event.company_id, event.document_id)
    existing = _workflows.get(key)
    current_status = existing.status if existing else None

    # Check for duplicate events (same company+document+type already in history).
    if existing:
        for past_event in existing.history:
            if past_event.type == event.type:
                raise TransitionError(
                    f"Duplicate event: '{event.type}' was already processed "
                    f"for document '{event.document_id}'."
                )

    next_status = validate_transition(event.type, current_status)

    # Capture score from SCORING_COMPLETED events.
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
