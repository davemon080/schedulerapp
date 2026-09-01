import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  FileText, 
  Video, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Download, 
  Play, 
  Clock, 
  User, 
  Check, 
  X, 
  Edit3,
  Sparkles,
  Upload,
  Link,
  Youtube,
  HardDrive,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  File,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { CourseRecord, CourseMaterialPdf, CourseMaterialVideo } from '../admin/types';
import { ConfirmDeleteModal } from '../admin/ConfirmDeleteModal';
import { addCoursePdfModule, deleteCoursePdfModule, addCourseVideoModule, deleteCourseVideoModule } from '../lib/dbService';
import { PdfViewerPage } from './PdfViewerPage';
import { VideoPlayerPage } from './VideoPlayerPage';

interface CourseDetailViewProps {
  course: CourseRecord;
  onBack: () => void;
  isCourseRep?: boolean;
  userSession?: any;
  onEditCourse?: (course: CourseRecord) => void;
  onDeleteCourse?: (course: CourseRecord) => void;
  onCourseUpdated?: (updatedCourse: CourseRecord) => void;
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  course,
  onBack,
  isCourseRep = false,
  userSession,
  onEditCourse,
  onCourseUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'video'>('pdf');
  const [currentCourse, setCurrentCourse] = useState<CourseRecord>(course);

  // Modals for adding materials
  const [isAddPdfOpen, setIsAddPdfOpen] = useState(false);
  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);

  // Active playing video / viewing PDF in-app
  const [playingVideo, setPlayingVideo] = useState<CourseMaterialVideo | null>(null);
  const [viewingPdf, setViewingPdf] = useState<CourseMaterialPdf | null>(null);
  const [pdfZoom, setPdfZoom] = useState<number>(100);

  // Material deletion state
  const [materialToDelete, setMaterialToDelete] = useState<{ type: 'pdf' | 'video'; item: any } | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  // PDF Upload Modal State
  const [pdfUploadMode, setPdfUploadMode] = useState<'device' | 'url'>('device');
  const [pdfFormData, setPdfFormData] = useState({
    title: '',
    topic: '',
    pdfUrl: '',
    fileName: '',
    fileSize: '',
    description: '',
  });
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement | null>(null);

  // Video Upload Modal State
  const [videoUploadMode, setVideoUploadMode] = useState<'device' | 'youtube'>('device');
  const [videoFormData, setVideoFormData] = useState({
    title: '',
    topic: '',
    videoUrl: '',
    duration: '',
    fileSize: '',
    fileName: '',
    videoType: 'uploaded' as 'uploaded' | 'youtube',
    lecturer: userSession?.fullName || 'Department Lecturer',
    description: '',
  });
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [isFetchingYt, setIsFetchingYt] = useState(false);
  const [ytFetchSuccess, setYtFetchSuccess] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  const effectiveCourseRep = isCourseRep || Boolean(userSession?.isCourseRep || userSession?.isAdmin);

  const pdfModules: CourseMaterialPdf[] = currentCourse.pdfModules || [];
  const videoModules: CourseMaterialVideo[] = currentCourse.videoModules || [];

  // Helper to extract YouTube video ID & embed URL
  const extractYouTubeId = (url?: string): string | null => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const getVideoThumbnailUrl = (vid: CourseMaterialVideo): string | null => {
    if (vid.thumbnailUrl) return vid.thumbnailUrl;
    const ytId = extractYouTubeId(vid.videoUrl);
    if (ytId) {
      return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
    return null;
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('embed/')) return url;
    const ytId = extractYouTubeId(url);
    if (ytId) {
      return `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
    }
    return url;
  };

  const isYouTubeUrl = (url: string) => {
    return Boolean(url && (url.includes('youtube.com') || url.includes('youtu.be')));
  };

  // Format file size nicely
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  // Handle PDF file selection from device
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedPdfFile(file);
    const sizeStr = formatFileSize(file.size);
    const rawName = file.name;
    const cleanTitle = rawName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');

    const blobUrl = URL.createObjectURL(file);

    // Read as Data URL to ensure local persistence if needed
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPdfFormData(prev => ({
        ...prev,
        title: prev.title.trim() ? prev.title : cleanTitle,
        fileName: rawName,
        fileSize: sizeStr,
        pdfUrl: dataUrl || blobUrl,
      }));
    };
    reader.readAsDataURL(file);

    setPdfFormData(prev => ({
      ...prev,
      title: prev.title.trim() ? prev.title : cleanTitle,
      fileName: rawName,
      fileSize: sizeStr,
      pdfUrl: blobUrl,
    }));
  };

  // Handle Video file selection from device (auto duration & file size)
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedVideoFile(file);
    const sizeStr = formatFileSize(file.size);
    const rawName = file.name;
    const cleanTitle = rawName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    const blobUrl = URL.createObjectURL(file);

    // Auto-detect video duration via hidden video element
    const tempVid = document.createElement('video');
    tempVid.preload = 'metadata';
    tempVid.src = blobUrl;
    tempVid.onloadedmetadata = () => {
      const durationSec = Math.round(tempVid.duration);
      if (!isNaN(durationSec) && durationSec > 0) {
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        let durStr = '';
        if (mins >= 60) {
          const hrs = Math.floor(mins / 60);
          const remMins = mins % 60;
          durStr = `${hrs}h ${remMins}m ${secs < 10 ? '0' : ''}${secs}s`;
        } else {
          durStr = `${mins}:${secs < 10 ? '0' : ''}${secs} mins`;
        }
        setVideoFormData(prev => ({
          ...prev,
          duration: durStr,
          fileSize: sizeStr,
          fileName: rawName,
          title: prev.title.trim() ? prev.title : cleanTitle,
          videoUrl: blobUrl,
          videoType: 'uploaded',
        }));
      }
    };

    setVideoFormData(prev => ({
      ...prev,
      title: prev.title.trim() ? prev.title : cleanTitle,
      fileName: rawName,
      fileSize: sizeStr,
      videoUrl: blobUrl,
      duration: prev.duration || 'Detecting...',
      videoType: 'uploaded',
    }));
  };

  // Fetch YouTube Title & Info via oEmbed
  const fetchYouTubeInfo = async (url: string) => {
    if (!url.trim() || !isYouTubeUrl(url)) return;
    setIsFetchingYt(true);
    setYtFetchSuccess(false);

    try {
      // Use noembed / youtube oembed endpoint
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          setVideoFormData(prev => ({
            ...prev,
            title: prev.title.trim() && prev.title !== 'YouTube Lecture' ? prev.title : data.title,
            lecturer: (prev.lecturer === 'Department Lecturer' || !prev.lecturer) && data.author_name ? data.author_name : prev.lecturer,
            duration: prev.duration || 'Full Lecture',
            videoType: 'youtube',
          }));
          setYtFetchSuccess(true);
        }
      }
    } catch (err) {
      console.warn('Could not auto-fetch YouTube metadata:', err);
    } finally {
      setIsFetchingYt(false);
    }
  };

  const handleAddPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFormData.title.trim()) return;
    if (!pdfFormData.pdfUrl.trim()) {
      alert('Please select a PDF file or enter a valid PDF link.');
      return;
    }

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

    const updated = await addCoursePdfModule(currentCourse.id, newPdf);
    if (updated) {
      setCurrentCourse(updated);
      if (onCourseUpdated) onCourseUpdated(updated);
    } else {
      const localUpdated = {
        ...currentCourse,
        pdfModules: [newPdf, ...pdfModules],
      };
      setCurrentCourse(localUpdated);
      if (onCourseUpdated) onCourseUpdated(localUpdated);
    }

    setPdfFormData({
      title: '',
      topic: '',
      pdfUrl: '',
      fileName: '',
      fileSize: '',
      description: '',
    });
    setSelectedPdfFile(null);
    setIsAddPdfOpen(false);
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFormData.title.trim()) return;
    if (!videoFormData.videoUrl.trim()) {
      alert('Please enter a video URL or YouTube link.');
      return;
    }

    const isYt = videoUploadMode === 'youtube' || isYouTubeUrl(videoFormData.videoUrl);

    const newVideo: CourseMaterialVideo = {
      id: `vid-${Date.now()}`,
      title: videoFormData.title.trim(),
      topic: videoFormData.topic.trim() || 'Lecture Recording',
      videoUrl: videoFormData.videoUrl.trim(),
      duration: videoFormData.duration.trim() || (isYt ? '45 mins' : '30 mins'),
      fileSize: videoFormData.fileSize.trim() || (isYt ? 'YouTube Stream' : 'Video File'),
      fileName: videoFormData.fileName.trim() || (isYt ? 'YouTube Stream' : `${videoFormData.title.trim()}.mp4`),
      videoType: isYt ? 'youtube' : 'uploaded',
      lecturer: videoFormData.lecturer.trim() || 'Course Lecturer',
      uploadedAt: 'Just now',
      description: videoFormData.description.trim() || 'Lecture video demonstration and tutorial walkthrough.',
    };

    const updated = await addCourseVideoModule(currentCourse.id, newVideo);
    if (updated) {
      setCurrentCourse(updated);
      if (onCourseUpdated) onCourseUpdated(updated);
    } else {
      const localUpdated = {
        ...currentCourse,
        videoModules: [newVideo, ...videoModules],
      };
      setCurrentCourse(localUpdated);
      if (onCourseUpdated) onCourseUpdated(localUpdated);
    }

    setVideoFormData({
      title: '',
      topic: '',
      videoUrl: '',
      duration: '',
      fileSize: '',
      fileName: '',
      videoType: 'uploaded',
      lecturer: userSession?.fullName || 'Department Lecturer',
      description: '',
    });
    setSelectedVideoFile(null);
    setYtFetchSuccess(false);
    setIsAddVideoOpen(false);
  };

  const handleConfirmDeleteMaterial = async () => {
    if (!materialToDelete) return;
    setIsDeletingMaterial(true);
    try {
      if (materialToDelete.type === 'pdf') {
        const updated = await deleteCoursePdfModule(currentCourse.id, materialToDelete.item.id);
        if (updated) {
          setCurrentCourse(updated);
          if (onCourseUpdated) onCourseUpdated(updated);
        } else {
          const localUpdated = {
            ...currentCourse,
            pdfModules: pdfModules.filter((p) => p.id !== materialToDelete.item.id),
          };
          setCurrentCourse(localUpdated);
          if (onCourseUpdated) onCourseUpdated(localUpdated);
        }
      } else {
        const updated = await deleteCourseVideoModule(currentCourse.id, materialToDelete.item.id);
        if (updated) {
          setCurrentCourse(updated);
          if (onCourseUpdated) onCourseUpdated(updated);
        } else {
          const localUpdated = {
            ...currentCourse,
            videoModules: videoModules.filter((v) => v.id !== materialToDelete.item.id),
          };
          setCurrentCourse(localUpdated);
          if (onCourseUpdated) onCourseUpdated(localUpdated);
        }
      }
      setMaterialToDelete(null);
    } finally {
      setIsDeletingMaterial(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-4 pb-12"
    >
      {/* Top Header: Back Button at Top Left + Clean Course Info (NO delete icon here) */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-700 hover:bg-white hover:text-slate-900 active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Back to Modules"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-[12px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/50">
                {currentCourse.courseCode}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {currentCourse.units ? `${currentCourse.units} Units` : '3 Units'}
              </span>
            </div>
            <h1 className="text-[16px] font-extrabold text-[#1C1C1E] truncate mt-0.5">
              {currentCourse.title}
            </h1>
          </div>
        </div>

        {effectiveCourseRep && onEditCourse && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onEditCourse(currentCourse)}
              className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              title="Edit Module Info"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Two Standalone Tabs at the Top: PDF and Video */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setActiveTab('pdf')}
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-[20px] text-[13.5px] font-bold transition-all cursor-pointer ${
            activeTab === 'pdf'
              ? 'bg-[#1C1C1E] text-white shadow-[0_4px_16px_rgba(0,0,0,0.18)] scale-[1.01]'
              : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80 shadow-xs'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeTab === 'pdf' ? 'text-rose-400' : 'text-slate-500'}`} />
          <span>PDF</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
            activeTab === 'pdf' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {pdfModules.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('video')}
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-[20px] text-[13.5px] font-bold transition-all cursor-pointer ${
            activeTab === 'video'
              ? 'bg-[#1C1C1E] text-white shadow-[0_4px_16px_rgba(0,0,0,0.18)] scale-[1.01]'
              : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80 shadow-xs'
          }`}
        >
          <Video className={`w-4 h-4 ${activeTab === 'video' ? 'text-indigo-400' : 'text-slate-500'}`} />
          <span>Video</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
            activeTab === 'video' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {videoModules.length}
          </span>
        </button>
      </div>

      {/* Tab 1: PDF Modules Content */}
      {activeTab === 'pdf' && (
        <div className="space-y-3 pt-1">
          {pdfModules.length === 0 ? (
            <div className="glass-container rounded-[26px] p-8 text-center space-y-2 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-[15px] font-bold text-slate-800">No PDF modules uploaded yet</h4>
              <p className="text-[12px] text-slate-500 max-w-xs mx-auto">
                Use the "Upload PDF" button below to add lecture handouts, notes, and reading materials from your device.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {pdfModules.map((pdf) => (
                <div
                  key={pdf.id}
                  onClick={() => setViewingPdf(pdf)}
                  className="glass-container rounded-[18px] p-2.5 sm:p-3 border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-center justify-between gap-2.5 group hover:border-blue-200 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-[13px] bg-rose-500/10 border border-rose-300/30 flex items-center justify-center text-rose-600 font-bold shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {pdf.topic && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md border border-rose-200/50">
                            {pdf.topic}
                          </span>
                        )}
                        {pdf.fileSize && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                            {pdf.fileSize}
                          </span>
                        )}
                        {pdf.uploadedAt && (
                          <span className="text-[10px] text-slate-400">
                            • {pdf.uploadedAt}
                          </span>
                        )}
                      </div>
                      <h4 className="text-[13px] font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors truncate max-w-[190px] sm:max-w-xs">
                        {pdf.title}
                      </h4>
                      {pdf.fileName && (
                        <p className="text-[10.5px] font-mono text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                          📄 {pdf.fileName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setViewingPdf(pdf)}
                      className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center shadow-2xs"
                      title="Read PDF In-App"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={pdf.pdfUrl}
                      download={pdf.fileName || `${pdf.title}.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center shadow-2xs"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    {effectiveCourseRep && (
                      <button
                        type="button"
                        onClick={() => setMaterialToDelete({ type: 'pdf', item: pdf })}
                        className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Delete PDF"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Video Modules Content */}
      {activeTab === 'video' && (
        <div className="space-y-3 pt-1">
          {videoModules.length === 0 ? (
            <div className="glass-container rounded-[26px] p-8 text-center space-y-2 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <Video className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-[15px] font-bold text-slate-800">No Video modules uploaded yet</h4>
              <p className="text-[12px] text-slate-500 max-w-xs mx-auto">
                Use the "Add Video" button below to upload recorded lectures from your device or add YouTube tutorial links.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videoModules.map((vid) => {
                const thumbUrl = getVideoThumbnailUrl(vid);
                return (
                  <div
                    key={vid.id}
                    className="glass-container rounded-[24px] overflow-hidden border border-white/80 shadow-[0_4px_18px_rgba(0,0,0,0.03)] group hover:border-indigo-200 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Video Thumbnail Banner Card */}
                      <div
                        onClick={() => setPlayingVideo(vid)}
                        className="relative w-full aspect-video bg-slate-900 overflow-hidden cursor-pointer flex items-center justify-center group/thumb"
                      >
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={vid.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 mb-1">
                              {currentCourse.courseCode} • Module
                            </span>
                            <span className="text-xs font-bold text-white/90 line-clamp-2 max-w-[200px]">
                              {vid.title}
                            </span>
                          </div>
                        )}

                        {/* Dark Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                        {/* Centered Glowing Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 rounded-full bg-white/95 text-indigo-600 flex items-center justify-center shadow-xl shadow-black/40 group-hover/thumb:scale-110 group-hover/thumb:bg-indigo-600 group-hover/thumb:text-white transition-all">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                          {vid.videoType === 'youtube' ? (
                            <span className="text-[10px] font-bold text-white bg-red-600/90 px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 shadow-xs">
                              <Youtube className="w-3 h-3" /> YouTube
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-white bg-indigo-600/90 px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 shadow-xs">
                              <Video className="w-3 h-3" /> Lecture MP4
                            </span>
                          )}

                          {vid.duration && (
                            <span className="text-[10.5px] font-bold text-white bg-black/70 px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 shadow-xs">
                              <Clock className="w-3 h-3 text-slate-300" />
                              {vid.duration}
                            </span>
                          )}
                        </div>

                        {/* Bottom Thumbnail Topic Strip */}
                        {vid.topic && (
                          <div className="absolute bottom-2 left-2.5 right-2.5 pointer-events-none">
                            <span className="text-[11px] font-semibold text-white/90 drop-shadow truncate block">
                              {vid.topic}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Video Details & Meta */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            onClick={() => setPlayingVideo(vid)}
                            className="text-[14.5px] font-bold text-slate-900 leading-snug cursor-pointer hover:text-indigo-600 transition-colors line-clamp-2"
                          >
                            {vid.title}
                          </h4>
                          {effectiveCourseRep && (
                            <button
                              type="button"
                              onClick={() => setMaterialToDelete({ type: 'video', item: vid })}
                              className="p-1.5 rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0"
                              title="Delete Video"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {vid.lecturer && (
                          <p className="text-[11.5px] text-slate-500 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {vid.lecturer}
                          </p>
                        )}

                        {vid.description && (
                          <p className="text-[12px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                            {vid.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-4 pb-3.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => setPlayingVideo(vid)}
                        className="flex items-center gap-1.5 text-indigo-600 font-bold hover:text-indigo-700 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-indigo-600" />
                        <span>Watch Now</span>
                      </button>

                      <a
                        href={vid.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-[11px]"
                      >
                        <span>{vid.videoType === 'youtube' ? 'YouTube' : 'Direct Link'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Hovering Plus Button for PDF Modules at Bottom Right */}
      <AnimatePresence>
        {activeTab === 'pdf' && effectiveCourseRep && !isAddPdfOpen && !viewingPdf && (
          <div className="fixed bottom-6 inset-x-0 max-w-lg mx-auto pointer-events-none z-40 flex justify-end px-5">
            <motion.button
              key="floating-add-pdf-btn"
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 20 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setPdfUploadMode('device');
                setIsAddPdfOpen(true);
              }}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#007AFF] to-blue-500 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(0,122,255,0.45)] hover:shadow-[0_12px_36px_rgba(0,122,255,0.55)] transition-all cursor-pointer pointer-events-auto border-2 border-white/70"
              title="Upload PDF Module"
              aria-label="Upload PDF Module"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Hovering Plus Button for Videos Page at Bottom Right */}
      <AnimatePresence>
        {activeTab === 'video' && effectiveCourseRep && !isAddVideoOpen && !playingVideo && (
          <div className="fixed bottom-6 inset-x-0 max-w-lg mx-auto pointer-events-none z-40 flex justify-end px-5">
            <motion.button
              key="floating-add-video-btn"
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 20 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setVideoUploadMode('device');
                setIsAddVideoOpen(true);
              }}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(79,70,229,0.45)] hover:shadow-[0_12px_36px_rgba(79,70,229,0.55)] transition-all cursor-pointer pointer-events-auto border-2 border-white/60"
              title="Add Video Module"
              aria-label="Add Video Module"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* DEDICATED FULL-SCREEN PDF VIEWER PAGE */}
      <AnimatePresence>
        {viewingPdf && (
          <PdfViewerPage
            pdf={viewingPdf}
            courseCode={currentCourse.courseCode || currentCourse.code || 'Course'}
            courseTitle={currentCourse.title || ''}
            allPdfs={currentCourse.pdfModules || currentCourse.pdfMaterials || []}
            onBack={() => setViewingPdf(null)}
            onSelectPdf={(pdfItem) => setViewingPdf(pdfItem)}
          />
        )}
      </AnimatePresence>

      {/* DEDICATED FULL-SCREEN VIDEO PLAYER PAGE */}
      <AnimatePresence>
        {playingVideo && (
          <VideoPlayerPage
            video={playingVideo}
            courseCode={currentCourse.courseCode || currentCourse.code || 'Course'}
            courseTitle={currentCourse.title || ''}
            allVideos={currentCourse.videoModules || currentCourse.videoMaterials || []}
            onBack={() => setPlayingVideo(null)}
            onSelectVideo={(videoItem) => setPlayingVideo(videoItem)}
          />
        )}
      </AnimatePresence>

      {/* ADD PDF MODAL (Upload from Device & Document Link) */}
      <AnimatePresence>
        {isAddPdfOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Upload PDF Module</h3>
                    <p className="text-[11.5px] text-slate-500">{currentCourse.courseCode} Resource</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPdfOpen(false);
                    setSelectedPdfFile(null);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setPdfUploadMode('device')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    pdfUploadMode === 'device' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>From Device</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfUploadMode('url')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    pdfUploadMode === 'url' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>Document Link</span>
                </button>
              </div>

              <form onSubmit={handleAddPdf} className="space-y-3.5">
                {/* Hidden File Input */}
                <input
                  ref={pdfFileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfFileChange}
                  className="hidden"
                />

                {pdfUploadMode === 'device' ? (
                  <div
                    onClick={() => pdfFileInputRef.current?.click()}
                    className="border-2 border-dashed border-rose-300 hover:border-rose-500 rounded-2xl p-5 text-center bg-rose-50/40 hover:bg-rose-50/70 transition-colors cursor-pointer group space-y-2"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    {selectedPdfFile ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-xs mx-auto">
                          {selectedPdfFile.name}
                        </p>
                        <span className="text-[11px] font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full inline-block">
                          {formatFileSize(selectedPdfFile.size)} • PDF Ready
                        </span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Click to select PDF from your device
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Lecture slides, handouts, past questions (.pdf)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                      PDF URL / Web Link *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://... (.pdf link)"
                      value={pdfFormData.pdfUrl}
                      onChange={(e) => setPdfFormData({ ...pdfFormData, pdfUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chapter 1: Chemical Kinetics"
                    value={pdfFormData.title}
                    onChange={(e) => setPdfFormData({ ...pdfFormData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                      Topic / Week
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Week 1-2"
                      value={pdfFormData.topic}
                      onChange={(e) => setPdfFormData({ ...pdfFormData, topic: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                      File Size (auto)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2.4 MB"
                      value={pdfFormData.fileSize}
                      onChange={(e) => setPdfFormData({ ...pdfFormData, fileSize: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Description / Overview
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of topics covered in this PDF handout..."
                    value={pdfFormData.description}
                    onChange={(e) => setPdfFormData({ ...pdfFormData, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddPdfOpen(false);
                      setSelectedPdfFile(null);
                    }}
                    className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-2xl bg-[#007AFF] text-white text-xs font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save PDF Module</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD VIDEO MODAL (Device Video & YouTube Link Switcher) */}
      <AnimatePresence>
        {isAddVideoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Add Video Module</h3>
                    <p className="text-[11.5px] text-slate-500">{currentCourse.courseCode} Lecture / Tutorial</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddVideoOpen(false);
                    setSelectedVideoFile(null);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segmented Switcher: Upload from Device vs YouTube Link */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setVideoUploadMode('device')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    videoUploadMode === 'device' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>From Device</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoUploadMode('youtube')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    videoUploadMode === 'youtube' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Youtube className="w-3.5 h-3.5 text-red-500" />
                  <span>YouTube Link</span>
                </button>
              </div>

              <form onSubmit={handleAddVideo} className="space-y-3.5">
                {/* Hidden Video File Input */}
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                  onChange={handleVideoFileChange}
                  className="hidden"
                />

                {videoUploadMode === 'device' ? (
                  <div
                    onClick={() => videoFileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-2xl p-5 text-center bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors cursor-pointer group space-y-2"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    {selectedVideoFile ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-xs mx-auto">
                          {selectedVideoFile.name}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                            {formatFileSize(selectedVideoFile.size)}
                          </span>
                          {videoFormData.duration && (
                            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                              ⏱ {videoFormData.duration}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Click to select video from your device
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          MP4, WebM, QuickTime video recordings
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-semibold text-slate-700">
                      YouTube Video Link *
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        required
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={videoFormData.videoUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVideoFormData({ ...videoFormData, videoUrl: val });
                          if (isYouTubeUrl(val)) {
                            fetchYouTubeInfo(val);
                          }
                        }}
                        className="w-full pl-3.5 pr-9 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      {isFetchingYt && (
                        <div className="absolute right-3 top-3">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        </div>
                      )}
                      {ytFetchSuccess && !isFetchingYt && (
                        <div className="absolute right-3 top-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                      )}
                    </div>
                    {extractYouTubeId(videoFormData.videoUrl) && (
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 mt-2 shadow-xs">
                        <img
                          src={`https://img.youtube.com/vi/${extractYouTubeId(videoFormData.videoUrl)}/hqdefault.jpg`}
                          alt="Thumbnail Preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2.5">
                          <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            YouTube Thumbnail Detected
                          </span>
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400">
                      Video title and channel name will be automatically populated.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Lecture / Video Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lecture 3: Chemical Equilibrium Walkthrough"
                    value={videoFormData.title}
                    onChange={(e) => setVideoFormData({ ...videoFormData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                      Topic / Chapter
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Unit 3"
                      value={videoFormData.topic}
                      onChange={(e) => setVideoFormData({ ...videoFormData, topic: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                      Duration (auto)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 45 mins"
                      value={videoFormData.duration}
                      onChange={(e) => setVideoFormData({ ...videoFormData, duration: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Lecturer / Instructor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Prof. A. Adeleke"
                    value={videoFormData.lecturer}
                    onChange={(e) => setVideoFormData({ ...videoFormData, lecturer: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Summary of what is demonstrated in this video recording..."
                    value={videoFormData.description}
                    onChange={(e) => setVideoFormData({ ...videoFormData, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddVideoOpen(false);
                      setSelectedVideoFile(null);
                    }}
                    className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Video Module</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Material Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!materialToDelete}
        title={`Delete ${materialToDelete?.type === 'pdf' ? 'PDF Resource' : 'Video Lecture'}`}
        itemName={materialToDelete?.item?.title || ''}
        itemType="material"
        description="Are you sure you want to remove this learning resource from the module?"
        confirmLabel="Delete"
        isDeleting={isDeletingMaterial}
        onConfirm={handleConfirmDeleteMaterial}
        onClose={() => setMaterialToDelete(null)}
      />
    </motion.div>
  );
};
