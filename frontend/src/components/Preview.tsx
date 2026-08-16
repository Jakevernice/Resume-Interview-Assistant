import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useStore } from '../store/useStore';
import { compileLatex } from '../services/api';
import { Loader2, AlertTriangle, RefreshCw, Download, FileCode } from 'lucide-react';

// Setup PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const Preview: React.FC = () => {
  const { resume_latex, inputMode, uploadedPdfUrl } = useStore();
  const [pdfBlob, setPdfBlob] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCompile = useCallback(async () => {
    if (inputMode !== 'latex' || !resume_latex.trim()) return;

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const response = await compileLatex(resume_latex, abortControllerRef.current.signal);
      const url = URL.createObjectURL(response.data);
      setPdfBlob((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err: unknown) {
      const errorObj = err as { name?: string; code?: string; response?: { data?: unknown } };
      if (errorObj?.name === 'CanceledError' || errorObj?.code === 'ERR_CANCELED') return;

      let errorData: Record<string, unknown> | null = null;
      const rawData = errorObj?.response?.data;

      if (rawData instanceof Blob) {
        try {
          const text = await rawData.text();
          errorData = JSON.parse(text);
        } catch {
          errorData = null;
        }
      } else if (typeof rawData === 'object' && rawData !== null) {
        errorData = rawData as Record<string, unknown>;
      }

      if (errorData?.type === 'compilation_error') {
        setError('LaTeX Compilation Error. Check the editor for markers.');
      } else if (typeof errorData?.detail === 'string') {
        setError(errorData.detail);
      } else {
        setError('Failed to compile LaTeX. Ensure backend is active.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [resume_latex, inputMode]);


  const handleDownloadPdf = () => {
    if (!pdfBlob) return;
    const link = document.createElement('a');
    link.href = pdfBlob;
    link.download = 'resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadLatex = () => {
    if (!resume_latex) return;
    const blob = new Blob([resume_latex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'resume.tex';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle manual compile event
  useEffect(() => {
    const listener = () => {
      if (inputMode === 'latex') {
        handleCompile();
      }
    };
    window.addEventListener('manual-compile', listener);
    return () => window.removeEventListener('manual-compile', listener);
  }, [handleCompile, inputMode]);

  // Also compile once on mount if latex exists
  useEffect(() => {
    if (inputMode === 'latex' && resume_latex && !pdfBlob) {
      handleCompile();
    }
  }, [handleCompile, pdfBlob, resume_latex, inputMode]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const activePdfSource = inputMode === 'pdf' ? uploadedPdfUrl : pdfBlob;

  return (
    <div className="h-full flex flex-col relative bg-slate-100">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {inputMode === 'latex' && (
          <>
            <button
              onClick={handleDownloadLatex}
              disabled={!resume_latex}
              className="p-2 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 transition-colors text-slate-600 disabled:opacity-50"
              title="Download LaTeX Source"
            >
              <FileCode className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={!pdfBlob || isLoading}
              className="p-2 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 transition-colors text-slate-600 disabled:opacity-50"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleCompile}
              disabled={isLoading}
              className="p-2 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 transition-colors text-slate-600 disabled:opacity-50"
              title="Force Recompile"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto p-8 flex justify-center">
        {error ? (
          <div className="flex flex-col items-center justify-center text-center max-w-xs h-full">
            <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Compilation Failed</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
          </div>
        ) : activePdfSource ? (
          <div className="shadow-2xl">
            <Document
              file={activePdfSource}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<Loader2 className="w-8 h-8 animate-spin text-slate-400 mt-20" />}
            >
              {Array.from(new Array(numPages), (_, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="mb-4"
                  width={window.innerWidth / 3.5} // Adjust based on layout
                />
              ))}
            </Document>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-slate-400 h-full">
            {inputMode === 'pdf' ? (
              <p className="text-sm">Upload a PDF resume to see its preview</p>
            ) : (
              <p className="text-sm">Press Cmd+S to compile and preview</p>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-x-0 top-0 h-1 bg-blue-500 animate-pulse z-20" />
      )}
    </div>
  );
};

export default Preview;
