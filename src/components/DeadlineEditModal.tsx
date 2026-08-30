import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AssignmentItem } from '../types';
import {
  X,
  Check,
  Clock,
  Calendar,
  Image as ImageIcon,
  Trash2,
  Upload,
  Plus,
  BookOpen,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { normalizeSemester, resolveStudentDepartmentId, filterCoursesForStudentScope } from '../lib/academicScope';

interface DeadlineEditModalProps {
  isOpen: boolean;
  assignment: AssignmentItem | null;
  onClose: () => void;
  onSave: (assignment: AssignmentItem) => void;
  courses?: any[];
  currentSemester?: string;
  userSession?: any;
}

export const DeadlineEditModal: React.FC<DeadlineEditModalProps> = ({
  isOpen,
  assignment,
  onClose,
  onSave,
  courses = [],
  currentSemester = '1st Semester',
  userSession,
}) => {
  const [course, setCourse] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('11:59 PM');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [description, setDescription] = useState('');
  const [submissionType, setSubmissionType] = useState('Online Student Portal PDF');
  const [maxGrade, setMaxGrade] = useState('100 pts');
  const [instructor, setInstructor] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine student's active department, level and semester
  const studentMatric = userSession?.matricNumber || '';
  const studentDeptRaw = userSession?.department || 'Department of Industrial Chemistry';
  const studentDeptId = userSession?.department_id || '';

  const rawLevel = userSession?.level || userSession?.yearLevel;
  let activeLevel = 100;
  if (typeof rawLevel === 'number') {
    activeLevel = rawLevel;
  } else if (typeof rawLevel === 'string') {
    const p = parseInt(rawLevel.replace(/\D/g, ''), 10);
    if (!isNaN(p) && p >= 100) activeLevel = p;
  }

  const activeSemester = normalizeSemester(
    (userSession as any)?.semester ||
    (userSession as any)?.current_semester ||
    (userSession as any)?.academicSemester ||
    currentSemester
  );

  const deptInfo = resolveStudentDepartmentId(userSession);
  const deptId = deptInfo.id;

  // Filter semester courses strictly by student department, level, and semester
  const semesterCourses = filterCoursesForStudentScope(courses, deptId, activeLevel, activeSemester);

  useEffect(() => {
    if (assignment) {
      setCourse(assignment.course);
      setTitle(assignment.title);
      setDueDate(assignment.dueDate);
      setDueTime(assignment.dueTime || '11:59 PM');
      setPriority(assignment.priority);
      setDescription(assignment.description);
      setSubmissionType(assignment.submissionType || 'Online Student Portal PDF');
      setMaxGrade(assignment.maxGrade || '100 pts');
      setInstructor(assignment.instructor || '');
      setNotes(assignment.notes || '');
      setImages(assignment.images || []);
      setTags(assignment.tags || ['Assignment']);
    } else {
      const initialCourse = semesterCourses.length > 0 ? (semesterCourses[0].courseCode || semesterCourses[0].code) : '';
      setCourse(initialCourse);
      setTitle('');
      setDueDate('Friday, Oct 21');
      setDueTime('11:59 PM');
      setPriority('High');
      setDescription('');
      setSubmissionType('Online Student Portal PDF');
      setMaxGrade('100 pts (15% CA)');
      setInstructor('Prof. A. Adeleke');
      setNotes('');
      setImages([]);
      setTags(['Assignment', 'Individual']);
    }
  }, [assignment, isOpen]);

  const handleSelectCourse = (selectedCode: string) => {
    setCourse(selectedCode);
    const matched = semesterCourses.find(
      (c) => (c.courseCode || c.code)?.toUpperCase() === selectedCode.toUpperCase()
    );
    if (matched && (!title || title.trim() === '')) {
      setTitle(`${matched.courseCode || matched.code}: Assignment 1`);
    }
  };

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result && typeof reader.result === 'string') {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!course.trim() || !title.trim()) return;

    const resolvedDeptId = deptId || 'dept-ich';

    const savedAssignment: AssignmentItem = {
      id: assignment?.id || `asn-${Date.now()}`,
      course: course.trim().toUpperCase(),
      title: title.trim(),
      dueDate: dueDate.trim() || 'Friday, Oct 21',
      dueTime: dueTime.trim() || '11:59 PM',
      priority,
      description: description.trim() || 'Please submit according to standard course requirements.',
      isCompleted: assignment?.isCompleted || false,
      completedAt: assignment?.completedAt,
      maxGrade: maxGrade.trim() || '100 pts',
      submissionType: submissionType.trim() || 'Online Student Portal PDF',
      instructor: instructor.trim() || 'Course Lecturer',
      notes: notes.trim(),
      tags: tags.length > 0 ? tags : ['Assignment'],
      images,
      department_id: resolvedDeptId,
      level: activeLevel,
      semester: activeSemester,
    };

    onSave(savedAssignment);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-md"
        />

        {/* Modal Drawer sliding up from the bottom */}
        <motion.div
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-lg z-10 mx-auto px-3 pb-6 pt-2"
        >
          <div className="glass-container-solid rounded-[32px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-white max-h-[85vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#007AFF] border border-blue-200/60">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">
                    {assignment ? 'Edit Assignment / Deadline' : 'Add New Deadline'}
                  </h3>
                  <p className="text-[11.5px] text-[#8E8E93]">
                    Set assignment requirements, due dates & attach diagrams
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200/80 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {/* Course Selection Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[12px] font-semibold text-[#1C1C1E]">
                    Course Code ({activeSemester}) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {semesterCourses.length} courses registered
                  </span>
                </div>

                {semesterCourses.length > 0 ? (
                  <div className="relative">
                    <select
                      value={course}
                      onChange={(e) => handleSelectCourse(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[18px] bg-white/85 border border-slate-200 text-[13px] text-[#1C1C1E] font-semibold focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-xs cursor-pointer appearance-none transition-all"
                      required
                    >
                      <option value="" disabled>-- Select Registered Course --</option>
                      {semesterCourses.map((crs: any) => {
                        const code = crs.courseCode || crs.code;
                        const cTitle = crs.title || crs.name;
                        return (
                          <option key={crs.id || code} value={code}>
                            {code} — {cTitle}
                          </option>
                        );
                      })}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                      </svg>
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. ICH 101 or CHM 101"
                    value={course}
                    onChange={(e) => setCourse(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white/70 border border-slate-200 text-[13px] text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
                  />
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1.5">
                  Assignment Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Titration Lab Report Submission"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[18px] bg-white/70 border border-slate-200 text-[13px] text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
                />
              </div>

              {/* Due Date, Time & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tomorrow, Oct 20"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-[16px] bg-white/70 border border-slate-200 text-[12.5px] text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1.5">
                    Due Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 11:59 PM"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-[16px] bg-white/70 border border-slate-200 text-[12.5px] text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1.5">
                    Priority
                  </label>
                  <div className="flex gap-1">
                    {(['High', 'Medium', 'Low'] as const).map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-2 rounded-[14px] text-[11px] font-bold border transition-all cursor-pointer ${
                          priority === p
                            ? p === 'High'
                              ? 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                              : p === 'Medium'
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-blue-500 text-white border-blue-600 shadow-2xs'
                            : 'bg-white/60 text-slate-500 border-slate-200 hover:bg-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description / Instructions */}
              <div>
                <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1.5">
                  Instructions & Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Details on what is required, calculation requirements, formatting..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[18px] bg-white/70 border border-slate-200 text-[12.5px] text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 resize-none"
                />
              </div>

              {/* Submission Format */}
              <div>
                <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1.5">
                  Submission Format
                </label>
                <input
                  type="text"
                  placeholder="e.g. Online Student Portal PDF"
                  value={submissionType}
                  onChange={(e) => setSubmissionType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[18px] bg-white/70 border border-slate-200 text-[12.5px] text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                />
              </div>

              {/* Image Attachments Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-semibold text-[#1C1C1E] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span>Assignment Images & Photos ({images.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11.5px] font-bold text-[#007AFF] bg-blue-50/90 hover:bg-blue-100/80 px-3 py-1 rounded-full border border-blue-200/60 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Attach Photo</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {images.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-2.5 rounded-[20px] bg-slate-50/80 border border-slate-200/80">
                    {images.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden aspect-square border border-white shadow-2xs"
                      >
                        <img
                          src={imgUrl}
                          alt={`Attachment ${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-[#007AFF] hover:bg-blue-50/30 rounded-xl aspect-square flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-[#007AFF] transition-all cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[10px] font-semibold">Add More</span>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-[#007AFF]/60 rounded-[20px] p-4 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all"
                  >
                    <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                    <p className="text-[12px] font-medium text-slate-600">
                      Click to upload assignment diagrams, question sheets, or photos
                    </p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">Supports PNG, JPG, WEBP</p>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1.5">
                  Tags & Category
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. Lab Report, Homework, Calculations..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-[16px] bg-white/70 border border-slate-200 text-[12px] text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3.5 py-2 rounded-[16px] bg-white/80 hover:bg-white text-[#007AFF] text-[12px] font-bold border border-blue-200/60 cursor-pointer shadow-2xs"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-[#007AFF] border border-blue-100 flex items-center gap-1.5"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-[20px] bg-white/80 hover:bg-white text-slate-600 font-bold text-[13px] border border-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-[20px] bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-[13px] shadow-[0_10px_24px_rgba(0,122,255,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{assignment ? 'Save Changes' : 'Create Deadline'}</span>
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
