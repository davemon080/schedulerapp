import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Share2,
  Smartphone,
  Eye,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { CoursePdfModule } from '../admin/types';

interface PdfViewerPageProps {
  pdf: CoursePdfModule;
  courseCode?: string;
  courseTitle?: string;
  allPdfs?: CoursePdfModule[];
  onBack: () => void;
  onSelectPdf?: (pdf: CoursePdfModule) => void;
}

export type PdfEngine = 'google' | 'native' | 'pdfjs';

export const PdfViewerPage: React.FC<PdfViewerPageProps> = ({
  pdf,
  courseCode = 'Course',
  courseTitle = '',
  allPdfs = [],
  onBack,
  onSelectPdf,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [engine, setEngine] = useState<PdfEngine>('native');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasIframeError, setHasIframeError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute PDF source URL based on chosen engine
  const getPdfSource = (url: string, currentEngine: PdfEngine) => {
    if (!url) return '';
    if (currentEngine === 'google') {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }
    if (currentEngine === 'pdfjs') {
      return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`;
    }
    // Native embed with parameters
    return `${url}#toolbar=1&navpanes=1&view=FitH`;
  };

  useEffect(() => {
    setIsLoading(true);
    setHasIframeError(false);
  }, [pdf.pdfUrl, engine]);

  // Keyboard navigation & escape to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onBack();
      } else if (e.key === '+' || (e.ctrlKey && e.key === '=')) {
        setZoom((z) => Math.min(z + 15, 200));
      } else if (e.key === '-' || (e.ctrlKey && e.key === '-')) {
        setZoom((z) => Math.max(z - 15, 50));
      } else if (e.key === '0' && e.ctrlKey) {
        setZoom(100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${courseCode}: ${pdf.title}`,
          text: `Study material for ${courseCode} (${pdf.topic || 'Document'})`,
          url: pdf.pdfUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(pdf.pdfUrl);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  // Find index for next/prev navigation
  const currentIndex = allPdfs.findIndex((p) => p.id === pdf.id);
  const prevPdf = currentIndex > 0 ? allPdfs[currentIndex - 1] : null;
  const nextPdf = currentIndex >= 0 && currentIndex < allPdfs.length - 1 ? allPdfs[currentIndex + 1] : null;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[100] flex flex-col w-screen h-[100dvh] overflow-hidden transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0B0F19] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Header Navigation & Controls Toolbar */}
      <header
        className={`shrink-0 px-2 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2 border-b shadow-sm transition-colors ${
          isDarkMode
            ? 'bg-[#131926] border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Left: Back button & Document info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className={`p-1.5 sm:px-3 sm:py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 active:scale-95'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-95'
            }`}
            title="Back to Course Modules (Esc)"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[10px] sm:text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500">
                  {courseCode}
                </span>
                {pdf.topic && (
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 truncate hidden md:inline">
                    • {pdf.topic}
                  </span>
                )}
                {pdf.fileSize && (
                  <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                    ({pdf.fileSize})
                  </span>
                )}
              </div>
              <h1 className="text-xs sm:text-sm font-bold truncate max-w-[130px] sm:max-w-xs md:max-w-md">
                {pdf.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Viewer Mode Switcher (Google Mobile, Native, PDF.js) */}
        <div className="hidden lg:flex items-center rounded-xl p-0.5 bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setEngine('google')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              engine === 'google'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Google Mobile Cloud PDF Viewer (Highly compatible on all mobile devices)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Viewer</span>
          </button>

          <button
            type="button"
            onClick={() => setEngine('native')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              engine === 'native'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Direct Browser Native PDF Embed"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Native</span>
          </button>

          <button
            type="button"
            onClick={() => setEngine('pdfjs')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              engine === 'pdfjs'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Mozilla PDF.js Reader"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>PDF.js</span>
          </button>
        </div>

        {/* Right: Full toolbar actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Mobile Viewer Mode Toggle Icon */}
          <div className="flex lg:hidden items-center">
            <button
              type="button"
              onClick={() => {
                setEngine((prev) => (prev === 'google' ? 'native' : prev === 'native' ? 'pdfjs' : 'google'));
              }}
              className={`p-1.5 sm:p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isDarkMode ? 'bg-slate-800 text-blue-400' : 'bg-slate-100 text-blue-600'
              }`}
              title="Toggle Viewer Engine"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-mono hidden xs:inline">{engine}</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div
            className={`hidden md:flex items-center rounded-xl p-0.5 border ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
            }`}
          >
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 15, 50))}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="text-[11px] font-mono font-bold px-2 text-blue-500 hover:underline cursor-pointer"
              title="Reset Zoom"
            >
              {zoom}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 15, 200))}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Rotate */}
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer hidden sm:flex items-center justify-center ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Rotate Document"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setIsDarkMode((d) => !d)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={isDarkMode ? 'Light Canvas' : 'Dark Canvas'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Share Document Link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Download PDF button */}
          <a
            href={pdf.pdfUrl}
            download={pdf.fileName || `${pdf.title}.pdf`}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            title="Download PDF file"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Save</span>
          </a>

          {/* Open in external new tab */}
          <a
            href={pdf.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Open in new window / tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer hidden sm:flex items-center justify-center ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Top Helper Bar with Quick Action & Engine Switch */}
      <div className="sm:hidden px-3 py-1.5 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400">
        <span className="truncate">Mode: {engine === 'google' ? 'Mobile Cloud PDF' : engine === 'native' ? 'Native View' : 'PDF.js'}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEngine(engine === 'google' ? 'native' : 'google')}
            className="underline font-bold text-blue-700 dark:text-blue-300 cursor-pointer"
          >
            Switch to {engine === 'google' ? 'Native' : 'Mobile Cloud'}
          </button>
          <a
            href={pdf.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-bold text-blue-700 dark:text-blue-300"
          >
            <span>Full View</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Full-Screen PDF Viewer Canvas */}
      <main className="flex-1 w-full h-full relative overflow-hidden flex flex-col items-center justify-center bg-slate-200/50 dark:bg-[#080B11]">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/10 dark:bg-slate-900/40 backdrop-blur-xs pointer-events-none">
            <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Rendering document...</p>
          </div>
        )}

        <div
          className="w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-150 origin-center"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          }}
        >
          <iframe
            src={getPdfSource(pdf.pdfUrl, engine)}
            title={pdf.title}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasIframeError(true);
            }}
            className="w-full h-full border-0 bg-white shadow-md"
            allow="fullscreen"
          />
        </div>

        {/* Fallback Warning Card if iframe is blocked or takes too long */}
        {hasIframeError && (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto p-5 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 text-center z-20">
            <FileText className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Preview Notice</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              If the document does not display inside the frame on your browser, tap below to open it directly or switch viewing mode.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href={pdf.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Native Viewer</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setHasIframeError(false);
                  setEngine(engine === 'google' ? 'native' : 'google');
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Switch Engine Mode
              </button>
            </div>
          </div>
        )}

        {/* Copied Toast Alert */}
        {copiedToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xl border border-slate-700 flex items-center gap-2 z-50"
          >
            <span>Link copied to clipboard!</span>
          </motion.div>
        )}
      </main>

      {/* Bottom Floating Navigation Bar for Document Switching */}
      {allPdfs.length > 1 && (
        <footer
          className={`shrink-0 px-3 sm:px-4 py-2 border-t flex items-center justify-between gap-2 text-xs transition-colors ${
            isDarkMode
              ? 'bg-[#131926] border-slate-800 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-xs truncate">
              {currentIndex + 1} / {allPdfs.length} files
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled={!prevPdf}
              onClick={() => prevPdf && onSelectPdf?.(prevPdf)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev Module</span>
            </button>
            <button
              type="button"
              disabled={!nextPdf}
              onClick={() => nextPdf && onSelectPdf?.(nextPdf)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <span className="hidden sm:inline">Next Module</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
