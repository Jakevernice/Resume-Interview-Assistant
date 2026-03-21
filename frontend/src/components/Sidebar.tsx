/**
 * Sidebar.tsx
 *
 * Left-hand control panel.
 *
 * Phase-1 additions:
 *   - UnifiedDropzone replaces the old plain-text-only resume entry; it accepts
 *     both .pdf and .tex, routing to the appropriate input mode.
 *   - Inline styles use CSS variables from themes.css so the sidebar correctly
 *     reflects the active theme (light / dark / nostalgic).
 *   - The "Review Surgical Patches" button opens the existing PatchReviewModal
 *     for LaTeX mode; in PDF mode it is hidden because editing is not supported.
 */

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../store/AuthContext';
import { processResume } from '../services/api';
import {
  Sparkles,
  Target,
  AlertCircle,
  ChevronRight,
  Loader2,
  Trash2,
} from 'lucide-react';
import PatchReviewModal from './PatchReviewModal';
import UnifiedDropzone from './UnifiedDropzone';

const Sidebar: React.FC = () => {
  const {
    resume_latex,
    job_description,
    setJobDescription,
    critique,
    required_skills,
    missing_keywords,
    surgical_patches,
    patch_report,
    analysis_warnings,
    setAnalysisResults,
    inputMode,
    extractedPdfText,
    clearAll,
  } = useStore();
  const { apiKey } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [jobUrl, setJobUrl] = useState('');
  const [showPatchModal, setShowPatchModal] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const safeRequiredSkills = Array.isArray(required_skills) ? required_skills : [];
  const safeMissingKeywords = Array.isArray(missing_keywords) ? missing_keywords : [];
  const payloadWarnings = [
    ...analysis_warnings,
    ...(Array.isArray(required_skills) ? [] : ['required_skills payload was malformed and ignored.']),
    ...(Array.isArray(missing_keywords) ? [] : ['missing_keywords payload was malformed and ignored.']),
  ];

  // In PDF mode, analysis is run against the extracted plain text instead of
  // the LaTeX source.  The backend's /api/process endpoint accepts plain text
  // in the resume_latex field; the field name is a legacy artefact.
  const resumeContent = inputMode === 'pdf' ? extractedPdfText : resume_latex;
  const canAnalyze = !!resumeContent && (!!job_description || !!jobUrl);

  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    setIsProcessing(true);
    setAnalysisError(null);
    try {
      const normalized = await processResume(resumeContent, jobUrl, job_description, apiKey!);
      setAnalysisResults(normalized);
    } catch (error) {
      console.error('Analysis failed', error);
      setAnalysisError('Analysis request failed. Check backend/API key and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Styles via CSS variables ─────────────────────────────────────────────────

  const fieldsetStyle: React.CSSProperties = {
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '16px 14px 14px',
    boxShadow: 'var(--shadow-sm)',
    backgroundColor: 'var(--color-bg-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    position: 'relative',
    margin: 0,
  };

  const legendStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-accent)',
    padding: '2px 8px',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
    borderRadius: 'var(--radius-sm)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: '13px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.1)',
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
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0,
          }}
        >
          <Target size={18} color="var(--color-accent)" />
          Goal Alignment
        </h2>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', marginBottom: 0 }}>
          Target your resume for a specific role.
        </p>
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* ── Resume Upload ─────────────────────────────────────────────────── */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Resume Source</legend>
          <UnifiedDropzone />
          {inputMode === 'pdf' && extractedPdfText && (
            <p
              style={{
                marginTop: '4px',
                fontSize: '11px',
                color: 'var(--color-success)',
                fontWeight: 600,
              }}
            >
              ✓ PDF extracted — viewing in read-only review mode.
            </p>
          )}
          {inputMode === 'latex' && resume_latex && (
            <p
              style={{
                marginTop: '4px',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                fontWeight: 600,
              }}
            >
              LaTeX source loaded in editor.
            </p>
          )}
        </fieldset>

        {/* ── Job Details ───────────────────────────────────────────────────── */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Job Specifications</legend>
          <input
            id="job-url-input"
            type="text"
            placeholder="Job URL (LinkedIn, Indeed…)"
            style={inputStyle}
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
          />
          <textarea
            id="job-description-input"
            placeholder="Or paste the job description here…"
            rows={4}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
            value={job_description}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </fieldset>

        {/* ── Analyze button ────────────────────────────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            id="analyze-button"
            onClick={handleAnalyze}
            disabled={isProcessing || !canAnalyze}
            style={{
              width: '100%',
              backgroundColor: isProcessing || !canAnalyze
                ? 'var(--color-border-strong)'
                : 'var(--color-text-primary)',
              color: 'var(--color-text-inverse)',
              padding: '9px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '13px',
              border: 'none',
              cursor: isProcessing || !canAnalyze ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 150ms ease',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {isProcessing ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <Sparkles size={14} />
                Analyze &amp; Optimize
              </>
            )}
          </button>

          {analysisError && (
            <div
              style={{
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-danger)',
                backgroundColor: 'var(--color-danger-subtle)',
                padding: '8px 10px',
                fontSize: '11px',
                color: 'var(--color-danger)',
              }}
            >
              {analysisError}
            </div>
          )}

          {payloadWarnings.length > 0 && (
            <div
              style={{
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-warning)',
                backgroundColor: 'var(--color-warning-subtle)',
                padding: '8px 10px',
                fontSize: '11px',
                color: 'var(--color-warning)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {payloadWarnings.map((warning, index) => (
                <p key={`${warning}-${index}`} style={{ margin: 0 }}>{warning}</p>
              ))}
            </div>
          )}
        </section>

        {/* ── Analysis results ──────────────────────────────────────────────── */}
        {critique && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <fieldset style={fieldsetStyle}>
              <legend style={legendStyle}>AI Critique</legend>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  padding: '8px 10px',
                  backgroundColor: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.15)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {critique}
              </div>
            </fieldset>

            {safeRequiredSkills.length > 0 && (
              <fieldset style={fieldsetStyle}>
                <legend style={legendStyle}>Required Skills</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {safeRequiredSkills.map((skill, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '3px 8px',
                        background: 'var(--color-tag-bg)',
                        border: '1px solid var(--color-tag-border)',
                        color: 'var(--color-tag-text)',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </fieldset>
            )}

            {safeMissingKeywords.length > 0 && (
              <fieldset style={fieldsetStyle}>
                <legend style={legendStyle}>Missing Keywords</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {safeMissingKeywords.map((kw, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '3px 8px',
                        background: 'var(--color-tag-warning-bg)',
                        border: '1px solid var(--color-tag-warning-border)',
                        color: 'var(--color-tag-warning-text)',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <AlertCircle size={10} />
                      {kw}
                    </span>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Show patch review only in LaTeX mode where patches can be applied */}
            {inputMode === 'latex' &&
              (surgical_patches.length > 0 || patch_report.items.length > 0) && (
                <button
                  id="review-patches-button"
                  onClick={() => setShowPatchModal(true)}
                  style={{
                    width: '100%',
                    border: '1px solid var(--color-accent)',
                    backgroundColor: 'var(--color-accent-subtle)',
                    color: 'var(--color-accent)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <ChevronRight size={14} />
                  Review Surgical Patches
                </button>
              )}
          </section>
        )}
      </div>

      {/* PatchReviewModal (LaTeX mode only) */}
      {showPatchModal && (
        <PatchReviewModal
          isOpen={showPatchModal}
          onClose={() => setShowPatchModal(false)}
        />
      )}

      {/* Footer / Clear All */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-subtle)',
        }}
      >
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to start a new session? All progress will be cleared.')) {
              clearAll();
              setJobUrl('');
              setAnalysisError(null);
            }
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-bg-base)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <Trash2 size={14} />
          Start New Session
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
