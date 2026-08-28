import React, { useState } from 'react';
import { AssignmentItem } from '../types';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  X, 
  Save, 
  Download,
  AlertCircle,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminAssignmentsManagerProps {
  assignments: AssignmentItem[];
  searchQuery: string;
  onAddAssignment: (newAssign: Omit<AssignmentItem, 'id'>) => Promise<void>;
  onUpdateAssignment: (id: string, updated: Partial<AssignmentItem>) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const AdminAssignmentsManager: React.FC<AdminAssignmentsManagerProps> = ({
  assignments,
  searchQuery,
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<AssignmentItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    course: '',
    title: '',
    description: '',
    dueDate: '2026-10-25',
    dueTime: '11:59 PM',
    priority: 'High' as AssignmentItem['priority'],
    submissionType: 'Online Portal',
    instructor: '',
    maxGrade: '100 pts',
    notes: '',
  });

  const filteredAssignments = assignments.filter((item) => {
    const matchesPriority = priorityFilter === 'ALL' || item.priority === priorityFilter;
    const matchesSearch = 
      !searchQuery ||
      item.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course || !formData.title || !formData.dueDate) return;

    setIsSaving(true);
    try {
      await onAddAssignment({
        course: formData.course,
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        priority: formData.priority,
        isCompleted: false,
        images: [],
        submissionType: formData.submissionType,
        instructor: formData.instructor,
        maxGrade: formData.maxGrade,
        notes: formData.notes,
      });

      setFormData({
        course: '',
        title: '',
        description: '',
        dueDate: '2026-10-25',
        dueTime: '11:59 PM',
        priority: 'High',
        submissionType: 'Online Portal',
        instructor: '',
        maxGrade: '100 pts',
        notes: '',
      });
      setIsAddModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;

    setIsSaving(true);
    try {
      await onUpdateAssignment(editingAssignment.id, {
        course: editingAssignment.course,
        title: editingAssignment.title,
        description: editingAssignment.description,
        dueDate: editingAssignment.dueDate,
        dueTime: editingAssignment.dueTime,
        priority: editingAssignment.priority,
        submissionType: editingAssignment.submissionType,
        maxGrade: editingAssignment.maxGrade,
      });
      setEditingAssignment(null);
    } finally {
      setIsSaving(false);
    }
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(assignments, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `assignments_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleConfirmDelete = async () => {
    if (!deletingAssignment) return;
    setIsDeleting(true);
    try {
      await onDeleteAssignment(deletingAssignment.id);
      setDeletingAssignment(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-500 flex items-center gap-1.5 mr-1">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Priority:</span>
          </span>
          {(['ALL', 'High', 'Medium', 'Low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-xl text-[12.5px] font-semibold transition-all cursor-pointer ${
                priorityFilter === p
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12.5px] font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Deadline / Task</span>
          </button>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="text-[15px] font-bold text-slate-900">
              Active Deadlines &amp; Assignments ({filteredAssignments.length})
            </h3>
          </div>
          <span className="text-[12px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            Firebase Synchronized
          </span>
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-500" />
            <p className="text-[15px] font-medium text-slate-600">No assignments found</p>
            <p className="text-[13px] text-slate-400 mt-1">Publish a new coursework task or adjust filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-[12px] uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Course &amp; Title</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Submission Method</th>
                  <th className="py-3 px-4">Grading</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssignments.map((asn) => (
                  <tr key={asn.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-blue-600 mr-2">{asn.course}</span>
                        <span className="font-medium text-slate-900">{asn.title}</span>
                      </div>
                      <p className="text-[12px] text-slate-500 line-clamp-1 mt-0.5">{asn.description}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-900">{asn.dueDate}</span>
                        <span className="text-slate-400 text-[12px]">{asn.dueTime || '11:59 PM'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11.5px] font-bold ${
                          asn.priority === 'High'
                            ? 'bg-red-50 text-red-600'
                            : asn.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {asn.priority} Priority
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <span className="text-[12.5px]">{asn.submissionType || 'Online Portal'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <span className="text-[12.5px] font-bold text-slate-800">{asn.maxGrade || '100%'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingAssignment(asn)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Assignment"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingAssignment(asn)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Assignment"
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

      {/* Add Assignment Modal */}
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
                  <h3 className="text-lg font-bold text-slate-900">Create Academic Deadline</h3>
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
                    <label className="block text-slate-700 font-semibold mb-1">Assignment Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Thermodynamics Problem Set #3"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Description / Brief</label>
                  <textarea
                    rows={2}
                    placeholder="Provide overview or problem numbers..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Due Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Due Time</label>
                    <input
                      type="text"
                      value={formData.dueTime}
                      onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 bg-white"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Submission Method</label>
                    <input
                      type="text"
                      placeholder="e.g. Student Portal Upload"
                      value={formData.submissionType}
                      onChange={(e) => setFormData({ ...formData, submissionType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Max Grade / Weight</label>
                    <input
                      type="text"
                      placeholder="e.g. 15% CA / 100 pts"
                      value={formData.maxGrade}
                      onChange={(e) => setFormData({ ...formData, maxGrade: e.target.value })}
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
                    <span>{isSaving ? 'Saving...' : 'Publish Deadline'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingAssignment && (
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
                  <h3 className="text-lg font-bold text-slate-900">Edit Deadline: {editingAssignment.course}</h3>
                </div>
                <button
                  onClick={() => setEditingAssignment(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-[13.5px]">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assignment Title</label>
                  <input
                    type="text"
                    required
                    value={editingAssignment.title}
                    onChange={(e) => setEditingAssignment({ ...editingAssignment, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Due Date</label>
                    <input
                      type="text"
                      value={editingAssignment.dueDate}
                      onChange={(e) => setEditingAssignment({ ...editingAssignment, dueDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Due Time</label>
                    <input
                      type="text"
                      value={editingAssignment.dueTime || ''}
                      onChange={(e) => setEditingAssignment({ ...editingAssignment, dueTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Priority</label>
                    <select
                      value={editingAssignment.priority}
                      onChange={(e) => setEditingAssignment({ ...editingAssignment, priority: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 bg-white"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingAssignment(null)}
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
                    <span>{isSaving ? 'Updating...' : 'Update Deadline'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Assignment Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingAssignment)}
        onClose={() => setDeletingAssignment(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Academic Deadline"
        itemType="assignment / deadline"
        itemName={deletingAssignment ? `${deletingAssignment.course} - ${deletingAssignment.title} (Due: ${deletingAssignment.dueDate})` : undefined}
        description="Are you sure you want to delete this assignment deadline? It will be removed from student task boards and upcoming submission alerts."
        confirmLabel="Yes, Delete Deadline"
        isDeleting={isDeleting}
      />
    </div>
  );
};
