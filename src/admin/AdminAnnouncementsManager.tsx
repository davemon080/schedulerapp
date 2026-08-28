import React, { useState } from 'react';
import { NotificationItem } from '../types';
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
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminAnnouncementsManagerProps {
  notifications: NotificationItem[];
  searchQuery: string;
  onAddNotification: (newNotif: Omit<NotificationItem, 'id' | 'timestamp'>) => Promise<void>;
  onUpdateNotification?: (id: string, updatedFields: Partial<NotificationItem>) => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const AdminAnnouncementsManager: React.FC<AdminAnnouncementsManagerProps> = ({
  notifications,
  searchQuery,
  onAddNotification,
  onUpdateNotification,
  onDeleteNotification,
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'alert' as NotificationItem['type'],
    category: 'schedule' as NotificationItem['category'],
    targetAudience: 'All Faculty Students',
  });

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<NotificationItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Modal State
  const [deletingItem, setDeletingItem] = useState<NotificationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredNotifs = notifications.filter((item) => {
    return (
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
      });
      setIsAddModalOpen(false);
      setFormData({
        title: '',
        message: '',
        type: 'alert',
        category: 'schedule',
        targetAudience: 'All Faculty Students',
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

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
            <Radio className="w-4 h-4 text-purple-600 animate-pulse" />
            <span>Campus Broadcast Channel</span>
          </h3>
          <p className="text-[12.5px] text-slate-500 font-medium">
            Broadcast emergency alerts, timetable room changes, and official announcements to all student app feeds.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[13px] font-semibold shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
          <span>New Broadcast</span>
        </button>
      </div>

      {/* Broadcast Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotifs.length === 0 ? (
          <div className="col-span-2 bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30 text-purple-600" />
            <p className="text-[15px] font-medium text-slate-600">No broadcast notices found</p>
            <p className="text-[13px] text-slate-400 mt-1">Post a new bulletin for students.</p>
          </div>
        ) : (
          filteredNotifs.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-purple-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-2 rounded-xl ${
                        item.type === 'alert'
                          ? 'bg-amber-50 text-amber-600'
                          : item.type === 'success'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                    </span>
                    <h4 className="text-[15px] font-bold text-slate-900 leading-snug">{item.title}</h4>
                  </div>

                  <div className="flex items-center gap-1">
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

                <p className="text-[13px] text-slate-600 leading-relaxed mt-2 pl-9">{item.message}</p>
              </div>

              <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-100 text-[12px] text-slate-400 pl-9">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.time || 'Today'}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600 text-[11px] capitalize">
                  {item.type || 'Notice'}
                </span>
              </div>
            </div>
          ))
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
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Broadcast Campus Notification</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-[13.5px]">
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
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Campus Broadcast</h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-[13.5px]">
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
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
