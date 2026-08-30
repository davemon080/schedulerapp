import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EventItem } from '../types';
import { X, Check, Clock, MapPin, Tag } from 'lucide-react';
import { normalizeSemester, resolveStudentDepartmentId, filterCoursesForStudentScope } from '../lib/academicScope';

interface EventEditModalProps {
  isOpen: boolean;
  event: EventItem | null;
  selectedDayKey: string;
  onClose: () => void;
  onSave: (event: EventItem) => void;
  courses?: any[];
  currentSemester?: string;
  userSession?: any;
}

export const EventEditModal: React.FC<EventEditModalProps> = ({
  isOpen,
  event,
  selectedDayKey,
  onClose,
  onSave,
  courses = [],
  currentSemester = '1st Semester',
  userSession,
}) => {
  const [course, setCourse] = useState('');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPostponed, setIsPostponed] = useState(false);

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
    if (event) {
      setCourse(event.course);
      setTitle(event.title);
      setTime(event.time);
      setLocation(event.location);
      setTags(event.tags || ['Tutorial', 'Physical Class']);
      setIsPostponed(Boolean(event.isPostponed));
    } else {
      const initialCourse = semesterCourses.length > 0 ? (semesterCourses[0].courseCode || semesterCourses[0].code) : '';
      const initialTitle = semesterCourses.length > 0 ? (semesterCourses[0].title || semesterCourses[0].name) : '';
      setCourse(initialCourse);
      setTitle(initialTitle);
      setTime('09:00 AM - 11:00 AM');
      setLocation('Lecture Theatre 1');
      setTags(['Tutorial', 'Physical Class']);
      setIsPostponed(false);
    }
  }, [event, isOpen]);

  if (!isOpen) return null;

  const handleSelectCourse = (selectedCode: string) => {
    setCourse(selectedCode);
    const matched = semesterCourses.find(
      (c) => (c.courseCode || c.code)?.toUpperCase() === selectedCode.toUpperCase()
    );
    if (matched && (!title || title.trim() === '' || semesterCourses.some((c) => (c.title || c.name) === title))) {
      setTitle(matched.title || matched.name || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!course.trim() || !title.trim()) return;

    const resolvedDeptId = deptId || 'dept-ich';

    const savedEvent: EventItem = {
      id: event?.id || `evt-${Date.now()}`,
      course: course.trim().toUpperCase(),
      title: title.trim(),
      time: time.trim() || '08:00 AM - 10:00 AM',
      location: location.trim() || 'Hall B, Science Complex',
      views: event?.views || '1 view',
      tags: tags.length > 0 ? tags : ['Tutorial', 'Physical Class'],
      isPostponed,
      dayKey: event?.dayKey || selectedDayKey,
      department_id: resolvedDeptId,
      level: activeLevel,
      semester: activeSemester,
    };

    onSave(savedEvent);
    onClose();
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
          className="fixed inset-0 bg-black/35 backdrop-blur-md"
        />

        {/* Modal Window / Drawer sliding from under the app */}
        <motion.div
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-lg z-10 mx-auto px-3 pb-6 pt-2"
        >
          <div className="glass-sheet rounded-[32px] p-6 max-h-[85vh] overflow-y-auto no-scrollbar shadow-[0_20px_60px_rgba(0,0,0,0.16)] border border-white">
            {/* Grabber Bar */}
            <div className="w-12 h-1.5 bg-black/20 rounded-full mx-auto mb-3" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/5 mb-4">
              <div>
                <h3 className="text-[19px] font-bold text-[#1C1C1E] tracking-tight">
                  {event ? 'Edit Activity' : 'Add New Activity'}
                </h3>
                <p className="text-[12px] text-[#8E8E93]">
                  {selectedDayKey} • University Schedule
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-500 active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Course Code Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
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
                      className="w-full px-3.5 py-2.5 rounded-[16px] bg-white/80 backdrop-blur-md border border-slate-200/90 text-[#1C1C1E] text-[13.5px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#007AFF] shadow-xs cursor-pointer appearance-none transition-all"
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
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. ICH 101, CHM 101"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[16px] bg-white/70 backdrop-blur-md border border-white/80 text-[#1C1C1E] text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#007AFF] shadow-xs transition-all"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Course Title */}
              <div>
                <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1">
                  Activity Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physics tutorial, Organic Chemistry Lab"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[16px] bg-white/70 backdrop-blur-md border border-white/80 text-[#1C1C1E] text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#007AFF] shadow-xs transition-all"
                  required
                />
              </div>

              {/* Time & Location Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#007AFF]" /> Time Range
                  </label>
                  <input
                    type="text"
                    placeholder="08:00 AM - 10:00 AM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-[14px] bg-white/70 backdrop-blur-md border border-white/80 text-[13px] text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> Venue / Room
                  </label>
                  <input
                    type="text"
                    placeholder="Hall B, Science Complex"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-[14px] bg-white/70 backdrop-blur-md border border-white/80 text-[13px] text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-500" /> Tags
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add tag (e.g. Practical, Online)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-[12px] bg-white/70 backdrop-blur-md border border-white/80 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3.5 py-1.5 rounded-[12px] bg-[#007AFF] text-white text-[12px] font-semibold active:scale-95 transition-all cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] bg-white/80 text-slate-700 border border-black/5 shadow-2xs font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-500 ml-0.5 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Postponed Checkbox */}
              <div className="flex items-center gap-2.5 p-3 rounded-[18px] bg-amber-50/80 backdrop-blur-sm border border-amber-200/70 shadow-xs">
                <input
                  type="checkbox"
                  id="isPostponed"
                  checked={isPostponed}
                  onChange={(e) => setIsPostponed(e.target.checked)}
                  className="w-4 h-4 text-[#007AFF] rounded focus:ring-0 cursor-pointer"
                />
                <label
                  htmlFor="isPostponed"
                  className="text-[13px] font-medium text-amber-900 cursor-pointer select-none"
                >
                  Mark this event with "Postponed" status badge
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-[18px] bg-white/80 hover:bg-white text-[#1C1C1E] text-[14px] font-semibold border border-black/5 active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-[18px] bg-[#007AFF] hover:bg-blue-600 text-white text-[14px] font-semibold shadow-[0_6px_20px_rgba(0,122,255,0.35)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
