import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  RefreshCw,
  Layers,
  Sparkles,
  BookOpen,
  Filter
} from 'lucide-react';
import { DepartmentRecord } from './types';
import { fetchDepartments, createDepartment, updateDepartment, deleteDepartment } from '../lib/dbService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminDepartmentsManagerProps {
  departments?: DepartmentRecord[];
  onDepartmentChanged?: () => void;
}

export const AdminDepartmentsManager: React.FC<AdminDepartmentsManagerProps> = ({
  departments: propDepartments,
  onDepartmentChanged,
}) => {
  const [departments, setDepartments] = useState<DepartmentRecord[]>(propDepartments || []);
  const [isLoading, setIsLoading] = useState<boolean>(!propDepartments || propDepartments.length === 0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [deletingDept, setDeletingDept] = useState<DepartmentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    level: 100,
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchDepartments();
    if (data && data.length > 0) {
      setDepartments(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (propDepartments && propDepartments.length > 0) {
      setDepartments(propDepartments);
      setIsLoading(false);
    } else {
      loadData();
    }
  }, [propDepartments]);

  const handleOpenAddModal = () => {
    setEditingDept(null);
    setFormData({
      name: '',
      code: '',
      level: 100,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dept: DepartmentRecord) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      level: dept.level || 100,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast('Please fill in department name and code');
      return;
    }

    setIsSubmitting(true);
    if (editingDept) {
      const ok = await updateDepartment(editingDept.id, {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        level: formData.level,
      });
      if (ok) {
        showToast('Department updated successfully');
        setIsModalOpen(false);
        setDepartments(prev => prev.map(d => d.id === editingDept.id ? {
          ...d,
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          level: formData.level,
        } : d));
        await loadData();
        onDepartmentChanged?.();
      } else {
        showToast('Failed to update department');
      }
    } else {
      const created = await createDepartment({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        level: formData.level,
      });
      if (created) {
        showToast(`Department "${created.name}" created`);
        setIsModalOpen(false);
        setDepartments(prev => [...prev.filter(d => d.id !== created.id), created]);
        await loadData();
        onDepartmentChanged?.();
      } else {
        showToast('Failed to create department');
      }
    }
    setIsSubmitting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDept) return;
    setIsDeleting(true);
    const ok = await deleteDepartment(deletingDept.id);
    if (ok) {
      showToast(`Department "${deletingDept.name}" deleted`);
      setDepartments(prev => prev.filter(d => d.id !== deletingDept.id));
      await loadData();
      onDepartmentChanged?.();
      setDeletingDept(null);
    } else {
      showToast('Error removing department');
    }
    setIsDeleting(false);
  };

  const filteredDepts = departments.filter((d) => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'all' || d.level?.toString() === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">Academic Departments</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              {departments.length} active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department codes (e.g. <strong className="text-blue-700">ICH</strong> for Industrial Chemistry, <strong className="text-emerald-700">CHM</strong> for Chemistry) are used to automatically place students into their respective departments based on their matriculation numbers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Matric Auto-Routing Notice */}
      <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-slate-900">Smart Matriculation Auto-Detection Active</h4>
          <p className="text-slate-600 leading-relaxed">
            When students register or sign in with their matric number (e.g., <code className="px-1.5 py-0.5 rounded bg-white font-mono font-bold text-blue-700 border border-blue-200">2025/ps/ich/0001</code> &rarr; <strong>Industrial Chemistry</strong>, <code className="px-1.5 py-0.5 rounded bg-white font-mono font-bold text-emerald-700 border border-emerald-200">2025/ps/chm/0001</code> &rarr; <strong>Chemistry</strong>), the portal automatically resolves their department, matching courses, and lecture schedules without manual intervention.
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or code (e.g. CSC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Academic Levels</option>
            <option value="100">100 Level</option>
            <option value="200">200 Level</option>
            <option value="300">300 Level</option>
            <option value="400">400 Level</option>
            <option value="500">500 Level</option>
          </select>
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))
        ) : filteredDepts.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-800">No departments found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first department to start structuring course catalogs and academic schedules.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Create Department</span>
            </button>
          </div>
        ) : (
          filteredDepts.map((dept) => (
            <div
              key={dept.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm tracking-tight border border-blue-100">
                    {dept.code}
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditModal(dept)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit Department"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingDept(dept)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{dept.name}</h4>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-700">
                      Code: {dept.code}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-slate-600">
                      {dept.level ? `${dept.level} Level` : 'All Levels'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono truncate max-w-[160px]" title={dept.id}>
                  ID: {dept.id.substring(0, 8)}...
                </span>
                <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingDept ? 'Edit Department' : 'Create Department'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Department of Industrial Chemistry"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department Code * (Used in Matric No.)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ICH or CHM"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Level
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value={100}>100 Level</option>
                    <option value={200}>200 Level</option>
                    <option value={300}>300 Level</option>
                    <option value={400}>400 Level</option>
                    <option value={500}>500 Level</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{editingDept ? 'Update Department' : 'Save Department'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Department Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingDept)}
        onClose={() => setDeletingDept(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Academic Department"
        itemType="department"
        itemName={deletingDept ? `${deletingDept.name} (${deletingDept.code})` : undefined}
        description="Are you sure you want to delete this department? Linked course catalogs and timetable activities associated with this department may also be impacted."
        confirmLabel="Yes, Delete Department"
        isDeleting={isDeleting}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border border-slate-800">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
