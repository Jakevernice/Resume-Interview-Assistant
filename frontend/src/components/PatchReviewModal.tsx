import React, { useState, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useStore } from '../store/useStore';
import { useTheme } from '../store/ThemeProvider';
import { applyPatch } from '../services/api';
import { X, Check, AlertCircle } from 'lucide-react';

const normalizeForMatch = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n');
};

const PatchReviewModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { resume_latex, surgical_patches, patch_report, applyEdit } = useStore();
  const { theme } = useTheme();
  const [currentPatchIndex, setCurrentPatchIndex] = useState(0);

  const patches = Array.isArray(surgical_patches) ? surgical_patches : [];

  useEffect(() => {
    if (currentPatchIndex > patches.length - 1) {
      setCurrentPatchIndex(Math.max(0, patches.length - 1));
    }
  }, [currentPatchIndex, patches.length]);

  const handleApplyCurrent = async () => {
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
            message: outcome ? outcome.message : (isSuccess ? 'Patch applied successfully via modal.' : 'Failed to apply patch.')
          };
        }
        return item;
      });

      applyEdit({
        resume_latex: isSuccess ? updated_resume_latex : resume_latex,
        surgical_patches: updatedPatches,
        patch_report: {
          ...patch_report,
          applied_patches: updatedPatches.filter(p => p.status === 'applied').length,
          failed_patches: updatedPatches.filter(p => p.status === 'failed').length,
          items: updatedReportItems
        }
      });

      // Automatically move to next pending patch if available
      const nextPending = updatedPatches.findIndex((p, idx) => idx > currentPatchIndex && p.status === 'pending');
      if (nextPending !== -1) {
        setCurrentPatchIndex(nextPending);
      } else if (updatedPatches.every(p => p.status !== 'pending')) {
        onClose();
      }
    } catch (err) {
      console.error("Failed to apply patch in PatchReviewModal", err);
    }
  };

  const handleApplyAll = async () => {
    const pendingPatches = patches.filter(p => p.status === 'pending');
    if (pendingPatches.length === 0) return;

    try {
      const { updated_resume_latex, patch_report: newReport } = await applyPatch(resume_latex, pendingPatches);

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
            message: outcome.message || 'Processed in bulk via modal.',
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
      onClose();
    } catch (err) {
      console.error("Failed to apply all patches in PatchReviewModal", err);
    }
  };

  if (!isOpen) return null;

  const currentPatch = patches[currentPatchIndex];
  const isApplied = currentPatch?.status === 'applied';
  const isMatchFound = currentPatch ? (isApplied || normalizeForMatch(resume_latex).includes(normalizeForMatch(currentPatch.search_text))) : false;
  const hasPatches = patches.length > 0;
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-bg-overlay)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-base)',
          width: '100%',
          height: '100%',
          maxWidth: '1100px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '2px solid var(--color-border-strong)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-bg-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: 0,
              }}
            >
              Patch Review
            </h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              {patches.map((patch, i) => (
                <div
                  key={patch.id || `patch-indicator-${i}`}
                  style={{
                    height: '6px',
                    width: '24px',
                    borderRadius: '2px',
                    backgroundColor:
                      i === currentPatchIndex
                        ? 'var(--color-accent)'
                        : patch.status === 'applied'
                        ? 'var(--color-success)'
                        : patch.status === 'failed'
                        ? 'var(--color-danger)'
                        : 'var(--color-border-strong)',
                    transition: 'all 150ms ease',
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>
              {hasPatches ? `${currentPatchIndex + 1} OF ${patches.length}` : 'NO PATCHES'}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-success)' }}>
              APPLIED {patches.filter(p => p.status === 'applied').length}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>
              PENDING {patches.filter(p => p.status === 'pending').length}
            </span>
          </div>
          <button
            onClick={onClose}
            title="Close the patch review window."
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Bar */}
        {hasPatches && !isMatchFound && !isApplied && (
          <div
            style={{
              padding: '8px 20px',
              backgroundColor: 'var(--color-warning-subtle)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} color="var(--color-warning)" />
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-warning)', fontWeight: 600 }}>
              Conflict: The original text for this patch was not found. It may have been edited manually.
            </p>
          </div>
        )}

        {isApplied && (
          <div
            style={{
              padding: '8px 20px',
              backgroundColor: 'var(--color-success-subtle)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={16} color="var(--color-success)" />
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-success)', fontWeight: 600 }}>
              This patch has already been applied.
            </p>
          </div>
        )}

        {/* Diff View */}
        <div style={{ flex: 1, minHeight: 0, backgroundColor: 'var(--color-bg-base)' }}>
          <DiffEditor
            original={
              hasPatches
                ? (isMatchFound || isApplied ? currentPatch.search_text : 'Original text not found in source.')
                : 'No valid patch content available.'
            }
            modified={hasPatches ? currentPatch.replace_with : 'No patches available.'}
            language="latex"
            theme={monacoTheme}
            options={{
              renderSideBySide: true,
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'off',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16, bottom: 16 }
            }}
          />
        </div>

        {/* Report items list */}
        {patch_report.items.length > 0 && (
          <div
            style={{
              padding: '10px 20px',
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-base)',
              maxHeight: '120px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {patch_report.items.map((item, index) => (
              <div
                key={`${item.patch_index}-${index}`}
                style={{
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ color: 'var(--color-text-secondary)' }}>
                  <span style={{ fontWeight: 700 }}>#{item.patch_index}</span> {item.reason_code}
                  {item.message ? `: ${item.message}` : ''}
                </div>
                <span
                  style={{
                    fontWeight: 700,
                    color: item.reason_code === 'applied' ? 'var(--color-success)' : 'var(--color-danger)',
                  }}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setCurrentPatchIndex(prev => Math.max(0, prev - 1))}
              disabled={!hasPatches || currentPatchIndex === 0}
              title="Show the previous suggested change."
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-text-secondary)',
                background: 'none',
                border: 'none',
                cursor: !hasPatches || currentPatchIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: !hasPatches || currentPatchIndex === 0 ? 0.3 : 1,
              }}
            >
              PREVIOUS
            </button>
            <button
              onClick={() => setCurrentPatchIndex(prev => Math.min(patches.length - 1, prev + 1))}
              disabled={!hasPatches || currentPatchIndex === patches.length - 1}
              title="Show the next suggested change."
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-text-secondary)',
                background: 'none',
                border: 'none',
                cursor: !hasPatches || currentPatchIndex === patches.length - 1 ? 'not-allowed' : 'pointer',
                opacity: !hasPatches || currentPatchIndex === patches.length - 1 ? 0.3 : 1,
              }}
            >
              NEXT
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleApplyAll}
              disabled={!hasPatches || patches.every(p => p.status === 'applied')}
              title="Apply all pending changes to your LaTeX resume."
              style={{
                padding: '8px 16px',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-bg-base)',
                color: 'var(--color-text-secondary)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: !hasPatches || patches.every(p => p.status === 'applied') ? 'not-allowed' : 'pointer',
                opacity: !hasPatches || patches.every(p => p.status === 'applied') ? 0.4 : 1,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              APPLY ALL
            </button>
            <button
              onClick={handleApplyCurrent}
              disabled={!hasPatches || !isMatchFound || isApplied}
              title="Apply this change to your LaTeX resume."
              style={{
                padding: '8px 20px',
                backgroundColor: isApplied ? 'var(--color-success)' : 'var(--color-accent)',
                color: 'var(--color-text-inverse)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                cursor: !hasPatches || !isMatchFound || isApplied ? 'not-allowed' : 'pointer',
                opacity: !hasPatches || !isMatchFound || isApplied ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Check size={14} />
              {isApplied ? 'ALREADY APPLIED' : 'APPLY & CONTINUE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatchReviewModal;
