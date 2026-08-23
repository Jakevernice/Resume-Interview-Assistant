from backend.agents.modules import (
    apply_deterministic_patches,
    coerce_patch_objects,
    coerce_string_array,
)


def test_coerce_string_array_from_bullets():
    raw = "- Jenkins\n- Terraform\n- Docker"
    assert coerce_string_array(raw) == ["Jenkins", "Terraform", "Docker"]


def test_coerce_string_array_from_code_fenced_json():
    raw = '```json\n["Python", "FastAPI", "Docker"]\n```'
    assert coerce_string_array(raw) == ["Python", "FastAPI", "Docker"]


def test_coerce_patch_objects_validates_objects():
    raw = '[{"search_text":"A","replace_with":"B"}, {"search_text":""}, "bad"]'
    valid, parse_error, invalid = coerce_patch_objects(raw)

    assert parse_error is None
    assert len(valid) == 1
    assert valid[0]["search_text"] == "A"
    assert len(invalid) == 2
    assert all(item["reason_code"] == "invalid_patch_object" for item in invalid)


def test_apply_patches_handles_crlf_and_trailing_whitespace():
    original = "\\item Skill A   \r\n\\item Skill B\r\n"
    patches = [
        {
            "patch_index": 0,
            "search_text": "\\item Skill A\n\\item Skill B",
            "replace_with": "\\item Skill A, Skill C\n\\item Skill B",
        }
    ]

    updated, report = apply_deterministic_patches(original, patches)

    assert "\\item Skill A, Skill C" in updated
    assert "\r\n" in updated
    assert report["applied_patches"] == 1
    assert report["failed_patches"] == 0


def test_apply_patches_handles_escaped_latex_and_hallucinated_search_text():
    original = "\\textbf{Languages}: Java\n"
    patches = [
        {
            "patch_index": 0,
            "search_text": "\\\\textbf{Languages}: Java",
            "replace_with": "\\\\textbf{Languages}: Java, Python",
        },
        {
            "patch_index": 1,
            "search_text": "not-present",
            "replace_with": "ignored",
        },
    ]

    updated, report = apply_deterministic_patches(original, patches)
    reason_codes = [item["reason_code"] for item in report["items"]]

    assert "\\textbf{Languages}: Java, Python" in updated
    assert "applied" in reason_codes
    assert "not_found_after_normalization" in reason_codes


def test_apply_patches_reports_duplicate_ambiguity():
    original = "alpha\nalpha\n"
    patches = [
        {
            "patch_index": 0,
            "search_text": "alpha",
            "replace_with": "beta",
        }
    ]

    _, report = apply_deterministic_patches(original, patches)

    assert report["applied_patches"] == 0
    assert report["failed_patches"] == 1
    assert report["items"][0]["reason_code"] == "duplicate_ambiguity"


def test_resume_orchestrator_bypasses_patches_in_pdf_mode():
    from unittest.mock import MagicMock, patch
    from backend.agents.modules import ResumeOrchestrator
    import dspy

    orchestrator = ResumeOrchestrator()
    mock_analyzer = MagicMock()
    mock_analyzer.return_value = dspy.Prediction(
        critique="Good resume",
        required_skills=["Python", "Docker"],
        missing_keywords=["Kubernetes"]
    )
    orchestrator.analyzer = mock_analyzer
    orchestrator.rebuilder = MagicMock()

    result = orchestrator(
        resume_latex="Extracted plain text from resume without latex tags",
        job_description="Python Software Engineer",
        input_mode="pdf"
    )

    assert result.critique == "Good resume"
    assert result.required_skills == ["Python", "Docker"]
    assert result.missing_keywords == ["Kubernetes"]
    assert result.surgical_patches == []
    assert result.patch_report["total_patches"] == 0
    # Ensure rebuilder was not called at all in PDF mode
    orchestrator.rebuilder.assert_not_called()

