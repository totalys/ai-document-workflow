"""State machine transition rules for the document workflow."""

from app.models import WorkflowEventType, WorkflowStatus

# Maps each event type to (required_current_statuses, resulting_status).
# An empty tuple for required statuses means "allowed from any state".
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
    """Validate and return the next status for a given event.

    Args:
        event_type: The incoming event type.
        current_status: The document's current status, or None if new.

    Returns:
        The resulting WorkflowStatus after the transition.

    Raises:
        TransitionError: If the transition is not allowed.
    """
    required_statuses, next_status = TRANSITION_MAP[event_type]

    # DOCUMENT_UPLOADED is the initial event — document must not exist yet.
    if event_type == "DOCUMENT_UPLOADED":
        if current_status is not None:
            raise TransitionError(
                f"Document already exists with status '{current_status}'. "
                "DOCUMENT_UPLOADED is only valid for new documents."
            )
        return next_status

    # All other events require the document to exist.
    if current_status is None:
        raise TransitionError(
            f"Document does not exist. Cannot process '{event_type}' "
            "without a prior DOCUMENT_UPLOADED event."
        )

    # FAILED is allowed from any state.
    if event_type == "FAILED":
        return next_status

    # Normal transition — current status must be in the required set.
    if current_status not in required_statuses:
        expected = " or ".join(f"'{s}'" for s in required_statuses)
        raise TransitionError(
            f"Cannot process '{event_type}' when status is '{current_status}'. "
            f"Expected current status: {expected}."
        )

    return next_status
