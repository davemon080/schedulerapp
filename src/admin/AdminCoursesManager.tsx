import React, { useState, useEffect, useRef } from 'react';
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
  Filter,
  ExternalLink,
  Layers,
  Video,
  Upload,
  Eye,
  Download,
  Play,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  FolderOpen,
  Info,
  Youtube,
  AlertCircle
} from 'lucide-react';
import { CourseRecord, DepartmentRecord, CourseMaterialPdf, CourseMaterialVideo } from './types';
import { 
  fetchCourses, 
  createCourse, 
  updateCourse, 
  deleteCourse,
  fetchDepartments,
  addCoursePdfModule,
  deleteCoursePdfModule,
  addCourseVideoModule,
  deleteCourseVideoModule,
  purgeAllMockMaterials
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

  // Course Add/Edit Modal State
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

  // Materials Manager Drawer/Modal State
  const [selectedCourseForMaterials, setSelectedCourseForMaterials] = useState<CourseRecord | null>(null);
  const [activeMaterialTab, setActiveMaterialTab] = useState<'pdf' | 'video'>('pdf');

  // Add PDF Modal inside Material Manager
  const [isAddPdfOpen, setIsAddPdfOpen] = useState<boolean>(false);
  const [pdfUploadMode, setPdfUploadMode] = useState<'upload' | 'url'>('upload');
  const [pdfFormData, setPdfFormData] = useState({
    title: '',
    topic: '',
    pdfUrl: '',
    fileName: '',
    fileSize: '',
    description: '',
  });
  const [isSubmittingPdf, setIsSubmittingPdf] = useState(false);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);

  // Add Video Modal inside Material Manager
  const [isAddVideoOpen, setIsAddVideoOpen] = useState<boolean>(false);
  const [videoUploadMode, setVideoUploadMode] = useState<'youtube' | 'url'>('youtube');
  const [videoFormData, setVideoFormData] = useState({
    title: '',
    topic: '',
    videoUrl: '',
    duration: '',
    fileSize: '',
    fileName: '',
    videoType: 'youtube' as 'youtube' | 'uploaded',
    lecturer: '',
    description: '',
  });
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);
  const [isFetchingYt, setIsFetchingYt] = useState(false);

  // Delete Material Modal State
  const [materialToDelete, setMaterialToDelete] = useState<{
    type: 'pdf' | 'video';
    item: CourseMaterialPdf | CourseMaterialVideo;
  } | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  // Preview Modals
  const [previewingPdf, setPreviewingPdf] = useState<CourseMaterialPdf | null>(null);
  const [playingVideo, setPlayingVideo] = useState<CourseMaterialVideo | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async (purgeFirst = false) => {
    setIsLoading(true);
    if (purgeFirst) {
      await purgeAllMockMaterials();
    }
    const [coursesData, deptsData] = await Promise.all([
      fetchCourses(),
      fetchDepartments(),
    ]);
    setCourses(coursesData);
    setDepartments(deptsData);

    // Keep active selected course in sync if open
    if (selectedCourseForMaterials) {
      const refreshedCourse = coursesData.find((c) => c.id === selectedCourseForMaterials.id);
      if (refreshedCourse) {
        setSelectedCourseForMaterials(refreshedCourse);
      }
    }

    if (deptsData.length > 0 && !formData.department_id) {
      setFormData((prev) => ({ ...prev, department_id: deptsData[0].id }));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Purge mock materials and load fresh real catalog
    loadData(true);
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
      if (selectedCourseForMaterials?.id === deletingCourse.id) {
        setSelectedCourseForMaterials(null);
      }
      await loadData();
      onCourseChanged?.();
      setDeletingCourse(null);
    } else {
      showToast('Failed to delete course');
    }
    setIsDeleting(false);
  };

  // Quick Purge Button
  const handlePurgeMockData = async () => {
    setIsLoading(true);
    const purged = await purgeAllMockMaterials();
    showToast(`Purged mock materials from ${purged} courses. Database is clean.`);
    await loadData();
  };

  // Helper for YouTube embed
  const isYouTubeUrl = (url: string) => {
    return /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)/i.test(url);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`;
      }
      return url;
    } catch {
      return url;
    }
  };

  // PDF File Upload Handler
  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const rawName = file.name;
    const cleanTitle = rawName.replace(/\.[^/.]+$/, '').replace(/[_.-]+/g, ' ').trim();
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = `${sizeInMb} MB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPdfFormData((prev) => ({
        ...prev,
        title: prev.title.trim() ? prev.title : cleanTitle,
        fileName: rawName,
        fileSize: sizeStr,
        pdfUrl: dataUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Fetch YouTube Title & Info via oEmbed
  const fetchYouTubeInfo = async (url: string) => {
    if (!url.trim() || !isYouTubeUrl(url)) return;
    setIsFetchingYt(true);

    try {
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          setVideoFormData((prev) => ({
            ...prev,
            title: prev.title.trim() ? prev.title : data.title,
            lecturer: (!prev.lecturer || prev.lecturer === 'Department Lecturer') && data.author_name ? data.author_name : prev.lecturer,
            duration: prev.duration || 'Lecture Stream',
            videoType: 'youtube',
          }));
        }
      }
    } catch (err) {
      console.warn('Could not auto-fetch YouTube metadata:', err);
    } finally {
      setIsFetchingYt(false);
    }
  };

  // Add PDF Handler
  const handleSavePdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForMaterials) return;
    if (!pdfFormData.title.trim()) {
      showToast('Please enter a PDF title');
      return;
    }
    if (!pdfFormData.pdfUrl.trim()) {
      showToast('Please select a PDF file or enter a valid PDF link');
      return;
    }

    setIsSubmittingPdf(true);
    const newPdf: CourseMaterialPdf = {
      id: `pdf-${Date.now()}`,
      title: pdfFormData.title.trim(),
      topic: pdfFormData.topic.trim() || 'Course Handout',
      pdfUrl: pdfFormData.pdfUrl.trim(),
      fileName: pdfFormData.fileName.trim() || `${pdfFormData.title.trim()}.pdf`,
      fileSize: pdfFormData.fileSize.trim() || 'PDF Document',
      uploadedAt: 'Just now',
      description: pdfFormData.description.trim() || 'Course lecture note & reading materials.',
    };

    const updated = await addCoursePdfModule(selectedCourseForMaterials.id, newPdf);
    if (updated) {
      setSelectedCourseForMaterials(updated);
      setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      showToast(`PDF handout "${newPdf.title}" added to ${selectedCourseForMaterials.courseCode}`);
    } else {
      const localUpdated: CourseRecord = {
        ...selectedCourseForMaterials,
        pdfModules: [newPdf, ...(selectedCourseForMaterials.pdfModules || [])],
      };
      setSelectedCourseForMaterials(localUpdated);
      setCourses((prev) => prev.map((c) => (c.id === localUpdated.id ? localUpdated : c)));
      showToast(`PDF handout added locally`);
    }

    setPdfFormData({
      title: '',
      topic: '',
      pdfUrl: '',
      fileName: '',
      fileSize: '',
      description: '',
    });
    setIsAddPdfOpen(false);
    setIsSubmittingPdf(false);
    onCourseChanged?.();
  };

  // Add Video Handler
  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForMaterials) return;
    if (!videoFormData.title.trim()) {
      showToast('Please enter a video title');
      return;
    }
    if (!videoFormData.videoUrl.trim()) {
      showToast('Please enter a video link or YouTube URL');
      return;
    }

    setIsSubmittingVideo(true);
    const isYt = videoUploadMode === 'youtube' || isYouTubeUrl(videoFormData.videoUrl);

    const newVideo: CourseMaterialVideo = {
      id: `vid-${Date.now()}`,
      title: videoFormData.title.trim(),
      topic: videoFormData.topic.trim() || 'Lecture Recording',
      videoUrl: videoFormData.videoUrl.trim(),
      duration: videoFormData.duration.trim() || (isYt ? '45 mins' : '30 mins'),
      fileSize: videoFormData.fileSize.trim() || (isYt ? 'YouTube HD' : 'Video File'),
      fileName: videoFormData.fileName.trim() || (isYt ? 'YouTube Stream' : `${videoFormData.title.trim()}.mp4`),
      videoType: isYt ? 'youtube' : 'uploaded',
      lecturer: videoFormData.lecturer.trim() || 'Course Lecturer',
      uploadedAt: 'Just now',
      description: videoFormData.description.trim() || 'Lecture video demonstration and tutorial walkthrough.',
    };

    const updated = await addCourseVideoModule(selectedCourseForMaterials.id, newVideo);
    if (updated) {
      setSelectedCourseForMaterials(updated);
      setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      showToast(`Video lecture "${newVideo.title}" added to ${selectedCourseForMaterials.courseCode}`);
    } else {
      const localUpdated: CourseRecord = {
        ...selectedCourseForMaterials,
        videoModules: [newVideo, ...(selectedCourseForMaterials.videoModules || [])],
      };
      setSelectedCourseForMaterials(localUpdated);
      setCourses((prev) => prev.map((c) => (c.id === localUpdated.id ? localUpdated : c)));
      showToast(`Video lecture added locally`);
    }

    setVideoFormData({
      title: '',
      topic: '',
      videoUrl: '',
      duration: '',
      fileSize: '',
      fileName: '',
      videoType: 'youtube',
      lecturer: '',
      description: '',
    });
    setIsAddVideoOpen(false);
    setIsSubmittingVideo(false);
    onCourseChanged?.();
  };

  // Delete Material Handler
  const handleConfirmDeleteMaterial = async () => {
    if (!materialToDelete || !selectedCourseForMaterials) return;
    setIsDeletingMaterial(true);

    try {
      if (materialToDelete.type === 'pdf') {
        const updated = await deleteCoursePdfModule(selectedCourseForMaterials.id, materialToDelete.item.id);
        if (updated) {
          setSelectedCourseForMaterials(updated);
          setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        } else {
          const localUpdated: CourseRecord = {
            ...selectedCourseForMaterials,
            pdfModules: (selectedCourseForMaterials.pdfModules || []).filter((p) => p.id !== materialToDelete.item.id),
          };
          setSelectedCourseForMaterials(localUpdated);
          setCourses((prev) => prev.map((c) => (c.id === localUpdated.id ? localUpdated : c)));
        }
        showToast('PDF handout deleted successfully');
      } else {
        const updated = await deleteCourseVideoModule(selectedCourseForMaterials.id, materialToDelete.item.id);
        if (updated) {
          setSelectedCourseForMaterials(updated);
          setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        } else {
          const localUpdated: CourseRecord = {
            ...selectedCourseForMaterials,
            videoModules: (selectedCourseForMaterials.videoModules || []).filter((v) => v.id !== materialToDelete.item.id),
          };
          setSelectedCourseForMaterials(localUpdated);
          setCourses((prev) => prev.map((c) => (c.id === localUpdated.id ? localUpdated : c)));
        }
        showToast('Video lecture deleted successfully');
      }
      setMaterialToDelete(null);
      onCourseChanged?.();
    } catch (err) {
      console.error(err);
      showToast('Error deleting material');
    } finally {
      setIsDeletingMaterial(false);
    }
  };

  // Filter calculations
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

  const totalPdfsCount = courses.reduce((acc, c) => acc + (c.pdfModules?.length || 0), 0);
  const totalVideosCount = courses.reduce((acc, c) => acc + (c.videoModules?.length || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Top Header & Quick Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">Course Syllabus & Materials Manager</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
              {courses.length} Courses
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
              {totalPdfsCount} Real PDFs
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
              {totalVideosCount} Video Lectures
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage course codes, credit units, departments, and upload real PDF handouts and video lecture masterclasses across every department, level, and semester.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handlePurgeMockData}
            title="Clean and purge any lingering mock files from Firestore database"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Purge Mock Data</span>
          </button>

          <button
            onClick={() => loadData(false)}
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code, title, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
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
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
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
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
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
            <h4 className="text-sm font-semibold text-slate-800">No courses match selected filters</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Change the department, level, or semester filters above or register a new course module.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Course</span>
            </button>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const pdfs = course.pdfModules || [];
            const videos = course.videoModules || [];

            return (
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Edit Course Info"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCourse(course)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
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

                  {/* Material Count Badges */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        pdfs.length > 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        <FileText className="w-3 h-3" />
                        <span>{pdfs.length} PDF{pdfs.length === 1 ? '' : 's'}</span>
                      </span>

                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        videos.length > 0
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Video className="w-3 h-3" />
                        <span>{videos.length} Video{videos.length === 1 ? '' : 's'}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCourseForMaterials(course);
                        setActiveMaterialTab('pdf');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      <Layers className="w-3 h-3 text-blue-300" />
                      <span>Manage Materials</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= COURSE MATERIALS MANAGER DRAWER / MODAL ================= */}
      {selectedCourseForMaterials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                    {selectedCourseForMaterials.courseCode}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                    {selectedCourseForMaterials.level ? `${selectedCourseForMaterials.level} Level` : '100 Level'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                    {selectedCourseForMaterials.semester || '1st Semester'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                    {selectedCourseForMaterials.units ? `${selectedCourseForMaterials.units} Units` : '3 Units'}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {selectedCourseForMaterials.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Upload lecture handouts, past questions, and add video lecture masterclasses for this module.
                </p>
              </div>

              <button
                onClick={() => setSelectedCourseForMaterials(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Standalone Material Tabs */}
            <div className="flex items-center justify-between gap-3 pt-4 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMaterialTab('pdf')}
                  className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeMaterialTab === 'pdf'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 ${activeMaterialTab === 'pdf' ? 'text-rose-400' : 'text-slate-500'}`} />
                  <span>PDF Handouts</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    activeMaterialTab === 'pdf' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedCourseForMaterials.pdfModules?.length || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMaterialTab('video')}
                  className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeMaterialTab === 'video'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <Video className={`w-3.5 h-3.5 ${activeMaterialTab === 'video' ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>Video Lectures</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    activeMaterialTab === 'video' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedCourseForMaterials.videoModules?.length || 0}
                  </span>
                </button>
              </div>

              {activeMaterialTab === 'pdf' ? (
                <button
                  onClick={() => {
                    setPdfFormData({
                      title: '',
                      topic: '',
                      pdfUrl: '',
                      fileName: '',
                      fileSize: '',
                      description: '',
                    });
                    setIsAddPdfOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload / Add PDF</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setVideoFormData({
                      title: '',
                      topic: '',
                      videoUrl: '',
                      duration: '',
                      fileSize: '',
                      fileName: '',
                      videoType: 'youtube',
                      lecturer: '',
                      description: '',
                    });
                    setIsAddVideoOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Video Lecture</span>
                </button>
              )}
            </div>

            {/* Tab Contents: PDF List */}
            {activeMaterialTab === 'pdf' && (
              <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-1">
                {(selectedCourseForMaterials.pdfModules?.length || 0) === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">No PDFs uploaded for {selectedCourseForMaterials.courseCode}</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                        Upload lecture handouts, curriculum scheme of work, and past questions directly from your device.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddPdfOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload First PDF</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {selectedCourseForMaterials.pdfModules?.map((pdf) => (
                      <div
                        key={pdf.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-2xs transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-bold shrink-0 mt-0.5">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {pdf.topic && (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  {pdf.topic}
                                </span>
                              )}
                              {pdf.fileSize && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {pdf.fileSize}
                                </span>
                              )}
                              {pdf.uploadedAt && (
                                <span className="text-[10px] text-slate-400">
                                  • {pdf.uploadedAt}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 leading-snug">
                              {pdf.title}
                            </h4>
                            {pdf.fileName && (
                              <p className="text-[11px] font-mono text-slate-400 truncate">
                                📄 {pdf.fileName}
                              </p>
                            )}
                            {pdf.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                {pdf.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewingPdf(pdf)}
                            className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                            title="Preview PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={pdf.pdfUrl}
                            download={pdf.fileName || `${pdf.title}.pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setMaterialToDelete({ type: 'pdf', item: pdf })}
                            className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete PDF"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab Contents: Video List */}
            {activeMaterialTab === 'video' && (
              <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-1">
                {(selectedCourseForMaterials.videoModules?.length || 0) === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <Video className="w-10 h-10 text-slate-300 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">No video lectures for {selectedCourseForMaterials.courseCode}</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                        Attach YouTube lecture playlists, video recordings, and tutorial masterclasses.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddVideoOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Video Lecture</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {selectedCourseForMaterials.videoModules?.map((video) => (
                      <div
                        key={video.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 shadow-2xs transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0 mt-0.5">
                            {video.videoType === 'youtube' || isYouTubeUrl(video.videoUrl) ? (
                              <Youtube className="w-5 h-5 text-red-600" />
                            ) : (
                              <Video className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {video.topic && (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  {video.topic}
                                </span>
                              )}
                              {video.duration && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  ⏱️ {video.duration}
                                </span>
                              )}
                              {video.lecturer && (
                                <span className="text-[10px] font-medium text-slate-600">
                                  👨‍🏫 {video.lecturer}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 leading-snug">
                              {video.title}
                            </h4>
                            {video.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                {video.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPlayingVideo(video)}
                            className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                            title="Play Video"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Play</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMaterialToDelete({ type: 'video', item: video })}
                            className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Video"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ADD / UPLOAD PDF MODAL ================= */}
      {isAddPdfOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Upload PDF Handout for {selectedCourseForMaterials?.courseCode}
                </h3>
              </div>
              <button
                onClick={() => setIsAddPdfOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Switch Upload vs URL Mode */}
            <div className="flex items-center gap-2 mt-4 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setPdfUploadMode('upload')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  pdfUploadMode === 'upload' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Upload from Device
              </button>
              <button
                type="button"
                onClick={() => setPdfUploadMode('url')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  pdfUploadMode === 'url' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Direct PDF URL
              </button>
            </div>

            <form onSubmit={handleSavePdf} className="mt-4 space-y-3.5">
              {pdfUploadMode === 'upload' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select PDF Document *
                  </label>
                  <div
                    onClick={() => pdfFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-rose-400 bg-slate-50/50 hover:bg-rose-50/20 rounded-2xl p-6 text-center cursor-pointer transition-colors"
                  >
                    <Upload className="w-7 h-7 text-rose-500 mx-auto mb-2" />
                    {pdfFormData.fileName ? (
                      <div>
                        <p className="text-xs font-bold text-slate-900 font-mono">
                          📄 {pdfFormData.fileName}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {pdfFormData.fileSize} &bull; Click to replace
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Click to browse or drag & drop PDF
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Supports course handouts, scheme of work, notes (up to 25MB)
                        </p>
                      </div>
                    )}
                    <input
                      ref={pdfFileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handlePdfFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Direct PDF Web URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.edu/materials/lecture1.pdf"
                    value={pdfFormData.pdfUrl}
                    onChange={(e) => setPdfFormData({ ...pdfFormData, pdfUrl: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Module 1: Comprehensive Lecture Slides & Handout"
                  value={pdfFormData.title}
                  onChange={(e) => setPdfFormData({ ...pdfFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Topic / Week Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. Week 1-3: Core Thermodynamics"
                  value={pdfFormData.topic}
                  onChange={(e) => setPdfFormData({ ...pdfFormData, topic: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Syllabus Outline
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context, reading assignments, reference chapters..."
                  value={pdfFormData.description}
                  onChange={(e) => setPdfFormData({ ...pdfFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPdfOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPdf}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingPdf ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save PDF Handout</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADD VIDEO MODAL ================= */}
      {isAddVideoOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Add Video Lecture for {selectedCourseForMaterials?.courseCode}
                </h3>
              </div>
              <button
                onClick={() => setIsAddVideoOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Type Mode */}
            <div className="flex items-center gap-2 mt-4 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setVideoUploadMode('youtube')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  videoUploadMode === 'youtube' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                <Youtube className="w-3.5 h-3.5 text-red-600" />
                <span>YouTube Link</span>
              </button>
              <button
                type="button"
                onClick={() => setVideoUploadMode('url')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  videoUploadMode === 'url' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Direct Video / MP4 URL
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {videoUploadMode === 'youtube' ? 'YouTube Lecture URL *' : 'Direct Video Stream URL *'}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    placeholder={
                      videoUploadMode === 'youtube'
                        ? 'https://www.youtube.com/watch?v=...'
                        : 'https://example.edu/lectures/lecture1.mp4'
                    }
                    value={videoFormData.videoUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVideoFormData({ ...videoFormData, videoUrl: val });
                      if (videoUploadMode === 'youtube' && isYouTubeUrl(val)) {
                        fetchYouTubeInfo(val);
                      }
                    }}
                    className="w-full pl-3.5 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {isFetchingYt && (
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Video Lecture Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masterclass: Reaction Mechanisms & Catalysis"
                  value={videoFormData.title}
                  onChange={(e) => setVideoFormData({ ...videoFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Topic / Sub-Topic
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Week 4: Worked Derivations"
                    value={videoFormData.topic}
                    onChange={(e) => setVideoFormData({ ...videoFormData, topic: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lecturer / Instructor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Prof. A. Adeleke"
                    value={videoFormData.lecturer}
                    onChange={(e) => setVideoFormData({ ...videoFormData, lecturer: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration
                </label>
                <input
                  type="text"
                  placeholder="e.g. 45 mins"
                  value={videoFormData.duration}
                  onChange={(e) => setVideoFormData({ ...videoFormData, duration: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Video Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of lecture concepts, timestamps, sample quiz items..."
                  value={videoFormData.description}
                  onChange={(e) => setVideoFormData({ ...videoFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVideoOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVideo}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingVideo ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Video Lecture</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= IN-APP PDF PREVIEW MODAL ================= */}
      {previewingPdf && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold truncate">{previewingPdf.title}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{previewingPdf.topic} &bull; {previewingPdf.fileSize}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewingPdf.pdfUrl}
                  download={previewingPdf.fileName || `${previewingPdf.title}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewingPdf(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100">
              <iframe
                src={previewingPdf.pdfUrl}
                title={previewingPdf.title}
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= IN-APP VIDEO PLAYER MODAL ================= */}
      {playingVideo && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <Video className="w-5 h-5 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold truncate">{playingVideo.title}</h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    {playingVideo.topic} &bull; Lecturer: {playingVideo.lecturer || 'Department Faculty'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPlayingVideo(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black flex items-center justify-center">
              {isYouTubeUrl(playingVideo.videoUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(playingVideo.videoUrl)}
                  title={playingVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-none"
                />
              ) : (
                <video
                  src={playingVideo.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRM DELETE MATERIAL MODAL ================= */}
      {materialToDelete && (
        <ConfirmDeleteModal
          isOpen={Boolean(materialToDelete)}
          onClose={() => setMaterialToDelete(null)}
          onConfirm={handleConfirmDeleteMaterial}
          title={materialToDelete.type === 'pdf' ? 'Delete PDF Handout' : 'Delete Video Lecture'}
          itemType={materialToDelete.type === 'pdf' ? 'PDF Document' : 'Video Recording'}
          itemName={materialToDelete.item.title}
          description={`Are you sure you want to permanently remove "${materialToDelete.item.title}" from this course module? Students will no longer be able to access this material.`}
          confirmLabel="Yes, Delete Material"
          isDeleting={isDeletingMaterial}
        />
      )}

      {/* ================= REGISTER/EDIT COURSE MODAL ================= */}
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
                    Syllabus Link (Optional)
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
        <div className="fixed bottom-6 right-6 z-80 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
