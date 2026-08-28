import React, { useState } from 'react';
import { EventItem } from '../types';
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
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminScheduleManagerProps {
  events: EventItem[];
  searchQuery: string;
  onAddEvent: (newEvent: Omit<EventItem, 'id'>) => Promise<void>;
  onUpdateEvent: (id: string, updated: Partial<EventItem>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const AdminScheduleManager: React.FC<AdminScheduleManagerProps> = ({
  events,
  searchQuery,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
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
  });

  const daysList = ['ALL', 'MON 17', 'TUE 18', 'WED 19', 'THU 20', 'FRI 21', 'SAT 22'];

  const filteredEvents = events.filter((evt) => {
    const matchesDay = selectedDayFilter === 'ALL' || evt.dayKey === selectedDayFilter;
    const matchesSearch = 
      !searchQuery ||
      evt.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (evt.instructor && evt.instructor.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDay && matchesSearch;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course || !formData.title || !formData.location) return;

    setIsSaving(true);
    try {
      await onAddEvent({
        course: formData.course,
        title: formData.title,
        time: formData.time,
        location: formData.location,
        instructor: formData.instructor || 'Faculty Staff',
        dayKey: formData.dayKey,
        views: formData.views || '42 views',
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        isPostponed: formData.isPostponed,
        colorAccent: formData.colorAccent,
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

  return (
    <div className="p-6 space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-slate-500 flex items-center gap-1.5 mr-1">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter by Day:</span>
          </span>
          {daysList.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDayFilter(day)}
              className={`px-3 py-1.5 rounded-xl text-[12.5px] font-semibold transition-all cursor-pointer ${
                selectedDayFilter === day
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportScheduleJSON}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12.5px] font-semibold transition-colors cursor-pointer"
            title="Export Schedule as JSON"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class / Event</span>
          </button>
        </div>
      </div>

      {/* Schedule Table / Cards List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-[15px] font-bold text-slate-900">
              Timetable &amp; Lecture Classes ({filteredEvents.length})
            </h3>
          </div>
          <span className="text-[12px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            Firebase Firestore Synced
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-500" />
            <p className="text-[15px] font-medium text-slate-600">No classes found</p>
            <p className="text-[13px] text-slate-400 mt-1">
              Try adjusting your day filter or search keywords, or add a new class.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-[12px] uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Course &amp; Title</th>
                  <th className="py-3 px-4">Day &amp; Time</th>
                  <th className="py-3 px-4">Venue</th>
                  <th className="py-3 px-4">Lecturer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-blue-600 mr-2">{evt.course}</span>
                        <span className="font-medium text-slate-900">{evt.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {evt.tags?.map((t, i) => (
                          <span key={i} className="text-[10.5px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11.5px] font-bold mr-2">
                        {evt.dayKey}
                      </span>
                      <span className="text-[12.5px]">{evt.time}</span>
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
                        <span className="px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-amber-50 text-amber-600">
                          Postponed
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-emerald-50 text-emerald-600">
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
                ))}
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
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Add New Class to Timetable</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-[13.5px]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Course Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CHM 101"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-semibold uppercase"
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Day *</label>
                    <select
                      value={formData.dayKey}
                      onChange={(e) => setFormData({ ...formData, dayKey: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-semibold bg-white"
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
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Class: {editingEvent.course}</h3>
                </div>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-[13.5px]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Course Code</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.course}
                      onChange={(e) => setEditingEvent({ ...editingEvent, course: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-semibold uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Course Title</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.title}
                      onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
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
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
