import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Search,
  Users,
  Shield,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  X,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  GraduationCap,
  Save,
} from 'lucide-react';
import { UserSession, StudentPrivacySettings, DEFAULT_PRIVACY_SETTINGS } from '../types';
import { StudentProfileRecord } from '@admin/types';
import { fetchStudents, updateStudentProfileInDb, detectDepartmentFromMatric } from '../lib/dbService';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Strict coursemate verification helper.
 * A student is an actual coursemate IF AND ONLY IF:
 * 1. Their academic level matches the logged-in student (e.g., 100L only sees 100L).
 * 2. Their department matches the logged-in student (e.g., ICH only sees ICH).
 */
export function isActualCourseMate(
  student: StudentProfileRecord,
  currentUser: UserSession | null
): boolean {
  if (!currentUser) return true;

  // 1. ACADEMIC LEVEL MATCH (e.g. 100L only sees 100L, 200L only sees 200L)
  const myLvlNum = parseInt(String(currentUser.level || 100).replace(/\D/g, ''), 10) || 100;
  const rawStudentLvl = student.level ?? (student as any).year_level ?? 100;
  const sLvlNum = parseInt(String(rawStudentLvl).replace(/\D/g, ''), 10) || 100;
  if (myLvlNum !== sLvlNum) {
    return false;
  }

  // 2. DEPARTMENT MATCH
  const userMatric = (currentUser.matricNumber || currentUser.matric_number || '').toUpperCase().trim();
  const studentMatric = (student.matric_number || student.matricNumber || '').toUpperCase().trim();

  // Resolve user department name and id
  const userDetected = detectDepartmentFromMatric(userMatric);
  const userDept = (currentUser.department || userDetected.department || '').toLowerCase().trim();
  const userDeptId = (currentUser.department_id || userDetected.department_id || '').toLowerCase().trim();

  // Resolve student department name and id
  const studentDetected = detectDepartmentFromMatric(studentMatric);
  const studentDept = (student.department || studentDetected.department || '').toLowerCase().trim();
  const studentDeptId = (student.department_id || studentDetected.department_id || '').toLowerCase().trim();

  // Department ID match
  if (userDeptId && studentDeptId && userDeptId === studentDeptId) {
    return true;
  }

  // Exact department string match
  if (userDept && studentDept && userDept === studentDept) {
    return true;
  }

  // Industrial Chemistry (ICH)
  const isUserICH = userDept.includes('ich') || userDept.includes('industrial') || userMatric.includes('/ICH/') || userDeptId.includes('ich');
  const isStudentICH = studentDept.includes('ich') || studentDept.includes('industrial') || studentMatric.includes('/ICH/') || studentDeptId.includes('ich');
  if (isUserICH || isStudentICH) {
    return isUserICH && isStudentICH;
  }

  // Computer Science (CSC)
  const isUserCSC = userDept.includes('csc') || userDept.includes('computer') || userMatric.includes('/CSC/') || userDeptId.includes('csc');
  const isStudentCSC = studentDept.includes('csc') || studentDept.includes('computer') || studentMatric.includes('/CSC/') || studentDeptId.includes('csc');
  if (isUserCSC || isStudentCSC) {
    return isUserCSC && isStudentCSC;
  }

  // Chemistry (CHM)
  const isUserCHM = userDept.includes('chm') || userDept.includes('chemistry') || userMatric.includes('/CHM/') || userDeptId.includes('chm');
  const isStudentCHM = studentDept.includes('chm') || studentDept.includes('chemistry') || studentMatric.includes('/CHM/') || studentDeptId.includes('chm');
  if (isUserCHM || isStudentCHM) {
    return isUserCHM && isStudentCHM;
  }

  // Biochemistry (BCH)
  const isUserBCH = userDept.includes('bch') || userDept.includes('biochem') || userMatric.includes('/BCH/') || userDeptId.includes('bch');
  const isStudentBCH = studentDept.includes('bch') || studentDept.includes('biochem') || studentMatric.includes('/BCH/') || studentDeptId.includes('bch');
  if (isUserBCH || isStudentBCH) {
    return isUserBCH && isStudentBCH;
  }

  // Microbiology (MCB)
  const isUserMCB = userDept.includes('mcb') || userDept.includes('microbio') || userMatric.includes('/MCB/') || userDeptId.includes('mcb');
  const isStudentMCB = studentDept.includes('mcb') || studentDept.includes('microbio') || studentMatric.includes('/MCB/') || studentDeptId.includes('mcb');
  if (isUserMCB || isStudentMCB) {
    return isUserMCB && isStudentMCB;
  }

  // Physics (PHY)
  const isUserPHY = userDept.includes('phy') || userDept.includes('physics') || userMatric.includes('/PHY/') || userDeptId.includes('phy');
  const isStudentPHY = studentDept.includes('phy') || studentDept.includes('physics') || studentMatric.includes('/PHY/') || studentDeptId.includes('phy');
  if (isUserPHY || isStudentPHY) {
    return isUserPHY && isStudentPHY;
  }

  // Substring match
  if (userDept && studentDept && (userDept.includes(studentDept) || studentDept.includes(userDept))) {
    return true;
  }

  return false;
}

interface CourseMatesViewProps {
  onBack: () => void;
  userSession: UserSession | null;
  onUpdateUserSession?: (updatedSession: UserSession) => void;
  onShowToast?: (msg: string) => void;
  initialStudents?: StudentProfileRecord[];
}

export const CourseMatesView: React.FC<CourseMatesViewProps> = ({
  onBack,
  userSession,
  onUpdateUserSession,
  onShowToast,
  initialStudents,
}) => {
  // Offline-first initial state: check props first, then persistent localStorage cache
  const [students, setStudents] = useState<StudentProfileRecord[]>(() => {
    if (initialStudents && initialStudents.length > 0) return initialStudents;
    try {
      const cached = localStorage.getItem('app_cache_coursemates');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (initialStudents && initialStudents.length > 0) return false;
    try {
      const cached = localStorage.getItem('app_cache_coursemates');
      if (cached && JSON.parse(cached)?.length > 0) return false;
    } catch {}
    return true;
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRole, setFilterRole] = useState<'all' | 'rep' | 'student'>('all');
  
  // Selected student for detail modal
  const [selectedStudent, setSelectedStudent] = useState<StudentProfileRecord | null>(null);

  // Privacy & Profile Edit Modal state
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState<boolean>(false);

  // Current user's editable contact and privacy fields
  const [myPhone, setMyPhone] = useState<string>(
    userSession?.phone || userSession?.phoneNumber || userSession?.phone_number || ''
  );
  const [myAddress, setMyAddress] = useState<string>(userSession?.address || '');
  const [myPrivacy, setMyPrivacy] = useState<StudentPrivacySettings>(() => {
    return (
      userSession?.privacy_settings ||
      userSession?.privacySettings ||
      DEFAULT_PRIVACY_SETTINGS
    );
  });

  // Real-time Firestore synchronization & offline persistent cache
  useEffect(() => {
    let isCancelled = false;

    // 1. Initial direct load
    fetchStudents()
      .then((data) => {
        if (!isCancelled && data && data.length > 0) {
          setStudents(data);
          try {
            localStorage.setItem('app_cache_coursemates', JSON.stringify(data));
          } catch {}
        }
      })
      .catch((e) => console.warn('CourseMates initial fetch notice:', e))
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    // 2. Real-time Firestore listener for instant updates without page reload
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        if (isCancelled || snap.empty) return;
        const liveList: StudentProfileRecord[] = snap.docs
          .filter((dSnap) => {
            const d = dSnap.data();
            const email = (d.email || '').toLowerCase().trim();
            const isSuperAdminOrAdmin =
              d.role === 'super_admin' ||
              d.role === 'Super Administrator' ||
              dSnap.id.startsWith('admin_') ||
              email === 'davemon080@gmail.com';
            return !isSuperAdminOrAdmin;
          })
          .map((dSnap) => {
            const d = dSnap.data();
            const rawMatric = d.matric_number || d.matricNumber || '2025/PS/ICH/0001';
            const detected = detectDepartmentFromMatric(rawMatric);
            const resolvedDept = d.department?.trim() || detected.department;
            const resolvedDeptId = d.department_id || detected.department_id;
            const picUrl = d.profile_pic_url || d.profileImage || d.photoURL || d.profile_picture || '';
            const numLevel =
              typeof d.level === 'number'
                ? d.level
                : (parseInt(String(d.level || d.year_level || 100).replace(/\D/g, ''), 10) || 100);

            return {
              id: dSnap.id,
              uid: dSnap.id,
              email: d.email || '',
              matric_number: rawMatric,
              matricNumber: rawMatric,
              full_name: d.full_name || d.fullName || d.name || 'Student',
              name: d.full_name || d.fullName || d.name || 'Student',
              department_id: resolvedDeptId,
              department: resolvedDept,
              level: numLevel,
              year_level: d.year_level || d.yearLevel || `${numLevel} Level`,
              yearLevel: d.year_level || d.yearLevel || `${numLevel} Level`,
              isadmin: Boolean(d.isadmin || d.isAdmin),
              isAdmin: Boolean(d.isadmin || d.isAdmin),
              iscourserep: Boolean(d.iscourserep || d.isCourseRep),
              isCourseRep: Boolean(d.iscourserep || d.isCourseRep),
              profile_pic_url: picUrl,
              profileImage: picUrl,
              photoURL: picUrl,
              phone: d.phone || d.phoneNumber || d.phone_number || '',
              phoneNumber: d.phone || d.phoneNumber || d.phone_number || '',
              address: d.address || '',
              privacy_settings: d.privacy_settings || d.privacySettings || null,
              privacySettings: d.privacy_settings || d.privacySettings || null,
              created_at: d.created_at || d.createdAt,
            } as StudentProfileRecord;
          });

        setStudents(liveList);
        setIsLoading(false);
        try {
          localStorage.setItem('app_cache_coursemates', JSON.stringify(liveList));
        } catch {}
      },
      (err) => {
        console.warn('Real-time coursemates listener notice (offline fallback):', err);
        if (!isCancelled) setIsLoading(false);
      }
    );

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  // Update local form state when userSession changes
  useEffect(() => {
    if (userSession) {
      setMyPhone(userSession.phone || userSession.phoneNumber || userSession.phone_number || '');
      setMyAddress(userSession.address || '');
      if (userSession.privacy_settings || userSession.privacySettings) {
        setMyPrivacy(userSession.privacy_settings || userSession.privacySettings || DEFAULT_PRIVACY_SETTINGS);
      }
    }
  }, [userSession]);

  const currentMatric = (userSession?.matricNumber || userSession?.matric_number || '').toUpperCase().trim();

  // 1. Strict Coursemates List: ONLY shows students in the exact same department AND level
  const actualCourseMates = useMemo(() => {
    return students.filter((student) => isActualCourseMate(student, userSession));
  }, [students, userSession]);

  // 2. Filtered Course Mates: search query + role filter within actual coursemates only
  const filteredCourseMates = useMemo(() => {
    return actualCourseMates.filter((student) => {
      // 1. Role filter
      const isRep = Boolean(student.iscourserep || student.isCourseRep);
      if (filterRole === 'rep' && !isRep) return false;
      if (filterRole === 'student' && isRep) return false;

      // 2. Search query (matches name, matric, or email)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const sName = (student.full_name || student.fullName || student.name || '').toLowerCase();
        const sMatric = (student.matric_number || student.matricNumber || '').toLowerCase();
        const sEmail = (student.email || '').toLowerCase();
        if (!sName.includes(q) && !sMatric.includes(q) && !sEmail.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [actualCourseMates, filterRole, searchQuery]);

  const repsCount = useMemo(
    () => actualCourseMates.filter((s) => Boolean(s.iscourserep || s.isCourseRep)).length,
    [actualCourseMates]
  );
  const classMembersCount = useMemo(
    () => actualCourseMates.filter((s) => !Boolean(s.iscourserep || s.isCourseRep)).length,
    [actualCourseMates]
  );

  const getInitials = (name: string) => {
    if (!name || name.trim().length === 0) return 'CM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    if (onShowToast) onShowToast(`${label} copied to clipboard!`);
  };

  // Helper to extract privacy settings of any student
  const getStudentPrivacy = (student: StudentProfileRecord): StudentPrivacySettings => {
    // If it's the current user viewing themselves, always show everything
    const sMatric = (student.matric_number || student.matricNumber || '').toUpperCase().trim();
    if (currentMatric && sMatric === currentMatric) {
      return {
        showPhone: true,
        showEmail: true,
        showMatric: true,
        showAddress: true,
        showProfilePic: true,
      };
    }
    const priv = student.privacy_settings || student.privacySettings;
    if (!priv) return DEFAULT_PRIVACY_SETTINGS;
    return {
      showPhone: priv.showPhone ?? true,
      showEmail: priv.showEmail ?? true,
      showMatric: priv.showMatric ?? true,
      showAddress: priv.showAddress ?? true,
      showProfilePic: priv.showProfilePic ?? true,
    };
  };

  const handleSavePrivacySettings = async () => {
    if (!userSession) return;
    setIsSavingPrivacy(true);
    try {
      const userKey = userSession.id || userSession.uid || userSession.email || userSession.matricNumber;
      const updates = {
        phone: myPhone.trim(),
        phoneNumber: myPhone.trim(),
        phone_number: myPhone.trim(),
        address: myAddress.trim(),
        privacy_settings: myPrivacy,
        privacySettings: myPrivacy,
      };

      await updateStudentProfileInDb(userKey, updates);

      const updatedSession: UserSession = {
        ...userSession,
        ...updates,
      };

      if (onUpdateUserSession) {
        onUpdateUserSession(updatedSession);
      }

      // Update in local students list so changes reflect immediately
      setStudents((prev) =>
        prev.map((s) => {
          const sMatric = (s.matric_number || s.matricNumber || '').toUpperCase().trim();
          if (sMatric === currentMatric || s.id === userKey) {
            return {
              ...s,
              ...updates,
            };
          }
          return s;
        })
      );

      if (onShowToast) {
        onShowToast('Privacy settings & contact info saved!');
      }
      setIsPrivacyModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save privacy settings:', err);
      if (onShowToast) {
        onShowToast('Failed to save settings: ' + (err?.message || 'Error'));
      }
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 pb-28"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          id="btn-coursemates-back"
          onClick={onBack}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-white/90 border border-slate-200/80 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all text-slate-700 font-semibold text-[12px] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
          <span>Back</span>
        </button>

        <h2 className="text-[16px] font-bold text-[#1C1C1E] tracking-tight">Course Mates</h2>

        {/* My Privacy Controls Trigger */}
        <button
          id="btn-open-privacy-settings"
          onClick={() => setIsPrivacyModalOpen(true)}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-blue-50 text-[#007AFF] hover:bg-blue-100 border border-blue-200/80 font-bold text-[11.5px] cursor-pointer shadow-2xs active:scale-95 transition-all"
          title="Choose which of your details other students can see"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>My Privacy</span>
        </button>
      </div>

      {/* Directory Banner */}
      <div className="glass-container rounded-[24px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold text-[#1C1C1E] truncate">
              {userSession?.department || 'Department Students'}
            </h3>
            <p className="text-[11.5px] text-[#8E8E93] truncate">
              {actualCourseMates.length} coursemate{actualCourseMates.length === 1 ? '' : 's'} • {userSession?.yearLevel || `${userSession?.level || 100} Level`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsPrivacyModalOpen(true)}
          className="text-[11px] font-bold text-[#007AFF] hover:underline shrink-0 cursor-pointer"
        >
          Edit My Info
        </button>
      </div>

      {/* Search Input & Role Filter Tabs */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-coursemates-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, matric number or email..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <button
            onClick={() => setFilterRole('all')}
            className={`px-3 py-1 rounded-full text-[11.5px] font-bold transition-all cursor-pointer ${
              filterRole === 'all'
                ? 'bg-[#007AFF] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            All Coursemates ({actualCourseMates.length})
          </button>
          <button
            onClick={() => setFilterRole('rep')}
            className={`px-3 py-1 rounded-full text-[11.5px] font-bold transition-all cursor-pointer ${
              filterRole === 'rep'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            Course Reps ({repsCount})
          </button>
          <button
            onClick={() => setFilterRole('student')}
            className={`px-3 py-1 rounded-full text-[11.5px] font-bold transition-all cursor-pointer ${
              filterRole === 'student'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            Class Members ({classMembersCount})
          </button>
        </div>
      </div>

      {/* Course Mates Grid / List */}
      {isLoading ? (
        <div className="space-y-2.5 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-2xs flex items-center gap-3 animate-pulse"
            >
              <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-1/3 bg-slate-200 rounded" />
                <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourseMates.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-[14px] font-bold text-slate-700">No Course Mates Found</h4>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {searchQuery
              ? `No student matching "${searchQuery}"`
              : 'Registered students in your department will appear here.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-[12px] font-bold text-[#007AFF] hover:underline cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          {filteredCourseMates.map((student) => {
            const isMe =
              currentMatric &&
              (student.matric_number || student.matricNumber || '').toUpperCase().trim() === currentMatric;
            const isRep = Boolean(student.iscourserep || student.isCourseRep);
            const privacy = getStudentPrivacy(student);

            const studentName = student.full_name || student.fullName || student.name || 'Student';
            const studentPic = privacy.showProfilePic
              ? student.profile_pic_url || student.profileImage || student.photoURL || student.profile_picture || null
              : null;
            const studentMatric = privacy.showMatric
              ? student.matric_number || student.matricNumber || 'Matric Hidden'
              : 'Matric: Hidden';
            const hasPhone = Boolean((student.phone || student.phoneNumber || student.phone_number) && privacy.showPhone);
            const hasEmail = Boolean(student.email && privacy.showEmail);
            const hasAddress = Boolean(student.address && privacy.showAddress);

            return (
              <motion.div
                key={student.id || student.uid || student.matric_number}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStudent(student)}
                className={`p-3.5 rounded-2xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-sm hover:border-blue-300 flex items-center justify-between gap-3 ${
                  isMe ? 'border-blue-300 bg-blue-50/20 ring-1 ring-blue-400/20' : 'border-slate-200/90'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[13px] shadow-sm overflow-hidden border border-white">
                      {studentPic ? (
                        <img
                          src={studentPic}
                          alt={studentName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(studentName)
                      )}
                    </div>
                    {isRep && (
                      <span
                        title="Course Representative"
                        className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs border border-white"
                      >
                        ★
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13.5px] font-bold text-[#1C1C1E] truncate">
                        {studentName}
                      </span>
                      {isMe && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700">
                          You
                        </span>
                      )}
                      {isRep && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800">
                          Course Rep
                        </span>
                      )}
                    </div>

                    <p className="text-[11.5px] text-slate-500 truncate mt-0.2 font-mono">
                      {studentMatric}
                    </p>

                    {/* Quick badges */}
                    <div className="flex items-center gap-2 mt-1 text-[10.5px] text-slate-400">
                      {hasPhone && (
                        <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                          <Phone className="w-3 h-3" />
                          <span>Phone</span>
                        </span>
                      )}
                      {hasEmail && (
                        <span className="flex items-center gap-0.5 text-blue-600 font-medium">
                          <Mail className="w-3 h-3" />
                          <span>Email</span>
                        </span>
                      )}
                      {hasAddress && (
                        <span className="flex items-center gap-0.5 text-purple-600 font-medium">
                          <MapPin className="w-3 h-3" />
                          <span>Hostel</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-bold text-[#007AFF] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors">
                    View
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ================= STUDENT DETAILS MODAL ================= */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 shadow-2xl border border-slate-100 relative space-y-4"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {(() => {
                const sName = selectedStudent.full_name || selectedStudent.fullName || selectedStudent.name || 'Student';
                const sMatric = selectedStudent.matric_number || selectedStudent.matricNumber || '';
                const isRep = Boolean(selectedStudent.iscourserep || selectedStudent.isCourseRep);
                const privacy = getStudentPrivacy(selectedStudent);
                const sPic = privacy.showProfilePic
                  ? selectedStudent.profile_pic_url || selectedStudent.profileImage || selectedStudent.photoURL || null
                  : null;
                const sPhone = selectedStudent.phone || selectedStudent.phoneNumber || selectedStudent.phone_number || '';
                const sEmail = selectedStudent.email || '';
                const sAddress = selectedStudent.address || '';
                const isMe = currentMatric && sMatric.toUpperCase().trim() === currentMatric;

                return (
                  <>
                    {/* Header with avatar */}
                    <div className="text-center pt-2">
                      <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-md relative overflow-hidden border-2 border-white">
                        {sPic ? (
                          <img
                            src={sPic}
                            alt={sName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials(sName)
                        )}
                        {isRep && (
                          <span
                            title="Course Rep"
                            className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white"
                          >
                            ★
                          </span>
                        )}
                      </div>

                      <h3 className="text-[17px] font-bold text-[#1C1C1E] mt-2.5">
                        {sName}
                      </h3>
                      <p className="text-[12px] text-slate-500 font-medium">
                        {selectedStudent.department || userSession?.department || 'Department Student'}
                      </p>

                      <div className="flex items-center justify-center gap-1.5 mt-2">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#007AFF] border border-blue-200/60 font-mono">
                          {selectedStudent.year_level || selectedStudent.yearLevel || `${selectedStudent.level || 100} Level`}
                        </span>
                        {isRep && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            ★ Course Rep
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details List */}
                    <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2.5 text-[12.5px]">
                      {/* Matriculation Number */}
                      <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500 font-medium">Matric Number</span>
                        {privacy.showMatric ? (
                          <div className="flex items-center gap-1.5 font-bold font-mono text-[#007AFF]">
                            <span>{sMatric || 'N/A'}</span>
                            {sMatric && (
                              <button
                                onClick={() => copyToClipboard(sMatric, 'Matric number')}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Copy matric"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium italic flex items-center gap-1 text-[11.5px]">
                            <Lock className="w-3 h-3" />
                            <span>Hidden by student</span>
                          </span>
                        )}
                      </div>

                      {/* Email */}
                      <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500 font-medium">Email</span>
                        {privacy.showEmail ? (
                          <div className="flex items-center gap-1.5 max-w-[200px]">
                            <span className="text-slate-800 font-semibold truncate text-[12px]">{sEmail}</span>
                            {sEmail && (
                              <a
                                href={`mailto:${sEmail}`}
                                className="p-1 text-blue-600 hover:text-blue-800 shrink-0"
                                title="Send email"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium italic flex items-center gap-1 text-[11.5px]">
                            <Lock className="w-3 h-3" />
                            <span>Hidden by student</span>
                          </span>
                        )}
                      </div>

                      {/* Phone Number */}
                      <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500 font-medium">Phone Number</span>
                        {privacy.showPhone ? (
                          sPhone ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800 font-mono">{sPhone}</span>
                              <div className="flex items-center gap-1">
                                <a
                                  href={`tel:${sPhone}`}
                                  className="p-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                  title="Call student"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                                <a
                                  href={`https://wa.me/${sPhone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                  title="WhatsApp message"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11.5px]">Not provided</span>
                          )
                        ) : (
                          <span className="text-slate-400 font-medium italic flex items-center gap-1 text-[11.5px]">
                            <Lock className="w-3 h-3" />
                            <span>Hidden by student</span>
                          </span>
                        )}
                      </div>

                      {/* Residential Address / Hostel */}
                      <div className="flex items-start justify-between py-1">
                        <span className="text-slate-500 font-medium">Hostel / Address</span>
                        {privacy.showAddress ? (
                          sAddress ? (
                            <div className="flex items-center gap-1 max-w-[180px] text-right">
                              <MapPin className="w-3 h-3 text-purple-600 shrink-0 mt-0.5" />
                              <span className="font-semibold text-slate-800 text-[11.5px] leading-tight">
                                {sAddress}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11.5px]">Not provided</span>
                          )
                        ) : (
                          <span className="text-slate-400 font-medium italic flex items-center gap-1 text-[11.5px]">
                            <Lock className="w-3 h-3" />
                            <span>Hidden by student</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {isMe && (
                      <button
                        onClick={() => {
                          setSelectedStudent(null);
                          setIsPrivacyModalOpen(true);
                        }}
                        className="w-full py-2.5 rounded-2xl bg-blue-50 text-[#007AFF] hover:bg-blue-100 text-[12px] font-bold border border-blue-200 transition-all cursor-pointer"
                      >
                        Edit My Privacy &amp; Details
                      </button>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MY PRIVACY & PUBLIC PROFILE SETTINGS MODAL ================= */}
      <AnimatePresence>
        {isPrivacyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-sm max-h-[92vh] overflow-y-auto p-5 shadow-2xl border border-slate-100 relative space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#007AFF] flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#1C1C1E]">My Public Info &amp; Privacy</h3>
                    <p className="text-[11px] text-slate-500">Control what other students can see</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsPrivacyModalOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Editable Contact Info */}
              <div className="space-y-3">
                <h4 className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                  Contact Information
                </h4>

                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
                    Phone Number (WhatsApp &amp; Calls)
                  </label>
                  <input
                    id="input-my-phone"
                    type="tel"
                    value={myPhone}
                    onChange={(e) => setMyPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[12.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
                    Residential Address / Campus Hostel
                  </label>
                  <input
                    id="input-my-address"
                    type="text"
                    value={myAddress}
                    onChange={(e) => setMyAddress(e.target.value)}
                    placeholder="e.g. Hall 3, Room 104 or Off-Campus Lodge"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[12.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                  />
                </div>
              </div>

              {/* Privacy Toggles */}
              <div className="space-y-2 pt-1">
                <h4 className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                  Visibility On Course Mates Directory
                </h4>

                {[
                  {
                    key: 'showPhone' as const,
                    label: 'Show Phone Number',
                    desc: 'Course mates can see phone and call or WhatsApp you',
                  },
                  {
                    key: 'showEmail' as const,
                    label: 'Show Email Address',
                    desc: 'Course mates can see your university student email',
                  },
                  {
                    key: 'showMatric' as const,
                    label: 'Show Matric Number',
                    desc: 'Display your official matriculation number',
                  },
                  {
                    key: 'showAddress' as const,
                    label: 'Show Hostel / Residence',
                    desc: 'Display campus lodge or room location to peers',
                  },
                  {
                    key: 'showProfilePic' as const,
                    label: 'Show Profile Picture',
                    desc: 'Display your profile photo to peers (otherwise initials)',
                  },
                ].map((item) => {
                  const isChecked = Boolean(myPrivacy[item.key]);
                  return (
                    <div
                      key={item.key}
                      className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-[12.5px] font-bold text-slate-800 block">
                          {item.label}
                        </span>
                        <p className="text-[10.5px] text-slate-500 leading-snug">
                          {item.desc}
                        </p>
                      </div>

                      {/* iOS Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isChecked}
                        onClick={() =>
                          setMyPrivacy((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key],
                          }))
                        }
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isChecked ? 'bg-[#007AFF]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            isChecked ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12.5px] transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  id="btn-save-privacy-settings"
                  onClick={handleSavePrivacySettings}
                  disabled={isSavingPrivacy}
                  className="flex-1 py-2.5 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white font-bold text-[12.5px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingPrivacy ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
