import React, { useState, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useStore } from '../store/useStore';
import { applyPatch } from '../services/api';
import { X, Check, AlertCircle } from 'lucide-react';

const PatchReviewModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { resume_latex, surgical_patches, patch_report, applyEdit } = useStore();
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
      if (newReport.applied_patches > 0) {
        // Update the status of this patch in the store
        const updatedPatches = patches.map((p, i) =>
            i === currentPatchIndex ? { ...p, status: 'applied' as const } : p
        );

        // Update only the specific item in the global report
        const updatedReportItems = patch_report.items.map(item => {
            if (item.patch_index === currentPatchIndex) {
                return {
                    ...item,
                    status: 'applied' as const,
                    reason_code: 'applied',
                    message: 'Patch applied successfully via modal.'
                };
            }
            return item;
        });

        applyEdit({
          resume_latex: updated_resume_latex,
          surgical_patches: updatedPatches,
          patch_report: {
              ...patch_report,
              applied_patches: patch_report.applied_patches + 1,
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
      if (newReport.applied_patches > 0) {
        const appliedIndices = patches.map((p, i) => p.status === 'pending' ? i : -1).filter(i => i !== -1);

        const updatedPatches = patches.map(p => p.status === 'pending' ? { ...p, status: 'applied' as const } : p);
        // Update all items in report to applied
        const updatedReportItems = patch_report.items.map(item => {
            if (appliedIndices.includes(item.patch_index)) {
                return {
                    ...item,
                    status: 'applied' as const,
                    reason_code: 'applied',
                    message: 'Patch applied successfully in bulk via modal.'
                };
            }
            return item;
        });

        applyEdit({
          resume_latex: updated_resume_latex,
          surgical_patches: updatedPatches,
          patch_report: {
              ...patch_report,
              applied_patches: patch_report.applied_patches + pendingPatches.length,
              items: updatedReportItems
          }
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to apply all patches in PatchReviewModal", err);
    }
  };

  if (!isOpen) return null;

  const currentPatch = patches[currentPatchIndex];
  const isApplied = currentPatch?.status === 'applied';
  const isMatchFound = currentPatch ? (isApplied || resume_latex.includes(currentPatch.search_text)) : false;
  const hasPatches = patches.length > 0;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-8">
      <div className="bg-white w-full h-full max-w-6xl rounded-lg shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Patch Review</h2>
            <div className="flex gap-1">
              {patches.map((patch, i) => (
                <div
                  key={patch.id}
                  className={`h-1 w-6 rounded-full ${
                    i === currentPatchIndex ? 'bg-blue-600' :
                    patch.status === 'applied' ? 'bg-emerald-500' :
                    patch.status === 'failed' ? 'bg-rose-500' :
                    'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {hasPatches ? `${currentPatchIndex + 1} OF ${patches.length}` : 'NO PATCHES'}
            </span>
            <span className="text-[10px] font-bold text-emerald-600">APPLIED {patches.filter(p => p.status === 'applied').length}</span>
            <span className="text-[10px] font-bold text-slate-400 ml-2">PENDING {patches.filter(p => p.status === 'pending').length}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-md transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Info Bar */}
        {hasPatches && !isMatchFound && !isApplied && (
          <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-amber-700 font-medium">
              Conflict: The original text for this patch was not found. It may have been edited manually.
            </p>
          </div>
        )}

        {isApplied && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <p className="text-xs text-emerald-700 font-medium">
              This patch has already been applied.
            </p>
          </div>
        )}

        {!hasPatches && (
          <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-amber-700 font-medium">
              No valid patch objects were returned. Review the patch report for details.
            </p>
          </div>
        )}

        {/* Diff View */}
        <div className="flex-1 min-h-0 bg-white">
          <DiffEditor
            original={
              hasPatches
                ? (isMatchFound || isApplied ? currentPatch.search_text : 'Original text not found in source.')
                : 'No valid patch content available.'
            }
            modified={hasPatches ? currentPatch.replace_with : 'No patches available.'}
            language="latex"
            theme="vs-light"
            options={{
              renderSideBySide: true,
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'off',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 20, bottom: 20 }
            }}
          />
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-white max-h-40 overflow-y-auto space-y-2">
          {patch_report.items.map((item, index) => (
            <div key={`${item.patch_index}-${index}`} className="text-xs flex items-start justify-between gap-3">
              <div className="text-slate-600">
                <span className="font-semibold">#{item.patch_index}</span> {item.reason_code}
                {item.message ? `: ${item.message}` : ''}
              </div>
              <span
                className={`font-bold ${item.reason_code === 'applied' ? 'text-emerald-600' : 'text-rose-600'}`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentPatchIndex(prev => Math.max(0, prev - 1))}
              disabled={!hasPatches || currentPatchIndex === 0}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30"
            >
              PREVIOUS
            </button>
            <button
              onClick={() => setCurrentPatchIndex(prev => Math.min(patches.length - 1, prev + 1))}
              disabled={!hasPatches || currentPatchIndex === patches.length - 1}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30"
            >
              NEXT
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleApplyAll}
              disabled={!hasPatches || patches.every(p => p.status === 'applied')}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-md text-xs font-bold hover:bg-white transition-colors"
            >
              APPLY ALL
            </button>
            <button
              onClick={handleApplyCurrent}
              disabled={!hasPatches || !isMatchFound || isApplied}
              className="px-6 py-2 bg-blue-600 text-white rounded-md text-xs font-bold flex items-center gap-2 hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
            >
              <Check className="w-4 h-4" />
              {isApplied ? 'ALREADY APPLIED' : 'APPLY & CONTINUE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatchReviewModal;
