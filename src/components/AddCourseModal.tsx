import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Hash, Layers, FileText, Check, AlertCircle, Building2, GraduationCap } from 'lucide-react';
import { DepartmentRecord } from '../admin/types';

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

const DEFAULT_DEPARTMENTS: DepartmentRecord[] = [
  { id: 'dept-ich', name: 'Department of Industrial Chemistry', code: 'ICH' },
  { id: 'dept-chm', name: 'Department of Chemistry', code: 'CHM' },
  { id: 'dept-csc', name: 'Department of Computer Science', code: 'CSC' },
  { id: 'dept-bch', name: 'Department of Biochemistry', code: 'BCH' },
  { id: 'dept-mcb', name: 'Department of Microbiology', code: 'MCB' },
];

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  departmentName,
  departmentId,
  currentLevel,
  initialSemester = '1st Semester',
  editingCourse = null,
  availableDepartments = [],
}) => {
  const depts = availableDepartments.length > 0 ? availableDepartments : DEFAULT_DEPARTMENTS;

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    editingCourse?.department_id || departmentId || 'dept-ich'
  );
  const [courseCode, setCourseCode] = useState(editingCourse?.courseCode || editingCourse?.code || '');
  const [title, setTitle] = useState(editingCourse?.title || editingCourse?.name || '');
  const [units, setUnits] = useState<number>(
    typeof editingCourse?.units === 'number'
      ? editingCourse.units
      : parseInt(String(editingCourse?.units || '3').replace(/\D/g, ''), 10) || 3
  );
  const [semester, setSemester] = useState<string>(
    editingCourse?.semester || (initialSemester === 'all' ? '1st Semester' : initialSemester)
  );
  const [level, setLevel] = useState<number>(editingCourse?.level || currentLevel || 100);
  const [description, setDescription] = useState(editingCourse?.description || '');
  const [pdfurl, setPdfurl] = useState(editingCourse?.pdfurl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset form when modal opens with new course or empty
  React.useEffect(() => {
    if (isOpen) {
      if (editingCourse) {
        setSelectedDeptId(editingCourse.department_id || departmentId || 'dept-ich');
        setCourseCode(editingCourse.courseCode || editingCourse.code || '');
        setTitle(editingCourse.title || editingCourse.name || '');
        setUnits(
          typeof editingCourse.units === 'number'
            ? editingCourse.units
            : parseInt(String(editingCourse.units || '3').replace(/\D/g, ''), 10) || 3
        );
        setSemester(editingCourse.semester || '1st Semester');
        setLevel(editingCourse.level || currentLevel || 100);
        setDescription(editingCourse.description || '');
        setPdfurl(editingCourse.pdfurl || '');
      } else {
        setSelectedDeptId(departmentId || 'dept-ich');
        setCourseCode('');
        setTitle('');
        setUnits(3);
        setSemester(initialSemester === 'all' ? '1st Semester' : initialSemester);
        setLevel(currentLevel || 100);
        setDescription('');
        setPdfurl('');
      }
      setErrorMsg('');
    }
  }, [isOpen, editingCourse, currentLevel, initialSemester, departmentId]);

  if (!isOpen) return null;

  const currentDeptObj = depts.find((d) => d.id === selectedDeptId) || {
    id: selectedDeptId,
    name: departmentName || 'Department of Industrial Chemistry',
    code: 'ICH',
  };

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
        semester,
        level: Number(level) || 100,
        department_id: selectedDeptId || 'dept-ich',
        departmentName: currentDeptObj.name,
        description: description.trim(),
        pdfurl: pdfurl.trim(),
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-lg bg-white rounded-[32px] p-6 shadow-2xl border border-slate-200 z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                  Course Management
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                  {level}L
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-200">
                  {semester}
                </span>
              </div>
              <h3 className="text-[19px] font-bold text-slate-900 mt-1">
                {editingCourse ? 'Edit Course' : 'Add New Department Course'}
              </h3>
              <p className="text-[12px] text-slate-500 mt-0.5">
                {currentDeptObj.name}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 active:scale-95 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Department Selection */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Target Department <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {depts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code || 'DEPT'})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                This course will strictly only be visible within this department's dashboard.
              </p>
            </div>

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
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Row 2: Semester & Academic Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Semester <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Academic Level <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <select
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value={100}>100 Level</option>
                    <option value={200}>200 Level</option>
                    <option value={300}>300 Level</option>
                    <option value={400}>400 Level</option>
                    <option value={500}>500 Level</option>
                  </select>
                </div>
              </div>
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
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Syllabus PDF / Resource Link */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Official Syllabus PDF / Resource URL (Optional)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://..."
                  value={pdfurl}
                  onChange={(e) => setPdfurl(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
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
