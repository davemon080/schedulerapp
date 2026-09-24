import React, { useState } from 'react';
import { Timer, Play, Pause, RotateCcw, Volume2, X, CheckCircle2 } from 'lucide-react';
import { playChime } from '../utils/audio';

interface FocusTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  secondsRemaining: number;
  isActive: boolean;
  onToggle: () => void;
  onReset: (newDuration?: number) => void;
  sessionsCompleted: number;
}

export const FocusTimerModal: React.FC<FocusTimerModalProps> = ({
  isOpen,
  onClose,
  secondsRemaining,
  isActive,
  onToggle,
  onReset,
  sessionsCompleted
}) => {
  if (!isOpen) return null;

  const [selectedDuration, setSelectedDuration] = useState<number>(25 * 60);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const setTimerMode = (minutes: number) => {
    const duration = minutes * 60;
    setSelectedDuration(duration);
    onReset(duration);
  };

  const handleTestSound = () => {
    playChime('complete');
  };

  const progressPercent = selectedDuration > 0
    ? Math.round(((selectedDuration - secondsRemaining) / selectedDuration) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Deep Work Focus Timer
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Modes */}
        <div className="grid grid-cols-3 gap-2 my-4">
          <button
            onClick={() => setTimerMode(25)}
            className={`py-1.5 px-2 text-xs font-mono rounded-lg border transition-colors ${
              selectedDuration === 25 * 60
                ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300 font-semibold'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
            }`}
          >
            25m Sprint
          </button>
          <button
            onClick={() => setTimerMode(50)}
            className={`py-1.5 px-2 text-xs font-mono rounded-lg border transition-colors ${
              selectedDuration === 50 * 60
                ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300 font-semibold'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
            }`}
          >
            50m Deep
          </button>
          <button
            onClick={() => setTimerMode(5)}
            className={`py-1.5 px-2 text-xs font-mono rounded-lg border transition-colors ${
              selectedDuration === 5 * 60
                ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300 font-semibold'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
            }`}
          >
            5m Rest
          </button>
        </div>

        {/* Timer Ring & Display */}
        <div className="py-6 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 rounded-full border border-neutral-800 flex items-center justify-center bg-neutral-950/60 shadow-inner">
            <div
              className="absolute inset-1 rounded-full border-2 border-indigo-500/20"
              style={{
                background: `conic-gradient(#6366f1 ${progressPercent * 3.6}deg, transparent 0deg)`
              }}
            />
            <div className="relative z-10 flex flex-col items-center">
              <span className="font-mono text-4xl font-bold tracking-tight text-white tabular-nums">
                {formatTime(secondsRemaining)}
              </span>
              <span className="text-[11px] font-mono text-neutral-400 mt-1 uppercase tracking-wider">
                {isActive ? 'In Deep Flow' : 'Paused'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Session</span>
              </>
            )}
          </button>

          <button
            onClick={() => onReset(selectedDuration)}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors"
            title="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleTestSound}
            className="p-2 text-neutral-400 hover:text-indigo-300 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors"
            title="Test Chime Sound"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* Sessions Completed Stat */}
        <div className="mt-5 pt-3 border-t border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{sessionsCompleted} focus sessions logged today</span>
        </div>
      </div>
    </div>
  );
};
