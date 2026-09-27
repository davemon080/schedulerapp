import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  Sun,
  Moon,
  Coffee,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Share2,
  Layers,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  Smartphone,
  Sparkles,
  Search,
  Bookmark,
  BookmarkCheck,
  Grid,
  Info,
  Printer,
  ArrowUp,
  ArrowDown,
  Sliders,
  RefreshCw,
  SlidersHorizontal,
  Compass,
  Monitor,
  Palette,
  Eye,
  ListTree,
} from 'lucide-react';
import { CoursePdfModule } from '@admin/types';

export interface PdfViewerPageProps {
  pdf: CoursePdfModule;
  courseCode?: string;
  courseTitle?: string;
  allPdfs?: CoursePdfModule[];
  onBack: () => void;
  onSelectPdf?: (pdf: CoursePdfModule) => void;
}

export type ViewMode = 'continuous' | 'single';
export type ReadingTheme = 'light' | 'sepia' | 'dark' | 'slate';
export type ViewerEngine = 'app' | 'system';

interface SearchMatch {
  page: number;
  snippet: string;
}

interface OutlineItem {
  title: string;
  pageNumber?: number;
  dest?: any;
  items?: OutlineItem[];
}

// Robust CDN loader with fallback mirrors for PDF.js
async function loadPdfJs(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
    const lib = (window as any).pdfjsLib;
    if (!lib.GlobalWorkerOptions.workerSrc) {
      lib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    return lib;
  }

  const cdnUrls = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
    'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
  ];

  for (const src of cdnUrls) {
    try {
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });

      if ((window as any).pdfjsLib) {
        const lib = (window as any).pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        return lib;
      }
    } catch {
      // Continue to next mirror
    }
  }

  throw new Error('All PDF.js CDN mirrors failed to load.');
}

// Offline-ready fetcher with Cache API integration
async function fetchPdfData(url: string): Promise<ArrayBuffer | string> {
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open('ich100l-pdf-cache-v1');
      const cached = await cache.match(url);
      if (cached) {
        return await cached.arrayBuffer();
      }
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        try {
          await cache.put(url, response.clone());
        } catch {
          // ignore cache quota issues
        }
        return await response.arrayBuffer();
      }
    } catch {
      // CORS or network failure: let PDF.js attempt direct URL resolution
    }
  }
  return url;
}

export const PdfViewerPage: React.FC<PdfViewerPageProps> = ({
  pdf,
  courseCode = 'Course',
  courseTitle = '',
  allPdfs = [],
  onBack,
  onSelectPdf,
}) => {
  // Navigation & document state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('native_pdf_view_mode') as ViewMode) || 'continuous';
  });
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>(() => {
    return (localStorage.getItem('native_pdf_theme') as ReadingTheme) || 'light';
  });
  const [viewerEngine, setViewerEngine] = useState<ViewerEngine>('app');
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(20);
  const [fallbackMode, setFallbackMode] = useState<boolean>(false);
  const [activeSheetTab, setActiveSheetTab] = useState<'pages' | 'bookmarks' | 'outline' | 'info' | null>(null);
  const [showDisplaySettings, setShowDisplaySettings] = useState<boolean>(false);
  const [showJumpDialog, setShowJumpDialog] = useState<boolean>(false);

  // In-document text search state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Bookmarks state (persisted per document ID)
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(`pdf_bookmarks_${pdf.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Table of Contents / Outline
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  // UI feedback & Scrubber preview
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scrubberValue, setScrubberValue] = useState<number>(1);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [jumpInput, setJumpInput] = useState<string>('1');

  // Pinch-to-zoom real-time dynamic scale transform (60fps CSS transform)
  const [pinchScale, setPinchScale] = useState<number>(1);

  // DOM and PDF refs
  const rootContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const continuousCanvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const continuousSlotsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const activeRenderTasksRef = useRef<Map<number, any>>(new Map());
  const pdfDocRef = useRef<any>(null);
  const pageAspectRatiosRef = useRef<Map<number, number>>(new Map());

  // Touch and Gesture tracking
  const touchStartPosRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const touchMovedRef = useRef<boolean>(false);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(100);
  const lastTapTimeRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('native_pdf_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('native_pdf_theme', readingTheme);
  }, [readingTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(`pdf_bookmarks_${pdf.id}`, JSON.stringify(bookmarks));
    } catch {}
  }, [bookmarks, pdf.id]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2200);
  }, []);

  const triggerHaptic = useCallback((ms = 10) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch {}
  }, []);

  // Initialize and load PDF document with PDF.js
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setLoadingProgress(25);
    setFallbackMode(false);
    setCurrentPage(1);
    setScrubberValue(1);
    setOutline([]);

    async function initPdf() {
      try {
        const pdfjs = await loadPdfJs();
        if (isCancelled) return;
        setLoadingProgress(45);

        const pdfData = await fetchPdfData(pdf.pdfUrl);
        if (isCancelled) return;
        setLoadingProgress(70);

        const loadingTask = pdfjs.getDocument(
          typeof pdfData === 'string'
            ? { url: pdfData, withCredentials: false }
            : { data: pdfData }
        );

        loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
          if (progressData.total > 0) {
            const pct = Math.min(95, Math.round((progressData.loaded / progressData.total) * 100));
            setLoadingProgress(pct);
          }
        };

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setScrubberValue(1);
        setLoadingProgress(100);
        setIsLoading(false);

        // Pre-fetch first page aspect ratio
        try {
          const firstPage = await doc.getPage(1);
          const vp = firstPage.getViewport({ scale: 1 });
          pageAspectRatiosRef.current.set(1, vp.width / vp.height);
        } catch {}

        // Fetch outline / bookmarks if available
        try {
          const docOutline = await doc.getOutline();
          if (docOutline && Array.isArray(docOutline) && docOutline.length > 0) {
            setOutline(docOutline);
          }
        } catch {}
      } catch (err: any) {
        if (isCancelled) return;
        console.warn('Native PDF.js canvas engine encountered an issue, seamlessly switching to native system viewer:', err);
        setFallbackMode(true);
        setViewerEngine('system');
        setIsLoading(false);
      }
    }

    initPdf();

    return () => {
      isCancelled = true;
      activeRenderTasksRef.current.forEach((task) => {
        try {
          task.cancel?.();
        } catch {}
      });
      activeRenderTasksRef.current.clear();
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy?.();
        pdfDocRef.current = null;
      }
    };
  }, [pdf.pdfUrl]);

  // Render a specific page to an HTML canvas
  const renderSinglePageToCanvas = useCallback(
    async (pageNumber: number, canvas: HTMLCanvasElement, containerWidth: number) => {
      const doc = pdfDocRef.current;
      if (!doc || !canvas) return;

      try {
        const existingTask = activeRenderTasksRef.current.get(pageNumber);
        if (existingTask) {
          try {
            existingTask.cancel();
          } catch {}
          activeRenderTasksRef.current.delete(pageNumber);
        }

        const page = await doc.getPage(pageNumber);
        const unscaledViewport = page.getViewport({ scale: 1, rotation });
        const aspectRatio = unscaledViewport.width / unscaledViewport.height;
        pageAspectRatiosRef.current.set(pageNumber, aspectRatio);

        const horizontalPadding = window.innerWidth < 640 ? 16 : 48;
        const availableWidth = Math.max(280, containerWidth - horizontalPadding);
        const targetWidth = Math.min(availableWidth, 960) * (zoom / 100);

        const autoScale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale: autoScale, rotation });

        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        // Pre-paint clean background for theme
        ctx.fillStyle = readingTheme === 'sepia' ? '#FCF6EA' : '#FFFFFF';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const renderTask = page.render(renderContext);
        activeRenderTasksRef.current.set(pageNumber, renderTask);

        await renderTask.promise;
        activeRenderTasksRef.current.delete(pageNumber);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNumber} render exception:`, err);
        }
      }
    },
    [zoom, rotation, readingTheme]
  );

  // Render for Single Page Mode
  useEffect(() => {
    if (viewMode !== 'single' || viewerEngine === 'system' || !pdfDocRef.current || !singleCanvasRef.current) return;
    const container = scrollContainerRef.current || rootContainerRef.current;
    const width = container?.clientWidth || window.innerWidth;
    renderSinglePageToCanvas(currentPage, singleCanvasRef.current, width);
  }, [viewMode, currentPage, zoom, rotation, readingTheme, viewerEngine, renderSinglePageToCanvas]);

  // Render for Continuous Scroll Mode (IntersectionObserver based lazy render)
  useEffect(() => {
    if (viewMode !== 'continuous' || viewerEngine === 'system' || !pdfDocRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = Number(entry.target.getAttribute('data-page-num'));
          if (!pageNum) return;

          if (entry.isIntersecting) {
            const canvas = continuousCanvasesRef.current.get(pageNum);
            const container = scrollContainerRef.current || rootContainerRef.current;
            const width = container?.clientWidth || window.innerWidth;
            if (canvas) {
              renderSinglePageToCanvas(pageNum, canvas, width);
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '450px 0px 450px 0px',
        threshold: 0.05,
      }
    );

    continuousSlotsRef.current.forEach((el) => {
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [viewMode, numPages, zoom, rotation, readingTheme, viewerEngine, renderSinglePageToCanvas]);

  // Track active page and auto-hide/reveal toolbars on scroll
  useEffect(() => {
    if (viewMode !== 'continuous' || viewerEngine === 'system') return;
    const container = scrollContainerRef.current;
    if (!container) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollTop = container.scrollTop;
          const containerMid = currentScrollTop + container.clientHeight / 2;
          let bestPage = currentPage;
          let minDistance = Infinity;

          continuousSlotsRef.current.forEach((slot, pageNum) => {
            const slotMid = slot.offsetTop + slot.clientHeight / 2;
            const dist = Math.abs(containerMid - slotMid);
            if (dist < minDistance) {
              minDistance = dist;
              bestPage = pageNum;
            }
          });

          if (bestPage !== currentPage) {
            setCurrentPage(bestPage);
            if (!isScrubbing) {
              setScrubberValue(bestPage);
            }
          }

          // Native auto-hide on active downward scroll, reveal on gentle upward scroll
          const delta = currentScrollTop - lastScrollTopRef.current;
          if (delta > 25 && currentScrollTop > 80 && showControls) {
            setShowControls(false);
          } else if (delta < -30 && !showControls) {
            setShowControls(true);
          }
          lastScrollTopRef.current = currentScrollTop;

          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [viewMode, viewerEngine, currentPage, isScrubbing, showControls]);

  // Window resize listener to re-render pages neatly
  useEffect(() => {
    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (viewerEngine !== 'system' && pdfDocRef.current) {
          if (viewMode === 'single' && singleCanvasRef.current) {
            const width = scrollContainerRef.current?.clientWidth || window.innerWidth;
            renderSinglePageToCanvas(currentPage, singleCanvasRef.current, width);
          } else if (viewMode === 'continuous') {
            const width = scrollContainerRef.current?.clientWidth || window.innerWidth;
            continuousCanvasesRef.current.forEach((canvas, pageNum) => {
              renderSinglePageToCanvas(pageNum, canvas, width);
            });
          }
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [viewMode, currentPage, viewerEngine, renderSinglePageToCanvas]);

  // Smooth scroll to target page
  const scrollToPage = useCallback(
    (pageNum: number, smooth = true) => {
      const target = Math.max(1, Math.min(pageNum, numPages));
      setCurrentPage(target);
      setScrubberValue(target);

      if (viewMode === 'continuous') {
        const slot = continuousSlotsRef.current.get(target);
        if (slot && scrollContainerRef.current) {
          slot.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
            block: 'start',
          });
        }
      }
    },
    [numPages, viewMode]
  );

  const goToNextPage = () => {
    if (currentPage < numPages) {
      triggerHaptic(8);
      scrollToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      triggerHaptic(8);
      scrollToPage(currentPage - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        if (activeSheetTab) {
          setActiveSheetTab(null);
        } else if (showDisplaySettings) {
          setShowDisplaySettings(false);
        } else if (showJumpDialog) {
          setShowJumpDialog(false);
        } else if (isSearchOpen) {
          setIsSearchOpen(false);
        } else {
          onBack();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === '+' || (e.ctrlKey && e.key === '=')) {
        e.preventDefault();
        setZoom((z) => Math.min(z + 20, 260));
      } else if (e.key === '-' || (e.ctrlKey && e.key === '-')) {
        e.preventDefault();
        setZoom((z) => Math.max(z - 20, 60));
      } else if (e.key === '0' && e.ctrlKey) {
        e.preventDefault();
        setZoom(100);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages, activeSheetTab, showDisplaySettings, showJumpDialog, isSearchOpen, onBack]);

  // Touch Gesture Handling: 60fps Pinch-to-zoom, Double-tap, and Tap-to-toggle immersion
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistRef.current = Math.hypot(dx, dy);
      initialZoomRef.current = zoom;
    } else if (e.touches.length === 1) {
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      touchMovedRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const factor = currentDist / initialPinchDistRef.current;
      setPinchScale(factor);
    } else if (e.touches.length === 1) {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
      if (deltaX > 8 || deltaY > 8) {
        touchMovedRef.current = true;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (initialPinchDistRef.current && pinchScale !== 1) {
      const newZoom = Math.min(260, Math.max(60, Math.round(initialZoomRef.current * pinchScale)));
      setZoom(newZoom);
      setPinchScale(1);
    }
    initialPinchDistRef.current = null;

    if (e.changedTouches.length === 1 && !touchMovedRef.current) {
      const now = Date.now();
      // Double tap toggles zoom
      if (now - lastTapTimeRef.current < 280) {
        triggerHaptic(15);
        setZoom((prev) => (prev > 115 ? 100 : 175));
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      // Single tap toggles native distraction-free reading mode
      if (now - touchStartPosRef.current.time < 250) {
        setShowControls((prev) => !prev);
      }
    }

    // Single-page mode swipe detection
    if (viewMode === 'single' && zoom <= 105 && touchMovedRef.current && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartPosRef.current.x;
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartPosRef.current.y);
      if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > deltaY * 1.3) {
        if (deltaX < 0) {
          goToNextPage();
        } else {
          goToPrevPage();
        }
      }
    }
  };

  // Toggle Bookmark for current page
  const toggleCurrentBookmark = () => {
    triggerHaptic(12);
    setBookmarks((prev) => {
      const exists = prev.includes(currentPage);
      if (exists) {
        showToast(`Page ${currentPage} bookmark removed`);
        return prev.filter((p) => p !== currentPage);
      } else {
        showToast(`Page ${currentPage} saved to bookmarks`);
        return [...prev, currentPage].sort((a, b) => a - b);
      }
    });
  };

  // In-document text search using PDF.js text layer
  const performSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim().toLowerCase();
      if (!trimmed || !pdfDocRef.current) {
        setSearchResults([]);
        setCurrentMatchIdx(0);
        return;
      }

      setIsSearching(true);
      const matches: SearchMatch[] = [];
      const doc = pdfDocRef.current;

      try {
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          const fullText = content.items
            .map((item: any) => item.str || '')
            .join(' ')
            .toLowerCase();

          if (fullText.includes(trimmed)) {
            const idx = fullText.indexOf(trimmed);
            const start = Math.max(0, idx - 25);
            const end = Math.min(fullText.length, idx + trimmed.length + 35);
            const snippet = `...${fullText.substring(start, end).trim()}...`;
            matches.push({ page: i, snippet });
          }
        }

        setSearchResults(matches);
        setCurrentMatchIdx(0);
        if (matches.length > 0) {
          scrollToPage(matches[0].page);
          showToast(`Found ${matches.length} matching page${matches.length > 1 ? 's' : ''}`);
        } else {
          showToast('No matching text found in document');
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [scrollToPage, showToast]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const nextSearchMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % searchResults.length;
    setCurrentMatchIdx(nextIdx);
    scrollToPage(searchResults[nextIdx].page);
  };

  const prevSearchMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + searchResults.length) % searchResults.length;
    setCurrentMatchIdx(prevIdx);
    scrollToPage(searchResults[prevIdx].page);
  };

  // Share handler
  const handleShare = () => {
    triggerHaptic(8);
    if (navigator.share) {
      navigator
        .share({
          title: `${courseCode}: ${pdf.title}`,
          text: `Lecture handout for ${courseCode} (${pdf.topic || 'Document'})`,
          url: pdf.pdfUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(pdf.pdfUrl);
      showToast('Document link copied to clipboard');
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    triggerHaptic(10);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Handle scrubber change
  const handleScrubberInput = (e: React.FormEvent<HTMLInputElement>) => {
    const val = Number((e.target as HTMLInputElement).value);
    setScrubberValue(val);
    setIsScrubbing(true);
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setIsScrubbing(false);
    scrollToPage(val);
  };

  // Theme styles helper
  const themeClasses = useMemo(() => {
    switch (readingTheme) {
      case 'sepia':
        return {
          wrapper: 'bg-[#F4ECD8] text-[#3D2E1E]',
          header: 'bg-[#FCF6EA]/95 border-[#E6DAC0] text-[#3D2E1E]',
          canvasBg: 'bg-[#FCF6EA] shadow-[0_12px_36px_rgba(80,50,20,0.15)] border border-[#E8DEC7]',
          filter: 'sepia(0.35) contrast(0.96) brightness(0.98)',
          card: 'bg-[#FCF6EA] border-[#E8DEC7]',
          bottomBar: 'bg-[#FCF6EA]/95 border-[#E6DAC0] text-[#3D2E1E]',
          pill: 'bg-[#3D2E1E]/10 text-[#3D2E1E]',
          progressBar: 'bg-[#8C5E39]',
          badge: 'bg-[#8C5E39]/15 text-[#6B4423]',
        };
      case 'dark':
        return {
          wrapper: 'bg-[#0B0F19] text-slate-100',
          header: 'bg-[#131926]/95 border-slate-800 text-white',
          canvasBg: 'bg-[#131926] shadow-[0_14px_45px_rgba(0,0,0,0.55)] border border-slate-800/90',
          filter: 'invert(0.92) hue-rotate(180deg) brightness(0.95) contrast(1.08)',
          card: 'bg-[#131926] border-slate-800',
          bottomBar: 'bg-[#131926]/95 border-slate-800 text-white',
          pill: 'bg-white/10 text-white',
          progressBar: 'bg-blue-500',
          badge: 'bg-blue-500/20 text-blue-400',
        };
      case 'slate':
        return {
          wrapper: 'bg-[#1E293B] text-slate-100',
          header: 'bg-[#0F172A]/95 border-slate-700/80 text-white',
          canvasBg: 'bg-[#0F172A] shadow-[0_14px_45px_rgba(0,0,0,0.4)] border border-slate-700',
          filter: 'invert(0.88) hue-rotate(180deg) brightness(0.98)',
          card: 'bg-[#0F172A] border-slate-700',
          bottomBar: 'bg-[#0F172A]/95 border-slate-700 text-white',
          pill: 'bg-white/10 text-white',
          progressBar: 'bg-indigo-500',
          badge: 'bg-indigo-500/20 text-indigo-300',
        };
      case 'light':
      default:
        return {
          wrapper: 'bg-[#F1F5F9] text-slate-900',
          header: 'bg-white/95 border-slate-200/90 text-slate-900',
          canvasBg: 'bg-white shadow-[0_12px_36px_rgba(0,0,0,0.08)] border border-slate-200/90',
          filter: 'none',
          card: 'bg-white border-slate-200',
          bottomBar: 'bg-white/95 border-slate-200/90 text-slate-900',
          pill: 'bg-blue-50 text-blue-600',
          progressBar: 'bg-blue-600',
          badge: 'bg-blue-50 text-blue-700 border border-blue-200/60',
        };
    }
  }, [readingTheme]);

  const isCurrentBookmarked = bookmarks.includes(currentPage);
  const readProgressPct = Math.round((currentPage / Math.max(1, numPages)) * 100);

  // Multi-document navigation
  const currentIndex = allPdfs.findIndex((p) => p.id === pdf.id);
  const prevPdf = currentIndex > 0 ? allPdfs[currentIndex - 1] : null;
  const nextPdf = currentIndex >= 0 && currentIndex < allPdfs.length - 1 ? allPdfs[currentIndex + 1] : null;

  return (
    <div
      ref={rootContainerRef}
      className={`fixed inset-0 z-[120] flex flex-col w-screen h-[100dvh] overflow-hidden select-none transition-colors duration-200 ${themeClasses.wrapper}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* ================= READING PROGRESS ACCENT BAR ================= */}
      <div className="fixed top-0 inset-x-0 z-50 h-[2.5px] bg-black/5 dark:bg-white/10 pointer-events-none">
        <div
          className={`h-full transition-all duration-200 ${themeClasses.progressBar}`}
          style={{ width: `${readProgressPct}%` }}
        />
      </div>

      {/* ================= TOP APP BAR (NATIVE NAVIGATION HEADER) ================= */}
      <AnimatePresence>
        {showControls && (
          <motion.header
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`shrink-0 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 border-b backdrop-blur-xl shadow-xs z-30 transition-colors ${themeClasses.header}`}
          >
            {/* Left: Native back button & Document details */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl active:scale-95 transition-all cursor-pointer bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-inherit flex items-center gap-1.5"
                title="Back to Course Modules (Esc)"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline text-xs font-bold">Back</span>
              </button>

              <div className="min-w-0 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] sm:text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
                      {courseCode}
                    </span>
                    <span className="text-[11px] font-medium opacity-60 hidden md:inline">
                      • Page {currentPage} of {numPages}
                    </span>
                    {pdf.fileSize && (
                      <span className="text-[11px] font-medium opacity-60 hidden lg:inline">
                        • {pdf.fileSize}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xs sm:text-sm font-bold truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                    {pdf.title}
                  </h1>
                </div>
              </div>
            </div>

            {/* Right: Quick actions toolbar */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* In-Document Search Toggle */}
              {viewerEngine === 'app' && !fallbackMode && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(8);
                    setIsSearchOpen((prev) => !prev);
                  }}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isSearchOpen
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'
                  }`}
                  title="Search in Document (Ctrl+F)"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}

              {/* Bookmark Toggle */}
              <button
                type="button"
                onClick={toggleCurrentBookmark}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isCurrentBookmarked
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'
                }`}
                title={isCurrentBookmarked ? 'Remove Bookmark' : 'Bookmark Page'}
              >
                {isCurrentBookmarked ? (
                  <BookmarkCheck className="w-4 h-4 fill-white" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>

              {/* Display & Reading Customizer Menu */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setShowDisplaySettings((prev) => !prev);
                }}
                className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                  showDisplaySettings
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'
                }`}
                title="Reading Themes & Display Settings (Aa)"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {/* Thumbnails & Sheets Drawer */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setActiveSheetTab('pages');
                }}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-all cursor-pointer flex items-center justify-center"
                title="Page Thumbnails, Bookmarks & Contents"
              >
                <Grid className="w-4 h-4" />
              </button>

              {/* Share */}
              <button
                type="button"
                onClick={handleShare}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-all cursor-pointer hidden xs:flex items-center justify-center"
                title="Share Document"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {/* Direct Save / Download */}
              <a
                href={pdf.pdfUrl}
                download={pdf.fileName || `${pdf.title}.pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                title="Download PDF to Device"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save</span>
              </a>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ================= DISPLAY & READING SETTINGS MODAL / POPOVER ================= */}
      <AnimatePresence>
        {showDisplaySettings && (
          <div className="fixed inset-0 z-45 flex items-start justify-end sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDisplaySettings(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto"
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className={`relative top-14 sm:top-12 right-2 sm:right-0 w-[calc(100vw-1rem)] sm:w-80 rounded-2xl p-4 shadow-2xl border backdrop-blur-2xl pointer-events-auto z-10 space-y-3.5 ${themeClasses.card}`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  Reading Settings
                </span>
                <button
                  type="button"
                  onClick={() => setShowDisplaySettings(false)}
                  className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Theme Picker */}
              <div>
                <label className="block text-[11px] font-bold opacity-60 mb-1.5">Paper &amp; Contrast Theme</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReadingTheme('light')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold border transition-all cursor-pointer ${
                      readingTheme === 'light'
                        ? 'border-blue-600 bg-white text-slate-900 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white/70 text-slate-700 opacity-70'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReadingTheme('sepia')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold border transition-all cursor-pointer ${
                      readingTheme === 'sepia'
                        ? 'border-[#8C5E39] bg-[#FCF6EA] text-[#3D2E1E] shadow-xs ring-2 ring-[#8C5E39]/30'
                        : 'border-[#E6DAC0] bg-[#FCF6EA]/70 text-[#3D2E1E] opacity-70'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5 text-[#8C5E39]" />
                    <span>Sepia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReadingTheme('dark')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold border transition-all cursor-pointer ${
                      readingTheme === 'dark'
                        ? 'border-blue-500 bg-[#0B0F19] text-white shadow-xs ring-2 ring-blue-500/30'
                        : 'border-slate-800 bg-[#0B0F19]/70 text-slate-300 opacity-70'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Night</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReadingTheme('slate')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold border transition-all cursor-pointer ${
                      readingTheme === 'slate'
                        ? 'border-indigo-500 bg-[#1E293B] text-white shadow-xs ring-2 ring-indigo-500/30'
                        : 'border-slate-700 bg-[#1E293B]/70 text-slate-300 opacity-70'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5 text-slate-300" />
                    <span>Slate</span>
                  </button>
                </div>
              </div>

              {/* View Flow Mode */}
              <div>
                <label className="block text-[11px] font-bold opacity-60 mb-1.5">Document Page Flow</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('continuous');
                      showToast('Continuous Vertical Scroll Mode');
                    }}
                    className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-all cursor-pointer ${
                      viewMode === 'continuous'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 opacity-70'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Vertical Flow</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('single');
                      showToast('Single Page Flip Mode');
                    }}
                    className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-all cursor-pointer ${
                      viewMode === 'single'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 opacity-70'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Single Page</span>
                  </button>
                </div>
              </div>

              {/* Page Rotation */}
              <div>
                <label className="block text-[11px] font-bold opacity-60 mb-1.5">Orientation</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(8);
                      setRotation((r) => (r + 90) % 360);
                      showToast(`Rotated to ${(rotation + 90) % 360}°`);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate Clockwise ({rotation}°)</span>
                  </button>
                  {rotation !== 0 && (
                    <button
                      type="button"
                      onClick={() => setRotation(0)}
                      className="py-1.5 px-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Viewer Engine Switcher (Native App vs System Webview) */}
              <div className="pt-1 border-t border-black/10 dark:border-white/10">
                <label className="block text-[11px] font-bold opacity-60 mb-1.5">Viewer Engine</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setViewerEngine('app');
                      showToast('Native App Canvas Engine');
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                      viewerEngine === 'app'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 opacity-70'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>App Reader</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewerEngine('system');
                      showToast('System OS PDF Embed');
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                      viewerEngine === 'system'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 opacity-70'
                    }`}
                  >
                    <Compass className="w-3 h-3" />
                    <span>OS System</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= IN-DOCUMENT SEARCH BAR ================= */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`border-b px-3 sm:px-5 py-2.5 z-20 flex items-center justify-between gap-2 backdrop-blur-md overflow-hidden ${themeClasses.header}`}
          >
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find lecture formulas, topics, definitions..."
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all"
              >
                {isSearching ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Find'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="opacity-70 text-[11px] hidden sm:inline">
                  {currentMatchIdx + 1} of {searchResults.length}
                </span>
                <button
                  type="button"
                  onClick={prevSearchMatch}
                  className="p-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 cursor-pointer"
                  title="Previous match"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={nextSearchMatch}
                  className="p-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 cursor-pointer"
                  title="Next match"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchResults([]);
              }}
              className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MAIN DOCUMENT VIEWPORT ================= */}
      <main
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 w-full h-full relative overflow-y-auto overflow-x-hidden p-2 sm:p-5 custom-scrollbar"
        style={{
          touchAction: zoom > 105 ? 'pan-x pan-y pinch-zoom' : 'pan-y pinch-zoom',
        }}
      >
        {/* Loading Progress Indicator */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/15 dark:bg-black/50 backdrop-blur-xs">
            <div className="w-12 h-12 rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-2xl flex items-center justify-center mb-3">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Loading study handout ({loadingProgress}%)...
            </p>
            <div className="w-48 h-1 bg-black/10 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ================= DOCUMENT RENDERING MODES ================= */}
        {viewerEngine === 'app' && !fallbackMode ? (
          viewMode === 'continuous' ? (
            /* Continuous Vertical Document Flow (Standard Google Drive & Acrobat Mobile) */
            <div
              className="w-full flex flex-col items-center justify-start gap-4 sm:gap-6 pb-36 pt-2 transition-transform duration-75"
              style={{
                transform: pinchScale !== 1 ? `scale(${pinchScale})` : undefined,
                transformOrigin: 'top center',
              }}
            >
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
                const isBookmarked = bookmarks.includes(pageNum);

                return (
                  <div
                    key={pageNum}
                    ref={(el) => {
                      if (el) continuousSlotsRef.current.set(pageNum, el);
                      else continuousSlotsRef.current.delete(pageNum);
                    }}
                    data-page-num={pageNum}
                    id={`pdf-page-slot-${pageNum}`}
                    className="relative flex flex-col items-center justify-center"
                  >
                    {/* Page card container */}
                    <div
                      className={`relative rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-200 ${themeClasses.canvasBg}`}
                      style={{
                        minWidth: '280px',
                        minHeight: '380px',
                      }}
                    >
                      {/* Ribbon if page is bookmarked */}
                      {isBookmarked && (
                        <div
                          className="absolute top-0 right-4 z-10 w-6 h-8 bg-amber-500 shadow-md flex items-center justify-center rounded-b-md animate-in slide-in-from-top-2"
                          title="Bookmarked Page"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-white fill-white" />
                        </div>
                      )}

                      <canvas
                        ref={(el) => {
                          if (el) continuousCanvasesRef.current.set(pageNum, el);
                          else continuousCanvasesRef.current.delete(pageNum);
                        }}
                        className="block max-w-full"
                        style={{ filter: themeClasses.filter }}
                      />
                    </div>

                    {/* Subtle page badge below canvas */}
                    <span className="text-[10px] font-bold opacity-40 mt-1.5">
                      Page {pageNum} of {numPages}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single Page Card View (Apple Books & Slide Mode) */
            <div
              className="w-full h-full flex flex-col items-center justify-center pb-32 pt-2 my-auto"
              style={{
                transform: pinchScale !== 1 ? `scale(${pinchScale})` : undefined,
                transformOrigin: 'center center',
              }}
            >
              <div
                className={`relative rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-200 ${themeClasses.canvasBg}`}
              >
                {/* Left Tap Zone for 1-touch page turn */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevPage();
                  }}
                  className="absolute inset-y-0 left-0 w-1/5 z-10 cursor-w-resize hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title="Previous Page"
                />

                {/* Right Tap Zone for 1-touch page turn */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextPage();
                  }}
                  className="absolute inset-y-0 right-0 w-1/5 z-10 cursor-e-resize hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title="Next Page"
                />

                {/* Bookmark Ribbon */}
                {bookmarks.includes(currentPage) && (
                  <div
                    className="absolute top-0 right-4 z-20 w-6 h-8 bg-amber-500 shadow-md flex items-center justify-center rounded-b-md"
                    title="Bookmarked Page"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-white fill-white" />
                  </div>
                )}

                <canvas
                  ref={singleCanvasRef}
                  className="block max-w-full"
                  style={{ filter: themeClasses.filter }}
                />
              </div>

              {/* Swipe helper caption */}
              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-medium opacity-50 select-none">
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Swipe left / right or tap edges to flip pages</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          )
        ) : (
          /* ================= NATIVE OS SYSTEM VIEWER FALLBACK ================= */
          <div className="w-full h-full pb-28 pt-2 flex flex-col items-center">
            <div className={`w-full max-w-5xl h-full rounded-2xl overflow-hidden shadow-xl border flex flex-col ${themeClasses.card}`}>
              <div className="p-3 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 opacity-80">
                  <Compass className="w-3.5 h-3.5 text-blue-500" />
                  System Native PDF Viewer
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewerEngine('app')}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-500 cursor-pointer"
                  >
                    Switch to App Reader
                  </button>
                  <a
                    href={pdf.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                    title="Open Fullscreen External"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="flex-1 w-full h-full bg-slate-900 relative">
                <object
                  data={`${pdf.pdfUrl}#toolbar=1&navpanes=0`}
                  type="application/pdf"
                  className="w-full h-full border-none"
                >
                  {/* Embedded Google Docs Fallback for devices without native PDF plugin */}
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdf.pdfUrl)}&embedded=true`}
                    title={pdf.title}
                    className="w-full h-full border-none"
                  />
                </object>
              </div>
            </div>
          </div>
        )}

        {/* Minimal Immersion Pill (Shown when controls are hidden) */}
        {!showControls && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => setShowControls(true)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-black/70 dark:bg-white/25 backdrop-blur-xl text-white text-[11px] font-bold shadow-lg flex items-center gap-2 cursor-pointer z-30"
          >
            <span>
              {currentPage} / {numPages}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/50" />
            <span className="text-[10px] opacity-75">Tap to show controls</span>
          </motion.div>
        )}

        {/* Floating Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-2xl border border-slate-700 flex items-center gap-2 z-50 pointer-events-none"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ================= FLOATING NATIVE SCRUBBER & BOTTOM BAR ================= */}
      <AnimatePresence>
        {showControls && (
          <motion.footer
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed bottom-4 inset-x-0 z-40 flex flex-col items-center px-3 pointer-events-none"
          >
            {/* Real-time dragging page scrubber tooltip */}
            {isScrubbing && (
              <div className="mb-2 px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-xl animate-in zoom-in-95 pointer-events-auto">
                Page {scrubberValue} of {numPages}
              </div>
            )}

            <div
              className={`w-full max-w-md rounded-[28px] p-2 shadow-[0_12px_45px_rgba(0,0,0,0.18)] border flex flex-col gap-1.5 pointer-events-auto backdrop-blur-2xl transition-colors ${themeClasses.bottomBar}`}
            >
              {/* Native Scrubber Slider Bar */}
              <div className="px-2 pt-1 flex items-center gap-2">
                <span className="text-[10px] font-bold opacity-60 w-4 text-center">1</span>
                <input
                  type="range"
                  min={1}
                  max={numPages}
                  value={scrubberValue}
                  onInput={handleScrubberInput}
                  onChange={handleScrubberChange}
                  className="flex-1 h-1.5 bg-black/10 dark:bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[10px] font-bold opacity-60 w-4 text-center">{numPages}</span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {/* Prev Button */}
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={goToPrevPage}
                  className="px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 cursor-pointer shrink-0"
                  title="Previous Page (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                  <span className="hidden xs:inline">Prev</span>
                </button>

                {/* Center Page Pill & Menu Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(8);
                    setShowJumpDialog(true);
                  }}
                  className={`flex-1 px-3 py-1.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer shadow-2xs ${themeClasses.pill}`}
                  title="Tap to Jump to Page"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>
                    {currentPage} / {numPages}
                  </span>
                  <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {/* Next Button */}
                <button
                  type="button"
                  disabled={currentPage >= numPages}
                  onClick={goToNextPage}
                  className="px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 cursor-pointer shrink-0"
                  title="Next Page (Right Arrow)"
                >
                  <span className="hidden xs:inline">Next</span>
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>

                {/* Zoom Quick Pill */}
                <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(60, z - 20))}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono font-bold w-9 text-center opacity-75">
                    {zoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(260, z + 20))}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* ================= QUICK JUMP PAGE MODAL ================= */}
      <AnimatePresence>
        {showJumpDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJumpDialog(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={`relative z-10 w-full max-w-xs rounded-3xl p-5 shadow-2xl border ${themeClasses.card}`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/10 dark:border-white/10">
                <h3 className="text-xs font-bold uppercase tracking-wider opacity-70">Jump to Page</h3>
                <button
                  type="button"
                  onClick={() => setShowJumpDialog(false)}
                  className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = parseInt(jumpInput, 10);
                  if (!isNaN(target)) {
                    scrollToPage(target);
                    setShowJumpDialog(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    autoFocus
                    className="w-24 text-center text-xl font-bold py-2 rounded-2xl border border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="text-xs font-bold opacity-60">of {numPages}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      scrollToPage(1);
                      setShowJumpDialog(false);
                    }}
                    className="py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-xs font-bold cursor-pointer"
                  >
                    First Page (1)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      scrollToPage(numPages);
                      setShowJumpDialog(false);
                    }}
                    className="py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-xs font-bold cursor-pointer"
                  >
                    Last Page ({numPages})
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer active:scale-98 transition-all"
                >
                  Go to Page
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= NATIVE BOTTOM SHEET (PAGES, BOOKMARKS, OUTLINE, INFO) ================= */}
      <AnimatePresence>
        {activeSheetTab && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSheetTab(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            {/* Slide-Up Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className={`relative z-10 w-full max-w-lg mx-auto rounded-t-[32px] border-t p-5 shadow-[0_-12px_45px_rgba(0,0,0,0.3)] max-h-[82vh] flex flex-col ${themeClasses.bottomBar}`}
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 rounded-full bg-black/20 dark:bg-white/20 mx-auto mb-3" />

              {/* Tabs Navigation */}
              <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 p-1 rounded-xl flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveSheetTab('pages')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeSheetTab === 'pages' ? 'bg-blue-600 text-white shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Pages ({numPages})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSheetTab('bookmarks')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeSheetTab === 'bookmarks' ? 'bg-blue-600 text-white shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Bookmarks ({bookmarks.length})
                  </button>
                  {outline.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveSheetTab('outline')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeSheetTab === 'outline' ? 'bg-blue-600 text-white shadow-xs' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      Contents
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSheetTab('info')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeSheetTab === 'info' ? 'bg-blue-600 text-white shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Details
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSheetTab(null)}
                  className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab 1: Pages Grid */}
              {activeSheetTab === 'pages' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar py-3 flex flex-col gap-3">
                  {/* Grid of Pages */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                    {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
                      const isSelected = pageNum === currentPage;
                      const isBookmarked = bookmarks.includes(pageNum);

                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => {
                            scrollToPage(pageNum);
                            setActiveSheetTab(null);
                          }}
                          className={`relative p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400 scale-[1.02]'
                              : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-black/10 dark:border-white/10'
                          }`}
                        >
                          {isBookmarked && (
                            <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400 absolute top-2 right-2" />
                          )}
                          <div
                            className={`w-9 h-11 rounded-md border flex items-center justify-center ${
                              isSelected
                                ? 'border-white/40 bg-white/20 text-white'
                                : 'border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5 opacity-50'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold">Page {pageNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 2: Bookmarks List */}
              {activeSheetTab === 'bookmarks' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar py-3">
                  {bookmarks.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center opacity-60 space-y-2">
                      <Bookmark className="w-10 h-10" />
                      <p className="text-xs font-bold">No bookmarks saved yet</p>
                      <p className="text-[11px] max-w-xs">
                        Tap the bookmark icon in the top header to save important pages and lecture formulas for quick revision.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bookmarks.map((bPage) => (
                        <div
                          key={bPage}
                          className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              scrollToPage(bPage);
                              setActiveSheetTab(null);
                            }}
                            className="flex items-center gap-3 text-left flex-1 cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                              <Bookmark className="w-4 h-4 fill-amber-500" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold">Page {bPage}</h4>
                              <p className="text-[10px] opacity-60">Tap to jump immediately</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(8);
                              setBookmarks((prev) => prev.filter((p) => p !== bPage));
                            }}
                            className="p-1.5 rounded-lg opacity-50 hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Delete Bookmark"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Table of Contents / Outline */}
              {activeSheetTab === 'outline' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-2">
                  {outline.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (item.pageNumber) {
                          scrollToPage(item.pageNumber);
                          setActiveSheetTab(null);
                        }
                      }}
                      className="w-full p-3 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 border border-black/10 dark:border-white/10 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ListTree className="w-4 h-4 opacity-50 shrink-0" />
                        <span className="text-xs font-semibold truncate">{item.title}</span>
                      </div>
                      {item.pageNumber && (
                        <span className="text-[11px] font-mono font-bold opacity-60 shrink-0">
                          p. {item.pageNumber}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Tab 4: Document Details */}
              {activeSheetTab === 'info' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-3">
                  <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase opacity-50">Document Title</span>
                      <p className="text-xs font-bold">{pdf.title}</p>
                    </div>
                    {pdf.topic && (
                      <div>
                        <span className="text-[10px] font-bold uppercase opacity-50">Topic / Module</span>
                        <p className="text-xs font-semibold">{pdf.topic}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                      <div>
                        <span className="text-[10px] font-bold uppercase opacity-50">Course</span>
                        <p className="text-xs font-bold">{courseCode}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase opacity-50">Total Pages</span>
                        <p className="text-xs font-bold">{numPages} pages</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase opacity-50">File Size</span>
                        <p className="text-xs font-bold">{pdf.fileSize || 'Standard Document'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase opacity-50">Format</span>
                        <p className="text-xs font-bold">PDF (Portable Document Format)</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <a
                      href={pdf.pdfUrl}
                      download={pdf.fileName || `${pdf.title}.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs text-center flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF to Device</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        handleShare();
                        setActiveSheetTab(null);
                      }}
                      className="w-full py-2.5 rounded-2xl bg-black/5 dark:bg-white/10 font-bold text-xs text-center flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Document</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Done Button */}
              <div className="pt-3 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveSheetTab(null)}
                  className="w-full py-2.5 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 font-bold text-xs text-center transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Multi-document switcher header widget if multiple PDFs exist */}
      {allPdfs.length > 1 && !activeSheetTab && showControls && (
        <aside
          className={`fixed top-14 right-3 z-20 hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm text-xs font-semibold backdrop-blur-md ${themeClasses.header}`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-500" />
          <span>
            {currentIndex + 1} of {allPdfs.length} handouts
          </span>
          {prevPdf && (
            <button
              type="button"
              onClick={() => onSelectPdf?.(prevPdf)}
              className="px-2 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-blue-600 dark:text-blue-400 font-bold ml-1 cursor-pointer"
            >
              Prev
            </button>
          )}
          {nextPdf && (
            <button
              type="button"
              onClick={() => onSelectPdf?.(nextPdf)}
              className="px-2 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-blue-600 dark:text-blue-400 font-bold cursor-pointer"
            >
              Next
            </button>
          )}
        </aside>
      )}
    </div>
  );
};
