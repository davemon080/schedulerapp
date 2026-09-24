import React, { useState, useMemo } from 'react';
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
  Clock,
  Megaphone,
  BookMarked,
  Wallet,
} from 'lucide-react';
import { NotificationsSkeleton } from './Skeletons';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onBackToSchedule: () => void;
  onDeleteNotif: (id: string) => void;
  isLoading?: boolean;
}

type FilterType = 'all' | 'unread' | 'schedule' | 'deadline' | 'modules' | 'wallet';

export const NotificationsView: React.FC<NotificationsViewProps> = React.memo(({
  notifications,
  onBackToSchedule,
  onDeleteNotif,
  isLoading = false,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Comprehensive helper to extract or infer numeric timestamp accurately for chronological ordering
  const getNotificationTimestamp = (n: NotificationItem): number => {
    if (!n) return 0;

    // 1. Explicit numeric timestamp
    if (typeof n.timestamp === 'number' && !isNaN(n.timestamp) && n.timestamp > 0) {
      return n.timestamp;
    }

    const anyN = n as any;

    // 2. Updated at / Deleted at / Created at ISO strings or epoch numbers
    const dateCandidates = [anyN.updated_at, anyN.deleted_at, anyN.createdat, anyN.created_at];
    for (const dVal of dateCandidates) {
      if (dVal) {
        if (typeof dVal === 'number' && !isNaN(dVal) && dVal > 0) return dVal;
        const parsed = new Date(dVal).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }

    // 3. Check for unix timestamp embedded in the ID (e.g. act-1741078000000-xyz, notif_1741078000000)
    if (n.id) {
      const idMatch = n.id.match(/(\d{10,13})/);
      if (idMatch) {
        const num = Number(idMatch[1]);
        const ms = num < 1e11 ? num * 1000 : num;
        if (ms > 1577836800000 && ms < 2500000000000) {
          return ms;
        }
      }
    }

    // 4. Parse human readable relative or calendar strings
    const rawTime = (n.time || anyN.timeAgo || '').trim();
    if (rawTime) {
      const lower = rawTime.toLowerCase();
      if (lower === 'just now' || lower === 'recent' || lower.includes('moment')) {
        return Date.now();
      }

      // "X min ago"
      const mMatch = lower.match(/(\d+)\s*(?:m|min|minute)s?\s*ago/);
      if (mMatch) {
        return Date.now() - parseInt(mMatch[1], 10) * 60 * 1000;
      }

      // "X hr ago"
      const hMatch = lower.match(/(\d+)\s*(?:h|hr|hour)s?\s*ago/);
      if (hMatch) {
        return Date.now() - parseInt(hMatch[1], 10) * 3600 * 1000;
      }

      // "X day ago"
      const dMatch = lower.match(/(\d+)\s*(?:d|day)s?\s*ago/);
      if (dMatch) {
        return Date.now() - parseInt(dMatch[1], 10) * 86400 * 1000;
      }

      // "Today, HH:MM" or "Today, HH:MM AM/PM"
      if (lower.startsWith('today')) {
        const now = new Date();
        const timePart = rawTime.split(',')[1]?.trim() || rawTime.replace(/today/i, '').trim();
        if (timePart) {
          const parsed = new Date(`${now.toDateString()} ${timePart}`).getTime();
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return now.getTime();
      }

      // "Yesterday, HH:MM"
      if (lower.startsWith('yesterday')) {
        const yest = new Date(Date.now() - 86400000);
        const timePart = rawTime.split(',')[1]?.trim() || rawTime.replace(/yesterday/i, '').trim();
        if (timePart) {
          const parsed = new Date(`${yest.toDateString()} ${timePart}`).getTime();
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return yest.getTime();
      }

      // Try standard Date parsing
      const parsedDate = Date.parse(rawTime);
      if (!isNaN(parsedDate) && parsedDate > 0) {
        return parsedDate;
      }
    }

    // 5. If marked unread, prioritize above older items
    if (n.isUnread) {
      return Date.now() - 30000;
    }

    return 0;
  };

  // Deduplicate notifications so identical notices or notifications don't duplicate
  const deduplicatedNotifications = useMemo(() => {
    const seenIds = new Set<string>();
    const seenTargets = new Set<string>();
    const seenContent = new Set<string>();
    const indexedItems: { item: NotificationItem; origIndex: number }[] = [];

    const rawList = notifications || [];
    for (let i = 0; i < rawList.length; i++) {
      const n = rawList[i];
      if (!n) continue;
      // Broadcasts on student dashboard are completely separate from notifications
      if (n.category === 'broadcast' || (n.type === 'alert' && n.title?.toLowerCase().includes('broadcast'))) continue;
      if (n.id && seenIds.has(n.id)) continue;
      if (n.target_id && seenTargets.has(n.target_id)) continue;

      const contentKey = `${(n.title || '').trim().toLowerCase()}::${(n.message || '').trim().toLowerCase()}::${n.category || ''}`;
      if (seenContent.has(contentKey)) continue;

      if (n.id) seenIds.add(n.id);
      if (n.target_id) seenTargets.add(n.target_id);
      seenContent.add(contentKey);
      indexedItems.push({ item: n, origIndex: i });
    }

    // Sort strictly newest first (descending by timestamp; preserving arrival order when equal)
    indexedItems.sort((a, b) => {
      const timeA = getNotificationTimestamp(a.item);
      const timeB = getNotificationTimestamp(b.item);
      if (timeB !== timeA) return timeB - timeA;
      // Preserve array insertion order (index 0 prepended items come first)
      if (a.origIndex !== b.origIndex) return a.origIndex - b.origIndex;
      return (b.item.id || '').localeCompare(a.item.id || '');
    });

    return indexedItems.map((entry) => entry.item);
  }, [notifications]);

  const filteredNotifications = deduplicatedNotifications.filter((n) => {
    if (activeFilter === 'unread') return n.isUnread;
    if (activeFilter === 'schedule') return n.category === 'schedule';
    if (activeFilter === 'deadline') return n.category === 'deadline';
    if (activeFilter === 'modules') return n.category === 'modules';
    if (activeFilter === 'wallet') return n.category === 'wallet';
    return true;
  });

  const getIcon = (n: NotificationItem) => {
    if (n.isCancelled || n.title.toLowerCase().includes('cancelled')) {
      return <AlertTriangle className="w-4 h-4 text-rose-500" />;
    }
    if (n.isDeleted || n.title.toLowerCase().includes('deleted')) {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
    if (n.isDismissed) {
      return <CheckCircle2 className="w-4 h-4 text-slate-400" />;
    }
    if (n.category === 'wallet') {
      return <Wallet className="w-4 h-4 text-emerald-600" />;
    }
    if (n.category === 'deadline') {
      return <Clock className="w-4 h-4 text-amber-600" />;
    }
    if (n.category === 'broadcast') {
      return <Megaphone className="w-4 h-4 text-indigo-600" />;
    }
    if (n.category === 'modules') {
      return <BookMarked className="w-4 h-4 text-blue-600" />;
    }
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

  const unreadCount = deduplicatedNotifications.filter((n) => n.isUnread).length;

  const filterOptions: { id: FilterType; label: string }[] = [
    { id: 'all', label: `All (${deduplicatedNotifications.length})` },
    { id: 'unread', label: `Unread (${unreadCount})` },
    { id: 'schedule', label: 'Schedule' },
    { id: 'deadline', label: 'Deadlines' },
    { id: 'modules', label: 'Modules' },
    { id: 'wallet', label: 'Wallet' },
  ];

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

      {/* Filter Tabs with Horizontal Scrollable Pills */}
      <div className="glass-container rounded-[22px] p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-white/80 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {filterOptions.map((opt) => {
          const isActive = activeFilter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setActiveFilter(opt.id)}
              className={`py-1.5 px-3 rounded-[16px] text-[11.5px] font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer text-center relative z-10 ${
                isActive
                  ? 'text-blue-600 bg-white shadow-2xs border border-black/5 font-bold'
                  : 'text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Notification Cards List (Smoothly scrolls under the fixed bottom action overlay) */}
      <div className="space-y-2.5 min-h-[220px]">
        {isLoading && filteredNotifications.length === 0 ? (
          <NotificationsSkeleton />
        ) : filteredNotifications.length === 0 ? (
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-[14px] font-bold text-[#1C1C1E] tracking-tight leading-tight">
                        {n.title}
                      </h4>
                      {n.isCancelled || n.title.toLowerCase().includes('cancelled') ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Cancelled
                        </span>
                      ) : n.isDeleted || n.title.toLowerCase().includes('deleted') ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Deleted
                        </span>
                      ) : n.isDismissed ? (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Dismissed
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {n.isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF] shrink-0 ring-2 ring-white" />
                      )}
                      <button
                        onClick={() => onDeleteNotif(n.id)}
                        className="text-slate-300 hover:text-red-500 active:scale-90 transition-all p-1 rounded-full hover:bg-red-50/50 cursor-pointer"
                        title="Dismiss notification"
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
});
