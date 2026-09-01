import React, { useRef, useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, AlertCircle, FileText, CheckCircle2, Megaphone, BookMarked, FlaskConical, Award, Bell, Shield, ChevronRight, Camera, Image as ImageIcon, Check, Plus, LogOut, Mail, GraduationCap, Edit3, Trash2, MoreVertical, Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, Receipt, Eye, EyeOff, Send, Sparkles, UserCheck, Phone, MapPin, X, HelpCircle, Copy, ExternalLink, MessageSquare, Headphones } from 'lucide-react';
import { AssignmentItem, UserSession, NotificationItem } from '../types';
import {
  DeadlinesSkeleton,
  BroadcastsSkeleton,
  ModulesSkeleton,
  ProfileSkeleton,
} from './Skeletons';
import { AddCourseModal, CourseFormData } from './AddCourseModal';
import { ConfirmDeleteModal } from '../admin/ConfirmDeleteModal';
import { CourseDetailView } from './CourseDetailView';
import { WalletView } from './WalletView';
import { SupportPage } from './SupportPage';
import { getStudentActiveLevel, getStudentActiveSemester, normalizeSemester, resolveStudentDepartmentId, filterCoursesForStudentScope } from '../lib/academicScope';
import { DepartmentRecord } from '../admin/types';

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
  availableDepartments?: DepartmentRecord[];
  onSelectAssignment?: (assignment: AssignmentItem) => void;
  onToggleCompleteAssignment?: (id: string) => void;
  onAddNewDeadline?: () => void;
  userSession?: UserSession | null;
  onLogout?: () => void;
  onNavigateToAdmin?: () => void;
  isCourseRep?: boolean;
  currentSemester?: string;
  activeLevel?: number;
  activeSemester?: string;
  onAddCourse?: (courseData: CourseFormData) => Promise<boolean | void>;
  onDeleteCourse?: (courseId: string) => Promise<boolean | void>;
  onEditCourse?: (courseId: string, updates: Partial<CourseFormData>) => Promise<boolean | void>;
  selectedCourseForDetails?: any | null;
  onSelectCourse?: (course: any | null) => void;
  onSelectBroadcast?: (broadcast: NotificationItem) => void;
  onAddBroadcast?: (data: { title: string; message: string; priority?: 'urgent' | 'normal'; category?: string; images?: string[] }) => Promise<boolean | void>;
  onDeleteBroadcast?: (id: string) => Promise<boolean | void>;
  onUpdateUserSession?: (updates: Partial<UserSession>) => Promise<void> | void;
  isPostBroadcastModalOpen?: boolean;
  onOpenPostBroadcastModal?: () => void;
  onClosePostBroadcastModal?: () => void;
  onAddNotification?: (title: string, message: string, category?: any, type?: any) => void;
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
  isCourseRep = false,
  userSession,
  currentSemester = '1st Semester',
  activeLevel: activeLevelProp,
  activeSemester: activeSemesterProp,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return <DeadlinesSkeleton />;
  }

  const effectiveCourseRep = isCourseRep || Boolean(userSession?.isCourseRep || userSession?.isAdmin);

  // Extract student details for level, department, semester filtering
  const deptInfo = resolveStudentDepartmentId(userSession);
  const deptId = deptInfo.id;

  const activeLevel = activeLevelProp || getStudentActiveLevel(userSession);
  const activeSemester = normalizeSemester(activeSemesterProp || getStudentActiveSemester(userSession, currentSemester));

  // Filter assignments strictly matching student's department, level, and semester
  const scopedAssignments = assignments.filter((a) => {
    // 1. Department match
    const aDeptId = a.department_id || '';
    const cCode = (a.course || '').toUpperCase();
    const matchesDept =
      !aDeptId ||
      aDeptId === 'dept-all' ||
      aDeptId === deptId;

    // 2. Strict Level match
    const codeDigits = cCode.replace(/\D/g, '');
    const codeLevel = codeDigits.length > 0 ? parseInt(codeDigits.slice(0, 1) + '00', 10) : 0;
    const aLevel = typeof a.level === 'number' && a.level >= 100
      ? a.level
      : (codeLevel >= 100 && codeLevel <= 500 ? codeLevel : 100);
    const matchesLevel = aLevel === activeLevel;

    // 3. Strict Semester match
    const aSem = a.semester ? normalizeSemester(a.semester) : activeSemester;
    const matchesSemester = aSem === activeSemester;

    // 4. Search query
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || cCode.toLowerCase().includes(q) || a.title.toLowerCase().includes(q);

    return matchesDept && matchesLevel && matchesSemester && matchesSearch;
  });

  const pendingCount = scopedAssignments.filter((a) => !a.isCompleted).length;
  const completedCount = scopedAssignments.filter((a) => a.isCompleted).length;

  const filteredAssignments = scopedAssignments.filter((a) => {
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
          <div className="flex items-center gap-1.5">
            <h2 className="text-[20px] font-bold text-[#1C1C1E] tracking-tight">Deadline</h2>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200/60 font-mono tracking-tight">
              {activeLevel}L {activeSemester}
            </span>
          </div>
          <p className="text-[12px] text-[#8E8E93] mt-0.5">
            {pendingCount} active {pendingCount === 1 ? 'task' : 'tasks'} requiring your attention
          </p>
        </div>

        {effectiveCourseRep && onAddNewDeadline && (
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
          All ({scopedAssignments.length})
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
                : `All caught up! No pending assignments for ${activeLevel}L ${activeSemester}.`}
            </p>
            {effectiveCourseRep && onAddNewDeadline && filter !== 'completed' && (
              <button
                type="button"
                onClick={onAddNewDeadline}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Deadline</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const BroadcastsView: React.FC<OtherViewProps> = ({
  isLoading = false,
  notifications = [],
  userSession,
  isCourseRep = false,
  currentSemester = '1st Semester',
  activeLevel: activeLevelProp,
  activeSemester: activeSemesterProp,
  onSelectBroadcast,
  onAddBroadcast,
  onDeleteBroadcast,
  isPostBroadcastModalOpen: isPostBroadcastModalOpenProp,
  onOpenPostBroadcastModal,
  onClosePostBroadcastModal,
}) => {
  const [filter, setFilter] = useState<'all' | 'urgent' | 'timetable' | 'academic'>('all');
  const [internalIsPostModalOpen, setInternalIsPostModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postMessage, setPostMessage] = useState('');
  const [postPriority, setPostPriority] = useState<'normal' | 'urgent'>('normal');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPostModalOpen = isPostBroadcastModalOpenProp !== undefined ? isPostBroadcastModalOpenProp : internalIsPostModalOpen;

  const handleOpenModal = () => {
    if (onOpenPostBroadcastModal) {
      onOpenPostBroadcastModal();
    } else {
      setInternalIsPostModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    if (onClosePostBroadcastModal) {
      onClosePostBroadcastModal();
    } else {
      setInternalIsPostModalOpen(false);
    }
    setPostImages([]);
  };

  if (isLoading) {
    return <BroadcastsSkeleton />;
  }

  const effectiveCourseRep = isCourseRep || Boolean(userSession?.isCourseRep || userSession?.isAdmin);

  // Extract student details for level, department, semester filtering
  const deptInfo = resolveStudentDepartmentId(userSession);
  const deptDisplayName = deptInfo.name;
  const deptId = deptInfo.id;

  const activeLevel = activeLevelProp || getStudentActiveLevel(userSession);
  const activeSemester = normalizeSemester(activeSemesterProp || getStudentActiveSemester(userSession, currentSemester));

  // Filter broadcast announcements strictly to student's department, level, and semester, ensuring each appears ONLY ONCE
  const scopedBroadcasts = useMemo(() => {
    const seenIds = new Set<string>();
    const list: any[] = [];

    (notifications || []).forEach((b: any) => {
      // 0. Exclude internal app activity logs (e.g. "Broadcast Published", "Class Added", "Signed in")
      if (b.id?.startsWith('act-') && b.category !== 'broadcast') return;
      if (b.category === 'schedule' || b.category === 'profile') return;

      // 1. Ensure unique broadcast (no duplicates)
      const uniqueKey = b.id || `${b.title}-${b.message}`;
      if (seenIds.has(uniqueKey)) return;
      seenIds.add(uniqueKey);

      // 2. Department match
      const bDeptId = b.department_id || '';
      const matchesDept =
        !bDeptId ||
        bDeptId === 'dept-all' ||
        bDeptId === deptId;

      // 3. Strict Level match
      const bLevelNum = typeof b.level === 'number' ? b.level : (typeof b.level === 'string' ? parseInt(b.level.replace(/\D/g, ''), 10) : 0);
      const isGeneralNotice = !b.level || b.level === 0 || b.level === 'all' || (b as any).targetLevel === 'all';
      const matchesLevel = isGeneralNotice || bLevelNum === activeLevel;

      // 4. Strict Semester match
      const bSem = b.semester ? normalizeSemester(b.semester) : activeSemester;
      const isGeneralSem = !b.semester || b.semester === 'all' || b.semester === 'both';
      const matchesSemester = isGeneralSem || bSem === activeSemester;

      if (matchesDept && matchesLevel && matchesSemester) {
        list.push(b);
      }
    });

    // Sort latest broadcasts first (descending by timestamp / creation date)
    list.sort((a, b) => {
      const getScore = (item: any): number => {
        if (typeof item.timestamp === 'number' && item.timestamp > 0) return item.timestamp;
        if (item.createdat) {
          const parsed = new Date(item.createdat).getTime();
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        if (item.created_at) {
          const parsed = new Date(item.created_at).getTime();
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return 0;
      };
      const scoreA = getScore(a);
      const scoreB = getScore(b);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.id || '').localeCompare(a.id || '');
    });

    return list;
  }, [notifications, deptId, activeLevel, activeSemester]);

  const urgentCount = scopedBroadcasts.filter((b: any) => b.type === 'alert' || b.priority === 'urgent').length;
  const timetableCount = scopedBroadcasts.filter((b: any) => (b.title + b.message).toLowerCase().includes('timetable') || (b.title + b.message).toLowerCase().includes('lecture') || (b.title + b.message).toLowerCase().includes('class')).length;
  const academicCount = scopedBroadcasts.filter((b: any) => (b.title + b.message).toLowerCase().includes('exam') || (b.title + b.message).toLowerCase().includes('assignment') || (b.title + b.message).toLowerCase().includes('practical') || (b.title + b.message).toLowerCase().includes('lab')).length;

  const filteredBroadcasts = scopedBroadcasts.filter((b: any) => {
    if (filter === 'urgent') return b.type === 'alert' || b.priority === 'urgent';
    if (filter === 'timetable') return (b.title + b.message).toLowerCase().includes('timetable') || (b.title + b.message).toLowerCase().includes('lecture') || (b.title + b.message).toLowerCase().includes('class');
    if (filter === 'academic') return (b.title + b.message).toLowerCase().includes('exam') || (b.title + b.message).toLowerCase().includes('assignment') || (b.title + b.message).toLowerCase().includes('practical') || (b.title + b.message).toLowerCase().includes('lab');
    return true;
  });

  const handleImageFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result && typeof reader.result === 'string') {
          setPostImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleRemovePostImage = (idxToRemove: number) => {
    setPostImages((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postMessage.trim() || !onAddBroadcast) return;
    setIsSubmitting(true);
    try {
      await onAddBroadcast({
        title: postTitle.trim(),
        message: postMessage.trim(),
        priority: postPriority,
        images: postImages,
      });
      setPostTitle('');
      setPostMessage('');
      setPostPriority('normal');
      setPostImages([]);
      handleCloseModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 pb-24"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-[20px] font-bold text-[#1C1C1E] tracking-tight">Broadcast</h2>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200/60 font-mono tracking-tight">
              {activeLevel}L {activeSemester}
            </span>
          </div>
          <p className="text-[12px] text-[#8E8E93] mt-0.5">
            Official announcements from {deptDisplayName}
          </p>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={itemVariants} className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-[#1C1C1E] text-white shadow-2xs'
              : 'bg-white/70 hover:bg-white text-slate-600 border border-white/80'
          }`}
        >
          All ({scopedBroadcasts.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('urgent')}
          className={`px-3 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
            filter === 'urgent'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-white/70 hover:bg-white text-slate-600 border border-white/80'
          }`}
        >
          Urgent ({urgentCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('timetable')}
          className={`px-3 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
            filter === 'timetable'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white/70 hover:bg-white text-slate-600 border border-white/80'
          }`}
        >
          Timetable ({timetableCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('academic')}
          className={`px-3 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
            filter === 'academic'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-white/70 hover:bg-white text-slate-600 border border-white/80'
          }`}
        >
          Academic ({academicCount})
        </button>
      </motion.div>

      {/* Broadcasts List */}
      <div className="space-y-3.5">
        {filteredBroadcasts.length > 0 ? (
          filteredBroadcasts.map((b: any) => {
            const isUrgent = b.type === 'alert' || b.priority === 'urgent';
            const images: string[] = b.images || [];
            return (
              <motion.div
                key={b.id}
                variants={itemVariants}
                whileHover={{ y: -2 }}
                onClick={() => onSelectBroadcast?.(b)}
                className={`glass-container rounded-[24px] p-5 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border transition-all duration-200 hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] cursor-pointer group ${
                  isUrgent ? 'border-rose-200/80 bg-rose-50/15' : 'border-white/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isUrgent ? 'bg-rose-500/15 text-rose-600' : 'bg-blue-500/15 text-blue-600'}`}>
                      <Megaphone className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[13px] font-bold text-[#1C1C1E]">{b.sender || b.author || 'Department Rep'}</span>
                    {isUrgent && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                        Urgent
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#8E8E93]">{b.time || 'Today'}</span>
                    {effectiveCourseRep && onDeleteBroadcast && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBroadcast(b.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Broadcast"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h4 className="text-[15.5px] font-bold text-[#1C1C1E] group-hover:text-blue-600 transition-colors">{b.title}</h4>
                <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line line-clamp-3">{b.message || b.body}</p>

                {/* Facebook-style Image Grid / Collage Preview */}
                {images.length > 0 && (
                  <div className="pt-1">
                    {images.length === 1 && (
                      <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-slate-100 border border-black/5 shadow-xs">
                        <img
                          src={images[0]}
                          alt="Broadcast attachment"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {images.length === 2 && (
                      <div className="grid grid-cols-2 gap-2">
                        {images.map((img, idx) => (
                          <div key={idx} className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-100 border border-black/5 shadow-xs">
                            <img
                              src={img}
                              alt={`Broadcast attachment ${idx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {images.length >= 3 && (
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="col-span-2 relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-100 border border-black/5 shadow-xs">
                          <img
                            src={images[0]}
                            alt="Broadcast attachment 1"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 border border-black/5 shadow-xs">
                            <img
                              src={images[1]}
                              alt="Broadcast attachment 2"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 border border-black/5 shadow-xs">
                            <img
                              src={images[2]}
                              alt="Broadcast attachment 3"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            {images.length > 3 && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold">
                                +{images.length - 2}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tap to View Details Footer (Only displayed when images are attached) */}
                {images.length > 0 && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-black/5 text-[11.5px] text-[#007AFF] font-medium">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{`${images.length} photo${images.length > 1 ? 's' : ''} attached`}</span>
                    </span>
                    <span className="flex items-center gap-0.5 font-bold group-hover:translate-x-0.5 transition-transform">
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="glass-container rounded-[24px] p-8 text-center border border-white/80 space-y-2">
            <Megaphone className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-[14px] font-semibold text-slate-700">No broadcasts found</p>
            <p className="text-[12px] text-slate-400">
              No notices published for {activeLevel}L {activeSemester} in this category yet.
            </p>
            {effectiveCourseRep && onAddBroadcast && (
              <button
                type="button"
                onClick={handleOpenModal}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Announcement</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Course Rep Post Broadcast Modal with Facebook-style Image Upload */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Post Faculty Broadcast</h3>
                    <p className="text-[11px] text-slate-400">For {activeLevel}L • {activeSemester}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePostSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Announcement Headline *
                  </label>
                  <input
                    type="text"
                    required
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="e.g., Chemistry Lab Test Rescheduled"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority Level
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPostPriority('normal')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        postPriority === 'normal'
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      Normal Info
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostPriority('urgent')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        postPriority === 'urgent'
                          ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      Urgent Alert
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Broadcast Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={postMessage}
                    onChange={(e) => setPostMessage(e.target.value)}
                    placeholder="Provide complete details, venue adjustments, instructions..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Facebook-style Photos Upload and Previews */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>Attach Photos ({postImages.length})</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-[#007AFF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Photos</span>
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageFilePick}
                    className="hidden"
                  />

                  {postImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {postImages.map((img, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden aspect-square bg-slate-100 border border-slate-200 group">
                          <img
                            src={img}
                            alt={`Preview ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePostImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-[10px] hover:bg-rose-600 transition-colors cursor-pointer"
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 aspect-square flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-[10px] font-bold">Add More</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 text-center cursor-pointer transition-colors space-y-1 bg-slate-50/50 hover:bg-blue-50/30"
                    >
                      <ImageIcon className="w-6 h-6 mx-auto text-slate-400" />
                      <p className="text-xs font-semibold text-slate-600">Click to add photos to this broadcast</p>
                      <p className="text-[10px] text-slate-400">Multiple images supported (like Facebook)</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish Broadcast'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const ModulesView: React.FC<OtherViewProps> = ({
  isLoading = false,
  courses = [],
  availableDepartments = [],
  userSession,
  isCourseRep = false,
  onAddCourse,
  onDeleteCourse,
  onEditCourse,
  currentSemester = '1st Semester',
  activeLevel: activeLevelProp,
  activeSemester: activeSemesterProp,
  selectedCourseForDetails,
  onSelectCourse,
}) => {
  const [internalSelectedCourse, setInternalSelectedCourse] = useState<any | null>(null);
  const selectedCourseDetail = selectedCourseForDetails !== undefined ? selectedCourseForDetails : internalSelectedCourse;
  const setSelectedCourseDetail = onSelectCourse || setInternalSelectedCourse;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<any | null>(null);
  const [openMenuCourse, setOpenMenuCourse] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const effectiveCourseRep = isCourseRep || Boolean(userSession?.isCourseRep || userSession?.isAdmin);

  // Determine student's department code/identifier & level from session
  const deptInfo = resolveStudentDepartmentId(userSession, availableDepartments);
  const deptDisplayName = deptInfo.name;
  const deptShortCode = deptInfo.code;
  const deptId = deptInfo.id;
  
  const activeLevel = activeLevelProp || getStudentActiveLevel(userSession);
  const activeSemester = normalizeSemester(activeSemesterProp || getStudentActiveSemester(userSession, currentSemester));

  // Filter courses strictly for this student's department, enrolled level, and active semester
  const filteredCourses = filterCoursesForStudentScope(courses, deptId, activeLevel, activeSemester);

  // Calculate total units
  const totalUnits = filteredCourses.reduce((acc: number, curr: any) => {
    const u = typeof curr.units === 'number' ? curr.units : parseInt(String(curr.units).replace(/\D/g, ''), 10) || 3;
    return acc + u;
  }, 0);

  const handleSaveCourse = async (courseData: CourseFormData) => {
    if (editingCourse && onEditCourse) {
      await onEditCourse(editingCourse.id, courseData);
      setSelectedCourseDetail({ ...editingCourse, ...courseData });
      setEditingCourse(null);
    } else if (onAddCourse) {
      await onAddCourse(courseData);
    }
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete || !onDeleteCourse) return;
    setIsDeleting(true);
    try {
      await onDeleteCourse(courseToDelete.id);
      setSelectedCourseDetail(null);
      setCourseToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <ModulesSkeleton />;
  }

  // If a course is selected, display the comprehensive Course Detail View (PDF & Video tabs)
  if (selectedCourseDetail) {
    return (
      <CourseDetailView
        course={selectedCourseDetail}
        onBack={() => setSelectedCourseDetail(null)}
        isCourseRep={effectiveCourseRep}
        userSession={userSession}
        onEditCourse={(course) => {
          setEditingCourse(course);
          setIsAddModalOpen(true);
        }}
        onDeleteCourse={(course) => setCourseToDelete(course)}
        onCourseUpdated={(updated) => {
          setSelectedCourseDetail(updated);
          if (onEditCourse) {
            onEditCourse(updated.id, updated);
          }
        }}
      />
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 pb-24"
    >
      {/* Registered Modules List Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-[18px] font-bold text-[#1C1C1E] tracking-tight">
            Registered Modules
          </h2>
          <span className="text-[11.5px] font-bold text-slate-500 bg-white/90 px-2.5 py-0.5 rounded-full border border-slate-200/70 shadow-2xs">
            {filteredCourses.length}
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-3">
        {filteredCourses.length === 0 ? (
          <motion.div
            variants={itemVariants}
            className="glass-container rounded-[26px] p-8 text-center space-y-2.5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
          >
            <BookMarked className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-[15px] font-bold text-slate-800">
              No courses registered for {activeLevel}L {activeSemester}
            </h4>
            <p className="text-[12px] text-slate-500 max-w-xs mx-auto">
              {effectiveCourseRep
                ? `Click the "+ Add Course" button above to add official courses for ${activeSemester}.`
                : `No modules have been posted yet for ${activeSemester}. Contact your course representative.`}
            </p>
            {effectiveCourseRep && (
              <button
                type="button"
                onClick={() => {
                  setEditingCourse(null);
                  setIsAddModalOpen(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Course</span>
              </button>
            )}
          </motion.div>
        ) : (
          filteredCourses.map((mod: any) => {
            const courseId = mod.id || mod.courseCode || mod.code;

            return (
              <motion.div
                key={courseId}
                variants={itemVariants}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCourseDetail(mod)}
                className="glass-container rounded-[22px] p-4 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/80 transition-all cursor-pointer group hover:border-blue-200 relative"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <div className="w-11 h-11 rounded-[16px] bg-blue-500/10 border border-blue-300/30 flex items-center justify-center text-[#007AFF] font-bold text-[14px] shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <BookMarked className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[13px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/50">
                        {mod.courseCode || mod.code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {mod.units ? `${mod.units} Units` : '3 Units'}
                      </span>
                      <span className="text-[10.5px] font-medium text-slate-400">
                        {mod.semester || '1st Semester'}
                      </span>
                    </div>
                    <h4 className="text-[14.5px] font-bold text-[#1C1C1E] truncate mt-1">
                      {mod.title || mod.name}
                    </h4>
                    <p className="text-[11.5px] text-[#8E8E93] truncate mt-0.5">
                      {mod.description || `${deptDisplayName} • ${activeLevel}L Module`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {effectiveCourseRep && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuCourse(mod);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Course actions"
                      aria-label="Course options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}

                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-blue-600 transition-colors" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Slide-in Bottom Sheet Menu for Course Rep Options */}
      <AnimatePresence>
        {openMenuCourse && (
          <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="fixed inset-0 bg-black/45 backdrop-blur-xs"
              onClick={() => setOpenMenuCourse(null)}
            />

            {/* Slide-in Sheet from under the app */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className="relative w-full max-w-lg bg-white rounded-t-[32px] p-5 pb-8 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] z-10 border-t border-slate-100 flex flex-col gap-3.5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Pill */}
              <div className="w-12 h-1 rounded-full bg-slate-300 mx-auto -mt-1" />

              {/* Course Info Header */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 pt-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-[16px] bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 font-extrabold text-sm shrink-0">
                    {openMenuCourse.courseCode || openMenuCourse.code}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-slate-900 truncate">
                      {openMenuCourse.title || openMenuCourse.name}
                    </h3>
                    <p className="text-[12px] text-slate-500 truncate">
                      {openMenuCourse.units ? `${openMenuCourse.units} Units` : '3 Units'} • {openMenuCourse.semester || '1st Semester'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenMenuCourse(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const c = openMenuCourse;
                    setOpenMenuCourse(null);
                    setSelectedCourseDetail(c);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13.5px] font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all text-left bg-slate-50 cursor-pointer"
                >
                  <BookMarked className="w-4 h-4 text-blue-500" />
                  <span>Open Module Materials</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const c = openMenuCourse;
                    setOpenMenuCourse(null);
                    setEditingCourse(c);
                    setIsAddModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13.5px] font-bold text-slate-800 hover:bg-amber-50 hover:text-amber-700 rounded-2xl transition-all text-left bg-slate-50 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-amber-500" />
                  <span>Edit Course Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const c = openMenuCourse;
                    setOpenMenuCourse(null);
                    setCourseToDelete(c);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13.5px] font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-all text-left bg-rose-50/50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Delete Course</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setOpenMenuCourse(null)}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13.5px] transition-colors text-center mt-1 cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (Hovering Plus Icon) for Course Rep */}
      {effectiveCourseRep && (
        <div className="fixed bottom-[84px] inset-x-0 max-w-lg mx-auto pointer-events-none z-40 flex justify-end px-5">
          <motion.button
            key="floating-module-fab-btn"
            initial={{ opacity: 0, scale: 0.75, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.75, y: 15 }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', damping: 22, stiffness: 350 }}
            onClick={() => {
              setEditingCourse(null);
              setIsAddModalOpen(true);
            }}
            aria-label="Add Course Module"
            title="Add Course Module"
            className="w-14 h-14 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-[0_10px_28px_rgba(0,122,255,0.45)] hover:bg-[#0069D9] cursor-pointer border border-blue-300/40 group pointer-events-auto transition-colors"
          >
            <Plus className="w-7 h-7 text-white stroke-[2.5] transition-transform duration-300 group-hover:rotate-90" />
          </motion.button>
        </div>
      )}

      {/* Add / Edit Course Modal for Course Rep */}
      <AddCourseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCourse(null);
        }}
        onSave={handleSaveCourse}
        departmentName={deptDisplayName}
        departmentId={deptId}
        currentLevel={activeLevel}
        initialSemester={activeSemester}
        editingCourse={editingCourse}
        availableDepartments={availableDepartments}
      />

      {/* Confirmation Modal for Deletion */}
      <ConfirmDeleteModal
        isOpen={!!courseToDelete}
        title="Delete Course Module"
        itemName={courseToDelete ? `${courseToDelete.courseCode || courseToDelete.code || 'Course'} - ${courseToDelete.title || courseToDelete.name || ''}` : ''}
        itemType="course module"
        description="Are you sure you want to delete this course module? This will remove it from the department curriculum."
        confirmLabel="Delete Module"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setCourseToDelete(null)}
      />
    </motion.div>
  );
};

export const ProfileView: React.FC<OtherViewProps> = ({
  profileImage,
  onUploadProfileImage,
  isLoading = false,
  userSession,
  onLogout,
  currentSemester = '1st Semester 2025/2026',
  activeLevel: activeLevelProp,
  activeSemester: activeSemesterProp,
  isCourseRep = false,
  onUpdateUserSession,
  onNavigateToAdmin,
  onAddNotification,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Level Advisor State with persistence
  const [advisorName, setAdvisorName] = useState(() => localStorage.getItem('student_level_advisor_name') || 'Prof. A. Adeleke');
  const [advisorTitle, setAdvisorTitle] = useState(() => localStorage.getItem('student_level_advisor_title') || 'Department Level Advisor');
  const [advisorOffice, setAdvisorOffice] = useState(() => localStorage.getItem('student_level_advisor_office') || 'Faculty of Science Complex, Block B, Room 304');
  const [advisorPhone, setAdvisorPhone] = useState(() => localStorage.getItem('student_level_advisor_phone') || '+234 803 456 7890');
  const [advisorEmail, setAdvisorEmail] = useState(() => localStorage.getItem('student_level_advisor_email') || 'advisor.adeleke@university.edu');
  const [advisorHours, setAdvisorHours] = useState('Mondays & Wednesdays: 10:00 AM – 2:00 PM');
  
  const [isEditAdvisorOpen, setIsEditAdvisorOpen] = useState(false);
  const [isAdvisorDetailsOpen, setIsAdvisorDetailsOpen] = useState(false);
  const [isSupportPageOpen, setIsSupportPageOpen] = useState(false);
  const [advisorCopiedField, setAdvisorCopiedField] = useState<string | null>(null);

  const [tempAdvisorName, setTempAdvisorName] = useState(advisorName);
  const [tempAdvisorTitle, setTempAdvisorTitle] = useState(advisorTitle);
  const [tempAdvisorOffice, setTempAdvisorOffice] = useState(advisorOffice);
  const [tempAdvisorPhone, setTempAdvisorPhone] = useState(advisorPhone);
  const [tempAdvisorEmail, setTempAdvisorEmail] = useState(advisorEmail);

  // Wallet Page Navigation State
  const [isWalletPageOpen, setIsWalletPageOpen] = useState(false);
  const currentBal = typeof userSession?.wallet_balance === 'number'
    ? userSession.wallet_balance
    : (typeof (userSession as any)?.walletBalance === 'number' ? (userSession as any).walletBalance : 0);
  const [walletBalance, setWalletBalance] = useState<number>(currentBal);

  useEffect(() => {
    if (typeof userSession?.wallet_balance === 'number') {
      setWalletBalance(userSession.wallet_balance);
    } else if (typeof (userSession as any)?.walletBalance === 'number') {
      setWalletBalance((userSession as any).walletBalance);
    }
  }, [userSession?.wallet_balance, (userSession as any)?.walletBalance]);

  const effectiveCourseRep = isCourseRep || Boolean(userSession?.isCourseRep || (userSession as any)?.iscourserep || userSession?.isAdmin);

  const activeLevel = activeLevelProp || getStudentActiveLevel(userSession);
  const studentYearLevel = `${activeLevel} Level`;
  const studentCurrentSemester = normalizeSemester(activeSemesterProp || getStudentActiveSemester(userSession, currentSemester));

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (isSupportPageOpen) {
    return (
      <SupportPage
        onBack={() => setIsSupportPageOpen(false)}
        userSession={userSession}
        onOpenAdvisorModal={() => {
          setIsSupportPageOpen(false);
          setIsAdvisorDetailsOpen(true);
        }}
      />
    );
  }

  if (isWalletPageOpen) {
    return (
      <WalletView
        onBack={() => {
          setIsWalletPageOpen(false);
        }}
        userSession={userSession}
        activeLevel={activeLevel}
        activeSemester={studentCurrentSemester}
        isCourseRep={effectiveCourseRep}
        onSessionUpdated={(updates) => {
          if (onUpdateUserSession) {
            onUpdateUserSession(updates);
          }
          if (typeof updates.wallet_balance === 'number') {
            setWalletBalance(updates.wallet_balance);
          }
        }}
        onAddNotification={onAddNotification}
      />
    );
  }

  const studentName = userSession?.fullName || 'Student User';
  const studentDepartment = userSession?.department || 'Department of Industrial Chemistry';
  const studentMatric = userSession?.matricNumber || 'CSC/2026/001';
  const studentEmail = userSession?.email || 'student@university.edu';

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

  const handleSaveAdvisor = (e: React.FormEvent) => {
    e.preventDefault();
    setAdvisorName(tempAdvisorName);
    setAdvisorTitle(tempAdvisorTitle);
    setAdvisorOffice(tempAdvisorOffice);
    setAdvisorPhone(tempAdvisorPhone);
    setAdvisorEmail(tempAdvisorEmail);
    localStorage.setItem('student_level_advisor_name', tempAdvisorName);
    localStorage.setItem('student_level_advisor_title', tempAdvisorTitle);
    localStorage.setItem('student_level_advisor_office', tempAdvisorOffice);
    localStorage.setItem('student_level_advisor_phone', tempAdvisorPhone);
    localStorage.setItem('student_level_advisor_email', tempAdvisorEmail);
    setIsEditAdvisorOpen(false);
  };

  const handleCopyAdvisorField = (val: string, fieldName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(val);
      setAdvisorCopiedField(fieldName);
      setTimeout(() => setAdvisorCopiedField(null), 2000);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 pb-24"
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

      {/* Profile Header Card */}
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
          <span className="text-[12px] font-bold text-[#007AFF] bg-blue-50/90 px-3.5 py-1 rounded-full border border-blue-200/60 shadow-2xs font-mono">
            {studentYearLevel}
          </span>
          {effectiveCourseRep ? (
            <span className="text-[12px] font-bold text-amber-800 bg-amber-100/90 px-3.5 py-1 rounded-full border border-amber-300 shadow-2xs flex items-center gap-1">
              <span>★</span> Course Rep Free Access
            </span>
          ) : ((userSession as any)?.is_payed || (userSession as any)?.is_paid) ? (
            <span className="text-[12px] font-bold text-emerald-800 bg-emerald-100/90 px-3.5 py-1 rounded-full border border-emerald-300 shadow-2xs flex items-center gap-1">
              <span>✓</span> Semester Access Active
            </span>
          ) : (
            <span className="text-[12px] font-bold text-rose-800 bg-rose-100/90 px-3.5 py-1 rounded-full border border-rose-300 shadow-2xs flex items-center gap-1">
              <span>✕</span> Semester Access Required
            </span>
          )}
        </div>
      </motion.div>

      {/* Profile Details Card with Interactive Level Advisor */}
      <motion.div
        variants={itemVariants}
        className="glass-container rounded-[26px] p-4.5 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/80 text-[13.5px]"
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
          <span className="text-[#007AFF] font-bold">{studentCurrentSemester}</span>
        </div>
        <div
          onClick={() => setIsAdvisorDetailsOpen(true)}
          className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-xl hover:bg-blue-50/60 transition-all cursor-pointer group select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 group-hover:bg-blue-100 text-[#007AFF] flex items-center justify-center transition-colors shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#1C1C1E] font-bold group-hover:text-blue-600 transition-colors">Level Advisor</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100/80 text-blue-700">Tap details</span>
              </div>
              <span className="text-[11px] text-slate-400 block truncate max-w-[170px]">{advisorTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-800 font-bold group-hover:text-blue-600 transition-colors">{advisorName}</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </div>
      </motion.div>

      {/* WALLET LINK CARD */}
      <motion.div
        variants={itemVariants}
        onClick={() => setIsWalletPageOpen(true)}
        className="glass-container rounded-[26px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/80 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-[16px] font-bold text-[#1C1C1E]">Wallet</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-mono">
                  Active
                </span>
              </div>
              <p className="text-[12px] text-slate-500 font-medium">Semester Access, Paystack Top-up &amp; Peer Transfers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400 font-medium block">Balance</span>
              <span className="text-[15px] font-black text-slate-900">₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center text-slate-400 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* SUPPORT LINK CARD */}
      <motion.div
        variants={itemVariants}
        onClick={() => setIsSupportPageOpen(true)}
        className="glass-container rounded-[26px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/80 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-[16px] font-bold text-[#1C1C1E]">Support</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-mono">
                  24/7 Desk
                </span>
              </div>
              <p className="text-[12px] text-slate-500 font-medium">FAQs, Ticket Support &amp; Department Helpdesk</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center text-slate-400 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </motion.div>

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

      {/* Level Advisor Details Modal */}
      <AnimatePresence>
        {isAdvisorDetailsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[28px] p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 text-slate-900"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#007AFF] flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[16.5px] font-bold text-[#1C1C1E]">Level Advisor Details</h4>
                    <p className="text-[11.5px] text-slate-500">{studentDepartment}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdvisorDetailsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Advisor Card Information */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3.5 text-[13px]">
                <div>
                  <span className="text-[10.5px] font-bold text-[#007AFF] uppercase tracking-wider block">
                    Academic Advisor
                  </span>
                  <h3 className="text-[17px] font-extrabold text-slate-900 leading-tight mt-0.5">
                    {advisorName}
                  </h3>
                  <p className="text-[12px] text-slate-500 font-medium">{advisorTitle}</p>
                </div>

                {/* Office Location */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block">Office Location</span>
                      <p className="text-[13px] font-semibold text-slate-800 leading-snug">{advisorOffice}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyAdvisorField(advisorOffice, 'office')}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-[11px] font-bold shrink-0 cursor-pointer"
                    title="Copy Office Location"
                  >
                    {advisorCopiedField === 'office' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Phone Number */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block">Direct Contact / Phone</span>
                      <p className="text-[13px] font-bold text-slate-900 font-mono">{advisorPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${advisorPhone.replace(/\s+/g, '')}`}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-[11.5px] font-bold"
                    >
                      Call
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyAdvisorField(advisorPhone, 'phone')}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-[11px] font-bold cursor-pointer"
                      title="Copy Phone Number"
                    >
                      {advisorCopiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Email Address */}
                {advisorEmail && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 block">University Email</span>
                        <p className="text-[12.5px] font-semibold text-slate-800 break-all">{advisorEmail}</p>
                      </div>
                    </div>
                    <a
                      href={`mailto:${advisorEmail}`}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#007AFF] hover:bg-blue-100 transition-colors text-[11.5px] font-bold shrink-0"
                    >
                      Email
                    </a>
                  </div>
                )}

                {/* Consultation Hours */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">Walk-in Consultation Hours</span>
                    <p className="text-[12px] font-medium text-slate-700 leading-snug">{advisorHours}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                {effectiveCourseRep && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdvisorDetailsOpen(false);
                      setTempAdvisorName(advisorName);
                      setTempAdvisorTitle(advisorTitle);
                      setTempAdvisorOffice(advisorOffice);
                      setTempAdvisorPhone(advisorPhone);
                      setTempAdvisorEmail(advisorEmail);
                      setIsEditAdvisorOpen(true);
                    }}
                    className="flex-1 py-2.5 rounded-[18px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Info (Course Rep)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAdvisorDetailsOpen(false)}
                  className="flex-1 py-2.5 rounded-[18px] bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold transition-colors cursor-pointer shadow-md shadow-blue-600/20"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Level Advisor Modal (Course Rep) */}
      <AnimatePresence>
        {isEditAdvisorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[26px] p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#007AFF] flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-[17px] font-bold text-[#1C1C1E]">Edit Level Advisor</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditAdvisorOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAdvisor} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Advisor Full Name</label>
                  <input
                    type="text"
                    required
                    value={tempAdvisorName}
                    onChange={(e) => setTempAdvisorName(e.target.value)}
                    placeholder="e.g. Prof. A. Adeleke"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Title / Designation</label>
                  <input
                    type="text"
                    required
                    value={tempAdvisorTitle}
                    onChange={(e) => setTempAdvisorTitle(e.target.value)}
                    placeholder="e.g. Department Level Advisor & Associate Prof."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Office Location</label>
                  <input
                    type="text"
                    value={tempAdvisorOffice}
                    onChange={(e) => setTempAdvisorOffice(e.target.value)}
                    placeholder="e.g. Faculty of Science Complex, Block B, Room 304"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone / Extension</label>
                  <input
                    type="text"
                    value={tempAdvisorPhone}
                    onChange={(e) => setTempAdvisorPhone(e.target.value)}
                    placeholder="e.g. +234 803 456 7890"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Advisor Email</label>
                  <input
                    type="email"
                    value={tempAdvisorEmail}
                    onChange={(e) => setTempAdvisorEmail(e.target.value)}
                    placeholder="e.g. advisor.adeleke@university.edu"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditAdvisorOpen(false)}
                    className="flex-1 py-2.5 rounded-[18px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-[18px] bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold transition-colors cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    Save Advisor
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

export { WalletView };
