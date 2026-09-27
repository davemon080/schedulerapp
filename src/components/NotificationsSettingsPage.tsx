import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  Clock,
  Megaphone,
  BookMarked,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  NotificationChannelSettings,
  getNotificationSettings,
  saveNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../lib/notificationSettings';
import {
  requestAppNotificationPermission,
  getPushPermissionState,
  isPushNotificationSupported,
  showDeviceLocalNotification,
} from '../lib/pushNotificationClient';
import { UserSession } from '../types';

interface NotificationsSettingsPageProps {
  onBack: () => void;
  onShowToast?: (msg: string) => void;
  onRequestPermissions?: () => void;
  onAddNotification?: (title: string, message: string, category?: any, type?: any) => void;
  userSession?: UserSession | null;
}

export const NotificationsSettingsPage: React.FC<NotificationsSettingsPageProps> = ({
  onBack,
  onShowToast,
  onRequestPermissions,
  userSession,
}) => {
  const [settings, setSettings] = useState<NotificationChannelSettings>(() => getNotificationSettings());
  const [browserPermission, setBrowserPermission] = useState<string>('default');
  const [pushSupported, setPushSupported] = useState<boolean>(true);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  const [showUnblockGuide, setShowUnblockGuide] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsInIframe(window.self !== window.top);
    }
    getPushPermissionState().then((state) => {
      setBrowserPermission(state);
      if (state === 'denied') {
        setShowUnblockGuide(true);
      }
    });
    setPushSupported(isPushNotificationSupported());
  }, []);

  useEffect(() => {
    saveNotificationSettings(settings);
  }, [settings]);

  const handleRefreshPermission = async () => {
    setIsRefreshing(true);
    try {
      const state = await getPushPermissionState();
      setBrowserPermission(state);

      if (state === 'granted') {
        const res = await requestAppNotificationPermission(userSession);
        if (res.success || res.status === 'granted') {
          await showDeviceLocalNotification({
            title: 'Push Notifications Active 🔔',
            body: 'Your device is verified and receiving live timetable & announcement alerts.',
          }).catch(() => {});
          if (onShowToast) onShowToast('Notifications active! Your device is now connected.');
        }
      } else if (state === 'denied') {
        if (onShowToast) onShowToast('Still blocked. Please make sure Notifications are set to Allow in site settings.');
      } else {
        if (onShowToast) onShowToast('Permission reset. Tap Enable Push to trigger system prompt.');
      }
    } catch (e: any) {
      if (onShowToast) onShowToast('Could not refresh status: ' + (e?.message || 'error'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetSavedState = async () => {
    try {
      localStorage.removeItem('app_notification_permission');
      localStorage.removeItem('app_notification_prompt_completed');
      localStorage.removeItem('app_notification_permission_requested');
      const state = await getPushPermissionState();
      setBrowserPermission(state);
      if (onShowToast) onShowToast('Saved permission state cleared. Tap Refresh to re-check.');
    } catch {}
  };

  const handleOpenInDirectTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  };

  const handleRequestSystemPermissions = async () => {
    try {
      setIsSubscribing(true);
      // If already granted, send instant local device test notification
      if (browserPermission === 'granted') {
        await showDeviceLocalNotification({
          title: 'Push Notifications Active 🔔',
          body: 'Device verified! You will receive live schedule, deadline & broadcast alerts.',
        }).catch(() => {});
        if (onShowToast) onShowToast('Device verified! Test notification triggered on your system.');
        return;
      }

      // If blocked, refresh status or show modal guide
      if (browserPermission === 'denied') {
        setShowUnblockGuide(true);
        if (onRequestPermissions) {
          onRequestPermissions();
        } else {
          await handleRefreshPermission();
        }
        return;
      }

      // Request system permission directly from the device
      const res = await requestAppNotificationPermission(userSession);
      const state = res.status;
      setBrowserPermission(state);

      if (res.success || state === 'granted') {
        await showDeviceLocalNotification({
          title: 'Push Notifications Active 🔔',
          body: 'Your device is now receiving live timetable, deadline & module alerts.',
        }).catch(() => {});
        if (onShowToast) onShowToast('Push notifications enabled! Test alert sent to device.');
      } else if (state === 'denied') {
        setShowUnblockGuide(true);
        if (onShowToast) {
          onShowToast('Notifications blocked by system. Follow the steps below to allow.');
        }
      } else {
        if (onShowToast) {
          onShowToast('Notification permission request completed.');
        }
      }
    } catch (e: any) {
      console.warn(e);
      if (onShowToast) onShowToast(e?.message || 'Failed to request notification permission');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleToggle = (key: keyof NotificationChannelSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      return updated;
    });
    if (onShowToast) {
      const stateLabel = !settings[key] ? 'enabled' : 'disabled';
      onShowToast(`${key.charAt(0).toUpperCase() + key.slice(1)} alerts ${stateLabel}`);
    }
  };

  const handleEnableAll = () => {
    const allEnabled: NotificationChannelSettings = {
      schedules: true,
      deadlines: true,
      broadcast: true,
      modules: true,
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
    };
    setSettings(allDisabled);
    if (onShowToast) onShowToast('All notifications disabled');
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_NOTIFICATION_SETTINGS);
    if (onShowToast) onShowToast('Reset to default notification channels');
  };

  const channels: {
    key: 'schedules' | 'deadlines' | 'broadcast' | 'modules';
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }[] = [
    {
      key: 'schedules',
      title: 'Schedules',
      description: 'Lecture start times, venue changes, and live timetable updates',
      icon: <CalendarCheck className="w-5 h-5 text-blue-600" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      key: 'deadlines',
      title: 'Deadlines',
      description: 'Assignment submission dates, tests, and task countdown reminders',
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      key: 'broadcast',
      title: 'Broadcasts',
      description: 'Course rep notices, faculty announcements, and emergency updates',
      icon: <Megaphone className="w-5 h-5 text-indigo-600" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      key: 'modules',
      title: 'Modules',
      description: 'Course notes, syllabus materials, and lecture video uploads',
      icon: <BookMarked className="w-5 h-5 text-sky-600" />,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
  ];

  const activeCount = channels.filter((c) => settings[c.key]).length;

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

        <h2 className="text-[15px] font-bold text-[#1C1C1E]">Push &amp; Notifications</h2>
      </div>

      {/* Real Device Push Permission Status Card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              browserPermission === 'granted' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-[#007AFF]'
            }`}>
              <Smartphone className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13.5px] font-bold text-[#1C1C1E]">Native Device Push</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  browserPermission === 'granted'
                    ? 'bg-emerald-100 text-emerald-700'
                    : browserPermission === 'denied'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {browserPermission === 'granted' ? 'Active & Ready' : browserPermission === 'denied' ? 'Blocked' : 'Permission Required'}
                </span>
              </div>
              <p className="text-[11.5px] text-[#8E8E93] leading-snug mt-0.5">
                Receive live alerts on your device lockscreen even when the app is closed.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-enable-device-push"
            onClick={handleRequestSystemPermissions}
            disabled={isSubscribing}
            className={`px-3 py-1.5 rounded-xl text-white text-[12px] font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95 disabled:opacity-50 ${
              browserPermission === 'granted'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : browserPermission === 'denied'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#007AFF] hover:bg-blue-600'
            }`}
          >
            {isSubscribing
              ? 'Connecting...'
              : browserPermission === 'granted'
              ? 'Test Alert'
              : browserPermission === 'denied'
              ? 'Fix / Re-check'
              : 'Enable Push'}
          </button>
        </div>

        {browserPermission === 'granted' && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-200/60 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>Device registered with Firebase background push service. You will receive alerts even when closed.</span>
          </div>
        )}

        {/* Dedicated "Why is it Blocked?" Resolution Card */}
        {browserPermission === 'denied' && (
          <div className="mt-2 p-3.5 rounded-xl bg-rose-50/80 border border-rose-200/90 text-slate-800 text-[11.5px] space-y-2.5">
            <div className="flex items-center justify-between text-rose-800 font-bold text-[12px]">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                Why is Push Notification showing Blocked?
              </span>
              <button
                type="button"
                onClick={() => setShowUnblockGuide(!showUnblockGuide)}
                className="text-[11px] text-rose-700 hover:text-rose-900 underline cursor-pointer"
              >
                {showUnblockGuide ? 'Hide Guide' : 'Show Guide'}
              </button>
            </div>

            <p className="text-slate-600 leading-relaxed font-medium">
              Your browser or mobile operating system has blocked notifications for this address{isInIframe ? ' (or you are viewing inside an embedded preview frame)' : ''}. When blocked, web browsers automatically suppress permission prompts until you set Notifications to <strong>Allow</strong> in your browser's site settings.
            </p>

            {isInIframe && (
              <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-900 text-[11.5px] space-y-1.5">
                <p className="font-semibold leading-snug">
                  ⚠️ Preview Mode: Web browsers disallow notification prompts in embedded iframes. Open directly to enable:
                </p>
                <button
                  type="button"
                  onClick={handleOpenInDirectTab}
                  className="w-full py-1.5 px-3 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-[11.5px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open App in Direct Browser Tab</span>
                </button>
              </div>
            )}

            {showUnblockGuide && (
              <div className="space-y-1.5 pt-1 border-t border-rose-200/60 text-slate-700 font-medium">
                <div className="text-[11px] font-bold text-slate-900 mb-1">
                  How to Unblock on your device:
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Tap the <strong>🔒 lock</strong> or <strong>tune / site settings</strong> icon next to the address bar.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Tap <strong>Permissions</strong> ➔ <strong>Notifications</strong> ➔ set to <strong>Allow</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>Refresh Permission</strong> below to connect this device!</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                id="btn-refresh-permission"
                onClick={handleRefreshPermission}
                disabled={isRefreshing}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Checking...' : 'Refresh Permission'}</span>
              </button>

              <button
                type="button"
                id="btn-reset-cache"
                onClick={handleResetSavedState}
                title="Clear saved local permission cache"
                className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[11.5px] cursor-pointer active:scale-95"
              >
                <span>Reset Cache</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Control Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[12px] font-bold text-slate-600">
          {activeCount} of 4 channels active
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
            className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notification Channel Toggles */}
      <div className="space-y-2 pt-1">
        {channels.map((channel) => {
          const isEnabled = Boolean(settings[channel.key]);
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
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      isEnabled ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-100'
                    }`}>
                      {isEnabled ? 'ON' : 'OFF'}
                    </span>
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
