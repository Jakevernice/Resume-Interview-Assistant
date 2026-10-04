const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface RawSurgicalPatch {
  search_text: string;
  replace_with: string;
}

export interface SurgicalPatch {
  id: string;
  search_text: string;
  replace_with: string;
  status: 'pending' | 'applied' | 'failed';
}

export interface PatchReportItem {
  patch_index: number;
  status: 'pending' | 'applied' | 'failed';
  reason_code: string;
  message: string;
  search_text_preview: string;
}

export interface PatchReport {
  total_patches: number;
  applied_patches: number;
  failed_patches: number;
  parse_failure: boolean;
  items: PatchReportItem[];
}

export interface ProcessResumeResult {
  critique: string;
  required_skills: string[];
  missing_keywords: string[];
  updated_resume_latex: string;
  surgical_patches: SurgicalPatch[];
  patch_report: PatchReport;
  job_description: string;
  analysis_warnings: string[];
}

const toString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
};

const dedupe = (values: string[]): string[] => {
  return [...new Set(values)];
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return dedupe(
      value
        .map((item) => toString(item).trim())
        .filter(Boolean)
    );
  }

  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return dedupe(
          parsed
            .map((item) => toString(item).trim())
            .filter(Boolean)
        );
      }
    } catch {
      // Fall through to non-JSON parsing.
    }

    const bulletLines = raw
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
      .filter(Boolean);
    if (bulletLines.length > 1) return dedupe(bulletLines);

    if (raw.includes(',')) {
      const commaParts = raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      if (commaParts.length > 0) return dedupe(commaParts);
    }

    return [raw];
  }

  return [];
};

const normalizePatchList = (value: unknown): SurgicalPatch[] => {
  const source = Array.isArray(value) ? value : [];
  return source
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry, index) => {
      const status = toString(entry.status || 'pending');
      return {
        id: toString(entry.id || `patch-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`),
        search_text: toString(entry.search_text),
        replace_with: toString(entry.replace_with),
        status: (status === 'applied' || status === 'failed' || status === 'pending') ? status as 'pending' | 'applied' | 'failed' : 'pending',
      };
    })
    .filter((entry) => entry.search_text.trim().length > 0);
};

const normalizePatchReport = (value: unknown, fallbackPatchCount: number): PatchReport => {
  const source = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const rawItems = Array.isArray(source.items) ? source.items : [];

  const items: PatchReportItem[] = rawItems
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry, index) => {
      const status = toString(entry.status || 'failed');
      return {
        patch_index: Number.isFinite(Number(entry.patch_index)) ? Number(entry.patch_index) : index,
        status: (status === 'applied' || status === 'failed' || status === 'pending') ? status as 'pending' | 'applied' | 'failed' : 'failed',
        reason_code: toString(entry.reason_code || 'not_found_after_normalization'),
        message: toString(entry.message),
        search_text_preview: toString(entry.search_text_preview),
      };
    });

  const appliedPatches = items.filter((item) => item.reason_code === 'applied').length;
  const failedPatches = items.length - appliedPatches;

  return {
    total_patches: Number.isFinite(Number(source.total_patches)) ? Number(source.total_patches) : fallbackPatchCount,
    applied_patches: Number.isFinite(Number(source.applied_patches)) ? Number(source.applied_patches) : appliedPatches,
    failed_patches: Number.isFinite(Number(source.failed_patches)) ? Number(source.failed_patches) : failedPatches,
    parse_failure: Boolean(source.parse_failure),
    items,
  };
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  patches?: RawSurgicalPatch[] | SurgicalPatch[];
  id?: string;
}

export interface ChatResponse {
  response_text: string;
  suggested_patches: RawSurgicalPatch[];
}

export const normalizeProcessResumeResponse = (payload: unknown): ProcessResumeResult => {
  const source = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<string, unknown>;
  const warnings: string[] = [];

  const requiredSkills = toStringArray(source.required_skills);
  const missingKeywords = toStringArray(source.missing_keywords);
  const surgicalPatches = normalizePatchList(source.surgical_patches);
  const patchReport = normalizePatchReport(source.patch_report, surgicalPatches.length);

  if (!Array.isArray(source.required_skills)) {
    warnings.push('required_skills was normalized from a non-array payload.');
  }
  if (!Array.isArray(source.missing_keywords)) {
    warnings.push('missing_keywords was normalized from a non-array payload.');
  }
  if (!Array.isArray(source.surgical_patches)) {
    warnings.push('surgical_patches was normalized from a non-array payload.');
  }

  return {
    critique: toString(source.critique),
    required_skills: requiredSkills,
    missing_keywords: missingKeywords,
    updated_resume_latex: toString(source.updated_resume_latex),
    surgical_patches: surgicalPatches,
    patch_report: patchReport,
    job_description: toString(source.job_description),
    analysis_warnings: warnings,
  };
};

export const processResume = async (
  latex: string,
  jobUrl?: string,
  jobDesc?: string,
  apiKey?: string,
  model?: string,
  inputMode: string = 'latex',
  signal?: AbortSignal
): Promise<ProcessResumeResult> => {
  const response = await fetch(`${BASE_URL}/api/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey || '',
      'X-Model': model || 'gemini/gemini-2.0-flash',
      'X-Gemini-API-Key': apiKey || '',
    },
    body: JSON.stringify({
      resume_latex: latex,
      job_url: jobUrl,
      job_description: jobDesc,
      input_mode: inputMode,
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Failed to process resume' }));
    throw new Error(errorBody.detail || 'Failed to process resume');
  }

  const data = await response.json();
  return normalizeProcessResumeResponse(data);
};

export const compileLatex = async (latex: string, signal?: AbortSignal): Promise<{ data: Blob }> => {
  const response = await fetch(`${BASE_URL}/api/compile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resume_latex: latex,
    }),
    signal,
  });

  if (!response.ok) {
    let errorData: unknown = null;
    try {
      errorData = await response.json();
    } catch {
      // Fall through if not JSON
    }
    const err = new Error('LaTeX compilation failed') as Error & { response?: { data?: unknown } };
    err.response = { data: errorData };
    throw err;
  }

  const blob = await response.blob();
  return { data: blob };
};

export const checkHealth = async () => {
  const response = await fetch(`${BASE_URL}/health`);
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
};

export const extractPdf = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/api/extract-pdf`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Failed to extract text from PDF' }));
    throw new Error(errorBody.detail || 'Failed to extract text from PDF');
  }

  const data = (await response.json()) as { extracted_text: string };
  return data.extracted_text;
};

export const sendChatMessage = async (
  history: ChatMessage[],
  message: string,
  resumeContent: string,
  inputMode: string,
  apiKey: string,
  model?: string
): Promise<ChatResponse> => {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'X-Model': model || 'gemini/gemini-2.0-flash',
      'X-Gemini-API-Key': apiKey,
    },
    body: JSON.stringify({
      chat_history: history.map(({ role, content }) => ({ role, content })),
      message,
      resume_content: resumeContent,
      input_mode: inputMode,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Chat interaction failed' }));
    throw new Error(errorBody.detail || 'Chat interaction failed');
  }

  return response.json();
};

export const applyPatch = async (
  resumeLatex: string,
  patches: SurgicalPatch[]
): Promise<{ updated_resume_latex: string; patch_report: PatchReport }> => {
  const response = await fetch(`${BASE_URL}/api/apply-patch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resume_latex: resumeLatex,
      patches,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Failed to apply patches' }));
    throw new Error(errorBody.detail || 'Failed to apply patches');
  }

  const data = await response.json();
  return {
    updated_resume_latex: toString(data.updated_resume_latex),
    patch_report: normalizePatchReport(data.patch_report, patches.length),
  };
};
