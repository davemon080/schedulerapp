import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Lock,
  Bell,
  Smartphone,
  ChevronRight,
  Shield,
  Sparkles,
} from 'lucide-react';
import { UserSession } from '../types';
import { PasswordSettingsPage } from './PasswordSettingsPage';
import { NotificationsSettingsPage } from './NotificationsSettingsPage';
import { AppVersionSettingsPage } from './AppVersionSettingsPage';
import { getNotificationSettings } from '../lib/notificationSettings';

interface SettingsPageProps {
  onBack: () => void;
  userSession?: UserSession | null;
  onSessionUpdated?: (updates: Partial<UserSession>) => void;
  onTriggerRefresh?: () => void;
  onAddNotification?: (title: string, message: string, category?: any, type?: any) => void;
  onShowToast?: (msg: string) => void;
}

type SubPage = 'main' | 'password' | 'notifications' | 'version';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onBack,
  userSession,
  onSessionUpdated,
  onTriggerRefresh,
  onAddNotification,
  onShowToast,
}) => {
  const [activeSubPage, setActiveSubPage] = useState<SubPage>('main');

  if (activeSubPage === 'password') {
    return (
      <PasswordSettingsPage
        onBack={() => setActiveSubPage('main')}
        userSession={userSession}
        onSessionUpdated={onSessionUpdated}
        onShowToast={onShowToast}
      />
    );
  }

  if (activeSubPage === 'notifications') {
    return (
      <NotificationsSettingsPage
        onBack={() => setActiveSubPage('main')}
        onAddNotification={onAddNotification}
        onShowToast={onShowToast}
      />
    );
  }

  if (activeSubPage === 'version') {
    return (
      <AppVersionSettingsPage
        onBack={() => setActiveSubPage('main')}
        onTriggerRefresh={onTriggerRefresh}
        onShowToast={onShowToast}
      />
    );
  }

  const notificationSettings = getNotificationSettings();
  const activeNotifChannels = Object.values(notificationSettings).filter(Boolean).length;

  const settingsItems = [
    {
      id: 'settings-password-row',
      title: 'Password',
      subtitle: 'Change portal password',
      icon: <Lock className="w-4.5 h-4.5 text-blue-600" />,
      bgColor: 'bg-blue-50',
      action: () => setActiveSubPage('password'),
    },
    {
      id: 'settings-notifications-row',
      title: 'Notification',
      subtitle: `${activeNotifChannels} of 5 alert channels active`,
      icon: <Bell className="w-4.5 h-4.5 text-indigo-600" />,
      bgColor: 'bg-indigo-50',
      action: () => setActiveSubPage('notifications'),
    },
    {
      id: 'settings-version-row',
      title: 'App Version & Update',
      subtitle: 'v2.4.1 • Check updates & cache',
      icon: <Smartphone className="w-4.5 h-4.5 text-sky-600" />,
      bgColor: 'bg-sky-50',
      action: () => setActiveSubPage('version'),
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
          id="btn-settings-back-to-profile"
          onClick={onBack}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-white/90 border border-slate-200/80 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all text-slate-700 font-semibold text-[12px] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
          <span>Profile</span>
        </button>

        <h2 className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Settings</h2>
      </div>

      {/* Settings Navigation List directly on screen */}
      <div className="space-y-2 pt-1">
        {settingsItems.map((item) => (
          <div
            id={item.id}
            key={item.id}
            onClick={item.action}
            className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group select-none active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-2xl ${item.bgColor} flex items-center justify-center transition-transform group-hover:scale-105 shrink-0`}>
                {item.icon}
              </div>
              <div>
                <h4 className="text-[14.5px] font-bold text-[#1C1C1E] group-hover:text-[#007AFF] transition-colors">
                  {item.title}
                </h4>
                <p className="text-[12px] text-[#8E8E93] font-medium">
                  {item.subtitle}
                </p>
              </div>
            </div>

            <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-blue-50 group-hover:text-[#007AFF] flex items-center justify-center text-slate-400 transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
