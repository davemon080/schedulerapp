import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: number;
  onSelectDate: (dayNum: number) => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}) => {
  if (!isOpen) return null;

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  // October 2026 dates (starts on Thursday, 31 days)
  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
  const leadingBlanks = Array.from({ length: 4 }, (_, i) => i); // Oct 1, 2026 starts on Thursday

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/35 backdrop-blur-md"
        />

        {/* Bottom Drawer sliding up from under the app */}
        <motion.div
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-lg z-10 mx-auto px-3 pb-6 pt-2"
        >
          <div className="glass-sheet rounded-[32px] p-6 max-w-md mx-auto w-full relative z-10 shadow-[0_20px_60px_rgba(0,0,0,0.16)] border border-white">
            {/* Grabber Bar */}
            <div className="w-12 h-1.5 bg-black/20 rounded-full mx-auto mb-3" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/5 mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#007AFF]" />
                <h3 className="text-[17px] font-bold text-[#1C1C1E]">
                  October 2026
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-500 active:scale-95 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {daysOfWeek.map((day, idx) => (
                <span
                  key={idx}
                  className="text-[12px] font-semibold text-[#8E8E93] py-1"
                >
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {leadingBlanks.map((b) => (
                <div key={`blank-${b}`} className="h-9 w-9 mx-auto" />
              ))}

              {calendarDays.map((dayNum) => {
                const isSelected = dayNum === selectedDate;
                const isToday = dayNum === 19;
                const isScheduledWeek = dayNum >= 17 && dayNum <= 23;

                return (
                  <button
                    key={dayNum}
                    onClick={() => {
                      onSelectDate(dayNum);
                      onClose();
                    }}
                    className={`h-9 w-9 mx-auto rounded-full flex flex-col items-center justify-center text-[13px] font-semibold transition-all relative cursor-pointer ${
                      isSelected
                        ? 'bg-[#007AFF] text-white shadow-[0_4px_12px_rgba(0,122,255,0.4)] scale-105'
                        : isToday
                        ? 'bg-blue-100/80 text-[#007AFF] border border-blue-300/80 font-bold'
                        : isScheduledWeek
                        ? 'text-[#1C1C1E] hover:bg-white/80 bg-white/40'
                        : 'text-slate-400 hover:bg-white/40'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {isScheduledWeek && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[#007AFF] -mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sub-caption */}
            <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-[11px] text-[#8E8E93]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#007AFF]" />
                Active Class Days (17 - 23 Oct)
              </span>
              <span>Wed 19 is Today</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
