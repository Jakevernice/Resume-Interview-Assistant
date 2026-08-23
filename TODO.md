# Project Progress, Completed Features & Operational Notes

## Completed Features & Enhancements

- [x] **Audit Remediation & Lean Refactor**
  - Removed legacy prototype files and unused dependencies (`axios`, `clsx`, `tailwind-merge`, `jinja2`, `python-dotenv`, `httpx`).
  - Switched frontend HTTP layer entirely to native `fetch`.
  - Consolidated BYOK API credential handling into Zustand (`useStore`) with memory-only exclusion from storage.
  - Removed unused `/api/analyze-section` endpoint and schemas.
  - Optimized string deduplication with standard library `list(dict.fromkeys(...))`.

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

## Manual Confirmation Checklist

- [ ] **Step 1: Start Full Stack Application**
  ```bash
  sudo docker compose up --build
  ```
  - Open `http://localhost:3000` in the browser.

- [ ] **Step 2: BYOK Authentication Guard**
  - Verify that the **Connect Your API Key** modal appears on initial load.
  - Enter a valid Google Gemini (or LiteLLM supported) API key.
  - Connect and enter the workspace.

- [ ] **Step 3: Zero-Retention Verification**
  - Open Browser DevTools (`F12` / `Ctrl + Shift + I`) $\rightarrow$ **Application** $\rightarrow$ **Storage** $\rightarrow$ **IndexedDB** $\rightarrow$ `keyval-store`.
  - Check `resume-rebuilder-storage` to ensure `apiKey` is strictly in-memory and not stored in IndexedDB.

- [ ] **Step 4: Resume Optimization & Compilation**
  - Paste a sample LaTeX resume and job description in the sidebar.
  - Click **Rebuild & Optimize**.
  - Verify AI critique, required skills, and missing keywords render.
  - Verify suggested surgical patches appear in the review modal / diff viewer.
  - Verify real-time PDF compilation on the right pane.

- [ ] **Step 5: Chat Assistant Workflow**
  - Send an instruction via the Chat pane (e.g., *"Add Kubernetes experience to my skills section"*).
  - Verify response text and check that suggested patches are staged cleanly for review.

- [ ] **Step 6: Reset / Start New Session**
  - Click **Start New Session / Reset**.
  - Verify workspace and cache reset cleanly without session errors.

---

## Operational Notes & Performance

- **Cold-Start Latency on Free Hosting Instances**:
  - The `/health` endpoint handler is minimal and returns immediately ($O(1)$). Any 1-2 minute delays observed on newly spawned cloud instances are caused by platform container spin-up / waking from sleep on free-tier hosting providers.
- **LaTeX Compilation Overhead**:
  - Tectonic compilation runs via isolated subprocesses with automatic sanitization. Compilation debounce and manual compilation triggers are active to avoid unnecessary compiler invocations.
