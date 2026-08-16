from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import dspy
import json
import logging
from backend.agents.modules import (
    ResumeOrchestrator,
    coerce_patch_objects,
    coerce_string_array,
    coerce_text,
    apply_deterministic_patches,
)
from backend.agents.signatures import ChatAssistant
from backend.services.scraper import scrape_job_description
from backend.services.latex import compile_latex_to_pdf
from backend.services.pdf_processor import extract_text_from_pdf
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Resume Rebuilder API (Strict Refactor)")
logger = logging.getLogger("resume_rebuilder_api")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---

class ProcessRequest(BaseModel):
    resume_latex: str
    job_url: Optional[str] = None
    job_description: Optional[str] = None
    input_mode: Optional[str] = "latex"


class SurgicalPatchModel(BaseModel):
    search_text: str
    replace_with: str


class ApplyPatchRequest(BaseModel):
    resume_latex: str
    patches: List[SurgicalPatchModel]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    chat_history: List[ChatMessage]
    message: str
    resume_content: str
    input_mode: str


class PatchReportItemModel(BaseModel):
    patch_index: int
    status: str
    reason_code: str
    message: str
    search_text_preview: str = ""


class PatchReportModel(BaseModel):
    total_patches: int = 0
    applied_patches: int = 0
    failed_patches: int = 0
    parse_failure: bool = False
    items: List[PatchReportItemModel] = Field(default_factory=list)


class ProcessResponseModel(BaseModel):
    critique: str
    required_skills: List[str]
    missing_keywords: List[str]
    updated_resume_latex: str
    surgical_patches: List[SurgicalPatchModel]
    patch_report: PatchReportModel
    job_description: str


class CompileRequest(BaseModel):
    resume_latex: str


class SectionRequest(BaseModel):
    section_latex: str
    job_description: str


class ExtractPdfResponse(BaseModel):
    extracted_text: str


class SectionAnalysisResponse(BaseModel):
    feedback: str


class ChatResponse(BaseModel):
    response_text: str
    suggested_patches: List[SurgicalPatchModel]


class ApplyPatchResponse(BaseModel):
    updated_resume_latex: str
    patch_report: PatchReportModel


class HealthCheckResponse(BaseModel):
    status: str
    engine: str


def _log_type_warning(endpoint: str, field: str, expected_type: str, value: Any) -> None:
    logger.warning(
        "serialization_warning endpoint=%s field=%s expected=%s actual=%s",
        endpoint,
        field,
        expected_type,
        type(value).__name__,
    )


def _coerce_int(value: Any, fallback: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return fallback


def _ensure_string_field(endpoint: str, field: str, value: Any) -> str:
    if not isinstance(value, str):
        _log_type_warning(endpoint, field, "str", value)
    return coerce_text(value)


def _ensure_string_array_field(endpoint: str, field: str, value: Any) -> List[str]:
    if not isinstance(value, list):
        _log_type_warning(endpoint, field, "list[str]", value)
    return coerce_string_array(value)


def _ensure_patch_list_field(endpoint: str, field: str, value: Any) -> List[SurgicalPatchModel]:
    if not isinstance(value, list):
        _log_type_warning(endpoint, field, "list[patch]", value)

    valid_patches, parse_error, invalid_items = coerce_patch_objects(value)
    if parse_error:
        logger.warning(
            "serialization_warning endpoint=%s field=%s parse_error=%s",
            endpoint,
            field,
            parse_error,
        )
    for invalid in invalid_items:
        logger.warning(
            "serialization_warning endpoint=%s field=%s reason=%s patch_index=%s",
            endpoint,
            field,
            invalid.get("reason_code", "invalid_patch_object"),
            invalid.get("patch_index", -1),
        )

    return [
        SurgicalPatchModel(
            search_text=coerce_text(patch.get("search_text", "")),
            replace_with=coerce_text(patch.get("replace_with", "")),
        )
        for patch in valid_patches
    ]


def _ensure_patch_report_field(
    endpoint: str,
    field: str,
    value: Any,
    total_patches: int,
) -> PatchReportModel:
    if not isinstance(value, dict):
        _log_type_warning(endpoint, field, "dict", value)
        value = {}

    raw_items = value.get("items", [])
    if not isinstance(raw_items, list):
        _log_type_warning(endpoint, f"{field}.items", "list", raw_items)
        raw_items = []

    normalized_items: List[PatchReportItemModel] = []
    for index, item in enumerate(raw_items):
        if not isinstance(item, dict):
            _log_type_warning(endpoint, f"{field}.items[{index}]", "dict", item)
            continue
        reason_code = _ensure_string_field(endpoint, f"{field}.items[{index}].reason_code", item.get("reason_code", ""))
        normalized_items.append(
            PatchReportItemModel(
                patch_index=_coerce_int(item.get("patch_index", index), index),
                status=_ensure_string_field(endpoint, f"{field}.items[{index}].status", item.get("status", "failed")),
                reason_code=reason_code,
                message=_ensure_string_field(endpoint, f"{field}.items[{index}].message", item.get("message", "")),
                search_text_preview=_ensure_string_field(
                    endpoint,
                    f"{field}.items[{index}].search_text_preview",
                    item.get("search_text_preview", ""),
                ),
            )
        )

    applied = sum(1 for entry in normalized_items if entry.reason_code == "applied")
    failed = sum(1 for entry in normalized_items if entry.reason_code != "applied")

    return PatchReportModel(
        total_patches=_coerce_int(value.get("total_patches", total_patches), total_patches),
        applied_patches=_coerce_int(value.get("applied_patches", applied), applied),
        failed_patches=_coerce_int(value.get("failed_patches", failed), failed),
        parse_failure=bool(value.get("parse_failure", False)),
        items=normalized_items,
    )

# --- BYOK Dependency ---

def get_byok_credentials(
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    x_model: Optional[str] = Header(default="gemini/gemini-2.0-flash", alias="X-Model"),
    x_gemini_api_key: Optional[str] = Header(default=None, alias="X-Gemini-API-Key"),
) -> Tuple[str, str]:
    """
    Dependency to extract and validate the user's API key and target model from headers.
    Supports both X-API-Key (Universal) and X-Gemini-API-Key (Legacy).
    """
    key = x_api_key or x_gemini_api_key
    if not key:
        raise HTTPException(status_code=401, detail="API key is missing. Provide the X-API-Key or X-Gemini-API-Key header.")
    model = x_model or "gemini/gemini-2.0-flash"
    return key, model


def init_dspy_lm(api_key: str, model: str = "gemini/gemini-2.0-flash") -> dspy.LM:
    """
    Instantiate the DSPy Language Model with the provided key and LiteLLM model identifier.
    """
    return dspy.LM(model=model.strip(), api_key=api_key.strip(), max_retries=1)

# --- Endpoints ---

@app.post("/api/process", response_model=ProcessResponseModel)
async def process_resume(
    request: ProcessRequest,
    credentials: Tuple[str, str] = Depends(get_byok_credentials)
) -> ProcessResponseModel:
    """
    End-to-end processing: Scrape JD, Analyze Resume, and Generate Surgical Patches.
    """
    api_key, model = credentials

    # 1. Scraping Service
    job_desc = request.job_description
    if not job_desc and request.job_url:
        try:
            job_desc = await scrape_job_description(request.job_url)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:
            logger.warning("Scraping failed: %s", exc)
            raise HTTPException(status_code=400, detail="Failed to scrape job description from provided URL.")

    if not job_desc:
        raise HTTPException(status_code=400, detail="Either job_url or job_description must be provided.")

    # 2. Agentic Processing with BYOK context
    lm = init_dspy_lm(api_key=api_key, model=model)
    orchestrator = ResumeOrchestrator()
    endpoint = "/api/process"

    try:
        with dspy.context(lm=lm):
            result = orchestrator(
                resume_latex=request.resume_latex,
                job_description=job_desc,
                input_mode=request.input_mode or "latex"
            )

            critique = _ensure_string_field(endpoint, "critique", getattr(result, "critique", ""))
            required_skills = _ensure_string_array_field(
                endpoint,
                "required_skills",
                getattr(result, "required_skills", []),
            )
            missing_keywords = _ensure_string_array_field(
                endpoint,
                "missing_keywords",
                getattr(result, "missing_keywords", []),
            )
            updated_resume_latex = _ensure_string_field(
                endpoint,
                "updated_resume_latex",
                getattr(result, "updated_resume_latex", request.resume_latex),
            )
            surgical_patches = _ensure_patch_list_field(
                endpoint,
                "surgical_patches",
                getattr(result, "surgical_patches", []),
            )
            patch_report = _ensure_patch_report_field(
                endpoint,
                "patch_report",
                getattr(result, "patch_report", {}),
                total_patches=len(surgical_patches),
            )

            return ProcessResponseModel(
                critique=critique,
                required_skills=required_skills,
                missing_keywords=missing_keywords,
                updated_resume_latex=updated_resume_latex,
                surgical_patches=surgical_patches,
                patch_report=patch_report,
                job_description=coerce_text(job_desc),
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error during agentic processing in /api/process (details scrubbed for security)")
        raise HTTPException(
            status_code=500,
            detail="An error occurred during resume processing. Please verify your Gemini API key and prompt."
        )


@app.post("/api/compile")
async def compile_resume(request: CompileRequest) -> Response:
    """
    Instantly compiles LaTeX to PDF using Tectonic with structured error handling.
    """
    try:
        pdf_bytes = compile_latex_to_pdf(request.resume_latex)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=resume.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        err_msg = str(e)
        if "LATEX_ERROR:" in err_msg:
            # Extract structured error JSON
            error_data = err_msg.replace("LATEX_ERROR:", "")
            try:
                # Return 400 with structured errors for the Monaco editor to highlight
                return JSONResponse(
                    status_code=400,
                    content={"type": "compilation_error", "errors": json.loads(error_data)}
                )
            except Exception:
                pass

        logger.warning("LaTeX compilation failed: %s", err_msg)
        raise HTTPException(status_code=500, detail="Failed to compile LaTeX document.")


@app.post("/api/extract-pdf", response_model=ExtractPdfResponse)
async def extract_pdf_text(file: UploadFile = File(...)) -> ExtractPdfResponse:
    """
    Accepts a PDF upload and returns the extracted plain text.

    The frontend uses this to enable the dual-mode input workflow: the user
    uploads a PDF resume and receives its text, which is then shown in the
    PR-style read-only review pane instead of the Monaco editor.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        text = extract_text_from_pdf(pdf_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("PDF text extraction failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to extract text from PDF.")

    return ExtractPdfResponse(extracted_text=text)


@app.post("/api/analyze-section", response_model=SectionAnalysisResponse)
async def analyze_section(
    request: SectionRequest,
    credentials: Tuple[str, str] = Depends(get_byok_credentials)
) -> SectionAnalysisResponse:
    """
    Fine-grained analysis for specific resume sections.
    """
    api_key, model = credentials
    lm = init_dspy_lm(api_key=api_key, model=model)
    # Define a quick inline signature for section analysis
    class SectionAnalyzer(dspy.Signature):
        """Analyze a specific LaTeX section against a job description."""
        section_latex = dspy.InputField()
        job_description = dspy.InputField()
        feedback = dspy.OutputField()

    analyzer = dspy.Predict(SectionAnalyzer)

    try:
        with dspy.context(lm=lm):
            result = analyzer(section_latex=request.section_latex, job_description=request.job_description)
            return SectionAnalysisResponse(feedback=getattr(result, "feedback", ""))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error during section analysis in /api/analyze-section (details scrubbed for security)")
        raise HTTPException(
            status_code=500,
            detail="An error occurred during section analysis. Please verify your API key and prompt."
        )


@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    credentials: Tuple[str, str] = Depends(get_byok_credentials)
) -> ChatResponse:
    """
    Multi-turn chat endpoint for resume-related queries and targeted edits.
    """
    api_key, model = credentials
    lm = init_dspy_lm(api_key=api_key, model=model)
    predictor = dspy.ChainOfThought(ChatAssistant)

    # Format chat history for DSPy context
    history_str = "\n".join([f"{msg.role}: {msg.content}" for msg in request.chat_history])

    try:
        with dspy.context(lm=lm):
            result = predictor(
                chat_history=history_str,
                resume_content=request.resume_content,
                input_mode=request.input_mode,
                user_message=request.message
            )

            # Coerce patches if any were suggested
            valid_patches, _, _ = coerce_patch_objects(
                getattr(result, "suggested_patches", "[]")
            )

            return ChatResponse(
                response_text=getattr(result, "response_text", ""),
                suggested_patches=[
                    SurgicalPatchModel(
                        search_text=p["search_text"],
                        replace_with=p["replace_with"]
                    )
                    for p in valid_patches
                ]
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error during chat processing in /api/chat (details scrubbed for security)")
        raise HTTPException(
            status_code=500,
            detail="An error occurred during chat interaction. Please verify your Gemini API key and prompt."
        )


@app.post("/api/apply-patch", response_model=ApplyPatchResponse)
async def apply_patch(request: ApplyPatchRequest) -> ApplyPatchResponse:
    """
    Applies a specific set of surgical patches to the provided LaTeX source.
    """
    patches_dict = [
        {"search_text": p.search_text, "replace_with": p.replace_with}
        for p in request.patches
    ]
    updated_latex, report = apply_deterministic_patches(request.resume_latex, patches_dict)
    endpoint = "/api/apply-patch"
    normalized_report = _ensure_patch_report_field(
        endpoint,
        "patch_report",
        report,
        total_patches=len(request.patches),
    )
    return ApplyPatchResponse(
        updated_resume_latex=updated_latex,
        patch_report=normalized_report
    )


@app.get("/health", response_model=HealthCheckResponse)
async def health_check() -> HealthCheckResponse:
    return HealthCheckResponse(status="healthy", engine="tectonic")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

