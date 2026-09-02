import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  HardDrive,
  Trash2,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface AppVersionSettingsPageProps {
  onBack: () => void;
  onTriggerRefresh?: () => void;
  onShowToast?: (msg: string) => void;
}

export const AppVersionSettingsPage: React.FC<AppVersionSettingsPageProps> = ({
  onBack,
  onTriggerRefresh,
  onShowToast,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const APP_VERSION = 'v2.4.1';
  const BUILD_NUMBER = '2026.09.02';
  const ENVIRONMENT = 'Production';

  const handleCheckForUpdates = () => {
    setIsChecking(true);
    setUpdateStatus(null);

    setTimeout(() => {
      setIsChecking(false);
      setUpdateStatus('Your application is up to date with the latest physical sciences schedule & portal release.');
      if (onShowToast) {
        onShowToast('App is up to date (v2.4.1)');
      }
    }, 1200);
  };

  const handleClearCache = () => {
    setIsClearingCache(true);
    setTimeout(() => {
      try {
        // Clear cached departmental data or timetable temp items
        localStorage.removeItem('cached_departments');
        localStorage.removeItem('student_schedule_offline_cache');
      } catch (e) {
        console.warn('Cache clear notice:', e);
      }

      if (onTriggerRefresh) {
        onTriggerRefresh();
      }

      setIsClearingCache(false);
      if (onShowToast) {
        onShowToast('Local timetable cache cleared and re-synced');
      }
    }, 800);
  };

  const changelog = [
    {
      title: 'Real-Time Schedule & Room Sync',
      detail: 'Instant updates for lectures, venues, and instructor notices.',
    },
    {
      title: 'Dedicated Settings & Security',
      detail: 'Password management, notification channels, and update controls.',
    },
    {
      title: 'Wallet & Registration Receipts',
      detail: 'Direct Paystack top-up, peer transfer, and download receipts.',
    },
    {
      title: 'Offline Schedule Caching',
      detail: 'View weekly timetable even in low connectivity areas.',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 pb-24"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          id="btn-version-settings-back"
          onClick={onBack}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-white/90 border border-slate-200/80 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all text-slate-700 font-semibold text-[12px] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
          <span>Back</span>
        </button>

        <h2 className="text-[15px] font-bold text-[#1C1C1E]">App Version & Updates</h2>
      </div>

      {/* App Version Info directly rendered */}
      <div className="text-center py-4 space-y-1">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/25 mb-2">
          <Smartphone className="w-7 h-7" />
        </div>
        <h3 className="text-[19px] font-extrabold text-[#1C1C1E] tracking-tight">
          Student Portal
        </h3>
        <p className="text-[13px] font-bold text-[#007AFF] font-mono">
          {APP_VERSION} <span className="text-slate-400 font-normal">({BUILD_NUMBER})</span>
        </p>
        <p className="text-[11.5px] text-[#8E8E93] font-medium">
          Physical Sciences Academic Client • {ENVIRONMENT}
        </p>
      </div>

      {/* Check for Updates Action */}
      <div className="space-y-2">
        <button
          id="btn-check-for-updates"
          type="button"
          onClick={handleCheckForUpdates}
          disabled={isChecking}
          className="w-full py-3 px-4 rounded-2xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-[13.5px] shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Checking for Updates...' : 'Check for Updates'}</span>
        </button>

        <AnimatePresence>
          {updateStatus && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] font-medium flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{updateStatus}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* What's New List */}
      <div className="space-y-2 pt-2">
        <h4 className="text-[13px] font-bold text-[#1C1C1E]">What's New in this Version</h4>
        <div className="space-y-1.5">
          {changelog.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
                <span className="text-[13px] font-bold text-slate-800">{item.title}</span>
              </div>
              <p className="text-[11.5px] text-[#8E8E93] mt-0.5 pl-5.5 font-medium leading-relaxed">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Storage & Local Cache Manager */}
      <div className="space-y-2 pt-2">
        <h4 className="text-[13px] font-bold text-[#1C1C1E]">Storage & Cache</h4>
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[13px] font-bold text-slate-800">Timetable Cache</span>
              <p className="text-[11.5px] text-[#8E8E93]">1.8 MB stored locally</p>
            </div>
          </div>

          <button
            id="btn-clear-cache"
            type="button"
            onClick={handleClearCache}
            disabled={isClearingCache}
            className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11.5px] transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3 text-slate-500" />
            <span>{isClearingCache ? 'Clearing...' : 'Clear & Re-sync'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
