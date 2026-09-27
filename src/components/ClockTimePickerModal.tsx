import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Clock, Plus, Minus, ArrowRight } from 'lucide-react';

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
  const parsedH = parseInt(parts[0], 10);
  let h = isNaN(parsedH) ? 8 : parsedH;
  let m = parseInt(parts[1], 10) || 0;
  m = Math.min(59, Math.max(0, m));

  if (is12hPM || is12hAM) {
    const isPM = is12hPM;
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return { hour12, minute: m, isPM };
  } else {
    // 24h format e.g. "14:00" or "08:30:00"
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

// Compute difference in minutes between start and end
function getDurationMinutes(startH12: number, startM: number, startPM: boolean, endH12: number, endM: number, endPM: boolean): number {
  let sH = startH12;
  if (startPM && sH < 12) sH += 12;
  if (!startPM && sH === 12) sH = 0;
  const sTotal = sH * 60 + startM;

  let eH = endH12;
  if (endPM && eH < 12) eH += 12;
  if (!endPM && eH === 12) eH = 0;
  const eTotal = eH * 60 + endM;

  let diff = eTotal - sTotal;
  if (diff < 0) diff += 24 * 60; // wraps past midnight
  return diff;
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
  { label: '02:00 PM', time: '02:00 PM' },
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

  const clockDialRef = React.useRef<HTMLDivElement>(null);

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

  // Helper to ensure end time stays at least equal to or after start time
  const autoAdjustEndTimeIfBehind = (newStartH12: number, newStartM: number, newStartPM: boolean) => {
    let sH = newStartH12;
    if (newStartPM && sH < 12) sH += 12;
    if (!newStartPM && sH === 12) sH = 0;
    const sTotal = sH * 60 + newStartM;

    let eH = endHour12;
    if (endIsPM && eH < 12) eH += 12;
    if (!endIsPM && eH === 12) eH = 0;
    const eTotal = eH * 60 + endMinute;

    // If current end time is <= start time, advance end time to start + 2 hours
    if (eTotal <= sTotal) {
      const nextTotal = (sTotal + 120) % (24 * 60);
      const nextH24 = Math.floor(nextTotal / 60);
      const nextM = nextTotal % 60;
      const nextPM = nextH24 >= 12;
      const nextH12 = nextH24 % 12 === 0 ? 12 : nextH24 % 12;

      setEndHour12(nextH12);
      setEndMinute(nextM);
      setEndIsPM(nextPM);
    }
  };

  const setCurrentHour12 = (h: number) => {
    const validH = Math.min(12, Math.max(1, h));
    if (activeTarget === 'start') {
      setStartHour12(validH);
      autoAdjustEndTimeIfBehind(validH, startMinute, startIsPM);
    } else {
      setEndHour12(validH);
    }
    setActiveView('minute');
  };

  const handleNativeTimeChange = (time24: string) => {
    if (!time24 || !time24.includes(':')) return;
    const [hStr, mStr] = time24.split(':');
    const h24 = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    if (isNaN(h24)) return;
    const isPM = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    if (activeTarget === 'start') {
      setStartHour12(h12);
      setStartMinute(m);
      setStartIsPM(isPM);
      autoAdjustEndTimeIfBehind(h12, m, isPM);
    } else {
      setEndHour12(h12);
      setEndMinute(m);
      setEndIsPM(isPM);
    }
  };

  const setCurrentMinute = (m: number) => {
    const validM = Math.min(59, Math.max(0, m));
    if (activeTarget === 'start') {
      setStartMinute(validM);
      autoAdjustEndTimeIfBehind(startHour12, validM, startIsPM);
    } else {
      setEndMinute(validM);
    }
  };

  const setCurrentIsPM = (pm: boolean) => {
    if (activeTarget === 'start') {
      setStartIsPM(pm);
      autoAdjustEndTimeIfBehind(startHour12, startMinute, pm);
    } else {
      setEndIsPM(pm);
    }
  };

  // Fine-tune minute adjustments (+1, -1, +5, -5)
  const adjustMinute = (delta: number) => {
    let nextM = currentMinute + delta;
    if (nextM >= 60) nextM = nextM % 60;
    else if (nextM < 0) nextM = (nextM + 60) % 60;
    setCurrentMinute(nextM);
  };

  // Adjust hour (+1, -1)
  const adjustHour = (delta: number) => {
    let nextH = currentHour12 + delta;
    if (nextH > 12) nextH = 1;
    else if (nextH < 1) nextH = 12;
    setCurrentHour12(nextH);
  };

  // Quick Duration Setter (e.g. +1h, +2h, +3h from start time)
  const setDurationFromStart = (hours: number, minutes = 0) => {
    let sH = startHour12;
    if (startIsPM && sH < 12) sH += 12;
    if (!startIsPM && sH === 12) sH = 0;
    const totalStartM = sH * 60 + startMinute;
    const totalEndM = (totalStartM + hours * 60 + minutes) % (24 * 60);

    const endH24 = Math.floor(totalEndM / 60);
    const endM = totalEndM % 60;
    const endPM = endH24 >= 12;
    const endH12 = endH24 % 12 === 0 ? 12 : endH24 % 12;

    setEndHour12(endH12);
    setEndMinute(endM);
    setEndIsPM(endPM);
  };

  // Dial click/tap handler: maps any point clicked on dial to angle & hour/minute
  const handleDialClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!clockDialRef.current) return;
    const rect = clockDialRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);

    // Calculate angle in degrees (0 at top 12 o'clock, clockwise)
    const angleRad = Math.atan2(dy, dx);
    let angleDeg = (angleRad * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;

    if (activeView === 'hour') {
      let h = Math.round(angleDeg / 30);
      if (h === 0) h = 12;
      if (h > 12) h = 12;
      setCurrentHour12(h);
    } else {
      let m = Math.round(angleDeg / 6) % 60;
      setCurrentMinute(m);
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

  // Clock Hand Angle
  const clockAngle = activeView === 'hour'
    ? (currentHour12 % 12) * 30
    : currentMinute * 6;

  const durationMins = getDurationMinutes(startHour12, startMinute, startIsPM, endHour12, endMinute, endIsPM);
  const durationHours = Math.floor(durationMins / 60);
  const durationRemainM = durationMins % 60;
  const durationText = `${durationHours > 0 ? `${durationHours}h ` : ''}${durationRemainM > 0 ? `${durationRemainM}m` : durationHours === 0 ? '0m' : ''}`.trim();

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 pointer-events-auto"
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
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          className="relative w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-[32px] p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-white/80 z-10 text-slate-900 max-h-[92vh] overflow-y-auto no-scrollbar"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-black/5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#007AFF] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">
                {title || (isSingleTime ? 'Select Due Time' : 'Select Class Time')}
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
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/90 rounded-2xl mb-3 border border-black/5">
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

          {/* Live Scheduled Banner */}
          {!isSingleTime && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/50 mb-3 text-[12px] font-semibold text-blue-900">
              <div className="flex items-center gap-1.5">
                <span>{formatToDisplay12h(startHour12, startMinute, startIsPM)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>{formatToDisplay12h(endHour12, endMinute, endIsPM)}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                {durationText}
              </span>
            </div>
          )}

          {/* Big Digital Display with Direct Steppers */}
          <div className="flex items-center justify-center gap-2 mb-3 bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80">
            {/* Hour Selector */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => adjustHour(1)}
                className="w-8 h-5 rounded bg-white hover:bg-slate-200 border border-black/5 flex items-center justify-center text-slate-600 text-[10px] cursor-pointer mb-0.5"
                title="Increase Hour"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveView('hour')}
                className={`w-14 py-1.5 rounded-xl text-[26px] font-extrabold tracking-tight transition-all cursor-pointer text-center ${
                  activeView === 'hour'
                    ? 'bg-[#007AFF] text-white shadow-md scale-105'
                    : 'bg-white text-[#1C1C1E] border border-black/5 hover:bg-white/80'
                }`}
              >
                {currentHour12.toString().padStart(2, '0')}
              </button>
              <button
                type="button"
                onClick={() => adjustHour(-1)}
                className="w-8 h-5 rounded bg-white hover:bg-slate-200 border border-black/5 flex items-center justify-center text-slate-600 text-[10px] cursor-pointer mt-0.5"
                title="Decrease Hour"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-semibold uppercase text-slate-400 mt-0.5">Hour</span>
            </div>

            <span className="text-[26px] font-bold text-slate-400 -mt-5">:</span>

            {/* Minute Selector */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => adjustMinute(5)}
                className="w-8 h-5 rounded bg-white hover:bg-slate-200 border border-black/5 flex items-center justify-center text-slate-600 text-[10px] cursor-pointer mb-0.5"
                title="Increase 5 Minutes"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveView('minute')}
                className={`w-14 py-1.5 rounded-xl text-[26px] font-extrabold tracking-tight transition-all cursor-pointer text-center ${
                  activeView === 'minute'
                    ? 'bg-[#007AFF] text-white shadow-md scale-105'
                    : 'bg-white text-[#1C1C1E] border border-black/5 hover:bg-white/80'
                }`}
              >
                {currentMinute.toString().padStart(2, '0')}
              </button>
              <button
                type="button"
                onClick={() => adjustMinute(-5)}
                className="w-8 h-5 rounded bg-white hover:bg-slate-200 border border-black/5 flex items-center justify-center text-slate-600 text-[10px] cursor-pointer mt-0.5"
                title="Decrease 5 Minutes"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-semibold uppercase text-slate-400 mt-0.5">Minute</span>
            </div>

            {/* AM / PM Block */}
            <div className="flex flex-col gap-1.5 ml-2 -mt-4">
              <button
                type="button"
                onClick={() => setCurrentIsPM(false)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
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
          <div
            ref={clockDialRef}
            onClick={handleDialClick}
            className="relative w-52 h-52 mx-auto mb-3 rounded-full bg-slate-50 border-2 border-slate-200/80 shadow-inner flex items-center justify-center select-none cursor-pointer"
          >
            {/* Center Pivot Point */}
            <div className="absolute w-3.5 h-3.5 rounded-full bg-[#007AFF] z-20 shadow-xs pointer-events-none" />

            {/* Clock Hand */}
            <div
              className="absolute top-1/2 left-1/2 origin-top w-0.5 bg-[#007AFF] z-10 pointer-events-none transition-transform duration-150"
              style={{
                height: '70px',
                transform: `rotate(${clockAngle + 180}deg) translateX(-50%)`,
              }}
            >
              <div className="absolute -bottom-3.5 -left-3 w-7 h-7 rounded-full bg-[#007AFF]/25 border-2 border-[#007AFF] flex items-center justify-center shadow-xs">
                <div className="w-2 h-2 rounded-full bg-[#007AFF]" />
              </div>
            </div>

            {/* Hours Mode */}
            {activeView === 'hour' && (
              <>
                {HOURS.map((h, i) => {
                  const angleRad = ((i * 30 - 90) * Math.PI) / 180;
                  const radius = 74;
                  const x = radius * Math.cos(angleRad);
                  const y = radius * Math.sin(angleRad);
                  const isSelected = currentHour12 === h;

                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentHour12(h);
                      }}
                      style={{
                        left: '50%',
                        top: '50%',
                        marginLeft: '-14px',
                        marginTop: '-14px',
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                      className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-[12.5px] font-bold transition-all cursor-pointer z-15 ${
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
                  const radius = 74;
                  const x = radius * Math.cos(angleRad);
                  const y = radius * Math.sin(angleRad);
                  const isSelected = currentMinute === m;

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentMinute(m);
                      }}
                      style={{
                        left: '50%',
                        top: '50%',
                        marginLeft: '-14px',
                        marginTop: '-14px',
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                      className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-[11.5px] font-bold transition-all cursor-pointer z-15 ${
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

          {/* Quick Minute Fine-Tuning Bar */}
          <div className="flex items-center justify-center gap-1.5 mb-2.5 bg-slate-100/80 p-1.5 rounded-xl border border-black/5">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Fine-tune:</span>
            {[-5, -1, 1, 5].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => adjustMinute(delta)}
                className="px-2 py-0.5 rounded-lg bg-white hover:bg-blue-50 hover:text-[#007AFF] text-slate-700 text-[11px] font-bold border border-black/5 transition-colors cursor-pointer"
              >
                {delta > 0 ? `+${delta}m` : `${delta}m`}
              </button>
            ))}
            <div className="w-px h-4 bg-slate-300 mx-0.5" />
            {[0, 15, 30, 45].map((presetM) => (
              <button
                key={presetM}
                type="button"
                onClick={() => setCurrentMinute(presetM)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  currentMinute === presetM
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                :{presetM.toString().padStart(2, '0')}
              </button>
            ))}
          </div>

          {/* Switch to End Time Action Banner (When in start mode) */}
          {!isSingleTime && activeTarget === 'start' && (
            <button
              type="button"
              onClick={() => {
                setActiveTarget('end');
                setActiveView('hour');
              }}
              className="w-full mb-2.5 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#007AFF] text-[12px] font-bold border border-blue-200/60 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Now set End Time for this class</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Duration Quick Helpers (when setting start/end) */}
          {!isSingleTime && (
            <div className="flex items-center justify-center gap-1.5 mb-2.5">
              <span className="text-[11px] font-bold text-slate-400">Duration:</span>
              {[
                { label: '1 hr', h: 1 },
                { label: '1.5 hrs', h: 1, m: 30 },
                { label: '2 hrs', h: 2 },
                { label: '3 hrs', h: 3 },
              ].map((dur) => (
                <button
                  key={dur.label}
                  type="button"
                  onClick={() => setDurationFromStart(dur.h, dur.m || 0)}
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#007AFF] hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200/50"
                >
                  +{dur.label}
                </button>
              ))}
            </div>
          )}

          {/* Standard Class Presets */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
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
          <div className="flex items-center gap-2 pt-2 border-t border-black/5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-[1.5] py-2.5 px-3 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white text-[13px] font-bold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {isSingleTime
                  ? `Set ${formatToDisplay12h(startHour12, startMinute, startIsPM)}`
                  : `Apply ${formatToDisplay12h(startHour12, startMinute, startIsPM)} - ${formatToDisplay12h(endHour12, endMinute, endIsPM)}`}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
