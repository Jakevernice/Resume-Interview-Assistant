/**
 * UnifiedDropzone.tsx
 *
 * A single entry point for dual-mode resume input.
 *
 * Accepts either:
 *   - A .tex file  → reads the file text and populates the Monaco editor
 *                    (sets inputMode = 'latex').
 *   - A .pdf file  → uploads to /api/extract-pdf, stores the extracted text
 *                    in the Zustand store, and switches to PDF review mode
 *                    (sets inputMode = 'pdf').
 *
 * The component supports both drag-and-drop and click-to-browse interactions.
 * While a PDF upload is in progress a loading overlay is shown.  On error, an
 * inline message is displayed without crashing the parent.
 */

import React, { useCallback, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { extractPdf } from '../services/api';
import { UploadCloud, FileCode, FileText, Loader2 } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileExtension(name: string): string {
  return name.slice(name.lastIndexOf('.')).toLowerCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

const UnifiedDropzone: React.FC = () => {
  const { setResumeLatex, setInputMode, setExtractedPdfText, setUploadedPdfUrl } = useStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const ext = getFileExtension(file.name);

      if (ext === '.tex') {
        // LaTeX path: read as text and push into the Monaco editor.
        const text = await file.text();
        setResumeLatex(text);
        setInputMode('latex');
        setExtractedPdfText('');
        setUploadedPdfUrl(null);
        return;
      }

      if (ext === '.pdf') {
        // PDF path: upload to backend for text extraction.
        setIsUploading(true);
        try {
          // 1. Cache PDF in IndexedDB for session recovery
          const { set: setDb } = await import('idb-keyval');
          await setDb('raw-uploaded-pdf', file);

          // 2. Generate local object URL for visual preview
          const url = URL.createObjectURL(file);
          setUploadedPdfUrl(url);

          const extractedText = await extractPdf(file);
          setExtractedPdfText(extractedText);
          setInputMode('pdf');
          setResumeLatex(''); // Clear any previous LaTeX source.
        } catch {
          setError('Failed to extract text from the PDF. Make sure the backend is running and the file contains selectable text.');
        } finally {
          setIsUploading(false);
        }
        return;
      }

      setError('Unsupported file type. Please upload a .pdf or .tex file.');
    },
    [setResumeLatex, setInputMode, setExtractedPdfText, setUploadedPdfUrl]
  );

  // ── Drag & drop handlers ───────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear the flag if we're leaving the dropzone itself, not a child.
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Input change ───────────────────────────────────────────────────────────

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected if needed.
      e.target.value = '';
    },
    [handleFile]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const borderColor = isDragging
    ? 'var(--color-accent)'
    : 'var(--color-border-strong)';

  const bgColor = isDragging
    ? 'var(--color-accent-subtle)'
    : 'var(--color-bg-subtle)';

  return (
    <div style={{ width: '100%' }}>
      {/* Drop target */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload resume: drop a PDF or LaTeX file here, or click to browse"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 'var(--radius-md)',
          backgroundColor: bgColor,
          padding: '28px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          cursor: isUploading ? 'wait' : 'pointer',
          transition: 'border-color 150ms ease, background-color 150ms ease',
          textAlign: 'center',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        {/* Uploading overlay */}
        {isUploading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'var(--color-bg-overlay)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Loader2
              size={28}
              color="var(--color-text-inverse)"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          </div>
        )}

        <UploadCloud size={32} color="var(--color-accent)" strokeWidth={1.5} />

        <div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Drop your resume here
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            or click to browse
          </p>
        </div>

        {/* Supported format badges */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-bg-base)',
            }}
          >
            <FileText size={10} />
            PDF
          </span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-bg-base)',
            }}
          >
            <FileCode size={10} />
            LaTeX
          </span>
        </div>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.tex"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
      </div>

      {/* Inline error message */}
      {error && (
        <p
          style={{
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--color-danger)',
            padding: '6px 10px',
            backgroundColor: 'var(--color-danger-subtle)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-danger)',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default UnifiedDropzone;
