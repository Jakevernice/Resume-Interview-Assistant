# Phase 2: Interactive Chatbot Integration

## Problem Statement
The legacy application included a chatbot that allowed users to ask follow-up questions about their resume analysis and interview guide. This conversational aspect was lost during the architectural rewrite to the strict "surgical patch" LaTeX model.

## Proposed Approach
1.  **Backend Chat Endpoint**: Implement a new `/api/chat` endpoint in the FastAPI backend that can receive chat history and a new prompt, utilizing the user's Gemini API key (BYOK).
2.  **State Management**: Expand the frontend Zustand store (`useStore.ts`) to maintain the chat history for the current session.
3.  **Frontend Chat Interface**: Build a new Chat UI component. This could be a collapsible panel, a modal, or an integrated part of the Sidebar, allowing users to converse with the "interview coach" contextually.

## Implementation Steps
1.  Implement `POST /api/chat` in `backend/main.py` to manage the dialogue turn using the user's provided API key.
2.  Update `frontend/src/store/useStore.ts` to include `chatHistory` state and actions to append messages.
3.  Create `frontend/src/components/ChatPanel.tsx` with a message list and input field.
4.  Integrate the `ChatPanel` into the main `Workspace` layout (`App.tsx` or `Sidebar.tsx`), ensuring it doesn't disrupt the existing LaTeX editing experience.
