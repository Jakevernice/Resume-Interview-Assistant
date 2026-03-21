/**
 * App.tsx
 *
 * Root application component.
 *
 * Phase-1 additions:
 *   - ThemeProvider wraps the entire tree so CSS variables are applied on boot.
 *   - APIKeyGuard now includes a ThemeToggle in its header.
 *   - Workspace conditionally renders the Editor or the PRReviewViewer
 *     depending on inputMode from the Zustand store.
 *   - The UnifiedDropzone is embedded in the sidebar section to provide the
 *     dual-mode input entry point.
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ThemeProvider } from './store/ThemeProvider';
import { useStore } from './store/useStore';
import { checkHealth } from './services/api';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Sidebar from './components/Sidebar';
import PRReviewViewer from './components/PRReviewViewer';
import ChatPane from './components/ChatPane';
import ThemeToggle from './components/ThemeToggle';
import { KeyRound, ShieldCheck, AlertCircle, LogOut, RotateCcw } from 'lucide-react';

// ─── Error boundary ───────────────────────────────────────────────────────────

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('App-level render failure:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: '100vh',
            width: '100%',
            backgroundColor: 'var(--color-bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              border: '1px solid var(--color-danger-subtle)',
              backgroundColor: 'var(--color-bg-base)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
            }}
          >
            <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              Application Error
            </h1>
            <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              A rendering error occurred. Refresh and retry the action. Payload normalisation
              safeguards are active, but malformed state can still trigger this fallback.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── API Key guard ────────────────────────────────────────────────────────────

const APIKeyGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { apiKey, setApiKey } = useAuth();
  const [inputKey, setInputKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (apiKey) return <>{children}</>;

  const handleConnect = async () => {
    setIsValidating(true);
    setError(null);
    try {
      const res = await checkHealth();
      if (res.data.status === 'healthy') {
        setApiKey(inputKey);
      } else {
        setError('Backend is not responding correctly.');
      }
    } catch {
      setError('Could not connect to backend. Ensure it is running.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-bg-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-base)',
          border: '1px solid var(--color-border)',
          padding: '32px',
          maxWidth: '420px',
          width: '100%',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Header row – brand + theme toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                padding: '8px',
                backgroundColor: 'var(--color-accent-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <KeyRound size={24} color="var(--color-accent)" />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                Access Required
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                Enter your Gemini API Key to begin.
              </p>
            </div>
          </div>
          {/* Theme switcher exposed on the login screen */}
          <ThemeToggle />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="api-key-input"
              style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px' }}
            >
              Google Gemini API Key
            </label>
            <input
              id="api-key-input"
              type="password"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                backgroundColor: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="AIza..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
            />
          </div>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={14} color="var(--color-text-muted)" style={{ marginTop: '1px', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              <strong>Zero-Retention Policy:</strong> Your key is stored strictly in memory.
              Refreshing the page will clear it. We never persist or log your credentials.
            </p>
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                color: 'var(--color-danger)',
                backgroundColor: 'var(--color-danger-subtle)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-danger)',
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <button
            id="connect-button"
            onClick={handleConnect}
            disabled={!inputKey || isValidating}
            style={{
              width: '100%',
              backgroundColor: !inputKey || isValidating ? 'var(--color-border-strong)' : 'var(--color-accent)',
              color: 'var(--color-text-inverse)',
              padding: '9px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '13px',
              border: 'none',
              cursor: !inputKey || isValidating ? 'not-allowed' : 'pointer',
              transition: 'background-color 150ms ease',
            }}
          >
            {isValidating ? 'Connecting…' : 'Initialize Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Workspace ────────────────────────────────────────────────────────────────

const Workspace: React.FC = () => {
  const { inputMode, setUploadedPdfUrl, history, undoEdit } = useStore();
  const { setApiKey } = useAuth();

  // Rehydrate uploaded PDF visual preview on boot
  React.useEffect(() => {
    if (inputMode === 'pdf') {
      import('idb-keyval').then(({ get }) => {
        get('raw-uploaded-pdf').then((blob) => {
          if (blob instanceof Blob) {
            const url = URL.createObjectURL(blob);
            setUploadedPdfUrl(url);
          }
        }).catch(console.error);
      });
    }
  }, [inputMode, setUploadedPdfUrl]);

  // In PDF mode, the Monaco editor is replaced by the PRReviewViewer (read-only).
  // In LaTeX mode, the Monaco editor is shown as before.
  const editorPaneLabel = inputMode === 'pdf' ? 'PDF Review' : 'LaTeX Source';

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg-base)',
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: '350px',
          borderRight: '1px solid var(--color-border)',
          flexShrink: 0,
          overflowY: 'auto',
          backgroundColor: 'var(--color-bg-base)',
        }}
      >
        <Sidebar />
      </div>

      {/* Editor / Review pane */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--color-border)',
          minWidth: 0,
        }}
      >
        {/* Editor section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Pane header */}
          <div
            style={{
              height: '40px',
              borderBottom: '1px solid var(--color-border)',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-bg-subtle)',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
              }}
            >
              {editorPaneLabel}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {inputMode === 'latex' && (
                <button
                  onClick={undoEdit}
                  disabled={history.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-base)',
                    color: history.length === 0 ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: history.length === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 150ms ease',
                    opacity: history.length === 0 ? 0.5 : 1
                  }}
                  title="Undo last change (source and patches)"
                >
                  <RotateCcw size={12} />
                  Undo ({history.length})
                </button>
              )}
              <button
                onClick={() => setApiKey(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-base)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                title="Change API Key"
              >
                <LogOut size={12} />
                Change Key
              </button>
              <ThemeToggle />
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {inputMode === 'pdf' ? <PRReviewViewer /> : <Editor />}
          </div>
        </div>

        {/* Chat section (bottom 40%) */}
        <div style={{ height: '40%', minHeight: '200px', borderTop: '2px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              height: '32px',
              borderBottom: '1px solid var(--color-border)',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--color-bg-subtle)',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-accent)',
              }}
            >
              AI Assistant Chat
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatPane />
          </div>
        </div>
      </div>

      {/* PDF Preview pane */}
      <div
        style={{
          width: '33.333%',
          minWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-bg-muted)',
        }}
      >
        <div
          style={{
            height: '40px',
            borderBottom: '1px solid var(--color-border)',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-bg-subtle)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
            }}
          >
            PDF Preview
          </span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Preview />
        </div>
      </div>
    </div>
  );
};

// ─── App root ─────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <APIKeyGuard>
            <Workspace />
          </APIKeyGuard>
        </AuthProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
};

export default App;
