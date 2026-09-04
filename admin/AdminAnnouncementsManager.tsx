import React, { useState, useMemo } from 'react';
import { NotificationItem } from '@src/types';
import { DepartmentRecord } from './types';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Send, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  X,
  Database,
  Radio,
  Clock,
  Edit2,
  Save,
  Loader2,
  Filter,
  Building2,
  Layers,
  BookOpen,
  RotateCcw,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminAnnouncementsManagerProps {
  notifications: NotificationItem[];
  departments?: DepartmentRecord[];
  searchQuery: string;
  onAddNotification: (newNotif: Omit<NotificationItem, 'id' | 'timestamp'>) => Promise<void>;
  onUpdateNotification?: (id: string, updatedFields: Partial<NotificationItem>) => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const AdminAnnouncementsManager: React.FC<AdminAnnouncementsManagerProps> = ({
  notifications,
  departments = [],
  searchQuery,
  onAddNotification,
  onUpdateNotification,
  onDeleteNotification,
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('ALL');
  const [selectedSemFilter, setSelectedSemFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'alert' as NotificationItem['type'],
    category: 'schedule' as NotificationItem['category'],
    targetAudience: 'All Faculty Students',
    department_id: 'ALL',
    level: 'ALL',
    semester: 'ALL',
  });

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<NotificationItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Modal State
  const [deletingItem, setDeletingItem] = useState<NotificationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredNotifs = useMemo(() => {
    return notifications.filter((item) => {
      // Department filter
      const matchesDept = 
        selectedDeptFilter === 'ALL' || 
        !item.department_id || 
        item.department_id === 'ALL' || 
        item.department_id === selectedDeptFilter;

      // Level filter
      const matchesLevel = 
        selectedLevelFilter === 'ALL' || 
        !item.level || 
        String(item.level) === 'ALL' || 
        String(item.level) === selectedLevelFilter;

      // Semester filter
      const matchesSem = 
        selectedSemFilter === 'ALL' || 
        !item.semester || 
        item.semester === 'ALL' || 
        item.semester.toLowerCase().includes(selectedSemFilter.toLowerCase().replace(' semester', ''));

      // Type filter
      const matchesType = typeFilter === 'ALL' || item.type === typeFilter;

      // Search query
      const matchesSearch = 
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.message.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDept && matchesLevel && matchesSem && matchesType && matchesSearch;
    });
  }, [notifications, selectedDeptFilter, selectedLevelFilter, selectedSemFilter, typeFilter, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return;

    setIsSending(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await onAddNotification({
        title: formData.title.trim(),
        message: formData.message.trim(),
        time: timeStr,
        isUnread: true,
        type: formData.type || 'alert',
        category: formData.category || 'schedule',
        department_id: formData.department_id,
        level: formData.level === 'ALL' ? undefined : Number(formData.level),
        semester: formData.semester,
      });
      setIsAddModalOpen(false);
      setFormData({
        title: '',
        message: '',
        type: 'alert',
        category: 'schedule',
        targetAudience: 'All Faculty Students',
        department_id: 'ALL',
        level: 'ALL',
        semester: 'ALL',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenEdit = (item: NotificationItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title.trim()) return;

    setIsSavingEdit(true);
    try {
      if (onUpdateNotification) {
        await onUpdateNotification(editingItem.id, {
          title: editingItem.title.trim(),
          message: editingItem.message.trim(),
          type: editingItem.type,
          category: editingItem.category,
          department_id: editingItem.department_id,
          level: editingItem.level,
          semester: editingItem.semester,
        });
      }
      setIsEditModalOpen(false);
      setEditingItem(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await onDeleteNotification(deletingItem.id);
      setDeletingItem(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = () => {
    setSelectedDeptFilter('ALL');
    setSelectedLevelFilter('ALL');
    setSelectedSemFilter('ALL');
    setTypeFilter('ALL');
  };

  const hasActiveFilters = selectedDeptFilter !== 'ALL' || selectedLevelFilter !== 'ALL' || selectedSemFilter !== 'ALL' || typeFilter !== 'ALL';

  return (
    <div className="p-6 space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-600 animate-pulse" />
              <span>Campus &amp; Department Broadcast Channel</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Target urgent announcements, lecture updates, and emergency bulletins by Department, Level (100L - 500L), and Semester.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>New Broadcast</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              Department Scope:
            </label>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="ALL">All Departments (Campus-wide)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Academic Level:
            </label>
            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="ALL">All Levels (100L - 500L)</option>
              <option value="100">100 Level</option>
              <option value="200">200 Level</option>
              <option value="300">300 Level</option>
              <option value="400">400 Level</option>
              <option value="500">500 Level (Professional / Eng)</option>
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              Semester:
            </label>
            <select
              value={selectedSemFilter}
              onChange={(e) => setSelectedSemFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="ALL">All Semesters</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              Broadcast Urgency:
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="ALL">All Bulletin Types</option>
              <option value="alert">Urgent Alert</option>
              <option value="info">General Info</option>
              <option value="success">Academic Bulletin</option>
              <option value="activity">Campus Activity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Broadcast Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotifs.length === 0 ? (
          <div className="col-span-2 bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 space-y-2">
            <Megaphone className="w-12 h-12 mx-auto opacity-30 text-purple-600" />
            <p className="text-sm font-medium text-slate-600">No broadcast notices matching filters</p>
            <p className="text-xs text-slate-400">Post a new bulletin for students or reset the filter settings.</p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-600 text-xs font-bold hover:bg-purple-100 cursor-pointer"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          filteredNotifs.map((item) => {
            const matchedDept = departments.find(d => d.id === item.department_id);
            const deptLabel = item.department_id === 'ALL' || !item.department_id 
              ? 'Campus-wide' 
              : (matchedDept?.code || item.department_id.replace('dept-', '').toUpperCase());

            const levelLabel = item.level && String(item.level) !== 'ALL' ? `${item.level}L` : 'All Levels';
            const semLabel = item.semester && item.semester !== 'ALL' ? item.semester.replace('ester', '') : 'All Sems';

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-purple-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`p-2 rounded-xl shrink-0 ${
                          item.type === 'alert'
                            ? 'bg-amber-50 text-amber-600'
                            : item.type === 'success'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <Bell className="w-4 h-4" />
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                        title="Edit broadcast"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Target Audience Scope Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 my-2.5 pl-10">
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10.5px] border border-purple-100">
                      {deptLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10.5px] border border-indigo-100">
                      {levelLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10.5px]">
                      {semLabel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mt-1 pl-10">{item.message}</p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-100 text-xs text-slate-400 pl-10">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.time || 'Today'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600 text-[10px] capitalize">
                    {item.type || 'Notice'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast Composer Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Broadcast Campus Notification</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                {/* Target Audience Scope Selector */}
                <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    Target Department, Level &amp; Semester
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Department</label>
                      <select
                        value={formData.department_id}
                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                      >
                        <option value="ALL">All Departments</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Academic Level</label>
                      <select
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                      >
                        <option value="ALL">All Levels</option>
                        <option value="100">100 Level</option>
                        <option value="200">200 Level</option>
                        <option value="300">300 Level</option>
                        <option value="400">400 Level</option>
                        <option value="500">500 Level</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Semester</label>
                      <select
                        value={formData.semester}
                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                      >
                        <option value="ALL">All Semesters</option>
                        <option value="1st Semester">1st Semester</option>
                        <option value="2nd Semester">2nd Semester</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Headline / Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PHY 102 Venue Relocation to SLT 2"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-purple-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Notice Body / Message *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Explain the update, instructions for students, or urgent notice..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-purple-600 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Broadcast Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-purple-600 bg-white"
                    >
                      <option value="alert">Urgent Alert</option>
                      <option value="info">General Information</option>
                      <option value="success">Academic Announcement</option>
                      <option value="activity">Campus Activity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-purple-600 bg-white"
                    >
                      <option value="schedule">Timetable / Schedule</option>
                      <option value="deadline">Course Deadlines</option>
                      <option value="system">Faculty System</option>
                      <option value="profile">Student Affairs</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-purple-500/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSending ? 'Broadcasting...' : 'Broadcast to App'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Broadcast Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Edit Campus Broadcast</h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                {/* Target Scope */}
                <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    Target Department, Level &amp; Semester
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Department</label>
                      <select
                        value={editingItem.department_id || 'ALL'}
                        onChange={(e) => setEditingItem({ ...editingItem, department_id: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                      >
                        <option value="ALL">All Departments</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Academic Level</label>
                      <select
                        value={editingItem.level !== undefined ? String(editingItem.level) : 'ALL'}
                        onChange={(e) => setEditingItem({ ...editingItem, level: e.target.value === 'ALL' ? undefined : Number(e.target.value) })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                      >
                        <option value="ALL">All Levels</option>
                        <option value="100">100 Level</option>
                        <option value="200">200 Level</option>
                        <option value="300">300 Level</option>
                        <option value="400">400 Level</option>
                        <option value="500">500 Level</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Semester</label>
                      <select
                        value={editingItem.semester || 'ALL'}
                        onChange={(e) => setEditingItem({ ...editingItem, semester: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                      >
                        <option value="ALL">All Semesters</option>
                        <option value="1st Semester">1st Semester</option>
                        <option value="2nd Semester">2nd Semester</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Headline / Subject *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-purple-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Notice Body / Message *</label>
                  <textarea
                    rows={4}
                    required
                    value={editingItem.message}
                    onChange={(e) => setEditingItem({ ...editingItem, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-purple-600 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Broadcast Type</label>
                    <select
                      value={editingItem.type}
                      onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-purple-600 bg-white"
                    >
                      <option value="alert">Urgent Alert</option>
                      <option value="info">General Information</option>
                      <option value="success">Academic Announcement</option>
                      <option value="activity">Campus Activity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Category</label>
                    <select
                      value={editingItem.category}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-purple-600 bg-white"
                    >
                      <option value="schedule">Timetable / Schedule</option>
                      <option value="deadline">Course Deadlines</option>
                      <option value="system">Faculty System</option>
                      <option value="profile">Student Affairs</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-purple-500/20"
                  >
                    {isSavingEdit ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Announcement"
        itemType="announcement"
        itemName={deletingItem?.title}
        description="Are you sure you want to delete this broadcast notice? Students will no longer see this announcement on their live dashboard."
        confirmLabel="Yes, Delete Notice"
        isDeleting={isDeleting}
      />
    </div>
  );
};
