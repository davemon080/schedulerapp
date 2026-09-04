import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Award, 
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  CalendarDays,
  Users,
  GraduationCap,
  RotateCcw,
  FastForward,
  ChevronRight,
  Check,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  fetchCurrentSemester, 
  updateCurrentSemester, 
  normalizeSemester,
  fetchStudents,
  transitionAcademicSemester,
  promoteStudentsToNextAcademicLevel,
  demoteStudentsToPreviousAcademicLevel,
  correctAllStudentsTo100LFirstSemester,
  correctAllStudentsTo100LSecondSemester,
  subscribeToRealtimeDatabase,
} from '@src/lib/dbService';
import { 
  generateAcademicSessions, 
  getNextAcademicSession, 
  getPreviousAcademicSession,
  parseSessionYears,
} from '@src/lib/academicScope';
import { StudentProfileRecord } from './types';

interface AdminSemesterManagerProps {
  onSemesterChanged?: (newSemester: string) => void;
}

export const AdminSemesterManager: React.FC<AdminSemesterManagerProps> = ({
  onSemesterChanged,
}) => {
  const [currentSemester, setCurrentSemester] = useState<string>('1st Semester');
  const [academicSession, setAcademicSession] = useState<string>('2025/2026');
  const [students, setStudents] = useState<StudentProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [extraYearsAhead, setExtraYearsAhead] = useState<number>(0);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [targetSemesterToSwitch, setTargetSemesterToSwitch] = useState<string>('1st Semester');
  const [targetSessionToSwitch, setTargetSessionToSwitch] = useState<string>('2025/2026');
  const [transitionActionType, setTransitionActionType] = useState<'advance' | 'rewind' | 'custom'>('advance');
  const [autoPromoteStudents, setAutoPromoteStudents] = useState<boolean>(true);
  const [autoDemoteStudents, setAutoDemoteStudents] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Dynamic automatic session generator:
  // Automatically creates continuous timeline (e.g. 2023/2024 ... 2028/2029, 2029/2030, 2030/2031 and beyond)
  const availableSessions = useMemo(() => {
    return generateAcademicSessions(academicSession, {
      startYear: 2023,
      futureYearsCount: 6 + extraYearsAhead,
    });
  }, [academicSession, extraYearsAhead]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [semRecord, studentList] = await Promise.all([
        fetchCurrentSemester(),
        fetchStudents()
      ]);

      if (semRecord) {
        const code = semRecord.semester_code || '1st Semester 2025/2026';
        setCurrentSemester(normalizeSemester(code));
        
        // Extract session if present (e.g. "1st Semester 2025/2026")
        const sessionMatch = code.match(/\d{4}\/\d{4}/);
        if (sessionMatch) {
          setAcademicSession(sessionMatch[0]);
        }
      }

      if (studentList) {
        setStudents(studentList);
      }
    } catch (e) {
      console.error('Error loading semester data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to live Firestore changes for real-time synchronization
    const unsubscribe = subscribeToRealtimeDatabase({
      onCurrentSemester: (code) => {
        if (code) {
          setCurrentSemester(normalizeSemester(code));
          const sessionMatch = code.match(/\d{4}\/\d{4}/);
          if (sessionMatch) {
            setAcademicSession(sessionMatch[0]);
          }
        }
      },
      onStudents: (studentList) => {
        if (studentList && studentList.length > 0) {
          setStudents(studentList);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Compute student counts per level
  const students100L = students.filter(s => (s.level === 100 || s.year_level?.includes('100')) && s.status !== 'graduated');
  const students200L = students.filter(s => (s.level === 200 || s.year_level?.includes('200')) && s.status !== 'graduated');
  const students300L = students.filter(s => (s.level === 300 || s.year_level?.includes('300')) && s.status !== 'graduated');
  const students400L = students.filter(s => (s.level === 400 || s.year_level?.includes('400')) && s.status !== 'graduated');
  const students500L = students.filter(s => (s.level === 500 || s.year_level?.includes('500')) && s.status !== 'graduated');
  const graduatedStudents = students.filter(s => s.status === 'graduated' || s.year_level?.toLowerCase().includes('graduated'));

  const isFirstSemester = currentSemester === '1st Semester';

  // Rewind backwards 1 semester (2nd -> 1st)
  const handleRewindTo1stSemester = () => {
    setTargetSemesterToSwitch('1st Semester');
    setTargetSessionToSwitch(academicSession);
    setTransitionActionType('rewind');
    setAutoPromoteStudents(false);
    setAutoDemoteStudents(false);
    setShowConfirmModal(true);
  };

  // Advance forward 1 semester (1st -> 2nd)
  const handleAdvanceTo2ndSemester = () => {
    setTargetSemesterToSwitch('2nd Semester');
    setTargetSessionToSwitch(academicSession);
    setTransitionActionType('advance');
    setAutoPromoteStudents(false);
    setAutoDemoteStudents(false);
    setShowConfirmModal(true);
  };

  // Conclude 2nd Semester & Advance to Next Academic Year (with promotion 100L->200L, 200L->300L, etc.)
  const handleConcludeYearAndPromote = () => {
    const nextSession = getNextAcademicSession(academicSession);
    
    setTargetSemesterToSwitch('1st Semester');
    setTargetSessionToSwitch(nextSession);
    setTransitionActionType('advance');
    setAutoPromoteStudents(true);
    setAutoDemoteStudents(false);
    setShowConfirmModal(true);
  };

  // Rewind to Previous Academic Year (e.g. 2026/2027 -> 2025/2026)
  const handleRewindToPreviousYear = () => {
    const prevSession = getPreviousAcademicSession(academicSession);
    
    setTargetSemesterToSwitch('2nd Semester');
    setTargetSessionToSwitch(prevSession);
    setTransitionActionType('rewind');
    setAutoPromoteStudents(false);
    setAutoDemoteStudents(false);
    setShowConfirmModal(true);
  };

  // Jump to specific custom session & semester from the timeline
  const handleCustomTimelineJump = (session: string, sem: '1st Semester' | '2nd Semester') => {
    if (session === academicSession && sem === currentSemester) {
      showToast(`${sem} (${session}) is currently active.`);
      return;
    }

    setTargetSemesterToSwitch(sem);
    setTargetSessionToSwitch(session);
    setTransitionActionType('custom');
    setAutoPromoteStudents(false);
    setAutoDemoteStudents(false);
    setShowConfirmModal(true);
  };

  // Execute the confirmed transition
  const handleConfirmTransition = async () => {
    setIsUpdating(true);
    const newSemesterCode = `${targetSemesterToSwitch} ${targetSessionToSwitch}`.trim();
    try {
      const res = await transitionAcademicSemester(newSemesterCode, {
        promoteStudents: autoPromoteStudents,
        demoteStudents: autoDemoteStudents,
      });

      if (res.success) {
        setCurrentSemester(targetSemesterToSwitch);
        setAcademicSession(targetSessionToSwitch);
        onSemesterChanged?.(newSemesterCode);

        let successMsg = `Semester updated to ${newSemesterCode}.`;
        if (autoPromoteStudents && (res.promotedCount || 0) > 0) {
          successMsg += ` Successfully promoted ${res.promotedCount} student(s) to next level!`;
        } else if (autoDemoteStudents && (res.demotedCount || 0) > 0) {
          successMsg += ` Rewound ${res.demotedCount} student(s) level.`;
        }

        showToast(successMsg);
        await loadData();
      } else {
        showToast('Failed to update semester in database.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error executing semester transition.');
    } finally {
      setIsUpdating(false);
      setShowConfirmModal(false);
    }
  };

  // Manual Trigger: Promote all students immediately
  const handleManualPromote = async () => {
    if (!window.confirm('Are you sure you want to promote all students to their next academic level now? (100L ➔ 200L, 200L ➔ 300L, 300L ➔ 400L, 400L ➔ Graduated)')) {
      return;
    }
    setIsUpdating(true);
    try {
      const res = await promoteStudentsToNextAcademicLevel();
      if (res.success) {
        showToast(`Successfully promoted ${res.count} student(s)!`);
        await loadData();
      } else {
        showToast('Failed to promote students.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Database Alignment: Place all students in 2025/2026 1st Semester 100L
  const handleAlignDatabaseTo100LFirstSemester = async () => {
    setIsUpdating(true);
    try {
      const res = await correctAllStudentsTo100LFirstSemester();
      if (res.success) {
        showToast(`Database synchronized! Updated ${res.totalUpdated} student(s) to 2025/2026 1st Semester 100L.`);
        await loadData();
      } else {
        showToast('Database synchronization completed.');
      }
    } catch (e) {
      console.error(e);
      showToast('Error syncing database records.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Database Alignment: Place all students in 2025/2026 2nd Semester 100L
  const handleAlignDatabaseTo100LSecondSemester = async () => {
    setIsUpdating(true);
    try {
      const res = await correctAllStudentsTo100LSecondSemester();
      if (res.success) {
        showToast(`Database synchronized! Updated ${res.totalUpdated} student(s) to 2025/2026 2nd Semester 100L.`);
        await loadData();
      } else {
        showToast('Database synchronization completed.');
      }
    } catch (e) {
      console.error(e);
      showToast('Error syncing database records.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate the next academic session string for the add button
  const lastGeneratedSession = availableSessions[availableSessions.length - 1];
  const nextSessionToGenerate = getNextAcademicSession(lastGeneratedSession);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[12px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Academic Session
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[12px] font-semibold">
                Session {academicSession}
              </span>
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[12px] font-semibold">
                {currentSemester}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {currentSemester} &bull; {academicSession}
            </h2>
            <p className="text-slate-300 text-[13.5px] max-w-2xl leading-relaxed">
              All student timetables, course modules, assignments, and study materials are synchronized to this active semester. We are currently in 1st Semester until an admin advances or concludes the semester.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              onClick={handleAlignDatabaseTo100LFirstSemester}
              disabled={isUpdating}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-bold border border-blue-400/40 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-900/40 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>Align 100L 1st Sem</span>
            </button>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-[13px] font-semibold border border-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK BIDIRECTIONAL REWIND & ADVANCE CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* REWIND CONTROLS CARD */}
        <div className="glass-container rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 bg-white/90">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Rewind Semesters Back</h3>
              <p className="text-xs text-slate-500">Step backwards to previous terms or prior sessions</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Need to revisit past courses or undo a premature semester transition? Rewind back without losing any student materials or historical database records.
          </p>

          <div className="space-y-2 pt-2">
            {!isFirstSemester ? (
              <button
                type="button"
                onClick={handleRewindTo1stSemester}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4 text-amber-600" />
                  <span>Rewind to 1st Semester ({academicSession})</span>
                </div>
                <span className="text-[11px] font-semibold bg-amber-200/60 px-2 py-0.5 rounded-md">Harmattan Term</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRewindToPreviousYear}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                  <span>Rewind to Previous Academic Session</span>
                </div>
                <span className="text-[11px] font-semibold bg-slate-200 px-2 py-0.5 rounded-md">Prior Year</span>
              </button>
            )}
          </div>
        </div>

        {/* ADVANCE CONTROLS CARD */}
        <div className="glass-container rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 bg-white/90">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60">
              <FastForward className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Advance Semesters Forward</h3>
              <p className="text-xs text-slate-500">Move forward into Rain term or conclude session</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {isFirstSemester 
              ? 'Conclude Harmattan examinations and activate 2nd Semester for all students.'
              : 'End 2nd semester to trigger automatic student level promotions (100L ➔ 200L, 200L ➔ 300L, etc.) and launch the new academic year.'
            }
          </p>

          <div className="space-y-2 pt-2">
            {isFirstSemester ? (
              <button
                type="button"
                onClick={handleAdvanceTo2ndSemester}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-between transition-colors cursor-pointer shadow-md shadow-blue-500/20"
              >
                <div className="flex items-center gap-2">
                  <span>Advance to 2nd Semester ({academicSession})</span>
                  <ArrowRight className="w-4 h-4 text-blue-200" />
                </div>
                <span className="text-[11px] font-semibold bg-blue-500/80 px-2 py-0.5 rounded-md">Rain Term</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConcludeYearAndPromote}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-between transition-colors cursor-pointer shadow-md shadow-purple-500/20"
              >
                <div className="flex items-center gap-2">
                  <span>Conclude 2nd Semester &amp; Promote Students</span>
                  <ArrowRight className="w-4 h-4 text-purple-200" />
                </div>
                <span className="text-[11px] font-semibold bg-purple-500/80 px-2 py-0.5 rounded-md">New Session</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AUTOMATED STUDENT ACADEMIC PROGRESSION VISUALIZER */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Automated Student Level Progression</h3>
              <p className="text-xs text-slate-500">
                When 2nd semester ends, students automatically advance to the next academic level in real-time
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualPromote}
            disabled={isUpdating}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Promote Levels Now</span>
          </button>
        </div>

        {/* Promotion Pipeline Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 100L -> 200L */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700">100 Level</span>
              <span className="text-xs font-extrabold bg-blue-200/70 text-blue-900 px-2 py-0.5 rounded-full">
                {students100L.length}
              </span>
            </div>
            <div className="text-[11px] text-blue-600 flex items-center gap-1 font-medium">
              <span>Promotes to</span>
              <ChevronRight className="w-3 h-3 text-blue-500" />
              <strong className="text-blue-900">200L</strong>
            </div>
            <p className="text-[10.5px] text-blue-700/80 leading-tight">Freshers ➔ Sophomores</p>
          </div>

          {/* 200L -> 300L */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700">200 Level</span>
              <span className="text-xs font-extrabold bg-indigo-200/70 text-indigo-900 px-2 py-0.5 rounded-full">
                {students200L.length}
              </span>
            </div>
            <div className="text-[11px] text-indigo-600 flex items-center gap-1 font-medium">
              <span>Promotes to</span>
              <ChevronRight className="w-3 h-3 text-indigo-500" />
              <strong className="text-indigo-900">300L</strong>
            </div>
            <p className="text-[10.5px] text-indigo-700/80 leading-tight">Sophomores ➔ Penultimate</p>
          </div>

          {/* 300L -> 400L */}
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700">300 Level</span>
              <span className="text-xs font-extrabold bg-purple-200/70 text-purple-900 px-2 py-0.5 rounded-full">
                {students300L.length}
              </span>
            </div>
            <div className="text-[11px] text-purple-600 flex items-center gap-1 font-medium">
              <span>Promotes to</span>
              <ChevronRight className="w-3 h-3 text-purple-500" />
              <strong className="text-purple-900">400L</strong>
            </div>
            <p className="text-[10.5px] text-purple-700/80 leading-tight">Penultimate ➔ Senior Year</p>
          </div>

          {/* 400L -> 500L / Graduated */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-700">400 Level</span>
              <span className="text-xs font-extrabold bg-teal-200/70 text-teal-900 px-2 py-0.5 rounded-full">
                {students400L.length}
              </span>
            </div>
            <div className="text-[11px] text-teal-600 flex items-center gap-1 font-medium">
              <span>Advances to</span>
              <ChevronRight className="w-3 h-3 text-teal-500" />
              <strong className="text-teal-900">500L / Alumni</strong>
            </div>
            <p className="text-[10.5px] text-teal-700/80 leading-tight">5-Yr Adv. / 4-Yr Grad</p>
          </div>

          {/* 500L -> Graduated */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700">500 Level</span>
              <span className="text-xs font-extrabold bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full">
                {students500L.length}
              </span>
            </div>
            <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
              <span>Graduates to</span>
              <ChevronRight className="w-3 h-3 text-emerald-500" />
              <strong className="text-emerald-900">Alumni</strong>
            </div>
            <p className="text-[10.5px] text-emerald-700/80 leading-tight">5-Yr Degree Completion</p>
          </div>
        </div>
      </div>

      {/* DIRECT ACADEMIC SESSION & SEMESTER SELECTOR TIMELINE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-100 text-slate-700">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Interactive Academic Timeline Selector</h3>
            <p className="text-xs text-slate-500">
              Jump directly to any past or upcoming semester in one click
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {availableSessions.map((sess) => {
            const isCurrentSession = sess === academicSession;
            const isFirstSemActive = isCurrentSession && isFirstSemester;
            const isSecondSemActive = isCurrentSession && !isFirstSemester;

            return (
              <div 
                key={sess} 
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrentSession 
                    ? 'bg-blue-50/40 border-blue-300 ring-2 ring-blue-500/15 shadow-2xs' 
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CalendarDays className={`w-3.5 h-3.5 ${isCurrentSession ? 'text-blue-600' : 'text-slate-500'}`} />
                    Session {sess}
                  </span>
                  {isCurrentSession && (
                    <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                      ACTIVE NOW
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCustomTimelineJump(sess, '1st Semester')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                      isFirstSemActive
                        ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/40'
                        : 'bg-white hover:bg-blue-50 text-slate-700 border border-slate-200/80 hover:border-blue-300'
                    }`}
                  >
                    {isFirstSemActive && <Check className="w-3 h-3 text-white shrink-0" />}
                    <span>1st Semester</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCustomTimelineJump(sess, '2nd Semester')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                      isSecondSemActive
                        ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-400/40'
                        : 'bg-white hover:bg-purple-50 text-slate-700 border border-slate-200/80 hover:border-purple-300'
                    }`}
                  >
                    {isSecondSemActive && <Check className="w-3 h-3 text-white shrink-0" />}
                    <span>2nd Semester</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Dynamic Expansion Card: Allows adding further upcoming academic sessions */}
          <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300/80 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 transition-all flex flex-col justify-center items-center text-center gap-2 group">
            <div className="p-2 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                Future Sessions
              </div>
              <div className="text-[11px] text-slate-500">
                Next: {nextSessionToGenerate}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setExtraYearsAhead((prev) => prev + 1);
                showToast(`Generated academic session ${nextSessionToGenerate}!`);
              }}
              className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-white group-hover:bg-blue-600 text-slate-700 group-hover:text-white border border-slate-200 group-hover:border-blue-600 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add Next Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Switch to {targetSemesterToSwitch} ({targetSessionToSwitch})?
                </h3>
                <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                  You are about to switch the university portal state from <strong>{currentSemester} ({academicSession})</strong> to <strong>{targetSemesterToSwitch} ({targetSessionToSwitch})</strong>.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-[12.5px] text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Semester:</span>
                  <span className="font-bold text-slate-900">{targetSemesterToSwitch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Session:</span>
                  <span className="font-bold text-slate-900">{targetSessionToSwitch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Database Destination:</span>
                  <span className="font-mono text-blue-600 font-semibold">current_semester/sem-active</span>
                </div>
              </div>

              {/* Student Level Progression Option */}
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoPromoteStudents}
                    onChange={(e) => {
                      setAutoPromoteStudents(e.target.checked);
                      if (e.target.checked) setAutoDemoteStudents(false);
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-blue-900 block">
                      Promote Student Levels Automatically
                    </span>
                    <span className="text-[11px] text-blue-700 block leading-tight">
                      Advances 100L ➔ 200L, 200L ➔ 300L, 300L ➔ 400L, 400L ➔ Graduated in Firestore.
                    </span>
                  </div>
                </label>
              </div>

              {/* Semester Reset Policy Notice */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
                <strong>Semester Transition Policy:</strong> Schedules, deadlines, broadcasts, and dashboard notifications will be reset for the new semester term. <em>Courses on modules page, PDFs, outlines, and lecture videos will never be reset and will remain permanently for incoming students.</em>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleConfirmTransition}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold transition-colors cursor-pointer shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Confirm Transition</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800 text-[13px] font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

