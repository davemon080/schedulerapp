import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  CheckCircle2,
  X,
  Calendar,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UserSession } from '../types';
import { PushNotifications } from '../lib/capacitorPushNotifications';
import { LocalNotifications } from '../lib/capacitorLocalNotifications';
import { requestAppNotificationPermission, getPushPermissionState } from '../lib/pushNotificationClient';

interface PermissionsPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsUpdated?: (notifStatus: string, photoStatus?: string) => void;
  userSession?: UserSession | null;
}

export const PermissionsPromptModal: React.FC<PermissionsPromptModalProps> = ({
  isOpen,
  onClose,
  onPermissionsUpdated,
  userSession,
}) => {
  const [notificationStatus, setNotificationStatus] = useState<string>('default');
  const [isRequesting, setIsRequesting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | 'warning' | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isCheckingAgain, setIsCheckingAgain] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsInIframe(window.self !== window.top);
    }
  }, []);

  const checkCurrentPermission = async () => {
    try {
      const perm = await PushNotifications.checkPermissions();
      if (perm?.receive === 'granted') {
        setNotificationStatus('granted');
        return 'granted';
      } else if (perm?.receive === 'denied') {
        setNotificationStatus('denied');
        return 'denied';
      }
    } catch {}

    try {
      const localPerm = await LocalNotifications.checkPermissions();
      if (localPerm?.display === 'granted') {
        setNotificationStatus('granted');
        return 'granted';
      } else if (localPerm?.display === 'denied') {
        setNotificationStatus('denied');
        return 'denied';
      }
    } catch {}

    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const p = Notification.permission;
        setNotificationStatus(p);
        return p;
      }
    } catch {}

    const state = await getPushPermissionState();
    setNotificationStatus(state);
    return state;
  };

  useEffect(() => {
    if (isOpen) {
      checkCurrentPermission().then((status) => {
        if (status === 'denied') {
          setShowTroubleshoot(true);
        }
      });
    }
  }, [isOpen]);

  const handleGrantPermission = async () => {
    setIsRequesting(true);
    setFeedback(null);
    setFeedbackType(null);

    try {
      console.log('[PermissionsPromptModal] Triggering native notification permissions request...');
      const res = await requestAppNotificationPermission(userSession);

      if (res.success || res.status === 'granted') {
        setNotificationStatus('granted');
        setFeedbackType('success');
        setFeedback('✓ Notification permission granted! Your device is now connected to live class & broadcast alerts.');

        try {
          localStorage.setItem('app_notification_prompt_completed', 'true');
          localStorage.setItem('app_notification_permission_requested', 'true');
          localStorage.setItem('app_notification_permission', 'granted');
        } catch {}

        if (onPermissionsUpdated) {
          onPermissionsUpdated('granted', 'granted');
        }

        setTimeout(() => {
          onClose();
        }, 1200);
      } else if (res.status === 'denied') {
        setNotificationStatus('denied');
        setFeedbackType('error');
        setFeedback('Notifications are blocked. Please allow notifications in device or app settings.');
        setShowTroubleshoot(true);

        try {
          localStorage.setItem('app_notification_prompt_completed', 'true');
          localStorage.setItem('app_notification_permission', 'denied');
        } catch {}

        if (onPermissionsUpdated) {
          onPermissionsUpdated('denied', 'granted');
        }
      } else {
        setFeedbackType('warning');
        setFeedback('System prompt was closed without granting. Tap Enable Push Notifications to try again.');
      }
    } catch (err: any) {
      console.warn('[Push] Permission request exception in modal:', err);
      setFeedbackType('error');
      setFeedback('Unable to trigger notification prompt. Please verify app permissions in device settings.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCheckAgain = async () => {
    setIsCheckingAgain(true);
    setFeedback(null);
    setFeedbackType(null);

    const latest = await checkCurrentPermission();

    if (latest === 'granted') {
      setFeedbackType('success');
      setFeedback('Notifications allowed! Completing device setup...');
      await requestAppNotificationPermission(userSession);
      if (onPermissionsUpdated) {
        onPermissionsUpdated('granted', 'granted');
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } else if (latest === 'denied') {
      setFeedbackType('error');
      setFeedback('Still blocked. Please ensure Notifications are set to "Allow" in your browser/device settings.');
      setShowTroubleshoot(true);
    } else {
      setFeedbackType('warning');
      setFeedback('Permission status is reset. Tap "Enable Push Notifications" to show the system dialog.');
    }

    setIsCheckingAgain(false);
  };

  const handleOpenInDirectTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('app_notification_prompt_completed', 'true');
    } catch {}
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="notification-permission-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm sm:max-w-md bg-white/98 backdrop-blur-2xl border border-slate-200/90 rounded-[28px] shadow-2xl p-5 sm:p-6 relative text-[#1C1C1E] my-auto"
        >
          {/* Subtle Ambient Background */}
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 rounded-full bg-blue-400/15 blur-2xl pointer-events-none" />
          <div className="absolute bottom-[-50px] left-[-50px] w-32 h-32 rounded-full bg-indigo-400/15 blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Badge */}
          <div className="flex items-center justify-center mb-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${
              notificationStatus === 'denied'
                ? 'bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-rose-500/25'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/25'
            }`}>
              {notificationStatus === 'denied' ? (
                <ShieldAlert className="w-7 h-7" />
              ) : (
                <Bell className="w-7 h-7" />
              )}
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-[19px] font-extrabold text-[#1C1C1E] tracking-tight">
                {notificationStatus === 'denied' ? 'Unblock Push Notifications' : 'Enable Push Notifications'}
              </h2>
            </div>
            <p className="text-[12.5px] text-[#8E8E93] mt-1 leading-relaxed font-medium">
              {notificationStatus === 'denied'
                ? 'Your device or browser currently has notifications turned off. Follow the quick steps to receive timetable & class updates.'
                : 'Get immediate lockscreen alerts on your device for lecture shifts, cancellations, and course rep announcements.'}
            </p>
          </div>

          {/* Embedded Preview Warning */}
          {isInIframe && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-800 text-[12px] space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-semibold leading-snug">
                  Viewing in preview frame. Browsers require a direct tab to display system notification prompts.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenInDirectTab}
                className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Direct Browser Tab</span>
              </button>
            </div>
          )}

          {/* Features list (shown if not blocked) */}
          {notificationStatus !== 'denied' && (
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-50/90 border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-[#007AFF] flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h4 className="text-[12.5px] font-bold text-[#1C1C1E]">
                    Timetable &amp; Venue Changes
                  </h4>
                  <p className="text-[11px] text-[#8E8E93] leading-snug">
                    Instant alerts when class hours or lecture halls shift.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-50/90 border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h4 className="text-[12.5px] font-bold text-[#1C1C1E]">
                    Cancellations &amp; Emergency Notices
                  </h4>
                  <p className="text-[11px] text-[#8E8E93] leading-snug">
                    Know immediately if a lecturer cancels or reschedules.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-50/90 border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h4 className="text-[12.5px] font-bold text-[#1C1C1E]">
                    Deadlines &amp; Assignments
                  </h4>
                  <p className="text-[11px] text-[#8E8E93] leading-snug">
                    Timely alerts before submission portals close.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Feedback message banner */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 p-2.5 rounded-2xl text-[12px] font-semibold flex items-start gap-2 border ${
                feedbackType === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : feedbackType === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {feedbackType === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{feedback}</span>
            </motion.div>
          )}

          {/* How to Unblock Instructions */}
          {(showTroubleshoot || notificationStatus === 'denied') && (
            <div className="mb-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-[11.5px] text-slate-700 space-y-2">
              <div className="flex items-center justify-between font-bold text-[12px] text-slate-900">
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  How to Allow in 10 Seconds:
                </span>
                <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold uppercase">
                  Currently Blocked
                </span>
              </div>

              <div className="space-y-1.5 text-slate-600 font-medium">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Tap the <strong>🔒 lock</strong> or <strong>tune / site settings</strong> icon on the left of your address bar.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Tap <strong>Permissions</strong> or <strong>Site settings</strong>, find <strong>Notifications</strong>, and switch it to <strong>Allow</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Come back here and tap <strong>"Check Permission Again"</strong> below.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckAgain}
                disabled={isCheckingAgain}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#007AFF] font-bold text-[12px] border border-blue-200/80 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingAgain ? 'animate-spin' : ''}`} />
                <span>{isCheckingAgain ? 'Checking Permission...' : 'Check Permission Again'}</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {notificationStatus !== 'denied' ? (
              <button
                id="btn-allow-push-notifications"
                type="button"
                disabled={isRequesting}
                onClick={handleGrantPermission}
                className="w-full py-3 px-4 rounded-2xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-[14px] shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60"
              >
                {isRequesting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Triggering System Prompt...</span>
                  </div>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Enable Push Notifications</span>
                  </>
                )}
              </button>
            ) : (
              <button
                id="btn-recheck-push-notifications"
                type="button"
                disabled={isCheckingAgain}
                onClick={handleCheckAgain}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[14px] shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingAgain ? 'animate-spin' : ''}`} />
                <span>{isCheckingAgain ? 'Verifying System State...' : 'Verify & Enable Notifications'}</span>
              </button>
            )}

            <button
              id="btn-dismiss-push-notifications"
              type="button"
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-2xl text-slate-500 hover:text-slate-800 text-[13px] font-semibold transition-all cursor-pointer text-center"
            >
              Maybe Later
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
