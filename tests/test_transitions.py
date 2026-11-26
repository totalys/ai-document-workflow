"""Unit tests for the transition validation logic."""

import pytest

from app.transitions import TransitionError, validate_transition


class TestValidateTransition:
    """Tests for validate_transition()."""

    def test_document_uploaded_new_document(self) -> None:
        result = validate_transition("DOCUMENT_UPLOADED", None)
        assert result == "UPLOADED"

    def test_document_uploaded_existing_document_raises(self) -> None:
        with pytest.raises(TransitionError, match="already exists"):
            validate_transition("DOCUMENT_UPLOADED", "UPLOADED")

    def test_document_parsed_from_uploaded(self) -> None:
        assert validate_transition("DOCUMENT_PARSED", "UPLOADED") == "PARSED"

    def test_document_parsed_from_wrong_status_raises(self) -> None:
        with pytest.raises(TransitionError, match="Cannot process"):
            validate_transition("DOCUMENT_PARSED", "SCORED")

    def test_scoring_started_from_parsed(self) -> None:
        assert validate_transition("SCORING_STARTED", "PARSED") == "SCORING_IN_PROGRESS"

    def test_scoring_started_from_wrong_status_raises(self) -> None:
        with pytest.raises(TransitionError, match="Cannot process"):
            validate_transition("SCORING_STARTED", "UPLOADED")

    def test_scoring_completed_from_scoring_in_progress(self) -> None:
        assert (
            validate_transition("SCORING_COMPLETED", "SCORING_IN_PROGRESS") == "SCORED"
        )

    def test_scoring_completed_from_wrong_status_raises(self) -> None:
        with pytest.raises(TransitionError, match="Cannot process"):
            validate_transition("SCORING_COMPLETED", "PARSED")

    def test_review_required_from_scored(self) -> None:
        assert validate_transition("REVIEW_REQUIRED", "SCORED") == "REVIEW_REQUIRED"

    def test_review_required_from_wrong_status_raises(self) -> None:
        with pytest.raises(TransitionError, match="Cannot process"):
            validate_transition("REVIEW_REQUIRED", "UPLOADED")

    def test_approved_from_scored(self) -> None:
        assert validate_transition("APPROVED", "SCORED") == "APPROVED"

    def test_approved_from_review_required(self) -> None:
        assert validate_transition("APPROVED", "REVIEW_REQUIRED") == "APPROVED"

    def test_approved_from_wrong_status_raises(self) -> None:
        with pytest.raises(TransitionError, match="Cannot process"):
            validate_transition("APPROVED", "PARSED")

    def test_failed_from_any_status(self) -> None:
        for status in (
            "UPLOADED",
            "PARSED",
            "SCORING_IN_PROGRESS",
            "SCORED",
            "REVIEW_REQUIRED",
            "APPROVED",
        ):
            assert validate_transition("FAILED", status) == "FAILED"  # type: ignore[arg-type]

    def test_failed_without_existing_document_raises(self) -> None:
        with pytest.raises(TransitionError, match="does not exist"):
            validate_transition("FAILED", None)

    def test_event_on_nonexistent_document_raises(self) -> None:
        with pytest.raises(TransitionError, match="does not exist"):
            validate_transition("DOCUMENT_PARSED", None)
