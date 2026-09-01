import React from 'react';
import { motion } from 'motion/react';
import {
  Lock,
  Sparkles,
  Wallet,
  ArrowRight,
  ShieldCheck,
  CalendarDays,
  BookMarked,
  Clock,
  Radio,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { UserSession } from '../types';

interface SemesterAccessLockViewProps {
  userSession: UserSession | null;
  activeSemester?: string;
  onOpenWallet: () => void;
  onNavigateToProfile: () => void;
}

export const SemesterAccessLockView: React.FC<SemesterAccessLockViewProps> = ({
  userSession,
  activeSemester = '1st Semester',
  onOpenWallet,
  onNavigateToProfile,
}) => {
  const studentName = userSession?.fullName || 'Student';
  const studentMatric = userSession?.matricNumber || 'ICH/2026/045';
  const studentDept = userSession?.department || 'Department of Industrial Chemistry';
  const activeSession = userSession?.session || userSession?.academic_session || '2025/2026';
  const walletBal = typeof userSession?.wallet_balance === 'number' 
    ? userSession.wallet_balance 
    : (typeof userSession?.walletBalance === 'number' ? userSession.walletBalance : 0);

  const semesterFee = 2000;
  const hasEnoughBal = walletBal >= semesterFee;

  return (
    <div id="semester-lock-screen" className="w-full max-w-lg mx-auto min-h-[82vh] flex flex-col justify-center px-4 pt-4 pb-24 relative select-none">
      {/* Soft Ambient Background Lighting */}
      <div className="fixed top-[15%] left-[-60px] w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-amber-200/35 to-rose-200/30 blur-[90px] pointer-events-none -z-10" />
      <div className="fixed bottom-[15%] right-[-70px] w-[320px] h-[320px] rounded-full bg-gradient-to-br from-blue-200/30 to-indigo-200/25 blur-[100px] pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center w-full"
      >
        {/* Glowing Padlock Icon Badge */}
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-[26px] bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-400 p-[2.5px] shadow-xl shadow-amber-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[23px] backdrop-blur-md flex items-center justify-center text-amber-600">
              <Lock className="w-9 h-9 stroke-[2.2]" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1.5 border-2 border-white shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Header Title */}
        <div className="space-y-1 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-amber-100 text-amber-800 border border-amber-200/80 mb-2 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            Active Semester Access Required
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-[#1C1C1E]">
            {activeSemester} Locked
          </h2>
          <p className="text-[13.5px] text-[#8E8E93] max-w-sm mx-auto leading-relaxed">
            Welcome, <span className="font-semibold text-slate-800">{studentName}</span> ({studentMatric}). Unlock full semester access (₦2,000) to view timetables, study materials, assignment deadlines, and broadcasts.
          </p>
        </div>

        {/* Fee & Campus Wallet Card */}
        <div className="w-full glass-card p-4.5 rounded-[24px] border border-amber-200/70 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 shadow-sm mb-5 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-amber-100">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-amber-700 uppercase">
                Academic Session
              </span>
              <p className="text-[14px] font-bold text-[#1C1C1E]">
                {activeSession} • {activeSemester}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-[#8E8E93] block">
                Semester Access
              </span>
              <p className="text-[18px] font-extrabold text-amber-600 tracking-tight">
                ₦2,000
              </p>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between text-[12.5px]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[#007AFF]">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[#8E8E93] block text-[11px]">Your Campus Wallet Balance</span>
                <span className="font-bold text-[#1C1C1E]">
                  ₦{walletBal.toLocaleString()}
                </span>
              </div>
            </div>

            {hasEnoughBal ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Balance Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full">
                Top up ₦{(semesterFee - walletBal).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Features Locked List */}
        <div className="w-full glass-card p-4 rounded-[22px] border border-slate-200/80 bg-white/90 shadow-2xs mb-6 text-left">
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#8E8E93] mb-3">
            Features Unlocked with Semester Access
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
              <CalendarDays className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[12px] font-medium text-slate-700 truncate">Lecture Schedule</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
              <BookMarked className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[12px] font-medium text-slate-700 truncate">Course PDFs & Slides</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[12px] font-medium text-slate-700 truncate">Deadlines & Tasks</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
              <Radio className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[12px] font-medium text-slate-700 truncate">Broadcasts & Alerts</span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="w-full space-y-3">
          <button
            id="btn-unlock-wallet-pay"
            onClick={onOpenWallet}
            className="w-full py-3.5 px-4 rounded-[20px] bg-gradient-to-r from-[#007AFF] to-[#0A84FF] text-white font-bold text-[14.5px] shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Wallet className="w-4.5 h-4.5" />
            <span>
              {hasEnoughBal
                ? 'Unlock Semester Access via Wallet (₦2,000)'
                : 'Fund Wallet via Paystack & Unlock (₦2,000)'}
            </span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            id="btn-goto-profile-from-lock"
            onClick={onNavigateToProfile}
            className="w-full py-3 px-4 rounded-[18px] bg-white border border-slate-200/90 text-slate-700 font-semibold text-[13.5px] shadow-2xs hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>View Student Profile & Settings</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Safety Note */}
        <div className="mt-5 flex items-center gap-1.5 text-[11.5px] text-[#8E8E93]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Secured via Paystack Gateway</span>
        </div>
      </motion.div>
    </div>
  );
};
