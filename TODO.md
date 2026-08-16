# Project Progress, Completed Features & Operational Notes

## Completed Features & Enhancements

- [x] **Phase 4: UI/UX Refinement & Layout Consolidation**
  - Standardized Windows XP retro styling across all components (Luna Light & Royale Noir themes).
  - Workspace layout structured with 60/40 editor-chat split, clean scroll containers, and clear error banners.

- [x] **LaTeX Staging & Diff Review Workflow (No Auto-Apply)**
  - Patches are no longer auto-applied to the source code upon generation.
  - `ResumeOrchestrator` returns patches in `pending` state; user can review original text (LHS) vs replacement (RHS) in `PatchReviewModal` and `PRReviewViewer`.
  - Chat-suggested edits are automatically staged with a counter badge (`{N} edit(s) staged for review`), removing redundant inline apply buttons.
  - Sidebar "Review Surgical Patches" button dynamically highlights and indicates pending patch counts.

- [x] **"Start New Session" Action**
  - Added a dedicated "Start New Session" button with confirmation prompt in the sidebar footer.
  - Resets all resume content, job description, analysis results, and IndexedDB cache while preserving API key and model selection.

- [x] **Context-Aware PDF vs LaTeX AI Flow**
  - In PDF mode, `ResumeOrchestrator` and `ChatAssistant` bypass LaTeX surgical patch generation and output high-level changelog guidance directly in the text response.
  - Gutter line-numbered read-only view in `PRReviewViewer`.

- [x] **AI Critique / Comment Redundancy Cleanup**
  - Consolidated analysis output into a single clean AI Critique panel in the sidebar, eliminating redundant duplicated comment cards.

- [x] **Vendor-Agnostic Model Selection (BYOK)**
  - Universal BYOK support for Gemini, OpenAI, Claude, Groq, xAI, and DeepSeek.
  - Added preset chips in `APIKeyGuard` with documentation link to LiteLLM supported models.
  - Dynamic `dspy.LM(model=..., api_key=...)` initialization via `X-Model` and `X-API-Key` headers.

- [x] **Dependency Cleanup**
  - Removed deprecated `google-generativeai` direct dependency in favor of LiteLLM orchestration.

---

## Operational Notes & Performance

- **Cold-Start Latency on Free Hosting Instances**:
  - The `/health` endpoint handler is minimal and returns immediately ($O(1)$). Any 1-2 minute delays observed on newly spawned cloud instances are caused by platform container spin-up / waking from sleep on free-tier hosting providers.
- **LaTeX Compilation Overhead**:
  - Tectonic compilation runs via isolated subprocesses with automatic sanitization. Compilation debounce and manual compilation triggers are active to avoid unnecessary compiler invocations.
