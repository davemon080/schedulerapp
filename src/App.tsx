import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { HeaderSection } from './components/HeaderSection';
import { DayTimelineSection } from './components/DayTimelineSection';
import { ActivitiesSection } from './components/ActivitiesSection';
import { EventBottomSheet } from './components/EventBottomSheet';
import { BottomNavBar } from './components/BottomNavBar';
import { EventEditModal } from './components/EventEditModal';
import { CalendarView } from './components/CalendarView';
import { SplashScreen } from './components/SplashScreen';
import { NotificationsView } from './components/NotificationsView';
import { DeadlinesView, BroadcastsView, ModulesView, ProfileView } from './components/OtherViews';
import { AssignmentDetailsView } from './components/AssignmentDetailsView';
import { BroadcastDetailsView } from './components/BroadcastDetailsView';
import { CourseDetailView } from './components/CourseDetailView';
import { DeadlineEditModal } from './components/DeadlineEditModal';
import { SemesterAccessLockView } from './components/SemesterAccessLockView';
import { WalletView } from './components/WalletView';
import { LoginPage } from './components/LoginPage';
import { PermissionsPromptModal } from './components/PermissionsPromptModal';
const AdminDashboard = React.lazy(() =>
  import('@admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
import { INITIAL_DAYS, getWeekDaysForDate } from './data/mockData';
import { AssignmentItem, EventItem, NavigationTab, NotificationItem, UserSession } from './types';
import { Plus, Check, CheckCheck, Trash2, ShieldAlert, Smartphone, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import {
  fetchScheduleActivities,
  createScheduleActivity,
  updateScheduleActivity,
  deleteScheduleActivity,
  fetchAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  fetchAnnouncements,
  fetchNotifications,
  fetchAnnouncementsAndNotifications,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  updateStudentUser,
  fetchCurrentSemester,
  fetchDepartments,
  subscribeToRealtimeDatabase,
  normalizeSemester,
  correctAllStudentsTo100LSecondSemester,
  purgeMockScheduleDeadlinesAndBroadcasts,
  resetAllStudentsToUnpaidInDatabase,
  verifyUserActiveSession,
  fetchStudentByEmailOrMatric,
  recordVerifiedSemesterPayment,
  recordAppVisit,
  recordOrUpdateClassCancelledNotification,
  recordOrUpdateDeadlineDeletedNotification,
  recordOrUpdateBroadcastDeletedNotification,
  recordActivityNotification,
  updateStudentProfileInDb,
  ensureAllDepartmentLevelDashboards,
  fetchDepartmentLevels,
  preloadStudentPortalStartupData,
  isEventMatchingDay,
  isMockEvent,
  isMockAssignment,
  isMockNotification,
} from './lib/dbService';
import { ensureNativePushRegistered, registerAppServiceWorker, getPushPermissionState, showDeviceLocalNotification } from './lib/pushNotificationClient';
import { uploadProfilePicture, validateImageFile } from './lib/storageService';
import { PaymentPage } from './components/PaymentPage';
import { CourseRecord, DepartmentRecord } from '@admin/types';
import { CourseFormData } from './components/AddCourseModal';
import { getStudentActiveLevel, getStudentActiveSemester, resolveStudentDepartmentId } from './lib/academicScope';
import { isChannelNotificationEnabled } from './lib/notificationSettings';
import {
  getUserNotificationKey,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  clearAllNotificationsReadState,
  applyReadStateToNotifications,
} from './lib/notificationReadStore';

export default function App() {
  const checkIsAdminRoute = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    return (
      path.includes('adminschedulerapp') ||
      path.startsWith('/admin') ||
      hash.includes('adminschedulerapp') ||
      hash.includes('admin') ||
      search.includes('adminschedulerapp') ||
      search.includes('view=admin')
    );
  };

  const checkIsPaymentRoute = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    return (
      path.startsWith('/payment') ||
      path.startsWith('/pay') ||
      hash.includes('payment') ||
      search.includes('view=payment')
    );
  };

  const [isAdminView, setIsAdminView] = useState<boolean>(() => checkIsAdminRoute());
  const [isPaymentView, setIsPaymentView] = useState<boolean>(() => checkIsPaymentRoute());

  useEffect(() => {
    const handleUrlChange = () => {
      setIsAdminView(checkIsAdminRoute());
      setIsPaymentView(checkIsPaymentRoute());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const [days, setDays] = useState(INITIAL_DAYS);
  const [selectedDayId, setSelectedDayId] = useState<string>(() => {
    const todayMatch = INITIAL_DAYS.find((d) => d.isToday);
    return todayMatch?.id || INITIAL_DAYS[0]?.id || 'MON 31';
  });
  // Offline-first cached initial states (instantly available even without internet)
  const [events, setEvents] = useState<EventItem[]>(() => {
    try {
      const c = localStorage.getItem('app_cache_events');
      if (c) {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((e) => !isMockEvent(e?.id));
        }
      }
    } catch {}
    return [];
  });
  const [assignments, setAssignments] = useState<AssignmentItem[]>(() => {
    try {
      const c = localStorage.getItem('app_cache_assignments');
      if (c) {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((a) => !isMockAssignment(a?.id));
        }
      }
    } catch {}
    return [];
  });
  const [broadcasts, setBroadcasts] = useState<NotificationItem[]>(() => {
    try {
      const c = localStorage.getItem('app_cache_broadcasts');
      if (c) {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((b) => !isMockNotification(b?.id));
        }
      }
    } catch {}
    return [];
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const c = localStorage.getItem('app_cache_notifications');
      if (c) {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter((n) => !isMockNotification(n?.id));
          const userKey = getUserNotificationKey();
          return applyReadStateToNotifications(clean, userKey);
        }
      }
    } catch {}
    return [];
  });
  const [courses, setCourses] = useState<CourseRecord[]>(() => {
    try {
      const c = localStorage.getItem('app_cache_courses');
      if (c) {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [departments, setDepartments] = useState<DepartmentRecord[]>(() => {
    try {
      const c = localStorage.getItem('app_cache_departments');
      if (c) {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [currentSemester, setCurrentSemester] = useState<string>(() => {
    try {
      const c = localStorage.getItem('app_cache_current_semester');
      if (c) return c;
    } catch {}
    return '1st Semester';
  });
  const [activeTab, setActiveTab] = useState<NavigationTab>('Schedule');
  const [showSplash, setShowSplash] = useState(true);
  const [isStartupVerified, setIsStartupVerified] = useState<boolean>(false);
  const [splashStatusMessage, setSplashStatusMessage] = useState<string>('Verifying account state...');
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [showPermissionsPrompt, setShowPermissionsPrompt] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // Auto-register Service Worker and prompt for notification permissions on app startup
  useEffect(() => {
    registerAppServiceWorker().catch(() => {});
    let isCancelled = false;

    (async () => {
      try {
        const hasPrompted = localStorage.getItem('app_notification_prompt_completed');
        const permState = await getPushPermissionState();

        if (!hasPrompted || permState === 'default') {
          const timer = setTimeout(() => {
            if (!isCancelled) {
              setShowPermissionsPrompt(true);
            }
          }, 1000);
          return () => clearTimeout(timer);
        } else if (permState === 'granted') {
          // Silently ensure native push subscription is active in background
          ensureNativePushRegistered(userSession);
        }
      } catch (e) {
        console.warn('Notification permissions startup check notice:', e);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Track known notification IDs to prevent duplicate native mobile banners
  const hasInitializedNotifsRef = useRef<boolean>(false);
  const knownNotifIdsRef = useRef<Set<string>>(new Set());
  
  // Student Portal Auth Session
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('university_schedule_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        const isAdmin = Boolean(parsed.isAdmin || parsed.isadmin);
        const isRep = Boolean(parsed.isCourseRep || parsed.iscourserep);
        return {
          ...parsed,
          level: parsed.level || 100,
          year_level: parsed.year_level || `${parsed.level || 100} Level`,
          yearLevel: parsed.yearLevel || `${parsed.level || 100} Level`,
          semester: parsed.semester || '1st Semester',
          current_semester: parsed.current_semester || '1st Semester',
          session: parsed.session || '2025/2026',
          academic_session: parsed.academic_session || '2025/2026',
          is_paid: Boolean(
            isAdmin ||
            isRep ||
            parsed.hasFreeAccess ||
            parsed.has_free_access ||
            parsed.free_access ||
            parsed.freeSemesterGranted ||
            parsed.is_paid ||
            parsed.is_payed
          ),
          is_payed: Boolean(
            isAdmin ||
            isRep ||
            parsed.hasFreeAccess ||
            parsed.has_free_access ||
            parsed.free_access ||
            parsed.freeSemesterGranted ||
            parsed.is_paid ||
            parsed.is_payed
          ),
          hasFreeAccess: Boolean(
            isAdmin ||
            isRep ||
            parsed.hasFreeAccess ||
            parsed.has_free_access ||
            parsed.free_access ||
            parsed.freeSemesterGranted ||
            parsed.is_paid ||
            parsed.is_payed
          ),
          paid_semester: parsed.paid_semester || (isAdmin || isRep || parsed.hasFreeAccess ? (parsed.semester || '1st Semester') : undefined),
          paid_at: parsed.paid_at,
        };
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const userSessionRef = useRef<UserSession | null>(userSession);
  useEffect(() => {
    userSessionRef.current = userSession;
  }, [userSession]);

  const isCourseRep = Boolean(
    userSession?.isCourseRep ||
    userSession?.isAdmin ||
    (userSession as any)?.iscourserep ||
    (userSession as any)?.isadmin
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Helper to add activity notification
  const addActivityNotification = useCallback(
    (
      title: string,
      message: string,
      category: NotificationItem['category'] = 'schedule',
      type: 'activity' | 'alert' | 'info' | 'success' = 'activity'
    ) => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newNotif: NotificationItem = {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title,
        message,
        time: `Today, ${timeStr}`,
        timeAgo: 'Just now',
        isUnread: true,
        type,
        category,
        timestamp: Date.now(),
      };
      setNotifications((prev) => [newNotif, ...prev]);

      // Pop notification toast if enabled in user notification settings
      if (isChannelNotificationEnabled(category || 'schedule')) {
        setToastMessage(`${title}: ${message}`);
        setTimeout(() => {
          setToastMessage(null);
        }, 3200);
      }
    },
    []
  );

  // Sync Student Portal with Firebase Firestore
  const syncStudentPortalData = useCallback(async () => {
    try {
      const [dbEvents, dbAssigns, dbBroadcasts, dbNotifs, dbCourses, dbSem, dbDepts] = await Promise.all([
        fetchScheduleActivities(),
        fetchAssignments(),
        fetchAnnouncements(),
        fetchNotifications(),
        fetchCourses(),
        fetchCurrentSemester(),
        fetchDepartments(),
      ]);

      if (dbEvents) {
        const cleanEvents = dbEvents.filter((e) => !isMockEvent(e?.id));
        setEvents(cleanEvents);
        try { localStorage.setItem('app_cache_events', JSON.stringify(cleanEvents)); } catch {}
      }
      if (dbAssigns) {
        const cleanAssigns = dbAssigns.filter((a) => !isMockAssignment(a?.id));
        setAssignments(cleanAssigns);
        try { localStorage.setItem('app_cache_assignments', JSON.stringify(cleanAssigns)); } catch {}
      }
      if (dbBroadcasts) {
        const cleanBroadcasts = dbBroadcasts.filter((b) => !isMockNotification(b?.id));
        setBroadcasts(cleanBroadcasts);
        try { localStorage.setItem('app_cache_broadcasts', JSON.stringify(cleanBroadcasts)); } catch {}
      }
      if (dbNotifs) {
        setNotifications((prev) => {
          const localActivities = prev.filter((p) => p.id?.startsWith('act-'));
          const combined = [...localActivities, ...dbNotifs];
          const seen = new Set<string>();
          const deduped: NotificationItem[] = [];
          for (const item of combined) {
            if (!item.id || seen.has(item.id)) continue;
            seen.add(item.id);
            deduped.push(item);
          }
          const userKey = getUserNotificationKey(userSession);
          const processed = applyReadStateToNotifications(deduped, userKey);
          try { localStorage.setItem('app_cache_notifications', JSON.stringify(processed)); } catch {}
          return processed;
        });
      }
      if (dbCourses) {
        setCourses(dbCourses);
        try { localStorage.setItem('app_cache_courses', JSON.stringify(dbCourses)); } catch {}
      }
      if (dbDepts && Array.isArray(dbDepts)) {
        setDepartments(dbDepts);
        try { localStorage.setItem('app_cache_departments', JSON.stringify(dbDepts)); } catch {}
      }
      if (dbSem?.semester_code) {
        const parsed = normalizeSemester(dbSem.semester_code);
        setCurrentSemester(parsed);
        try { localStorage.setItem('app_cache_current_semester', parsed); } catch {}
        setUserSession((prev) => {
          if (!prev) return null;
          if (prev.semester === parsed && prev.current_semester === parsed) return prev;
          const updated = {
            ...prev,
            semester: parsed,
            current_semester: parsed,
          };
          try {
            localStorage.setItem('university_schedule_user', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    } catch (err) {
      console.warn('Student portal sync notice:', err);
    }
  }, []);

  // Active Startup Account Verification & Data Sync while on Splash Screen
  useEffect(() => {
    let isCancelled = false;

    const performStartupVerification = async () => {
      try {
        if (!isCancelled) setSplashStatusMessage('Loading timetable, courses & account...');

        // 0. Remove any legacy or static profile image caches from localStorage so app always loads actual picture from database
        try {
          localStorage.removeItem('university_schedule_profile_img');
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('university_profile_img_') || k.startsWith('profile_pic_'))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch {}

        // 1. Identify user account session if one exists in localStorage
        const savedUserRaw = localStorage.getItem('university_schedule_user');
        const localToken = localStorage.getItem('university_active_session_token');
        let userIdentifier: string | undefined = undefined;
        let parsedSavedUser: any = null;

        if (savedUserRaw) {
          try {
            parsedSavedUser = JSON.parse(savedUserRaw);
            userIdentifier = parsedSavedUser.uid || parsedSavedUser.matricNumber || parsedSavedUser.email;
          } catch {}
        }

        // 2. ULTRA-FAST PARALLEL PRELOAD: Fire ALL 8-9 database requests concurrently in a single batch!
        const preloadData = await preloadStudentPortalStartupData(userIdentifier, localToken || undefined);

        if (isCancelled) return;

        // 3. Atomically populate all app data state from the preloaded batch (Strict real database data only)
        if (preloadData.events) {
          setEvents(preloadData.events);
        }
        if (preloadData.assignments) {
          setAssignments(preloadData.assignments);
        }
        if (preloadData.broadcasts) {
          setBroadcasts(preloadData.broadcasts);
        }
        if (preloadData.notifications) {
          setNotifications(preloadData.notifications);
        }
        if (preloadData.courses) {
          setCourses(preloadData.courses);
        }
        if (preloadData.departments && preloadData.departments.length > 0) {
          setDepartments(preloadData.departments);
        }
        if (preloadData.currentSemester?.semester_code) {
          const parsedSem = normalizeSemester(preloadData.currentSemester.semester_code);
          setCurrentSemester(parsedSem);
        }

        // 4. Handle session verification and verified student profile
        if (
          preloadData.sessionCheck &&
          !preloadData.sessionCheck.isValid &&
          preloadData.sessionCheck.reason === 'CONCURRENT_LOGIN_DETECTED'
        ) {
          setSessionExpiredNotice(
            'Your student account was signed in on another device. For security and exam integrity, simultaneous logins on multiple devices are not permitted.'
          );
          setUserSession(null);
          try {
            localStorage.removeItem('university_schedule_user');
            localStorage.removeItem('university_active_session_token');
          } catch (e) {}
        } else if (preloadData.verifiedStudent && parsedSavedUser) {
          const verifiedStudent = preloadData.verifiedStudent;
          const matchLevel = getStudentActiveLevel(verifiedStudent);
          const matchYearLevel = `${matchLevel} Level`;
          const matchDept = verifiedStudent.department || parsedSavedUser.department;
          const matchDeptId = verifiedStudent.department_id || parsedSavedUser.department_id;
          const matchCourseRep = Boolean(verifiedStudent.iscourserep || verifiedStudent.isCourseRep);
          const matchAdmin = Boolean(verifiedStudent.isadmin || verifiedStudent.isAdmin);
          const matchHasFreeAccess = Boolean(
            matchCourseRep ||
            matchAdmin ||
            verifiedStudent.hasFreeAccess ||
            (verifiedStudent as any).has_free_access ||
            (verifiedStudent as any).free_access ||
            (verifiedStudent as any).freeSemesterGranted ||
            parsedSavedUser.hasFreeAccess
          );
          const matchIsPaid = Boolean(
            matchHasFreeAccess ||
            verifiedStudent.is_paid ||
            verifiedStudent.is_payed ||
            parsedSavedUser.is_paid ||
            parsedSavedUser.is_payed
          );
          const matchPaidSemester = verifiedStudent.paid_semester || (verifiedStudent as any).paidSemester || (matchHasFreeAccess ? (parsedSavedUser.semester || '1st Semester') : undefined);

          const syncedSession: UserSession = {
            ...parsedSavedUser,
            fullName: verifiedStudent.full_name || verifiedStudent.name || parsedSavedUser.fullName,
            matricNumber: verifiedStudent.matric_number || verifiedStudent.matricNumber || parsedSavedUser.matricNumber,
            email: verifiedStudent.email || parsedSavedUser.email,
            level: matchLevel,
            year_level: matchYearLevel,
            yearLevel: matchYearLevel,
            department: matchDept,
            department_id: matchDeptId,
            isCourseRep: matchCourseRep,
            isAdmin: matchAdmin,
            is_paid: matchIsPaid,
            is_payed: matchIsPaid,
            hasFreeAccess: matchHasFreeAccess,
            paid_semester: matchPaidSemester,
            profileImage: verifiedStudent.profile_pic_url || verifiedStudent.profileImage || verifiedStudent.photoURL || verifiedStudent.profile_picture || null,
            profile_pic_url: verifiedStudent.profile_pic_url || verifiedStudent.profileImage || verifiedStudent.photoURL || verifiedStudent.profile_picture || '',
          };

          setUserSession(syncedSession);
          try {
            localStorage.setItem('university_schedule_user', JSON.stringify(syncedSession));
          } catch (e) {}

          const freshDbPic = verifiedStudent.profile_pic_url || verifiedStudent.profileImage || verifiedStudent.photoURL || verifiedStudent.profile_picture || null;
          setProfileImage(freshDbPic);
        }

        // 5. Ensure all department level dashboards in background
        ensureAllDepartmentLevelDashboards().catch(() => {});

        // 6. Signal data readiness: App is 100% loaded and ready before splash dismisses!
        if (!isCancelled) {
          setSplashStatusMessage('Ready');
          setIsStartupVerified(true);
          setIsDataLoading(false);
        }
      } catch (err) {
        console.warn('Startup initialization notice:', err);
        if (!isCancelled) {
          setSplashStatusMessage('Ready');
          setIsStartupVerified(true);
          setIsDataLoading(false);
        }
      }
    };

    performStartupVerification();

    // Safeguard timeout to ensure splash dismisses even if network hangs
    const safeguardTimer = setTimeout(() => {
      if (!isCancelled) {
        setIsStartupVerified(true);
        setIsDataLoading(false);
      }
    }, 4500);

    return () => {
      isCancelled = true;
      clearTimeout(safeguardTimer);
    };
  }, []);

  // On mount and when session activates, subscribe to live Firestore changes
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeDatabase({
      onEvents: (dbEvents) => {
        if (dbEvents) {
          const cleanEvents = dbEvents.filter((e) => !isMockEvent(e?.id));
          setEvents(cleanEvents);
          try { localStorage.setItem('app_cache_events', JSON.stringify(cleanEvents)); } catch {}
        }
      },
      onAssignments: (dbAssigns) => {
        if (dbAssigns) {
          const cleanAssigns = dbAssigns.filter((a) => !isMockAssignment(a?.id));
          setAssignments(cleanAssigns);
          try { localStorage.setItem('app_cache_assignments', JSON.stringify(cleanAssigns)); } catch {}
        }
      },
      onBroadcasts: (dbBroadcasts) => {
        if (dbBroadcasts) {
          const cleanBroadcasts = dbBroadcasts.filter((b) => !isMockNotification(b?.id));
          if (hasInitializedNotifsRef.current) {
            for (const b of cleanBroadcasts) {
              if (b?.id && !knownNotifIdsRef.current.has(b.id)) {
                knownNotifIdsRef.current.add(b.id);
                const userDept = userSessionRef.current?.department || '';
                const userLvl = userSessionRef.current?.level || 100;
                const matchesDept = !b.department_id || b.department_id === 'ALL' || b.department_id === userDept;
                const matchesLvl = !b.level || b.level === 'ALL' || Number(b.level) === userLvl;
                if (matchesDept && matchesLvl) {
                  showDeviceLocalNotification({
                    title: b.title || 'Official University Broadcast 📢',
                    body: b.message || 'New broadcast announcement posted.',
                    data: { id: b.id, category: 'broadcast' },
                  }).catch(() => {});
                }
              }
            }
          } else {
            for (const b of cleanBroadcasts) {
              if (b?.id) knownNotifIdsRef.current.add(b.id);
            }
          }
          setBroadcasts(cleanBroadcasts);
          try { localStorage.setItem('app_cache_broadcasts', JSON.stringify(cleanBroadcasts)); } catch {}
        }
      },
      onNotifications: (dbNotifs) => {
        if (dbNotifs) {
          if (hasInitializedNotifsRef.current) {
            for (const n of dbNotifs) {
              if (n?.id && !knownNotifIdsRef.current.has(n.id)) {
                knownNotifIdsRef.current.add(n.id);
                const userDept = userSessionRef.current?.department || '';
                const userLvl = userSessionRef.current?.level || 100;
                const dept = (n as any).department || n.department_id;
                const matchesDept = !dept || dept === 'ALL' || dept === userDept;
                const matchesLvl = !n.level || n.level === 'ALL' || Number(n.level) === userLvl;
                if (matchesDept && matchesLvl) {
                  showDeviceLocalNotification({
                    title: n.title || 'Academic Update 🔔',
                    body: n.message || 'Timetable or schedule update.',
                    data: { id: n.id, category: n.category || 'schedule' },
                  }).catch(() => {});
                }
              }
            }
          } else {
            for (const n of dbNotifs) {
              if (n?.id) knownNotifIdsRef.current.add(n.id);
            }
            hasInitializedNotifsRef.current = true;
          }
          setNotifications((prev) => {
            const localActivities = prev.filter((p) => p.id?.startsWith('act-'));
            const combined = [...localActivities, ...dbNotifs];
            const seen = new Set<string>();
            const deduped: NotificationItem[] = [];
            for (const item of combined) {
              if (!item.id || seen.has(item.id)) continue;
              seen.add(item.id);
              deduped.push(item);
            }
            const userKey = getUserNotificationKey(userSession);
            const processed = applyReadStateToNotifications(deduped, userKey);
            try { localStorage.setItem('app_cache_notifications', JSON.stringify(processed)); } catch {}
            return processed;
          });
        }
      },
      onCourses: (dbCourses) => {
        if (dbCourses) {
          setCourses(dbCourses);
          try { localStorage.setItem('app_cache_courses', JSON.stringify(dbCourses)); } catch {}
        }
      },
      onCurrentSemester: (code) => {
        if (code) {
          const parsed = normalizeSemester(code);
          setCurrentSemester((prev) => (prev !== parsed ? parsed : prev));
          try { localStorage.setItem('app_cache_current_semester', parsed); } catch {}
          setUserSession((prev) => {
            if (!prev) return null;
            if (prev.semester === parsed && prev.current_semester === parsed) return prev;
            const updated = {
              ...prev,
              semester: parsed,
              current_semester: parsed,
            };
            try {
              localStorage.setItem('university_schedule_user', JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }
      },
      onStudents: (allStudents) => {
        const currentSession = userSessionRef.current;
        if (currentSession && allStudents && allStudents.length > 0) {
          const currentMatric = (currentSession.matricNumber || currentSession.matric_number || '').toUpperCase().trim();
          const currentEmail = (currentSession.email || '').toLowerCase().trim();
          const currentUid = currentSession.uid || currentSession.id || '';

          const matched = allStudents.find((s) => {
            const sMatric = (s.matric_number || s.matricNumber || '').toUpperCase().trim();
            const sEmail = (s.email || '').toLowerCase().trim();
            const sUid = s.uid || s.id || '';
            return (currentUid && (sUid === currentUid || s.id === currentUid)) || 
                   (currentMatric && sMatric === currentMatric) || 
                   (currentEmail && sEmail === currentEmail);
          });

          if (matched) {
            const matchMatric = (matched.matric_number || matched.matricNumber || currentSession.matricNumber).toUpperCase().trim();
            const matchEmail = (matched.email || currentSession.email).toLowerCase().trim();
            const matchFullName = matched.full_name || matched.fullName || matched.name || currentSession.fullName;
            const matchLevel = getStudentActiveLevel(matched);
            const matchYearLevel = `${matchLevel} Level`;
            const matchDept = matched.department || currentSession.department;
            const matchDeptId = matched.department_id || currentSession.department_id;
            const matchDeptCode = (matched as any).department_code || (matched as any).departmentCode || currentSession.department_code;
            const matchCourseRep = Boolean(matched.iscourserep || matched.isCourseRep);
            const matchAdmin = Boolean(matched.isadmin || matched.isAdmin);
            const matchSemester = getStudentActiveSemester(matched, currentSemester);
            const matchHasFreeAccess = Boolean(
              matchCourseRep ||
              matchAdmin ||
              matched.hasFreeAccess ||
              (matched as any).has_free_access ||
              (matched as any).free_access ||
              (matched as any).freeSemesterGranted ||
              matched.is_paid ||
              matched.is_payed
            );
            const matchIsPaid = matchHasFreeAccess || Boolean(matched.is_paid || matched.is_payed);
            const matchPaidSemester = matched.paid_semester || (matched as any).paidSemester || (matchHasFreeAccess ? (currentSession.semester || '1st Semester') : undefined);

            const matchPic = matched.profile_pic_url || matched.profileImage || matched.photoURL || '';
            const shouldUpdatePic = Boolean(matchPic && matchPic !== currentSession.profile_pic_url && matchPic !== profileImage);

            const normalizedCurrentPaidSem = currentSession.paid_semester || undefined;
            const normalizedMatchPaidSem = matchPaidSemester || undefined;

            const hasChanged = 
              currentSession.matricNumber !== matchMatric ||
              currentSession.email !== matchEmail ||
              currentSession.fullName !== matchFullName ||
              currentSession.level !== matchLevel ||
              currentSession.yearLevel !== matchYearLevel ||
              currentSession.department !== matchDept ||
              currentSession.department_id !== matchDeptId ||
              currentSession.isCourseRep !== matchCourseRep ||
              currentSession.isAdmin !== matchAdmin ||
              Boolean(currentSession.is_paid) !== matchIsPaid ||
              Boolean(currentSession.is_payed) !== matchIsPaid ||
              Boolean(currentSession.hasFreeAccess) !== matchHasFreeAccess ||
              normalizedCurrentPaidSem !== normalizedMatchPaidSem ||
              shouldUpdatePic;

            if (hasChanged) {
              const deptOrLevelChanged = currentSession.level !== matchLevel || currentSession.department !== matchDept || currentSession.department_id !== matchDeptId;
              const syncedSession: UserSession = {
                ...currentSession,
                matricNumber: matchMatric,
                matric_number: matchMatric,
                email: matchEmail,
                fullName: matchFullName,
                level: matchLevel,
                year_level: matchYearLevel,
                yearLevel: matchYearLevel,
                semester: matchSemester,
                current_semester: matchSemester,
                department: matchDept,
                department_id: matchDeptId,
                department_code: matchDeptCode,
                isCourseRep: matchCourseRep,
                isAdmin: matchAdmin,
                is_paid: matchIsPaid,
                is_payed: matchIsPaid,
                hasFreeAccess: matchHasFreeAccess,
                paid_semester: matchPaidSemester,
                profile_pic_url: matchPic || currentSession.profile_pic_url,
                profileImage: matchPic || currentSession.profileImage,
              };
              userSessionRef.current = syncedSession;
              setUserSession(syncedSession);
              if (shouldUpdatePic) {
                setProfileImage(matchPic || null);
              }
              try {
                localStorage.setItem('university_schedule_user', JSON.stringify(syncedSession));
              } catch (e) {}

              // Refresh portal course schedule and timetable instantly if department or level changed
              if (deptOrLevelChanged) {
                syncStudentPortalData().catch(() => {});
              }
            }
          }
        }
      },
    });
    return () => {
      unsubscribe();
    };
  }, [userSession?.uid, userSession?.matricNumber, userSession?.email, syncStudentPortalData]);

  // Ensure native device push notifications token is synced with current student department & level
  useEffect(() => {
    (async () => {
      try {
        const permState = await getPushPermissionState();
        if (permState === 'granted') {
          const fallbackDept = userSession?.department || userSession?.department_id || 'dept-ich';
          const fallbackLevel = userSession?.level || 100;
          await ensureNativePushRegistered(
            userSession || ({
              department: fallbackDept,
              level: fallbackLevel,
              matricNumber: '',
              fullName: 'Student',
            } as any)
          );
        }
      } catch (e) {
        console.warn('Native push session sync note:', e);
      }
    })();
  }, [userSession?.matricNumber, userSession?.department, userSession?.level, userSession?.uid]);

  // Online/Offline listener: automatic instant real-time sync when internet reconnects
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('🟢 Back online! Syncing live timetable...');
      syncStudentPortalData().catch(() => {});
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('📡 Offline mode active. Timetable and modules available from cache.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncStudentPortalData]);

  // Realtime Live Profile & User Credentials Synchronization directly with Firestore Database
  useEffect(() => {
    if (!userSession) return;
    const userKey = userSession.id || userSession.uid || userSession.email || userSession.matricNumber;
    if (!userKey) return;

    // Listen to user document for instantaneous credentials, department, level, and photo updates
    const unsub = onSnapshot(doc(db, 'users', userKey), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const livePic = d.profile_pic_url || d.profileImage || d.photoURL || d.profile_picture || null;
        if (livePic) {
          setProfileImage(livePic);
        }

        setUserSession((prev) => {
          if (!prev) return null;
          const newLevel = typeof d.level === 'number' ? d.level : (d.year_level ? parseInt(String(d.year_level).replace(/\D/g, ''), 10) : prev.level) || prev.level;
          const newYearLevel = `${newLevel} Level`;
          const newDept = d.department || prev.department;
          const newDeptId = d.department_id || prev.department_id;
          const newMatric = (d.matric_number || d.matricNumber || prev.matricNumber || '').trim().toUpperCase();
          const newEmail = (d.email || prev.email || '').trim().toLowerCase();
          const newFullName = (d.full_name || d.fullName || d.name || prev.fullName || '').trim();
          const newIsPaid = Boolean(d.is_paid ?? d.is_payed ?? false);
          const newHasFreeAccess = Boolean(d.hasFreeAccess || d.has_free_access || false);
          const newPaidSemester = d.paid_semester || d.paidSemester || null;
          const newIsRep = Boolean(d.iscourserep ?? d.isCourseRep ?? prev.isCourseRep);
          const newIsAdmin = Boolean(d.isadmin ?? d.isAdmin ?? prev.isAdmin);
          const newWalletBal = typeof d.wallet_balance === 'number' ? d.wallet_balance : (typeof d.walletBalance === 'number' ? d.walletBalance : prev.walletBalance);

          const hasChanged = 
            prev.level !== newLevel ||
            prev.yearLevel !== newYearLevel ||
            prev.department !== newDept ||
            prev.department_id !== newDeptId ||
            (newMatric && prev.matricNumber !== newMatric) ||
            (newEmail && prev.email !== newEmail) ||
            (newFullName && prev.fullName !== newFullName) ||
            prev.isCourseRep !== newIsRep ||
            prev.isAdmin !== newIsAdmin ||
            Boolean(prev.is_paid) !== newIsPaid ||
            Boolean(prev.hasFreeAccess) !== newHasFreeAccess ||
            prev.paid_semester !== newPaidSemester ||
            prev.walletBalance !== newWalletBal ||
            (livePic && prev.profileImage !== livePic);

          if (!hasChanged) return prev;

          const updated: UserSession = {
            ...prev,
            level: newLevel,
            yearLevel: newYearLevel,
            year_level: newYearLevel,
            department: newDept,
            department_id: newDeptId,
            department_code: d.department_code || d.departmentCode || prev.department_code,
            matricNumber: newMatric || prev.matricNumber,
            matric_number: newMatric || prev.matric_number,
            email: newEmail || prev.email,
            fullName: newFullName || prev.fullName,
            name: newFullName || prev.name,
            isCourseRep: newIsRep,
            isAdmin: newIsAdmin,
            is_paid: newIsPaid,
            is_payed: newIsPaid,
            hasFreeAccess: newHasFreeAccess,
            paid_semester: newPaidSemester,
            walletBalance: newWalletBal,
            wallet_balance: newWalletBal,
            profileImage: livePic || prev.profileImage,
            profile_pic_url: livePic || prev.profile_pic_url,
          };
          userSessionRef.current = updated;
          try {
            localStorage.setItem('university_schedule_user', JSON.stringify(updated));
          } catch {}

          if (prev.level !== newLevel || prev.department !== newDept || prev.department_id !== newDeptId) {
            syncStudentPortalData().catch(() => {});
          }

          return updated;
        });
      }
    }, () => {});

    // Also listen for local custom update events
    const handleLocalUserUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<any>;
      if (!customEvt.detail) return;
      const detail = customEvt.detail;
      setUserSession((prev) => {
        if (!prev) return null;
        const newLvl = typeof detail.level === 'number' ? detail.level : prev.level;
        const updated: UserSession = {
          ...prev,
          matricNumber: detail.matric_number || detail.matricNumber || prev.matricNumber,
          matric_number: detail.matric_number || detail.matricNumber || prev.matric_number,
          email: detail.email || prev.email,
          fullName: detail.full_name || detail.fullName || prev.fullName,
          department: detail.department || prev.department,
          department_id: detail.department_id || prev.department_id,
          department_code: detail.department_code || prev.department_code,
          level: newLvl,
          year_level: detail.year_level || `${newLvl} Level`,
          yearLevel: detail.yearLevel || `${newLvl} Level`,
        };
        userSessionRef.current = updated;
        syncStudentPortalData().catch(() => {});
        return updated;
      });
    };

    window.addEventListener('university_user_updated', handleLocalUserUpdate);

    return () => {
      unsub();
      window.removeEventListener('university_user_updated', handleLocalUserUpdate);
    };
  }, [userSession?.id, userSession?.uid, userSession?.email, userSession?.matricNumber, syncStudentPortalData]);

  // Single Active Device Session Guard: Detects if another device signs in with the same account
  useEffect(() => {
    if (!userSession) return;

    const verifyCurrentSession = async () => {
      const localToken = typeof localStorage !== 'undefined' ? localStorage.getItem('university_active_session_token') : null;
      if (!localToken) return;

      const userIdentifier = userSession.uid || userSession.matricNumber || userSession.email;
      const res = await verifyUserActiveSession(userIdentifier, localToken);

      if (!res.isValid && res.reason === 'CONCURRENT_LOGIN_DETECTED') {
        setSessionExpiredNotice(
          'Your student account was signed in on another device. For security and exam integrity, simultaneous logins on multiple devices are not permitted.'
        );
        setUserSession(null);
        try {
          localStorage.removeItem('university_schedule_user');
          localStorage.removeItem('university_active_session_token');
        } catch (e) {}
      }
    };

    // Check on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifyCurrentSession();
      }
    };

    // Run periodic check every 25 seconds
    const interval = setInterval(verifyCurrentSession, 25000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userSession?.uid, userSession?.matricNumber, userSession?.email]);

  const handleUpdateUserSession = useCallback(async (updates: Partial<UserSession>) => {
    setUserSession((prev) => {
      if (!prev) return null;
      let hasDifference = false;
      for (const [k, v] of Object.entries(updates)) {
        if ((prev as any)[k] !== v) {
          hasDifference = true;
          break;
        }
      }
      if (!hasDifference) return prev;

      const updated: UserSession = {
        ...prev,
        ...updates,
      };
      if (updates.level) {
        updated.level = updates.level;
        updated.yearLevel = `${updates.level} Level`;
        updated.year_level = `${updates.level} Level`;
      }
      if (updates.semester) {
        updated.semester = updates.semester;
        updated.current_semester = updates.semester;
        setCurrentSemester(updates.semester);
      }
      try {
        localStorage.setItem('university_schedule_user', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    const studentId = userSessionRef.current?.uid || userSessionRef.current?.id || userSessionRef.current?.matricNumber || userSessionRef.current?.email;
    if (studentId && (updates.level || updates.semester || updates.department)) {
      try {
        await updateStudentUser(studentId, {
          ...updates,
          level: updates.level,
          year_level: updates.level ? `${updates.level} Level` : undefined,
          yearLevel: updates.level ? `${updates.level} Level` : undefined,
          semester: updates.semester,
          current_semester: updates.semester,
        } as any);
      } catch (err) {
        console.warn('Could not persist student profile update to Firestore:', err);
      }
    }
    if (updates.level && updates.semester) {
      showToast(`Updated to ${updates.level}L • ${updates.semester}!`);
    } else if (updates.level) {
      showToast(`Level updated to ${updates.level}L!`);
    } else if (updates.semester) {
      showToast(`Semester switched to ${updates.semester}!`);
    }
  }, []);

  const handleGlobalSyncEvents = useCallback((updated: EventItem[]) => {
    setEvents(updated);
  }, []);

  const handleGlobalSyncAssignments = useCallback((updated: AssignmentItem[]) => {
    setAssignments(updated);
  }, []);

  const handleGlobalSyncNotifications = useCallback((updated: NotificationItem[]) => {
    setNotifications(updated);
  }, []);

  const handleLogin = (session: UserSession) => {
    setUserSession(session);
    try {
      localStorage.setItem('university_schedule_user', JSON.stringify(session));
    } catch (e) {
      console.error(e);
    }
    const actualPic = session.profile_pic_url || session.profileImage || session.photoURL || session.profile_picture || null;
    setProfileImage(actualPic);
    showToast(`Welcome, ${session.fullName}!`);
    addActivityNotification(
      'Portal Session Active',
      `Signed in as ${session.fullName} (Matric: ${session.matricNumber}).`,
      'system',
      'success'
    );
    setIsDataLoading(true);
    syncStudentPortalData().finally(() => {
      setIsDataLoading(false);
    });
  };

  const handleLogout = () => {
    setUserSession(null);
    try {
      localStorage.removeItem('university_schedule_user');
    } catch (e) {
      console.error(e);
    }
    setActiveTab('Schedule');
    setSelectedAssignmentForDetails(null);
    showToast('Signed out of Student Portal');
  };

  const handleDismissSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handlePaymentReturnToApp = useCallback((updatedUser?: any) => {
    if (updatedUser) {
      setUserSession((prev) => ({
        ...(prev || {}),
        ...updatedUser,
        is_paid: true,
        is_payed: true,
        paid_semester: updatedUser.paid_semester || prev?.semester || '1st Semester',
      }));
    }
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/payment') || window.location.pathname.startsWith('/pay')) {
        window.location.href = '/?payment_success=true&paid=true';
      } else {
        window.history.pushState(null, '', '/');
        setIsPaymentView(false);
      }
    } else {
      setIsPaymentView(false);
    }
  }, []);

  // Profile avatar state directly loaded from authenticated session / database (no local image caching)
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    try {
      const savedUser = localStorage.getItem('university_schedule_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        return user.profile_pic_url || user.profileImage || user.photoURL || user.profile_picture || null;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // Assignments & Deadlines State
  const [selectedAssignmentForDetails, setSelectedAssignmentForDetails] = useState<AssignmentItem | null>(null);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);

  // Broadcasts State
  const [selectedBroadcastForDetails, setSelectedBroadcastForDetails] = useState<NotificationItem | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Modules & Course Details State
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<any | null>(null);

  // Direct Wallet Modal/Page View state
  const [isDirectWalletOpen, setIsDirectWalletOpen] = useState<boolean>(false);

  // Menu & Bottom Drawer States
  const [selectedEventForMenu, setSelectedEventForMenu] = useState<EventItem | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // Student academic scope extraction for unified schedule, deadlines, and broadcasts
  const studentMatric = userSession?.matricNumber || '';
  const studentDeptRaw = userSession?.department || 'Department of Industrial Chemistry';
  const studentDeptId = userSession?.department_id || '';

  const activeLevel = getStudentActiveLevel(userSession);
  const activeSemester = normalizeSemester(getStudentActiveSemester(userSession, currentSemester));

  const deptInfo = resolveStudentDepartmentId(userSession, departments);
  const activeDeptId = deptInfo.id;
  const deptId = activeDeptId;
  const deptCode = (deptInfo.code || 'ICH').toUpperCase();

  // Filter events strictly matching student's department, level, and semester
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // 1. Department match:
      // Exact department_id match, normalized prefix match, or global 'dept-all'
      // If legacy event without department_id, check course code prefix against department code
      const eDeptId = e.department_id || '';
      const cCode = (e.course || '').toUpperCase();

      let matchesDept = false;
      if (eDeptId) {
        const normEDeptId = eDeptId.replace(/^dept-ps-/, 'dept-');
        const normActiveDeptId = activeDeptId.replace(/^dept-ps-/, 'dept-');
        matchesDept = eDeptId === activeDeptId || normEDeptId === normActiveDeptId || eDeptId === 'dept-all';
      } else {
        if (activeDeptId === 'dept-ich') {
          matchesDept = cCode.startsWith('ICH') || cCode.startsWith('CHM') || cCode.startsWith('PHY') || cCode.startsWith('MTH') || cCode.startsWith('GST') || cCode.startsWith('BIO');
        } else if (activeDeptId === 'dept-chm') {
          matchesDept = cCode.startsWith('CHM') && !cCode.startsWith('ICH');
        } else if (activeDeptId === 'dept-csc') {
          matchesDept = cCode.startsWith('CSC');
        } else {
          matchesDept = deptCode.length >= 2 && cCode.startsWith(deptCode);
        }
      }

      // 2. Strict Level match
      const codeDigits = cCode.replace(/\D/g, '');
      const codeLevel = codeDigits.length > 0 ? parseInt(codeDigits.slice(0, 1) + '00', 10) : 0;
      const eLevel = typeof e.level === 'number' && e.level >= 100
        ? e.level
        : (codeLevel >= 100 && codeLevel <= 600 ? codeLevel : 100);
      const matchesLevel = eLevel === activeLevel;

      // 3. Strict Semester match
      const eSem = e.semester ? normalizeSemester(e.semester) : activeSemester;
      const matchesSemester = eSem === activeSemester;

      return matchesDept && matchesLevel && matchesSemester;
    });
  }, [events, activeDeptId, activeLevel, activeSemester, deptCode]);

  // Filter events for currently selected day (matches by exact dayKey, day of week, or date) & sort by time
  const currentDayEvents = useMemo(() => {
    const matchedList = filteredEvents.filter((e) => {
      return isEventMatchingDay(e.dayKey, selectedDayId);
    });

    const getMinutes = (ev: EventItem): number => {
      if (ev.startTime) {
        const parts = ev.startTime.split(':').map(Number);
        if (!isNaN(parts[0])) return parts[0] * 60 + (parts[1] || 0);
      }
      if (ev.time) {
        const raw = ev.time.split('-')[0].trim().toUpperCase();
        const isPM = raw.includes('PM');
        const isAM = raw.includes('AM');
        const match = raw.match(/(\d+)(?::(\d+))?/);
        if (match) {
          let h = parseInt(match[1], 10);
          const m = match[2] ? parseInt(match[2], 10) : 0;
          if (isPM && h < 12) h += 12;
          if (isAM && h === 12) h = 0;
          return h * 60 + m;
        }
      }
      return 9999;
    };

    return matchedList.sort((a, b) => getMinutes(a) - getMinutes(b));
  }, [filteredEvents, selectedDayId]);

  // Recalculate event counts on days strictly for that day
  const updatedDays = useMemo(() => {
    return days.map((day) => {
      const count = filteredEvents.filter((e) => isEventMatchingDay(e.dayKey, day.id)).length;
      return {
        ...day,
        eventsCount: count,
      };
    });
  }, [days, filteredEvents]);

  const isActualCourseRep = Boolean(
    isCourseRep ||
    userSession?.isCourseRep ||
    userSession?.isAdmin ||
    (userSession as any)?.iscourserep ||
    (userSession as any)?.isadmin
  );

  const isPaidAccess = Boolean(
    isActualCourseRep ||
    (
      (userSession?.is_paid || userSession?.is_payed || userSession?.hasFreeAccess || (userSession as any)?.has_free_access || (userSession as any)?.free_access) &&
      (
        Boolean(userSession?.hasFreeAccess || (userSession as any)?.has_free_access || (userSession as any)?.free_access) ||
        (!userSession?.paid_semester || !activeSemester || normalizeSemester(userSession.paid_semester) === normalizeSemester(activeSemester))
      )
    )
  );

  const unreadNotifCount = useMemo(() => {
    if (!isPaidAccess) return 0;
    return notifications.filter((n) => n.isUnread).length;
  }, [notifications, isPaidAccess]);

  // Automated Activity & Deadline Reminder Engine
  const sentRemindersRef = useRef<Set<string>>(new Set());
  const filteredEventsRef = useRef(filteredEvents);
  filteredEventsRef.current = filteredEvents;
  const addActivityNotifRef = useRef(addActivityNotification);
  addActivityNotifRef.current = addActivityNotification;
  const isPaidAccessRef = useRef(isPaidAccess);
  isPaidAccessRef.current = isPaidAccess;

  useEffect(() => {
    // Request notification permission if supported
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission().catch(() => {});
      } catch (e) {}
    }

    const checkReminders = () => {
      if (!isPaidAccessRef.current) return;
      const currentFiltered = filteredEventsRef.current;
      if (!currentFiltered || currentFiltered.length === 0) return;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const todayDateNum = now.getDate();
      const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const todayDayName = dayNames[now.getDay()];
      const todayStr = `${todayDayName} ${todayDateNum}`;

      // 1. Check upcoming and live activities for today
      currentFiltered.forEach((ev) => {
        if (ev.isPostponed) return;

        // Check if event is scheduled for today
        const evDay = (ev.dayKey || '').toUpperCase();
        const isEvToday =
          evDay.includes(todayStr) ||
          evDay.includes(todayDayName) ||
          evDay.includes(String(todayDateNum));

        if (!isEvToday) return;

        // Parse event start time
        let startMins: number | null = null;
        if (ev.startTime) {
          const parts = ev.startTime.split(':').map(Number);
          if (!isNaN(parts[0])) startMins = parts[0] * 60 + (parts[1] || 0);
        } else if (ev.time) {
          const raw = ev.time.split('-')[0].trim().toUpperCase();
          const isPM = raw.includes('PM');
          const isAM = raw.includes('AM');
          const [hStr, mStr] = raw.replace(/AM|PM/g, '').trim().split(':');
          let h = parseInt(hStr, 10);
          const m = parseInt(mStr, 10) || 0;
          if (!isNaN(h)) {
            if (isPM && h < 12) h += 12;
            if (isAM && h === 12) h = 0;
            startMins = h * 60 + m;
          }
        }

        if (startMins === null) return;

        const diffMinutes = startMins - currentMinutes;

        // 15-Minute Advance Reminder
        const reminder15Key = `remind-15-${ev.id}-${todayDateNum}`;
        if (diffMinutes > 0 && diffMinutes <= 15 && !sentRemindersRef.current.has(reminder15Key)) {
          sentRemindersRef.current.add(reminder15Key);
          const msg = `${ev.course} (${ev.title}) is starting in ${diffMinutes} minutes at ${ev.startTime ? ev.startTime.substring(0, 5) : ev.time}. Venue: ${ev.location}`;
          showToast(`⏰ Upcoming Class: ${ev.course} in ${diffMinutes}m!`);
          addActivityNotifRef.current(
            `Class Reminder: ${ev.course}`,
            msg,
            'schedule',
            'activity'
          );
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`Class Reminder: ${ev.course}`, {
                body: msg,
              });
            } catch (e) {}
          }
        }

        // Class Starting Now Reminder
        const startingNowKey = `remind-now-${ev.id}-${todayDateNum}`;
        if (diffMinutes <= 0 && diffMinutes >= -5 && !sentRemindersRef.current.has(startingNowKey)) {
          sentRemindersRef.current.add(startingNowKey);
          const msg = `${ev.course} (${ev.title}) is starting now at ${ev.location}! ${ev.deliveryMode === 'online' ? 'Online meeting link ready.' : ''}`;
          showToast(`🔴 Class Starting Now: ${ev.course}!`);
          addActivityNotifRef.current(
            `Class In Session: ${ev.course}`,
            msg,
            'schedule',
            'alert'
          );
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`Class Starting Now: ${ev.course}`, {
                body: msg,
              });
            } catch (e) {}
          }
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 25000);
    return () => clearInterval(interval);
  }, []);

  // Check if any drawer/sheet is currently open
  const isAnyDrawerOpen = isBottomSheetOpen || isEditModalOpen || isDeadlineModalOpen || isBroadcastModalOpen;

  // Handler to open 3-dot Bottom Sheet
  const handleOpenMenu = (event: EventItem) => {
    setSelectedEventForMenu(event);
    setIsBottomSheetOpen(true);
  };

  // Handler to Edit Event
  const handleEditEvent = (event: EventItem) => {
    setEditingEvent(event);
    setIsEditModalOpen(true);
  };

  // Handler to Delete Event
  const handleDeleteEvent = async (eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    showToast('Class removed from schedule');

    const courseCode = target?.course || 'Class';
    const eventTitle = target?.title || 'Lecture';
    const cancelledTitle = `Class Cancelled: ${courseCode}`;
    const cancelledMsg = `The scheduled ${courseCode} class (${eventTitle})${target?.time ? ` at ${target.time}` : ''} has been cancelled by the ${isCourseRep ? 'Course Rep' : 'Faculty'}.`;

    // Update or add the notification on notifications page
    setNotifications((prev) => {
      const existingIdx = prev.findIndex(
        (n) =>
          n.id === `notif_cancelled_${eventId}` ||
          (n.target_id && n.target_id === eventId) ||
          (n.category === 'schedule' && target?.course && n.title.includes(target.course) && !n.title.toLowerCase().includes('cancelled'))
      );
      const updatedItem: NotificationItem = {
        id: `notif_cancelled_${eventId}`,
        title: cancelledTitle,
        message: cancelledMsg,
        time: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        isUnread: true,
        type: 'alert',
        category: 'schedule',
        department_id: target?.department_id,
        level: target?.level,
        semester: target?.semester,
        timestamp: Date.now(),
        status: 'cancelled',
        isCancelled: true,
        target_id: eventId,
      };

      if (existingIdx >= 0) {
        return [updatedItem, ...prev.filter((_, idx) => idx !== existingIdx)];
      }
      return [updatedItem, ...prev];
    });

    await deleteScheduleActivity(eventId);
    if (target) {
      await recordOrUpdateClassCancelledNotification(target, isCourseRep ? 'Course Rep' : 'Faculty');
    }
  };

  // Handler to Toggle Postponed status
  const handleTogglePostponed = async (eventId: string) => {
    let statusAfter = false;
    let targetCourse = 'Class';
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          statusAfter = !e.isPostponed;
          targetCourse = e.course;
          return { ...e, isPostponed: !e.isPostponed };
        }
        return e;
      })
    );
    showToast(
      statusAfter
        ? `${targetCourse} marked as Postponed`
        : `${targetCourse} marked as Active`
    );
    addActivityNotification(
      statusAfter ? 'Class Postponed' : 'Class Reactivated',
      `You marked ${targetCourse} as ${statusAfter ? 'postponed' : 'active and ongoing'}.`,
      'schedule',
      statusAfter ? 'alert' : 'success'
    );

    const targetEvent = events.find((e) => e.id === eventId);
    recordActivityNotification({
      title: statusAfter ? `Class Postponed: ${targetCourse}` : `Class Reactivated: ${targetCourse}`,
      message: statusAfter
        ? `${targetCourse} has been postponed by the Course Rep until further notice.`
        : `${targetCourse} is active and scheduled for session.`,
      category: 'schedule',
      type: statusAfter ? 'alert' : 'success',
      department_id: targetEvent?.department_id || activeDeptId,
      department: userSession?.department,
      level: activeLevel,
      semester: activeSemester,
      author: userSession?.fullName || 'Course Rep',
      target_id: eventId,
      dispatchPush: true,
    }).catch(() => {});

    await updateScheduleActivity(eventId, { isPostponed: statusAfter });
  };

  // Handler to Share Event
  const handleShareEvent = (event: EventItem) => {
    if (navigator.share) {
      navigator
        .share({
          title: `${event.course}: ${event.title}`,
          text: `University Schedule: ${event.course} (${event.title}) at ${event.time}, Venue: ${event.location}`,
        })
        .catch(() => {
          showToast('Share link copied to clipboard');
        });
    } else {
      navigator.clipboard?.writeText(
        `University Schedule: ${event.course} (${event.title}) at ${event.time}, Venue: ${event.location}`
      );
      showToast('Event details copied to clipboard');
    }
    addActivityNotification(
      'Schedule Shared',
      `You exported/shared details for ${event.course} (${event.title}).`,
      'schedule',
      'activity'
    );
  };

  // Handler to Save New / Edited Event
  const handleSaveEvent = async (saved: EventItem) => {
    const isEdit = !!editingEvent;
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      if (exists) {
        return prev.map((e) => (e.id === saved.id ? saved : e));
      }
      return [saved, ...prev];
    });
    showToast(isEdit ? 'Event updated successfully' : 'New class added to schedule');
    addActivityNotification(
      isEdit ? 'Class Updated' : 'Class Added',
      isEdit
        ? `You updated timetable details for ${saved.course}: ${saved.title} at ${saved.location}.`
        : `You scheduled a new session for ${saved.course} on ${saved.dayKey}.`,
      'schedule',
      'success'
    );

    const notifTitle = isEdit ? `Class Updated: ${saved.course}` : `New Class Added: ${saved.course}`;
    const notifMsg = isEdit
      ? `Schedule details updated for ${saved.course}: ${saved.title} at ${saved.time}, Venue: ${saved.location}.`
      : `${saved.course} (${saved.title}) scheduled for ${saved.dayKey} at ${saved.time}. Venue: ${saved.location}.`;

    recordActivityNotification({
      title: notifTitle,
      message: notifMsg,
      category: 'schedule',
      type: isEdit ? 'info' : 'activity',
      department_id: saved.department_id || activeDeptId,
      department: userSession?.department,
      level: activeLevel,
      semester: activeSemester,
      author: userSession?.fullName || 'Course Rep',
      target_id: saved.id,
      dispatchPush: true,
    }).catch(() => {});

    if (isEdit) {
      await updateScheduleActivity(saved.id, saved);
    } else {
      await createScheduleActivity(saved);
    }
  };

  const handleMarkAllNotifsRead = () => {
    const userKey = getUserNotificationKey(userSession);
    const notifIds = notifications.map((n) => n.id).filter(Boolean);
    markAllNotificationsAsRead(userKey, notifIds);
    const updated = notifications.map((n) => ({
      ...n,
      isUnread: false,
      isRead: true,
    }));
    setNotifications(updated);
    try {
      localStorage.setItem('app_cache_notifications', JSON.stringify(updated));
    } catch {}
    showToast('All notifications marked as read');
  };

  const handleMarkSingleNotifRead = (notifId: string) => {
    if (!notifId) return;
    const userKey = getUserNotificationKey(userSession);
    markNotificationAsRead(userKey, notifId);
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === notifId ? { ...n, isUnread: false, isRead: true } : n
      );
      try {
        localStorage.setItem('app_cache_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearAllNotifs = () => {
    const userKey = getUserNotificationKey(userSession);
    const notifIds = notifications.map((n) => n.id).filter(Boolean);
    clearAllNotificationsReadState(userKey, notifIds);
    setNotifications([]);
    try {
      localStorage.removeItem('app_cache_notifications');
    } catch {}
    showToast('All notifications cleared');
  };

  const handleDeleteNotif = (notifId: string) => {
    // Instead of removing any activity from notifications page, update it as dismissed
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === notifId) {
          const originalTitle = n.title.replace(/\s*\(Dismissed\)$/i, '');
          return {
            ...n,
            isUnread: false,
            isDismissed: true,
            title: `${originalTitle} (Dismissed)`,
          };
        }
        return n;
      })
    );
    showToast('Activity updated as dismissed');
  };

  const handleProfileImageUpload = async (imageFileOrUrl: File | string) => {
    if (!imageFileOrUrl) {
      // Reset profile image
      setProfileImage(null);
      if (userSession) {
        const userKey = userSession.id || userSession.uid || userSession.email || userSession.matricNumber;
        await updateStudentUser(userKey, {
          profile_pic_url: '',
          photoURL: '',
          profileImage: '',
          profile_picture: '',
        });
        await updateStudentProfileInDb(userKey, {
          profile_pic_url: '',
          photoURL: '',
          profileImage: '',
          profile_picture: '',
        });
        const updated = {
          ...userSession,
          profile_pic_url: '',
          photoURL: '',
          profileImage: '',
          profile_picture: '',
        };
        setUserSession(updated);
        try {
          localStorage.setItem('university_schedule_user', JSON.stringify(updated));
        } catch {}
      }
      showToast('Profile photo removed');
      return;
    }

    // 1. If passed a string (already an HTTP/HTTPS URL)
    if (typeof imageFileOrUrl === 'string') {
      const url = imageFileOrUrl.trim();
      setProfileImage(url);
      if (userSession) {
        const userKey = userSession.id || userSession.uid || userSession.email || userSession.matricNumber;
        await updateStudentUser(userKey, {
          profile_pic_url: url,
          photoURL: url,
          profileImage: url,
          profile_picture: url,
        });
        await updateStudentProfileInDb(userKey, {
          profile_pic_url: url,
          photoURL: url,
          profileImage: url,
          profile_picture: url,
        });
        const updated = {
          ...userSession,
          profile_pic_url: url,
          photoURL: url,
          profileImage: url,
          profile_picture: url,
        };
        setUserSession(updated);
        try {
          localStorage.setItem('university_schedule_user', JSON.stringify(updated));
        } catch {}
      }
      showToast('Profile picture updated and saved!');
      return;
    }

    // 2. If passed a File object (user selected photo from camera or device)
    const file = imageFileOrUrl;

    // A. Validate file type and size
    const validation = validateImageFile(file, 6 * 1024 * 1024);
    if (!validation.valid) {
      showToast(validation.error || 'Please select a valid image file under 6MB');
      return;
    }

    // B. Optimistic immediate UI update via temporary object URL
    const previewUrl = URL.createObjectURL(file);
    const previousPic = profileImage;
    setProfileImage(previewUrl);
    showToast('Uploading profile picture to Cloud Storage...');

    try {
      const userKey = userSession?.uid || userSession?.id || userSession?.matricNumber || userSession?.email || 'student';

      // C. Compress and upload to Firebase Cloud Storage
      const uploadResult = await uploadProfilePicture(file, userKey);
      const downloadUrl = uploadResult.downloadUrl;
      const storagePath = uploadResult.storagePath;

      // Revoke temporary blob URL and set persistent Firebase Storage URL
      URL.revokeObjectURL(previewUrl);
      setProfileImage(downloadUrl);

      // D. Update student's database profile record in Firestore
      if (userSession) {
        const docUserKey = userSession.id || userSession.uid || userSession.email || userSession.matricNumber;
        await updateStudentUser(docUserKey, {
          profile_pic_url: downloadUrl,
          photoURL: downloadUrl,
          profileImage: downloadUrl,
          profile_picture: downloadUrl,
          profile_pic_storage_path: storagePath,
        });
        await updateStudentProfileInDb(docUserKey, {
          profile_pic_url: downloadUrl,
          photoURL: downloadUrl,
          profileImage: downloadUrl,
          profile_picture: downloadUrl,
          profile_pic_storage_path: storagePath,
        });

        const updatedSession: UserSession = {
          ...userSession,
          profile_pic_url: downloadUrl,
          photoURL: downloadUrl,
          profileImage: downloadUrl,
          profile_picture: downloadUrl,
          profile_pic_storage_path: storagePath,
        };
        setUserSession(updatedSession);

        try {
          localStorage.setItem('university_schedule_user', JSON.stringify(updatedSession));
        } catch {}
      }

      showToast('Profile picture saved to your student profile!');
      addActivityNotification(
        'Profile Picture Updated',
        'Your profile picture was uploaded to Cloud Storage and saved permanently.',
        'profile',
        'success'
      );
    } catch (err: any) {
      console.error('Failed to upload profile picture to Firebase Storage:', err);
      // Revert optimistic preview
      setProfileImage(previousPic);
      URL.revokeObjectURL(previewUrl);
      showToast(err.message || 'Failed to upload photo. Please check your connection and try again.');
    }
  };

  // Course Rep Module / Course Management Handlers
  const handleAddCourse = async (newCourseData: CourseFormData) => {
    try {
      const created = await createCourse(newCourseData);
      if (created) {
        setCourses((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        showToast(`Module ${created.courseCode} added successfully!`);
        addActivityNotification(
          'Module Registered',
          `${created.courseCode}: ${created.title} was registered for ${created.semester}.`,
          'modules',
          'success'
        );

        recordActivityNotification({
          title: `Module Registered: ${created.courseCode}`,
          message: `${created.courseCode}: ${created.title} has been added to the curriculum.`,
          category: 'modules',
          type: 'success',
          department_id: deptId,
          department: userSession?.department,
          level: activeLevel,
          semester: activeSemester,
          author: userSession?.fullName || 'Course Rep',
          target_id: created.id,
          dispatchPush: true,
        }).catch(() => {});

        return true;
      }
    } catch (err) {
      console.error('Failed to add course:', err);
      showToast('Failed to add module. Please try again.');
    }
    return false;
  };

  const handleEditCourse = async (courseId: string, updates: Partial<CourseFormData>) => {
    try {
      const updated = await updateCourse(courseId, updates);
      if (updated) {
        setCourses((prev) => prev.map((c) => (c.id === courseId ? updated : c)));
        showToast(`Module ${updated.courseCode} updated successfully!`);
        addActivityNotification(
          'Module Updated',
          `Curriculum details for ${updated.courseCode} (${updated.title}) were updated.`,
          'modules',
          'info'
        );

        recordActivityNotification({
          title: `Module Updated: ${updated.courseCode}`,
          message: `Curriculum details for ${updated.courseCode} (${updated.title}) were updated.`,
          category: 'modules',
          type: 'info',
          department_id: deptId,
          department: userSession?.department,
          level: activeLevel,
          semester: activeSemester,
          author: userSession?.fullName || 'Course Rep',
          target_id: updated.id,
          dispatchPush: true,
        }).catch(() => {});

        return true;
      }
    } catch (err) {
      console.error('Failed to update course:', err);
      showToast('Failed to update course');
    }
    return false;
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const target = courses.find((c) => c.id === courseId);
      const success = await deleteCourse(courseId);
      if (success) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
        showToast(`Module ${target?.courseCode || ''} deleted`);
        addActivityNotification(
          'Module Removed',
          `${target?.courseCode || 'Course'} was removed from the curriculum.`,
          'modules',
          'info'
        );
        return true;
      }
    } catch (err) {
      console.error('Failed to delete course:', err);
      showToast('Failed to delete module');
    }
    return false;
  };

  const handleTriggerRefresh = async () => {
    setIsDataLoading(true);
    await syncStudentPortalData();
    setTimeout(() => {
      setIsDataLoading(false);
      showToast('Timetable & student data refreshed');
    }, 400);
  };

  // Assignment / Deadline Handlers
  const handleToggleCompleteAssignment = async (id: string) => {
    let newStatus = false;
    setAssignments((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          newStatus = !item.isCompleted;
          const updated: AssignmentItem = {
            ...item,
            isCompleted: newStatus,
            completedAt: newStatus ? 'Completed today' : undefined,
          };
          if (selectedAssignmentForDetails?.id === id) {
            setSelectedAssignmentForDetails(updated);
          }
          showToast(newStatus ? `Completed: ${item.title}` : `Reopened: ${item.title}`);
          addActivityNotification(
            newStatus ? 'Assignment Completed' : 'Assignment Reopened',
            newStatus
              ? `You marked ${item.course}: ${item.title} as completed.`
              : `You changed ${item.course}: ${item.title} status back to pending.`,
            'deadline',
            newStatus ? 'success' : 'info'
          );
          return updated;
        }
        return item;
      })
    );
    await updateAssignment(id, { isCompleted: newStatus });
  };

  const handleSaveAssignment = async (savedAssignment: AssignmentItem) => {
    const isEdit = !!editingAssignment;
    setAssignments((prev) => {
      const exists = prev.some((a) => a.id === savedAssignment.id);
      if (exists) {
        return prev.map((a) => (a.id === savedAssignment.id ? savedAssignment : a));
      }
      return [savedAssignment, ...prev];
    });

    if (selectedAssignmentForDetails?.id === savedAssignment.id) {
      setSelectedAssignmentForDetails(savedAssignment);
    }

    showToast(`Deadline saved: ${savedAssignment.title}`);
    addActivityNotification(
      'Deadline Saved',
      `Assignment ${savedAssignment.course} (${savedAssignment.title}) has been updated.`,
      'deadline',
      'info'
    );

    const notifTitle = isEdit ? `Deadline Updated: ${savedAssignment.course}` : `New Deadline: ${savedAssignment.course}`;
    const notifMsg = `${savedAssignment.title} is due on ${savedAssignment.dueDate || 'date announced'} at ${savedAssignment.dueTime || 'time announced'}. Check Deadlines tab.`;

    recordActivityNotification({
      title: notifTitle,
      message: notifMsg,
      category: 'deadline',
      type: isEdit ? 'info' : 'alert',
      department_id: savedAssignment.department_id || activeDeptId,
      department: userSession?.department,
      level: activeLevel,
      semester: activeSemester,
      author: userSession?.fullName || 'Course Rep',
      target_id: savedAssignment.id,
      dispatchPush: true,
    }).catch(() => {});

    if (isEdit) {
      await updateAssignment(savedAssignment.id, savedAssignment);
    } else {
      await createAssignment(savedAssignment);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    const target = assignments.find((a) => a.id === id);
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    if (selectedAssignmentForDetails?.id === id) {
      setSelectedAssignmentForDetails(null);
    }
    showToast(`Deleted deadline: ${target?.title || ''}`);

    const courseCode = target?.course || '';
    const assignmentTitle = target?.title || 'Assignment';
    const deletedTitle = `Deadline Deleted: ${courseCode ? courseCode + ' - ' : ''}${assignmentTitle}`;
    const deletedMsg = `The deadline for ${courseCode || 'course'} (${assignmentTitle})${target?.dueDate ? ` originally due ${target.dueDate}` : ''} has been deleted by the ${isCourseRep ? 'Course Rep' : 'Faculty'}.`;

    // Update or add the notification on the notifications page: "Deadline Deleted"
    setNotifications((prev) => {
      const existingIdx = prev.findIndex(
        (n) =>
          n.id === `notif_deadline_deleted_${id}` ||
          (n.target_id && n.target_id === id) ||
          (n.category === 'deadline' && target?.title && n.title.includes(target.title) && !n.title.toLowerCase().includes('deleted'))
      );
      const updatedItem: NotificationItem = {
        id: `notif_deadline_deleted_${id}`,
        title: deletedTitle,
        message: deletedMsg,
        time: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        isUnread: true,
        type: 'alert',
        category: 'deadline',
        department_id: target?.department_id,
        level: target?.level,
        semester: target?.semester,
        timestamp: Date.now(),
        status: 'deleted',
        target_id: id,
      };

      if (existingIdx >= 0) {
        return [updatedItem, ...prev.filter((_, idx) => idx !== existingIdx)];
      }
      return [updatedItem, ...prev];
    });

    await deleteAssignment(id);
    if (target) {
      await recordOrUpdateDeadlineDeletedNotification(target, isCourseRep ? 'Course Rep' : 'Faculty');
    }
  };

  const handleAddImagesToAssignment = (id: string, newImages: string[]) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const updated = {
            ...a,
            images: [...(a.images || []), ...newImages],
          };
          if (selectedAssignmentForDetails?.id === id) {
            setSelectedAssignmentForDetails(updated);
          }
          return updated;
        }
        return a;
      })
    );
    showToast(`Added ${newImages.length} image attachment${newImages.length > 1 ? 's' : ''}`);
    addActivityNotification(
      'Images Attached',
      `Uploaded ${newImages.length} diagram photo(s) to assignment.`,
      'deadline',
      'info'
    );
  };

  const handleDeleteAssignmentImage = (id: string, imageIndex: number) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const newImages = (a.images || []).filter((_, idx) => idx !== imageIndex);
          const updated = {
            ...a,
            images: newImages,
          };
          if (selectedAssignmentForDetails?.id === id) {
            setSelectedAssignmentForDetails(updated);
          }
          return updated;
        }
        return a;
      })
    );
    showToast('Image attachment removed');
  };

  const handleCreateBroadcast = async (data: {
    title: string;
    message: string;
    priority?: 'urgent' | 'normal';
    category?: string;
    images?: string[];
  }) => {
    try {
      const created = await createAnnouncement({
        title: data.title,
        message: data.message,
        priority: data.priority,
        author: userSession?.fullName || (isCourseRep ? 'Course Rep' : 'Faculty Admin'),
        department_id: deptId,
        level: activeLevel,
        semester: activeSemester,
        images: data.images || [],
      });
      if (created) {
        const broadcastItem: NotificationItem = {
          ...created,
          timestamp: created.timestamp || Date.now(),
        };
        // Add to dedicated broadcasts state
        setBroadcasts((prev) => [
          broadcastItem,
          ...prev.filter(
            (b) =>
              b.id !== broadcastItem.id &&
              !(
                b.title.trim().toLowerCase() === broadcastItem.title.trim().toLowerCase() &&
                b.message.trim().toLowerCase() === broadcastItem.message.trim().toLowerCase()
              )
          ),
        ]);
        showToast('Broadcast published to students!');

        recordActivityNotification({
          title: `Announcement: ${created.title}`,
          message: created.message,
          category: 'broadcast',
          type: created.type as any,
          department_id: deptId,
          department: userSession?.department,
          level: activeLevel,
          semester: activeSemester,
          author: created.author || 'Course Rep',
          target_id: created.id,
          dispatchPush: false,
        }).catch(() => {});

        return true;
      }
    } catch (err) {
      console.error('Error creating broadcast:', err);
      showToast('Failed to publish broadcast');
    }
    return false;
  };

  const handleAddImagesToBroadcast = async (id: string, newImages: string[]) => {
    let updatedList: string[] = [];
    setBroadcasts((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const current = b.images || [];
          updatedList = [...current, ...newImages];
          const updated = {
            ...b,
            images: updatedList,
          };
          if (selectedBroadcastForDetails?.id === id) {
            setSelectedBroadcastForDetails(updated);
          }
          return updated;
        }
        return b;
      })
    );
    showToast(`Added ${newImages.length} image${newImages.length > 1 ? 's' : ''}`);
    addActivityNotification(
      'Broadcast Updated',
      `Attached ${newImages.length} image(s) to notice.`,
      'broadcast',
      'info'
    );
    try {
      await updateAnnouncement(id, { images: updatedList });
    } catch (err) {
      console.error('Error updating broadcast images:', err);
    }
  };

  const handleDeleteBroadcastImage = async (id: string, imageIndex: number) => {
    let updatedList: string[] = [];
    setBroadcasts((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const current = b.images || [];
          updatedList = current.filter((_, idx) => idx !== imageIndex);
          const updated = {
            ...b,
            images: updatedList,
          };
          if (selectedBroadcastForDetails?.id === id) {
            setSelectedBroadcastForDetails(updated);
          }
          return updated;
        }
        return b;
      })
    );
    showToast('Image removed from notice');
    try {
      await updateAnnouncement(id, { images: updatedList });
    } catch (err) {
      console.error('Error removing broadcast image:', err);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    try {
      const target = broadcasts.find((b) => b.id === id) || notifications.find((n) => n.id === id);
      showToast('Broadcast deleted');

      // Remove immediately from broadcasts state
      setBroadcasts((prev) => prev.filter((b) => b.id !== id));

      const originalTitle = (target?.title || 'Announcement').replace(/^Broadcast Deleted:\s*/i, '');
      const updatedTitle = `Broadcast Deleted: ${originalTitle}`;
      const updatedMsg = `This broadcast notice was deleted/retracted by the ${isCourseRep ? 'Course Rep' : 'Faculty'}.`;

      // Prepend deletion notification to standard notifications (activity feed)
      setNotifications((prev) => {
        const targetNotif = prev.find((n) => n.id === id || n.target_id === id);
        const updatedItem: NotificationItem = {
          ...(targetNotif || {}),
          id: targetNotif?.id || `notif-del-${id}`,
          title: updatedTitle,
          message: updatedMsg,
          type: 'alert',
          category: 'broadcast',
          isDeleted: true,
          is_deleted: true,
          status: 'deleted',
          images: [],
          isUnread: true,
          time: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          timeAgo: 'Just now',
          timestamp: Date.now(),
        };
        return [updatedItem, ...prev.filter((n) => n.id !== id && n.target_id !== id)];
      });

      if (selectedBroadcastForDetails?.id === id) {
        setSelectedBroadcastForDetails(null);
      }

      await recordOrUpdateBroadcastDeletedNotification(id, isCourseRep ? 'Course Rep' : 'Faculty');
      return true;
    } catch (err) {
      console.error('Error deleting broadcast:', err);
      showToast('Failed to delete broadcast');
    }
    return false;
  };

  const handleEditAssignmentModal = (assignment: AssignmentItem) => {
    setEditingAssignment(assignment);
    setIsDeadlineModalOpen(true);
  };

  const handleFloatingActionClick = () => {
    if (activeTab === 'Schedule') {
      setEditingEvent(null);
      setIsEditModalOpen(true);
    } else if (activeTab === 'Deadlines') {
      setEditingAssignment(null);
      setIsDeadlineModalOpen(true);
    } else if (activeTab === 'Broadcasts') {
      setIsBroadcastModalOpen(true);
    } else if (activeTab === 'Modules') {
      showToast('Module registration opened');
      setEditingEvent(null);
      setIsEditModalOpen(true);
    }
  };

  const floatingButtonTitle = useMemo(() => {
    switch (activeTab) {
      case 'Schedule':
        return 'Add Class / Event';
      case 'Deadlines':
        return 'Add Deadline';
      case 'Broadcasts':
        return 'Post Notice';
      case 'Modules':
        return 'Enroll Module';
      default:
        return 'Add Item';
    }
  }, [activeTab]);

  const selectedDateNum = useMemo(() => {
    const currentDay = days.find((d) => d.id === selectedDayId);
    return currentDay ? currentDay.dateNum : 19;
  }, [days, selectedDayId]);

  // Master animation variants for page transitions - optimized for high-performance instant response
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 3,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.12,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.08,
        ease: [0.4, 0, 1, 1] as [number, number, number, number],
      },
    },
  };

  // Ref to ensure payment return flow only runs once and never loops
  const hasProcessedPaymentReturnRef = useRef<boolean>(false);

  // Check once on mount if returning from payment gateway callback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = window.location.search;
    const isPaymentReturn =
      search.includes('payment_success') ||
      search.includes('paid=true') ||
      search.includes('reference=') ||
      search.includes('trxref=');

    if (!isPaymentReturn || hasProcessedPaymentReturnRef.current) return;
    hasProcessedPaymentReturnRef.current = true;

    // Immediately clean URL search query so subsequent renders and route listeners see a clean URL
    const cleanUrl = window.location.pathname + (window.location.hash || '');
    try {
      window.history.replaceState({}, document.title, cleanUrl || '/');
    } catch {}

    const handleReturnSuccess = async () => {
      const params = new URLSearchParams(search);
      const payReference = params.get('reference') || params.get('trxref');
      const studentQuery = params.get('student') || params.get('matric') || params.get('email');
      const semesterQuery = params.get('semester');

      try {
        const raw = localStorage.getItem('university_schedule_user');
        let currentUser: any = raw ? JSON.parse(raw) : null;
        const currentSession = userSessionRef.current || currentUser;
        const targetId = studentQuery || currentSession?.uid || currentSession?.matricNumber || currentSession?.matric_number || currentSession?.email;

        // If reference exists, ensure verified in backend & Firestore
        if (payReference && targetId) {
          try {
            await recordVerifiedSemesterPayment(
              targetId,
              payReference,
              semesterQuery || activeSemester || '1st Semester 2025/2026',
              3000
            );
          } catch (recErr) {
            console.warn('Payment record notice on app return:', recErr);
          }
        }

        // Immediately grant paid access in state & storage
        const semToSet = semesterQuery || currentSession?.paid_semester || activeSemester || '1st Semester 2025/2026';
        const updatedUser = {
          ...(currentSession || {}),
          isLoggedIn: true,
          is_paid: true,
          is_payed: true,
          paid_semester: semToSet,
          paid_at: currentSession?.paid_at || new Date().toISOString(),
        };

        userSessionRef.current = updatedUser;
        setUserSession(updatedUser);
        try {
          localStorage.setItem('university_schedule_user', JSON.stringify(updatedUser));
        } catch {}

        // Close any lingering payment view
        setIsPaymentView(false);

        // Re-fetch fresh student profile from Firestore
        if (targetId) {
          const fresh = await fetchStudentByEmailOrMatric(targetId);
          if (fresh) {
            const finalSynced: UserSession = {
              ...(userSessionRef.current || {}),
              ...fresh,
              department: fresh.department || userSessionRef.current?.department || 'Department of Industrial Chemistry',
              department_id: fresh.department_id || userSessionRef.current?.department_id || 'dept-ich',
              level: fresh.level || userSessionRef.current?.level || 100,
              yearLevel: `${fresh.level || userSessionRef.current?.level || 100} Level`,
              year_level: `${fresh.level || userSessionRef.current?.level || 100} Level`,
              fullName: fresh.full_name || fresh.fullName || userSessionRef.current?.fullName || 'Student',
              matricNumber: fresh.matric_number || fresh.matricNumber || userSessionRef.current?.matricNumber || '',
              isLoggedIn: true,
              is_paid: true,
              is_payed: true,
              paid_semester: fresh.paid_semester || semToSet,
            };
            userSessionRef.current = finalSynced;
            setUserSession(finalSynced);
            try {
              localStorage.setItem('university_schedule_user', JSON.stringify(finalSynced));
            } catch {}
          }
        }
      } catch (e) {
        console.warn('Payment success return notice:', e);
      }
    };

    handleReturnSuccess();
  }, []);

  // Refresh student payment status from database whenever app gains focus or becomes visible
  useEffect(() => {
    const handleReverifyOnFocus = async () => {
      const current = userSessionRef.current;
      if (document.visibilityState === 'visible' && current) {
        const id = current.uid || current.matricNumber || current.email;
        if (id) {
          try {
            const freshStudent = await fetchStudentByEmailOrMatric(id);
            if (freshStudent) {
              const isPaid = Boolean(
                freshStudent.is_paid ||
                freshStudent.is_payed ||
                freshStudent.hasFreeAccess ||
                freshStudent.iscourserep ||
                freshStudent.isCourseRep ||
                freshStudent.isadmin ||
                freshStudent.isAdmin
              );
              setUserSession((prev) => {
                if (!prev) return null;
                const wasPaid = Boolean(prev.is_paid || prev.is_payed);
                if (wasPaid === isPaid && prev.paid_semester === freshStudent.paid_semester) return prev;
                const updated = {
                  ...prev,
                  is_paid: isPaid,
                  is_payed: isPaid,
                  paid_semester: freshStudent.paid_semester,
                };
                userSessionRef.current = updated;
                return updated;
              });
            }
          } catch (e) {}
        }
      }
    };

    window.addEventListener('visibilitychange', handleReverifyOnFocus);
    window.addEventListener('focus', handleReverifyOnFocus);
    return () => {
      window.removeEventListener('visibilitychange', handleReverifyOnFocus);
      window.removeEventListener('focus', handleReverifyOnFocus);
    };
  }, []);

  // Dedicated Desktop-Only Admin Dashboard Route (/adminschedulerapp)
  if (isAdminView) {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono tracking-wide">Loading University Admin Portal...</p>
          </div>
        }
      >
        <AdminDashboard
          onBackToStudentPortal={() => {
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/');
            }
            setIsAdminView(false);
          }}
          initialEvents={events}
          initialAssignments={assignments}
          initialNotifications={notifications}
          currentSemester={currentSemester}
          onGlobalSyncEvents={handleGlobalSyncEvents}
          onGlobalSyncAssignments={handleGlobalSyncAssignments}
          onGlobalSyncNotifications={handleGlobalSyncNotifications}
          onGlobalSyncSemester={(newSem) => {
            const parsed = normalizeSemester(newSem);
            setCurrentSemester(parsed);
            setUserSession((prev) => {
              if (!prev) return null;
              const updated = {
                ...prev,
                semester: parsed,
                current_semester: parsed,
              };
              try {
                localStorage.setItem('university_schedule_user', JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });
          }}
        />
      </React.Suspense>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Student Portal Safe Mode">
      <div className="min-h-screen min-h-[100dvh] w-full bg-[#F5F5F7] text-[#1C1C1E] relative overflow-x-hidden flex flex-col items-center">
        {/* Splash Screen */}
        <AnimatePresence>
          {showSplash && (
            <SplashScreen
              onComplete={handleDismissSplash}
              appName="Scheduler"
              isReady={isStartupVerified}
              statusMessage={splashStatusMessage}
            />
          )}
        </AnimatePresence>

        {/* Main Content: Authenticated Dashboard vs Login Screen vs Payment View */}
        {!userSession ? (
          <LoginPage onLogin={handleLogin} />
        ) : isPaymentView ? (
          <div className="w-full max-w-[440px] sm:max-w-[480px] md:max-w-[500px] min-h-screen flex flex-col px-3 xs:px-4 py-2 sm:py-3.5 relative">
            <PaymentPage
              initialUserSession={userSession}
              onReturnToApp={handlePaymentReturnToApp}
            />
          </div>
        ) : isDirectWalletOpen ? (
          <div className="w-full max-w-[440px] sm:max-w-[480px] md:max-w-[500px] min-h-screen flex flex-col px-3 xs:px-4 pt-1 pb-16 relative">
            <WalletView
              onBack={() => setIsDirectWalletOpen(false)}
              userSession={userSession}
              activeLevel={activeLevel}
              activeSemester={activeSemester}
              isCourseRep={isCourseRep}
              onSessionUpdated={handleUpdateUserSession}
              onOpenPaymentPage={() => {
                setIsDirectWalletOpen(false);
                setIsPaymentView(true);
              }}
            />
          </div>
        ) : (
          <>
            {/* Ambient Soft Gradient Orbs in Background */}
            <div className="fixed top-[-100px] left-[-80px] w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-blue-300/35 to-sky-200/40 blur-[90px] pointer-events-none -z-10" />
            <div className="fixed top-[280px] right-[-100px] w-[360px] h-[360px] rounded-full bg-gradient-to-br from-indigo-200/30 to-purple-200/25 blur-[100px] pointer-events-none -z-10" />
            <div className="fixed bottom-[-60px] left-[15%] w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-sky-200/35 to-emerald-100/30 blur-[110px] pointer-events-none -z-10" />

            {/* Main Container mimicking iOS/Android native screen boundaries */}
            <div className="w-full max-w-[440px] sm:max-w-[480px] md:max-w-[500px] min-h-screen min-h-[100dvh] flex flex-col px-3 xs:px-3.5 sm:px-4 pt-0.5 pb-20 sm:pb-24 relative overflow-y-visible">
              {/* Standalone User Profile Pill & Icons fixed in position hovering over content */}
              {activeTab !== 'Notifications' && (
                <div className="fixed top-1 inset-x-0 max-w-[440px] sm:max-w-[480px] md:max-w-[500px] mx-auto px-3 xs:px-3.5 sm:px-4 z-40 pointer-events-none safe-area-top">
                  <div className="pointer-events-auto">
                    <HeaderSection
                      onOpenNotifications={() => {
                        if (!isPaidAccess) return;
                        setActiveTab('Notifications');
                      }}
                      onOpenCalendarView={() => {
                        if (!isPaidAccess) return;
                        setActiveTab(activeTab === 'Calendar' ? 'Schedule' : 'Calendar');
                        setSelectedAssignmentForDetails(null);
                        setSelectedBroadcastForDetails(null);
                        setSelectedCourseForDetails(null);
                      }}
                      onOpenProfileTab={() => setActiveTab('Profile')}
                      unreadCount={unreadNotifCount}
                      profileImage={profileImage}
                      onUploadProfileImage={handleProfileImageUpload}
                      isNotificationsActive={false}
                      isCalendarActive={activeTab === 'Calendar'}
                      userSession={userSession}
                      isAccessBlocked={!isPaidAccess}
                    />
                  </div>
                </div>
              )}

              {/* iOS Dynamic Header & Status Bar Area */}
              <div className={`space-y-3 sm:space-y-4 flex-1 ${activeTab !== 'Notifications' ? 'pt-[74px] sm:pt-[80px]' : 'pt-2.5 sm:pt-3'}`}>
                {/* Offline Cache Status Banner */}
                {!isOnline && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2.5 rounded-2xl bg-amber-500/90 text-white text-[12px] font-semibold flex items-center justify-center gap-2 shadow-xs backdrop-blur-md border border-amber-400/40 text-center"
                  >
                    <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
                    <span>Offline Mode • Using cached schedules, deadlines &amp; modules</span>
                  </motion.div>
                )}

                {/* Conditional View by Active Navigation Tab */}
                <AnimatePresence mode="wait">
                  {!isPaidAccess && activeTab !== 'Profile' ? (
                    <motion.div
                      key="tab-locked-semester-access"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <SemesterAccessLockView
                        userSession={userSession}
                        activeSemester={activeSemester}
                        onOpenWallet={() => setIsDirectWalletOpen(true)}
                        onNavigateToProfile={() => setActiveTab('Profile')}
                        onOpenPaymentPage={() => {
                          setIsPaymentView(true);
                        }}
                      />
                    </motion.div>
                  ) : activeTab === 'Schedule' ? (
                    <motion.div
                      key="tab-schedule"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="space-y-4 pt-1 sm:pt-1.5"
                    >
                      {/* Day Timeline Section */}
                      <DayTimelineSection
                        days={updatedDays}
                        selectedDayId={selectedDayId}
                        onSelectDay={(id) => setSelectedDayId(id)}
                        isLoading={isDataLoading}
                      />

                      {/* Today's Activities Section */}
                      <ActivitiesSection
                        events={currentDayEvents}
                        selectedDayName={selectedDayId}
                        onOpenMenu={handleOpenMenu}
                        onSelectCard={(evt) => handleOpenMenu(evt)}
                        isLoading={isDataLoading}
                      />
                    </motion.div>
                  ) : activeTab === 'Calendar' ? (
                    <motion.div
                      key="tab-calendar"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <CalendarView
                        events={filteredEvents}
                        days={updatedDays}
                        selectedDateNum={selectedDateNum}
                        onSelectDate={(dateNum, dayId, dateObj) => {
                          const targetDate = dateObj || new Date(new Date().getFullYear(), new Date().getMonth(), dateNum);
                          const newWeekDays = getWeekDaysForDate(targetDate);
                          setDays(newWeekDays);
                          setSelectedDayId(dayId);
                          setActiveTab('Schedule');
                          setSelectedAssignmentForDetails(null);
                          setSelectedBroadcastForDetails(null);
                          setSelectedCourseForDetails(null);
                          const matchedDay = newWeekDays.find((d) => d.id === dayId || d.dateNum === dateNum);
                          if (matchedDay) {
                            showToast(`Viewing schedule for ${matchedDay.fullDate}`);
                          } else {
                            showToast(`Viewing schedule for ${dayId}`);
                          }
                        }}
                        activeLevel={activeLevel}
                        activeSemester={activeSemester}
                        departmentName={userSession?.department || 'Department of Industrial Chemistry'}
                      />
                    </motion.div>
                  ) : activeTab === 'Notifications' ? (
                    <motion.div
                      key="tab-notifications"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <NotificationsView
                        notifications={notifications}
                        onBackToSchedule={() => setActiveTab('Schedule')}
                        onDeleteNotif={handleDeleteNotif}
                        onMarkAsRead={handleMarkSingleNotifRead}
                        isLoading={isDataLoading}
                      />
                    </motion.div>
                  ) : activeTab === 'Deadlines' ? (
                    <motion.div
                      key={selectedAssignmentForDetails ? `tab-deadline-detail-${selectedAssignmentForDetails.id}` : 'tab-deadlines'}
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {selectedAssignmentForDetails ? (
                        <AssignmentDetailsView
                          assignment={selectedAssignmentForDetails}
                          onBack={() => setSelectedAssignmentForDetails(null)}
                          onToggleComplete={handleToggleCompleteAssignment}
                          onEdit={handleEditAssignmentModal}
                          onDelete={handleDeleteAssignment}
                          onAddImages={handleAddImagesToAssignment}
                          onDeleteImage={handleDeleteAssignmentImage}
                          isCourseRep={isCourseRep}
                        />
                      ) : (
                        <DeadlinesView
                          onBackToSchedule={() => setActiveTab('Schedule')}
                          assignments={assignments}
                          onSelectAssignment={(asn) => setSelectedAssignmentForDetails(asn)}
                          onToggleCompleteAssignment={handleToggleCompleteAssignment}
                          onAddNewDeadline={() => {
                            setEditingAssignment(null);
                            setIsDeadlineModalOpen(true);
                          }}
                          isLoading={isDataLoading}
                          isCourseRep={isCourseRep}
                          userSession={userSession}
                          currentSemester={currentSemester}
                          activeLevel={activeLevel}
                          activeSemester={activeSemester}
                        />
                      )}
                    </motion.div>
                  ) : activeTab === 'Broadcasts' ? (
                    <motion.div
                      key={selectedBroadcastForDetails ? `tab-broadcast-detail-${selectedBroadcastForDetails.id}` : 'tab-broadcasts'}
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {selectedBroadcastForDetails ? (
                        <BroadcastDetailsView
                          broadcast={selectedBroadcastForDetails}
                          onBack={() => setSelectedBroadcastForDetails(null)}
                          onDeleteBroadcast={async (id) => {
                            await handleDeleteBroadcast(id);
                            setSelectedBroadcastForDetails(null);
                          }}
                          onAddImages={handleAddImagesToBroadcast}
                          onDeleteImage={handleDeleteBroadcastImage}
                          isCourseRep={isCourseRep}
                        />
                      ) : (
                        <BroadcastsView
                          onBackToSchedule={() => setActiveTab('Schedule')}
                          isLoading={isDataLoading}
                          broadcasts={broadcasts}
                          notifications={notifications}
                          userSession={userSession}
                          isCourseRep={isCourseRep}
                          currentSemester={currentSemester}
                          activeLevel={activeLevel}
                          activeSemester={activeSemester}
                          onSelectBroadcast={(b) => setSelectedBroadcastForDetails(b)}
                          onAddBroadcast={handleCreateBroadcast}
                          onDeleteBroadcast={handleDeleteBroadcast}
                          isPostBroadcastModalOpen={isBroadcastModalOpen}
                          onOpenPostBroadcastModal={() => setIsBroadcastModalOpen(true)}
                          onClosePostBroadcastModal={() => setIsBroadcastModalOpen(false)}
                        />
                      )}
                    </motion.div>
                  ) : activeTab === 'Modules' ? (
                    <motion.div
                      key={selectedCourseForDetails ? `tab-course-detail-${selectedCourseForDetails.id}` : 'tab-modules'}
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {selectedCourseForDetails ? (
                        <CourseDetailView
                          course={selectedCourseForDetails}
                          onBack={() => setSelectedCourseForDetails(null)}
                          isCourseRep={isCourseRep}
                          userSession={userSession}
                          onDeleteCourse={(course) => {
                            handleDeleteCourse(course.id);
                            setSelectedCourseForDetails(null);
                          }}
                          onCourseUpdated={(updated) => {
                            setSelectedCourseForDetails(updated);
                            handleEditCourse(updated.id, updated);
                          }}
                        />
                      ) : (
                        <ModulesView
                          onBackToSchedule={() => setActiveTab('Schedule')}
                          isLoading={isDataLoading}
                          courses={courses}
                          availableDepartments={departments}
                          userSession={userSession}
                          isCourseRep={isCourseRep}
                          currentSemester={currentSemester}
                          activeLevel={activeLevel}
                          activeSemester={activeSemester}
                          selectedCourseForDetails={selectedCourseForDetails}
                          onSelectCourse={(course) => setSelectedCourseForDetails(course)}
                          onAddCourse={handleAddCourse}
                          onDeleteCourse={handleDeleteCourse}
                          onEditCourse={handleEditCourse}
                        />
                      )}
                    </motion.div>
                  ) : activeTab === 'Profile' ? (
                    <motion.div
                      key="tab-profile"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <ProfileView
                        onBackToSchedule={() => setActiveTab('Schedule')}
                        profileImage={profileImage}
                        onUploadProfileImage={handleProfileImageUpload}
                        onReplaySplash={() => {
                          setIsStartupVerified(true);
                          setShowSplash(true);
                        }}
                        onTriggerRefresh={handleTriggerRefresh}
                        isLoading={isDataLoading}
                        userSession={userSession}
                        onLogout={handleLogout}
                        currentSemester={currentSemester}
                        activeLevel={activeLevel}
                        activeSemester={activeSemester}
                        onUpdateUserSession={handleUpdateUserSession}
                        onAddNotification={addActivityNotification}
                        onNavigateToAdmin={() => {
                          if (typeof window !== 'undefined') {
                            window.history.pushState(null, '', '/adminschedulerapp');
                          }
                          setIsAdminView(true);
                        }}
                        onOpenPaymentPage={() => {
                          setIsPaymentView(true);
                        }}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            {/* Floating Action Button (FAB) - Strictly for Course Rep and not on Modules / Profile / Notifications / Detail views */}
            <AnimatePresence>
              {isCourseRep &&
                isPaidAccess &&
                !isAnyDrawerOpen &&
                activeTab !== 'Profile' &&
                activeTab !== 'Notifications' &&
                activeTab !== 'Modules' &&
                !(activeTab === 'Deadlines' && selectedAssignmentForDetails !== null) &&
                !(activeTab === 'Broadcasts' && selectedBroadcastForDetails !== null) && (
                  <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] inset-x-0 max-w-lg mx-auto pointer-events-none z-40 flex justify-end px-5">
                    <motion.button
                      key="floating-fab-btn"
                      initial={{ opacity: 0, scale: 0.75, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.75, y: 15 }}
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 350 }}
                      onClick={handleFloatingActionClick}
                      aria-label={floatingButtonTitle}
                      title={floatingButtonTitle}
                      className="w-14 h-14 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-[0_10px_28px_rgba(0,122,255,0.45)] hover:bg-[#0069D9] cursor-pointer border border-blue-300/40 group pointer-events-auto transition-colors"
                    >
                      <Plus className="w-7 h-7 text-white stroke-[2.5] transition-transform duration-300 group-hover:rotate-90" />
                    </motion.button>
                  </div>
                )}
            </AnimatePresence>

            {/* Standalone Bottom Navigation Bar - Fixed at position */}
            <AnimatePresence>
              {activeTab !== 'Notifications' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <BottomNavBar
                    activeTab={activeTab}
                    isPaid={isPaidAccess}
                    onSelectTab={(tab) => {
                      if (tab !== 'Deadlines') {
                        setSelectedAssignmentForDetails(null);
                      }
                      if (tab !== 'Broadcasts') {
                        setSelectedBroadcastForDetails(null);
                      }
                      if (tab !== 'Modules') {
                        setSelectedCourseForDetails(null);
                      }
                      setActiveTab(tab);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Action Bar on Notifications Page */}
            <AnimatePresence>
              {activeTab === 'Notifications' && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{
                    opacity: isAnyDrawerOpen ? 0 : 1,
                    y: isAnyDrawerOpen ? 30 : 0,
                    pointerEvents: isAnyDrawerOpen ? 'none' : 'auto',
                  }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-3 pb-3 pt-1 pointer-events-none"
                >
                  <div className="w-full max-w-[440px] sm:max-w-[480px] md:max-w-[500px] flex items-center justify-between gap-2.5 pointer-events-auto">
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      onClick={handleMarkAllNotifsRead}
                      disabled={unreadNotifCount === 0}
                      className={`flex-1 py-2.5 px-4 rounded-[22px] font-bold text-[12px] border backdrop-blur-2xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                        unreadNotifCount > 0
                          ? 'bg-[#007AFF]/90 hover:bg-[#007AFF] text-white border-blue-400/60 shadow-[0_8px_24px_rgba(0,122,255,0.3)]'
                          : 'bg-white/80 text-[#8E8E93] border-white/90 cursor-not-allowed opacity-60 shadow-[0_4px_16px_rgba(0,0,0,0.04)]'
                      }`}
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Mark all read</span>
                    </motion.button>

                    {notifications.length > 0 && (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        onClick={handleClearAllNotifs}
                        className="py-3 px-5 rounded-[28px] bg-red-500/12 hover:bg-red-500/20 text-red-600 font-bold text-[13px] border border-red-200/80 backdrop-blur-2xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_10px_28px_rgba(239,68,68,0.18)] hover:shadow-[0_14px_32px_rgba(239,68,68,0.26)]"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Clear</span>
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Frosted Glass Bottom Sheet */}
            <EventBottomSheet
              isOpen={isBottomSheetOpen}
              event={selectedEventForMenu}
              onClose={() => setIsBottomSheetOpen(false)}
              onEdit={handleEditEvent}
              onDelete={handleDeleteEvent}
              onTogglePostponed={handleTogglePostponed}
              onShare={handleShareEvent}
              isCourseRep={isCourseRep}
            />

            {/* Edit / Add Activity Modal */}
            <EventEditModal
              isOpen={isEditModalOpen}
              event={editingEvent}
              selectedDayKey={selectedDayId}
              onClose={() => setIsEditModalOpen(false)}
              onSave={handleSaveEvent}
              courses={courses}
              currentSemester={currentSemester}
              userSession={userSession}
              days={updatedDays}
            />

            {/* Add / Edit Deadline Modal */}
            <DeadlineEditModal
              isOpen={isDeadlineModalOpen}
              assignment={editingAssignment}
              onClose={() => setIsDeadlineModalOpen(false)}
              onSave={handleSaveAssignment}
              courses={courses}
              currentSemester={currentSemester}
              userSession={userSession}
            />
          </>
        )}

        {/* Toast Notification Pill */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="fixed top-5 z-50 px-4 py-2.5 rounded-full glass-container-solid border border-white text-[13px] font-semibold text-[#1C1C1E] shadow-[0_10px_30px_rgba(0,0,0,0.12)] flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Single-Device Concurrent Login Modal */}
        <AnimatePresence>
          {sessionExpiredNotice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="bg-white rounded-[32px] p-6 max-w-sm w-full text-center shadow-2xl border border-slate-100 space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-[18px] font-extrabold text-slate-900 tracking-tight">
                    Session Logged Out
                  </h3>
                  <p className="text-[12.5px] text-slate-600 font-medium leading-relaxed">
                    {sessionExpiredNotice}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11.5px] text-slate-500 flex items-center justify-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>Only one device per student account is active.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSessionExpiredNotice(null)}
                  className="w-full py-3 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white font-bold text-[14px] transition-colors shadow-lg shadow-blue-500/25 cursor-pointer"
                >
                  Return to Sign In
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Permissions Request Modal on Startup / Manual */}
        <PermissionsPromptModal
          isOpen={showPermissionsPrompt}
          onClose={() => setShowPermissionsPrompt(false)}
          userSession={userSession}
        />
      </div>
    </ErrorBoundary>
  );
}
