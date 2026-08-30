import React from 'react';
import { Calendar, CalendarDays, CheckCircle2, ChevronRight, Sparkles, GraduationCap, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export interface AcademicTimelineSelectorProps {
  currentSession: string; // e.g. "2025/2026"
  currentSemester: string; // e.g. "1st Semester" or "2nd Semester"
  availableSessions?: string[];
  onSelectTimeline?: (session: string, semester: '1st Semester' | '2nd Semester') => void;
  isLoading?: boolean;
  compact?: boolean;
  className?: string;
  showLevelMilestones?: boolean;
  maxLevel?: number; // e.g. 500
}

const DEFAULT_SESSIONS = [
  '2023/2024',
  '2024/2025',
  '2025/2026',
  '2026/2027',
  '2027/2028',
  '2028/2029',
];

export const AcademicTimelineSelector: React.FC<AcademicTimelineSelectorProps> = ({
  currentSession = '2025/2026',
  currentSemester = '1st Semester',
  availableSessions = DEFAULT_SESSIONS,
  onSelectTimeline,
  isLoading = false,
  compact = false,
  className = '',
  showLevelMilestones = true,
  maxLevel = 500,
}) => {
  const isFirstSemActive = currentSemester.toLowerCase().includes('1st');

  const milestones = [
    { level: 100, label: '100L (Freshman)', desc: 'Foundational Sciences & General Courses' },
    { level: 200, label: '200L (Sophomore)', desc: 'Core Departmental Modules & Practicals' },
    { level: 300, label: '300L (Penultimate)', desc: 'Specialized Theories, Labs & Research' },
    { level: 400, label: '400L (Senior)', desc: 'Industrial Training / Final Year Project' },
    ...(maxLevel >= 500
      ? [{ level: 500, label: '500L (Advanced Professional)', desc: 'Advanced Degree / Engineering / Tech' }]
      : []),
  ];

  if (compact) {
    return (
      <div className={`bg-white/90 backdrop-blur-md rounded-2xl p-3 border border-slate-200/80 shadow-xs ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Academic Timeline</span>
          </div>
          <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-full">
            {currentSession} • {currentSemester}
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {availableSessions.map((sess) => {
            const isCurrent = sess === currentSession;
            return (
              <div
                key={sess}
                className={`flex-shrink-0 p-1.5 rounded-xl border transition-all ${
                  isCurrent ? 'bg-blue-50/70 border-blue-300' : 'bg-slate-50/60 border-slate-200/60'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-700 mb-1 text-center font-mono">{sess}</div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectTimeline?.(sess, '1st Semester')}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                      isCurrent && isFirstSemActive
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200/70'
                    }`}
                  >
                    1st
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTimeline?.(sess, '2nd Semester')}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                      isCurrent && !isFirstSemActive
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-purple-50 hover:text-purple-600 border border-slate-200/70'
                    }`}
                  >
                    2nd
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6 ${className}`}>
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Interactive Academic Timeline Selector</h3>
              <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                Live Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Jump directly across academic sessions and semesters with automated student level alignment (100L - 500L).
            </p>
          </div>
        </div>

        {/* Current Active Status Pill */}
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200/80 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-xs">
            <span className="text-slate-500 font-medium">Active State: </span>
            <strong className="text-slate-900 font-bold">
              {currentSemester} ({currentSession})
            </strong>
          </div>
        </div>
      </div>

      {/* Interactive Sessions & Semesters Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            Available Academic Timeline Nodes
          </span>
          <span className="text-[11px] text-slate-400">Click any semester to switch portal state</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableSessions.map((sess) => {
            const isCurrentSession = sess === currentSession;
            return (
              <motion.div
                key={sess}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrentSession
                    ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/10 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-mono">
                    Session {sess}
                  </span>
                  {isCurrentSession ? (
                    <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      {sess < currentSession ? 'Archived' : 'Upcoming'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => onSelectTimeline?.(sess, '1st Semester')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                      isCurrentSession && isFirstSemActive
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                        : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 hover:border-blue-300'
                    }`}
                  >
                    {isCurrentSession && isFirstSemActive && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                    )}
                    <span>1st Semester</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => onSelectTimeline?.(sess, '2nd Semester')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                      isCurrentSession && !isFirstSemActive
                        ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/30'
                        : 'bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200/80 hover:border-purple-300'
                    }`}
                  >
                    {isCurrentSession && !isFirstSemActive && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                    )}
                    <span>2nd Semester</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Level Milestones Track (100L -> 500L) */}
      {showLevelMilestones && (
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              Automated Degree Progression Flow (Supporting up to 500L Programmes)
            </span>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              4 &amp; 5 Years Curricula
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {milestones.map((m, idx) => (
              <div
                key={m.level}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-left space-y-1 relative group hover:bg-blue-50/40 hover:border-blue-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-blue-700">{m.level}L</span>
                  <span className="text-[10px] text-slate-400 font-mono">Year {idx + 1}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-800 line-clamp-1">{m.label}</div>
                <div className="text-[10px] text-slate-500 line-clamp-2 leading-tight">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
