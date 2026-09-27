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
    <div className="flex items-center justify-between gap-1.5 py-0.5">
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
        className="flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-2xl py-1 px-2 sm:px-2.5 min-h-[34px] sm:min-h-[36px] rounded-[16px] sm:rounded-[18px] shadow-[0_3px_12px_rgba(0,0,0,0.05)] border border-white/95 cursor-pointer active:scale-98 hover:scale-[1.01] transition-all duration-200 group min-w-0"
      >
        {/* Profile Image: Click to upload from device */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          title="Click to change profile picture from device"
          className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-gradient-to-br from-blue-500/15 to-indigo-500/25 border border-white flex items-center justify-center shadow-inner text-[#007AFF] relative overflow-hidden group/avatar cursor-pointer shrink-0"
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt={`${displayName} avatar`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10.5px] sm:text-[11px] shadow-inner">
              {getInitials(displayName)}
            </div>
          )}

          {/* Hover overlay hint to change avatar */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white z-20">
            <Camera className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* User Info (Vertical Column) */}
        <div className="flex flex-col text-left pr-0.5 min-w-0">
          <span className="text-[11.5px] sm:text-[12px] font-bold text-[#1C1C1E] leading-tight tracking-tight group-hover:text-[#007AFF] transition-colors truncate max-w-[95px] xs:max-w-[125px] sm:max-w-[160px]">
            {displayName}
          </span>
          <span className="text-[9.5px] sm:text-[10px] font-normal text-[#8E8E93] leading-tight truncate max-w-[95px] xs:max-w-[125px] sm:max-w-[160px]">
            {displayDepartment}
          </span>
        </div>
      </div>

      {/* Standalone Utility Icons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Calendar Icon Container */}
        <button
          onClick={isAccessBlocked ? undefined : onOpenCalendarView}
          disabled={isAccessBlocked}
          aria-label="Open Calendar Page"
          className={`w-7.5 h-7.5 sm:w-8 sm:h-8 min-w-[30px] min-h-[30px] sm:min-w-[32px] sm:min-h-[32px] rounded-[12px] sm:rounded-[14px] flex items-center justify-center transition-all duration-200 relative cursor-pointer ${
            isAccessBlocked
              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
              : isCalendarActive
              ? 'bg-blue-500/15 border-2 border-[#007AFF] text-[#007AFF] shadow-xs active:scale-95'
              : 'bg-white/95 backdrop-blur-2xl border border-white/95 text-[#1C1C1E] shadow-[0_3px_12px_rgba(0,0,0,0.05)] active:scale-95 hover:border-blue-400/40'
          }`}
          title={isAccessBlocked ? "Access locked - activate semester access to view calendar" : "Monthly Academic Calendar"}
        >
          <CalendarIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isAccessBlocked ? 'text-slate-400' : isCalendarActive ? 'text-[#007AFF]' : 'text-[#1C1C1E]'}`} />
        </button>

        {/* Notification Bell Container with red badge */}
        <button
          onClick={isAccessBlocked ? undefined : onOpenNotifications}
          disabled={isAccessBlocked}
          aria-label="Open Notifications Page"
          className={`w-7.5 h-7.5 sm:w-8 sm:h-8 min-w-[30px] min-h-[30px] sm:min-w-[32px] sm:min-h-[32px] rounded-[12px] sm:rounded-[14px] flex items-center justify-center transition-all duration-200 relative cursor-pointer ${
            isAccessBlocked
              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
              : isNotificationsActive
              ? 'bg-blue-500/15 border-2 border-[#007AFF] text-[#007AFF] shadow-xs active:scale-95'
              : 'bg-white/95 backdrop-blur-2xl border border-white/95 text-[#1C1C1E] shadow-[0_3px_12px_rgba(0,0,0,0.05)] active:scale-95 hover:border-blue-400/40'
          }`}
          title={isAccessBlocked ? "Access locked - activate semester access to view notifications" : "Notifications & Activities Page"}
        >
          <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isAccessBlocked ? 'text-slate-400' : isNotificationsActive ? 'text-[#007AFF]' : 'text-[#1C1C1E]'}`} />
          {!isAccessBlocked && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-[#FF3B30] text-white text-[8.5px] font-bold rounded-full flex items-center justify-center border border-white shadow-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
});
