import React, { useRef, useEffect } from 'react';
import { ReportJob } from '../types';
import { downloadHtmlReport } from '../utils/reportEngine';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: ReportJob | null;
  htmlContent: string | null;
  onDownloadExcel?: () => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  job,
  htmlContent,
  onDownloadExcel
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !job || !htmlContent) return null;

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  const handleDownloadHtml = () => {
    if (htmlContent) {
      downloadHtmlReport(htmlContent, job.title);
    }
  };

  const handleOpenNewTab = () => {
    if (htmlContent) {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col w-full max-w-6xl h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Toolbar */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0">
              <i className="fas fa-file-invoice text-sky-400 text-sm" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white truncate max-w-md">{job.title}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950 border border-sky-800 text-sky-300 shrink-0">
                  {job.type === 'ai_ondemand' ? 'AI Report' : 'Template Report'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Generated {new Date(job.createdAt).toLocaleString()} · {job.rowCount ? `${job.rowCount.toLocaleString()} rows` : 'Audit Report'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-sm"
              title="Print report or save as PDF"
            >
              <i className="fas fa-print" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              title="Download standalone HTML file"
            >
              <i className="fas fa-file-code text-emerald-400" />
              <span className="hidden sm:inline">HTML</span>
            </button>

            {onDownloadExcel && (
              <button
                type="button"
                onClick={onDownloadExcel}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                title="Download raw data in Excel (.xlsx)"
              >
                <i className="fas fa-file-excel text-teal-400" />
                <span className="hidden sm:inline">Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenNewTab}
              className="p-1.5 w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
              title="Open in new browser tab"
            >
              <i className="fas fa-arrow-up-right-from-square text-xs" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-300 border border-slate-700 transition-colors"
              title="Close preview"
            >
              <i className="fas fa-xmark text-sm" />
            </button>
          </div>
        </div>

        {/* Sandboxed Iframe Viewer */}
        <div className="flex-1 w-full h-full bg-slate-950 overflow-hidden relative">
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title={job.title}
            className="w-full h-full border-0 bg-slate-900"
            sandbox="allow-scripts allow-modals allow-popups"
          />
        </div>
      </div>
    </div>
  );
};
