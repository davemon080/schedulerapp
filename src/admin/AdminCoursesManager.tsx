import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  RefreshCw,
  FileText,
  Building2,
  GraduationCap,
  Filter,
  ExternalLink,
  Layers
} from 'lucide-react';
import { CourseRecord, DepartmentRecord } from './types';
import { 
  fetchCourses, 
  createCourse, 
  updateCourse, 
  deleteCourse,
  fetchDepartments 
} from '../lib/dbService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminCoursesManagerProps {
  onCourseChanged?: () => void;
}

export const AdminCoursesManager: React.FC<AdminCoursesManagerProps> = ({
  onCourseChanged,
}) => {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCourse, setEditingCourse] = useState<CourseRecord | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<CourseRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    courseCode: '',
    title: '',
    description: '',
    department_id: '',
    units: 3,
    semester: '1st Semester',
    pdfurl: '',
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
    const [coursesData, deptsData] = await Promise.all([
      fetchCourses(),
      fetchDepartments(),
    ]);
    setCourses(coursesData);
    setDepartments(deptsData);
    if (deptsData.length > 0 && !formData.department_id) {
      setFormData((prev) => ({ ...prev, department_id: deptsData[0].id }));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setFormData({
      courseCode: '',
      title: '',
      description: '',
      department_id: departments[0]?.id || '',
      units: 3,
      semester: '1st Semester',
      pdfurl: '',
      level: 100,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: CourseRecord) => {
    setEditingCourse(course);
    setFormData({
      courseCode: course.courseCode,
      title: course.title,
      description: course.description || '',
      department_id: course.department_id || departments[0]?.id || '',
      units: course.units || 3,
      semester: course.semester || '1st Semester',
      pdfurl: course.pdfurl || '',
      level: course.level || 100,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseCode.trim() || !formData.title.trim()) {
      showToast('Course code and title are required');
      return;
    }

    setIsSubmitting(true);
    if (editingCourse) {
      const ok = await updateCourse(editingCourse.id, {
        courseCode: formData.courseCode.trim().toUpperCase(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        department_id: formData.department_id || departments[0]?.id,
        units: formData.units,
        semester: formData.semester,
        pdfurl: formData.pdfurl.trim() || undefined,
        level: formData.level,
      });

      if (ok) {
        showToast('Course updated in catalog');
        setIsModalOpen(false);
        await loadData();
        onCourseChanged?.();
      } else {
        showToast('Failed to update course');
      }
    } else {
      const created = await createCourse({
        courseCode: formData.courseCode.trim().toUpperCase(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        department_id: formData.department_id || departments[0]?.id,
        units: formData.units,
        semester: formData.semester,
        pdfurl: formData.pdfurl.trim() || undefined,
        level: formData.level,
      });

      if (created) {
        showToast(`Course "${created.courseCode}" registered`);
        setIsModalOpen(false);
        await loadData();
        onCourseChanged?.();
      } else {
        showToast('Failed to register course');
      }
    }
    setIsSubmitting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;
    setIsDeleting(true);
    const ok = await deleteCourse(deletingCourse.id);
    if (ok) {
      showToast(`Course "${deletingCourse.courseCode}" deleted`);
      await loadData();
      onCourseChanged?.();
      setDeletingCourse(null);
    } else {
      showToast('Failed to delete course');
    }
    setIsDeleting(false);
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch = 
      c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSemester = semesterFilter === 'all' || c.semester === semesterFilter;
    const matchesLevel = levelFilter === 'all' || c.level?.toString() === levelFilter;
    const matchesDept = deptFilter === 'all' || c.department_id === deptFilter;

    return matchesSearch && matchesSemester && matchesLevel && matchesDept;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">Course Syllabus Catalog</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              {courses.length} courses
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage course codes, credit units, departmental allocations, and syllabus PDFs (table: <code className="font-mono text-blue-600">courses</code>).
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
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search course code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Levels</option>
            <option value="100">100 Level</option>
            <option value="200">200 Level</option>
            <option value="300">300 Level</option>
            <option value="400">400 Level</option>
            <option value="500">500 Level</option>
          </select>

          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Semesters</option>
            <option value="1st Semester">1st Semester</option>
            <option value="2nd Semester">2nd Semester</option>
          </select>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
            </div>
          ))
        ) : filteredCourses.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-800">No courses in catalog</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add course modules with units and department linkages to display in student timetables.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Course</span>
            </button>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-100">
                      {course.courseCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {course.units ? `${course.units} Units` : '3 Units'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditModal(course)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit Course"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCourse(course)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{course.title}</h4>
                  {course.description ? (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1 italic">No syllabus description provided</p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[130px]">
                      {course.department_name || departments.find((d) => d.id === course.department_id)?.name || 'Department'}
                    </span>
                  </span>
                  <span className="font-semibold text-slate-700">
                    {course.level ? `${course.level}L` : '100L'} &bull; {course.semester || '1st Sem'}
                  </span>
                </div>

                {course.pdfurl && (
                  <a
                    href={course.pdfurl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <FileText className="w-3 h-3" />
                    <span>View Syllabus PDF</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCourse ? 'Edit Course Catalog' : 'Register New Course'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSC 101"
                    value={formData.courseCode}
                    onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Credit Units
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={formData.units}
                    onChange={(e) => setFormData({ ...formData, units: parseInt(e.target.value, 10) || 3 })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Introduction to Computer Science & Programming"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Syllabus / Lecture PDF URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://.../syllabus.pdf"
                    value={formData.pdfurl}
                    onChange={(e) => setFormData({ ...formData, pdfurl: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Description / Outline
                </label>
                <textarea
                  rows={3}
                  placeholder="Topics covered, learning objectives, required textbooks..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
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
                  <span>{editingCourse ? 'Update Course' : 'Save Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Course Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingCourse)}
        onClose={() => setDeletingCourse(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Course from Catalog"
        itemType="course"
        itemName={deletingCourse ? `${deletingCourse.courseCode} - ${deletingCourse.title} (${deletingCourse.units} Units)` : undefined}
        description="Are you sure you want to delete this course from the university catalog? Students will no longer be able to view its syllabus or materials."
        confirmLabel="Yes, Delete Course"
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
