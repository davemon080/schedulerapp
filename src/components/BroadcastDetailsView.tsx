import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationItem } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Clock,
  User,
  Image as ImageIcon,
  Plus,
  Trash2,
  Maximize2,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Calendar,
} from 'lucide-react';
import { ImageViewerModal } from './ImageViewerModal';
import { uploadContentImage } from '../lib/storageService';
import { Loader2 } from 'lucide-react';
import { ConfirmDeleteModal } from '@admin/ConfirmDeleteModal';
import { formatBroadcastTimestamp } from '../lib/dbService';

interface BroadcastDetailsViewProps {
  broadcast: NotificationItem;
  onBack: () => void;
  onDeleteBroadcast?: (id: string) => void;
  onAddImages?: (id: string, newImages: string[]) => void;
  onDeleteImage?: (id: string, imageIndex: number) => void;
  isCourseRep?: boolean;
}

export const BroadcastDetailsView: React.FC<BroadcastDetailsViewProps> = ({
  broadcast,
  onBack,
  onDeleteBroadcast,
  onAddImages,
  onDeleteImage,
  isCourseRep = false,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const images = broadcast.images || [];
  const isUrgent = broadcast.type === 'alert' || broadcast.priority === 'urgent';
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const handleOpenViewer = (index: number) => {
    setSelectedImageIndex(index);
    setIsViewerOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map((file) =>
        uploadContentImage(file, 'announcements', broadcast.id)
      );
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((r) => r.downloadUrl);
      if (onAddImages && newUrls.length > 0) {
        onAddImages(broadcast.id, newUrls);
      }
    } catch (err: any) {
      console.error('Failed to upload broadcast images:', err);
      alert(err.message || 'Failed to upload image. Please verify file is a valid image under 10MB.');
    } finally {
      setIsUploadingImages(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleScrollToSlide = (index: number) => {
    if (!sliderRef.current) return;
    const slides = sliderRef.current.children;
    if (slides[index]) {
      (slides[index] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
      setActiveSlideIndex(index);
    }
  };

  const handleSliderScroll = () => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const scrollLeft = container.scrollLeft;
    const itemWidth = container.clientWidth * 0.85;
    const newIndex = Math.round(scrollLeft / (itemWidth + 12));
    if (newIndex >= 0 && newIndex < images.length && newIndex !== activeSlideIndex) {
      setActiveSlideIndex(newIndex);
    }
  };

  return (
    <div className="space-y-4 pb-20 pt-0">
      {/* Top Bar with Back Button & Actions */}
      <div className="flex items-center justify-between gap-3 px-1">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-full bg-white/80 hover:bg-white text-[13px] font-semibold text-[#007AFF] border border-white/90 shadow-2xs transition-all cursor-pointer touch-target"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Broadcasts</span>
        </motion.button>

        <div className="flex items-center gap-2">
          {isCourseRep && (
            <>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-3.5 py-2 min-h-[40px] rounded-full bg-blue-50 hover:bg-blue-100 text-[#007AFF] text-[12px] font-bold border border-blue-200/60 shadow-2xs transition-all cursor-pointer touch-target"
                title="Add photos to this broadcast"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Photos</span>
              </motion.button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </>
          )}

          {isCourseRep && onDeleteBroadcast && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-red-50/80 hover:bg-red-100 text-red-600 border border-red-200/60 shadow-2xs transition-all cursor-pointer touch-target"
              title="Delete broadcast"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* 1. IMAGES AT THE TOP (NOT IN ANY CONTAINER) */}
      {images.length > 0 && (
        <div className="space-y-2.5 pt-1">
          {/* Horizontal Slider Track with Snapping - Edge to Edge Uncontained */}
          <div
            ref={sliderRef}
            onScroll={handleSliderScroll}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-1.5 pt-1 -mx-1 px-1"
          >
            {images.map((imgUrl, idx) => (
              <div
                key={idx}
                onClick={() => handleOpenViewer(idx)}
                className="snap-center shrink-0 w-[88%] sm:w-[78%] max-w-[360px] aspect-[16/10] relative rounded-[24px] overflow-hidden bg-slate-900 shadow-md border border-white/80 cursor-pointer group"
              >
                <img
                  src={imgUrl}
                  alt={`Broadcast attachment ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Dark gradient bottom vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                {/* Centered Zoom Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                  <div className="p-2.5 px-3.5 rounded-full bg-white/95 text-slate-800 shadow-xl flex items-center gap-1.5 text-xs font-bold">
                    <Maximize2 className="w-4 h-4 text-blue-600" />
                    <span>View Full Screen</span>
                  </div>
                </div>

                {/* Slide index pill */}
                <div className="absolute bottom-3 left-3.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-xs">
                  Photo {idx + 1} of {images.length}
                </div>

                {isCourseRep && onDeleteImage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove photo ${idx + 1}?`)) {
                        onDeleteImage(broadcast.id, idx);
                      }
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-rose-600 text-white backdrop-blur-md transition-colors shadow-xs"
                    title="Delete photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Slider Navigation Dots & Prev/Next (Uncontained) */}
          {images.length > 1 && (
            <div className="flex items-center justify-between px-2 pt-0.5">
              <button
                type="button"
                onClick={() => handleScrollToSlide(Math.max(0, activeSlideIndex - 1))}
                disabled={activeSlideIndex === 0}
                className="p-1.5 rounded-full bg-white/80 text-slate-600 disabled:opacity-30 hover:bg-white shadow-2xs transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {images.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => handleScrollToSlide(dotIdx)}
                    className={`h-2 rounded-full transition-all ${
                      dotIdx === activeSlideIndex
                        ? 'w-6 bg-[#007AFF]'
                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleScrollToSlide(Math.min(images.length - 1, activeSlideIndex + 1))}
                disabled={activeSlideIndex === images.length - 1}
                className="p-1.5 rounded-full bg-white/80 text-slate-600 disabled:opacity-30 hover:bg-white shadow-2xs transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. ALL OTHER DETAILS COME AFTER THE IMAGES (UNCONTAINED) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-3.5 px-1 pt-1"
      >
        {/* Header Badges & Author */}
        <div className="flex items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                isUrgent ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25' : 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              }`}
            >
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[14.5px] font-bold text-[#1C1C1E]">
                  {broadcast.sender || broadcast.author || 'Department Rep'}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50" />
              </div>
              <p className="text-[11.5px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 bg-black/5 px-2 py-0.5 rounded-md font-medium text-slate-600">
                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{formatBroadcastTimestamp(broadcast)}</span>
                </span>
                {broadcast.level && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 ml-1">
                    {broadcast.level}L
                  </span>
                )}
                {broadcast.semester && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700">
                    {broadcast.semester}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isUrgent && (
              <span className="text-[10.5px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                Urgent Notice
              </span>
            )}
          </div>
        </div>

        {/* Headline */}
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-[#1C1C1E] leading-snug">
            {broadcast.title}
          </h1>
        </div>

        {/* Message Body - Clean Uncontained Typography */}
        <div className="text-[14px] sm:text-[14.5px] text-slate-700 leading-relaxed whitespace-pre-line pt-0.5">
          {broadcast.message}
        </div>
      </motion.div>

      {/* Full-Screen In-App Image Viewer */}
      {selectedImageIndex !== null && (
        <ImageViewerModal
          isOpen={isViewerOpen}
          images={images}
          initialIndex={selectedImageIndex}
          title={broadcast.title}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedImageIndex(null);
          }}
          onDeleteImage={
            isCourseRep && onDeleteImage
              ? (idx) => {
                  onDeleteImage(broadcast.id, idx);
                  if (images.length <= 1) {
                    setIsViewerOpen(false);
                    setSelectedImageIndex(null);
                  }
                }
              : undefined
          }
        />
      )}

      {/* Confirm Broadcast Deletion Modal */}
      <ConfirmDeleteModal
        isOpen={isConfirmDeleteOpen}
        title="Delete Faculty Broadcast"
        description="Are you sure you want to permanently delete this broadcast notice from student feeds?"
        itemName={broadcast.title}
        itemType="Broadcast"
        confirmLabel="Delete Broadcast"
        isDeleting={isDeleting}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            if (onDeleteBroadcast) {
              await onDeleteBroadcast(broadcast.id);
            }
            setIsConfirmDeleteOpen(false);
            onBack();
          } finally {
            setIsDeleting(false);
          }
        }}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />
    </div>
  );
};
