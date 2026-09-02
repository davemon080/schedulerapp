import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';

interface PermissionsPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsUpdated?: (notifStatus: string, photoStatus: string) => void;
}

export const PermissionsPromptModal: React.FC<PermissionsPromptModalProps> = ({
  isOpen,
  onClose,
  onPermissionsUpdated,
}) => {
  const [notificationStatus, setNotificationStatus] = useState<string>('default');
  const [photosStatus, setPhotosStatus] = useState<string>('granted');
  const [isRequesting, setIsRequesting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationStatus(Notification.permission);
    }
  }, [isOpen]);

  const handleGrantPermissions = async () => {
    setIsRequesting(true);
    let finalNotifStatus = notificationStatus;
    let finalPhotosStatus = 'granted';

    // 1. Request Notification Permission
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        finalNotifStatus = permission;
        setNotificationStatus(permission);
      }
    } catch (e) {
      console.warn('Notification permission request error:', e);
    }

    // 2. Request Photo / Camera Access
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          // Immediately stop tracks after confirming permission
          stream.getTracks().forEach(track => track.stop());
          finalPhotosStatus = 'granted';
          setPhotosStatus('granted');
        } catch (mediaErr) {
          console.log('Photos/camera access optional notice:', mediaErr);
          finalPhotosStatus = 'granted'; // File upload photo picker is always available in web
        }
      }
    } catch (e) {
      console.warn('Photo access check error:', e);
    }

    // Save prompt completion flag
    try {
      localStorage.setItem('app_permissions_prompted_v1', 'true');
      localStorage.setItem('app_notification_permission', finalNotifStatus);
      localStorage.setItem('app_photos_permission', finalPhotosStatus);
    } catch {}

    if (onPermissionsUpdated) {
      onPermissionsUpdated(finalNotifStatus, finalPhotosStatus);
    }

    setIsRequesting(false);
    setFeedback('Permissions configured successfully!');
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('app_permissions_prompted_v1', 'true');
    } catch {}
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="permissions-prompt-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm select-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-[28px] shadow-2xl p-5 sm:p-6 relative text-[#1C1C1E] overflow-hidden"
        >
          {/* Subtle Ambient Background */}
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 rounded-full bg-blue-400/15 blur-2xl pointer-events-none" />
          <div className="absolute bottom-[-50px] left-[-50px] w-32 h-32 rounded-full bg-indigo-400/15 blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Badge */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Bell className="w-7 h-7" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center mb-5">
            <h2 className="text-[19px] font-extrabold text-[#1C1C1E] tracking-tight">
              Enable App Permissions
            </h2>
            <p className="text-[12.5px] text-[#8E8E93] mt-1.5 leading-relaxed font-medium">
              Grant permissions to get real-time lecture notifications and upload photos for your student profile.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-2.5 mb-5">
            {/* Notifications feature */}
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#007AFF] flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h4 className="text-[13px] font-bold text-[#1C1C1E]">
                  Push & Pop Notifications
                </h4>
                <p className="text-[11.5px] text-[#8E8E93] leading-snug mt-0.5">
                  Timetable updates, venue changes, deadline alerts, and broadcasts.
                </p>
              </div>
            </div>

            {/* Photos & Media feature */}
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h4 className="text-[13px] font-bold text-[#1C1C1E]">
                  Photos & Media Access
                </h4>
                <p className="text-[11.5px] text-[#8E8E93] leading-snug mt-0.5">
                  Upload profile avatars, receipt verification, and course documents.
                </p>
              </div>
            </div>
          </div>

          {/* Feedback message if any */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center justify-center gap-1.5 text-[12px] font-bold text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-full border border-emerald-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{feedback}</span>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              id="btn-allow-all-permissions"
              type="button"
              disabled={isRequesting}
              onClick={handleGrantPermissions}
              className="w-full py-3 px-4 rounded-2xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-[14px] shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60"
            >
              {isRequesting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Requesting Access...</span>
                </div>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Allow Notifications & Photos</span>
                </>
              )}
            </button>

            <button
              id="btn-dismiss-permissions"
              type="button"
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-2xl text-slate-500 hover:text-slate-800 text-[13px] font-semibold transition-all cursor-pointer text-center"
            >
              Continue with Limited Access
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
