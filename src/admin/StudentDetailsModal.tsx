import React, { useState, useRef, useEffect } from 'react';
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
  AlertCircle,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Plus,
  Minus,
  SlidersHorizontal,
  History,
  Coins,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentProfileRecord, DepartmentRecord } from './types';
import { WalletTransaction } from '../types';
import { 
  getStudentDepartmentInfo, 
  fetchUserWalletData, 
  adminAdjustUserWalletBalance 
} from '../lib/dbService';

interface StudentDetailsModalProps {
  student: StudentProfileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentRecord[];
  onUpdateStudent?: (updatedStudent: StudentProfileRecord) => Promise<boolean>;
  onDeleteStudent?: (identifier: string) => Promise<void>;
  isRegistry?: boolean;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  student,
  isOpen,
  onClose,
  departments,
  onUpdateStudent,
  onDeleteStudent,
  isRegistry = false,
}) => {
  if (!isOpen || !student) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const identifier = student.id || student.uid || student.email || student.matric_number || student.matricNumber || '';

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
  const [isPayed, setIsPayed] = useState<boolean>(Boolean(student.is_payed ?? student.is_paid ?? true));
  const [profilePicUrl, setProfilePicUrl] = useState<string>(
    student.profile_pic_url || (student as any).profileImage || student.profile_picture || student.profilePicture || student.photo_url || student.photoURL || ''
  );

  // Wallet Management States
  const initialWalletBal = typeof student.wallet_balance === 'number' 
    ? student.wallet_balance 
    : (typeof student.walletBalance === 'number' ? student.walletBalance : 0);
  const [walletBalance, setWalletBalance] = useState<number>(initialWalletBal);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [walletAction, setWalletAction] = useState<'credit' | 'debit' | 'set'>('credit');
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustNote, setAdjustNote] = useState<string>('');
  const [isAdjustingWallet, setIsAdjustingWallet] = useState(false);
  const [walletSuccessMessage, setWalletSuccessMessage] = useState<string | null>(null);
  const [walletErrorMessage, setWalletErrorMessage] = useState<string | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load wallet data from database when student changes (only if not in restricted registry mode)
  useEffect(() => {
    if (!identifier || isRegistry) return;
    setIsLoadingWallet(true);
    fetchUserWalletData(identifier)
      .then((data) => {
        if (data) {
          setWalletBalance(data.balance ?? initialWalletBal);
          if (data.transactions && Array.isArray(data.transactions)) {
            setWalletTransactions(data.transactions);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch student wallet data:', err);
      })
      .finally(() => {
        setIsLoadingWallet(false);
      });
  }, [identifier, initialWalletBal, isRegistry]);

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

  // Preset amount button handler
  const handleQuickPreset = (amount: number) => {
    setAdjustAmount(String(amount));
  };

  // Handle Wallet Adjustment (Credit, Debit, Set)
  const handleApplyWalletAdjustment = async () => {
    setWalletErrorMessage(null);
    setWalletSuccessMessage(null);

    const parsedNum = parseFloat(adjustAmount.replace(/,/g, ''));
    if (isNaN(parsedNum) || parsedNum < 0) {
      setWalletErrorMessage('Please enter a valid positive number for the amount.');
      return;
    }

    if (walletAction === 'debit' && parsedNum > walletBalance) {
      setWalletErrorMessage(`Cannot debit ₦${parsedNum.toLocaleString()} because student only has ₦${walletBalance.toLocaleString()}.`);
      return;
    }

    setIsAdjustingWallet(true);
    try {
      const res = await adminAdjustUserWalletBalance(
        identifier,
        walletAction,
        parsedNum,
        adjustNote.trim() || undefined,
        'Admin Manager'
      );

      if (res.success) {
        setWalletBalance(res.newBalance);
        if (res.transaction) {
          setWalletTransactions((prev) => [res.transaction!, ...prev]);
        }
        
        const actionLabel = walletAction === 'credit' 
          ? `Credited +₦${parsedNum.toLocaleString()}` 
          : walletAction === 'debit' 
            ? `Debited -₦${parsedNum.toLocaleString()}` 
            : `Balance set to ₦${parsedNum.toLocaleString()}`;
        
        setWalletSuccessMessage(`${actionLabel} successfully. New balance: ₦${res.newBalance.toLocaleString()}`);
        setAdjustAmount('');
        setAdjustNote('');

        // Notify parent to synchronize state across tables
        if (onUpdateStudent) {
          onUpdateStudent({
            ...student,
            wallet_balance: res.newBalance,
            walletBalance: res.newBalance,
          }).catch(() => {});
        }

        setTimeout(() => {
          setWalletSuccessMessage(null);
        }, 3500);
      } else {
        setWalletErrorMessage(res.error || 'Failed to adjust wallet balance in database.');
      }
    } catch (err: any) {
      setWalletErrorMessage(err?.message || 'Error occurred while updating wallet balance.');
    } finally {
      setIsAdjustingWallet(false);
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
        password_changed: password.trim() !== '123456' ? true : Boolean(student.password_changed),
        has_custom_password: password.trim() !== '123456' ? true : Boolean(student.has_custom_password),
        is_default_password: password.trim() === '123456',
        matric_number: matricNumber.trim().toUpperCase(),
        matricNumber: matricNumber.trim().toUpperCase(),
        department_id: departmentId,
        department: targetDept ? targetDept.name : currentDeptInfo.name,
        year_level: yearLevel,
        yearLevel: yearLevel,
        level: levelNum,
        iscourserep: isRegistry ? Boolean(student.iscourserep || student.isCourseRep) : isCourseRep,
        isCourseRep: isRegistry ? Boolean(student.iscourserep || student.isCourseRep) : isCourseRep,
        isadmin: isRegistry ? Boolean(student.isadmin || student.isAdmin) : isAdmin,
        isAdmin: isRegistry ? Boolean(student.isadmin || student.isAdmin) : isAdmin,
        is_payed: isRegistry ? Boolean(student.is_payed ?? student.is_paid ?? true) : isPayed,
        is_paid: isRegistry ? Boolean(student.is_payed ?? student.is_paid ?? true) : isPayed,
        hasFreeAccess: isRegistry ? Boolean(student.is_payed ?? student.is_paid ?? true) : isPayed,
        wallet_balance: isRegistry ? (typeof student.wallet_balance === 'number' ? student.wallet_balance : student.walletBalance || 0) : walletBalance,
        walletBalance: isRegistry ? (typeof student.wallet_balance === 'number' ? student.wallet_balance : student.walletBalance || 0) : walletBalance,
        profile_pic_url: profilePicUrl,
        profile_picture: profilePicUrl,
        profilePicture: profilePicUrl,
        photo_url: profilePicUrl,
        photoURL: profilePicUrl,
      };

      if (onUpdateStudent) {
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
      } else {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 1200);
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
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-6 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <IdCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">Student Profile &amp; Wallet Control</h3>
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
                Manage credentials, course rep status, and user wallet balance.
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

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto space-y-6 pt-4 pr-1">
          {/* Error / Success Toast alerts */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Student profile and permissions updated successfully!</span>
            </div>
          )}

          {/* Profile Card & Identity */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            <div className="relative group/pic">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md overflow-hidden cursor-pointer border-2 border-white relative"
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
                className="absolute -bottom-1 -right-1 p-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm border-2 border-white cursor-pointer"
                title="Upload picture"
              >
                <Camera className="w-3 h-3" />
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
                  <span>{isPayed ? 'Semester Access: ACTIVE' : 'Access Suspended'}</span>
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

          {/* ========================================================= */}
          {/* SECTION: USER WALLET BALANCE & MANAGEMENT (Requested) */}
          {/* ========================================================= */}
          {!isRegistry && (
            <div className="p-5 rounded-2xl bg-linear-to-br from-emerald-900 via-slate-900 to-slate-950 text-white shadow-lg border border-emerald-800/40 relative overflow-hidden">
              {/* Background decorative glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              {/* Wallet Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>User Wallet Account</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold border border-emerald-500/30">
                        LIVE FIRESTORE
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      View and adjust student wallet balance for semester registration &amp; dues.
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-slate-400 font-medium block">Current Balance</span>
                  <div className="text-2xl font-black font-mono text-emerald-300 tracking-tight flex items-center sm:justify-end gap-1">
                    <span>₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                    {isLoadingWallet && <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin ml-1" />}
                  </div>
                </div>
              </div>

              {/* Wallet Alerts */}
              {walletErrorMessage && (
                <div className="p-3 bg-red-900/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{walletErrorMessage}</span>
                </div>
              )}

              {walletSuccessMessage && (
                <div className="p-3 bg-emerald-900/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{walletSuccessMessage}</span>
                </div>
              )}

              {/* Admin Wallet Controls Box */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Balance Modification Controls</span>
                  </span>

                  {/* Mode Selector (Credit, Debit, Set) */}
                  <div className="inline-flex rounded-lg bg-black/40 p-0.5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setWalletAction('credit')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        walletAction === 'credit'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Credit (Add)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWalletAction('debit')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        walletAction === 'debit'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Minus className="w-3 h-3" />
                      <span>Debit (Deduct)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWalletAction('set')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        walletAction === 'set'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Coins className="w-3 h-3" />
                      <span>Set Exact</span>
                    </button>
                  </div>
                </div>

                {/* Amount & Note Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {walletAction === 'credit' ? 'Amount to Credit (₦)' : walletAction === 'debit' ? 'Amount to Debit (₦)' : 'New Fixed Balance (₦)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₦</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        placeholder="e.g. 2000"
                        className="w-full pl-7 pr-3 py-2 text-xs bg-black/40 border border-white/20 rounded-xl text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Reason / Reference Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={adjustNote}
                      onChange={(e) => setAdjustNote(e.target.value)}
                      placeholder={walletAction === 'credit' ? 'e.g. Manual payment verified / Semester subsidy' : walletAction === 'debit' ? 'e.g. Reversal / Duplicate refund correction' : 'e.g. Annual audit balance realignment'}
                      className="w-full px-3 py-2 text-xs bg-black/40 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10.5px] text-slate-400 font-medium mr-1">Quick Presets:</span>
                  {[500, 1000, 2000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickPreset(amt)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-mono font-medium transition-colors cursor-pointer border border-white/10"
                    >
                      +{amt.toLocaleString()}
                    </button>
                  ))}
                  {walletBalance > 0 && walletAction === 'debit' && (
                    <button
                      type="button"
                      onClick={() => setAdjustAmount(String(walletBalance))}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-mono font-medium transition-colors cursor-pointer border border-rose-500/30"
                    >
                      Clear All (₦{walletBalance.toLocaleString()})
                    </button>
                  )}
                </div>

                {/* Action Submit Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleApplyWalletAdjustment}
                    disabled={isAdjustingWallet || !adjustAmount.trim()}
                    className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                      walletAction === 'credit'
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50'
                        : walletAction === 'debit'
                          ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/50'
                          : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50'
                    }`}
                  >
                    {isAdjustingWallet ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating Firestore...</span>
                      </>
                    ) : (
                      <>
                        {walletAction === 'credit' ? <ArrowUpRight className="w-3.5 h-3.5" /> : walletAction === 'debit' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}
                        <span>
                          {walletAction === 'credit' ? 'Apply Credit to Wallet' : walletAction === 'debit' ? 'Deduct from Wallet' : 'Set New Balance'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Transactions Ledger Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowTransactions(!showTransactions)}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer border border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-emerald-400" />
                    <span>User Transaction History ({walletTransactions.length})</span>
                  </div>
                  {showTransactions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showTransactions && (
                  <div className="mt-2 p-3 rounded-xl bg-black/40 border border-white/10 max-h-48 overflow-y-auto space-y-2">
                    {walletTransactions.length === 0 ? (
                      <p className="text-center py-4 text-[11px] text-slate-400">
                        No transactions recorded for this student yet.
                      </p>
                    ) : (
                      walletTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-md ${
                              tx.type === 'credit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {tx.type === 'credit' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <p className="text-white font-semibold text-[11.5px] leading-tight">{tx.title}</p>
                              <p className="text-[10.5px] text-slate-400 leading-tight mt-0.5">
                                {tx.date} &bull; Ref: <span className="font-mono text-slate-300">{tx.ref || tx.id}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-mono font-bold text-xs ${
                              tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {tx.type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                            </span>
                            <span className="block text-[9.5px] text-emerald-300 uppercase font-semibold">
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

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

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profile Photo URL (or Upload)
                </label>
                <div className="relative">
                  <Camera className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profilePicUrl}
                    onChange={(e) => setProfilePicUrl(e.target.value)}
                    placeholder="https://... or click avatar above to upload"
                    className="w-full pl-9.5 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-[11px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 truncate"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Administrative Permissions & Semester Grant (Restricted to Super Admin) */}
          {!isRegistry && (
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
                        ? 'Free 100% unlocked access granted for this semester without fee requirement.'
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
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          {!isRegistry && onDeleteStudent ? (
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
