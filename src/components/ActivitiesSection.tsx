import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EventItem } from '../types';
import { Clock, MapPin, Eye, MoreVertical, AlertCircle, BookOpen } from 'lucide-react';
import { ActivitiesSkeleton } from './Skeletons';

interface ActivitiesSectionProps {
  events: EventItem[];
  selectedDayName: string;
  onOpenMenu: (event: EventItem) => void;
  onSelectCard?: (event: EventItem) => void;
  isLoading?: boolean;
}

export const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({
  events,
  selectedDayName,
  onOpenMenu,
  onSelectCard,
  isLoading = false,
}) => {
  if (isLoading) {
    return <ActivitiesSkeleton />;
  }

  return (
    <section className="space-y-4">
      {/* Title & Subtitle Section */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between px-1 gap-1">
        <div>
          <h2 className="text-[22px] font-bold text-[#1C1C1E] tracking-tight">
            Today's Activities
          </h2>
          <p className="text-[14px] text-[#8E8E93] font-normal">
            {events.length} scheduled event{events.length === 1 ? '' : 's'} {selectedDayName === 'WED 19' ? 'today' : `for ${selectedDayName}`}
          </p>
        </div>
        <span className="text-[12px] font-semibold text-[#007AFF] bg-blue-50/80 px-2.5 py-1 rounded-full border border-blue-200/50 self-start sm:self-auto backdrop-blur-xs">
          Academic Timetable
        </span>
      </div>

      {/* Activity Cards List with Entry & Exit Animations */}
      <div className="space-y-3.5 min-h-[140px] relative">
        <AnimatePresence mode="popLayout">
          {events.length === 0 ? (
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
            events.map((event, index) => (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -14, scale: 0.97 }}
                transition={{
                  duration: 0.28,
                  delay: index * 0.05,
                  ease: [0.21, 0.85, 0.36, 1],
                }}
                onClick={() => onSelectCard?.(event)}
                className="glass-container rounded-[26px] sm:rounded-[28px] p-5 sm:p-6 transition-colors duration-200 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:border-white relative group cursor-pointer"
              >
                {/* Top Row: Course Code + Postponed Badge + Vertical Three-Dot Action Menu */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Course Code Tag */}
                    <span className="px-3 py-1 rounded-full text-[13px] font-bold tracking-tight bg-[#007AFF]/10 text-[#007AFF] border border-blue-400/20">
                      {event.course}
                    </span>

                    {/* "Postponed" Badge with soft orange outline */}
                    {event.isPostponed && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight text-amber-800 bg-amber-50/80 border border-amber-400/70 shadow-xs">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        Postponed
                      </span>
                    )}
                  </div>

                  {/* Single Vertical Three-Dot Menu Icon */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMenu(event);
                    }}
                    aria-label="Event options menu"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-black/5 active:scale-95 transition-all -mr-1 -mt-1 cursor-pointer"
                  >
                    <MoreVertical className="w-[18px] h-[18px]" />
                  </button>
                </div>

                {/* Title */}
                <h3 className="text-[19px] font-bold text-[#1C1C1E] tracking-tight leading-snug mb-3">
                  {event.title}
                </h3>

                {/* Time & Location Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-[13px] text-[#8E8E93]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#007AFF] shrink-0" />
                    <span className="font-medium text-[#1C1C1E]/80">{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#8E8E93] shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>

                {/* Bottom Row: Tags & Views Counter */}
                <div className="flex items-center justify-between pt-3 border-t border-black/5 flex-wrap gap-2">
                  {/* Tags ("Tutorial", "Physical Class") */}
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

                  {/* Views Counter ("22 views") */}
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#8E8E93]">
                    <Eye className="w-3.5 h-3.5 text-[#8E8E93]" />
                    <span>{event.views}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
