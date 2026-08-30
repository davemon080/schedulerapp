import React, { useState, useMemo } from 'react';
import { AssignmentItem } from '../types';
import { DepartmentRecord } from './types';
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
  Tag,
  Building2,
  Layers,
  BookOpen,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminAssignmentsManagerProps {
  assignments: AssignmentItem[];
  departments?: DepartmentRecord[];
  searchQuery: string;
  currentSemester?: string;
  onAddAssignment: (newAssign: Omit<AssignmentItem, 'id'>) => Promise<void>;
  onUpdateAssignment: (id: string, updated: Partial<AssignmentItem>) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const AdminAssignmentsManager: React.FC<AdminAssignmentsManagerProps> = ({
  assignments,
  departments = [],
  searchQuery,
  currentSemester = '1st Semester',
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('ALL');
  const [selectedSemFilter, setSelectedSemFilter] = useState<string>('ALL');

  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<AssignmentItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    course: '',
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '11:59 PM',
    priority: 'High' as AssignmentItem['priority'],
    submissionType: 'Online Portal',
    instructor: '',
    maxGrade: '100 pts',
    notes: '',
    department_id: departments[0]?.id || 'dept-ich',
    level: 100,
    semester: currentSemester || '1st Semester',
  });

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      // Priority filter
      const matchesPriority = priorityFilter === 'ALL' || item.priority === priorityFilter;

      // Department filter
      const matchesDept = 
        selectedDeptFilter === 'ALL' || 
        item.department_id === selectedDeptFilter ||
        (selectedDeptFilter === 'dept-ich' && !item.department_id);

      // Level filter
      const itemLevel = item.level || (item.course ? parseInt(item.course.replace(/\D/g, '').substring(0, 1) + '00', 10) : 100);
      const matchesLevel = selectedLevelFilter === 'ALL' || String(itemLevel) === selectedLevelFilter;

      // Semester filter
      const itemSem = item.semester || '1st Semester';
      const matchesSem = selectedSemFilter === 'ALL' || itemSem.toLowerCase().includes(selectedSemFilter.toLowerCase().replace(' semester', ''));

      // Search query
      const matchesSearch = 
        !searchQuery ||
        item.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesPriority && matchesDept && matchesLevel && matchesSem && matchesSearch;
    });
  }, [assignments, priorityFilter, selectedDeptFilter, selectedLevelFilter, selectedSemFilter, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course || !formData.title || !formData.dueDate) return;

    setIsSaving(true);
    try {
      await onAddAssignment({
        course: formData.course.trim().toUpperCase(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        priority: formData.priority,
        isCompleted: false,
        images: [],
        submissionType: formData.submissionType,
        instructor: formData.instructor,
        maxGrade: formData.maxGrade,
        notes: formData.notes,
        department_id: formData.department_id,
        level: Number(formData.level) || 100,
        semester: formData.semester,
      });

      setFormData({
        course: '',
        title: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        dueTime: '11:59 PM',
        priority: 'High',
        submissionType: 'Online Portal',
        instructor: '',
        maxGrade: '100 pts',
        notes: '',
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
        department_id: editingAssignment.department_id,
        level: editingAssignment.level,
        semester: editingAssignment.semester,
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

  const resetFilters = () => {
    setPriorityFilter('ALL');
    setSelectedDeptFilter('ALL');
    setSelectedLevelFilter('ALL');
    setSelectedSemFilter('ALL');
  };

  const hasActiveFilters = priorityFilter !== 'ALL' || selectedDeptFilter !== 'ALL' || selectedLevelFilter !== 'ALL' || selectedSemFilter !== 'ALL';

  return (
    <div className="p-6 space-y-6">
      {/* Advanced Multi-Tier Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Deadline &amp; Assignment Filters</h4>
              <p className="text-xs text-slate-500">Filter coursework deadlines by Department, Level (100L - 500L), Semester and Priority.</p>
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
              onClick={exportJSON}
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
              <span>New Deadline / Task</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
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

          {/* Priority Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-red-600" />
              Urgency / Priority:
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Active Deadlines &amp; Assignments ({filteredAssignments.length})
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
            Firebase Synchronized
          </span>
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText className="w-12 h-12 mx-auto opacity-30 text-slate-500" />
            <p className="text-sm font-medium text-slate-600">No assignments or deadlines matching filters</p>
            <p className="text-xs text-slate-400">Publish a new coursework task or adjust your filters.</p>
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
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Submission Method</th>
                  <th className="py-3 px-4">Grading</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssignments.map((asn) => {
                  const matchedDept = departments.find(d => d.id === asn.department_id);
                  const deptCode = matchedDept?.code || (asn.department_id ? asn.department_id.replace('dept-', '').toUpperCase() : 'ICH');
                  const asnLevel = asn.level || (asn.course ? parseInt(asn.course.replace(/\D/g, '').substring(0, 1) + '00', 10) : 100);
                  const asnSem = asn.semester || '1st Sem';

                  return (
                    <tr key={asn.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-blue-600 mr-2">{asn.course}</span>
                          <span className="font-semibold text-slate-900">{asn.title}</span>
                        </div>
                        <p className="text-[11.5px] text-slate-500 line-clamp-1 mt-0.5">{asn.description}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-100">
                            {deptCode}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-100">
                            {asnLevel}L
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {asnSem.replace('ester', '')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-900">{asn.dueDate}</span>
                          <span className="text-slate-400 text-[11px]">{asn.dueTime || '11:59 PM'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            asn.priority === 'High'
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : asn.priority === 'Medium'
                              ? 'bg-amber-50 text-amber-600 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}
                        >
                          {asn.priority} Priority
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <span className="text-[11.5px]">{asn.submissionType || 'Online Portal'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <span className="text-[11.5px] font-bold text-slate-800">{asn.maxGrade || '100%'}</span>
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
                  );
                })}
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
              className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Create Academic Deadline</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
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
                    <label className="block text-slate-700 font-semibold mb-1">Assignment Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Thermodynamics Problem Set #3"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-medium"
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
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/20"
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
              className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Edit Deadline: {editingAssignment.course}</h3>
                </div>
                <button
                  onClick={() => setEditingAssignment(null)}
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
                        value={editingAssignment.department_id || departments[0]?.id || 'dept-ich'}
                        onChange={(e) => setEditingAssignment({ ...editingAssignment, department_id: e.target.value })}
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
                        value={editingAssignment.level || 100}
                        onChange={(e) => setEditingAssignment({ ...editingAssignment, level: parseInt(e.target.value, 10) })}
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
                        value={editingAssignment.semester || '1st Semester'}
                        onChange={(e) => setEditingAssignment({ ...editingAssignment, semester: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                      >
                        <option value="1st Semester">1st Semester</option>
                        <option value="2nd Semester">2nd Semester</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assignment Title</label>
                  <input
                    type="text"
                    required
                    value={editingAssignment.title}
                    onChange={(e) => setEditingAssignment({ ...editingAssignment, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-medium"
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
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/20"
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
