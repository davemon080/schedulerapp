import React from 'react';
import { Plus, Timer, Download, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'board' | 'canvas' | 'docs' | 'analytics' | 'assets';
  setActiveTab: (tab: 'board' | 'canvas' | 'docs' | 'analytics' | 'assets') => void;
  onOpenNewTask: () => void;
  timerActive: boolean;
  timerSeconds: number;
  onToggleTimer: () => void;
  onExportData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTask,
  timerActive,
  timerSeconds,
  onToggleTimer,
  onExportData
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-6 flex items-center justify-between">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); setActiveTab('board'); }}
          className="text-lg font-bold tracking-tight text-white hover:text-indigo-300 transition-colors"
        >
          Verve Studio
        </a>
        <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-400 pl-3 border-l border-neutral-800">
          <span>Sprint 14</span>
          <span aria-hidden="true">·</span>
          <span>Week 3</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1 text-emerald-400 font-mono tabular-nums">
            <CheckCircle2 className="w-3.5 h-3.5" />
            72% Complete
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab('board')}
          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'board'
              ? 'text-white bg-neutral-900 border border-neutral-700/80 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
          }`}
        >
          Sprint Board
        </button>
        <button
          onClick={() => setActiveTab('canvas')}
          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'canvas'
              ? 'text-white bg-neutral-900 border border-neutral-700/80 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
          }`}
        >
          Canvas Studio
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'docs'
              ? 'text-white bg-neutral-900 border border-neutral-700/80 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
          }`}
        >
          Specs & Docs
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'text-white bg-neutral-900 border border-neutral-700/80 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
          }`}
        >
          Sprint Velocity
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'assets'
              ? 'text-white bg-neutral-900 border border-neutral-700/80 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
          }`}
        >
          Asset Gallery
        </button>
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleTimer}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            timerActive
              ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
          }`}
          title="Toggle Deep Work Focus Timer"
        >
          <Timer className={`w-3.5 h-3.5 ${timerActive ? 'animate-pulse text-indigo-400' : 'text-neutral-400'}`} />
          <span className="font-mono tabular-nums">{formatTime(timerSeconds)}</span>
        </button>

        <button
          onClick={onExportData}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors"
          title="Export Workspace JSON"
        >
          <Download className="w-3.5 h-3.5 text-neutral-400" />
          <span className="hidden xl:inline">Export</span>
        </button>

        <button
          onClick={onOpenNewTask}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>
    </header>
  );
};
