import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, AlertCircle, FileText, CheckCircle2, Megaphone, BookMarked, FlaskConical, Award, Bell, Shield, ChevronRight, Camera, Image as ImageIcon, Check, Plus, LogOut, Mail, GraduationCap } from 'lucide-react';
import { AssignmentItem, UserSession, NotificationItem } from '../types';
import {
  DeadlinesSkeleton,
  BroadcastsSkeleton,
  ModulesSkeleton,
  ProfileSkeleton,
} from './Skeletons';

interface OtherViewProps {
  onBackToSchedule: () => void;
  profileImage?: string | null;
  onUploadProfileImage?: (imageDataUrl: string) => void;
  onReplaySplash?: () => void;
  onTriggerRefresh?: () => void;
  isLoading?: boolean;
  assignments?: AssignmentItem[];
  notifications?: NotificationItem[];
  courses?: any[];
  onSelectAssignment?: (assignment: AssignmentItem) => void;
  onToggleCompleteAssignment?: (id: string) => void;
  onAddNewDeadline?: () => void;
  userSession?: UserSession | null;
  onLogout?: () => void;
  onNavigateToAdmin?: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.01,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.16,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export const DeadlinesView: React.FC<OtherViewProps> = ({
  onBackToSchedule,
  isLoading = false,
  assignments = [],
  onSelectAssignment,
  onToggleCompleteAssignment,
  onAddNewDeadline,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  if (isLoading) {
    return <DeadlinesSkeleton />;
  }

  const pendingCount = assignments.filter((a) => !a.isCompleted).length;
  const completedCount = assignments.filter((a) => a.isCompleted).length;

  const filteredAssignments = assignments.filter((a) => {
    if (filter === 'pending') return !a.isCompleted;
    if (filter === 'completed') return a.isCompleted;
    return true;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 pb-28"
    >
      {/* Header Row */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold text-[#1C1C1E] tracking-tight">Upcoming Deadlines</h2>
          <p className="text-[12px] text-[#8E8E93]">
            {pendingCount} active {pendingCount === 1 ? 'task' : 'tasks'} requiring your attention
          </p>
        </div>

        {onAddNewDeadline && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onAddNewDeadline}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#007AFF] text-white text-[12.5px] font-bold shadow-[0_4px_16px_rgba(0,122,255,0.28)] hover:bg-[#0062cc] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
          </motion.button>
        )}
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-[#1C1C1E] text-white shadow-2xs'
              : 'bg-white/70 hover:bg-white text-slate-600 border border-white/80'
          }`}
        >
          All ({assignments.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
            filter === 'pending'
              ? 'bg-[#007AFF] text-white shadow-2xs'
              : 'bg-white/70 hover:bg-white text-slate-600 border border-white/80'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('completed')}
          className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
            filter === 'completed'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-white/70 hover:bg-white text-slate-600 border border-white/80'
          }`}
        >
          Completed ({completedCount})
        </button>
      </motion.div>

      {/* Deadlines List */}
      <div className="space-y-3">
        {filteredAssignments.length > 0 ? (
          filteredAssignments.map((item) => {
            const priorityColor =
              item.priority === 'High'
                ? 'text-rose-600 bg-rose-50 border-rose-200/80'
                : item.priority === 'Medium'
                ? 'text-amber-600 bg-amber-50 border-amber-200/80'
                : 'text-blue-600 bg-blue-50 border-blue-200/80';

            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                whileHover={{ y: -2 }}
                onClick={() => onSelectAssignment?.(item)}
                className={`glass-container rounded-[24px] p-4 sm:p-5 flex items-start justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border transition-all duration-200 hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] cursor-pointer ${
                  item.isCompleted
                    ? 'border-emerald-200/60 bg-emerald-50/20 opacity-90'
                    : 'border-white/80'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-bold text-[#007AFF] bg-blue-50/90 px-2.5 py-0.5 rounded-full border border-blue-200/60 shadow-2xs">
                      {item.course}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${priorityColor}`}>
                      {item.priority}
                    </span>
                    {item.isCompleted && (
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                        Completed
                      </span>
                    )}
                  </div>

                  <h3
                    className={`text-[15.5px] font-bold leading-snug truncate ${
                      item.isCompleted ? 'text-slate-500 line-through' : 'text-[#1C1C1E]'
                    }`}
                  >
                    {item.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#8E8E93] pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#007AFF]" />
                      <span>{item.dueDate}</span>
                    </div>

                    {item.images && item.images.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-full border border-slate-200/60">
                        <ImageIcon className="w-3 h-3 text-[#007AFF]" />
                        <span>{item.images.length} {item.images.length === 1 ? 'photo' : 'photos'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mark as complete interactive button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCompleteAssignment?.(item.id);
                  }}
                  className={`mt-1 w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs ${
                    item.isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-500/25'
                      : 'bg-white/80 border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-300'
                  }`}
                  title={item.isCompleted ? 'Mark as pending' : 'Mark as completed'}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>
              </motion.div>
            );
          })
        ) : (
          <div className="glass-container rounded-[24px] p-8 text-center border border-white/80 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-[14px] font-semibold text-slate-700">No deadlines in this view</p>
            <p className="text-[12px] text-slate-400">
              {filter === 'completed'
                ? 'You have not completed any assignments yet.'
                : 'All caught up! No pending assignments.'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const BroadcastsView: React.FC<OtherViewProps> = ({ isLoading = false, notifications = [] }) => {
  if (isLoading) {
    return <BroadcastsSkeleton />;
  }

  const broadcastItems = notifications && notifications.length > 0 ? notifications : [
    {
      id: 'b1',
      sender: 'Department of Computer Science',
      time: '2 hours ago',
      title: 'CSC 101 Lab Practical Session',
      message: 'All Year 1 students must attend the practical session in Software Lab 2 on Wednesday.',
      isUnread: true,
      type: 'alert' as const,
    },
    {
      id: 'b2',
      sender: 'Faculty of Science',
      time: 'Yesterday',
      title: 'Mid-Semester Timetable Adjustment',
      message: 'Please review the updated lecture timetable in the departmental portal.',
      isUnread: false,
      type: 'info' as const,
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 pb-24"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <h2 className="text-[22px] font-bold text-[#1C1C1E] tracking-tight">Faculty Broadcasts</h2>
        <span className="text-[12px] font-medium text-[#8E8E93]">Live Feed</span>
      </motion.div>

      <div className="space-y-3">
        {broadcastItems.map((b: any) => (
          <motion.div
            key={b.id}
            variants={itemVariants}
            whileHover={{ y: -2 }}
            className="glass-container rounded-[24px] p-5 space-y-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/80 transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#007AFF]" />
                <span className="text-[13px] font-bold text-[#1C1C1E]">{b.sender || 'Faculty Admin'}</span>
              </div>
              <span className="text-[11px] text-[#8E8E93]">{b.time || 'Today'}</span>
            </div>
            <h4 className="text-[15px] font-bold text-[#1C1C1E]">{b.title}</h4>
            <p className="text-[13px] text-slate-600 leading-relaxed">{b.message || b.body}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export const ModulesView: React.FC<OtherViewProps> = ({ isLoading = false, courses = [], userSession }) => {
  const [selectedSemester, setSelectedSemester] = useState<'1st Semester' | '2nd Semester' | 'all'>('1st Semester');
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<any | null>(null);

  // Determine student's department code/identifier & level
  const studentMatric = userSession?.matricNumber || '';
  const studentDeptRaw = userSession?.department || 'Department of Industrial Chemistry';
  const studentDeptId = userSession?.department_id || '';
  
  // Extract student level (e.g. 100, 200, etc.)
  const rawLevel = userSession?.level || userSession?.yearLevel;
  let parsedLevel = 100;
  if (typeof rawLevel === 'number') {
    parsedLevel = rawLevel;
  } else if (typeof rawLevel === 'string') {
    const p = parseInt(rawLevel.replace(/\D/g, ''), 10);
    if (!isNaN(p) && p >= 100) parsedLevel = p;
  }
  const [activeLevel, setActiveLevel] = useState<number>(parsedLevel);

  // Normalize department tag
  const isICH =
    studentDeptId === 'dept-ich' ||
    studentMatric.includes('ICH') ||
    studentDeptRaw.toLowerCase().includes('industrial');
  const isCHM =
    !isICH &&
    (studentDeptId === 'dept-chm' ||
      studentMatric.includes('CHM') ||
      studentDeptRaw.toLowerCase().includes('chemistry'));
  const isCSC =
    studentDeptId === 'dept-csc' ||
    studentMatric.includes('CSC') ||
    studentDeptRaw.toLowerCase().includes('computer');

  const deptDisplayName = isICH
    ? 'Department of Industrial Chemistry'
    : isCHM
    ? 'Department of Chemistry'
    : isCSC
    ? 'Department of Computer Science'
    : studentDeptRaw;

  const deptShortCode = isICH ? 'ICH' : isCHM ? 'CHM' : isCSC ? 'CSC' : 'DEPT';

  // Filter courses for this student's department and level
  const filteredCourses = courses.filter((crs: any) => {
    // 1. Department match
    const cDeptId = crs.department_id || '';
    const cCode = (crs.courseCode || crs.code || '').toUpperCase();
    const matchesDept =
      (isICH && (cDeptId === 'dept-ich' || cCode.startsWith('ICH') || cCode.startsWith('CHM 101') || cCode.startsWith('PHY 101') || cCode.startsWith('MTH 101') || cCode.startsWith('GST 101') || cCode.startsWith('BIO 101') || cCode.startsWith('CHM 102') || cCode.startsWith('PHY 102') || cCode.startsWith('MTH 102') || cCode.startsWith('GST 102') || cCode.startsWith('CHM 104') || cCode.startsWith('CHM 211') || cCode.startsWith('CHM 221') || cCode.startsWith('CHM 232') || cCode.startsWith('CHM 292') || cCode.startsWith('CHM 341'))) ||
      (isCHM && (cDeptId === 'dept-chm' || cCode.startsWith('CHM'))) ||
      (isCSC && (cDeptId === 'dept-csc' || cCode.startsWith('CSC'))) ||
      (!isICH && !isCHM && !isCSC && (cDeptId === studentDeptId || cDeptId === 'dept-ich'));

    // 2. Level match
    const crsLevel = crs.level || parseInt(cCode.replace(/\D/g, '').slice(0, 1) + '00', 10) || 100;
    const matchesLevel = crsLevel === activeLevel;

    // 3. Semester match
    let matchesSemester = true;
    if (selectedSemester !== 'all') {
      const crsSem = (crs.semester || '1st Semester').toLowerCase();
      matchesSemester = crsSem.includes(selectedSemester.toLowerCase().slice(0, 3));
    }

    return matchesDept && matchesLevel && matchesSemester;
  });

  // Calculate total units
  const totalUnits = filteredCourses.reduce((acc: number, curr: any) => {
    const u = typeof curr.units === 'number' ? curr.units : parseInt(String(curr.units).replace(/\D/g, ''), 10) || 3;
    return acc + u;
  }, 0);

  if (isLoading) {
    return <ModulesSkeleton />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 pb-24"
    >
      {/* Department & Level Confinement Header Card */}
      <motion.div
        variants={itemVariants}
        className="glass-container rounded-[26px] p-5 border border-white/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-bold text-[11px] border border-blue-400/20">
                {deptShortCode} Catalog
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                {activeLevel}L
              </span>
            </div>
            <h3 className="text-[17px] font-bold text-slate-900 leading-snug">
              {deptDisplayName}
            </h3>
            <p className="text-[12px] text-slate-500">
              Courses are confined to your enrolled department and academic level.
            </p>
          </div>

          <div className="text-right shrink-0 bg-blue-50/70 border border-blue-200/50 rounded-2xl px-3 py-2">
            <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider block">Load</span>
            <span className="text-[18px] font-extrabold text-blue-700">{totalUnits}</span>
            <span className="text-[10px] text-blue-600 block font-medium">Units</span>
          </div>
        </div>

        {/* Level Switcher Selector */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">Level:</span>
          <div className="flex items-center gap-1.5">
            {[100, 200, 300, 400].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setActiveLevel(lvl)}
                className={`px-3 py-1 rounded-xl text-[12px] font-bold transition-all ${
                  activeLevel === lvl
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lvl}L
              </button>
            ))}
          </div>
        </div>

        {/* Semester Filter Pills */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            onClick={() => setSelectedSemester('1st Semester')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-[12px] font-bold transition-all text-center ${
              selectedSemester === '1st Semester'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200'
            }`}
          >
            1st Semester
          </button>
          <button
            onClick={() => setSelectedSemester('2nd Semester')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-[12px] font-bold transition-all text-center ${
              selectedSemester === '2nd Semester'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200'
            }`}
          >
            2nd Semester
          </button>
          <button
            onClick={() => setSelectedSemester('all')}
            className={`py-1.5 px-3 rounded-xl text-[12px] font-bold transition-all ${
              selectedSemester === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
        </div>
      </motion.div>

      {/* Courses List */}
      <motion.div variants={itemVariants} className="flex items-center justify-between px-1">
        <h2 className="text-[18px] font-bold text-[#1C1C1E] tracking-tight">
          Registered Courses
        </h2>
        <span className="text-[12px] font-semibold text-slate-500 bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200/60">
          {filteredCourses.length} Course{filteredCourses.length === 1 ? '' : 's'}
        </span>
      </motion.div>

      <div className="grid grid-cols-1 gap-3">
        {filteredCourses.length === 0 ? (
          <motion.div
            variants={itemVariants}
            className="glass-container rounded-[24px] p-8 text-center space-y-2 border border-white/80"
          >
            <BookMarked className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-[15px] font-bold text-slate-800">No courses listed for {activeLevel}L {selectedSemester}</h4>
            <p className="text-[12px] text-slate-500 max-w-xs mx-auto">
              No modules are registered under this department and semester. Try selecting another semester or contact your course rep.
            </p>
          </motion.div>
        ) : (
          filteredCourses.map((mod: any) => (
            <motion.div
              key={mod.id || mod.courseCode || mod.code}
              variants={itemVariants}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCourseDetail(mod)}
              className="glass-container rounded-[22px] p-4 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-[16px] bg-blue-500/10 border border-blue-300/30 flex items-center justify-center text-[#007AFF] font-bold text-[14px] shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[13px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {mod.courseCode || mod.code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {mod.units ? `${mod.units} Units` : '3 Units'}
                    </span>
                  </div>
                  <h4 className="text-[14px] font-bold text-[#1C1C1E] truncate mt-1">
                    {mod.title || mod.name}
                  </h4>
                  <p className="text-[11px] text-[#8E8E93] truncate mt-0.5">
                    {mod.description || `${mod.semester || '1st Semester'} • ${activeLevel}L Core Module`}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2 group-hover:text-blue-600 transition-colors" />
            </motion.div>
          ))
        )}
      </div>

      {/* Course Detail Modal */}
      <AnimatePresence>
        {selectedCourseDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                    {selectedCourseDetail.courseCode || selectedCourseDetail.code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">
                    {selectedCourseDetail.title || selectedCourseDetail.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCourseDetail(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm"
                >
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Credit Units</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedCourseDetail.units ? `${selectedCourseDetail.units} Units` : '3 Units'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Semester</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedCourseDetail.semester || '1st Semester'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Academic Level</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedCourseDetail.level ? `${selectedCourseDetail.level}L` : `${activeLevel}L`}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Department</span>
                  <span className="font-bold text-slate-800 text-sm truncate block">
                    {deptShortCode}
                  </span>
                </div>
              </div>

              {selectedCourseDetail.description && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Course Syllabus / Overview</h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                    {selectedCourseDetail.description}
                  </p>
                </div>
              )}

              {selectedCourseDetail.pdfurl && (
                <a
                  href={selectedCourseDetail.pdfurl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download / View Official Syllabus PDF</span>
                </a>
              )}

              <button
                onClick={() => setSelectedCourseDetail(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Close Course Overview
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const ProfileView: React.FC<OtherViewProps> = ({
  profileImage,
  onUploadProfileImage,
  onReplaySplash,
  onTriggerRefresh,
  isLoading = false,
  userSession,
  onLogout,
  onNavigateToAdmin,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  const studentName = userSession?.fullName || 'Student User';
  const studentDepartment = userSession?.department || 'Department of Industrial Chemistry';
  const studentMatric = userSession?.matricNumber || 'CSC/2026/001';
  const studentEmail = userSession?.email || 'student@university.edu';
  const studentYearLevel = userSession?.yearLevel || '100 Level';

  const getInitials = (name: string) => {
    if (!name || name.trim().length === 0) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && onUploadProfileImage) {
          onUploadProfileImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 pb-20"
    >
      {/* Hidden file input for uploading profile pic */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center justify-between">
        <motion.h2 variants={itemVariants} className="text-[22px] font-bold text-[#1C1C1E] tracking-tight">
          Student Profile
        </motion.h2>

        {onLogout && (
          <motion.button
            id="profile-header-logout-btn"
            variants={itemVariants}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 text-[12px] font-bold border border-red-200/80 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Log out of student account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </motion.button>
        )}
      </div>
      
      <motion.div
        variants={itemVariants}
        className="glass-container rounded-[28px] p-6 text-center relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white/80"
      >
        {/* Profile Avatar with click-to-upload from camera icon */}
        <div className="relative inline-block mx-auto mb-3">
          <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            title="Click camera icon to change profile picture from your device"
            className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500/20 to-indigo-500/30 border-2 border-white shadow-lg flex items-center justify-center text-[#007AFF] relative overflow-hidden cursor-pointer group"
          >
            {profileImage ? (
              <img
                src={profileImage}
                alt={`${studentName} avatar`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-inner">
                {getInitials(studentName)}
              </div>
            )}

            {/* Hover overlay on profile circle */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white z-20">
              <Camera className="w-6 h-6 mb-0.5" />
              <span className="text-[10px] font-semibold">Change</span>
            </div>
          </motion.div>

          {/* Camera Icon on the profile picture for device photo upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-md border-2 border-white hover:bg-blue-600 active:scale-95 transition-all cursor-pointer z-30"
            title="Choose photo from device"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-[20px] font-bold text-[#1C1C1E]">{studentName}</h3>
        <p className="text-[13.5px] text-[#8E8E93] mt-0.5 font-medium">
          {studentDepartment} • <span className="font-semibold text-slate-700">Matric: {studentMatric}</span>
        </p>
        <p className="text-[12px] text-[#007AFF] font-medium mt-0.5">
          {studentEmail}
        </p>

        <div className="mt-4 flex flex-wrap justify-center items-center gap-2">
          <span className="text-[12px] font-semibold text-[#007AFF] bg-blue-50/90 px-3.5 py-1 rounded-full border border-blue-200/60 shadow-2xs">
            {studentYearLevel}
          </span>
          {(userSession?.isCourseRep || (userSession as any)?.iscourserep) && (
            <span className="text-[12px] font-bold text-amber-800 bg-amber-100/90 px-3.5 py-1 rounded-full border border-amber-300 shadow-2xs flex items-center gap-1">
              <span>★</span> Course Representative
            </span>
          )}
          {((userSession as any)?.is_payed || (userSession as any)?.is_paid || (userSession as any)?.hasFreeAccess) && (
            <span className="text-[12px] font-bold text-emerald-800 bg-emerald-100/90 px-3.5 py-1 rounded-full border border-emerald-300 shadow-2xs flex items-center gap-1">
              <span>✓</span> Free Semester Access
            </span>
          )}
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="glass-container rounded-[26px] p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/80 text-[13.5px]"
      >
        <div className="flex items-center justify-between py-1 border-b border-black/5">
          <span className="text-[#1C1C1E] font-medium">Matriculation No.</span>
          <span className="font-bold text-[#007AFF]">{studentMatric}</span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-black/5">
          <span className="text-[#1C1C1E] font-medium">Student Email</span>
          <span className="text-[#8E8E93] truncate max-w-[200px]">{studentEmail}</span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-black/5">
          <span className="text-[#1C1C1E] font-medium">Current Semester</span>
          <span className="text-[#8E8E93]">First Semester 2026/2027</span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-black/5">
          <span className="text-[#1C1C1E] font-medium">Database Sync</span>
          <span className="text-emerald-600 font-semibold text-[12.5px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Firebase Cloud Firestore</span>
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-[#1C1C1E] font-medium">Level Advisor</span>
          <span className="text-[#8E8E93]">Prof. A. Adeleke</span>
        </div>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        {onTriggerRefresh && (
          <motion.button
            variants={itemVariants}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onTriggerRefresh}
            className="flex-1 py-3 rounded-[20px] bg-white/70 hover:bg-white text-[#007AFF] text-[13px] font-semibold border border-white/80 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>Preview Skeleton Loading</span>
          </motion.button>
        )}
        {onReplaySplash && (
          <motion.button
            variants={itemVariants}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onReplaySplash}
            className="flex-1 py-3 rounded-[20px] bg-white/70 hover:bg-white text-[#8E8E93] hover:text-[#1C1C1E] text-[13px] font-semibold border border-white/80 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>Preview Splash Screen</span>
          </motion.button>
        )}
      </div>

      {onNavigateToAdmin && (
        <motion.div variants={itemVariants} className="pt-1">
          <button
            id="profile-open-admin-btn"
            type="button"
            onClick={onNavigateToAdmin}
            className="w-full py-3.5 rounded-[22px] bg-slate-900 hover:bg-slate-800 text-white text-[13.5px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-slate-900/20 active:scale-98"
          >
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Staff &amp; Admin Dashboard (/adminschedulerapp)</span>
          </button>
        </motion.div>
      )}

      {onLogout && (
        <motion.div variants={itemVariants} className="pt-1">
          <button
            id="profile-bottom-logout-btn"
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full py-3.5 rounded-[22px] bg-red-500 hover:bg-red-600 text-white text-[13.5px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-500/20 active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </motion.div>
      )}

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[26px] p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-[17px] font-bold text-[#1C1C1E]">Log out of student account?</h4>
                <p className="text-[13px] text-[#8E8E93] mt-1 font-medium">
                  You will need your Email, Matric Number, and Password to sign back in.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-[18px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-logout-btn"
                  type="button"
                  onClick={handleConfirmLogout}
                  className="flex-1 py-2.5 rounded-[18px] bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
