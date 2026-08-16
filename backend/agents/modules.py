import dspy
import json
import re
from typing import Any, Dict, List, Optional, Tuple
from backend.agents.signatures import AnalyzeResume, RebuildResume


def coerce_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def _unique_preserve_order(items: List[str]) -> List[str]:
    seen = set()
    ordered: List[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


def coerce_string_array(value: Any) -> List[str]:
    if value is None:
        return []

    if isinstance(value, list):
        return _unique_preserve_order(
            [coerce_text(item).strip() for item in value if coerce_text(item).strip()]
        )

    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return []

        # First preference: strict JSON array parsing.
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return _unique_preserve_order(
                    [coerce_text(item).strip() for item in parsed if coerce_text(item).strip()]
                )
        except Exception:
            pass

        # Bullet-list fallback.
        bullet_lines = []
        for line in raw.splitlines():
            cleaned = re.sub(r"^\s*[-*]\s*", "", line).strip()
            if cleaned:
                bullet_lines.append(cleaned)
        if len(bullet_lines) > 1:
            return _unique_preserve_order(bullet_lines)

        # Comma-separated fallback.
        if "," in raw:
            parts = [part.strip() for part in raw.split(",") if part.strip()]
            if parts:
                return _unique_preserve_order(parts)

        return [raw]

    return [coerce_text(value).strip()] if coerce_text(value).strip() else []


def _strip_code_fences(raw: str) -> str:
    clean_json = raw.strip()
    if clean_json.startswith("```"):
        clean_json = re.sub(r"^```(?:json)?\n", "", clean_json)
        clean_json = re.sub(r"\n```$", "", clean_json)
    return clean_json


def coerce_patch_objects(raw_patches: Any) -> Tuple[List[Dict[str, Any]], Optional[str], List[Dict[str, Any]]]:
    parse_error: Optional[str] = None
    invalid_items: List[Dict[str, Any]] = []

    parsed: Any = raw_patches
    if isinstance(raw_patches, str):
        clean_json = _strip_code_fences(raw_patches)
        try:
            parsed = json.loads(clean_json)
        except Exception as exc:
            parse_error = f"parse_failure: {str(exc)}"
            return [], parse_error, invalid_items

    if not isinstance(parsed, list):
        parse_error = "parse_failure: surgical_patches must be a JSON array"
        return [], parse_error, invalid_items

    valid_patches: List[Dict[str, Any]] = []
    for index, patch in enumerate(parsed):
        if not isinstance(patch, dict):
            invalid_items.append(
                {
                    "patch_index": index,
                    "status": "failed",
                    "reason_code": "invalid_patch_object",
                    "message": "Patch entry is not an object.",
                    "search_text_preview": "",
                }
            )
            continue

        search_text = coerce_text(patch.get("search_text", ""))
        replace_with = coerce_text(patch.get("replace_with", ""))

        if not search_text.strip():
            invalid_items.append(
                {
                    "patch_index": index,
                    "status": "failed",
                    "reason_code": "invalid_patch_object",
                    "message": "Patch object is missing a non-empty search_text.",
                    "search_text_preview": "",
                }
            )
            continue

        valid_patches.append(
            {
                "patch_index": index,
                "search_text": search_text,
                "replace_with": replace_with,
            }
        )

    return valid_patches, parse_error, invalid_items


def _normalize_line_endings(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _normalize_escaped_sequences(text: str) -> str:
    normalized = text
    normalized = re.sub(r"\\r\\n(?=\s|\\\\|$)", "\n", normalized)
    normalized = re.sub(r"\\n(?=\s|\\\\|$)", "\n", normalized)
    normalized = re.sub(r"\\t(?=\s|\\\\|$)", "\t", normalized)
    normalized = re.sub(r"\\{2,}([A-Za-z])", r"\\\1", normalized)
    return normalized


def _normalize_for_matching(text: str) -> str:
    normalized = _normalize_line_endings(text)
    normalized = _normalize_escaped_sequences(normalized)
    return "\n".join(line.rstrip(" \t") for line in normalized.split("\n"))


def _build_normalized_map(text: str) -> Tuple[str, List[int]]:
    source = _normalize_line_endings(text)
    normalized_chars: List[str] = []
    index_map: List[int] = []

    offset = 0
    for segment in source.splitlines(keepends=True):
        has_newline = segment.endswith("\n")
        line_content = segment[:-1] if has_newline else segment
        trimmed = line_content.rstrip(" \t")

        for idx, char in enumerate(trimmed):
            normalized_chars.append(char)
            index_map.append(offset + idx)

        if has_newline:
            normalized_chars.append("\n")
            index_map.append(offset + len(line_content))

        offset += len(segment)

    return "".join(normalized_chars), index_map


def _find_occurrences(haystack: str, needle: str) -> List[Tuple[int, int]]:
    occurrences: List[Tuple[int, int]] = []
    start = 0
    while True:
        index = haystack.find(needle, start)
        if index == -1:
            break
        occurrences.append((index, index + len(needle)))
        start = index + 1
    return occurrences


def _make_search_candidates(search_text: str) -> List[str]:
    base = _normalize_line_endings(coerce_text(search_text))
    candidates = [base, _normalize_escaped_sequences(base)]
    return _unique_preserve_order([candidate for candidate in candidates if candidate])


def _restore_line_endings(text: str, original_text: str) -> str:
    if "\r\n" in original_text:
        return text.replace("\n", "\r\n")
    if "\r" in original_text:
        return text.replace("\n", "\r")
    return text


def apply_deterministic_patches(
    original_latex: str,
    patches: List[Dict[str, Any]],
    parse_error: Optional[str] = None,
    precomputed_failures: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[str, Dict[str, Any]]:
    working_latex = _normalize_line_endings(coerce_text(original_latex))
    report_items: List[Dict[str, Any]] = list(precomputed_failures or [])

    if parse_error:
        report_items.append(
            {
                "patch_index": -1,
                "status": "failed",
                "reason_code": "parse_failure",
                "message": parse_error,
                "search_text_preview": "",
            }
        )

    for ordinal_index, patch in enumerate(patches):
        patch_index = int(patch.get("patch_index", ordinal_index))
        search_text = coerce_text(patch.get("search_text", ""))
        replace_with = coerce_text(patch.get("replace_with", ""))

        duplicate_ambiguity = False
        applied = False

        for candidate in _make_search_candidates(search_text):
            normalized_source, index_map = _build_normalized_map(working_latex)
            normalized_candidate = _normalize_for_matching(candidate)

            if not normalized_candidate:
                continue

            occurrences = _find_occurrences(normalized_source, normalized_candidate)

            if len(occurrences) > 1:
                duplicate_ambiguity = True
                continue

            if len(occurrences) == 1:
                start_norm, end_norm = occurrences[0]
                start_raw = index_map[start_norm]
                end_raw = index_map[end_norm - 1] + 1

                replacement = _normalize_line_endings(_normalize_escaped_sequences(replace_with))
                working_latex = working_latex[:start_raw] + replacement + working_latex[end_raw:]

                report_items.append(
                    {
                        "patch_index": patch_index,
                        "status": "applied",
                        "reason_code": "applied",
                        "message": "Patch applied once in deterministic order.",
                        "search_text_preview": search_text[:120],
                    }
                )
                applied = True
                break

        if applied:
            continue

        reason_code = "duplicate_ambiguity" if duplicate_ambiguity else "not_found_after_normalization"
        message = (
            "Patch matched multiple locations after normalization; skipped deterministically."
            if duplicate_ambiguity
            else "search_text not found after normalization (CRLF/LF, trailing whitespace, escaped chars)."
        )
        report_items.append(
            {
                "patch_index": patch_index,
                "status": "failed",
                "reason_code": reason_code,
                "message": message,
                "search_text_preview": search_text[:120],
            }
        )

    applied_count = sum(1 for item in report_items if item.get("reason_code") == "applied")
    failed_count = sum(1 for item in report_items if item.get("reason_code") != "applied")

    patch_report = {
        "total_patches": len(patches) + len(precomputed_failures or []),
        "applied_patches": applied_count,
        "failed_patches": failed_count,
        "parse_failure": parse_error is not None,
        "items": report_items,
    }

    return _restore_line_endings(working_latex, original_latex), patch_report

class ResumeOrchestrator(dspy.Module):
    """
    Sequences the resume analysis and rebuilding process, producing surgical patches.
    """
    def __init__(self):
        super().__init__()
        self.analyzer = dspy.Predict(AnalyzeResume)
        self.rebuilder = dspy.ChainOfThought(RebuildResume)

    def forward(self, resume_latex: str, job_description: str, input_mode: str = "latex"):
        # 1. Analyze the resume
        analysis = self.analyzer(resume_latex=resume_latex, job_description=job_description)
        required_skills = coerce_string_array(getattr(analysis, "required_skills", []))
        missing_keywords = coerce_string_array(getattr(analysis, "missing_keywords", []))

        # In PDF mode or plain text input, we only critique and do not generate LaTeX surgical patches
        if input_mode == "pdf" or ("\\documentclass" not in resume_latex and "\\begin{document}" not in resume_latex):
            return dspy.Prediction(
                critique=coerce_text(getattr(analysis, "critique", "")),
                required_skills=required_skills,
                missing_keywords=missing_keywords,
                updated_resume_latex=resume_latex,
                surgical_patches=[],
                patch_report={
                    "total_patches": 0,
                    "applied_patches": 0,
                    "failed_patches": 0,
                    "parse_failure": False,
                    "items": [],
                },
            )

        # 2. Rebuild the resume based on the analysis and missing keywords (LaTeX mode only)
        rebuild_result = self.rebuilder(
            resume_latex=resume_latex,
            critique=analysis.critique,
            missing_keywords=json.dumps(missing_keywords)
        )

        # 3. Coerce and validate the patch output.
        valid_patches, parse_error, invalid_items = coerce_patch_objects(
            getattr(rebuild_result, "surgical_patches", "[]")
        )

        # We no longer auto-apply patches here. We return them as "pending" for user review.
        report_items = []
        for patch in valid_patches:
            report_items.append({
                "patch_index": patch["patch_index"],
                "status": "pending",
                "reason_code": "pending",
                "message": "Patch suggested and ready for review.",
                "search_text_preview": patch["search_text"][:120],
            })
        report_items.extend(invalid_items)

        patch_report = {
            "total_patches": len(valid_patches) + len(invalid_items),
            "applied_patches": 0,
            "failed_patches": len(invalid_items),
            "parse_failure": parse_error is not None,
            "items": report_items,
        }

        serializable_patches = [
            {
                "search_text": patch["search_text"],
                "replace_with": patch["replace_with"],
            }
            for patch in valid_patches
        ]

        return dspy.Prediction(
            critique=coerce_text(getattr(analysis, "critique", "")),
            required_skills=required_skills,
            missing_keywords=missing_keywords,
            updated_resume_latex=resume_latex,  # Return original LaTeX
            surgical_patches=serializable_patches,
            patch_report=patch_report,
        )
