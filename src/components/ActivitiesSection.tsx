import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EventItem } from '../types';
import { Clock, MapPin, MoreVertical, AlertCircle, BookOpen, Video, Globe, ExternalLink, Radio } from 'lucide-react';
import { ActivitiesSkeleton } from './Skeletons';

interface ActivitiesSectionProps {
  events: EventItem[];
  selectedDayName: string;
  onOpenMenu: (event: EventItem) => void;
  onSelectCard?: (event: EventItem) => void;
  isLoading?: boolean;
}

function extractMeetingUrl(event: EventItem): string {
  if (event.meetingLink && event.meetingLink.trim()) {
    return event.meetingLink.trim();
  }
  if (event.location) {
    const loc = event.location.trim();
    if (
      loc.startsWith('http://') ||
      loc.startsWith('https://') ||
      loc.includes('meet.google.com') ||
      loc.includes('zoom.us') ||
      loc.includes('teams.microsoft.com')
    ) {
      return loc;
    }
  }
  if (event.notes) {
    const match = event.notes.match(/https?:\/\/[^\s]+/);
    if (match) return match[0];
  }
  return '';
}

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const timeOnly = clean.replace(/AM|PM/g, '').trim();
  const [hStr, mStr] = timeOnly.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h)) return null;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

function isDateToday(dayKeyOrName?: string): boolean {
  if (!dayKeyOrName) return false;
  const today = new Date();
  const dateNum = today.getDate();
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = dayNames[today.getDay()];

  const clean = dayKeyOrName.toUpperCase();
  // Direct match for "MON 31", "31", "MON", "TODAY"
  if (clean.includes('TODAY')) return true;
  if (clean.includes(`${dayName} ${dateNum}`)) return true;
  
  // If the string contains both the weekday and the date number
  if (clean.includes(dayName) && clean.includes(String(dateNum))) return true;

  // If the selected day ID starts with day name and has the date number
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    const p0 = parts[0];
    const p1 = parseInt(parts[1], 10);
    if (p0 === dayName && p1 === dateNum) return true;
  }

  return false;
}

function checkIsLive(event: EventItem, isDayToday: boolean): boolean {
  // Check if today matches either the selected day view or the event's own dayKey
  const eventIsToday = isDayToday || isDateToday(event.dayKey);
  if (!eventIsToday) return false;
  if (event.isPostponed) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let startMins: number | null = null;
  let endMins: number | null = null;

  if (event.startTime && event.endTime) {
    const sParts = event.startTime.split(':').map(Number);
    const eParts = event.endTime.split(':').map(Number);
    if (!isNaN(sParts[0]) && !isNaN(eParts[0])) {
      startMins = sParts[0] * 60 + (sParts[1] || 0);
      endMins = eParts[0] * 60 + (eParts[1] || 0);
    }
  }

  if (startMins === null || endMins === null) {
    if (event.time && event.time.includes('-')) {
      const [startStr, endStr] = event.time.split('-');
      startMins = parseTimeToMinutes(startStr);
      endMins = parseTimeToMinutes(endStr);
    }
  }

  if (startMins !== null && endMins !== null) {
    return currentMinutes >= startMins && currentMinutes <= endMins;
  }

  return false;
}

function checkIsEnded(event: EventItem, isDayToday: boolean): boolean {
  if (event.isPostponed) return false;
  const eventIsToday = isDayToday || isDateToday(event.dayKey);
  
  if (eventIsToday) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let endMins: number | null = null;
    if (event.endTime) {
      const eParts = event.endTime.split(':').map(Number);
      if (!isNaN(eParts[0])) {
        endMins = eParts[0] * 60 + (eParts[1] || 0);
      }
    }
    if (endMins === null && event.time && event.time.includes('-')) {
      const [, endStr] = event.time.split('-');
      endMins = parseTimeToMinutes(endStr);
    }

    if (endMins !== null) {
      return currentMinutes > endMins;
    }
  }
  return false;
}

export const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({
  events,
  selectedDayName,
  onOpenMenu,
  onSelectCard,
  isLoading = false,
}) => {
  // Re-evaluate live state every 15 seconds to ensure precision
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  // Sort schedule events chronologically by start time
  const sortedEvents = useMemo(() => {
    const getSortMinutes = (ev: EventItem): number => {
      if (ev.startTime) {
        const parts = ev.startTime.split(':').map(Number);
        if (!isNaN(parts[0])) return parts[0] * 60 + (parts[1] || 0);
      }
      if (ev.time) {
        const raw = ev.time.split('-')[0].trim().toUpperCase();
        const mins = parseTimeToMinutes(raw);
        if (mins !== null) return mins;
      }
      return 9999;
    };
    return [...events].sort((a, b) => getSortMinutes(a) - getSortMinutes(b));
  }, [events]);

  if (isLoading) {
    return <ActivitiesSkeleton />;
  }

  const isDayToday = isDateToday(selectedDayName);

  const handleJoinMeeting = (e: React.MouseEvent, rawUrl?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!rawUrl || !rawUrl.trim()) return;
    const cleanUrl = rawUrl.trim();
    const finalUrl = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
      ? cleanUrl
      : `https://${cleanUrl}`;
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="space-y-4">
      {/* Title & Subtitle Section */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between px-1 gap-1">
        <div>
          <h2 className="text-[22px] font-bold text-[#1C1C1E] tracking-tight flex items-center gap-2">
            <span>{isDayToday ? "Today's Activities" : `${selectedDayName} Activities`}</span>
            {isDayToday && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Today
              </span>
            )}
          </h2>
          <p className="text-[14px] text-[#8E8E93] font-normal">
            {sortedEvents.length} scheduled event{sortedEvents.length === 1 ? '' : 's'} {isDayToday ? 'today' : `for ${selectedDayName}`}
          </p>
        </div>
        <span className="text-[12px] font-semibold text-[#007AFF] bg-blue-50/80 px-2.5 py-1 rounded-full border border-blue-200/50 self-start sm:self-auto backdrop-blur-xs">
          Academic Timetable
        </span>
      </div>

      {/* Activity Cards List with Entry & Exit Animations */}
      <div className="space-y-3.5 min-h-[140px] relative">
        <AnimatePresence mode="popLayout">
          {sortedEvents.length === 0 ? (
            <motion.div
              key={`empty-${selectedDayName}`}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
              className="glass-container rounded-[26px] p-8 text-center"
            >
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <p className="text-[15px] font-medium text-[#1C1C1E]">No scheduled activities</p>
              <p className="text-[13px] text-[#8E8E93] mt-1">Enjoy your free time or add an activity.</p>
            </motion.div>
          ) : (
            sortedEvents.map((event, index) => {
              const meetingUrl = extractMeetingUrl(event);
              const isOnline =
                event.deliveryMode === 'online' ||
                Boolean(meetingUrl) ||
                event.tags?.some((t) => t.toLowerCase().includes('online')) ||
                (event.location && (event.location.toLowerCase().includes('online') || event.location.toLowerCase().includes('meet') || event.location.toLowerCase().includes('zoom')));

              const isLive = checkIsLive(event, isDayToday);
              const isEnded = checkIsEnded(event, isDayToday);

              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{
                    duration: 0.08,
                    ease: 'easeOut',
                  }}
                  onClick={() => onSelectCard?.(event)}
                  className={`glass-container rounded-[24px] sm:rounded-[26px] p-4.5 sm:p-5.5 transition-colors hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:border-white relative group cursor-pointer ${
                    isLive
                      ? 'ring-2 ring-rose-500/80 bg-rose-50/30 shadow-[0_8px_24px_rgba(244,63,94,0.12)]'
                      : isEnded
                      ? 'opacity-85 bg-slate-50/60'
                      : ''
                  }`}
                >
                  {/* Top Row: Course Code + Badges + Three-Dot Action Menu */}
                  <div className="flex items-start justify-between gap-2.5 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Course Code Tag - only rendered if event has an academic course code */}
                      {event.course && event.course.trim() && event.course.trim().toUpperCase() !== 'OTHER' ? (
                        <span className={`px-3 py-1 rounded-xl text-[13px] font-extrabold tracking-tight border shadow-2xs ${
                          isEnded
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-[#007AFF]/10 text-[#007AFF] border-blue-400/25'
                        }`}>
                          {event.course}
                        </span>
                      ) : null}

                      {/* Online vs Physical badge */}
                      {isOnline ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight border shadow-2xs ${
                          isEnded
                            ? 'text-slate-600 bg-slate-100 border-slate-200'
                            : 'text-emerald-800 bg-emerald-50 border-emerald-300/80'
                        }`}>
                          <Globe className={`w-3 h-3 ${isEnded ? 'text-slate-400' : 'text-emerald-600'}`} />
                          Online Class
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight text-slate-700 bg-slate-100/90 border border-black/5 shadow-2xs">
                          Physical Class
                        </span>
                      )}

                      {/* "Live Now" Badge */}
                      {isLive && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-black tracking-tight text-white bg-rose-600 shadow-[0_2px_10px_rgba(225,29,72,0.4)] animate-pulse">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                          Live Now
                        </span>
                      )}

                      {/* "Class Ended" Badge */}
                      {isEnded && !event.isPostponed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight text-slate-600 bg-slate-200/80 border border-slate-300 shadow-2xs">
                          Class Ended
                        </span>
                      )}

                      {/* "Postponed" Badge */}
                      {event.isPostponed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight text-amber-800 bg-amber-50/90 border border-amber-400/80 shadow-2xs">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Postponed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Three-Dot Menu Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMenu(event);
                        }}
                        aria-label="Event options menu"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-black/5 active:scale-90 transition-all cursor-pointer"
                      >
                        <MoreVertical className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className={`text-[17px] sm:text-[18px] font-bold tracking-tight leading-snug mb-2.5 ${
                    isEnded ? 'text-slate-600' : 'text-[#1C1C1E]'
                  }`}>
                    {event.title}
                  </h3>

                  {/* Time, Location & Lecturer Info */}
                  <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 mb-3 text-[13px] text-[#8E8E93]">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                      isLive
                        ? 'bg-rose-100/70 border-rose-300 text-rose-900 font-bold'
                        : isEnded
                        ? 'bg-slate-100 border-slate-200 text-slate-500'
                        : 'bg-white/60 border-black/5 text-[#1C1C1E]'
                    }`}>
                      <Clock className={`w-3.5 h-3.5 shrink-0 ${isLive ? 'text-rose-600' : isEnded ? 'text-slate-400' : 'text-[#007AFF]'}`} />
                      <span className="font-semibold">{event.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isOnline ? (
                        <Video className={`w-3.5 h-3.5 shrink-0 ${isEnded ? 'text-slate-400' : 'text-emerald-600'}`} />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
                      )}
                      <span className="font-medium text-[#1C1C1E]/80 truncate max-w-[200px] sm:max-w-none">
                        {event.location}
                      </span>
                    </div>
                    {event.instructor && (
                      <span className="text-[12.5px] text-[#8E8E93] truncate">
                        • {event.instructor}
                      </span>
                    )}
                  </div>

                  {/* Dedicated Online Class Join Button & Link Banner */}
                  {meetingUrl ? (
                    <div className="mb-3">
                      {isEnded ? (
                        /* Non-clickable Class Ended Button */
                        <button
                          type="button"
                          disabled
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-[13px] bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none select-none"
                        >
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4 text-slate-400" />
                            <span>Online Class Ended</span>
                          </div>
                          <span className="text-[11px] bg-slate-200/80 text-slate-500 px-2.5 py-0.5 rounded-lg">
                            Class Ended
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleJoinMeeting(e, meetingUrl)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-150 shadow-xs cursor-pointer active:scale-[0.99] ${
                            isLive
                              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-[0_4px_16px_rgba(225,29,72,0.35)] ring-2 ring-rose-400'
                              : 'bg-[#007AFF] hover:bg-blue-600 text-white shadow-blue-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isLive ? (
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                              </span>
                            ) : (
                              <Video className="w-4 h-4 text-white" />
                            )}
                            <span>{isLive ? '🔴 Live Now • Tap to Join' : 'Join Online Class'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-bold bg-white/20 hover:bg-white/30 px-2.5 py-0.5 rounded-lg transition-colors shrink-0">
                            <span>{isLive ? 'Live Now' : 'Join Now'}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      )}
                    </div>
                  ) : isOnline ? (
                    <div className={`mb-3 w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[12px] font-medium border ${
                      isLive
                        ? 'bg-rose-50 text-rose-900 border-rose-200 font-bold'
                        : isEnded
                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Radio className={`w-4 h-4 shrink-0 ${isLive ? 'text-rose-600 animate-pulse' : isEnded ? 'text-slate-400' : 'text-emerald-600'}`} />
                        <span>{isLive ? '🔴 Live Online Session in Progress' : isEnded ? 'Online Session Ended' : 'Online Lecture'}</span>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        isLive
                          ? 'bg-rose-100 text-rose-800'
                          : isEnded
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-emerald-100/70 text-emerald-700'
                      }`}>
                        {isEnded ? 'Class Ended' : 'Meeting link in course channel'}
                      </span>
                    </div>
                  ) : isLive ? (
                    <div className="mb-3 w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-rose-50 text-rose-900 text-[12px] font-bold border border-rose-200">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-600 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                        </span>
                        <span>🔴 Class Active Now in {event.location}</span>
                      </div>
                      <span className="text-[11px] text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                        In Session
                      </span>
                    </div>
                  ) : null}

                  {/* Bottom Row: Tags & Views Counter */}
                  <div className="flex items-center justify-between pt-3 border-t border-black/5 flex-wrap gap-2">
                    {/* Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {event.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[12px] font-medium text-slate-700 bg-white/70 px-2.5 py-0.5 rounded-md border border-black/5 shadow-2xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {event.instructor && (
                        <span className="text-[12px] text-[#8E8E93] hidden md:inline-block">
                          • {event.instructor}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
