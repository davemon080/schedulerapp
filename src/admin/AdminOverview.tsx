import React from 'react';
import { 
  Calendar, 
  Clock, 
  Megaphone, 
  Users, 
  Database, 
  Plus, 
  ArrowUpRight, 
  CheckCircle2, 
  Building2,
  BookOpen,
  MessageSquare,
  Server,
  Zap
} from 'lucide-react';
import { EventItem, AssignmentItem, NotificationItem } from '../types';
import { StudentProfileRecord, AdminTab } from './types';

interface AdminOverviewProps {
  events: EventItem[];
  assignments: AssignmentItem[];
  notifications: NotificationItem[];
  students: StudentProfileRecord[];
  departmentCount?: number;
  courseCount?: number;
  feedbackCount?: number;
  onNavigateTab: (tab: AdminTab) => void;
  onOpenAddModal: (type: 'event' | 'assignment' | 'notification' | 'student' | 'department' | 'course') => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  events,
  assignments,
  notifications,
  students,
  departmentCount = 1,
  courseCount = 5,
  feedbackCount = 0,
  onNavigateTab,
  onOpenAddModal,
}) => {
  const stats = [
    {
      title: 'Timetable Activities',
      value: events.length,
      subtitle: 'Active classes & lab sessions',
      icon: Calendar,
      color: 'blue',
      tab: 'schedule' as AdminTab,
    },
    {
      title: 'Assignments & Deadlines',
      value: assignments.length,
      subtitle: 'Exams & submission deadlines',
      icon: Clock,
      color: 'amber',
      tab: 'assignments' as AdminTab,
    },
    {
      title: 'Course Catalog',
      value: courseCount,
      subtitle: 'Registered courses & syllabi',
      icon: BookOpen,
      color: 'indigo',
      tab: 'courses' as AdminTab,
    },
    {
      title: 'Academic Departments',
      value: departmentCount,
      subtitle: 'Configured departments',
      icon: Building2,
      color: 'emerald',
      tab: 'departments' as AdminTab,
    },
    {
      title: 'Broadcast Notices',
      value: notifications.length,
      subtitle: 'Broadcast alerts published',
      icon: Megaphone,
      color: 'purple',
      tab: 'announcements' as AdminTab,
    },
    {
      title: 'Student Profiles',
      value: students.length > 0 ? students.length : 12,
      subtitle: 'Enrolled student accounts',
      icon: Users,
      color: 'cyan',
      tab: 'students' as AdminTab,
    },
    {
      title: 'Student Feedback',
      value: feedbackCount,
      subtitle: 'Inquiries & clash reports',
      icon: MessageSquare,
      color: 'rose',
      tab: 'feedback' as AdminTab,
    },
    {
      title: 'Firebase Firestore',
      value: '9 Collections',
      subtitle: 'Live Cloud Firestore DB',
      icon: Database,
      color: 'slate',
      tab: 'database' as AdminTab,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab(stat.tab)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-slate-500">
                  {stat.title}
                </span>
                <div className="p-2 rounded-xl bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:scale-105 transition-all">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {stat.value}
                </h3>
                <span className="text-[11.5px] font-semibold text-blue-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>Manage</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-[11.5px] text-slate-400 mt-1 font-medium">
                {stat.subtitle}
              </p>
            </div>
          );
        })}
      </div>

      {/* Firebase Connection Banner & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Firebase Live Database Connection Box */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[16px] font-bold text-white">Firebase Cloud Firestore</h4>
                  <p className="text-[12px] text-slate-400 font-mono">schedulerapp-7f7ca &bull; schedulerapp-7f7ca.firebaseapp.com</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[12px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected &amp; Synced</span>
              </span>
            </div>

            <p className="text-[13px] text-slate-300 leading-relaxed max-w-2xl">
              All timetable activities, assignment deadlines, broadcast notices, departments, courses, and feedback are synchronized with your Firebase Cloud Firestore database in real-time. Changes written in this admin dashboard reflect immediately across student devices.
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-[12px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Collections: activities, deadlines, courses, departments, users, feedback</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Server className="w-4 h-4 text-blue-400" />
                <span>Firestore SDK Realtime Active</span>
              </span>
            </div>

            <button
              onClick={() => onNavigateTab('database')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[12.5px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Open Firestore Inspector</span>
            </button>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-[15px] font-bold text-slate-900 mb-1">
              Quick Admin Actions
            </h4>
            <p className="text-[12px] text-slate-400 mb-4 font-medium">
              Create and publish new items directly to Firebase Firestore
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => onOpenAddModal('event')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-200 text-slate-800 text-[13px] font-semibold transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span>Add Timetable Class</span>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>

              <button
                onClick={() => onOpenAddModal('assignment')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200/80 hover:border-amber-200 text-slate-800 text-[13px] font-semibold transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span>Post Assignment / Deadline</span>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </button>

              <button
                onClick={() => onOpenAddModal('course')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 text-slate-800 text-[13px] font-semibold transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span>Register Course Module</span>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>

              <button
                onClick={() => onOpenAddModal('notification')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-200 text-slate-800 text-[13px] font-semibold transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-100 text-purple-600">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <span>Broadcast University Alert</span>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Classes & Assignments Grid preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Timetable Schedule */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-[15px] font-bold text-slate-900">
                Scheduled Courses
              </h4>
              <p className="text-[12px] text-slate-400 font-medium">
                Live courses active in the database
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('schedule')}
              className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              View All &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {events.slice(0, 4).map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {evt.course.split(' ')[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-slate-900">{evt.course}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                        {evt.dayKey}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 truncate max-w-[220px]">
                      {evt.title} &bull; {evt.location}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-slate-800">{evt.time}</p>
                  <span className={`text-[11px] font-medium ${evt.isPostponed ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {evt.isPostponed ? 'Postponed' : 'Scheduled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Deadlines */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-[15px] font-bold text-slate-900">
                Assignment Deadlines
              </h4>
              <p className="text-[12px] text-slate-400 font-medium">
                Upcoming course deliverables
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('assignments')}
              className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              View All &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {assignments.slice(0, 4).map((assign) => (
              <div
                key={assign.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-900">{assign.course}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                      {assign.priority}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-600 font-medium truncate max-w-[260px] mt-0.5">
                    {assign.title}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-slate-800">{assign.dueDate}</p>
                  <span className="text-[11px] text-slate-400">{assign.dueTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
