"""In-memory repository for document workflows."""

from app.models import DocumentWorkflow

_workflows: dict[tuple[str, str], DocumentWorkflow] = {}


def get_store() -> dict[tuple[str, str], DocumentWorkflow]:
    """Return the internal workflow store.

    Returns:
        The underlying dict keyed by ``(company_id, document_id)``.
        Intended for use in tests that need to inspect raw store state.
    """
    return _workflows


def clear() -> None:
    """Remove all workflows from the store.

    Intended for use in tests to reset state between test cases.
    """
    _workflows.clear()


def get(company_id: str, document_id: str) -> DocumentWorkflow | None:
    """Retrieve a single workflow by its composite key.

    Args:
        company_id: The identifier of the company that owns the document.
        document_id: The identifier of the document.

    Returns:
        The matching ``DocumentWorkflow``, or ``None`` if no entry exists
        for the given ``(company_id, document_id)`` pair.
    """
    return _workflows.get((company_id, document_id))


def save(workflow: DocumentWorkflow) -> None:
    """Persist a workflow, overwriting any existing entry for the same key.

    Args:
        workflow: The ``DocumentWorkflow`` to store. The composite key is
            derived from ``workflow.company_id`` and ``workflow.document_id``.
    """
    _workflows[(workflow.company_id, workflow.document_id)] = workflow


def list_all() -> list[DocumentWorkflow]:
    """Return all tracked document workflows.

    Returns:
        A list of every ``DocumentWorkflow`` currently in the store.
        Returns an empty list when the store is empty.
    """
    return list(_workflows.values())


def list_by_company(company_id: str) -> list[DocumentWorkflow]:
    """Return all workflows belonging to a specific company.

    Args:
        company_id: The identifier of the company whose workflows to retrieve.

    Returns:
        A filtered list of ``DocumentWorkflow`` objects for the given company.
        Returns an empty list if the company has no tracked documents.
    """
    return [w for w in _workflows.values() if w.company_id == company_id]
