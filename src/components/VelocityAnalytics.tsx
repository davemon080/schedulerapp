import React from 'react';
import { Task, TeamMember } from '../types';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  BarChart3,
  Calendar
} from 'lucide-react';

interface VelocityAnalyticsProps {
  tasks: Task[];
  members: TeamMember[];
}

export const VelocityAnalytics: React.FC<VelocityAnalyticsProps> = ({ tasks, members }) => {
  // Aggregate stats
  const totalPoints = tasks.reduce((sum, t) => sum + (t.points || 0), 0);
  const completedPoints = tasks
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.points || 0), 0);
  const inFlightPoints = tasks
    .filter((t) => t.status === 'in_progress' || t.status === 'in_review')
    .reduce((sum, t) => sum + (t.points || 0), 0);
  const backlogPoints = tasks
    .filter((t) => t.status === 'backlog')
    .reduce((sum, t) => sum + (t.points || 0), 0);

  const completionPercentage = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  // Velocity per team member
  const memberStats = members.map((member) => {
    const memberTasks = tasks.filter((t) => t.assignee.name === member.name);
    const memberTotalPts = memberTasks.reduce((s, t) => s + (t.points || 0), 0);
    const memberDonePts = memberTasks
      .filter((t) => t.status === 'completed')
      .reduce((s, t) => s + (t.points || 0), 0);
    return {
      ...member,
      totalPts: memberTotalPts,
      donePts: memberDonePts,
      completionRate: memberTotalPts > 0 ? Math.round((memberDonePts / memberTotalPts) * 100) : 0,
      tasksCount: memberTasks.length
    };
  });

  // Priorities breakdown
  const prioritiesCount = {
    urgent: tasks.filter((t) => t.priority === 'urgent').length,
    high: tasks.filter((t) => t.priority === 'high').length,
    medium: tasks.filter((t) => t.priority === 'medium').length,
    low: tasks.filter((t) => t.priority === 'low').length
  };

  // Burndown chart data points for 10 sprint days
  const burndownData = [
    { day: 'Day 1', ideal: 26, actual: 26 },
    { day: 'Day 2', ideal: 23, actual: 25 },
    { day: 'Day 3', ideal: 20, actual: 22 },
    { day: 'Day 4', ideal: 17, actual: 18 },
    { day: 'Day 5', ideal: 14, actual: 15 },
    { day: 'Day 6', ideal: 11, actual: 10 },
    { day: 'Day 7', ideal: 8, actual: Math.max(0, totalPoints - completedPoints) },
    { day: 'Day 8', ideal: 5, actual: null },
    { day: 'Day 9', ideal: 2, actual: null },
    { day: 'Day 10', ideal: 0, actual: null }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-neutral-950">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400">
                Sprint 14 Performance
              </span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-400 font-mono">Sep 15 – Sep 29, 2026</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Velocity & Capacity Analytics
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
              Health Status: <span className="text-emerald-400 font-semibold">On Track</span>
            </div>
          </div>
        </div>

        {/* 4 Key Metric Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">Committed Points</span>
              <Award className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {totalPoints} <span className="text-xs font-normal text-neutral-500">pts</span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400 font-mono">
              {tasks.length} tasks committed to sprint
            </p>
          </div>

          <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">Delivered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
              {completedPoints} <span className="text-xs font-normal text-neutral-500">pts</span>
            </div>
            <div className="mt-2 w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">In Flight & Review</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
              {inFlightPoints} <span className="text-xs font-normal text-neutral-500">pts</span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400 font-mono">
              Actively in progress or QA review
            </p>
          </div>

          <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">Remaining Backlog</span>
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-neutral-300 font-mono tabular-nums">
              {backlogPoints} <span className="text-xs font-normal text-neutral-500">pts</span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400 font-mono">
              Pending pick-up for final week
            </p>
          </div>
        </div>

        {/* Sprint Burndown Chart Section */}
        <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-semibold text-white">Sprint Burndown Progression</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Story points remaining vs linear ideal burn rate over 10 working days
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-neutral-500"></span>
                <span className="text-neutral-400">Ideal Guideline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-indigo-500 rounded-full"></span>
                <span className="text-indigo-300">Actual Velocity</span>
              </div>
            </div>
          </div>

          {/* SVG Burndown Chart */}
          <div className="relative h-64 w-full">
            <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
              {/* Background grid lines */}
              {[0, 60, 120, 180, 240].map((y, idx) => (
                <line
                  key={idx}
                  x1="40"
                  y1={y}
                  x2="780"
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
              ))}

              {/* Ideal Burndown Line (Day 1 at x=40, y=20 to Day 10 at x=760, y=220) */}
              <line
                x1="40"
                y1="20"
                x2="760"
                y2="220"
                stroke="#71717a"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Actual Burndown Polyline */}
              {(() => {
                const points = burndownData
                  .map((d, i) => {
                    if (d.actual === null) return null;
                    const x = 40 + i * (720 / 9);
                    // Map points 26 -> 20, 0 -> 220
                    const y = 220 - (d.actual / 26) * 200;
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .join(' ');

                return (
                  <>
                    <polyline
                      points={points}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {burndownData.map((d, i) => {
                      if (d.actual === null) return null;
                      const x = 40 + i * (720 / 9);
                      const y = 220 - (d.actual / 26) * 200;
                      return (
                        <g key={i}>
                          <circle
                            cx={x}
                            cy={y}
                            r="5"
                            fill="#6366f1"
                            stroke="#09090b"
                            strokeWidth="2"
                          />
                          <text
                            x={x}
                            y={y - 10}
                            textAnchor="middle"
                            fontSize="10"
                            fontFamily="JetBrains Mono"
                            fill="#cbd5e1"
                          >
                            {d.actual}pts
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between pl-8 pr-4 text-[10px] font-mono text-neutral-500 mt-2">
              {burndownData.map((d) => (
                <span key={d.day}>{d.day}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Member Breakdown & Priority Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Member Velocity Table */}
          <div className="lg:col-span-2 p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl">
            <h3 className="text-sm font-semibold text-white mb-4">
              Team Member Contribution & Bandwidth
            </h3>
            <div className="space-y-4">
              {memberStats.map((m) => (
                <div key={m.id} className="p-3.5 bg-neutral-900/70 border border-neutral-800/80 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={m.avatar}
                        alt={m.name}
                        className="w-8 h-8 rounded-full object-cover border border-neutral-700"
                      />
                      <div>
                        <h4 className="text-xs font-semibold text-neutral-200">{m.name}</h4>
                        <p className="text-[11px] text-neutral-400 font-mono">{m.role}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs text-white font-semibold tabular-nums">
                        {m.donePts} / {m.totalPts} pts
                      </span>
                      <p className="text-[10px] text-neutral-500 font-mono">
                        {m.completionRate}% complete ({m.tasksCount} tasks)
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${m.completionRate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Matrix */}
          <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Priority Distribution</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs p-2.5 bg-neutral-900/80 rounded-lg border border-neutral-800">
                  <span className="flex items-center gap-2 text-rose-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Urgent
                  </span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {prioritiesCount.urgent}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs p-2.5 bg-neutral-900/80 rounded-lg border border-neutral-800">
                  <span className="flex items-center gap-2 text-amber-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    High
                  </span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {prioritiesCount.high}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs p-2.5 bg-neutral-900/80 rounded-lg border border-neutral-800">
                  <span className="flex items-center gap-2 text-sky-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    Medium
                  </span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {prioritiesCount.medium}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs p-2.5 bg-neutral-900/80 rounded-lg border border-neutral-800">
                  <span className="flex items-center gap-2 text-neutral-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-neutral-500"></span>
                    Low
                  </span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {prioritiesCount.low}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 text-xs text-neutral-400 font-mono leading-relaxed">
              <span className="text-neutral-300 font-semibold">Sprint Invariant:</span> Zero uncommitted urgent tasks allowed past Day 6 to avoid sprint spillover.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
