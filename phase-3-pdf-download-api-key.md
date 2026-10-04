# Phase 3: Save/Download Generated PDF & Change API Key Option

## Problem Statement
1. Users currently see a live preview of their compiled LaTeX resume, but lack a clear way to download the final PDF artifact locally.
2. Once a user enters their API key, there is no UI affordance to change or clear the key without force-refreshing the page.

## Proposed Approach
1.  **PDF Download**: Leverage the existing `pdfBlob` generated in the `Preview.tsx` component. Add a user-facing download button that triggers a file save action using the blob URL.
2.  **API Key Management**: Add a "Settings" or "Disconnect" action in the UI that clears the API key from the `AuthContext` and Zustand store (if applicable), which will seamlessly return the user to the `APIKeyGuard` screen.

## Implementation Steps
1.  **Download PDF**: Update `frontend/src/components/Preview.tsx` to add a "Download PDF" button next to the "Force Recompile" button. Implement a click handler that creates a temporary `<a>` tag to trigger the download of `pdfBlob`.
2.  **Change API Key**: Update the Sidebar or main navigation header to include a "Change API Key" or "Disconnect" button.
3.  In the button handler, call `setApiKey(null)` from the `useAuth` hook and clear any relevant session state from `useStore` to reset the application state.
