import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Video,
  ListVideo,
  Share2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  User,
  Clock,
  BookOpen,
} from 'lucide-react';
import { CourseVideoModule } from '../admin/types';

interface VideoPlayerPageProps {
  video: CourseVideoModule;
  courseCode?: string;
  courseTitle?: string;
  allVideos?: CourseVideoModule[];
  onBack: () => void;
  onSelectVideo?: (video: CourseVideoModule) => void;
}

function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  if (url.includes('embed/')) return url;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0&modestbranding=1`;
  }
  return url;
}

function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export const VideoPlayerPage: React.FC<VideoPlayerPageProps> = ({
  video,
  courseCode = 'Course',
  courseTitle = '',
  allVideos = [],
  onBack,
  onSelectVideo,
}) => {
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation & escape to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // Fullscreen listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${courseCode}: ${video.title}`,
          text: `Lecture video for ${courseCode} (${video.topic || 'Video Module'})`,
          url: video.videoUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(video.videoUrl);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const isNativeVideo =
    video.videoType === 'uploaded' || (!isYouTubeUrl(video.videoUrl) && !video.videoUrl.includes('embed'));

  const currentIndex = allVideos.findIndex((v) => v.id === video.id);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-[#07090E] text-slate-100 flex flex-col w-screen h-screen overflow-y-auto overflow-x-hidden"
    >
      {/* Top Header Navigation Toolbar */}
      <header className="shrink-0 px-3 sm:px-6 py-3 flex items-center justify-between gap-3 bg-[#0F131D] border-b border-slate-800/90 shadow-md">
        {/* Left: Back button & Video metadata */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Back to Course (Esc)"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Back to {courseCode}</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                  {courseCode}
                </span>
                {video.topic && (
                  <span className="text-[11px] font-semibold text-slate-400 truncate hidden md:inline">
                    • {video.topic}
                  </span>
                )}
                {video.duration && (
                  <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                    ({video.duration})
                  </span>
                )}
              </div>
              <h1 className="text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-md">
                {video.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Toggle playlist sidebar if multiple videos exist */}
          {allVideos.length > 1 && (
            <button
              type="button"
              onClick={() => setShowPlaylist((p) => !p)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                showPlaylist
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Toggle Course Modules List"
            >
              <ListVideo className="w-4 h-4" />
              <span className="hidden md:inline">Lessons ({allVideos.length})</span>
            </button>
          )}

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Share Video Link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Open in external tab for YouTube */}
          {!isNativeVideo && (
            <a
              href={video.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Watch on YouTube"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer hidden sm:flex items-center justify-center"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Full-Screen Player Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Main Column: Video Theater Player & Information */}
        <div className={`space-y-4 ${showPlaylist && allVideos.length > 1 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {/* High-Resolution Responsive Video Frame */}
          <div className="relative w-full aspect-video bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80 flex items-center justify-center">
            {isNativeVideo ? (
              <video
                ref={videoRef}
                src={video.videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <iframe
                src={getYouTubeEmbedUrl(video.videoUrl)}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            )}
          </div>

          {/* Native video speed controls bar */}
          {isNativeVideo && (
            <div className="flex items-center justify-between bg-[#111622] px-4 py-2.5 rounded-2xl border border-slate-800 text-xs">
              <span className="font-semibold text-slate-400">Playback Speed:</span>
              <div className="flex items-center gap-1.5">
                {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSpeedChange(s)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      playbackSpeed === s
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video Metadata Card */}
          <div className="bg-[#111622] rounded-3xl p-5 sm:p-6 border border-slate-800/90 shadow-lg space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {courseCode}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {video.topic || 'Video Module'}
              </span>
              {video.duration && (
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {video.duration}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {video.title}
            </h2>

            {video.description ? (
              <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/70 text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {video.description}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No extra lecture notes provided for this video module.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Playlist / Next Video Switcher */}
        {showPlaylist && allVideos.length > 1 && (
          <div className="space-y-3 lg:col-span-1">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <ListVideo className="w-4 h-4 text-indigo-400" />
                <span>Course Video Playlist</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {currentIndex + 1} / {allVideos.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
              {allVideos.map((v, idx) => {
                const isSelected = v.id === video.id;
                return (
                  <motion.div
                    key={v.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectVideo?.(v)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/60 shadow-md'
                        : 'bg-[#111622] hover:bg-slate-800/90 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isSelected ? <Play className="w-3.5 h-3.5 fill-current" /> : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10.5px] font-bold text-indigo-400 uppercase tracking-wider block truncate">
                          {v.topic || `Lesson ${idx + 1}`}
                        </span>
                        <h4
                          className={`text-xs font-bold truncate ${
                            isSelected ? 'text-white font-extrabold' : 'text-slate-200'
                          }`}
                        >
                          {v.title}
                        </h4>
                        {v.duration && (
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                            {v.duration}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Copied Toast Alert */}
      {copiedToast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xl border border-slate-700 flex items-center gap-2 z-50"
        >
          <span>Video link copied to clipboard!</span>
        </motion.div>
      )}
    </div>
  );
};
