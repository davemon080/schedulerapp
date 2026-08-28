import React from 'react';
import { Monitor, ArrowRight, Smartphone } from 'lucide-react';

interface DesktopOnlyNoticeProps {
  onDismiss: () => void;
}

export const DesktopOnlyNotice: React.FC<DesktopOnlyNoticeProps> = ({ onDismiss }) => {
  return (
    <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50 bg-slate-900 border border-slate-700 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 shrink-0">
          <Monitor className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white">Desktop-Optimized Dashboard</h4>
          <p className="text-[12px] text-slate-400">
            This administrative control center is best experienced on a desktop viewport.
          </p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-600 transition-colors shrink-0 cursor-pointer"
      >
        Dismiss
      </button>
    </div>
  );
};
