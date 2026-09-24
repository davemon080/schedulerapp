import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AssignmentItem } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Calendar,
  BookOpen,
  User,
  FileText,
  Upload,
  Image as ImageIcon,
  Edit3,
  Trash2,
  Maximize2,
  Check,
  AlertCircle,
  Share2,
  Plus,
} from 'lucide-react';
import { ImageViewerModal } from './ImageViewerModal';
import { ConfirmDeleteModal } from '@admin/ConfirmDeleteModal';

interface AssignmentDetailsViewProps {
  assignment: AssignmentItem;
  onBack: () => void;
  onToggleComplete: (id: string) => void;
  onEdit: (assignment: AssignmentItem) => void;
  onDelete: (id: string) => void;
  onAddImages: (id: string, newImages: string[]) => void;
  onDeleteImage: (id: string, imageIndex: number) => void;
  isCourseRep?: boolean;
}

export const AssignmentDetailsView: React.FC<AssignmentDetailsViewProps> = ({
  assignment,
  onBack,
  onToggleComplete,
  onEdit,
  onDelete,
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

  const images = assignment.images || [];

  const handleOpenViewer = (index: number) => {
    setSelectedImageIndex(index);
    setIsViewerOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    let processed = 0;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result && typeof reader.result === 'string') {
          newImages.push(reader.result as string);
        }
        processed++;
        if (processed === files.length) {
          onAddImages(assignment.id, newImages);
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
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

  const priorityColor =
    assignment.priority === 'High'
      ? 'text-rose-700 bg-rose-50 border-rose-200/80'
      : assignment.priority === 'Medium'
      ? 'text-amber-700 bg-amber-50 border-amber-200/80'
      : 'text-blue-700 bg-blue-50 border-blue-200/80';

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
          <span>Deadlines</span>
        </motion.button>

        <div className="flex items-center gap-2">
          {isCourseRep && (
            <>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-3.5 py-2 min-h-[40px] rounded-full bg-blue-50 hover:bg-blue-100 text-[#007AFF] text-[12px] font-bold border border-blue-200/60 shadow-2xs transition-all cursor-pointer touch-target"
                title="Add photos or diagrams"
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

              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => onEdit(assignment)}
                className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-slate-700 border border-white/90 shadow-2xs transition-all cursor-pointer touch-target"
                title="Edit deadline"
              >
                <Edit3 className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-red-50/80 hover:bg-red-100 text-red-600 border border-red-200/60 shadow-2xs transition-all cursor-pointer touch-target"
                title="Delete deadline"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* 1. IMAGES AT THE TOP (FIRST THING - UNCONTAINED SLIDER) */}
      {images.length > 0 && (
        <div className="space-y-2.5 pt-1">
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
                  alt={`Assignment diagram ${idx + 1}`}
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

                {isCourseRep && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove photo ${idx + 1}?`)) {
                        onDeleteImage(assignment.id, idx);
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

          {/* Slider Navigation Dots & Prev/Next */}
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

      {/* 2. ALL OTHER DETAILS COME AFTER IMAGES (UNCONTAINED) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4 px-1 pt-1"
      >
        {/* Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-extrabold text-[#007AFF] bg-blue-50/90 px-3 py-1 rounded-full border border-blue-200/70 shadow-2xs">
              {assignment.course}
            </span>
            <span className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full border shadow-2xs ${priorityColor}`}>
              {assignment.priority} Priority
            </span>
            {assignment.level && (
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-slate-200/70 text-slate-700">
                {assignment.level}L
              </span>
            )}
          </div>

          <span
            className={`text-[11.5px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-2xs ${
              assignment.isCompleted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {assignment.isCompleted ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Completed</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Pending</span>
              </>
            )}
          </span>
        </div>

        {/* Title */}
        <div>
          <h1
            className={`text-[20px] sm:text-[22px] font-bold tracking-tight leading-snug ${
              assignment.isCompleted
                ? 'text-slate-500 line-through decoration-emerald-500/70 decoration-2'
                : 'text-[#1C1C1E]'
            }`}
          >
            {assignment.title}
          </h1>
        </div>

        {/* Due Date Info Row */}
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-slate-600">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 bg-white/80 px-3 py-1 rounded-full border border-black/5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>Due: <strong className="font-semibold text-slate-900">{assignment.dueDate}</strong> {assignment.dueTime && `(${assignment.dueTime})`}</span>
          </div>
          {assignment.semester && (
            <span className="text-[11.5px] font-medium text-slate-500 px-2.5 py-1 rounded-full bg-slate-100">
              {assignment.semester}
            </span>
          )}
        </div>

        {/* Toggle Complete Button */}
        <div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.01 }}
            onClick={() => onToggleComplete(assignment.id)}
            className={`w-full min-h-[46px] py-3 px-4 rounded-[18px] font-bold text-[13.5px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm touch-target ${
              assignment.isCompleted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-[#007AFF] hover:bg-[#0062cc] text-white shadow-blue-600/25'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {assignment.isCompleted ? 'Mark as Pending (Undo)' : 'Mark Assignment as Complete'}
            </span>
          </motion.button>
        </div>

        {/* Requirements & Instructions - Clean Uncontained Typography */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-[15px] font-bold text-[#1C1C1E]">Requirements & Instructions</h3>
          </div>
          <p className="text-[14px] text-slate-700 leading-relaxed font-normal whitespace-pre-line pt-0.5">
            {assignment.description || 'No additional instructions provided for this assignment.'}
          </p>
        </div>

        {/* Submission Format & Instructor Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="bg-white/60 p-3.5 rounded-2xl border border-black/5 shadow-2xs space-y-1">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
              Submission Format
            </span>
            <p className="text-[13.5px] font-bold text-[#1C1C1E]">
              {assignment.submissionType || 'Student Portal Submission'}
            </p>
          </div>

          <div className="bg-white/60 p-3.5 rounded-2xl border border-black/5 shadow-2xs space-y-1">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
              Instructor / Examiner
            </span>
            <p className="text-[13.5px] font-bold text-[#1C1C1E]">
              {assignment.instructor || 'Faculty Department'}
            </p>
          </div>
        </div>

        {/* Additional Notes & Hints */}
        {assignment.notes && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h4 className="text-[14px] font-bold text-[#1C1C1E]">Instructor Notes & Hints</h4>
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed bg-amber-50/40 p-3.5 rounded-2xl border border-amber-200/50">
              {assignment.notes}
            </p>
          </div>
        )}

        {/* Tags */}
        {assignment.tags && assignment.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {assignment.tags.map((t) => (
              <span
                key={t}
                className="text-[11px] font-semibold text-slate-600 bg-white/70 px-3 py-1 rounded-full border border-black/5 shadow-2xs"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Image Lightbox Viewer Modal */}
      {selectedImageIndex !== null && images.length > 0 && (
        <ImageViewerModal
          isOpen={isViewerOpen}
          images={images}
          initialIndex={selectedImageIndex}
          title={`${assignment.course} - ${assignment.title}`}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedImageIndex(null);
          }}
          onDeleteImage={
            isCourseRep
              ? (idx) => {
                  onDeleteImage(assignment.id, idx);
                  if (images.length <= 1) {
                    setIsViewerOpen(false);
                    setSelectedImageIndex(null);
                  }
                }
              : undefined
          }
        />
      )}

      {/* Confirm Delete Deadline Modal */}
      <ConfirmDeleteModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await onDelete(assignment.id);
            setIsConfirmDeleteOpen(false);
            onBack();
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Academic Deadline"
        itemType="assignment / deadline"
        itemName={`${assignment.course} - ${assignment.title}`}
        description="Are you sure you want to permanently delete this deadline notice?"
        confirmLabel="Yes, Delete Deadline"
        isDeleting={isDeleting}
      />
    </div>
  );
};
