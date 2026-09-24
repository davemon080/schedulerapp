import React, { useRef, useEffect } from 'react';
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
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll the selected day pill into visible center
  useEffect(() => {
    if (activeBtnRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const btn = activeBtnRef.current;
      const containerWidth = container.offsetWidth;
      const btnLeft = btn.offsetLeft;
      const btnWidth = btn.offsetWidth;
      const targetScroll = btnLeft - containerWidth / 2 + btnWidth / 2;
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [selectedDayId]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -180 : 180;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const visibleDays = days.slice(0, 7);

  return (
    <section className="glass-container rounded-[24px] py-3 px-3.5 sm:px-4 transition-all relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-white/80">
      {/* Subtle glass reflection highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

      {/* Header Row */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-[#1C1C1E] tracking-tight">
            Select Day Timeline (7 Days)
          </h2>
          <span className="text-[11px] font-semibold text-[#007AFF] bg-blue-50/90 px-2 py-0.5 rounded-full border border-blue-200/50 hidden xs:inline-block shadow-2xs">
            Academic Week
          </span>
        </div>

        {/* Mini scroll controls */}
        <div className="flex items-center gap-1 sm:hidden">
          <button
            onClick={() => handleScroll('left')}
            aria-label="Previous days"
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-600 active:scale-90 transition-all cursor-pointer touch-target"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            aria-label="Next days"
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-600 active:scale-90 transition-all cursor-pointer touch-target"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Strip - 7 Days */}
      <div
        ref={scrollContainerRef}
        className="grid grid-cols-7 gap-1.5 sm:gap-2 py-1 px-0.5 overflow-x-auto no-scrollbar"
      >
        {visibleDays.map((item) => {
          const isSelected = item.id === selectedDayId;
          const isToday = Boolean(item.isToday);
          const count = item.eventsCount || 0;

          return (
            <motion.button
              key={item.id}
              ref={isSelected ? activeBtnRef : null}
              onClick={() => onSelectDay(item.id)}
              whileTap={{ scale: 0.94 }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-[16px] cursor-pointer select-none relative transition-colors duration-150 w-full min-w-[38px] min-h-[56px] touch-target ${
                isSelected
                  ? 'text-white z-10'
                  : isToday
                  ? 'bg-white/70 hover:bg-white border border-blue-400/50 text-[#1C1C1E]'
                  : 'bg-white/40 hover:bg-white/80 border border-white/60 text-[#1C1C1E]'
              }`}
            >
              {/* Sliding Active Pill */}
              {isSelected && (
                <motion.div
                  layoutId="activeDayTimelinePill"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="absolute inset-0 bg-[#007AFF] rounded-[16px] shadow-[0_6px_20px_rgba(0,122,255,0.38)] border border-blue-400/50 -z-10"
                />
              )}

              {/* Day Name */}
              <span
                className={`text-[10px] sm:text-[11px] font-bold uppercase leading-tight ${
                  isSelected ? 'text-white' : isToday ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                }`}
              >
                {item.dayName}
              </span>

              {/* Day Number */}
              <span
                className={`text-[15px] sm:text-[17px] font-extrabold tracking-tight leading-snug my-0.5 ${
                  isSelected ? 'text-white' : 'text-[#1C1C1E]'
                }`}
              >
                {item.dateNum}
              </span>

              {/* Schedule Count Badge */}
              <span
                className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded-full leading-tight truncate max-w-full ${
                  isSelected
                    ? 'text-white bg-white/20'
                    : count > 0
                    ? 'text-[#007AFF] bg-blue-50/90 font-bold border border-blue-200/50'
                    : 'text-[#8E8E93]/70'
                }`}
              >
                {count > 0 ? `${count}` : '0'}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
