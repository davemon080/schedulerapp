import React, { useState, useMemo } from 'react';
import { EventItem, DayTimelineItem } from '../types';
import { ChevronLeft, ChevronRight, Video } from 'lucide-react';

interface CalendarViewProps {
  events: EventItem[];
  days: DayTimelineItem[];
  selectedDateNum?: number;
  onSelectDate: (dateNum: number, dayId: string, dateObj?: Date) => void;
  activeLevel?: number;
  activeSemester?: string;
  departmentName?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function getEventSortTime(event: EventItem): number {
  if (event.startTime) {
    const parts = event.startTime.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
    }
  }
  if (event.time) {
    const raw = event.time.split('-')[0].trim().toUpperCase();
    const isPM = raw.includes('PM');
    const isAM = raw.includes('AM');
    const match = raw.match(/(\d+)(?::(\d+))?/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      return h * 60 + m;
    }
  }
  return 9999;
}

export const CalendarView: React.FC<CalendarViewProps> = React.memo(({
  events,
  selectedDateNum,
  onSelectDate,
}) => {
  const today = useMemo(() => new Date(), []);
  // Dynamic current date initialization
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => new Date().getMonth());

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  }, [currentYear, currentMonthIndex]);

  const firstDayWeekday = useMemo(() => {
    return new Date(currentYear, currentMonthIndex, 1).getDay();
  }, [currentYear, currentMonthIndex]);

  // Map events to each date (strictly on this date's exact dayKey)
  const eventsByDate = useMemo(() => {
    const map: Record<number, EventItem[]> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonthIndex, d);
      const weekdayIndex = dateObj.getDay();
      const dayAbbr = WEEKDAYS[weekdayIndex];
      const targetDayId = `${dayAbbr} ${d}`;

      // Strictly match exact dayKey so an event on Monday Aug 31 does NOT appear on all Mondays!
      const matched = events.filter((e) => {
        return e.dayKey === targetDayId;
      });

      map[d] = matched.sort((a, b) => getEventSortTime(a) - getEventSortTime(b));
    }

    return map;
  }, [events, daysInMonth, currentYear, currentMonthIndex]);

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonthIndex(now.getMonth());
    const dayNum = now.getDate();
    const weekdayIndex = now.getDay();
    const dayAbbr = WEEKDAYS[weekdayIndex];
    const dayId = `${dayAbbr} ${dayNum}`;
    onSelectDate(dayNum, dayId, now);
  };

  return (
    <div className="w-full pb-20 rounded-none">
      {/* Calendar Header Bar - Squared & Direct on App */}
      <div className="flex items-center justify-between pt-0.5 pb-2.5 mb-2 border-b border-black/10 rounded-none">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] sm:text-[26px] font-extrabold text-[#1C1C1E] tracking-tight">
            {MONTH_NAMES[currentMonthIndex]} {currentYear}
          </h1>
          <span className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider hidden sm:inline-block">
            Academic Calendar
          </span>
        </div>

        {/* Controls - Completely Squared */}
        <div className="flex items-center border border-black/15 bg-white/80 rounded-none shadow-2xs">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="w-9 h-9 flex items-center justify-center border-r border-black/15 text-[#1C1C1E] hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer rounded-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-3 h-9 text-[12px] font-bold text-[#007AFF] hover:bg-blue-50/80 active:bg-blue-100 transition-colors cursor-pointer rounded-none border-r border-black/15"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="w-9 h-9 flex items-center justify-center text-[#1C1C1E] hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer rounded-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Row - Completely Squared with Sharp Borders */}
      <div className="grid grid-cols-7 border-t border-x border-black/15 bg-white/90 rounded-none">
        {WEEKDAYS.map((day, i) => {
          const isWeekend = i === 0 || i === 6;
          return (
            <div
              key={day}
              className={`py-2.5 text-center text-[11px] sm:text-[12px] font-bold uppercase tracking-wider border-r last:border-r-0 border-black/15 rounded-none ${
                isWeekend ? 'text-[#8E8E93] bg-black/[0.03]' : 'text-[#1C1C1E]'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Calendar Grid - Squared Cells directly on the page */}
      <div className="grid grid-cols-7 border border-black/15 bg-white/70 rounded-none">
        {/* Leading empty cells */}
        {Array.from({ length: firstDayWeekday }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="min-h-[85px] sm:min-h-[110px] border-b border-r border-black/15 bg-black/[0.02] opacity-40 rounded-none"
          />
        ))}

        {/* Calendar Days */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dateObj = new Date(currentYear, currentMonthIndex, dayNum);
          const weekdayIndex = dateObj.getDay();
          const dayAbbr = WEEKDAYS[weekdayIndex];
          const dayId = `${dayAbbr} ${dayNum}`;

          const dayEvents = eventsByDate[dayNum] || [];
          const count = dayEvents.length;
          const hasEvents = count > 0;
          const hasOnlineClass = dayEvents.some(
            (e) => e.deliveryMode === 'online' || Boolean(e.meetingLink) || e.tags?.some((t) => t.toLowerCase().includes('online'))
          );

          const isToday =
            currentYear === today.getFullYear() &&
            currentMonthIndex === today.getMonth() &&
            dayNum === today.getDate();

          const isSelected = selectedDateNum === dayNum;
          const isWeekend = weekdayIndex === 0 || weekdayIndex === 6;

          return (
            <button
              key={`day-${dayNum}`}
              type="button"
              onClick={() => onSelectDate(dayNum, dayId, dateObj)}
              className={`min-h-[85px] sm:min-h-[110px] p-2 sm:p-2.5 text-left flex flex-col justify-between border-b border-r border-black/15 transition-colors cursor-pointer rounded-none relative ${
                isSelected
                  ? 'bg-blue-50/90 ring-2 ring-inset ring-[#007AFF] z-10'
                  : isToday
                  ? 'bg-blue-50/50'
                  : hasEvents
                  ? 'bg-white hover:bg-slate-50'
                  : isWeekend
                  ? 'bg-black/[0.02] hover:bg-white/80'
                  : 'bg-white/60 hover:bg-white'
              }`}
            >
              {/* Date Number at Top */}
              <div className="flex items-start justify-between w-full">
                <span
                  className={`text-[13px] sm:text-[14px] font-bold rounded-none px-1.5 py-0.5 ${
                    isToday
                      ? 'bg-[#007AFF] text-white font-extrabold'
                      : isSelected
                      ? 'text-[#007AFF] bg-blue-100 font-extrabold'
                      : isWeekend
                      ? 'text-[#8E8E93]'
                      : 'text-[#1C1C1E]'
                  }`}
                >
                  {dayNum}
                </span>
              </div>

              {/* Event previews inside square cell */}
              <div className="w-full my-1 space-y-1 flex-1">
                {hasEvents && (
                  <>
                    <div className="hidden sm:flex flex-col gap-1 w-full overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-[10px] font-bold text-[#1C1C1E] bg-black/[0.04] px-1.5 py-0.5 border border-black/5 truncate flex items-center justify-between rounded-none"
                        >
                          <span className="truncate">{ev.course && ev.course.trim() && ev.course.toUpperCase() !== 'OTHER' ? ev.course : ev.title}</span>
                          {ev.deliveryMode === 'online' || ev.meetingLink ? (
                            <Video className="w-2.5 h-2.5 text-emerald-600 shrink-0 ml-1" />
                          ) : null}
                        </div>
                      ))}
                      {count > 2 && (
                        <span className="text-[9px] font-bold text-[#007AFF] pl-0.5">
                          +{count - 2} more
                        </span>
                      )}
                    </div>

                    {/* Mobile visual indicators */}
                    <div className="flex sm:hidden items-center gap-1">
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 w-1.5 rounded-none ${
                            hasOnlineClass && i === 0
                              ? 'bg-emerald-600'
                              : 'bg-[#007AFF]'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Number of classes on the DOWN SIDE (Bottom) with NO CONTAINER */}
              <div className="w-full mt-auto pt-1">
                {hasEvents ? (
                  <span className="text-[10px] sm:text-[11.5px] font-bold text-[#007AFF] block leading-tight">
                    {count} {count === 1 ? 'class' : 'classes'}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#8E8E93]/60 italic block leading-tight hidden sm:block">
                    {isWeekend ? 'Weekend' : '0 class'}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

