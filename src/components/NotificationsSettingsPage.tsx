import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  Clock,
  Megaphone,
  BookMarked,
  Wallet,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Camera,
} from 'lucide-react';
import {
  NotificationChannelSettings,
  getNotificationSettings,
  saveNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../lib/notificationSettings';
import { NotificationItem } from '../types';

interface NotificationsSettingsPageProps {
  onBack: () => void;
  onAddNotification?: (title: string, message: string, category?: any, type?: any) => void;
  onShowToast?: (msg: string) => void;
  onRequestPermissions?: () => void;
}

export const NotificationsSettingsPage: React.FC<NotificationsSettingsPageProps> = ({
  onBack,
  onAddNotification,
  onShowToast,
  onRequestPermissions,
}) => {
  const [settings, setSettings] = useState<NotificationChannelSettings>(() => getNotificationSettings());
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<string>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    saveNotificationSettings(settings);
  }, [settings]);

  const handleRequestSystemPermissions = async () => {
    if (onRequestPermissions) {
      onRequestPermissions();
      return;
    }
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const res = await Notification.requestPermission();
        setBrowserPermission(res);
        if (onShowToast) onShowToast(`Notification permission: ${res}`);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleToggle = (key: keyof NotificationChannelSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      return updated;
    });
  };

  const handleEnableAll = () => {
    const allEnabled: NotificationChannelSettings = {
      schedules: true,
      deadlines: true,
      broadcast: true,
      modules: true,
      wallet: true,
    };
    setSettings(allEnabled);
    if (onShowToast) onShowToast('All notifications enabled');
  };

  const handleDisableAll = () => {
    const allDisabled: NotificationChannelSettings = {
      schedules: false,
      deadlines: false,
      broadcast: false,
      modules: false,
      wallet: false,
    };
    setSettings(allDisabled);
    if (onShowToast) onShowToast('All notifications disabled');
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_NOTIFICATION_SETTINGS);
    if (onShowToast) onShowToast('Reset to default notification settings');
  };

  const triggerTestPopNotification = (channel: keyof NotificationChannelSettings) => {
    const isEnabled = settings[channel];
    if (!isEnabled) {
      setTestFeedback(`Notice: ${channel.toUpperCase()} pop notifications are currently OFF.`);
      setTimeout(() => setTestFeedback(null), 3000);
      return;
    }

    let title = 'Notification Test';
    let message = 'This is a live test notification.';
    let category: NotificationItem['category'] = 'schedule';

    switch (channel) {
      case 'schedules':
        title = 'ICH 101 Lecture Alert';
        message = 'Physical Chemistry lecture starts in 15 mins at Lab 4.';
        category = 'schedule';
        break;
      case 'deadlines':
        title = 'Assignment Due Reminder';
        message = 'ICH 103 Organic Synthesis report is due in 4 hours.';
        category = 'deadline';
        break;
      case 'broadcast':
        title = 'Departmental Announcement';
        message = 'Faculty seminar timetable has been updated for all 100L students.';
        category = 'broadcast';
        break;
      case 'modules':
        title = 'New Course Material';
        message = 'CHM 112 Lecture Notes (Week 5 PDF) has been uploaded.';
        category = 'modules';
        break;
      case 'wallet':
        title = 'Wallet Credit Alert';
        message = '₦5,000.00 top-up successful. Balance updated.';
        category = 'wallet';
        break;
    }

    if (onAddNotification) {
      onAddNotification(title, message, category, 'activity');
    }

    if (onShowToast) {
      onShowToast(`Pop notification sent: ${title}`);
    }

    setTestFeedback(`Sent ${channel} test pop notification.`);
    setTimeout(() => setTestFeedback(null), 3000);
  };

  const channels: {
    key: keyof NotificationChannelSettings;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }[] = [
    {
      key: 'schedules',
      title: 'Schedules',
      description: 'Lecture start times, room changes, and timetable alerts',
      icon: <CalendarCheck className="w-5 h-5 text-blue-600" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      key: 'deadlines',
      title: 'Deadlines',
      description: 'Assignment submission dates, tests, and task reminders',
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      key: 'broadcast',
      title: 'Broadcasts',
      description: 'Course rep notices, faculty announcements, and alerts',
      icon: <Megaphone className="w-5 h-5 text-indigo-600" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      key: 'modules',
      title: 'Modules',
      description: 'New course materials, syllabus notes, and PDF uploads',
      icon: <BookMarked className="w-5 h-5 text-sky-600" />,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      key: 'wallet',
      title: 'Wallet',
      description: 'Funds credited, peer transfers, and semester receipts',
      icon: <Wallet className="w-5 h-5 text-emerald-600" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  const activeCount = Object.values(settings).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 pb-24"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          id="btn-notifications-settings-back"
          onClick={onBack}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-white/90 border border-slate-200/80 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all text-slate-700 font-semibold text-[12px] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
          <span>Back</span>
        </button>

        <h2 className="text-[15px] font-bold text-[#1C1C1E]">Pop Notifications</h2>
      </div>

      {/* System Permissions Banner */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#007AFF] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-[#1C1C1E]">System Permissions</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                browserPermission === 'granted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {browserPermission === 'granted' ? 'Granted' : 'Action Required'}
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93] truncate">
              Notifications & Photo access
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRequestSystemPermissions}
          className="px-2.5 py-1.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white text-[11.5px] font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
        >
          {browserPermission === 'granted' ? 'Manage' : 'Enable'}
        </button>
      </div>

      {/* Bulk Actions Control Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[12px] font-bold text-slate-600">
          {activeCount} of 5 active
        </span>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-bulk-enable-all"
            type="button"
            onClick={handleEnableAll}
            className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold border border-blue-200/70 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Enable All</span>
          </button>

          <button
            id="btn-bulk-disable-all"
            type="button"
            onClick={handleDisableAll}
            className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-bold border border-slate-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <XCircle className="w-3 h-3" />
            <span>Disable All</span>
          </button>

          <button
            id="btn-bulk-reset-defaults"
            type="button"
            onClick={handleResetDefaults}
            title="Reset Defaults"
            className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Live Feedback Banner */}
      <AnimatePresence>
        {testFeedback && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            className="p-2.5 rounded-2xl bg-blue-50 text-blue-800 text-[12px] font-semibold border border-blue-200 flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>{testFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Channel Toggles directly rendered */}
      <div className="space-y-2 pt-1">
        {channels.map((channel) => {
          const isEnabled = settings[channel.key];
          return (
            <div
              key={channel.key}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs transition-all hover:border-slate-300"
            >
              <div className="flex items-center gap-3 pr-3">
                <div className={`w-9 h-9 rounded-xl ${channel.bgColor} flex items-center justify-center shrink-0`}>
                  {channel.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-[#1C1C1E]">{channel.title}</span>
                    <button
                      type="button"
                      onClick={() => triggerTestPopNotification(channel.key)}
                      className="text-[10.5px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                    >
                      Test
                    </button>
                  </div>
                  <p className="text-[11.5px] text-[#8E8E93] leading-snug mt-0.5">
                    {channel.description}
                  </p>
                </div>
              </div>

              {/* iOS Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                onClick={() => handleToggle(channel.key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEnabled ? 'bg-[#007AFF]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
