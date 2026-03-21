import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import type { PatchReport, ProcessResumeResult, SurgicalPatch, ChatMessage } from '../services/api';

// Custom storage object to bridge Zustand and IndexedDB (idb-keyval)
const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

interface HistoryState {
  resume_latex: string;
  surgical_patches: SurgicalPatch[];
  patch_report: PatchReport;
}

interface AppState {
  resume_latex: string;
  job_description: string;
  critique: string;
  required_skills: string[];
  missing_keywords: string[];
  surgical_patches: SurgicalPatch[];
  patch_report: PatchReport;
  analysis_warnings: string[];
  chatHistory: ChatMessage[];
  history: HistoryState[];
  /**
   * Which input mode is currently active.
   * - 'latex': user typed or pasted LaTeX source (original workflow).
   * - 'pdf':   user uploaded a PDF; text was extracted server-side.
   */
  inputMode: 'latex' | 'pdf';
  /** Plain text extracted from an uploaded PDF. Empty when inputMode === 'latex'. */
  extractedPdfText: string;
  /** Live object URL of the uploaded PDF file. Not persisted in storage. */
  uploadedPdfUrl: string | null;
  setResumeLatex: (latex: string) => void;
  /** Applies a change and saves a snapshot to history for undo. */
  applyEdit: (updates: Partial<HistoryState>) => void;
  /** Restores the previous snapshot from history. */
  undoEdit: () => void;
  setJobDescription: (jd: string) => void;
  setAnalysisResults: (results: ProcessResumeResult) => void;
  setInputMode: (mode: 'latex' | 'pdf') => void;
  setExtractedPdfText: (text: string) => void;
  setUploadedPdfUrl: (url: string | null) => void;
  appendSurgicalPatches: (patches: Array<{search_text: string; replace_with: string}>) => void;
  appendChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  clearAll: () => void;
}

const emptyPatchReport = (): PatchReport => ({
  total_patches: 0,
  applied_patches: 0,
  failed_patches: 0,
  parse_failure: false,
  items: [],
});

const ensureString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
};

const ensureStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => ensureString(entry).trim()).filter(Boolean);
};

const ensurePatchArray = (value: unknown): SurgicalPatch[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is any => (
      typeof entry === 'object' &&
      entry !== null &&
      'search_text' in entry &&
      'replace_with' in entry
    ))
    .map((entry, index) => ({
      id: entry.id || `patch-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      search_text: ensureString(entry.search_text),
      replace_with: ensureString(entry.replace_with),
      status: (entry.status === 'applied' || entry.status === 'failed' || entry.status === 'pending') ? entry.status : 'pending',
    }))
    .filter((entry) => entry.search_text.trim().length > 0);
};

const ensurePatchReport = (value: unknown, fallbackCount: number): PatchReport => {
  if (typeof value !== 'object' || value === null) {
    return {
      ...emptyPatchReport(),
      total_patches: fallbackCount,
    };
  }

  const source = value as PatchReport;
  const items = Array.isArray(source.items) ? source.items : [];
  return {
    total_patches: Number.isFinite(Number(source.total_patches)) ? Number(source.total_patches) : fallbackCount,
    applied_patches: Number.isFinite(Number(source.applied_patches)) ? Number(source.applied_patches) : 0,
    failed_patches: Number.isFinite(Number(source.failed_patches)) ? Number(source.failed_patches) : 0,
    parse_failure: Boolean(source.parse_failure),
    items: items.map(item => {
        const status = ensureString(item.status);
        return {
            ...item,
            patch_index: Number(item.patch_index),
            status: (status === 'applied' || status === 'failed' || status === 'pending') ? status as 'pending' | 'applied' | 'failed' : 'failed',
            reason_code: ensureString(item.reason_code),
            message: ensureString(item.message),
            search_text_preview: ensureString(item.search_text_preview),
        }
    }),
  };
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      resume_latex: '',
      job_description: '',
      critique: '',
      required_skills: [],
      missing_keywords: [],
      surgical_patches: [],
      patch_report: emptyPatchReport(),
      analysis_warnings: [],
      chatHistory: [],
      history: [],
      inputMode: 'latex',
      extractedPdfText: '',
      uploadedPdfUrl: null,
      setResumeLatex: (latex) => set({ resume_latex: latex }),
      applyEdit: (updates) =>
        set((state) => ({
          history: [
            ...state.history,
            {
              resume_latex: state.resume_latex,
              surgical_patches: [...state.surgical_patches],
              patch_report: { ...state.patch_report, items: [...state.patch_report.items] },
            },
          ],
          ...updates,
        })),
      undoEdit: () =>
        set((state) => {
          if (state.history.length === 0) return state;
          const newHistory = [...state.history];
          const lastSnapshot = newHistory.pop()!;
          return {
            history: newHistory,
            resume_latex: lastSnapshot.resume_latex,
            surgical_patches: lastSnapshot.surgical_patches,
            patch_report: lastSnapshot.patch_report,
          };
        }),
      setJobDescription: (jd) => set({ job_description: jd }),
      setInputMode: (mode) => set({ inputMode: mode }),
      setExtractedPdfText: (text) => set({ extractedPdfText: text }),
      setUploadedPdfUrl: (url) => set({ uploadedPdfUrl: url }),
      appendSurgicalPatches: (patches) =>
        set((state) => {
            const newPatches = ensurePatchArray(patches);
            const newReportItems = newPatches.map(p => ({
                patch_index: state.surgical_patches.length + newPatches.indexOf(p),
                status: 'pending' as const,
                reason_code: 'pending',
                message: 'Patch suggested via chat.',
                search_text_preview: p.search_text.slice(0, 100)
            }));

            return {
                surgical_patches: [...state.surgical_patches, ...newPatches],
                patch_report: {
                    ...state.patch_report,
                    total_patches: state.patch_report.total_patches + newPatches.length,
                    items: [...state.patch_report.items, ...newReportItems]
                }
            };
        }),
      appendChatMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
      clearChat: () => set({ chatHistory: [] }),
      setAnalysisResults: (results) => {
        const safeCritique = ensureString(results?.critique);
        const safeRequiredSkills = ensureStringArray(results?.required_skills);
        const safeMissingKeywords = ensureStringArray(results?.missing_keywords);
        const safePatches = ensurePatchArray(results?.surgical_patches);
        const safePatchReport = ensurePatchReport(results?.patch_report, safePatches.length);
        const safeWarnings = ensureStringArray(results?.analysis_warnings);

        set({
          critique: safeCritique,
          required_skills: safeRequiredSkills,
          missing_keywords: safeMissingKeywords,
          // resume_latex is explicitly NOT updated here to allow user review first.
          surgical_patches: safePatches,
          patch_report: safePatchReport,
          analysis_warnings: safeWarnings,
        });
      },
      clearAll: () => {
        del('raw-uploaded-pdf').catch(() => {});
        set({
          resume_latex: '',
          job_description: '',
          critique: '',
          required_skills: [],
          missing_keywords: [],
          surgical_patches: [],
          patch_report: emptyPatchReport(),
          analysis_warnings: [],
          chatHistory: [],
          history: [],
          inputMode: 'latex',
          extractedPdfText: '',
          uploadedPdfUrl: null,
        });
      },
    }),
    {
      name: 'resume-rebuilder-storage',
      storage: createJSONStorage(() => storage),
      version: 2,
      partialize: (state) => {
        // Exclude temporary session blob url from persistent storage
        const { uploadedPdfUrl, ...rest } = state;
        return rest;
      },
      migrate: (persistedState: any, version) => {
        if (!persistedState || version >= 2) {
          return persistedState;
        }

        const legacyPatches = persistedState?.surgical_patches;
        return {
          ...persistedState,
          surgical_patches: ensurePatchArray(legacyPatches),
          patch_report: emptyPatchReport(),
          analysis_warnings: [],
        };
      },
    }
  )
);
