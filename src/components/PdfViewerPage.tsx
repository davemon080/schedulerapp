import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      className={`fixed inset-0 z-[100] flex flex-col w-screen h-screen overflow-hidden transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0A0D14] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Header Navigation & Controls Toolbar */}
      <header
        className={`shrink-0 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 border-b shadow-md transition-colors ${
          isDarkMode
            ? 'bg-[#111622] border-slate-800/90 text-white'
            : 'bg-white border-slate-200/90 text-slate-900'
        }`}
      >
        {/* Left: Back button & Document metadata */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className={`p-2 sm:px-3.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 active:scale-95'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-95'
            }`}
            title="Back to Course Modules (Esc)"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Back to {courseCode}</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                  {courseCode}
                </span>
                {pdf.topic && (
                  <span className="text-[11px] font-semibold text-slate-400 truncate hidden md:inline">
                    • {pdf.topic}
                  </span>
                )}
                {pdf.fileSize && (
                  <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                    ({pdf.fileSize})
                  </span>
                )}
              </div>
              <h1 className="text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-md">
                {pdf.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Right: Full toolbar actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Zoom controls */}
          <div
            className={`hidden md:flex items-center rounded-xl p-0.5 border ${
              isDarkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-100 border-slate-300'
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
              className="text-[11px] font-mono font-bold px-2 text-blue-400 hover:underline cursor-pointer"
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
            className={`p-2 rounded-xl transition-colors cursor-pointer hidden sm:flex items-center justify-center ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Rotate Page"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Theme Toggle (Dark/Light background) */}
          <button
            type="button"
            onClick={() => setIsDarkMode((d) => !d)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            title="Download PDF file"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </a>

          {/* Open in external new tab */}
          <a
            href={pdf.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
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
            className={`p-2 rounded-xl transition-colors cursor-pointer hidden sm:flex items-center justify-center ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Full-Screen PDF Viewer Canvas */}
      <main className="flex-1 w-full h-full relative overflow-auto p-2 sm:p-4 flex items-center justify-center">
        <div
          className="w-full h-full max-w-6xl mx-auto flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl transition-transform duration-150 origin-top"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          }}
        >
          <iframe
            src={`${pdf.pdfUrl}#toolbar=1&navpanes=1`}
            title={pdf.title}
            className="w-full h-full min-h-[500px] border-0 rounded-2xl bg-white shadow-inner"
            allow="fullscreen"
          />
        </div>

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

      {/* Bottom Floating Navigation Bar for Document Switching & Mobile Zoom */}
      {allPdfs.length > 1 && (
        <footer
          className={`shrink-0 px-4 py-2 border-t flex items-center justify-between gap-3 text-xs transition-colors ${
            isDarkMode
              ? 'bg-[#111622]/90 border-slate-800/80 text-slate-300'
              : 'bg-white/90 border-slate-200/80 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span className="font-semibold">
              Module {currentIndex + 1} of {allPdfs.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!prevPdf}
              onClick={() => prevPdf && onSelectPdf?.(prevPdf)}
              className="px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed bg-slate-800/70 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              type="button"
              disabled={!nextPdf}
              onClick={() => nextPdf && onSelectPdf?.(nextPdf)}
              className="px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
