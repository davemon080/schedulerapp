import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EventItem } from '../types';
import { Pencil, Trash2, Share2, X, AlertCircle, Copy, Check, Video } from 'lucide-react';

interface EventBottomSheetProps {
  isOpen: boolean;
  event: EventItem | null;
  onClose: () => void;
  onEdit: (event: EventItem) => void;
  onDelete: (eventId: string) => void;
  onTogglePostponed: (eventId: string) => void;
  onShare: (event: EventItem) => void;
  isCourseRep?: boolean;
}

export const EventBottomSheet: React.FC<EventBottomSheetProps> = ({
  isOpen,
  event,
  onClose,
  onEdit,
  onDelete,
  onTogglePostponed,
  onShare,
  isCourseRep = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !event) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(
      `${event.course}: ${event.title}\nTime: ${event.time}\nLocation: ${event.location}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
        {/* Backdrop blur overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/35 backdrop-blur-md"
        />

        {/* Frosted Glass Bottom Sheet Container - immediate responsiveness */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.08, ease: 'easeOut' }}
          className="relative w-full max-w-lg z-10 mx-auto px-3 pb-6 pt-3"
        >
          <div className="glass-container-solid rounded-[32px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-white">
            {/* Grabber Bar / Pull Handle */}
            <div className="w-12 h-1.5 bg-black/20 rounded-full mx-auto mb-4" />

            {/* Header info of selected event */}
            <div className="flex items-start justify-between gap-3 pb-4 mb-2 border-b border-black/5">
              <div>
                <div className="flex items-center gap-2">
                  {event.course && event.course.trim() && event.course.trim().toUpperCase() !== 'OTHER' ? (
                    <span className="text-[12px] font-bold text-[#007AFF] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/50">
                      {event.course}
                    </span>
                  ) : null}
                  {event.isPostponed && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                      Postponed
                    </span>
                  )}
                </div>
                <h4 className="text-[17px] font-bold text-[#1C1C1E] mt-1 tracking-tight">
                  {event.title}
                </h4>
                <p className="text-[12px] text-[#8E8E93] mt-0.5">
                  {event.time} • {event.location}
                </p>
                {event.instructor && (
                  <p className="text-[11.5px] font-medium text-slate-600 mt-1">
                    Lecturer: <span className="font-semibold text-slate-800">{event.instructor}</span>
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                aria-label="Close sheet"
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-500 active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Items List */}
            <div className="space-y-1.5 pt-1">
              {/* Option: Join Online Meeting (If online / meeting link exists) */}
              {(() => {
                const meetingUrl = event.meetingLink?.trim() ||
                  (event.location?.startsWith('http') || event.location?.includes('meet.google.com') || event.location?.includes('zoom.us') || event.location?.includes('teams.microsoft.com') ? event.location.trim() : '') ||
                  (event.notes?.match(/https?:\/\/[^\s]+/)?.[0] || '');

                if (!meetingUrl) return null;

                const targetUrl = meetingUrl.startsWith('http://') || meetingUrl.startsWith('https://') ? meetingUrl : `https://${meetingUrl}`;

                return (
                  <button
                    type="button"
                    onClick={() => {
                      window.open(targetUrl, '_blank', 'noopener,noreferrer');
                      onClose();
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[20px] bg-emerald-50 hover:bg-emerald-100/90 text-left transition-colors cursor-pointer group border border-emerald-300 shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                      <Video className="w-[18px] h-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-bold text-emerald-950 block">
                        Join Online Class
                      </span>
                      <span className="text-[12px] text-emerald-700 block truncate">
                        {targetUrl}
                      </span>
                    </div>
                  </button>
                );
              })()}

              {/* Option: Edit Event (Pencil icon) - Course Rep Only */}
              {isCourseRep && (
                <button
                  onClick={() => {
                    onEdit(event);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[20px] hover:bg-white/90 active:bg-[#007AFF]/10 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 text-[#007AFF] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Pencil className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[15px] font-semibold text-[#1C1C1E] block">
                      Edit Event
                    </span>
                    <span className="text-[12px] text-[#8E8E93] block">
                      Modify time, hall, or tags
                    </span>
                  </div>
                </button>
              )}

              {/* Option: Share (Share icon) */}
              <button
                onClick={() => {
                  onShare(event);
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[20px] hover:bg-white/90 active:bg-[#007AFF]/10 text-left transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Share2 className="w-[18px] h-[18px]" />
                </div>
                <div className="flex-1">
                  <span className="text-[15px] font-semibold text-[#1C1C1E] block">
                    Share
                  </span>
                  <span className="text-[12px] text-[#8E8E93] block">
                    Send timetable details to classmates
                  </span>
                </div>
              </button>

              {/* Quick Action: Copy Details */}
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[20px] hover:bg-white/90 active:bg-[#007AFF]/10 text-left transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-slate-500/10 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {copied ? <Check className="w-[18px] h-[18px] text-emerald-600" /> : <Copy className="w-[18px] h-[18px]" />}
                </div>
                <div className="flex-1">
                  <span className="text-[15px] font-semibold text-[#1C1C1E] block">
                    {copied ? 'Copied to Clipboard!' : 'Copy Info'}
                  </span>
                  <span className="text-[12px] text-[#8E8E93] block">
                    Copy lecture venue & time to clipboard
                  </span>
                </div>
              </button>

              {/* Toggle Postponed State - Course Rep Only */}
              {isCourseRep && (
                <button
                  onClick={() => {
                    onTogglePostponed(event.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[20px] hover:bg-white/90 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <AlertCircle className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[15px] font-semibold text-[#1C1C1E] block">
                      {event.isPostponed ? 'Mark as Confirmed / Active' : 'Mark as Postponed'}
                    </span>
                    <span className="text-[12px] text-[#8E8E93] block">
                      Update status badge for class members
                    </span>
                  </div>
                </button>
              )}

              {/* Option: Delete Event (Trash icon) - Course Rep Only */}
              {isCourseRep && (
                <button
                  onClick={() => {
                    onDelete(event.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[20px] hover:bg-red-50/80 active:bg-red-100 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-full bg-red-500/10 text-[#FF3B30] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Trash2 className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[15px] font-semibold text-[#FF3B30] block">
                      Delete Event
                    </span>
                    <span className="text-[12px] text-red-400 block">
                      Remove from schedule
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
