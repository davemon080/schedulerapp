import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Clock } from 'lucide-react';

interface ClockTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStartTime?: string; // '08:00' or '11:59 PM'
  initialEndTime?: string;   // '10:00'
  initialActiveTarget?: 'start' | 'end';
  title?: string;
  isSingleTime?: boolean;
  zIndex?: number;
  onSave?: (startTime: string, endTime: string) => void;
  onSaveSingle?: (formatted12h: string, formatted24h: string) => void;
}

// Convert string ('HH:mm', 'hh:mm AM/PM') into { hour12: number, minute: number, isPM: boolean }
function parseTimeToComponents(timeStr: string) {
  if (!timeStr) return { hour12: 8, minute: 0, isPM: false };
  const upper = timeStr.trim().toUpperCase();
  const is12hPM = upper.includes('PM');
  const is12hAM = upper.includes('AM');

  const clean = upper.replace(/[AP]M/g, '').trim();
  const parts = clean.split(':');
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10) || 0;
  if (isNaN(h)) h = 8;
  if (isNaN(m)) m = 0;

  if (is12hPM || is12hAM) {
    const isPM = is12hPM;
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return { hour12, minute: m, isPM };
  } else {
    // 24h format
    const isPM = h >= 12;
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return { hour12, minute: m, isPM };
  }
}

// Convert components into 'HH:mm' (24h)
function formatComponentsTo24h(hour12: number, minute: number, isPM: boolean): string {
  let h = hour12;
  if (isPM && h < 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// Format to 'hh:mm AM/PM' for display
function formatToDisplay12h(hour12: number, minute: number, isPM: boolean): string {
  const ampm = isPM ? 'PM' : 'AM';
  return `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const QUICK_PRESETS = [
  { label: '8 - 10 AM', start: '08:00', end: '10:00' },
  { label: '10 - 12 PM', start: '10:00', end: '12:00' },
  { label: '12 - 2 PM', start: '12:00', end: '14:00' },
  { label: '2 - 4 PM', start: '14:00', end: '16:00' },
  { label: '4 - 6 PM', start: '16:00', end: '18:00' },
];

const SINGLE_PRESETS = [
  { label: '09:00 AM', time: '09:00 AM' },
  { label: '12:00 PM', time: '12:00 PM' },
  { label: '04:00 PM', time: '04:00 PM' },
  { label: '06:00 PM', time: '06:00 PM' },
  { label: '11:59 PM', time: '11:59 PM' },
];

export const ClockTimePickerModal: React.FC<ClockTimePickerModalProps> = ({
  isOpen,
  onClose,
  initialStartTime = '08:00',
  initialEndTime = '10:00',
  initialActiveTarget = 'start',
  title,
  isSingleTime = false,
  zIndex = 50,
  onSave,
  onSaveSingle,
}) => {
  const [activeTarget, setActiveTarget] = useState<'start' | 'end'>(initialActiveTarget);
  const [activeView, setActiveView] = useState<'hour' | 'minute'>('hour');

  // Start time state
  const [startHour12, setStartHour12] = useState(8);
  const [startMinute, setStartMinute] = useState(0);
  const [startIsPM, setStartIsPM] = useState(false);

  // End time state
  const [endHour12, setEndHour12] = useState(10);
  const [endMinute, setEndMinute] = useState(0);
  const [endIsPM, setEndIsPM] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const s = parseTimeToComponents(initialStartTime || '08:00');
      setStartHour12(s.hour12);
      setStartMinute(s.minute);
      setStartIsPM(s.isPM);

      const e = parseTimeToComponents(initialEndTime || '10:00');
      setEndHour12(e.hour12);
      setEndMinute(e.minute);
      setEndIsPM(e.isPM);

      setActiveTarget(initialActiveTarget);
      setActiveView('hour');
    }
  }, [isOpen, initialStartTime, initialEndTime, initialActiveTarget]);

  if (!isOpen) return null;

  // Active getters and setters
  const currentHour12 = activeTarget === 'start' ? startHour12 : endHour12;
  const currentMinute = activeTarget === 'start' ? startMinute : endMinute;
  const currentIsPM = activeTarget === 'start' ? startIsPM : endIsPM;

  const setCurrentHour12 = (h: number) => {
    if (activeTarget === 'start') {
      setStartHour12(h);
    } else {
      setEndHour12(h);
    }
    // Auto-advance to minute selector
    setActiveView('minute');
  };

  const setCurrentMinute = (m: number) => {
    if (activeTarget === 'start') {
      setStartMinute(m);
    } else {
      setEndMinute(m);
    }
  };

  const setCurrentIsPM = (pm: boolean) => {
    if (activeTarget === 'start') {
      setStartIsPM(pm);
    } else {
      setEndIsPM(pm);
    }
  };

  const handleApply = () => {
    const finalStart = formatComponentsTo24h(startHour12, startMinute, startIsPM);
    const finalEnd = formatComponentsTo24h(endHour12, endMinute, endIsPM);
    const display12h = formatToDisplay12h(startHour12, startMinute, startIsPM);
    
    if (isSingleTime && onSaveSingle) {
      onSaveSingle(display12h, finalStart);
    } else if (onSave) {
      onSave(finalStart, finalEnd);
    }
    onClose();
  };

  // Clock Hand Calculation
  // 360 degrees circle
  const clockAngle = activeView === 'hour'
    ? (currentHour12 % 12) * 30
    : currentMinute * 6;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-auto"
        style={{ zIndex }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          className="relative w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-[32px] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-white/80 z-10 text-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-black/5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#007AFF] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">
                {title || (isSingleTime ? 'Select Due Time' : 'Select Activity Time')}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Start vs End Time Mode Switcher (Hidden in single-time mode) */}
          {!isSingleTime && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/90 rounded-2xl mb-4 border border-black/5">
              <button
                type="button"
                onClick={() => {
                  setActiveTarget('start');
                  setActiveView('hour');
                }}
                className={`py-2 px-3 rounded-[14px] text-center transition-all cursor-pointer ${
                  activeTarget === 'start'
                    ? 'bg-white text-[#007AFF] font-bold shadow-xs'
                    : 'text-slate-600 font-medium hover:text-slate-900'
                }`}
              >
                <span className="text-[11px] block uppercase font-semibold text-slate-400">Start Time</span>
                <span className="text-[14px] font-extrabold">{formatToDisplay12h(startHour12, startMinute, startIsPM)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTarget('end');
                  setActiveView('hour');
                }}
                className={`py-2 px-3 rounded-[14px] text-center transition-all cursor-pointer ${
                  activeTarget === 'end'
                    ? 'bg-white text-[#007AFF] font-bold shadow-xs'
                    : 'text-slate-600 font-medium hover:text-slate-900'
                }`}
              >
                <span className="text-[11px] block uppercase font-semibold text-slate-400">End Time</span>
                <span className="text-[14px] font-extrabold">{formatToDisplay12h(endHour12, endMinute, endIsPM)}</span>
              </button>
            </div>
          )}

          {/* Big Digital Display with Hour / Minute / AM / PM Selectors */}
          <div className="flex items-center justify-center gap-2 mb-4 bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
            {/* Hour Block */}
            <button
              type="button"
              onClick={() => setActiveView('hour')}
              className={`px-4 py-2 rounded-xl text-[28px] font-extrabold tracking-tight transition-all cursor-pointer ${
                activeView === 'hour'
                  ? 'bg-[#007AFF] text-white shadow-md scale-105'
                  : 'bg-white text-[#1C1C1E] border border-black/5 hover:bg-white/80'
              }`}
            >
              {currentHour12.toString().padStart(2, '0')}
            </button>

            <span className="text-[26px] font-bold text-slate-400">:</span>

            {/* Minute Block */}
            <button
              type="button"
              onClick={() => setActiveView('minute')}
              className={`px-4 py-2 rounded-xl text-[28px] font-extrabold tracking-tight transition-all cursor-pointer ${
                activeView === 'minute'
                  ? 'bg-[#007AFF] text-white shadow-md scale-105'
                  : 'bg-white text-[#1C1C1E] border border-black/5 hover:bg-white/80'
              }`}
            >
              {currentMinute.toString().padStart(2, '0')}
            </button>

            {/* AM / PM Block */}
            <div className="flex flex-col gap-1 ml-2">
              <button
                type="button"
                onClick={() => setCurrentIsPM(false)}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                  !currentIsPM
                    ? 'bg-[#007AFF] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-black/5'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setCurrentIsPM(true)}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                  currentIsPM
                    ? 'bg-[#007AFF] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-black/5'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Interactive Circular Clock Face */}
          <div className="relative w-56 h-56 mx-auto mb-4 rounded-full bg-slate-50 border-2 border-slate-200/80 shadow-inner flex items-center justify-center select-none">
            {/* Center Pivot Point */}
            <div className="absolute w-3.5 h-3.5 rounded-full bg-[#007AFF] z-20 shadow-xs" />

            {/* Clock Hand */}
            <div
              className="absolute top-1/2 left-1/2 origin-top w-0.5 bg-[#007AFF] z-10 pointer-events-none transition-transform duration-200"
              style={{
                height: '76px',
                transform: `rotate(${clockAngle + 180}deg) translateX(-50%)`,
              }}
            >
              {/* Hand Circle Tip */}
              <div className="absolute -bottom-4 -left-3.5 w-8 h-8 rounded-full bg-[#007AFF]/25 border-2 border-[#007AFF] flex items-center justify-center shadow-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-[#007AFF]" />
              </div>
            </div>

            {/* Hours Mode */}
            {activeView === 'hour' && (
              <>
                {HOURS.map((h, i) => {
                  // Angle for hour: 12 is top (0 deg / -90 deg in cartesian)
                  const angleRad = ((i * 30 - 90) * Math.PI) / 180;
                  const radius = 82; // Distance from center in px
                  const x = radius * Math.cos(angleRad);
                  const y = radius * Math.sin(angleRad);
                  const isSelected = currentHour12 === h;

                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setCurrentHour12(h)}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                      className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all cursor-pointer z-15 ${
                        isSelected
                          ? 'bg-[#007AFF] text-white shadow-md scale-110'
                          : 'text-slate-700 hover:bg-blue-100/60 hover:text-[#007AFF]'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </>
            )}

            {/* Minutes Mode */}
            {activeView === 'minute' && (
              <>
                {MINUTES.map((m, i) => {
                  const angleRad = ((i * 30 - 90) * Math.PI) / 180;
                  const radius = 82;
                  const x = radius * Math.cos(angleRad);
                  const y = radius * Math.sin(angleRad);
                  const isSelected = currentMinute === m;

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCurrentMinute(m)}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                      className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all cursor-pointer z-15 ${
                        isSelected
                          ? 'bg-[#007AFF] text-white shadow-md scale-110'
                          : 'text-slate-700 hover:bg-blue-100/60 hover:text-[#007AFF]'
                      }`}
                    >
                      {m.toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
            {isSingleTime ? (
              SINGLE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const s = parseTimeToComponents(p.time);
                    setStartHour12(s.hour12);
                    setStartMinute(s.minute);
                    setStartIsPM(s.isPM);
                  }}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-[#007AFF] text-slate-700 transition-colors cursor-pointer border border-black/5"
                >
                  {p.label}
                </button>
              ))
            ) : (
              QUICK_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const s = parseTimeToComponents(p.start);
                    const e = parseTimeToComponents(p.end);
                    setStartHour12(s.hour12);
                    setStartMinute(s.minute);
                    setStartIsPM(s.isPM);
                    setEndHour12(e.hour12);
                    setEndMinute(e.minute);
                    setEndIsPM(e.isPM);
                  }}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1 border-t border-black/5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13.5px] font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 py-2.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white text-[13.5px] font-bold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Set Time
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
