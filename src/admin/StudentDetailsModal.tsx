import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Mail, 
  IdCard, 
  Building2, 
  GraduationCap, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  KeyRound, 
  Camera, 
  Trash2, 
  Save, 
  Sparkles,
  Calendar,
  Layers,
  Crown,
  UserCheck,
  UserX,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentProfileRecord, DepartmentRecord } from './types';
import { getStudentDepartmentInfo } from '../lib/dbService';

interface StudentDetailsModalProps {
  student: StudentProfileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentRecord[];
  onUpdateStudent: (updatedStudent: StudentProfileRecord) => Promise<boolean>;
  onDeleteStudent?: (identifier: string) => Promise<void>;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  student,
  isOpen,
  onClose,
  departments,
  onUpdateStudent,
  onDeleteStudent,
}) => {
  if (!isOpen || !student) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for student credentials and permissions
  const [fullName, setFullName] = useState(student.full_name || student.fullName || student.name || '');
  const [email, setEmail] = useState(student.email || '');
  const [password, setPassword] = useState(student.password || student.portal_password || '123456');
  const [matricNumber, setMatricNumber] = useState(student.matric_number || student.matricNumber || '');
  const [departmentId, setDepartmentId] = useState(student.department_id || 'dept-ich');
  const [yearLevel, setYearLevel] = useState(student.year_level || student.yearLevel || `${student.level || 100} Level`);
  const [levelNum, setLevelNum] = useState<number>(student.level || 100);
  const [isCourseRep, setIsCourseRep] = useState<boolean>(Boolean(student.iscourserep || student.isCourseRep));
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean(student.isadmin || student.isAdmin));
  const [isPayed, setIsPayed] = useState<boolean>(Boolean(student.is_payed ?? true));
  const [profilePicUrl, setProfilePicUrl] = useState<string>(
    student.profile_pic_url || (student as any).profileImage || student.profile_picture || student.profilePicture || student.photo_url || student.photoURL || ''
  );
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Department info
  const currentDeptInfo = getStudentDepartmentInfo(
    { ...student, department_id: departmentId },
    departments
  );

  const handleLevelChange = (lvlStr: string) => {
    setYearLevel(lvlStr);
    const parsed = parseInt(lvlStr.replace(/\D/g, ''), 10) || 100;
    setLevelNum(parsed);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProfilePicUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setErrorMessage(null);
    if (!email.trim() || !matricNumber.trim() || !fullName.trim()) {
      setErrorMessage('Full name, email, and matriculation number are mandatory.');
      return;
    }

    setIsSaving(true);
    try {
      const targetDept = departments.find(d => d.id === departmentId);
      const updatedRecord: StudentProfileRecord = {
        ...student,
        id: student.id || student.uid,
        uid: student.uid || student.id,
        full_name: fullName.trim(),
        fullName: fullName.trim(),
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || '123456',
        portal_password: password.trim() || '123456',
        matric_number: matricNumber.trim().toUpperCase(),
        matricNumber: matricNumber.trim().toUpperCase(),
        department_id: departmentId,
        department: targetDept ? targetDept.name : currentDeptInfo.name,
        year_level: yearLevel,
        yearLevel: yearLevel,
        level: levelNum,
        iscourserep: isCourseRep,
        isCourseRep: isCourseRep,
        isadmin: isAdmin,
        isAdmin: isAdmin,
        is_payed: isPayed,
        is_paid: isPayed,
        hasFreeAccess: isPayed,
        profile_pic_url: profilePicUrl,
        profile_picture: profilePicUrl,
        profilePicture: profilePicUrl,
        photo_url: profilePicUrl,
        photoURL: profilePicUrl,
      };

      const ok = await onUpdateStudent(updatedRecord);
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 1200);
      } else {
        setErrorMessage('Failed to save student profile updates to Firebase.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update student profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Hidden File Input for Avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <IdCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Student Profile &amp; Control Center</h3>
                {isCourseRep && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>Course Rep</span>
                  </span>
                )}
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                    <span>Admin</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage credentials, course rep status, and free semester portal access.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error / Success Toast alerts */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Student profile &amp; access privileges updated successfully!</span>
          </div>
        )}

        {/* Profile Card & Avatar */}
        <div className="mt-5 p-5 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group/pic">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md overflow-hidden cursor-pointer border-2 border-white relative"
              title="Click to change student profile picture"
            >
              {profilePicUrl ? (
                <img
                  src={profilePicUrl}
                  alt={fullName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{fullName.charAt(0) || 'S'}</span>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/pic:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm border-2 border-white cursor-pointer"
              title="Upload picture"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h4 className="text-base font-bold text-slate-900 truncate">{fullName || 'Student'}</h4>
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-mono text-xs font-bold border border-blue-200">
                {matricNumber || 'MATRIC'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {email} &bull; {currentDeptInfo.name} &bull; {yearLevel}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isPayed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {isPayed ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                <span>{isPayed ? 'Semester Access: ACTIVE (Free)' : 'Access Suspended'}</span>
              </span>

              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isCourseRep ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <Crown className="w-3 h-3" />
                <span>{isCourseRep ? 'Course Rep Privileges' : 'Regular Student'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Credentials & Role Settings Form */}
        <div className="mt-6 space-y-5">
          {/* Section 1: Academic Credentials */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Student Academic Credentials</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. David Simon O."
                    className="w-full pl-9.5 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (Login ID)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full pl-9.5 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-[12px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Matriculation Number
                </label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={matricNumber}
                    onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                    placeholder="2025/PS/ICH/0001"
                    className="w-full pl-9.5 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Portal Login Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="e.g. 123456"
                    className="w-full pl-9.5 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-[12px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Allocation
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full pl-9.5 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                    {departments.length === 0 && (
                      <>
                        <option value="dept-ich">Department of Industrial Chemistry (ICH)</option>
                        <option value="dept-chm">Department of Chemistry (CHM)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Level
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={yearLevel}
                    onChange={(e) => handleLevelChange(e.target.value)}
                    className="w-full pl-9.5 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="100 Level">100 Level</option>
                    <option value="200 Level">200 Level</option>
                    <option value="300 Level">300 Level</option>
                    <option value="400 Level">400 Level</option>
                    <option value="500 Level">500 Level</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profile Photo URL (or Upload)
                </label>
                <div className="relative">
                  <Camera className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profilePicUrl}
                    onChange={(e) => setProfilePicUrl(e.target.value)}
                    placeholder="https://... or click avatar to upload"
                    className="w-full pl-9.5 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-[11px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 truncate"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Administrative Permissions & Semester Grant */}
          <div className="pt-3 border-t border-slate-100">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Privileges &amp; Semester Access Controls</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Course Rep Toggle */}
              <div 
                onClick={() => setIsCourseRep(!isCourseRep)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  isCourseRep 
                    ? 'bg-amber-50/80 border-amber-200 shadow-xs' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${isCourseRep ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Crown className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Course Representative</span>
                    <input
                      type="checkbox"
                      checked={isCourseRep}
                      onChange={(e) => setIsCourseRep(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-amber-600 rounded-sm border-slate-300 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {isCourseRep
                      ? 'Student is promoted to Course Rep with timetable & deadline publishing tools.'
                      : 'Promote student to Course Rep or demote back to regular student.'}
                  </p>
                </div>
              </div>

              {/* Free Semester Access Toggle */}
              <div 
                onClick={() => setIsPayed(!isPayed)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  isPayed 
                    ? 'bg-emerald-50/80 border-emerald-200 shadow-xs' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${isPayed ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Free Semester Access</span>
                    <input
                      type="checkbox"
                      checked={isPayed}
                      onChange={(e) => setIsPayed(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {isPayed
                      ? 'Free 100% unlocked access granted for this semester without payment requirement.'
                      : 'Revoke semester pass (locks portal modules until authorized).'}
                  </p>
                </div>
              </div>

              {/* Administrator Role Toggle */}
              <div 
                onClick={() => setIsAdmin(!isAdmin)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 sm:col-span-2 ${
                  isAdmin 
                    ? 'bg-purple-50/80 border-purple-200 shadow-xs' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${isAdmin ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Academic Administrator Role</span>
                    <input
                      type="checkbox"
                      checked={isAdmin}
                      onChange={(e) => setIsAdmin(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-purple-600 rounded-sm border-slate-300 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Grants full backend admin portal access to manage departments, syllabus catalogs, and database collections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-7 pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          {onDeleteStudent ? (
            <button
              onClick={() => {
                onDeleteStudent(student.id || student.uid || student.email);
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold border border-red-200/80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Student Record</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Updates...' : 'Save Student Changes'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
