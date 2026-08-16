/**
 * PRReviewViewer.tsx
 *
 * Renders the PR-style review interface for both input modes:
 *
 *   PDF mode (read-only):
 *     Displays the extracted plain text with AI critique shown as inline
 *     "PR comment" callouts.  No editing is possible – feedback is surfaced
 *     as annotations without exposing source code.
 *
 *   LaTeX mode (interactive):
 *     Shows the surgical patches as code-review diffs.  Each patch can be
 *     accepted individually via "Accept" or all at once via "Accept All".
 *     Accepted patches are applied to the Monaco editor's source in the store.
 *
 * The component reads activeMode, extractedPdfText, and critique from the
 * Zustand store; it does not own any fetching logic.
 */

import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { DiffEditor, Monaco } from '@monaco-editor/react';
import { useTheme } from '../store/ThemeProvider';
import { applyPatch } from '../services/api';
import {
  CheckCheck,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';

// ─── PDF Review Pane ──────────────────────────────────────────────────────────

/**
 * Displays the extracted PDF text as read-only content.
 */
const PDFReviewPane: React.FC = () => {
  const { extractedPdfText } = useStore();

  // Split the extracted text into lines for the gutter numbering effect.
  const lines = useMemo(
    () => (extractedPdfText ? extractedPdfText.split('\n') : []),
    [extractedPdfText]
  );

  if (!extractedPdfText) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--color-text-muted)',
          gap: '12px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <FileText size={40} strokeWidth={1.5} />
        <p style={{ margin: 0, fontSize: '14px' }}>
          Upload a PDF resume to see the PR-style review here.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '16px 20px',
        backgroundColor: 'var(--color-bg-base)',
      }}
    >
      {/* Extracted text with line numbers */}
      <div
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '12px',
          lineHeight: 1.7,
          color: 'var(--color-text-primary)',
          backgroundColor: 'var(--color-bg-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
      >
        {lines.map((line, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              borderBottom: index < lines.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}
          >
            {/* Gutter */}
            <span
              style={{
                minWidth: '48px',
                textAlign: 'right',
                padding: '2px 10px 2px 6px',
                color: 'var(--color-text-muted)',
                backgroundColor: 'var(--color-bg-muted)',
                userSelect: 'none',
                flexShrink: 0,
                borderRight: '1px solid var(--color-border)',
                fontSize: '11px',
              }}
            >
              {index + 1}
            </span>
            {/* Line content */}
            <span style={{ padding: '2px 10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1 }}>
              {line || '\u00a0' /* non-breaking space keeps blank lines visible */}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const normalizeForMatch = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n');
};

/**
 * Renders surgical patches as navigable code-review diffs with individual
 * "Accept" buttons and a bulk "Accept All" action.
 *
 * This component is rendered when inputMode === 'latex' and patches are
 * available (typically opened via the "Review Surgical Patches" button in the
 * sidebar).  When embedded directly in the workspace layout the parent should
 * conditionally render it only when patches exist.
 */
export const LaTeXDiffPane: React.FC<{
  currentPatchIndex: number;
  onNavigate: (index: number) => void;
  onAcceptCurrent: () => void;
  onAcceptAll: () => void;
}> = ({ currentPatchIndex, onNavigate, onAcceptCurrent, onAcceptAll }) => {
  const { resume_latex, surgical_patches } = useStore();
  const { theme } = useTheme();

  const patches = Array.isArray(surgical_patches) ? surgical_patches : [];
  const currentPatch = patches[currentPatchIndex];
  const isApplied = currentPatch?.status === 'applied';
  const isMatchFound = currentPatch
    ? (isApplied || normalizeForMatch(resume_latex).includes(normalizeForMatch(currentPatch.search_text)))
    : false;
  const hasPatches = patches.length > 0;

  // Determine Monaco theme based on app theme
  const monacoTheme = theme === 'dark' ? 'xp-dark' : 'xp-light';


  const handleBeforeMount = (monaco: Monaco) => {
    // Define classic high-fidelity Windows XP themes
    monaco.editor.defineTheme('xp-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0000ff', bold: true },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
      }
    });

    monaco.editor.defineTheme('xp-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '608b4e', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569cd6', bold: true },
      ],
      colors: {
        'editor.background': '#151515',
        'editor.foreground': '#f1f5f9',
        'editor.lineHighlightBackground': '#222222',
        'editorCursor.foreground': '#3b82f6',
      }
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-bg-base)',
      }}
    >
      {/* Patch navigation bar */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--color-bg-subtle)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {patches.map((patch, i) => (
              <button
                key={patch.id || `patch-dot-${i}`}
                onClick={() => onNavigate(i)}

                title={`Patch ${i + 1} (${patch.status})`}
                style={{
                  width: '20px',
                  height: '4px',
                  borderRadius: '2px',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  backgroundColor:
                    i === currentPatchIndex
                      ? 'var(--color-accent)'
                      : patch.status === 'applied'
                      ? 'var(--color-success)'
                      : patch.status === 'failed'
                      ? 'var(--color-danger)'
                      : 'var(--color-border-strong)',
                  transition: 'background-color 150ms ease',
                }}
              />
            ))}
          </div>

          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
            }}
          >
            {hasPatches ? `${currentPatchIndex + 1} of ${patches.length}` : 'No patches'}
          </span>

          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-success)' }}>
            Applied {patches.filter(p => p.status === 'applied').length}
          </span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', marginLeft: '8px' }}>
            Pending {patches.filter(p => p.status === 'pending').length}
          </span>
        </div>

        {/* Prev / Next */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onNavigate(Math.max(0, currentPatchIndex - 1))}
            disabled={!hasPatches || currentPatchIndex === 0}
            title="Show the previous suggested change."
            style={{
              fontSize: '11px',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              opacity: !hasPatches || currentPatchIndex === 0 ? 0.3 : 1,
            }}
          >
            ← Prev
          </button>
          <button
            onClick={() => onNavigate(Math.min(patches.length - 1, currentPatchIndex + 1))}
            disabled={!hasPatches || currentPatchIndex === patches.length - 1}
            title="Show the next suggested change."
            style={{
              fontSize: '11px',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              opacity: !hasPatches || currentPatchIndex === patches.length - 1 ? 0.3 : 1,
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Conflict warning */}
      {hasPatches && !isMatchFound && !isApplied && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-warning-subtle)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <AlertCircle size={14} color="var(--color-warning)" />
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-warning)', fontWeight: 500 }}>
            Conflict: the original text for this patch was not found. It may have been edited manually.
          </p>
        </div>
      )}

      {/* Monaco diff view */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <DiffEditor
          original={
            hasPatches
              ? (isMatchFound || isApplied)
                ? currentPatch.search_text
                : 'Original text not found in source.'
              : 'No valid patch content available.'
          }
          modified={hasPatches ? currentPatch.replace_with : 'No patches available.'}
          language="latex"
          theme={monacoTheme}
          beforeMount={handleBeforeMount}
          options={{
            renderSideBySide: true,
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'off',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>

      {/* Accept / Accept All footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onAcceptAll}
          disabled={!hasPatches || patches.every(p => p.status === 'applied')}
          title="Apply all pending changes to your LaTeX resume."
          style={{
            padding: '7px 16px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-bg-base)',
            color: 'var(--color-text-secondary)',
            cursor: hasPatches ? 'pointer' : 'not-allowed',
            opacity: hasPatches && !patches.every(p => p.status === 'applied') ? 1 : 0.4,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <CheckCheck size={14} />
          Accept All
        </button>
        <button
          onClick={onAcceptCurrent}
          disabled={!hasPatches || !isMatchFound || isApplied}
          title="Apply this change to your LaTeX resume."
          style={{
            padding: '7px 20px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: isApplied ? 'var(--color-success)' : 'var(--color-accent)',
            color: 'var(--color-text-inverse)',
            cursor: hasPatches && isMatchFound && !isApplied ? 'pointer' : 'not-allowed',
            opacity: hasPatches && isMatchFound && !isApplied ? 1 : 0.6,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Check size={14} />
          {isApplied ? 'Already Applied' : 'Accept & Continue'}
        </button>
      </div>
    </div>
  );
};

// ─── Public export ────────────────────────────────────────────────────────────

/**
 * Top-level component that switches between the PDF read-only review pane
 * and the interactive LaTeX diff pane based on the current inputMode.
 *
 * LaTeX mode patch navigation is fully self-contained here.
 */
const PRReviewViewer: React.FC = () => {
  const { inputMode, resume_latex, surgical_patches, patch_report, applyEdit } = useStore();

  const patches = Array.isArray(surgical_patches) ? surgical_patches : [];
  const [currentPatchIndex, setCurrentPatchIndex] = React.useState(0);

  const handleAcceptCurrent = React.useCallback(async () => {
    const patch = patches[currentPatchIndex];
    if (!patch || patch.status === 'applied') return;

    try {
      const { updated_resume_latex, patch_report: newReport } = await applyPatch(resume_latex, [patch]);
      const outcome = newReport.items[0];
      const isSuccess = outcome ? outcome.reason_code === 'applied' : newReport.applied_patches > 0;

      const updatedPatches = patches.map((p, i) =>
        i === currentPatchIndex ? { ...p, status: isSuccess ? ('applied' as const) : ('failed' as const) } : p
      );

      const updatedReportItems = patch_report.items.map(item => {
        if (item.patch_index === currentPatchIndex) {
          return {
            ...item,
            status: isSuccess ? ('applied' as const) : ('failed' as const),
            reason_code: outcome ? outcome.reason_code : (isSuccess ? 'applied' : 'failed'),
            message: outcome ? outcome.message : (isSuccess ? 'Patch applied successfully via review.' : 'Failed to apply patch.')
          };
        }
        return item;
      });

      const appliedCount = updatedPatches.filter(p => p.status === 'applied').length;
      const failedCount = updatedPatches.filter(p => p.status === 'failed').length;

      applyEdit({
        resume_latex: isSuccess ? updated_resume_latex : resume_latex,
        surgical_patches: updatedPatches,
        patch_report: {
          ...patch_report,
          applied_patches: appliedCount,
          failed_patches: failedCount,
          items: updatedReportItems
        }
      });

      // Automatically move to next pending patch if available (with wrap-around)
      let nextPending = updatedPatches.findIndex((p, idx) => idx > currentPatchIndex && p.status === 'pending');
      if (nextPending === -1) {
        nextPending = updatedPatches.findIndex(p => p.status === 'pending');
      }
      if (nextPending !== -1) {
        setCurrentPatchIndex(nextPending);
      }
    } catch (err) {
      console.error("Failed to apply current patch in PRReviewViewer", err);
    }
  }, [patches, currentPatchIndex, resume_latex, patch_report, applyEdit]);

  const handleAcceptAll = React.useCallback(async () => {
    const pendingPatches = patches.filter(p => p.status === 'pending');
    if (pendingPatches.length === 0) return;

    try {
      const { updated_resume_latex, patch_report: newReport } = await applyPatch(resume_latex, pendingPatches);

      // Create mapping by ordinal index in pendingPatches to backend outcome
      let pendingIndex = 0;
      const updatedPatches = patches.map(p => {
        if (p.status !== 'pending') return p;
        const outcome = newReport.items[pendingIndex];
        pendingIndex++;
        if (outcome && outcome.reason_code === 'applied') {
          return { ...p, status: 'applied' as const };
        } else if (outcome) {
          return { ...p, status: 'failed' as const };
        }
        return p;
      });

      const appliedIndices = patches
        .map((p, i) => (p.status === 'pending' ? i : -1))
        .filter(i => i !== -1);

      const updatedReportItems = patch_report.items.map(item => {
        const itemPendingIdx = appliedIndices.indexOf(item.patch_index);
        if (itemPendingIdx !== -1 && newReport.items[itemPendingIdx]) {
          const outcome = newReport.items[itemPendingIdx];
          return {
            ...item,
            status: outcome.status,
            reason_code: outcome.reason_code,
            message: outcome.message || 'Processed in bulk.',
          };
        }
        return item;
      });

      const appliedCount = updatedPatches.filter(p => p.status === 'applied').length;
      const failedCount = updatedPatches.filter(p => p.status === 'failed').length;

      applyEdit({
        resume_latex: updated_resume_latex,
        surgical_patches: updatedPatches,
        patch_report: {
          ...patch_report,
          applied_patches: appliedCount,
          failed_patches: failedCount,
          items: updatedReportItems
        }
      });
    } catch (err) {
      console.error("Failed to apply all patches in PRReviewViewer", err);
    }
  }, [patches, resume_latex, patch_report, applyEdit]);


  if (inputMode === 'pdf') {
    return <PDFReviewPane />;
  }

  return (
    <LaTeXDiffPane
      currentPatchIndex={currentPatchIndex}
      onNavigate={setCurrentPatchIndex}
      onAcceptCurrent={handleAcceptCurrent}
      onAcceptAll={handleAcceptAll}
    />
  );
};

export default PRReviewViewer;
