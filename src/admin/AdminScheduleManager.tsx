import React, { useState, useMemo } from 'react';
import { EventItem } from '@src/types';
import { DepartmentRecord } from './types';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  CheckCircle2, 
  X, 
  Save, 
  Download,
  AlertTriangle,
  Layers,
  Sparkles,
  Building2,
  BookOpen,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminScheduleManagerProps {
  events: EventItem[];
  departments?: DepartmentRecord[];
  searchQuery: string;
  currentSemester?: string;
  onAddEvent: (newEvent: Omit<EventItem, 'id'>) => Promise<void>;
  onUpdateEvent: (id: string, updated: Partial<EventItem>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const AdminScheduleManager: React.FC<AdminScheduleManagerProps> = ({
  events,
  departments = [],
  searchQuery,
  currentSemester = '1st Semester',
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('ALL');
  const [selectedSemFilter, setSelectedSemFilter] = useState<string>('ALL');

  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Event Form State
  const [formData, setFormData] = useState({
    course: '',
    title: '',
    time: '08:00 AM - 10:00 AM',
    location: '',
    instructor: '',
    dayKey: 'WED 19',
    tags: 'Lecture, Required',
    views: '128 views',
    isPostponed: false,
    colorAccent: 'blue',
    department_id: departments[0]?.id || 'dept-ich',
    level: 100,
    semester: currentSemester || '1st Semester',
  });

  const daysList = ['ALL', 'MON 17', 'TUE 18', 'WED 19', 'THU 20', 'FRI 21', 'SAT 22'];
  const levelList = ['ALL', '100', '200', '300', '400', '500'];
  const semesterList = ['ALL', '1st Semester', '2nd Semester'];

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Day filter
      const matchesDay = selectedDayFilter === 'ALL' || evt.dayKey === selectedDayFilter;
      
      // Department filter
      const matchesDept = 
        selectedDeptFilter === 'ALL' || 
        evt.department_id === selectedDeptFilter ||
        (selectedDeptFilter === 'dept-ich' && !evt.department_id); // default fallback

      // Level filter
      const evtLevel = evt.level || (evt.course ? parseInt(evt.course.replace(/\D/g, '').substring(0, 1) + '00', 10) : 100);
      const matchesLevel = selectedLevelFilter === 'ALL' || String(evtLevel) === selectedLevelFilter;

      // Semester filter
      const evtSem = evt.semester || '1st Semester';
      const matchesSem = selectedSemFilter === 'ALL' || evtSem.toLowerCase().includes(selectedSemFilter.toLowerCase().replace(' semester', ''));

      // Search query
      const matchesSearch = 
        !searchQuery ||
        evt.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (evt.instructor && evt.instructor.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesDay && matchesDept && matchesLevel && matchesSem && matchesSearch;
    });
  }, [events, selectedDayFilter, selectedDeptFilter, selectedLevelFilter, selectedSemFilter, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course || !formData.title || !formData.location) return;

    setIsSaving(true);
    try {
      await onAddEvent({
        course: formData.course.trim().toUpperCase(),
        title: formData.title.trim(),
        time: formData.time.trim(),
        location: formData.location.trim(),
        instructor: formData.instructor?.trim() || 'Faculty Staff',
        dayKey: formData.dayKey,
        views: formData.views || '42 views',
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        isPostponed: formData.isPostponed,
        colorAccent: formData.colorAccent,
        department_id: formData.department_id,
        level: Number(formData.level) || 100,
        semester: formData.semester,
      });

      // Reset form
      setFormData({
        course: '',
        title: '',
        time: '08:00 AM - 10:00 AM',
        location: '',
        instructor: '',
        dayKey: 'WED 19',
        tags: 'Lecture, Required',
        views: '128 views',
        isPostponed: false,
        colorAccent: 'blue',
        department_id: departments[0]?.id || 'dept-ich',
        level: 100,
        semester: '1st Semester',
      });
      setIsAddModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    setIsSaving(true);
    try {
      await onUpdateEvent(editingEvent.id, {
        course: editingEvent.course,
        title: editingEvent.title,
        time: editingEvent.time,
        location: editingEvent.location,
        instructor: editingEvent.instructor,
        dayKey: editingEvent.dayKey,
        isPostponed: editingEvent.isPostponed,
        department_id: editingEvent.department_id,
        level: editingEvent.level,
        semester: editingEvent.semester,
      });
      setEditingEvent(null);
    } finally {
      setIsSaving(false);
    }
  };

  const exportScheduleJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `timetable_events_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;
    setIsDeleting(true);
    try {
      await onDeleteEvent(deletingEvent.id);
      setDeletingEvent(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = () => {
    setSelectedDayFilter('ALL');
    setSelectedDeptFilter('ALL');
    setSelectedLevelFilter('ALL');
    setSelectedSemFilter('ALL');
  };

  const hasActiveFilters = selectedDayFilter !== 'ALL' || selectedDeptFilter !== 'ALL' || selectedLevelFilter !== 'ALL' || selectedSemFilter !== 'ALL';

  return (
    <div className="p-6 space-y-6">
      {/* Advanced Multi-Tier Filter Bar: Department, Level (100L-500L), Semester, Day */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Schedule Filters &amp; Target Segmentation</h4>
              <p className="text-xs text-slate-500">Filter timetable slots by Department, Academic Level (up to 500L), Semester and Day.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
              onClick={exportScheduleJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Class / Event</span>
            </button>
          </div>
        </div>

        {/* Granular Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Department:
            </label>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter (100L - 500L) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Academic Level:
            </label>
            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
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
              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
              Semester:
            </label>
            <select
              value={selectedSemFilter}
              onChange={(e) => setSelectedSemFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="ALL">All Semesters</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
            </select>
          </div>

          {/* Day Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Day of Week:
            </label>
            <select
              value={selectedDayFilter}
              onChange={(e) => setSelectedDayFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {daysList.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Days' : d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schedule Table / Cards List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Timetable Classes &amp; Sessions ({filteredEvents.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              Targeted Scheduling
            </span>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Calendar className="w-12 h-12 mx-auto opacity-30 text-slate-500" />
            <p className="text-sm font-medium text-slate-600">No scheduled classes matching current filters</p>
            <p className="text-xs text-slate-400">
              Try changing your department, level, semester or day filter.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 cursor-pointer"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Course &amp; Title</th>
                  <th className="py-3 px-4">Target Scope</th>
                  <th className="py-3 px-4">Day &amp; Time</th>
                  <th className="py-3 px-4">Venue</th>
                  <th className="py-3 px-4">Lecturer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((evt) => {
                  const matchedDept = departments.find(d => d.id === evt.department_id);
                  const deptCode = matchedDept?.code || (evt.department_id ? evt.department_id.replace('dept-', '').toUpperCase() : 'ICH');
                  const evtLevel = evt.level || (evt.course ? parseInt(evt.course.replace(/\D/g, '').substring(0, 1) + '00', 10) : 100);
                  const evtSem = evt.semester || '1st Sem';

                  return (
                    <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-extrabold text-blue-600 mr-2">{evt.course}</span>
                          <span className="font-semibold text-slate-900">{evt.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {evt.tags?.map((t, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-100">
                            {deptCode}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-100">
                            {evtLevel}L
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {evtSem.replace('ester', '')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold mr-1.5">
                          {evt.dayKey}
                        </span>
                        <span className="text-[11px]">{evt.time}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{evt.location}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{evt.instructor || 'Faculty Staff'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {evt.isPostponed ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                            Postponed
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            Scheduled
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingEvent(evt)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Class"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingEvent(evt)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Class"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Add New Class to Timetable</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                {/* Department, Level & Semester Selection */}
                <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
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
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Academic Level</label>
                      <select
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value, 10) })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                      >
                        <option value={100}>100 Level</option>
                        <option value={200}>200 Level</option>
                        <option value={300}>300 Level</option>
                        <option value={400}>400 Level</option>
                        <option value={500}>500 Level</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Semester</label>
                      <select
                        value={formData.semester}
                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                      >
                        <option value="1st Semester">1st Semester</option>
                        <option value="2nd Semester">2nd Semester</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Course Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CHM 101"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-bold uppercase text-blue-700"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Course Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. General Physical Chemistry"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Day *</label>
                    <select
                      value={formData.dayKey}
                      onChange={(e) => setFormData({ ...formData, dayKey: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-semibold bg-white cursor-pointer"
                    >
                      {daysList.filter(d => d !== 'ALL').map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Time Slot *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 08:00 AM - 10:00 AM"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Venue / Lecture Hall *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. LT 1, Science Complex"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Lecturer / Instructor</label>
                    <input
                      type="text"
                      placeholder="e.g. Prof. A. Adeleke"
                      value={formData.instructor}
                      onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
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
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Writing to Firebase...' : 'Save & Publish'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Class Modal */}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Edit Class: {editingEvent.course}</h3>
                </div>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                {/* Target Scope */}
                <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Target Department, Level &amp; Semester
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Department</label>
                      <select
                        value={editingEvent.department_id || departments[0]?.id || 'dept-ich'}
                        onChange={(e) => setEditingEvent({ ...editingEvent, department_id: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Academic Level</label>
                      <select
                        value={editingEvent.level || 100}
                        onChange={(e) => setEditingEvent({ ...editingEvent, level: parseInt(e.target.value, 10) })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                      >
                        <option value={100}>100 Level</option>
                        <option value={200}>200 Level</option>
                        <option value={300}>300 Level</option>
                        <option value={400}>400 Level</option>
                        <option value={500}>500 Level</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Semester</label>
                      <select
                        value={editingEvent.semester || '1st Semester'}
                        onChange={(e) => setEditingEvent({ ...editingEvent, semester: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                      >
                        <option value="1st Semester">1st Semester</option>
                        <option value="2nd Semester">2nd Semester</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Course Code</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.course}
                      onChange={(e) => setEditingEvent({ ...editingEvent, course: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-bold uppercase text-blue-700"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Course Title</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.title}
                      onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Day</label>
                    <select
                      value={editingEvent.dayKey}
                      onChange={(e) => setEditingEvent({ ...editingEvent, dayKey: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-semibold bg-white"
                    >
                      {daysList.filter(d => d !== 'ALL').map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Time Slot</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.time}
                      onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Venue</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.location}
                      onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Lecturer</label>
                    <input
                      type="text"
                      value={editingEvent.instructor || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, instructor: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="postpone-check"
                    checked={editingEvent.isPostponed || false}
                    onChange={(e) => setEditingEvent({ ...editingEvent, isPostponed: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <label htmlFor="postpone-check" className="text-slate-700 font-semibold cursor-pointer">
                    Mark class as Postponed
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Updating Firebase...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Class Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingEvent)}
        onClose={() => setDeletingEvent(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Timetable Class"
        itemType="class schedule"
        itemName={deletingEvent ? `${deletingEvent.course} - ${deletingEvent.title} (${deletingEvent.dayKey}, ${deletingEvent.time})` : undefined}
        description="Are you sure you want to delete this scheduled class? It will be removed from the master timetable and student weekly agendas immediately."
        confirmLabel="Yes, Delete Class"
        isDeleting={isDeleting}
      />
    </div>
  );
};
