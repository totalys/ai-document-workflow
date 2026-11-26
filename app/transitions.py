"""State machine transition rules for the document workflow."""

from app.models import WorkflowEventType, WorkflowStatus

TRANSITION_MAP: dict[
    WorkflowEventType, tuple[tuple[WorkflowStatus, ...], WorkflowStatus]
] = {
    "DOCUMENT_UPLOADED": ((), "UPLOADED"),
    "DOCUMENT_PARSED": (("UPLOADED",), "PARSED"),
    "SCORING_STARTED": (("PARSED",), "SCORING_IN_PROGRESS"),
    "SCORING_COMPLETED": (("SCORING_IN_PROGRESS",), "SCORED"),
    "REVIEW_REQUIRED": (("SCORED",), "REVIEW_REQUIRED"),
    "APPROVED": (("SCORED", "REVIEW_REQUIRED"), "APPROVED"),
    "FAILED": ((), "FAILED"),
}


class TransitionError(Exception):
    """Raised when a workflow transition is invalid."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def validate_transition(
    event_type: WorkflowEventType,
    current_status: WorkflowStatus | None,
) -> WorkflowStatus:
    """Return the resulting status for an event, or raise if the transition is invalid.

    Enforces the state machine rules declared in TRANSITION_MAP. Callers should
    catch TransitionError and surface it as an HTTP 422 response.

    Args:
        event_type: The event being applied to the document.
        current_status: The document's current status, or None if the document
            does not yet exist in the store.

    Returns:
        The WorkflowStatus the document will transition to.

    Raises:
        TransitionError: If the event is not allowed from the current status,
            if the document does not exist when required, or if
            DOCUMENT_UPLOADED is sent for an already-existing document.
    """
    required_statuses, next_status = TRANSITION_MAP[event_type]

    if event_type == "DOCUMENT_UPLOADED":
        if current_status is not None:
            raise TransitionError(
                f"Document already exists with status '{current_status}'. "
                "DOCUMENT_UPLOADED is only valid for new documents."
            )
        return next_status

    if current_status is None:
        raise TransitionError(
            f"Document does not exist. Cannot process '{event_type}' "
            "without a prior DOCUMENT_UPLOADED event."
        )

    if event_type == "FAILED":
        return next_status

    if current_status not in required_statuses:
        expected = " or ".join(f"'{s}'" for s in required_statuses)
        raise TransitionError(
            f"Cannot process '{event_type}' when status is '{current_status}'. "
            f"Expected current status: {expected}."
        )

    return next_status
