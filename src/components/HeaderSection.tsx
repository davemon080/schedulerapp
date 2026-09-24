import React, { useRef } from 'react';
import { FlaskConical, Calendar as CalendarIcon, Bell, Camera } from 'lucide-react';
import { UserSession } from '../types';

interface HeaderSectionProps {
  onOpenNotifications?: () => void;
  onOpenCalendarView?: () => void;
  onOpenProfileTab?: () => void;
  unreadCount?: number;
  profileImage?: string | null;
  onUploadProfileImage?: (imageFileOrUrl: File | string) => void;
  isNotificationsActive?: boolean;
  isCalendarActive?: boolean;
  userSession?: UserSession | null;
  isAccessBlocked?: boolean;
}

export const HeaderSection: React.FC<HeaderSectionProps> = React.memo(({
  onOpenNotifications,
  onOpenCalendarView,
  onOpenProfileTab,
  unreadCount = 2,
  profileImage,
  onUploadProfileImage,
  isNotificationsActive = false,
  isCalendarActive = false,
  userSession,
  isAccessBlocked = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = userSession?.fullName || 'Student User';
  
  // Format department name cleanly without 'Department of'
  const formatDeptName = (dept?: string) => {
    if (!dept) return 'Industrial Chemistry';
    return dept.replace(/^Department\s+of\s+/i, '').replace(/^Dept\.?\s+of\s+/i, '').trim();
  };

  const displayDepartment = formatDeptName(userSession?.department);

  const getInitials = (name: string) => {
    if (!name || name.trim().length === 0) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadProfileImage) {
      onUploadProfileImage(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      {/* Hidden file input for uploading profile pic */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Standalone Profile Card / User Info Pill */}
      <div 
        onClick={onOpenProfileTab}
        className="flex items-center gap-3 bg-white/95 backdrop-blur-2xl py-2 px-3.5 min-h-[44px] rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.10)] border border-white/95 cursor-pointer active:scale-98 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,122,255,0.18)] hover:border-blue-200/80 transition-all duration-200 group touch-target"
      >
        {/* Profile Image: Click to upload from device */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          title="Click to change profile picture from device"
          className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/15 to-indigo-500/25 border border-white flex items-center justify-center shadow-inner text-[#007AFF] relative overflow-hidden group/avatar cursor-pointer shrink-0"
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt={`${displayName} avatar`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-inner">
              {getInitials(displayName)}
            </div>
          )}

          {/* Hover overlay hint to change avatar */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white z-20">
            <Camera className="w-4 h-4" />
          </div>
        </div>

        {/* User Info (Vertical Column) */}
        <div className="flex flex-col text-left pr-1 min-w-0">
          <span className="text-[14px] font-bold text-[#1C1C1E] leading-tight tracking-tight group-hover:text-[#007AFF] transition-colors truncate max-w-[120px] sm:max-w-[180px]">
            {displayName}
          </span>
          <span className="text-[12px] font-normal text-[#8E8E93] leading-tight truncate max-w-[120px] sm:max-w-[180px]">
            {displayDepartment}
          </span>
        </div>
      </div>

      {/* Standalone Utility Icons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Calendar Icon Container */}
        <button
          onClick={isAccessBlocked ? undefined : onOpenCalendarView}
          disabled={isAccessBlocked}
          aria-label="Open Calendar Page"
          className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-[18px] flex items-center justify-center transition-all duration-200 relative touch-target ${
            isAccessBlocked
              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
              : isCalendarActive
              ? 'bg-blue-500/15 border-2 border-[#007AFF] text-[#007AFF] shadow-xs active:scale-95 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,122,255,0.2)] cursor-pointer'
              : 'bg-white/95 backdrop-blur-2xl border border-white/95 text-[#1C1C1E] shadow-[0_10px_30px_rgba(0,0,0,0.10)] active:scale-95 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,122,255,0.15)] hover:border-blue-400/40 cursor-pointer'
          }`}
          title={isAccessBlocked ? "Access locked - activate semester access to view calendar" : "Monthly Academic Calendar"}
        >
          <CalendarIcon className={`w-[19px] h-[19px] ${isAccessBlocked ? 'text-slate-400' : isCalendarActive ? 'text-[#007AFF]' : 'text-[#1C1C1E]'}`} />
        </button>

        {/* Notification Bell Container with red badge */}
        <button
          onClick={isAccessBlocked ? undefined : onOpenNotifications}
          disabled={isAccessBlocked}
          aria-label="Open Notifications Page"
          className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-[18px] flex items-center justify-center transition-all duration-200 relative touch-target ${
            isAccessBlocked
              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
              : isNotificationsActive
              ? 'bg-blue-500/15 border-2 border-[#007AFF] text-[#007AFF] shadow-xs active:scale-95 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,122,255,0.2)] cursor-pointer'
              : 'bg-white/95 backdrop-blur-2xl border border-white/95 text-[#1C1C1E] shadow-[0_10px_30px_rgba(0,0,0,0.10)] active:scale-95 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,122,255,0.15)] hover:border-blue-400/40 cursor-pointer'
          }`}
          title={isAccessBlocked ? "Access locked - activate semester access to view notifications" : "Notifications & Activities Page"}
        >
          <Bell className={`w-[19px] h-[19px] ${isAccessBlocked ? 'text-slate-400' : isNotificationsActive ? 'text-[#007AFF]' : 'text-[#1C1C1E]'}`} />
          {!isAccessBlocked && unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#FF3B30] rounded-full ring-2 ring-white shadow-sm animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
});
