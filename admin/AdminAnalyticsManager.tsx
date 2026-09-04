import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Users,
  Smartphone,
  Calendar,
  Clock,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Eye,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Filter,
  Search,
  Lock,
  LogOut,
  Sparkles,
  BarChart3,
  Globe,
} from 'lucide-react';
import { fetchAppUsageAnalytics, AppAnalyticsSummary, invalidateStudentSession } from '@src/lib/dbService';

export const AdminAnalyticsManager: React.FC = () => {
  const [analytics, setAnalytics] = useState<AppAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'usage' | 'sessions'>('usage');
  const [sessionSearch, setSessionSearch] = useState('');

  const loadData = async () => {
    try {
      const analyticsData = await fetchAppUsageAnalytics();
      setAnalytics(analyticsData);
    } catch (e) {
      console.error('Failed to load analytics data:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleTerminateSession = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Force terminate active session for ${studentName}? This will instantly log them out on their active device.`)) {
      return;
    }
    await invalidateStudentSession(studentId);
    if (analytics) {
      setAnalytics({
        ...analytics,
        activeSessions: analytics.activeSessions.filter((s) => s.id !== studentId),
      });
    }
  };

  if (isLoading || !analytics) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-semibold">Calculating daily app usage analytics &amp; sessions...</p>
      </div>
    );
  }

  const maxTimelineVisit = Math.max(...analytics.dailyVisitsTimeline.map((d) => d.visits), 1);
  const maxHourlyCount = Math.max(...analytics.hourlyDistribution.map((h) => h.count), 1);

  const filteredSessions = analytics.activeSessions.filter(
    (s) =>
      !sessionSearch.trim() ||
      s.studentName.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      s.matricNumber.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      s.device.toLowerCase().includes(sessionSearch.toLowerCase())
  );

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  App Usage &amp; Session Analytics
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Daily visit volume, student traffic trends, single-device session integrity &amp; helpdesk queries
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab pills */}
          <div className="flex p-1 bg-slate-200/80 rounded-xl gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveSubTab('usage')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'usage' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unique App Usage
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('sessions')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeSubTab === 'sessions' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Active Sessions</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px]">
                {analytics.activeSessions.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: USAGE & TIMELINE */}
      {activeSubTab === 'usage' && (
        <div className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Today Visits */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Visits</span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {analytics.todayVisits.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  +{Math.round(((analytics.todayVisits - analytics.yesterdayVisits) / (analytics.yesterdayVisits || 1)) * 100)}%
                </span>
              </div>
              <p className="text-[11.5px] text-slate-400 mt-1">vs {analytics.yesterdayVisits} yesterday</p>
            </div>

            {/* Metric 2: Unique Students Today */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unique Active Students</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {analytics.uniqueStudentsToday}
                </span>
                <span className="text-xs font-medium text-slate-500">students</span>
              </div>
              <p className="text-[11.5px] text-slate-400 mt-1">
                Active in chemistry portal today
              </p>
            </div>

            {/* Metric 3: 7-Day Visits */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">7-Day Total Visits</span>
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {analytics.last7DaysVisits.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-purple-600 font-bold">~{Math.round(analytics.last7DaysVisits / 7)} /day</span>
              </div>
              <p className="text-[11.5px] text-slate-400 mt-1">Weekly aggregate lecture volume</p>
            </div>

            {/* Metric 4: Single Device Session Integrity */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Device Session Guard</span>
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xl font-black text-indigo-700 tracking-tight">
                  Single-Device
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Enforced
                </span>
              </div>
              <p className="text-[11.5px] text-slate-400 mt-1">
                Concurrent multi-device logins restricted
              </p>
            </div>
          </div>

          {/* 14-Day App Visits Histogram / Trend Bar Chart */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Daily App Visits (Past 14 Days)</h3>
                <p className="text-xs text-slate-500">
                  Daily engagement volume and unique student counts across departments
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-blue-600"></span> Total Visits
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-indigo-300"></span> Unique Students
                </span>
              </div>
            </div>

            {/* Custom Responsive SVG / CSS Bar Chart */}
            <div className="pt-6 pb-2">
              <div className="flex items-end gap-2 sm:gap-3 h-48 w-full border-b border-slate-200 px-1">
                {analytics.dailyVisitsTimeline.map((item, idx) => {
                  const heightPercent = Math.max(Math.round((item.visits / maxTimelineVisit) * 100), 8);
                  const uniqueHeight = Math.max(Math.round((item.uniqueUsers / maxTimelineVisit) * 100), 4);
                  const isToday = idx === analytics.dailyVisitsTimeline.length - 1;

                  return (
                    <div
                      key={item.date}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10.5px] py-1 px-2 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                        <span className="font-bold">{item.label}</span>
                        <span className="text-slate-300">{item.visits} visits ({item.uniqueUsers} users)</span>
                      </div>

                      {/* Bar Stack */}
                      <div className="w-full max-w-[28px] flex flex-col items-center justify-end h-full relative">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-md transition-all ${
                            isToday
                              ? 'bg-blue-600 group-hover:bg-blue-700 shadow-sm shadow-blue-500/30'
                              : 'bg-blue-500/80 group-hover:bg-blue-600'
                          }`}
                        ></div>
                      </div>

                      <span className={`text-[10px] font-bold truncate max-w-[40px] text-center ${
                        isToday ? 'text-blue-600 font-extrabold' : 'text-slate-500'
                      }`}>
                        {item.label.split(',')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Secondary Charts Grid: 24h Distribution & Device / Level Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 24-Hour Traffic Curve */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">24-Hour Day Visit Distribution</h3>
                <p className="text-xs text-slate-500">
                  Peak portal access times during lectures and evening study
                </p>
              </div>

              <div className="flex items-end gap-1 sm:gap-1.5 h-36 border-b border-slate-200 pt-4">
                {analytics.hourlyDistribution.map((h, i) => {
                  const barH = Math.max(Math.round((h.count / maxHourlyCount) * 100), 6);
                  const isPeak = h.count === maxHourlyCount;
                  return (
                    <div key={h.hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      <div className="absolute -top-8 z-10 hidden group-hover:flex bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded whitespace-nowrap">
                        {h.hour}: {h.count} visits
                      </div>
                      <div
                        style={{ height: `${barH}%` }}
                        className={`w-full rounded-t-xs transition-all ${
                          isPeak ? 'bg-amber-500' : 'bg-slate-300 group-hover:bg-blue-500'
                        }`}
                      ></div>
                      {i % 4 === 0 && (
                        <span className="text-[9.5px] font-semibold text-slate-400 mt-1">{h.hour.slice(0, 2)}h</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Morning Lectures (8am - 12pm)</span>
                <span className="font-bold text-amber-600">Peak Study Hours (5pm - 9pm)</span>
              </div>
            </div>

            {/* Device & Platform Breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Device Breakdown</h3>
                <p className="text-xs text-slate-500">Student access clients</p>
              </div>

              <div className="space-y-3 pt-1">
                {analytics.deviceBreakdown.map((dev) => (
                  <div key={dev.device} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">{dev.device}</span>
                      <span className="text-slate-900 font-bold">{dev.percentage}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${dev.percentage}%` }}
                        className="h-full rounded-full bg-blue-600"
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Academic Level Split
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {analytics.levelBreakdown.map((lvl) => (
                    <div key={lvl.level} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[11px] text-slate-500 block truncate">{lvl.level}</span>
                      <span className="font-black text-slate-900 text-sm mt-0.5 block">{lvl.count} visits</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ACTIVE SESSIONS & SINGLE DEVICE ENFORCEMENT */}
      {activeSubTab === 'sessions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Live Active Device Sessions</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  Single-Device Enforced
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Students can only be logged in on one phone/computer at a time. Newer logins automatically replace previous session tokens.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                placeholder="Search student or matric..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Sessions Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Matric No.</th>
                  <th className="py-3 px-4">Level / Dept</th>
                  <th className="py-3 px-4">Authorized Device</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{session.studentName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{session.sessionToken.slice(0, 16)}...</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {session.matricNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{session.level} Level</span>
                      <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">{session.department}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{session.device}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {session.lastActive}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleTerminateSession(session.id, session.studentName)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors text-[11px] font-bold cursor-pointer"
                      >
                        Terminate Session
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
