# Phase 1: Dual Input, PR-Style Review & Dynamic Theming

## Problem Statement
The current system is aesthetically basic and forces a LaTeX-only workflow. We need to support dual-mode input (PDF/LaTeX), provide an interactive "PR comment-style" review interface, and introduce a personality-driven theming system ("Modern" vs "Nostalgic") to make the application feel polished and "alive."

## Proposed Approach

### 1. Dual-Mode Input
*   **Unified Dropzone**: A single entry point that accepts `.pdf` or `.tex`.
*   **Context-Aware Processing**: The system detects the type and routes to either the extraction-based PDF workflow or the compilation-based LaTeX workflow.

### 2. The PR-Style Review Interface (Unified)
*   **PDF (Read-Only)**: Extracted text is displayed with AI suggestions as inline "PR comments." High-signal feedback without the complexity of source editing.
*   **LaTeX (Interactive)**: Suggestions appear as code-review diffs. Users can "Accept" individual surgical patches or "Accept All" to automatically update the source in the Monaco editor.

### 3. Dynamic Theming Strategy: Refined Hybrid (Stability First)
To provide the most robust and "bug-free" experience, we will adopt a dual-execution strategy for theming:

#### **Group 1: Modern Theme (Light/Dark)**
*   **Mechanism**: Pure CSS Variables + Tailwind.
*   **Experience**: **Instant swap** (No refresh).
*   **Use Case**: Switching between Light and Dark modes within the Material You aesthetic.

#### **Group 2: The "Big Swap" (Modern <-> Nostalgic)**
*   **Mechanism**: `window.location.reload()` on theme change.
*   **Experience**: **Mandatory Page Refresh**.
*   **Why? (Stability & Integrity)**:
    1.  **Monaco Editor**: A full reload ensures the code editor re-initializes its internal theme engine correctly.
    2.  **Layout Density**: The "Nostalgic" XP theme requires significantly different padding, scrollbar styles, and border-radii that can cause "layout layout jitter" or "ghosting" if swapped live.
    3.  **Third-Party Libraries**: Components like `react-pdf` and `monaco` are often "mount-heavy"; a refresh ensures they have a clean slate with the correct configuration from the first render.
    4.  **Zero "Transition Ghosts"**: Eliminates weird color bleeding or layout snaps during the transition.

## Implementation Steps
1.  **Backend Expansion**: Implement `pypdf` text extraction in `backend/services/pdf_processor.py`.
2.  **Interactive Logic**: Update the frontend Zustand store and Monaco integration to support "Accept/Accept All" for LaTeX patches.
3.  **Theming Engine**:
    *   Implement a `ThemeProvider` that reads from `localStorage` on boot.
    *   Create a global `themes.css` defining the aesthetic primitives.
    *   Add a `switchTheme` utility that intelligently decides whether to simply update the DOM attribute (Light/Dark) or trigger a `location.reload()` (Modern/Nostalgic).
4.  **UI Components**:
    *   Update `APIKeyGuard.tsx` with the theme toggle.
    *   Build the `PRReviewViewer.tsx` component to handle both PDF and LaTeX review states.
5.  **Settings Integration**: Add a theme switcher in the application sidebar/header.
