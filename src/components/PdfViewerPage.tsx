import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Layers,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  Smartphone,
  Sparkles,
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

// Ensure PDF.js is loaded and worker is configured
async function loadPdfJs(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
    const lib = (window as any).pdfjsLib;
    if (!lib.GlobalWorkerOptions.workerSrc) {
      lib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    return lib;
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('pdfjs-cdn-script');
    if (existing) {
      existing.addEventListener('load', () => {
        const lib = (window as any).pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(lib);
      });
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'pdfjs-cdn-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(lib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js script'));
    document.head.appendChild(script);
  });
}

export const PdfViewerPage: React.FC<PdfViewerPageProps> = ({
  pdf,
  courseCode = 'Course',
  courseTitle = '',
  allPdfs = [],
  onBack,
  onSelectPdf,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPagesMenuOpen, setIsPagesMenuOpen] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState<boolean>(false);
  const [jumpInput, setJumpInput] = useState<string>('1');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocRef = useRef<any>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  // Initialize and load PDF document with PDF.js
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setLoadingError(null);
    setFallbackMode(false);
    setCurrentPage(1);

    async function initPdf() {
      try {
        const pdfjs = await loadPdfJs();
        if (isCancelled) return;

        const loadingTask = pdfjs.getDocument({
          url: pdf.pdfUrl,
          withCredentials: false,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.warn('PDF.js standard rendering failed, falling back to embedded viewer:', err);
        setFallbackMode(true);
        setIsLoading(false);
      }
    }

    initPdf();

    return () => {
      isCancelled = true;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy?.();
        pdfDocRef.current = null;
      }
    };
  }, [pdf.pdfUrl]);

  // Render current page to canvas sized for mobile screen
  const renderPage = useCallback(
    async (pageNumber: number) => {
      const doc = pdfDocRef.current;
      if (!doc || !canvasRef.current || !containerRef.current) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await doc.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const container = containerRef.current;
        const screenWidth = container.clientWidth || window.innerWidth;
        const isMobile = window.innerWidth < 640;

        // Subtract safe padding for mobile margins so page fits entirely horizontally
        const horizontalPadding = isMobile ? 16 : 32;
        const targetWidth = Math.min(screenWidth - horizontalPadding, 860);

        const unscaledViewport = page.getViewport({ scale: 1, rotation });
        const autoScale = (targetWidth / unscaledViewport.width) * (zoom / 100);
        const viewport = page.getViewport({ scale: autoScale, rotation });

        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      }
    },
    [zoom, rotation]
  );

  // Trigger page render when currentPage, zoom, or rotation changes
  useEffect(() => {
    if (!fallbackMode && pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [currentPage, zoom, rotation, fallbackMode, renderPage]);

  // Handle container resize to adjust scale automatically
  useEffect(() => {
    const handleResize = () => {
      if (!fallbackMode && pdfDocRef.current) {
        renderPage(currentPage);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPage, fallbackMode, renderPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPagesMenuOpen) {
          setIsPagesMenuOpen(false);
        } else {
          onBack();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrevPage();
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
  }, [currentPage, numPages, isPagesMenuOpen, onBack]);

  // Touch Swipe navigation for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (zoom > 105) return; // Allow panning if zoomed in
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Detect horizontal swipe if larger than 55px and greater than vertical movement
    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        goToNextPage();
      } else {
        goToPrevPage();
      }
    }
  };

  const goToNextPage = () => {
    setCurrentPage((p) => Math.min(p + 1, numPages));
  };

  const goToPrevPage = () => {
    setCurrentPage((p) => Math.max(p - 1, 1));
  };

  const jumpToPageNumber = (pageNo: number) => {
    const target = Math.max(1, Math.min(pageNo, numPages));
    setCurrentPage(target);
    setIsPagesMenuOpen(false);
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Find index for next/prev module navigation
  const currentIndex = allPdfs.findIndex((p) => p.id === pdf.id);
  const prevPdf = currentIndex > 0 ? allPdfs[currentIndex - 1] : null;
  const nextPdf =
    currentIndex >= 0 && currentIndex < allPdfs.length - 1 ? allPdfs[currentIndex + 1] : null;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[100] flex flex-col w-screen h-[100dvh] overflow-hidden transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0B0F19] text-slate-100' : 'bg-[#F1F3F9] text-slate-900'
      }`}
    >
      {/* Top Header Navigation & Controls Toolbar */}
      <header
        className={`shrink-0 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 border-b shadow-xs transition-colors z-20 ${
          isDarkMode
            ? 'bg-[#131926]/95 backdrop-blur-md border-slate-800 text-white'
            : 'bg-white/95 backdrop-blur-md border-slate-200/80 text-slate-900'
        }`}
      >
        {/* Left: Back button & Document details */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className={`p-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
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
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[10px] sm:text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  {courseCode}
                </span>
                {pdf.topic && (
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate hidden md:inline">
                    • {pdf.topic}
                  </span>
                )}
              </div>
              <h1 className="text-xs sm:text-sm font-bold truncate max-w-[140px] sm:max-w-xs md:max-w-md text-slate-900 dark:text-white">
                {pdf.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Right: Actions Toolbar */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Zoom controls (hidden on small mobile to keep it simple, accessible via bottom controls or double tap) */}
          <div
            className={`hidden md:flex items-center rounded-xl p-0.5 border ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
            }`}
          >
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 15, 60))}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="text-[11px] font-mono font-bold px-2 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              title="Reset Zoom to Fit Width"
            >
              {zoom}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 15, 180))}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rotate */}
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className={`p-2 rounded-xl transition-colors cursor-pointer hidden sm:flex items-center justify-center ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Rotate Page 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Dark Mode toggle for night reading */}
          <button
            type="button"
            onClick={() => setIsDarkMode((d) => !d)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Share Document"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Download button */}
          <a
            href={pdf.pdfUrl}
            download={pdf.fileName || `${pdf.title}.pdf`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Save</span>
          </a>

          {/* External Tab View */}
          <a
            href={pdf.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className={`p-2 rounded-xl transition-colors cursor-pointer hidden sm:flex ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Open original document in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 w-full h-full relative overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start p-2 sm:p-4 pb-28 custom-scrollbar"
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Fitting document to your screen...
            </p>
          </div>
        )}

        {/* Standard Canvas Rendering (Fits Mobile Screen 100% horizontally, No Pinching Required) */}
        {!fallbackMode ? (
          <div className="w-full flex flex-col items-center justify-start my-auto">
            <div
              className={`relative rounded-xl sm:rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border transition-all duration-200 overflow-hidden ${
                isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-300/80 bg-white'
              }`}
            >
              <canvas
                ref={canvasRef}
                className={`block transition-all ${
                  isDarkMode ? 'filter invert-[0.88] hue-rotate-180' : ''
                }`}
              />
            </div>

            {/* Mobile swipe helper hint */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400 select-none">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Swipe left or right to change pages</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
          /* Fallback iFrame for remote CORS-protected PDFs */
          <div className="w-full h-full flex flex-col items-center justify-center max-w-3xl mx-auto p-4">
            <div className="w-full rounded-2xl p-5 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Standard Document Viewer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                This document is hosted on an external server. You can view it directly in full screen
                or open it with your mobile PDF reader.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <a
                  href={pdf.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Full Document</span>
                </a>
                <a
                  href={`https://docs.google.com/viewer?url=${encodeURIComponent(
                    pdf.pdfUrl
                  )}&embedded=true`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Cloud Reader</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Copied Toast Alert */}
        {copiedToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xl border border-slate-700 flex items-center gap-2 z-50"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Link copied to clipboard!</span>
          </motion.div>
        )}
      </main>

      {/* Floating Bottom Toolbar with Collapsed Menu for All PDF Pages */}
      <footer className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-3 pointer-events-none">
        <div className="w-full max-w-sm glass-container-solid rounded-[28px] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.16)] border border-white/80 dark:border-slate-700 flex items-center justify-between gap-1 pointer-events-auto backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90">
          {/* Previous Page Button */}
          <button
            type="button"
            disabled={currentPage <= 1 || fallbackMode}
            onClick={goToPrevPage}
            className="px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-slate-800 dark:text-slate-200 cursor-pointer shrink-0"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Prev</span>
          </button>

          {/* Collapsed Menu Trigger: Shows current page and opens scrollable pages list */}
          <button
            type="button"
            disabled={fallbackMode}
            onClick={() => setIsPagesMenuOpen((open) => !open)}
            className="flex-1 px-3 py-2 rounded-2xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 text-[#007AFF] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer shadow-2xs"
            title="Open Collapsed Menu of All Pages"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>
              Page {currentPage} of {numPages}
            </span>
            {isPagesMenuOpen ? (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>

          {/* Next Page Button */}
          <button
            type="button"
            disabled={currentPage >= numPages || fallbackMode}
            onClick={goToNextPage}
            className="px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-slate-800 dark:text-slate-200 cursor-pointer shrink-0"
            title="Next Page"
          >
            <span className="hidden xs:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Collapsed Menu Drawer: Scrollable List of All Document Pages */}
      <AnimatePresence>
        {isPagesMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsPagesMenuOpen(false)}
              className="fixed inset-0 bg-black/45 backdrop-blur-xs"
            />

            {/* Slide-Up Pages Menu Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className={`relative z-10 w-full max-w-lg mx-auto rounded-t-[32px] border-t p-5 shadow-[0_-12px_45px_rgba(0,0,0,0.25)] max-h-[78vh] flex flex-col ${
                isDarkMode
                  ? 'bg-[#131926] border-slate-800 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Drawer Drag Pill Handle */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />

              {/* Header: Title, Count, & Close Button */}
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <div>
                  <h3 className="text-base font-bold tracking-tight">Document Pages</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select any page from the {numPages} pages below to view immediately
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPagesMenuOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
                  title="Close Pages Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Direct Jump Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = parseInt(jumpInput, 10);
                  if (!isNaN(target)) {
                    jumpToPageNumber(target);
                  }
                }}
                className="py-3 flex items-center gap-2"
              >
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                  Jump to:
                </span>
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  placeholder={`1-${numPages}`}
                  className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-center bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
                >
                  Go
                </button>

                <div className="ml-auto flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => jumpToPageNumber(1)}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] font-bold cursor-pointer"
                  >
                    First
                  </button>
                  <button
                    type="button"
                    onClick={() => jumpToPageNumber(numPages)}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] font-bold cursor-pointer"
                  >
                    Last
                  </button>
                </div>
              </form>

              {/* Scrollable Grid of All Pages */}
              <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
                    const isSelected = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => jumpToPageNumber(pageNum)}
                        className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.02] ring-2 ring-blue-400'
                            : isDarkMode
                            ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-200 hover:border-slate-600'
                            : 'bg-slate-50 hover:bg-blue-50/50 border-slate-200/80 text-slate-700 hover:text-blue-600 hover:border-blue-200'
                        }`}
                      >
                        <div
                          className={`w-8 h-10 rounded-md border flex items-center justify-center ${
                            isSelected
                              ? 'border-white/40 bg-white/15 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-400'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold">Page {pageNum}</span>
                        {isSelected && (
                          <span className="text-[10px] font-extrabold uppercase bg-white/20 px-1.5 py-0.2 rounded-full">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Quick Dismiss Button */}
              <div className="pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsPagesMenuOpen(false)}
                  className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-center transition-colors cursor-pointer"
                >
                  Done (View Page {currentPage})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Switcher if multiple PDF modules exist for this course */}
      {allPdfs.length > 1 && !isPagesMenuOpen && (
        <aside
          className={`fixed top-14 right-3 z-30 hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm text-xs font-semibold ${
            isDarkMode
              ? 'bg-[#131926]/90 backdrop-blur-md border-slate-800 text-slate-300'
              : 'bg-white/90 backdrop-blur-md border-slate-200 text-slate-700'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-500" />
          <span>
            {currentIndex + 1} of {allPdfs.length} files
          </span>
          {prevPdf && (
            <button
              type="button"
              onClick={() => onSelectPdf?.(prevPdf)}
              className="px-2 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-600 font-bold ml-1 cursor-pointer"
            >
              Prev
            </button>
          )}
          {nextPdf && (
            <button
              type="button"
              onClick={() => onSelectPdf?.(nextPdf)}
              className="px-2 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-600 font-bold cursor-pointer"
            >
              Next
            </button>
          )}
        </aside>
      )}
    </div>
  );
};
