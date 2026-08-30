import React from 'react';
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Database, 
  Bell, 
  ExternalLink,
  ChevronRight,
  User as UserIcon,
  Shield,
  Sparkles,
  CalendarDays
} from 'lucide-react';
import { AdminTab, AdminUser } from './types';

interface AdminHeaderProps {
  activeTab: AdminTab;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  isRealtimeConnected?: boolean;
  onQuickAdd: () => void;
  quickAddLabel?: string;
  adminUser?: AdminUser | null;
  currentSemester?: string;
  academicSession?: string;
  onNavigateToSemesterTab?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  searchQuery,
  onSearchChange,
  onRefreshData,
  isRefreshing,
  isRealtimeConnected = true,
  onQuickAdd,
  quickAddLabel = 'New Record',
  adminUser,
  currentSemester = '1st Semester',
  academicSession = '2025/2026',
  onNavigateToSemesterTab,
}) => {
  const getTabTitle = (tab: AdminTab) => {
    switch (tab) {
      case 'overview':
        return 'Overview & Analytics';
      case 'schedule':
        return 'Schedule & Timetable Management';
      case 'assignments':
        return 'Assignments & Deadlines';
      case 'announcements':
        return 'Broadcast Announcements';
      case 'students':
        return 'Student Directory & Matric Numbers';
      case 'database':
        return 'Firestore Database Inspector';
      case 'settings':
        return 'System & Cloud Settings';
      default:
        return 'Admin Dashboard';
    }
  };

  const adminName = adminUser?.fullName || 'Administrator';
  const getAdminInitials = (name: string) => {
    if (!name || name.trim().length === 0) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Breadcrumb & Tab Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-slate-400">Admin</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <h1 className="text-[16px] font-bold text-slate-900">
            {getTabTitle(activeTab)}
          </h1>
        </div>

        {/* Realtime Connection Status Pill */}
        <div 
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
            isRealtimeConnected 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
          }`}
          title={isRealtimeConnected ? 'Live real-time connection to Firebase Firestore active' : 'Connecting to Firestore...'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span>{isRealtimeConnected ? 'Realtime Live' : 'Connecting...'}</span>
        </div>

        {/* Active University Semester & Session Indicator Pill */}
        <button
          type="button"
          onClick={onNavigateToSemesterTab}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50/90 text-blue-700 hover:bg-blue-100/90 border border-blue-200/80 shadow-2xs transition-all cursor-pointer group"
          title={`Active University Term: ${currentSemester} (${academicSession}). Click to manage semester.`}
        >
          <Sparkles className="w-3 h-3 text-blue-600 group-hover:rotate-12 transition-transform" />
          <span className="font-semibold">{currentSemester}</span>
          <span className="text-blue-500/80 font-mono text-[10px]">({academicSession})</span>
        </button>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative w-56 lg:w-64">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search records, codes..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
          />
        </div>

        {/* Manual Refresh button */}
        <button
          onClick={onRefreshData}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
          title="Manual refresh database from Firebase Cloud"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span className="hidden xl:inline">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Quick Add Action Button (for schedule, assignments, broadcasts, students) */}
        {activeTab !== 'overview' && activeTab !== 'database' && activeTab !== 'settings' && (
          <button
            onClick={onQuickAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{quickAddLabel}</span>
          </button>
        )}

        {/* User Profile Pill in Header */}
        {adminUser && (
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden border border-slate-200">
              {adminUser.profile_pic_url ? (
                <img
                  src={adminUser.profile_pic_url}
                  alt={adminName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getAdminInitials(adminName)}</span>
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[13px] font-bold text-slate-800 leading-tight truncate max-w-[130px]">
                {adminName}
              </span>
              <span className="text-[11px] font-medium text-blue-600 leading-tight capitalize">
                {adminUser.role === 'super_admin' ? 'Super Admin' : 'Course Rep'}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
