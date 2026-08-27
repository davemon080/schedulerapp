import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationItem } from '../types';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  CalendarCheck,
  UserCheck,
  Trash2,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { NotificationsSkeleton } from './Skeletons';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onBackToSchedule: () => void;
  onDeleteNotif: (id: string) => void;
  isLoading?: boolean;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onBackToSchedule,
  onDeleteNotif,
  isLoading = false,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'activity'>('all');

  if (isLoading) {
    return <NotificationsSkeleton />;
  }

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return n.isUnread;
    if (activeFilter === 'activity') {
      return n.type === 'activity' || n.category === 'schedule' || n.category === 'profile';
    }
    return true;
  });

  const getIcon = (n: NotificationItem) => {
    if (n.category === 'profile') {
      return <UserCheck className="w-4 h-4 text-purple-600" />;
    }
    if (n.category === 'schedule') {
      return <CalendarCheck className="w-4 h-4 text-[#007AFF]" />;
    }
    if (n.type === 'alert') {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
    if (n.type === 'success') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    if (n.type === 'activity') {
      return <Sparkles className="w-4 h-4 text-sky-500" />;
    }
    return <Info className="w-4 h-4 text-[#007AFF]" />;
  };

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  return (
    <div className="space-y-4 pb-36 pt-2">
      {/* Top Header Navigation & Title */}
      <div className="flex flex-col gap-3 px-1">
        <div className="flex items-center justify-between gap-3">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onBackToSchedule}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/70 hover:bg-white text-[13px] font-semibold text-[#007AFF] border border-white/90 shadow-2xs transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Schedule</span>
          </motion.button>

          <span className="text-[11.5px] font-bold text-[#007AFF] bg-blue-50/90 px-3 py-1 rounded-full border border-blue-200/60 shadow-2xs">
            {unreadCount} Unread
          </span>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <div className="w-10 h-10 rounded-[18px] bg-gradient-to-tr from-blue-500/20 to-sky-400/20 text-[#007AFF] flex items-center justify-center border border-white shadow-inner shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <h2 className="text-[24px] font-extrabold text-[#1C1C1E] tracking-tight leading-tight">
            Notifications & Activity
          </h2>
        </div>
      </div>

      {/* Filter Tabs with Sliding Active Pill */}
      <div className="glass-container rounded-[22px] p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-white/80 flex items-center gap-1.5 relative">
        {(['all', 'unread', 'activity'] as const).map((filterKey) => {
          const isActive = activeFilter === filterKey;
          const label =
            filterKey === 'all'
              ? `All (${notifications.length})`
              : filterKey === 'unread'
              ? `Unread (${unreadCount})`
              : 'Activities';

          return (
            <button
              key={filterKey}
              onClick={() => setActiveFilter(filterKey)}
              className={`flex-1 py-2 px-3 rounded-[16px] text-[12px] font-semibold transition-colors duration-150 cursor-pointer text-center relative z-10 ${
                isActive
                  ? filterKey === 'unread'
                    ? 'text-[#007AFF]'
                    : filterKey === 'activity'
                    ? 'text-purple-600'
                    : 'text-[#1C1C1E]'
                  : 'text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNotifFilterPill"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="absolute inset-0 bg-white rounded-[16px] shadow-2xs border border-black/5 -z-10"
                />
              )}
              {label}
            </button>
          );
        })}
      </div>

      {/* Notification Cards List (Smoothly scrolls under the fixed bottom action overlay) */}
      <div className="space-y-2.5 min-h-[220px]">
        {filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="glass-container rounded-[28px] p-8 text-center border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
          >
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Bell className="w-6 h-6 opacity-40" />
            </div>
            <h3 className="text-[15px] font-bold text-slate-800">No notifications found</h3>
            <p className="text-[12.5px] text-slate-500 mt-1 max-w-xs mx-auto">
              {activeFilter === 'unread'
                ? "You're all caught up! No unread notifications at the moment."
                : 'Your schedule updates and student logs will appear here in real-time.'}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((n, index) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, height: 0, marginBottom: 0 }}
                transition={{
                  duration: 0.16,
                  delay: Math.min(index * 0.02, 0.08),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`p-4 rounded-[24px] transition-all flex items-start gap-3.5 border ${
                  n.isUnread
                    ? 'glass-container-solid border-blue-200/80 shadow-[0_4px_20px_rgba(0,122,255,0.06)]'
                    : 'glass-container border-white/70 opacity-90'
                }`}
              >
                <div className="mt-0.5 shrink-0 p-2 rounded-2xl bg-white/90 shadow-2xs border border-white">
                  {getIcon(n)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <h4 className="text-[14px] font-bold text-[#1C1C1E] tracking-tight leading-tight">
                      {n.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      {n.isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF] shrink-0 ring-2 ring-white" />
                      )}
                      <button
                        onClick={() => onDeleteNotif(n.id)}
                        className="text-slate-300 hover:text-red-500 active:scale-90 transition-all p-1 rounded-full hover:bg-red-50/50 cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[12.5px] text-[#8E8E93] mt-1 leading-relaxed font-normal">
                    {n.message}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5">
                    <span className="text-[10.5px] text-slate-400 font-medium">
                      {n.time || n.timeAgo}
                    </span>
                    {n.category && (
                      <span className="text-[10px] uppercase font-bold text-[#007AFF] bg-blue-50/90 px-2.5 py-0.5 rounded-full border border-blue-100/80 shadow-2xs">
                        {n.category}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
