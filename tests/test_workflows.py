"""Integration tests for GET /workflows endpoint."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.state import clear_store


@pytest.fixture(autouse=True)
def _reset_store() -> None:  # type: ignore[misc]
    """Clear the in-memory store before each test."""
    clear_store()


client = TestClient(app)

TIMESTAMP = "2026-01-15T10:00:00Z"


def _make_event(
    event_type: str,
    document_id: str = "doc-1",
    company_id: str = "company-1",
) -> dict:
    return {
        "company_id": company_id,
        "document_id": document_id,
        "type": event_type,
        "timestamp": TIMESTAMP,
    }


class TestGetWorkflows:
    """Tests for GET /workflows."""

    def test_empty_store_returns_empty_list(self) -> None:
        resp = client.get("/workflows")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_single_workflow(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED"))
        resp = client.get("/workflows")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["document_id"] == "doc-1"
        assert data[0]["status"] == "UPLOADED"

    def test_multiple_documents(self) -> None:
        client.post(
            "/events",
            json=_make_event("DOCUMENT_UPLOADED", document_id="doc-1"),
        )
        client.post(
            "/events",
            json=_make_event("DOCUMENT_UPLOADED", document_id="doc-2"),
        )
        resp = client.get("/workflows")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        doc_ids = {d["document_id"] for d in data}
        assert doc_ids == {"doc-1", "doc-2"}

    def test_workflow_history_is_ordered(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED"))
        client.post("/events", json=_make_event("DOCUMENT_PARSED"))
        resp = client.get("/workflows")
        data = resp.json()
        history = data[0]["history"]
        assert len(history) == 2
        assert history[0]["type"] == "DOCUMENT_UPLOADED"
        assert history[1]["type"] == "DOCUMENT_PARSED"

    def test_workflow_contains_score(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED"))
        client.post("/events", json=_make_event("DOCUMENT_PARSED"))
        client.post("/events", json=_make_event("SCORING_STARTED"))
        event = _make_event("SCORING_COMPLETED")
        event["score"] = 0.88
        client.post("/events", json=event)
        resp = client.get("/workflows")
        data = resp.json()
        assert data[0]["score"] == 0.88


class TestGetWorkflowsByCompany:
    """Tests for GET /workflows/{company_id}."""

    def test_returns_only_matching_company(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED", company_id="acme"))
        client.post(
            "/events",
            json=_make_event(
                "DOCUMENT_UPLOADED", document_id="doc-2", company_id="globex"
            ),
        )
        resp = client.get("/workflows/acme")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["company_id"] == "acme"

    def test_same_document_id_different_companies_are_isolated(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED", company_id="acme"))
        client.post(
            "/events", json=_make_event("DOCUMENT_UPLOADED", company_id="globex")
        )
        resp_acme = client.get("/workflows/acme")
        resp_globex = client.get("/workflows/globex")
        assert len(resp_acme.json()) == 1
        assert len(resp_globex.json()) == 1

    def test_unknown_company_returns_empty_list(self) -> None:
        resp = client.get("/workflows/unknown-company")
        assert resp.status_code == 200
        assert resp.json() == []


class TestGetDocumentHistory:
    """Tests for GET /workflows/{company_id}/{document_id}/history."""

    def test_returns_ordered_history(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED"))
        client.post("/events", json=_make_event("DOCUMENT_PARSED"))
        resp = client.get("/workflows/company-1/doc-1/history")
        assert resp.status_code == 200
        history = resp.json()
        assert len(history) == 2
        assert history[0]["type"] == "DOCUMENT_UPLOADED"
        assert history[1]["type"] == "DOCUMENT_PARSED"

    def test_unknown_document_returns_404(self) -> None:
        resp = client.get("/workflows/company-1/no-such-doc/history")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_history_isolated_per_company(self) -> None:
        client.post("/events", json=_make_event("DOCUMENT_UPLOADED", company_id="acme"))
        client.post("/events", json=_make_event("DOCUMENT_PARSED", company_id="acme"))
        client.post(
            "/events", json=_make_event("DOCUMENT_UPLOADED", company_id="globex")
        )
        resp = client.get("/workflows/globex/doc-1/history")
        assert resp.status_code == 200
        assert len(resp.json()) == 1  # only DOCUMENT_UPLOADED, no DOCUMENT_PARSED


class TestHealth:
    """Tests for GET /health."""

    def test_health_returns_ok(self) -> None:
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
