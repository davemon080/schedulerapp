import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AssignmentItem } from '../types';
import {
  ChevronLeft,
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
import { ConfirmDeleteModal } from '../admin/ConfirmDeleteModal';

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
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const priorityColor =
    assignment.priority === 'High'
      ? 'text-rose-600 bg-rose-50 border-rose-200/80'
      : assignment.priority === 'Medium'
      ? 'text-amber-600 bg-amber-50 border-amber-200/80'
      : 'text-blue-600 bg-blue-50 border-blue-200/80';

  return (
    <div className="space-y-4 pb-16 pt-1">
      {/* Top Bar with Back Button & Actions */}
      <div className="flex items-center justify-between gap-3 px-1">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/70 hover:bg-white text-[13px] font-semibold text-[#007AFF] border border-white/90 shadow-2xs transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Deadlines</span>
        </motion.button>

        {isCourseRep && (
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => onEdit(assignment)}
              className="p-2 rounded-full bg-white/70 hover:bg-white text-slate-700 border border-white/90 shadow-2xs transition-all cursor-pointer"
              title="Edit assignment"
            >
              <Edit3 className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="p-2 rounded-full bg-red-50/80 hover:bg-red-100 text-red-600 border border-red-200/60 shadow-2xs transition-all cursor-pointer"
              title="Delete assignment"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        )}
      </div>

      {/* Main Assignment Banner Card */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`glass-container-solid rounded-[24px] p-4 sm:p-4.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border transition-all ${
          assignment.isCompleted
            ? 'border-emerald-200/80 bg-emerald-50/20'
            : 'border-white/90'
        }`}
      >
        {/* Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-extrabold text-[#007AFF] bg-blue-50/90 px-2.5 py-0.5 rounded-full border border-blue-200/70 shadow-2xs">
              {assignment.course}
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${priorityColor}`}>
              {assignment.priority} Priority
            </span>
          </div>

          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-2xs ${
              assignment.isCompleted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {assignment.isCompleted ? (
              <>
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Completed</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" />
                <span>Pending</span>
              </>
            )}
          </span>
        </div>

        {/* Title */}
        <h1
          className={`text-[17px] sm:text-[19px] font-bold tracking-tight leading-snug ${
            assignment.isCompleted
              ? 'text-slate-500 line-through decoration-emerald-500/70 decoration-2'
              : 'text-[#1C1C1E]'
          }`}
        >
          {assignment.title}
        </h1>

        {/* Due Date Info Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-black/5 text-[12px] text-[#8E8E93]">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 bg-white/70 px-2.5 py-1 rounded-full border border-black/5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>Due: {assignment.dueDate} {assignment.dueTime && `(${assignment.dueTime})`}</span>
          </div>
        </div>

        {/* Mark Complete Button */}
        <div className="mt-3.5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.01 }}
            onClick={() => onToggleComplete(assignment.id)}
            className={`w-full py-2.5 px-4 rounded-[18px] font-bold text-[13px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
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
      </motion.div>

      {/* Assignment Images & Attachments Gallery */}
      <div className="glass-container rounded-[28px] p-5 sm:p-6 space-y-3.5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#007AFF]">
              <ImageIcon className="w-4 h-4" />
            </div>
            <h3 className="text-[16px] font-bold text-[#1C1C1E]">
              Assignment Images & Diagrams ({assignment.images?.length || 0})
            </h3>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {assignment.images && assignment.images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            {assignment.images.map((imgUrl, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -2 }}
                onClick={() => handleOpenViewer(idx)}
                className="group relative rounded-[18px] overflow-hidden aspect-[4/3] bg-slate-100 border border-white shadow-sm cursor-pointer"
              >
                <img
                  src={imgUrl}
                  alt={`Assignment diagram ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Hover Overlay with Zoom Icon */}
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-[2px]">
                  <div className="p-2 rounded-full bg-white/90 text-slate-800 shadow-md">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="absolute bottom-1.5 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-semibold text-white">
                  Photo {idx + 1}
                </div>
              </motion.div>
            ))}

            {/* Quick Add More Card */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-[#007AFF]/60 rounded-[18px] aspect-[4/3] flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-[#007AFF] hover:bg-blue-50/20 transition-all cursor-pointer p-2"
            >
              <Plus className="w-6 h-6" />
              <span className="text-[11px] font-bold">Attach Photo</span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-[#007AFF]/60 rounded-[22px] p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all"
          >
            <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-[13px] font-semibold text-slate-700">No images attached yet</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">
              Click to upload question diagrams, equations, or handwritten solution drafts
            </p>
          </div>
        )}
      </div>

      {/* Description & Instructions Card */}
      <div className="glass-container rounded-[28px] p-5 sm:p-6 space-y-2.5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-[16px] font-bold text-[#1C1C1E]">Requirements & Instructions</h3>
        </div>
        <p className="text-[13.5px] text-slate-600 leading-relaxed font-normal pt-1">
          {assignment.description || 'No additional instructions provided for this assignment.'}
        </p>
      </div>

      {/* Submission Method & Instructor Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="glass-container rounded-[24px] p-4 space-y-1.5 border border-white/80">
          <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
            Submission Format
          </span>
          <p className="text-[13.5px] font-bold text-[#1C1C1E]">
            {assignment.submissionType || 'Student Portal Submission'}
          </p>
        </div>

        <div className="glass-container rounded-[24px] p-4 space-y-1.5 border border-white/80">
          <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
            Instructor / Examiner
          </span>
          <p className="text-[13.5px] font-bold text-[#1C1C1E]">
            {assignment.instructor || 'Faculty Department'}
          </p>
        </div>
      </div>

      {/* Additional Notes & Tags */}
      {assignment.notes && (
        <div className="glass-container rounded-[26px] p-5 space-y-2 border border-white/80">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h4 className="text-[14px] font-bold text-[#1C1C1E]">Instructor Notes & Hints</h4>
          </div>
          <p className="text-[12.5px] text-slate-600 leading-relaxed">{assignment.notes}</p>
        </div>
      )}

      {/* Tags */}
      {assignment.tags && assignment.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1">
          {assignment.tags.map((t) => (
            <span
              key={t}
              className="text-[11px] font-semibold text-slate-500 bg-white/70 px-3 py-1 rounded-full border border-black/5 shadow-2xs"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Image Lightbox Viewer Modal */}
      {assignment.images && (
        <ImageViewerModal
          isOpen={isViewerOpen}
          images={assignment.images}
          initialIndex={selectedImageIndex || 0}
          title={`${assignment.course} - ${assignment.title}`}
          onClose={() => setIsViewerOpen(false)}
          onDeleteImage={(idx) => {
            onDeleteImage(assignment.id, idx);
            if (assignment.images.length <= 1) {
              setIsViewerOpen(false);
            }
          }}
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
        description="Are you sure you want to delete this assignment deadline? It will be permanently removed from your task board."
        confirmLabel="Yes, Delete Deadline"
        isDeleting={isDeleting}
      />
    </div>
  );
};
