import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Wallet,
  CalendarCheck,
  Megaphone,
  BookMarked,
  Clock,
  X,
  ChevronRight,
} from 'lucide-react';

export interface LiveNotificationPayload {
  title: string;
  body: string;
  category?: string;
  tag?: string;
  timestamp?: number;
}

interface PhoneLiveNotificationBannerProps {
  notification: LiveNotificationPayload | null;
  onDismiss: () => void;
  onOpenNotifications: () => void;
}

export const PhoneLiveNotificationBanner: React.FC<PhoneLiveNotificationBannerProps> = ({
  notification,
  onDismiss,
  onOpenNotifications,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const getIcon = () => {
    const cat = (notification.category || '').toLowerCase();
    if (cat === 'wallet') {
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Wallet className="w-4 h-4" />
        </div>
      );
    }
    if (cat === 'schedule') {
      return (
        <div className="w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center shrink-0 shadow-xs">
          <CalendarCheck className="w-4 h-4" />
        </div>
      );
    }
    if (cat === 'deadline') {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Clock className="w-4 h-4" />
        </div>
      );
    }
    if (cat === 'broadcast') {
      return (
        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Megaphone className="w-4 h-4" />
        </div>
      );
    }
    if (cat === 'modules') {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <BookMarked className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
        <Bell className="w-4 h-4" />
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="fixed top-3 inset-x-0 z-50 max-w-md mx-auto px-3.5 pointer-events-none"
      >
        <div className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_12px_36px_rgba(0,0,0,0.18)] rounded-2xl p-3 flex items-start gap-3 select-none">
          {getIcon()}

          <div
            onClick={() => {
              onOpenNotifications();
              onDismiss();
            }}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {notification.category || 'Notification'} • Just now
              </span>
              <span className="text-[11px] font-semibold text-[#007AFF] flex items-center gap-0.5">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <h4 className="text-[13.5px] font-bold text-slate-900 truncate mt-0.5">
              {notification.title}
            </h4>
            <p className="text-[12px] text-slate-600 line-clamp-2 leading-snug mt-0.5">
              {notification.body}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="text-slate-400 hover:text-slate-700 active:scale-90 p-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
