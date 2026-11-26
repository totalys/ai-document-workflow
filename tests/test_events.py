"""Integration tests for POST /events endpoint."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.repository import workflow_repository


@pytest.fixture(autouse=True)
def _reset_store() -> None:  # type: ignore[misc]
    """Clear the in-memory store before each test."""
    workflow_repository.clear()


client = TestClient(app)

TIMESTAMP = "2026-01-15T10:00:00Z"


def _make_event(
    event_type: str,
    document_id: str = "doc-1",
    company_id: str = "company-1",
    score: float | None = None,
) -> dict:
    payload: dict = {
        "company_id": company_id,
        "document_id": document_id,
        "type": event_type,
        "timestamp": TIMESTAMP,
    }
    if score is not None:
        payload["score"] = score
    return payload


class TestPostEvents:
    """Happy-path tests for POST /events."""

    def test_upload_new_document(self) -> None:
        resp = client.post("/events", json=_make_event("DOCUMENT_UPLOADED"))
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "UPLOADED"
        assert body["document_id"] == "doc-1"
        assert body["company_id"] == "company-1"
        assert body["updated_at"] == TIMESTAMP
        assert len(body["history"]) == 1

    def test_full_happy_path(self) -> None:
        events = [
            _make_event("DOCUMENT_UPLOADED"),
            _make_event("DOCUMENT_PARSED"),
            _make_event("SCORING_STARTED"),
            _make_event("SCORING_COMPLETED", score=0.95),
            _make_event("REVIEW_REQUIRED"),
            _make_event("APPROVED"),
        ]
        for ev in events:
            resp = client.post("/events", json=ev)
            assert resp.status_code == 200

        body = resp.json()
        assert body["status"] == "APPROVED"
        assert body["score"] == 0.95
        assert len(body["history"]) == 6

    def test_scoring_completed_captures_score(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED"))
        client.post("/events", json=_make_event("DOCUMENT_PARSED"))
        client.post("/events", json=_make_event("SCORING_STARTED"))
        resp = client.post("/events", json=_make_event("SCORING_COMPLETED", score=0.78))
        assert resp.status_code == 200
        assert resp.json()["score"] == 0.78

    def test_approved_directly_from_scored(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED"))
        client.post("/events", json=_make_event("DOCUMENT_PARSED"))
        client.post("/events", json=_make_event("SCORING_STARTED"))
        client.post("/events", json=_make_event("SCORING_COMPLETED", score=0.5))
        resp = client.post("/events", json=_make_event("APPROVED"))
        assert resp.status_code == 200
        assert resp.json()["status"] == "APPROVED"

    def test_failed_from_any_state(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED"))
        resp = client.post("/events", json=_make_event("FAILED"))
        assert resp.status_code == 200
        assert resp.json()["status"] == "FAILED"


class TestCrossCompanyIsolation:
    """Same document_id under different companies must be independent."""

    def test_same_document_id_different_companies(self) -> None:
        resp_a = client.post(
            "/events", json=_make_event("DOCUMENT_UPLOADED", company_id="company-A")
        )
        resp_b = client.post(
            "/events", json=_make_event("DOCUMENT_UPLOADED", company_id="company-B")
        )
        assert resp_a.status_code == 200
        assert resp_b.status_code == 200

    def test_duplicate_across_companies_is_allowed(self) -> None:
        client.post(
            "/events", json=_make_event("DOCUMENT_UPLOADED", company_id="company-A")
        )
        client.post(
            "/events", json=_make_event("DOCUMENT_PARSED", company_id="company-A")
        )
        # company-B starts fresh with the same document_id
        resp = client.post(
            "/events", json=_make_event("DOCUMENT_UPLOADED", company_id="company-B")
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "UPLOADED"


class TestPostEventsErrors:
    """Error cases for POST /events."""

    def test_invalid_event_type_returns_422(self) -> None:
        payload = _make_event("DOCUMENT_UPLOADED")
        payload["type"] = "INVALID_TYPE"
        resp = client.post("/events", json=payload)
        assert resp.status_code == 422

    def test_upload_existing_document_returns_422(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED"))
        resp = client.post("/events", json=_make_event("DOCUMENT_UPLOADED"))
        assert resp.status_code == 422
        assert "already" in resp.json()["detail"].lower()

    def test_invalid_transition_returns_422(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED"))
        resp = client.post("/events", json=_make_event("SCORING_STARTED"))
        assert resp.status_code == 422
        assert "Cannot process" in resp.json()["detail"]

    def test_duplicate_event_returns_422(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED"))
        client.post("/events", json=_make_event("DOCUMENT_PARSED"))
        resp = client.post("/events", json=_make_event("DOCUMENT_PARSED"))
        assert resp.status_code == 422
        assert "Duplicate" in resp.json()["detail"]

    def test_event_on_nonexistent_document_returns_422(self) -> None:
        resp = client.post("/events", json=_make_event("DOCUMENT_PARSED"))
        assert resp.status_code == 422
        assert "does not exist" in resp.json()["detail"]
