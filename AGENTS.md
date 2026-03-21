# Resume-Interview-Assistant (Enterprise Resume Rebuilder)

Welcome to the **Resume-Interview-Assistant** codebase. This file establishes the core architectural patterns, development rules, and guidelines for AI agents operating in this repository.

---

## 1. Project Overview & Architecture

An AI-driven application that optimizes and rebuilds LaTeX resumes tailored to specific job descriptions with real-time compilation and zero server-side data retention.

- **Backend** (`backend/`):
  - **Framework**: FastAPI (Python 3.10+)
  - **Agentic Engine**: DSPy (`dspy-ai`) configured for Google Gemini models (BYOK: Bring-Your-Own-Key via `x-gemini-api-key` header)
  - **LaTeX Engine**: TeX Live / `pdflatex` subprocess for compiling LaTeX to PDF
  - **PDF & Scraping**: `pypdf` for text extraction; Playwright / BeautifulSoup for job URL scraping
- **Frontend** (`frontend/`):
  - **Framework**: React 18 + Vite + TypeScript
  - **Styling**: Tailwind CSS
  - **State Management**: Zustand
  - **Code Editor**: Monaco Editor (`@monaco-editor/react`)
  - **PDF Preview**: `react-pdf` / PDF.js
- **Infrastructure**: Docker & Docker Compose (`docker-compose.yml`)

---

## 2. Repository Structure

```text
.
├── backend/
│   ├── agents/
│   │   ├── signatures.py      # DSPy Signatures (AnalyzeResume, RebuildResume, ChatAssistant)
│   │   └── modules.py         # DSPy Modules, coercion logic, surgical patching algorithms
│   ├── services/
│   │   ├── latex.py           # LaTeX compilation and temporary file management
│   │   ├── pdf_processor.py   # PDF text extraction utilities
│   │   └── scraper.py         # Playwright-based job description web scraping
│   ├── tests/                 # Backend pytest test suite
│   ├── main.py                # FastAPI entry point, Pydantic schemas, and API routes
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/        # React UI components (Editor, Preview, Diff, Chat, etc.)
│   │   ├── stores/            # Zustand stores for resume, job, and app state
│   │   ├── services/          # API client calling backend endpoints
│   │   ├── types/             # TypeScript interfaces and type definitions
│   │   ├── App.tsx            # Root component
│   │   └── main.tsx           # Application entry point
│   └── package.json           # Frontend dependencies and scripts
└── docker-compose.yml         # Container definitions for full-stack deployment
```

---

## 3. Core Architectural Constraints & Rules

### A. Zero Server-Side Retention
- **No Database**: All resume data, job descriptions, and chat histories are handled in-memory per request or stored locally in browser state.
- **Temporary Files**: Any temporary TeX/PDF files generated during compilation MUST be written to temporary directories and cleanly deleted immediately after processing.

### B. Surgical Patching Model
- Resume updates MUST use **Surgical Patches** (`search_text`, `replace_with`) rather than blind full-file rewriting.
- `search_text` MUST be a unique, verbatim block of text present in the original LaTeX.
- Patches must be applied in deterministic order from top to bottom.
- When parsing LLM output, always run through `coerce_patch_objects()` to handle markdown fences, trailing commas, or unexpected wrapping safely.

### C. LaTeX Safety & Integrity
- Always preserve LaTeX syntax, document structure, packages, and custom environments.
- Escape special LaTeX characters (`%`, `&`, `_`, `$`, `#`, `{`, `}`) appropriately when injecting new content into text bodies.
- Never strip document preamble or closing `\end{document}` tags.

### D. Bring-Your-Own-Key (BYOK) Security
- The backend accepts the user's Gemini API key via the `x-gemini-api-key` HTTP header.
- Never log, persist, or expose API keys in server logs, exceptions, or responses.

---

## 4. Development & Testing Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
pytest backend/tests/
```

### Frontend
```bash
cd frontend
npm install
npm run dev
npm run build
```

### Docker
```bash
docker-compose up --build
```

---

## 5. Coding Standards

- **Python (Backend)**:
  - Use explicit type annotations on all functions.
  - Use Pydantic models for all request bodies and response schemas.
  - Follow PEP 8 guidelines.
- **TypeScript (Frontend)**:
  - Maintain strict typing; avoid `any`.
  - Colocate component-specific hooks or helpers near their components.
- **DSPy Signatures**:
  - Keep docstrings in DSPy Signatures descriptive and explicit regarding strict JSON output formats.
