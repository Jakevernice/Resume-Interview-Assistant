# Enterprise Resume Rebuilder (Dockerized React + DSPy)

This application transforms your LaTeX resume based on a specific job description using AI-driven analysis and rebuilding.

## Architecture

- **Frontend**: React (Vite, TypeScript, Tailwind CSS, Zustand, Monaco Editor)
- **Backend**: FastAPI (Python, DSPy, Playwright, TeX Live)
- **Agentic Layer**: DSPy optimized for Google Gemini 2.0 Flash
- **Containerization**: Docker & Docker Compose

## Features

- **Bring Your Own Key (BYOK)**: Securely use your own Google Gemini API Key.
- **Auto-Scraping**: Provide a job URL, and the system automatically extracts the job description.
- **LaTeX Rebuilding**: AI analyzes your resume against the job and suggests/applies improvements directly to the LaTeX source.
- **Live Preview**: Compile and preview your LaTeX resume as a PDF in real-time.
- **Zero-Retention**: No server-side database; your data is processed in-memory.

## Quick Start (Docker)

1. Ensure you have Docker and Docker Compose installed.
2. Clone the repository.
3. Run the following command:
   ```bash
   docker-compose up --build
   ```
4. Access the application at `http://localhost:3000`.

## Local Development

### Backend
1. Navigate to `backend/`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Install a LaTeX distribution (TeX Live or MikTeX) so that `pdflatex` is available on your system path.
4. Run the API: `uvicorn main:app --reload`.

### Frontend
1. Navigate to `frontend/`.
2. Install dependencies: `npm install`.
3. Start the dev server: `npm run dev`.

## Legacy Prototype
The original Streamlit prototype is located in the `legacy/` directory.
