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
    yearsOfStudy: 4,
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
      yearsOfStudy: 4,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dept: DepartmentRecord) => {
    setEditingDept(dept);
    const duration = dept.yearsOfStudy || dept.duration_years || dept.durationYears || (dept.maxLevel ? Math.floor(dept.maxLevel / 100) : 4);
    setFormData({
      name: dept.name,
      code: dept.code,
      level: dept.level || 100,
      yearsOfStudy: duration,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast('Please fill in department name and code');
      return;
    }

    const durationYears = formData.yearsOfStudy || 4;
    const maxLevel = durationYears * 100;

    setIsSubmitting(true);
    if (editingDept) {
      const ok = await updateDepartment(editingDept.id, {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        level: formData.level,
        yearsOfStudy: durationYears,
        duration_years: durationYears,
        durationYears: durationYears,
        maxLevel: maxLevel,
        max_level: maxLevel,
      });
      if (ok) {
        showToast('Department updated successfully');
        setIsModalOpen(false);
        setDepartments(prev => prev.map(d => d.id === editingDept.id ? {
          ...d,
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          level: formData.level,
          yearsOfStudy: durationYears,
          duration_years: durationYears,
          durationYears: durationYears,
          maxLevel: maxLevel,
          max_level: maxLevel,
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
        yearsOfStudy: durationYears,
        duration_years: durationYears,
        maxLevel: maxLevel,
      });
      if (created) {
        showToast(`Department "${created.name}" created (${durationYears} Years • Up to ${maxLevel}L)`);
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
          filteredDepts.map((dept) => {
            const dur = dept.yearsOfStudy || dept.duration_years || dept.durationYears || (dept.maxLevel ? Math.floor(dept.maxLevel / 100) : 4);
            const maxLvl = dept.maxLevel || dept.max_level || dur * 100;
            return (
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Edit Department"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingDept(dept)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{dept.name}</h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs text-slate-500">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-700 font-bold">
                        Code: {dept.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-100">
                        {dur} Years of Study ({maxLvl}L)
                      </span>
                    </div>

                    {/* Progress levels chips */}
                    <div className="flex items-center gap-1 mt-2.5">
                      {Array.from({ length: dur }).map((_, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60"
                        >
                          {(idx + 1) * 100}L
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono truncate max-w-[150px]" title={dept.id}>
                    ID: {dept.id.substring(0, 8)}...
                  </span>
                  <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Active Curriculum
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingDept ? 'Edit Department' : 'Create Department'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Department of Pharmacy / Industrial Chemistry"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PHA, ICH, CSC"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-blue-700"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Used in student matric numbers</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Years of Study *
                  </label>
                  <select
                    value={formData.yearsOfStudy}
                    onChange={(e) => setFormData({ ...formData, yearsOfStudy: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value={3}>3 Years (Diploma / Direct Entry • 100L-300L)</option>
                    <option value={4}>4 Years (Standard Degree • 100L-400L)</option>
                    <option value={5}>5 Years (Engineering / Tech / Pharmacy • 100L-500L)</option>
                    <option value={6}>6 Years (Medicine / Vet • 100L-600L)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Supported Level Preview */}
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200/70 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900">Curriculum Progression Preview:</span>
                  <span className="font-extrabold text-blue-700">Up to {(formData.yearsOfStudy || 4) * 100} Level</span>
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: formData.yearsOfStudy || 4 }).map((_, idx) => (
                    <span
                      key={idx}
                      className="flex-1 py-1 text-center font-bold text-[11px] rounded-lg bg-white text-blue-700 border border-blue-200/80 shadow-2xs"
                    >
                      {(idx + 1) * 100}L
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-blue-600/90 leading-tight">
                  Students enrolled in this department will automatically progress up to {(formData.yearsOfStudy || 4) * 100}L before graduating.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
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
