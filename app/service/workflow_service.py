"""Business logic for the document workflow service."""

from app.models import DocumentWorkflow, WorkflowEvent
from app.repository import workflow_repository
from app.transitions import TransitionError, validate_transition


def apply_event(event: WorkflowEvent) -> DocumentWorkflow:
    """Apply a workflow event and return the updated document workflow.

    Validates the event against the state machine rules and rejects duplicates.
    On success, appends the event to the document's history and updates its status.
    The score field is updated whenever a SCORING_COMPLETED event is received.

    Args:
        event: The incoming workflow event to apply.

    Returns:
        The updated ``DocumentWorkflow`` reflecting the new status and history.

    Raises:
        TransitionError: If the event type is not allowed from the document's
            current status, if the document does not exist yet, or if the same
            event type has already been recorded for this document.
    """
    existing = workflow_repository.get(event.company_id, event.document_id)
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
        workflow = DocumentWorkflow(
            company_id=existing.company_id,
            document_id=existing.document_id,
            status=next_status,
            updated_at=event.timestamp,
            score=score,
            history=existing.history + [event],
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

    workflow_repository.save(workflow)
    return workflow


def get_workflow(company_id: str, document_id: str) -> DocumentWorkflow | None:
    """Return a single workflow, or None if not found.

    Args:
        company_id: The identifier of the company that owns the document.
        document_id: The identifier of the document.

    Returns:
        The matching ``DocumentWorkflow``, or ``None`` if no entry exists.
    """
    return workflow_repository.get(company_id, document_id)


def list_workflows() -> list[DocumentWorkflow]:
    """Return all tracked document workflows.

    Returns:
        A list of every ``DocumentWorkflow`` currently in the store.
        Returns an empty list when no events have been processed yet.
    """
    return workflow_repository.list_all()


def list_workflows_by_company(company_id: str) -> list[DocumentWorkflow]:
    """Return all workflows belonging to a given company.

    Args:
        company_id: The identifier of the company whose workflows to retrieve.

    Returns:
        A filtered list of ``DocumentWorkflow`` objects for the given company.
        Returns an empty list if the company has no tracked documents.
    """
    return workflow_repository.list_by_company(company_id)
