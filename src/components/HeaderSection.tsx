import React, { useRef } from 'react';
import { FlaskConical, Calendar as CalendarIcon, Bell, Camera } from 'lucide-react';
import { UserSession } from '../types';

interface HeaderSectionProps {
  onOpenNotifications?: () => void;
  onOpenCalendarView?: () => void;
  onOpenProfileTab?: () => void;
  unreadCount?: number;
  profileImage?: string | null;
  onUploadProfileImage?: (imageDataUrl: string) => void;
  isNotificationsActive?: boolean;
  isCalendarActive?: boolean;
  userSession?: UserSession | null;
  isAccessBlocked?: boolean;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({
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
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && onUploadProfileImage) {
          onUploadProfileImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <header className="flex items-center justify-between gap-3 pt-2 pb-1 px-1">
      {/* Hidden file input for uploading profile pic */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Profile Card / User Info Pill */}
      <div 
        onClick={onOpenProfileTab}
        className="flex items-center gap-3 glass-container py-1.5 px-3 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/80 cursor-pointer active:scale-98 transition-all group"
      >
        {/* Profile Image: Click to upload from device */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          title="Click to change profile picture from device"
          className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/15 to-indigo-500/25 border border-white flex items-center justify-center shadow-inner text-[#007AFF] relative overflow-hidden group/avatar cursor-pointer"
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
          <span className="text-[14px] font-bold text-[#1C1C1E] leading-tight tracking-tight group-hover:text-[#007AFF] transition-colors truncate max-w-[130px] sm:max-w-[180px]">
            {displayName}
          </span>
          <span className="text-[12px] font-normal text-[#8E8E93] leading-tight truncate max-w-[130px] sm:max-w-[180px]">
            {displayDepartment}
          </span>
        </div>
      </div>

      {/* Utility Icons */}
      <div className="flex items-center gap-2">
        {/* Calendar Icon Container */}
        <button
          onClick={isAccessBlocked ? undefined : onOpenCalendarView}
          disabled={isAccessBlocked}
          aria-label="Open Calendar Page"
          className={`w-10 h-10 rounded-[16px] flex items-center justify-center transition-all duration-150 relative ${
            isAccessBlocked
              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
              : isCalendarActive
              ? 'bg-blue-500/15 border-2 border-[#007AFF] text-[#007AFF] shadow-xs active:scale-95 cursor-pointer'
              : 'glass-icon-btn text-[#1C1C1E] active:scale-95 cursor-pointer'
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
          className={`w-10 h-10 rounded-[16px] flex items-center justify-center transition-all duration-150 relative ${
            isAccessBlocked
              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
              : isNotificationsActive
              ? 'bg-blue-500/15 border-2 border-[#007AFF] text-[#007AFF] shadow-xs active:scale-95 cursor-pointer'
              : 'glass-icon-btn text-[#1C1C1E] active:scale-95 cursor-pointer'
          }`}
          title={isAccessBlocked ? "Access locked - activate semester access to view notifications" : "Notifications & Activities Page"}
        >
          <Bell className={`w-[19px] h-[19px] ${isAccessBlocked ? 'text-slate-400' : isNotificationsActive ? 'text-[#007AFF]' : 'text-[#1C1C1E]'}`} />
          {!isAccessBlocked && unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#FF3B30] rounded-full ring-2 ring-white shadow-sm animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
};
