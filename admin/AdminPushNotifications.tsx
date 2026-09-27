import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  Send, 
  Smartphone, 
  Users, 
  Radio, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2, 
  Layers, 
  ExternalLink,
  Shield,
  Sparkles,
  Zap,
  Globe,
  Monitor,
  Flame,
  Search,
  Check,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DepartmentRecord } from './types';
import { 
  fetchRegisteredDevices, 
  sendAdminCustomPushNotification, 
  sendTestPushToDevice, 
  RegisteredDeviceItem 
} from '../src/lib/pushNotificationClient';
import { recordActivityNotification } from '../src/lib/dbService';

interface AdminPushNotificationsProps {
  departments?: DepartmentRecord[];
  onBroadcastAdded?: () => void;
}

interface PushHistoryItem {
  id: string;
  title: string;
  body: string;
  target: string;
  sentCount: number;
  failureCount: number;
  targetedCount: number;
  timestamp: number;
}

export const AdminPushNotifications: React.FC<AdminPushNotificationsProps> = ({
  departments = [],
  onBroadcastAdded,
}) => {
  const [devices, setDevices] = useState<RegisteredDeviceItem[]>([]);
  const [history, setHistory] = useState<PushHistoryItem[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'department' | 'level' | 'student'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [targetMatric, setTargetMatric] = useState<string>('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('high');
  const [actionUrl, setActionUrl] = useState<string>('/');
  const [alsoPostAnnouncement, setAlsoPostAnnouncement] = useState<boolean>(true);

  // Search filter for devices table
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');

  // Quick Preset Templates
  const templates = [
    {
      label: '🚨 Urgent Class Reschedule',
      title: '🚨 Urgent: Class Rescheduled Today',
      body: 'Attention students: Today lecture session has been rescheduled. Please check the updated timetable for the new time and venue.',
      actionUrl: '/',
      priority: 'urgent' as const,
    },
    {
      label: '📢 Faculty Notice',
      title: '📢 Official Department Notice',
      body: 'An important academic circular has been released by faculty administration. Please review the details immediately.',
      actionUrl: '/broadcasts',
      priority: 'high' as const,
    },
    {
      label: '⚠️ Assignment Deadline',
      title: '⚠️ Assignment Submission Due Soon',
      body: 'Reminder: Your course assignment submission portal will close shortly. Ensure your work is uploaded on time.',
      actionUrl: '/deadlines',
      priority: 'high' as const,
    },
    {
      label: '📚 New Lecture Material',
      title: '📚 New Lecture Handout Uploaded',
      body: 'Course handouts and study materials have been published to your course module directory.',
      actionUrl: '/modules',
      priority: 'normal' as const,
    },
  ];

  // Load registered devices from backend & Firestore
  const loadDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const res = await fetchRegisteredDevices();
      setDevices(res.devices || []);
      // Also fetch push delivery history
      try {
        const histRes = await fetch('/api/push/history');
        if (histRes.ok) {
          const histData = await histRes.json();
          if (histData.logs) {
            setHistory(histData.logs);
          }
        }
      } catch {}
    } catch (err) {
      console.warn('Failed to load registered devices:', err);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  // Compute calculated target count
  const estimatedTargetCount = useMemo(() => {
    if (devices.length === 0) return 0;
    if (targetType === 'all') return devices.length;

    return devices.filter((d) => {
      if (targetType === 'student') {
        if (!targetMatric.trim()) return false;
        const cleanTarget = targetMatric.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const cleanSub = (d.matricNumber || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return cleanSub.includes(cleanTarget);
      }

      if (targetType === 'department') {
        if (selectedDepartment === 'ALL') return true;
        const s = (d.department || '').toLowerCase();
        const r = selectedDepartment.toLowerCase().replace(/^dept[-_]/i, '');
        return s.includes(r) || r.includes(s);
      }

      if (targetType === 'level') {
        if (selectedLevel === 'ALL') return true;
        const r = String(selectedLevel).replace(/\D/g, '');
        const s = String(d.level || '').replace(/\D/g, '');
        return r === s;
      }

      return true;
    }).length;
  }, [devices, targetType, selectedDepartment, selectedLevel, targetMatric]);

  // Handle Dispatching Custom Push Notification
  const handleDispatchPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide both notification title and message body.' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      const deptTarget = targetType === 'department' && selectedDepartment !== 'ALL' ? selectedDepartment : undefined;
      const lvlTarget = targetType === 'level' && selectedLevel !== 'ALL' ? selectedLevel : undefined;
      const matricTarget = targetType === 'student' && targetMatric.trim() ? targetMatric.trim() : undefined;
      const isBroadcastAll = targetType === 'all';

      // 1. Send native push to student devices via Web Push API
      const result = await sendAdminCustomPushNotification({
        title: title.trim(),
        body: body.trim(),
        department: deptTarget,
        level: lvlTarget,
        targetMatric: matricTarget,
        url: actionUrl || '/',
        priority,
        broadcastAll: isBroadcastAll,
      });

      // 2. Also record to Firestore notifications collection so mobile devices receive real-time alerts
      await recordActivityNotification({
        title: title.trim(),
        message: body.trim(),
        category: alsoPostAnnouncement ? 'broadcast' : 'schedule',
        type: priority === 'urgent' ? 'alert' : 'info',
        department: deptTarget,
        level: lvlTarget,
        author: 'System Administrator',
        dispatchPush: false, // Already pushed directly
      }).catch((err) => console.warn('Firestore announcement record note:', err));
      onBroadcastAdded?.();

      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: `✓ Alert delivered to ${result.sentCount} devices (${result.targetedCount} targeted). Students received the notification instantly!`,
        });
        // Clear form
        setTitle('');
        setBody('');
        // Reload devices and logs
        loadDevices();
      } else {
        setStatusMessage({
          type: 'error',
          text: `Notification dispatched with note: ${result.message || 'Check active devices'}`,
        });
      }
    } catch (err: any) {
      console.error('Push dispatch error:', err);
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to dispatch push notification.' });
    } finally {
      setIsSending(false);
    }
  };

  // Handle Quick Test Push
  const handleSendTestPush = async (endpoint?: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await sendTestPushToDevice(endpoint);
      if (res.success) {
        setTestResult(res.message);
        setStatusMessage({ type: 'success', text: `✓ ${res.message}` });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Test push failed' });
    } finally {
      setIsTesting(false);
    }
  };

  // Filtered devices for the directory table
  const filteredDevices = useMemo(() => {
    if (!deviceSearchQuery.trim()) return devices;
    const q = deviceSearchQuery.toLowerCase().trim();
    return devices.filter(
      (d) =>
        (d.matricNumber && d.matricNumber.toLowerCase().includes(q)) ||
        (d.department && d.department.toLowerCase().includes(q)) ||
        (d.platform && d.platform.toLowerCase().includes(q)) ||
        (d.userId && d.userId.toLowerCase().includes(q))
    );
  }, [devices, deviceSearchQuery]);

  return (
    <div className="space-y-6 select-text">
      {/* Top Banner / Hero Header */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/30 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-3">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Native Push Notification Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Push Notification Control Center
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Dispatch real-time native push alerts to student mobile phones, laptops, and Android devices. 
              Notifications arrive instantly with sound and vibration even when the app is completely closed.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleSendTestPush()}
              disabled={isTesting || devices.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-50 shadow-sm"
              title="Send a sample test push to verify push delivery"
            >
              <Radio className={`w-4 h-4 text-blue-400 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Sending Test...' : 'Send Test Ping'}</span>
            </button>

            <button
              onClick={loadDevices}
              disabled={isLoadingDevices}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingDevices ? 'animate-spin' : ''}`} />
              <span>Refresh Devices</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>Active Devices</span>
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {isLoadingDevices ? '...' : devices.length}
            </p>
            <p className="text-[11px] text-emerald-400 mt-0.5">Ready to receive alerts</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Web / PWA Push</span>
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {devices.filter((d) => (d.platform || 'web') === 'web').length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Desktop & Mobile Browsers</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-purple-400" />
              <span>Android / Native</span>
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {devices.filter((d) => d.platform === 'android' || d.platform === 'ios').length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Mobile Device Tokens</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Broadcast Reach</span>
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">100%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Zero Delivery Fee</p>
          </div>
        </div>
      </div>

      {/* Status / Alert Banner */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm font-medium ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: PUSH COMPOSER (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Compose Push Alert</h3>
                  <p className="text-xs text-slate-400">Broadcast instantly to students in background</p>
                </div>
              </div>

              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                Target: {estimatedTargetCount} {estimatedTargetCount === 1 ? 'Device' : 'Devices'}
              </span>
            </div>

            {/* Quick Templates Bar */}
            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Template Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setTitle(tpl.title);
                      setBody(tpl.body);
                      setActionUrl(tpl.actionUrl);
                      setPriority(tpl.priority);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleDispatchPush} className="space-y-4 mt-5">
              {/* Audience Selector Tabs */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType('all')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      targetType === 'all'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>All Devices</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('department')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      targetType === 'department'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Department</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('level')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      targetType === 'level'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Level</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('student')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      targetType === 'student'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Single Student</span>
                  </button>
                </div>
              </div>

              {/* Conditional Audience Options */}
              {targetType === 'department' && (
                <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2">
                  <label className="text-xs font-medium text-slate-300">Select Department</label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="ALL">All Departments</option>
                    <option value="ICH">Department of Industrial Chemistry (ICH)</option>
                    <option value="CSC">Department of Computer Science (CSC)</option>
                    <option value="CHM">Department of Chemistry (CHM)</option>
                    <option value="BCH">Department of Biochemistry (BCH)</option>
                    <option value="MCB">Department of Microbiology (MCB)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'level' && (
                <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2">
                  <label className="text-xs font-medium text-slate-300">Select Academic Level</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="ALL">All Levels (100L - 500L)</option>
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                  </select>
                </div>
              )}

              {targetType === 'student' && (
                <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2">
                  <label className="text-xs font-medium text-slate-300">Student Matric Number</label>
                  <input
                    type="text"
                    value={targetMatric}
                    onChange={(e) => setTargetMatric(e.target.value)}
                    placeholder="e.g. 2025/PS/ICH/0062 or 2025-PS-ICH-4000"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400">Matches registered devices by student matriculation ID</p>
                </div>
              )}

              {/* Title Field */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Notification Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Class Rescheduled: CHM 101 Lecture"
                  required
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500 font-medium"
                />
              </div>

              {/* Message Body Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Message Body <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">{body.length}/250 chars</span>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter the notification message to display on the student lock screen..."
                  required
                  rows={3}
                  maxLength={250}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500 leading-relaxed"
                />
              </div>

              {/* Priority & URL Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Delivery Urgency</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="urgent">Urgent (Instant Sound & Screen Wake)</option>
                    <option value="high">High Priority (Standard Alert)</option>
                    <option value="normal">Normal (Standard Delivery)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">On Click Action</label>
                  <select
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="/">Open Class Schedule Tab</option>
                    <option value="/deadlines">Open Deadlines & Assignments</option>
                    <option value="/broadcasts">Open Official Circulars</option>
                    <option value="/modules">Open Lecture Modules</option>
                  </select>
                </div>
              </div>

              {/* Firestore Broadcast Mirror Checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="postAnnouncement"
                  checked={alsoPostAnnouncement}
                  onChange={(e) => setAlsoPostAnnouncement(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="postAnnouncement" className="text-xs text-slate-300 cursor-pointer select-none">
                  Also post to student in-app <strong>Announcements Board</strong> in Firestore
                </label>
              </div>

              {/* Submit Dispatch Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSending || !title.trim() || !body.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${isSending ? 'animate-bounce' : ''}`} />
                  <span>
                    {isSending
                      ? 'Dispatching Push Notification...'
                      : `Dispatch Push Alert to ~${estimatedTargetCount} Devices`}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Push History Audit */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Recent Push Delivery Logs</span>
              </h3>
              <span className="text-xs text-slate-500">{history.length} logged</span>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No recent push history found. Broadcast an alert above to generate delivery logs.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80 max-h-64 overflow-y-auto mt-2">
                {history.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-white">{log.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{log.body}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                        <span>Target: {log.target}</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                        <Check className="w-3 h-3" />
                        <span>{log.sentCount} sent</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REGISTERED DEVICES DIRECTORY (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Registered Device Fleet</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-semibold border border-emerald-500/20">
                {devices.length} Devices Active
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2 mb-3">
              Devices registered via Web Push API & Capacitor native FCM tokens from Cloud Firestore.
            </p>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={deviceSearchQuery}
                onChange={(e) => setDeviceSearchQuery(e.target.value)}
                placeholder="Search by matric, department..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Devices List */}
            <div className="flex-1 overflow-y-auto max-h-[580px] space-y-2.5 pr-1">
              {isLoadingDevices ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <RefreshCw className="w-5 h-5 text-blue-400 animate-spin mx-auto mb-2" />
                  <span>Loading device subscriptions...</span>
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Smartphone className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                  <span>No registered devices matching search filter.</span>
                </div>
              ) : (
                filteredDevices.map((d, idx) => {
                  const isAndroid = d.platform === 'android';
                  const isIOS = d.platform === 'ios';
                  const isWeb = !isAndroid && !isIOS;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white truncate">
                            {d.matricNumber || 'Anonymous Student'}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold ${
                              isAndroid
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isIOS
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {d.platform || 'web'}
                          </span>
                        </div>
                        <p className="text-slate-400 truncate text-[11px]">
                          {d.department || 'All Departments'} {d.level ? `• ${d.level}L` : ''}
                        </p>
                        <p className="text-slate-500 text-[10px] font-mono truncate">
                          Last seen: {new Date(d.timestamp).toLocaleDateString()}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendTestPush(d.endpoint)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white text-[11px] font-semibold transition shrink-0 cursor-pointer flex items-center gap-1"
                        title="Send test alert to this device"
                      >
                        <Bell className="w-3 h-3 text-blue-400" />
                        <span>Ping</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Info note */}
            <div className="pt-3 mt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Automatic sync enabled</span>
              <span className="text-emerald-400 font-mono">Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
