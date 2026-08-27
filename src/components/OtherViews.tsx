import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, AlertCircle, FileText, CheckCircle2, Megaphone, BookMarked, FlaskConical, Award, Bell, Shield, ChevronRight, Camera, Image as ImageIcon, Check, Plus, LogOut, Mail, GraduationCap } from 'lucide-react';
import { AssignmentItem, UserSession } from '../types';
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
  onSelectAssignment?: (assignment: AssignmentItem) => void;
  onToggleCompleteAssignment?: (id: string) => void;
  onAddNewDeadline?: () => void;
  userSession?: UserSession | null;
  onLogout?: () => void;
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
      ease: [0.16, 1, 0.3, 1],
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

export const BroadcastsView: React.FC<OtherViewProps> = ({ isLoading = false }) => {
  if (isLoading) {
    return <BroadcastsSkeleton />;
  }

  return (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    className="space-y-4"
  >
    <motion.div variants={itemVariants} className="flex items-center justify-between">
      <h2 className="text-[22px] font-bold text-[#1C1C1E] tracking-tight">Faculty Broadcasts</h2>
      <span className="text-[12px] font-medium text-[#8E8E93]">Physical Sciences</span>
    </motion.div>

    <div className="space-y-3">
      {[
        {
          id: 'b1',
          sender: 'Dept. of Industrial Chemistry',
          time: '2 hours ago',
          title: 'Lab Coat & Safety Goggles Verification Notice',
          body: 'All Year 1 students must present approved PPE before entry into the Organic Chemistry Lab on Thursday.',
          urgent: true,
        },
        {
          id: 'b2',
          sender: 'Faculty Officer',
          time: 'Yesterday',
          title: 'Mid-Semester Timetable Adjustment',
          body: 'Please review the adjusted timetable for General Studies tutorials on Friday afternoon.',
          urgent: false,
        },
      ].map((b) => (
        <motion.div
          key={b.id}
          variants={itemVariants}
          whileHover={{ y: -2 }}
          className="glass-container rounded-[24px] p-5 space-y-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/80 transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#007AFF]" />
              <span className="text-[13px] font-bold text-[#1C1C1E]">{b.sender}</span>
            </div>
            <span className="text-[11px] text-[#8E8E93]">{b.time}</span>
          </div>
          <h4 className="text-[15px] font-bold text-[#1C1C1E]">{b.title}</h4>
          <p className="text-[13px] text-slate-600 leading-relaxed">{b.body}</p>
        </motion.div>
      ))}
    </div>
  </motion.div>
  );
};

export const ModulesView: React.FC<OtherViewProps> = ({ isLoading = false }) => {
  if (isLoading) {
    return <ModulesSkeleton />;
  }

  return (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    className="space-y-4"
  >
    <motion.h2 variants={itemVariants} className="text-[22px] font-bold text-[#1C1C1E] tracking-tight">
      Enrolled Modules
    </motion.h2>
    <div className="grid grid-cols-1 gap-3">
      {[
        { code: 'CHM101', name: 'General Chemistry I', units: '3 Units', teacher: 'Dr. E. Okafor' },
        { code: 'PHY102', name: 'General Physics I', units: '3 Units', teacher: 'Prof. K. Bello' },
        { code: 'MAT101', name: 'Elementary Mathematics', units: '3 Units', teacher: 'Dr. M. Sani' },
        { code: 'GST111', name: 'Communication in English', units: '2 Units', teacher: 'Mrs. T. Adeyemi' },
      ].map((mod) => (
        <motion.div
          key={mod.code}
          variants={itemVariants}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="glass-container rounded-[22px] p-4 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/80 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#007AFF]/10 border border-blue-300/30 flex items-center justify-center text-[#007AFF] font-bold text-[14px]">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-[#1C1C1E]">{mod.code}: {mod.name}</h4>
              <p className="text-[12px] text-[#8E8E93]">{mod.units} • {mod.teacher}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </motion.div>
      ))}
    </div>
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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  const studentName = userSession?.fullName || 'Rapheal Ogwu';
  const studentDepartment = userSession?.department || 'Industrial Chemistry';
  const studentMatric = userSession?.matricNumber || '2025/PS/ICH/000';
  const studentEmail = userSession?.email || 'r.ogwu@student.university.edu';
  const studentFaculty = userSession?.faculty || 'Physical Sciences';
  const studentYearLevel = userSession?.yearLevel || 'Year 1 (Freshman)';

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
            variants={itemVariants}
            whileTap={{ scale: 0.95 }}
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 text-[12px] font-bold border border-red-200/70 transition-all cursor-pointer shadow-2xs"
            title="Sign out of student portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
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
              <>
                <div className="absolute inset-0 bg-white/20 backdrop-blur-xs"></div>
                <FlaskConical className="w-11 h-11 relative z-10" />
              </>
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

        <div className="mt-4 flex justify-center gap-2">
          <span className="text-[12px] font-semibold text-[#007AFF] bg-blue-50/90 px-3 py-1 rounded-full border border-blue-200/60 shadow-2xs">
            {studentYearLevel}
          </span>
          <span className="text-[12px] font-semibold text-slate-700 bg-white/70 px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
            GPA: 4.82
          </span>
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
          <span className="text-[#1C1C1E] font-medium">Faculty</span>
          <span className="text-[#8E8E93]">{studentFaculty}</span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-black/5">
          <span className="text-[#1C1C1E] font-medium">Current Semester</span>
          <span className="text-[#8E8E93]">First Semester 2026/2027</span>
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

      {onLogout && (
        <motion.div variants={itemVariants} className="pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-3.5 rounded-[22px] bg-red-50/80 hover:bg-red-100/90 text-red-600 text-[13.5px] font-bold border border-red-200/70 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Portal</span>
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};
