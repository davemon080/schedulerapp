import React from 'react';
import { 
  Calendar, 
  Clock, 
  Megaphone, 
  Users, 
  Database, 
  Settings, 
  LayoutDashboard, 
  LogOut, 
  ExternalLink, 
  Shield, 
  Building2, 
  BookOpen, 
  MessageSquare, 
  Sparkles,
  Activity
} from 'lucide-react';
import { AdminTab, AdminUser } from './types';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  adminUser: AdminUser;
  onLogout: () => void;
  onSwitchToStudentPortal: () => void;
  unreadAnnouncementsCount?: number;
  eventCount?: number;
  assignmentCount?: number;
  studentCount?: number;
  departmentCount?: number;
  courseCount?: number;
  feedbackCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  adminUser,
  onLogout,
  onSwitchToStudentPortal,
  eventCount = 0,
  assignmentCount = 0,
  studentCount = 0,
  departmentCount = 0,
  courseCount = 0,
  feedbackCount = 0,
}) => {
  const navItems = [
    {
      id: 'overview' as AdminTab,
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'semester' as AdminTab,
      label: 'Semester Control',
      icon: Sparkles,
    },
    {
      id: 'schedule' as AdminTab,
      label: 'Schedule & Classes',
      icon: Calendar,
      badge: eventCount > 0 ? eventCount : undefined,
    },
    {
      id: 'assignments' as AdminTab,
      label: 'Assignments & Exams',
      icon: Clock,
      badge: assignmentCount > 0 ? assignmentCount : undefined,
    },
    {
      id: 'announcements' as AdminTab,
      label: 'Broadcast Notices',
      icon: Megaphone,
    },
    {
      id: 'departments' as AdminTab,
      label: 'Departments',
      icon: Building2,
      badge: departmentCount > 0 ? departmentCount : undefined,
    },
    {
      id: 'courses' as AdminTab,
      label: 'Course Catalog',
      icon: BookOpen,
      badge: courseCount > 0 ? courseCount : undefined,
    },
    {
      id: 'students' as AdminTab,
      label: 'Student Directory',
      icon: Users,
      badge: studentCount > 0 ? studentCount : undefined,
    },
    {
      id: 'feedback' as AdminTab,
      label: 'Feedback & Support Desk',
      icon: MessageSquare,
      badge: feedbackCount > 0 ? feedbackCount : undefined,
    },
    {
      id: 'analytics' as AdminTab,
      label: 'App Traffic & Telemetry',
      icon: Activity,
    },
    {
      id: 'database' as AdminTab,
      label: 'Firestore Explorer',
      icon: Database,
    },
    {
      id: 'settings' as AdminTab,
      label: 'System Settings',
      icon: Settings,
    },
  ];

  // If the logged-in admin is a Registry Officer, restrict sidebar strictly to Student Directory / Registry
  const visibleNavItems = adminUser?.isRegistry
    ? [
        {
          id: 'students' as AdminTab,
          label: 'Student Directory & Registry',
          icon: Users,
          badge: studentCount > 0 ? studentCount : undefined,
        },
      ]
    : navItems;

  return (
    <aside className="w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 select-none shrink-0 text-slate-300">
      {/* Brand Top Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-[15px] font-bold text-white tracking-tight">Academic Admin</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold uppercase">
                Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Firebase Control Center</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)]">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {adminUser?.isRegistry ? 'Registry Access' : 'Management'}
          </div>

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Database status + Admin profile & Actions */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {/* Firebase Status Pill */}
        <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11.5px]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Firebase Firestore</span>
          </div>
          <span className="text-emerald-400 font-mono text-[10.5px]">LIVE</span>
        </div>

        {/* Admin Profile Box */}
        <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {adminUser.fullName?.charAt(0) || 'A'}
            </div>
            <div className="truncate">
              <p className="text-[12px] font-bold text-white truncate leading-tight">
                {adminUser.fullName}
              </p>
              <p className="text-[11px] text-slate-400 truncate leading-tight">
                {adminUser.email}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={onSwitchToStudentPortal}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11.5px] font-medium transition-colors cursor-pointer"
            title="Open Student Schedule App"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>Student App</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11.5px] font-medium transition-colors border border-red-500/20 cursor-pointer"
            title="Sign out of Admin Dashboard"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
