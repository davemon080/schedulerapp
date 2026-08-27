import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { DayTimelineItem } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DayTimelineSectionProps {
  days: DayTimelineItem[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
}

export const DayTimelineSection: React.FC<DayTimelineSectionProps> = ({
  days,
  selectedDayId,
  onSelectDay,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -160 : 160;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="glass-container rounded-[24px] py-3 px-3.5 sm:px-4 transition-all relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-white/80">
      {/* Subtle glass reflection highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

      {/* Header Row */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-[#1C1C1E] tracking-tight">
            Select Day Timeline
          </h2>
          <span className="text-[11px] font-semibold text-[#007AFF] bg-blue-50/90 px-2 py-0.5 rounded-full border border-blue-200/50 hidden xs:inline-block shadow-2xs">
            Today: Wed 19
          </span>
        </div>

        {/* Mini scroll controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleScroll('left')}
            aria-label="Previous days"
            className="w-6 h-6 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-600 active:scale-90 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            aria-label="Next days"
            className="w-6 h-6 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-600 active:scale-90 transition-all cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Calendar Strip */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-0.5 -mx-0.5"
      >
        {days.map((item) => {
          const isSelected = item.id === selectedDayId;
          const isToday = Boolean(item.isToday || item.id === 'WED 19');

          return (
            <motion.button
              key={item.id}
              onClick={() => onSelectDay(item.id)}
              whileTap={{ scale: 0.94 }}
              className={`flex-shrink-0 flex flex-col items-center justify-center cursor-pointer select-none relative transition-colors duration-150 ${
                isSelected
                  ? 'w-[68px] py-2 px-1.5 rounded-[18px] text-white z-10'
                  : isToday
                  ? 'w-[64px] py-2 px-1 rounded-[16px] bg-white/60 hover:bg-white/80 border border-blue-400/50 text-[#1C1C1E]'
                  : 'w-[64px] py-2 px-1 rounded-[16px] bg-white/30 hover:bg-white/60 border border-white/40 text-[#1C1C1E]'
              }`}
            >
              {/* Sliding Active Pill */}
              {isSelected && (
                <motion.div
                  layoutId="activeDayTimelinePill"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="absolute inset-0 bg-[#007AFF] rounded-[18px] shadow-[0_6px_20px_rgba(0,122,255,0.38)] border border-blue-400/50 -z-10"
                />
              )}

              {/* "Today" Badge or Day Name */}
              {isToday ? (
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full leading-tight ${
                    isSelected
                      ? 'text-white bg-white/20'
                      : 'text-[#007AFF] bg-blue-50 border border-blue-200/60'
                  }`}
                >
                  Today
                </span>
              ) : (
                <span
                  className={`text-[11px] font-semibold tracking-wide uppercase leading-tight ${
                    isSelected ? 'text-blue-100' : 'text-[#8E8E93]'
                  }`}
                >
                  {item.dayName}
                </span>
              )}

              {/* Day Number */}
              <span
                className={`text-[17px] font-bold tracking-tight leading-snug my-0.5 ${
                  isSelected ? 'text-white' : 'text-[#1C1C1E]'
                }`}
              >
                {item.dateNum}
              </span>

              {/* Sub-label / acts count */}
              {isSelected ? (
                <span className="text-[10px] font-medium text-white/95 bg-white/20 px-1.5 py-0.2 rounded-full tracking-tight leading-tight">
                  {item.eventsCount} acts
                </span>
              ) : (
                <span className="text-[10px] font-medium text-[#8E8E93]/80 leading-tight">
                  {item.eventsCount > 0 ? `${item.eventsCount} acts` : '—'}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
