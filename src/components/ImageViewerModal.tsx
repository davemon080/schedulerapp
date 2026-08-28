import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Maximize2,
} from 'lucide-react';
import { ConfirmDeleteModal } from '../admin/ConfirmDeleteModal';

interface ImageViewerModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
  onDeleteImage?: (index: number) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  title = 'Assignment Image',
  onClose,
  onDeleteImage,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState<number>(0);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(initialIndex, Math.max(0, images.length - 1)));
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        handleNext();
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  const currentImage = images[currentIndex] || images[0];

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 3.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 0.75);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      handleResetZoom();
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      handleResetZoom();
    }
  };

  // Double tap/click to zoom
  const handleImageDoubleClick = () => {
    if (scale > 1) {
      handleResetZoom();
    } else {
      setScale(2);
    }
  };

  const handleTouchStart = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      handleImageDoubleClick();
    }
    setLastTap(now);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const a = document.createElement('a');
    a.href = currentImage;
    a.download = `assignment-image-${currentIndex + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && images.length > 0 && (
        <motion.div
          key="image-viewer-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between select-none overflow-hidden"
        >
          {/* Backdrop with tap-to-close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-2xl cursor-zoom-out"
          />

          {/* Top Control Bar - Aligned Header Container */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="relative z-50 w-full max-w-5xl mx-auto px-3 sm:px-6 pt-3.5 pb-2 flex items-center justify-between gap-2.5 pointer-events-none"
          >
            {/* Left Section: Back Arrow Button & Compact Title Pill */}
            <div className="flex items-center gap-2 pointer-events-auto min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center p-2 sm:px-3 sm:py-2 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95 group"
                title="Exit image viewer"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-1 transition-transform group-hover:-translate-x-0.5" />
                <span className="hidden sm:inline text-[12px] font-semibold">Back</span>
              </button>

              {/* Smaller, compact Title Pill */}
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-xl px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full border border-white/10 text-white shadow-lg min-w-0">
                <span className="text-[11.5px] sm:text-[12.5px] font-medium tracking-tight text-white/90 truncate max-w-[110px] sm:max-w-[180px]">
                  {title}
                </span>
                {images.length > 1 && (
                  <span className="text-[10px] font-bold text-sky-300 bg-sky-500/20 px-1.5 py-0.5 rounded-full border border-sky-400/25 shrink-0">
                    {currentIndex + 1}/{images.length}
                  </span>
                )}
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
              <button
                onClick={handleDownload}
                className="p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95"
                title="Download image"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {onDeleteImage && (
                <button
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="p-2 sm:p-2.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 backdrop-blur-xl border border-red-500/30 transition-all cursor-pointer shadow-lg active:scale-95"
                  title="Delete image"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 sm:p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xl border border-white/25 transition-all cursor-pointer shadow-lg active:scale-95"
                title="Close viewer (Esc)"
              >
                <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </div>
          </motion.header>

          {/* Central Image Canvas Area */}
          <div
            ref={containerRef}
            className="relative z-10 w-full flex-1 flex items-center justify-center px-4 py-2 sm:px-12 overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={(e) => {
              // Clicking empty space outside the image closes smoothly
              if (e.target === containerRef.current && scale === 1) {
                onClose();
              }
            }}
          >
            <motion.div
              key={`img-canvas-${currentIndex}`}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative max-w-full max-h-full flex items-center justify-center"
            >
              <img
                src={currentImage}
                alt={`${title} - ${currentIndex + 1}`}
                referrerPolicy="no-referrer"
                draggable={false}
                onDoubleClick={handleImageDoubleClick}
                onTouchStart={handleTouchStart}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                  transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="max-h-[68vh] sm:max-h-[72vh] max-w-full object-contain rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] select-none"
              />
            </motion.div>
          </div>

          {/* Transparent Floating Navigation Arrows (Side aligned, non-intrusive) */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`fixed left-2 sm:left-5 top-1/2 -translate-y-1/2 z-40 p-3 sm:p-3.5 rounded-full transition-all duration-200 cursor-pointer ${
                  currentIndex === 0
                    ? 'opacity-0 pointer-events-none'
                    : 'bg-white/5 hover:bg-white/20 active:bg-white/30 text-white/50 hover:text-white backdrop-blur-[2px] border border-white/10 hover:border-white/25 active:scale-95 shadow-sm'
                }`}
                title="Previous image (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === images.length - 1}
                className={`fixed right-2 sm:right-5 top-1/2 -translate-y-1/2 z-40 p-3 sm:p-3.5 rounded-full transition-all duration-200 cursor-pointer ${
                  currentIndex === images.length - 1
                    ? 'opacity-0 pointer-events-none'
                    : 'bg-white/5 hover:bg-white/20 active:bg-white/30 text-white/50 hover:text-white backdrop-blur-[2px] border border-white/10 hover:border-white/25 active:scale-95 shadow-sm'
                }`}
                title="Next image (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6 stroke-[2.5]" />
              </button>
            </>
          )}

          {/* Bottom Aligned Controls Bar with Zoom & Thumbnail Dots */}
          <motion.footer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative z-50 w-full max-w-md mx-auto px-4 pb-6 pt-2 flex flex-col items-center gap-3 pointer-events-auto"
          >
            {/* Thumbnail Pills (if multiple images) */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 p-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-lg">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentIndex(idx);
                      handleResetZoom();
                    }}
                    className={`relative w-8 h-8 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                      currentIndex === idx
                        ? 'border-[#007AFF] scale-110 shadow-md'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Floating Zoom & Position Bar */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-2xl border border-white/15 text-white shadow-2xl">
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-full hover:bg-white/15 text-white transition-all cursor-pointer active:scale-90"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetZoom}
                className="px-2.5 py-1 text-[11.5px] font-bold text-white/90 hover:bg-white/15 rounded-full transition-all cursor-pointer"
                title="Reset zoom to 100%"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded-full hover:bg-white/15 text-white transition-all cursor-pointer active:scale-90"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="w-[1px] h-4 bg-white/20 mx-1" />

              <button
                onClick={handleResetZoom}
                className="p-1.5 rounded-full hover:bg-white/15 text-white transition-all cursor-pointer active:scale-90"
                title="Reset position"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </motion.footer>

          {/* Confirm Delete Image Modal */}
          <ConfirmDeleteModal
            isOpen={isConfirmDeleteOpen}
            onClose={() => setIsConfirmDeleteOpen(false)}
            onConfirm={async () => {
              if (onDeleteImage) {
                onDeleteImage(currentIndex);
                if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
              }
              setIsConfirmDeleteOpen(false);
            }}
            title="Delete Attachment Image"
            itemType="image"
            itemName={`Image ${currentIndex + 1} of ${images.length}`}
            description="Are you sure you want to remove this attached screenshot/image? This action cannot be undone."
            confirmLabel="Yes, Remove Image"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
