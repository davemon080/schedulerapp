import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Hash, Check, AlertCircle } from 'lucide-react';
import { DepartmentRecord } from '@admin/types';

export interface CourseFormData {
  courseCode: string;
  title: string;
  units: number;
  semester: string;
  level: number;
  department_id?: string;
  departmentName?: string;
  description?: string;
  pdfurl?: string;
}

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (courseData: CourseFormData) => Promise<boolean | void>;
  departmentName: string;
  departmentId: string;
  currentLevel: number;
  initialSemester?: string;
  editingCourse?: any | null;
  availableDepartments?: DepartmentRecord[];
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  departmentName,
  departmentId,
  currentLevel,
  initialSemester = '1st Semester',
  editingCourse = null,
}) => {
  const [courseCode, setCourseCode] = useState(editingCourse?.courseCode || editingCourse?.code || '');
  const [title, setTitle] = useState(editingCourse?.title || editingCourse?.name || '');
  const [units, setUnits] = useState<number>(
    typeof editingCourse?.units === 'number'
      ? editingCourse.units
      : parseInt(String(editingCourse?.units || '3').replace(/\D/g, ''), 10) || 3
  );
  const [description, setDescription] = useState(editingCourse?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fixed academic scope derived from the course rep's active session
  const targetLevel = Number(editingCourse?.level || currentLevel || 100);
  const targetSemester = editingCourse?.semester || (initialSemester === 'all' ? '1st Semester' : initialSemester || '1st Semester');
  const targetDeptId = departmentId || editingCourse?.department_id || 'dept-ich';
  const targetDeptName = departmentName || editingCourse?.departmentName || 'Department of Industrial Chemistry';

  // Reset form when modal opens with new course or empty
  React.useEffect(() => {
    if (isOpen) {
      if (editingCourse) {
        setCourseCode(editingCourse.courseCode || editingCourse.code || '');
        setTitle(editingCourse.title || editingCourse.name || '');
        setUnits(
          typeof editingCourse.units === 'number'
            ? editingCourse.units
            : parseInt(String(editingCourse.units || '3').replace(/\D/g, ''), 10) || 3
        );
        setDescription(editingCourse.description || '');
      } else {
        setCourseCode('');
        setTitle('');
        setUnits(3);
        setDescription('');
      }
      setErrorMsg('');
    }
  }, [isOpen, editingCourse]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim()) {
      setErrorMsg('Course Code is required (e.g. ICH 101)');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Course Title is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onSave({
        courseCode: courseCode.trim().toUpperCase(),
        title: title.trim(),
        units: Number(units) || 3,
        semester: targetSemester,
        level: targetLevel,
        department_id: targetDeptId,
        departmentName: targetDeptName,
        description: description.trim(),
        pdfurl: editingCourse?.pdfurl || '',
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save course. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-md">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="glass-container-solid relative w-full max-w-lg rounded-[32px] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)] border border-white z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-black/5 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 font-bold text-[11px] border border-blue-200/60">
                  Course Rep Portal
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-black/5 text-slate-700 font-bold text-[11px]">
                  {targetLevel} Level
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 font-bold text-[11px] border border-indigo-200/60">
                  {targetSemester}
                </span>
              </div>
              <h3 className="text-[19px] font-bold text-[#1C1C1E] mt-1.5 tracking-tight">
                {editingCourse ? 'Edit Course' : 'Add New Department Course'}
              </h3>
              <p className="text-[12px] text-slate-500 mt-0.5 font-medium">
                {targetDeptName}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-500 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Code and Units */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Course Code <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. ICH 101"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-white/60 focus:bg-white border border-black/10 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase font-mono transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Credit Units
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <select
                    value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-white/60 focus:bg-white border border-black/10 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all"
                  >
                    <option value={1}>1 Unit</option>
                    <option value={2}>2 Units</option>
                    <option value={3}>3 Units</option>
                    <option value={4}>4 Units</option>
                    <option value={6}>6 Units (Project/SIWES)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Course Title */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Course Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Introduction to Industrial Chemistry"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/60 focus:bg-white border border-black/10 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Course Description / Syllabus */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Syllabus / Course Description (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Key topics, lab requirements, recommended textbooks..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/60 focus:bg-white border border-black/10 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 bg-black/5 hover:bg-black/10 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#007AFF] hover:bg-blue-600 active:scale-95 shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Save Course'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
