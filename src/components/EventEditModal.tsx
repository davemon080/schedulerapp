import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EventItem, DayTimelineItem } from '../types';
import { X, Check, Clock, MapPin, Video, Globe, Building2, Link as LinkIcon, BookOpen, Layers, ChevronRight } from 'lucide-react';
import { normalizeSemester, resolveStudentDepartmentId, filterCoursesForStudentScope } from '../lib/academicScope';
import { ClockTimePickerModal } from './ClockTimePickerModal';

interface EventEditModalProps {
  isOpen: boolean;
  event: EventItem | null;
  selectedDayKey: string;
  onClose: () => void;
  onSave: (event: EventItem) => void;
  courses?: any[];
  currentSemester?: string;
  userSession?: any;
  days?: DayTimelineItem[];
}

// Helpers for time conversion
function parseTimeTo24h(str?: string, defaultVal = '08:00'): string {
  if (!str) return defaultVal;
  const clean = str.trim().toUpperCase();
  if (clean.includes(':')) {
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');
    const timeOnly = clean.replace(/AM|PM/g, '').trim();
    const parts = timeOnly.split(':');
    let h = parseInt(parts[0], 10);
    const m = (parseInt(parts[1], 10) || 0).toString().padStart(2, '0');
    if (isNaN(h)) return defaultVal;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m}`;
  }
  return defaultVal;
}

function format24hTo12h(time24: string): string {
  if (!time24) return '08:00 AM';
  const parts = time24.split(':');
  let h = parseInt(parts[0], 10) || 8;
  const m = (parseInt(parts[1], 10) || 0).toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
}

const PRESET_TIMES = [
  { label: '8 - 10 AM', start: '08:00', end: '10:00' },
  { label: '10 - 12 PM', start: '10:00', end: '12:00' },
  { label: '12 - 2 PM', start: '12:00', end: '14:00' },
  { label: '2 - 4 PM', start: '14:00', end: '16:00' },
  { label: '4 - 6 PM', start: '16:00', end: '18:00' },
];

const ACTIVITY_TYPES = [
  { id: 'Lecture', label: 'Lecture' },
  { id: 'Test', label: 'Test' },
  { id: 'Exam', label: 'Exam' },
  { id: 'Practicals', label: 'Practicals' },
  { id: 'Other', label: 'Other' },
];

export const EventEditModal: React.FC<EventEditModalProps> = ({
  isOpen,
  event,
  selectedDayKey,
  onClose,
  onSave,
  courses = [],
  currentSemester = '1st Semester',
  userSession,
  days = [],
}) => {
  const [activityType, setActivityType] = useState('Lecture');
  const [course, setCourse] = useState('');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [deliveryMode, setDeliveryMode] = useState<'physical' | 'online'>('physical');
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('Lecture Theatre 1');
  const [isPostponed, setIsPostponed] = useState(false);

  // Clock picker popup state
  const [isClockPickerOpen, setIsClockPickerOpen] = useState(false);
  const [clockPickerTarget, setClockPickerTarget] = useState<'start' | 'end'>('start');

  // Determine student's active department, level and semester
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

  // Resolve matching day label if available
  const matchedDayObj = days.find((d) => d.id === selectedDayKey);
  const displayDayLabel = matchedDayObj ? `${matchedDayObj.dayName}, ${matchedDayObj.fullDate}` : selectedDayKey;

  useEffect(() => {
    if (event) {
      setCourse(event.course);
      setTitle(event.title);

      // Parse time range
      if (event.time && event.time.includes('-')) {
        const parts = event.time.split('-');
        setStartTime(parseTimeTo24h(parts[0], '08:00'));
        setEndTime(parseTimeTo24h(parts[1], '10:00'));
      } else {
        setStartTime(event.startTime ? event.startTime.substring(0, 5) : '08:00');
        setEndTime(event.endTime ? event.endTime.substring(0, 5) : '10:00');
      }

      const isOnline = event.deliveryMode === 'online' ||
        Boolean(event.meetingLink) ||
        event.tags?.some(t => t.toLowerCase().includes('online')) ||
        event.location?.toLowerCase().includes('meet') ||
        event.location?.toLowerCase().includes('zoom');

      setDeliveryMode(isOnline ? 'online' : 'physical');
      setMeetingLink(event.meetingLink || '');
      setLocation(event.location);
      setIsPostponed(Boolean(event.isPostponed));

      // Extract existing activity type if present in tags
      const foundType = ACTIVITY_TYPES.find(
        (at) => event.tags?.some((t) => t.toLowerCase() === at.id.toLowerCase() || t.toLowerCase() === at.label.toLowerCase())
      );
      if (foundType) {
        setActivityType(foundType.id);
      } else if (event.tags?.some((t) => t.toLowerCase().includes('test') || t.toLowerCase().includes('quiz'))) {
        setActivityType('Test');
      } else if (event.tags?.some((t) => t.toLowerCase().includes('exam'))) {
        setActivityType('Exam');
      } else if (event.tags?.some((t) => t.toLowerCase().includes('practical') || t.toLowerCase().includes('lab'))) {
        setActivityType('Practicals');
      } else if (event.tags?.some((t) => t.toLowerCase().includes('lecture') || t.toLowerCase().includes('class'))) {
        setActivityType('Lecture');
      } else {
        setActivityType('Other');
      }
    } else {
      const initialCourse = semesterCourses.length > 0 ? (semesterCourses[0].courseCode || semesterCourses[0].code) : 'ICH 101';
      const initialTitle = semesterCourses.length > 0 ? (semesterCourses[0].title || semesterCourses[0].name) : 'General Chemistry';
      setCourse(initialCourse);
      setTitle(`${initialTitle} Lecture`);
      setActivityType('Lecture');
      setStartTime('08:00');
      setEndTime('10:00');
      setDeliveryMode('physical');
      setMeetingLink('');
      setLocation('Lecture Theatre 1');
      setIsPostponed(false);
    }
  }, [event, isOpen, selectedDayKey]);

  if (!isOpen) return null;

  // When Course Rep selects an activity category (Lecture, Test, Exam, Practicals, Other)
  const handleSelectActivityCategory = (typeId: string) => {
    setActivityType(typeId);

    if (typeId === 'Other') {
      // "Other" schedule items do not carry any course code
      setCourse('');
      if (!title || title.includes('Lecture') || title.includes('Test') || title.includes('Exam') || title.includes('Practical')) {
        setTitle('General Activity');
      }
      return;
    }

    // For academic activities, ensure a registered course code is assigned
    const matched = semesterCourses.find(
      (c) => (c.courseCode || c.code)?.toUpperCase() === course?.toUpperCase()
    ) || semesterCourses[0];

    const courseCodeStr = matched ? (matched.courseCode || matched.code) : (course || 'ICH 101');
    const courseTitleStr = matched ? (matched.title || matched.name) : 'General Chemistry';

    setCourse(courseCodeStr);

    switch (typeId) {
      case 'Lecture':
        setTitle(`${courseTitleStr} Lecture`);
        break;
      case 'Test':
        setTitle(`${courseTitleStr} Test`);
        break;
      case 'Exam':
        setTitle(`${courseTitleStr} Examination`);
        break;
      case 'Practicals':
        setTitle(`${courseTitleStr} Practical`);
        break;
      default:
        setTitle(courseTitleStr);
        break;
    }
  };

  const handleSelectQuickCourse = (selectedCode: string) => {
    setCourse(selectedCode);
    const matched = semesterCourses.find(
      (c) => (c.courseCode || c.code)?.toUpperCase() === selectedCode.toUpperCase()
    );
    if (matched) {
      setTitle(matched.title || matched.name || '');
    }
  };

  const handleDeliveryModeChange = (mode: 'physical' | 'online') => {
    setDeliveryMode(mode);
    if (mode === 'online') {
      if (!location || location === 'Lecture Theatre 1') {
        setLocation('Google Meet');
      }
    } else {
      if (location === 'Google Meet' || location === 'Online Class') {
        setLocation('Lecture Theatre 1');
      }
    }
  };

  const openClockPicker = (target: 'start' | 'end') => {
    setClockPickerTarget(target);
    setIsClockPickerOpen(true);
  };

  const handleSaveClockTimes = (newStart: string, newEnd: string) => {
    setStartTime(newStart);
    setEndTime(newEnd);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isOther = activityType === 'Other';
    if (!isOther && !course.trim()) return;
    if (!title.trim()) return;

    const resolvedDeptId = deptId || 'dept-ich';
    const formattedTime = `${format24hTo12h(startTime)} - ${format24hTo12h(endTime)}`;
    const finalLocation = deliveryMode === 'online'
      ? (location.trim() || 'Online Class')
      : (location.trim() || 'Lecture Theatre 1');

    // Automatically generate tags based on delivery mode and selected activity type
    const finalTags = [
      deliveryMode === 'online' ? 'Online Class' : 'Physical Class',
      activityType
    ];

    const finalMeetingLink = meetingLink.trim() ? meetingLink.trim() : undefined;

    const savedEvent: EventItem = {
      id: event?.id || `evt-${Date.now()}`,
      course: isOther ? '' : course.trim().toUpperCase(),
      title: title.trim(),
      time: formattedTime,
      startTime: `${startTime}:00`,
      endTime: `${endTime}:00`,
      location: finalLocation,
      deliveryMode,
      meetingLink: finalMeetingLink,
      views: event?.views || '1 view',
      tags: finalTags,
      isPostponed,
      dayKey: selectedDayKey, // Automatically locked to the exact day clicked
      department_id: resolvedDeptId,
      level: activeLevel,
      semester: activeSemester,
    };

    onSave(savedEvent);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
          {/* Backdrop - fast & responsive */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Modal Window / Drawer sliding from bottom */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.08, ease: 'easeOut' }}
            className="relative w-full max-w-lg z-10 mx-auto px-3 pb-6 pt-2"
          >
            <div className="glass-sheet rounded-[32px] p-6 max-h-[88vh] overflow-y-auto no-scrollbar shadow-[0_20px_60px_rgba(0,0,0,0.22)] border border-white">
              {/* Grabber Bar */}
              <div className="w-12 h-1.5 bg-black/20 rounded-full mx-auto mb-3" />

              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-black/5 mb-4">
                <div>
                  <h3 className="text-[19px] font-bold text-[#1C1C1E] tracking-tight">
                    {event ? 'Edit Schedule Activity' : 'Add New Schedule Activity'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-extrabold text-[#007AFF] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                      📅 {displayDayLabel}
                    </span>
                    <span className="text-[11.5px] text-slate-500 font-semibold">
                      {activeLevel}L • {activeSemester}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-500 active:scale-95 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Activity Type Category Selector: Lecture, Test, Exam, Practicals, Other */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[12px] font-semibold text-[#1C1C1E] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#007AFF]" />
                      <span>Activity Category</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] font-medium text-slate-400">
                      Select activity type
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ACTIVITY_TYPES.map((type) => {
                      const isSelected = activityType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => handleSelectActivityCategory(type.id)}
                          className={`py-1.5 px-3 rounded-full text-[12px] font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-xs scale-[1.02]'
                              : 'bg-white/80 hover:bg-white text-slate-600 border-black/5 shadow-2xs'
                          }`}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Course Code Dropdown (Strictly Registered Department Courses) */}
                {activityType === 'Other' ? (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">
                      ℹ️
                    </div>
                    <div>
                      <p className="text-[12.5px] font-bold text-amber-950">Category: Other Activity</p>
                      <p className="text-[11px] text-amber-700">This scheduled item will not carry any course code.</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[12px] font-semibold text-[#1C1C1E] flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#007AFF]" />
                        <span>Course Code</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {semesterCourses.length} courses registered
                      </span>
                    </div>

                    <div className="relative">
                      <select
                        value={course}
                        onChange={(e) => {
                          const selectedVal = e.target.value;
                          setCourse(selectedVal);
                          const matched = semesterCourses.find(
                            (c) => (c.courseCode || c.code)?.toUpperCase() === selectedVal.toUpperCase()
                          );
                          if (matched) {
                            const base = matched.title || matched.name || '';
                            switch (activityType) {
                              case 'Lecture':
                                setTitle(`${base} Lecture`);
                                break;
                              case 'Test':
                                setTitle(`${base} Test`);
                                break;
                              case 'Exam':
                                setTitle(`${base} Examination`);
                                break;
                              case 'Practicals':
                                setTitle(`${base} Practical`);
                                break;
                              default:
                                setTitle(base);
                                break;
                            }
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-[18px] bg-white/90 border border-slate-200 text-[13.5px] text-[#1C1C1E] font-bold focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-xs cursor-pointer appearance-none transition-all"
                        required
                      >
                        <option value="" disabled>-- Select Registered Course --</option>
                        {semesterCourses.map((crs: any) => {
                          const directCode = crs.courseCode || crs.code;
                          const courseTitle = crs.title || crs.name;
                          return (
                            <option key={crs.id || directCode} value={directCode}>
                              {directCode} — {courseTitle}
                            </option>
                          );
                        })}
                        {course && !semesterCourses.some((c) => (c.courseCode || c.code)?.toUpperCase() === course.toUpperCase()) && (
                          <option value={course}>{course}</option>
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Activity / Course Title */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1">
                    Activity Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Organic Chemistry Lecture, Continuous Assessment Test, Laboratory Practical"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[16px] bg-white/80 backdrop-blur-md border border-slate-200 text-[#1C1C1E] text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#007AFF] shadow-xs transition-all"
                    required
                  />
                </div>

                {/* 4. INTERACTIVE CLOCK TIME SELECTOR */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[12px] font-semibold text-[#1C1C1E] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#007AFF]" />
                      <span>Scheduled Time</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-[#007AFF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/50">
                      Tap time box to open Clock
                    </span>
                  </div>

                  {/* Interactive Start Time & End Time Buttons */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Start Time Trigger */}
                    <button
                      type="button"
                      onClick={() => openClockPicker('start')}
                      className="p-3 rounded-[16px] bg-white/90 hover:bg-white border border-slate-200/90 text-left transition-all hover:border-[#007AFF] shadow-xs group cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold uppercase text-slate-400 group-hover:text-[#007AFF] transition-colors flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Start Time
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#007AFF] transition-colors" />
                      </div>
                      <div className="text-[16px] font-extrabold text-[#1C1C1E]">
                        {format24hTo12h(startTime)}
                      </div>
                    </button>

                    {/* End Time Trigger */}
                    <button
                      type="button"
                      onClick={() => openClockPicker('end')}
                      className="p-3 rounded-[16px] bg-white/90 hover:bg-white border border-slate-200/90 text-left transition-all hover:border-[#007AFF] shadow-xs group cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold uppercase text-slate-400 group-hover:text-[#007AFF] transition-colors flex items-center gap-1">
                          <Clock className="w-3 h-3" /> End Time
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#007AFF] transition-colors" />
                      </div>
                      <div className="text-[16px] font-extrabold text-[#1C1C1E]">
                        {format24hTo12h(endTime)}
                      </div>
                    </button>
                  </div>
                </div>

                {/* 5. Delivery Mode Selection: Physical vs Online */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1.5">
                    Class Delivery Mode <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-2xl border border-black/5">
                    <button
                      type="button"
                      onClick={() => handleDeliveryModeChange('physical')}
                      className={`py-2 px-3 rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        deliveryMode === 'physical'
                          ? 'bg-white text-[#007AFF] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Physical Class</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeliveryModeChange('online')}
                      className={`py-2 px-3 rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        deliveryMode === 'online'
                          ? 'bg-white text-emerald-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      <span>Online Class</span>
                    </button>
                  </div>
                </div>

                {/* 6. Online Meeting Link Field (When Online is Selected) */}
                {deliveryMode === 'online' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80"
                  >
                    <label className="block text-[12px] font-bold text-emerald-900 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-emerald-600" />
                      Online Meeting Link <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-emerald-700 pb-1">
                      Students will see a "Join Now" button (and "🔴 Live Now" while active in real time).
                    </p>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        placeholder="https://meet.google.com/xyz-abcd-efg or Zoom link"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        required={deliveryMode === 'online'}
                        className="w-full pl-9 pr-3 py-2 rounded-[14px] bg-white border border-emerald-200 text-[#1C1C1E] text-[13.5px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      />
                    </div>
                  </motion.div>
                )}

                {/* 7. Venue / Platform Field */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#1C1C1E] mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{deliveryMode === 'online' ? 'Platform / Venue' : 'Venue / Hall'}</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={deliveryMode === 'online' ? 'Google Meet / Zoom' : 'Lecture Theatre 1, Hall B, Chem Lab'}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[14px] bg-white/80 border border-slate-200 text-[13.5px] text-[#1C1C1E] font-medium focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                    required
                  />
                </div>

                {/* 8. Postponed Checkbox */}
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
                    Mark this activity with "Postponed" badge
                  </label>
                </div>

                {/* 9. Submit Buttons */}
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

      {/* Visual Clock Time Picker Modal */}
      <ClockTimePickerModal
        isOpen={isClockPickerOpen}
        onClose={() => setIsClockPickerOpen(false)}
        initialStartTime={startTime}
        initialEndTime={endTime}
        initialActiveTarget={clockPickerTarget}
        onSave={handleSaveClockTimes}
      />
    </>
  );
};
