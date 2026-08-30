import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { HeaderSection } from './components/HeaderSection';
import { DayTimelineSection } from './components/DayTimelineSection';
import { ActivitiesSection } from './components/ActivitiesSection';
import { EventBottomSheet } from './components/EventBottomSheet';
import { BottomNavBar } from './components/BottomNavBar';
import { EventEditModal } from './components/EventEditModal';
import { CalendarModal } from './components/CalendarModal';
import { SplashScreen } from './components/SplashScreen';
import { NotificationsView } from './components/NotificationsView';
import { DeadlinesView, BroadcastsView, ModulesView, ProfileView } from './components/OtherViews';
import { AssignmentDetailsView } from './components/AssignmentDetailsView';
import { CourseDetailView } from './components/CourseDetailView';
import { DeadlineEditModal } from './components/DeadlineEditModal';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './admin/AdminDashboard';
import { INITIAL_DAYS } from './data/mockData';
import { AssignmentItem, EventItem, NavigationTab, NotificationItem, UserSession } from './types';
import { Plus, Check, CheckCheck, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  fetchScheduleActivities,
  createScheduleActivity,
  updateScheduleActivity,
  deleteScheduleActivity,
  fetchAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  fetchAnnouncementsAndNotifications,
  createAnnouncement,
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
} from './lib/dbService';
import { CourseRecord, DepartmentRecord } from './admin/types';
import { CourseFormData } from './components/AddCourseModal';
import { getStudentActiveLevel, getStudentActiveSemester } from './lib/academicScope';

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

  const [isAdminView, setIsAdminView] = useState<boolean>(() => checkIsAdminRoute());

  useEffect(() => {
    const handleUrlChange = () => {
      setIsAdminView(checkIsAdminRoute());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const [days, setDays] = useState(INITIAL_DAYS);
  const [selectedDayId, setSelectedDayId] = useState<string>('WED 19');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [currentSemester, setCurrentSemester] = useState<string>('1st Semester');
  const [activeTab, setActiveTab] = useState<NavigationTab>('Schedule');
  const [showSplash, setShowSplash] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  
  // Student Portal Auth Session
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('university_schedule_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          level: parsed.level || 100,
          year_level: parsed.year_level || `${parsed.level || 100} Level`,
          yearLevel: parsed.yearLevel || `${parsed.level || 100} Level`,
          semester: parsed.semester || '1st Semester',
          current_semester: parsed.current_semester || '1st Semester',
          session: parsed.session || '2025/2026',
          academic_session: parsed.academic_session || '2025/2026',
        };
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const isCourseRep = Boolean(
    userSession?.isCourseRep ||
    userSession?.isAdmin ||
    (userSession as any)?.iscourserep ||
    (userSession as any)?.isadmin
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Helper to add activity notification
  const addActivityNotification = useCallback(
    (title: string, message: string, category: 'schedule' | 'profile' | 'deadline' | 'system' = 'schedule', type: 'activity' | 'alert' | 'info' | 'success' = 'activity') => {
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
    },
    []
  );

  // Sync Student Portal with Firebase Firestore
  const syncStudentPortalData = useCallback(async () => {
    try {
      // Purge any lingering mock schedule/deadline/broadcast records from Firestore
      purgeMockScheduleDeadlinesAndBroadcasts().catch(() => {});

      const [dbEvents, dbAssigns, dbNotifs, dbCourses, dbSem, dbDepts] = await Promise.all([
        fetchScheduleActivities(),
        fetchAssignments(),
        fetchAnnouncementsAndNotifications(),
        fetchCourses(),
        fetchCurrentSemester(),
        fetchDepartments(),
      ]);

      if (dbEvents) {
        setEvents(dbEvents);
      }
      if (dbAssigns) {
        setAssignments(dbAssigns);
      }
      if (dbNotifs) {
        setNotifications(dbNotifs);
      }
      if (dbCourses) {
        setCourses(dbCourses);
      }
      if (dbDepts && Array.isArray(dbDepts)) {
        setDepartments(dbDepts);
      }
      if (dbSem?.semester_code) {
        const parsed = normalizeSemester(dbSem.semester_code);
        setCurrentSemester(parsed);
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

  // On mount and when session activates, subscribe to live Firestore changes
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeDatabase({
      onEvents: (dbEvents) => {
        if (dbEvents) setEvents(dbEvents);
      },
      onAssignments: (dbAssigns) => {
        if (dbAssigns) setAssignments(dbAssigns);
      },
      onNotifications: (dbNotifs) => {
        if (dbNotifs) setNotifications(dbNotifs);
      },
      onCourses: (dbCourses) => {
        if (dbCourses) setCourses(dbCourses);
      },
      onCurrentSemester: (code) => {
        if (code) {
          const parsed = normalizeSemester(code);
          setCurrentSemester(parsed);
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
        if (userSession && allStudents && allStudents.length > 0) {
          const currentMatric = (userSession.matricNumber || '').toUpperCase().trim();
          const currentEmail = (userSession.email || '').toLowerCase().trim();
          const currentUid = userSession.uid || userSession.id || '';

          const matched = allStudents.find((s) => {
            const sMatric = (s.matric_number || s.matricNumber || '').toUpperCase().trim();
            const sEmail = (s.email || '').toLowerCase().trim();
            const sUid = s.uid || s.id || '';
            return (currentUid && sUid === currentUid) || (currentMatric && sMatric === currentMatric) || (currentEmail && sEmail === currentEmail);
          });

          if (matched) {
            const matchLevel = getStudentActiveLevel(matched);
            const matchYearLevel = `${matchLevel} Level`;
            const matchDept = matched.department || userSession.department;
            const matchDeptId = matched.department_id || userSession.department_id;
            const matchCourseRep = Boolean(matched.iscourserep || matched.isCourseRep);
            const matchAdmin = Boolean(matched.isadmin || matched.isAdmin);
            const matchSemester = getStudentActiveSemester(matched, currentSemester);

            if (
              userSession.level !== matchLevel ||
              userSession.yearLevel !== matchYearLevel ||
              userSession.department !== matchDept ||
              userSession.isCourseRep !== matchCourseRep ||
              userSession.isAdmin !== matchAdmin
            ) {
              const syncedSession: UserSession = {
                ...userSession,
                level: matchLevel,
                year_level: matchYearLevel,
                yearLevel: matchYearLevel,
                semester: matchSemester,
                current_semester: matchSemester,
                department: matchDept,
                department_id: matchDeptId,
                isCourseRep: matchCourseRep,
                isAdmin: matchAdmin,
              };
              setUserSession(syncedSession);
              try {
                localStorage.setItem('university_schedule_user', JSON.stringify(syncedSession));
              } catch (e) {}
            }
          }
        }
      },
    });
    return () => {
      unsubscribe();
    };
  }, [userSession]);

  const handleUpdateUserSession = async (updates: Partial<UserSession>) => {
    if (!userSession) return;
    const updated: UserSession = {
      ...userSession,
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
    setUserSession(updated);
    try {
      localStorage.setItem('university_schedule_user', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    const studentId = userSession.uid || userSession.id || userSession.matricNumber || userSession.email;
    if (studentId) {
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
  };

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
      const userKey = session.email || session.matricNumber;
      const savedPic = localStorage.getItem(`university_profile_img_${userKey}`);
      if (savedPic) {
        setProfileImage(savedPic);
      } else if (session.profileImage || session.profile_pic_url) {
        setProfileImage(session.profileImage || session.profile_pic_url || null);
      }
    } catch (e) {
      console.error(e);
    }
    showToast(`Welcome, ${session.fullName}!`);
    addActivityNotification(
      'Portal Session Active',
      `Signed in as ${session.fullName} (Matric: ${session.matricNumber}).`,
      'system',
      'success'
    );
    syncStudentPortalData();
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

  // Custom uploaded profile avatar (saved in local memory / device)
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    try {
      const savedUser = localStorage.getItem('university_schedule_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        const savedPic = localStorage.getItem(`university_profile_img_${user.email || user.matricNumber}`);
        if (savedPic) return savedPic;
        if (user.profileImage || user.profile_pic_url || user.photoURL) {
          return user.profileImage || user.profile_pic_url || user.photoURL;
        }
      }
      const generic = localStorage.getItem('university_schedule_profile_img');
      if (generic) return generic;
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // Assignments & Deadlines State
  const [selectedAssignmentForDetails, setSelectedAssignmentForDetails] = useState<AssignmentItem | null>(null);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);

  // Modules & Course Details State
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<any | null>(null);

  // Menu & Bottom Drawer States
  const [selectedEventForMenu, setSelectedEventForMenu] = useState<EventItem | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Student academic scope extraction for unified schedule, deadlines, and broadcasts
  const studentMatric = userSession?.matricNumber || '';
  const studentDeptRaw = userSession?.department || 'Department of Industrial Chemistry';
  const studentDeptId = userSession?.department_id || '';

  const activeLevel = getStudentActiveLevel(userSession);
  const activeSemester = normalizeSemester(getStudentActiveSemester(userSession, currentSemester));

  const isICH =
    studentDeptId === 'dept-ich' ||
    studentMatric.includes('ICH') ||
    studentDeptRaw.toLowerCase().includes('industrial');
  const isCHM =
    !isICH &&
    (studentDeptId === 'dept-chm' ||
      studentMatric.includes('CHM') ||
      studentDeptRaw.toLowerCase().includes('chemistry'));
  const isCSC =
    studentDeptId === 'dept-csc' ||
    studentMatric.includes('CSC') ||
    studentDeptRaw.toLowerCase().includes('computer');

  const deptId = isICH ? 'dept-ich' : isCHM ? 'dept-chm' : isCSC ? 'dept-csc' : studentDeptId || 'dept-ich';

  // Filter events strictly matching student's department, level, and semester
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // 1. Department match
      const eDeptId = e.department_id || '';
      const cCode = (e.course || '').toUpperCase();
      const matchesDept =
        !eDeptId ||
        eDeptId === 'dept-all' ||
        (isICH && (eDeptId === 'dept-ich' || cCode.startsWith('ICH') || cCode.startsWith('CHM') || cCode.startsWith('PHY') || cCode.startsWith('MTH') || cCode.startsWith('GST') || cCode.startsWith('BIO'))) ||
        (isCHM && (eDeptId === 'dept-chm' || cCode.startsWith('CHM'))) ||
        (isCSC && (eDeptId === 'dept-csc' || cCode.startsWith('CSC'))) ||
        (!isICH && !isCHM && !isCSC && (eDeptId === studentDeptId || eDeptId === 'dept-ich'));

      // 2. Strict Level match
      const codeDigits = cCode.replace(/\D/g, '');
      const codeLevel = codeDigits.length > 0 ? parseInt(codeDigits.slice(0, 1) + '00', 10) : 0;
      const eLevel = typeof e.level === 'number' && e.level >= 100
        ? e.level
        : (codeLevel >= 100 && codeLevel <= 500 ? codeLevel : 100);
      const matchesLevel = eLevel === activeLevel;

      // 3. Strict Semester match
      const eSem = e.semester ? normalizeSemester(e.semester) : activeSemester;
      const matchesSemester = eSem === activeSemester;

      return matchesDept && matchesLevel && matchesSemester;
    });
  }, [events, isICH, isCHM, isCSC, studentDeptId, activeLevel, activeSemester]);

  // Filter events for currently selected day
  const currentDayEvents = useMemo(() => {
    return filteredEvents.filter((e) => e.dayKey === selectedDayId);
  }, [filteredEvents, selectedDayId]);

  // Recalculate event counts on days
  const updatedDays = useMemo(() => {
    return days.map((day) => ({
      ...day,
      eventsCount: filteredEvents.filter((e) => e.dayKey === day.id).length,
    }));
  }, [days, filteredEvents]);

  const unreadNotifCount = useMemo(() => {
    return notifications.filter((n) => n.isUnread).length;
  }, [notifications]);

  // Check if any drawer/sheet is currently open
  const isAnyDrawerOpen = isBottomSheetOpen || isEditModalOpen || isCalendarOpen || isDeadlineModalOpen;

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
    showToast('Event removed from your schedule');
    addActivityNotification(
      'Class Removed',
      `You removed ${target?.course || 'class'} (${target?.title || 'event'}) from your schedule.`,
      'schedule',
      'alert'
    );
    await deleteScheduleActivity(eventId);
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

    if (isEdit) {
      await updateScheduleActivity(saved.id, saved);
    } else {
      await createScheduleActivity(saved);
    }
  };

  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    showToast('All notifications marked as read');
  };

  const handleClearAllNotifs = () => {
    setNotifications([]);
    showToast('All notifications cleared');
  };

  const handleDeleteNotif = (notifId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  const handleProfileImageUpload = async (imageDataUrl: string) => {
    const val = imageDataUrl || null;
    setProfileImage(val);

    if (userSession) {
      const userKey = userSession.email || userSession.matricNumber || userSession.id || (userSession as any).uid;
      if (userKey) {
        try {
          // Persist directly to Firestore users collection
          await updateStudentUser(userKey, {
            profile_pic_url: imageDataUrl || '',
            photoURL: imageDataUrl || '',
          });
        } catch (err) {
          console.error('Error saving profile picture to database:', err);
        }
      }
      setUserSession((prev) => (prev ? { ...prev, profile_pic_url: imageDataUrl || '', photoURL: imageDataUrl || '', profileImage: imageDataUrl || '' } : prev));
    }

    try {
      if (userSession) {
        const userKey = userSession.email || userSession.matricNumber;
        if (imageDataUrl) {
          localStorage.setItem(`university_profile_img_${userKey}`, imageDataUrl);
        } else {
          localStorage.removeItem(`university_profile_img_${userKey}`);
        }
      }
      if (imageDataUrl) {
        localStorage.setItem('university_schedule_profile_img', imageDataUrl);
      } else {
        localStorage.removeItem('university_schedule_profile_img');
      }
    } catch (e) {
      console.error(e);
    }
    showToast(imageDataUrl ? 'Profile picture updated & saved to database!' : 'Profile picture reset');
    addActivityNotification(
      'Profile Photo Changed',
      imageDataUrl
        ? 'You uploaded a new student profile picture.'
        : 'You reset your student profile avatar to default.',
      'profile',
      'info'
    );
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
          'system',
          'success'
        );
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
          'system',
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
    addActivityNotification(
      'Deadline Removed',
      `Deleted ${target?.course || ''} assignment deadline.`,
      'deadline',
      'alert'
    );
    await deleteAssignment(id);
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
      });
      if (created) {
        setNotifications((prev) => [created, ...prev.filter((n) => n.id !== created.id)]);
        showToast('Broadcast published to students!');
        addActivityNotification(
          'Broadcast Published',
          `Notice "${data.title}" was broadcasted to ${activeLevel}L students.`,
          'system',
          'success'
        );
        return true;
      }
    } catch (err) {
      console.error('Error creating broadcast:', err);
      showToast('Failed to publish broadcast');
    }
    return false;
  };

  const handleDeleteBroadcast = async (id: string) => {
    try {
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showToast('Broadcast notice removed');
      addActivityNotification(
        'Broadcast Removed',
        `Deleted broadcast: ${target?.title || ''}`,
        'system',
        'alert'
      );
      await deleteAnnouncement(id);
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
      showToast('Broadcast creation composer opened');
      setEditingEvent(null);
      setIsEditModalOpen(true);
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

  // Master animation variants for page transitions
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 6,
      scale: 0.995,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.14,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
    exit: {
      opacity: 0,
      y: -4,
      scale: 0.995,
      transition: {
        duration: 0.09,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  };

  // Dedicated Desktop-Only Admin Dashboard Route (/adminschedulerapp)
  if (isAdminView) {
    return (
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
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Student Portal Safe Mode">
      <div className="min-h-screen bg-[#F5F5F7] text-[#1C1C1E] relative overflow-x-hidden flex flex-col items-center">
        {/* Splash Screen */}
        <AnimatePresence mode="wait">
          {showSplash && (
            <SplashScreen
              onComplete={() => setShowSplash(false)}
              appName="Scheduler"
            />
          )}
        </AnimatePresence>

        {/* Main Content: Authenticated Dashboard vs Login Screen */}
        {!userSession ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <>
            {/* Ambient Soft Gradient Orbs in Background */}
            <div className="fixed top-[-100px] left-[-80px] w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-blue-300/35 to-sky-200/40 blur-[90px] pointer-events-none -z-10" />
            <div className="fixed top-[280px] right-[-100px] w-[360px] h-[360px] rounded-full bg-gradient-to-br from-indigo-200/30 to-purple-200/25 blur-[100px] pointer-events-none -z-10" />
            <div className="fixed bottom-[-60px] left-[15%] w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-sky-200/35 to-emerald-100/30 blur-[110px] pointer-events-none -z-10" />

            {/* Main Container mimicking iOS screen boundaries */}
            <div className="w-full max-w-lg min-h-screen flex flex-col px-4 sm:px-5 pt-3 pb-32 relative">
              {/* iOS Dynamic Header & Status Bar Area */}
              <div className="space-y-4 flex-1">
                {/* Top Header Row */}
                {activeTab !== 'Notifications' && (
                  <HeaderSection
                    onOpenNotifications={() => setActiveTab('Notifications')}
                    onOpenCalendarView={() => setIsCalendarOpen(true)}
                    onOpenProfileTab={() => setActiveTab('Profile')}
                    unreadCount={unreadNotifCount}
                    profileImage={profileImage}
                    onUploadProfileImage={handleProfileImageUpload}
                    isNotificationsActive={false}
                    userSession={userSession}
                  />
                )}

                {/* Conditional View by Active Navigation Tab */}
                <AnimatePresence mode="wait">
                  {activeTab === 'Schedule' && (
                    <motion.div
                      key="tab-schedule"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="space-y-4"
                    >
                      {/* Day Timeline Section */}
                      <DayTimelineSection
                        days={updatedDays}
                        selectedDayId={selectedDayId}
                        onSelectDay={(id) => setSelectedDayId(id)}
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
                  )}

                  {activeTab === 'Notifications' && (
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
                        isLoading={isDataLoading}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'Deadlines' && (
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
                  )}

                  {activeTab === 'Broadcasts' && (
                    <motion.div
                      key="tab-broadcasts"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <BroadcastsView
                        onBackToSchedule={() => setActiveTab('Schedule')}
                        isLoading={isDataLoading}
                        notifications={notifications}
                        userSession={userSession}
                        isCourseRep={isCourseRep}
                        currentSemester={currentSemester}
                        activeLevel={activeLevel}
                        activeSemester={activeSemester}
                        onAddBroadcast={handleCreateBroadcast}
                        onDeleteBroadcast={handleDeleteBroadcast}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'Modules' && (
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
                  )}

                  {activeTab === 'Profile' && (
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
                        onReplaySplash={() => setShowSplash(true)}
                        onTriggerRefresh={handleTriggerRefresh}
                        isLoading={isDataLoading}
                        userSession={userSession}
                        onLogout={handleLogout}
                        currentSemester={currentSemester}
                        activeLevel={activeLevel}
                        activeSemester={activeSemester}
                        onUpdateUserSession={handleUpdateUserSession}
                        onNavigateToAdmin={() => {
                          if (typeof window !== 'undefined') {
                            window.history.pushState(null, '', '/adminschedulerapp');
                          }
                          setIsAdminView(true);
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Floating Action Button (FAB) - Strictly for Course Rep and not on Modules / Profile / Notifications */}
            <AnimatePresence>
              {isCourseRep &&
                !isAnyDrawerOpen &&
                activeTab !== 'Profile' &&
                activeTab !== 'Notifications' &&
                activeTab !== 'Modules' &&
                !(activeTab === 'Deadlines' && selectedAssignmentForDetails !== null) && (
                  <div className="fixed bottom-[84px] inset-x-0 max-w-lg mx-auto pointer-events-none z-40 flex justify-end px-5">
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

            {/* Standalone Bottom Navigation Bar */}
            <AnimatePresence>
              {activeTab !== 'Notifications' &&
                !(activeTab === 'Deadlines' && selectedAssignmentForDetails !== null) &&
                !(activeTab === 'Modules' && selectedCourseForDetails !== null) && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{
                    opacity: isAnyDrawerOpen ? 0 : 1,
                    y: isAnyDrawerOpen ? 30 : 0,
                    pointerEvents: isAnyDrawerOpen ? 'none' : 'auto',
                  }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <BottomNavBar
                    activeTab={activeTab}
                    onSelectTab={(tab) => {
                      if (tab !== 'Deadlines') {
                        setSelectedAssignmentForDetails(null);
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
                  className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-4 pt-2 pointer-events-none"
                >
                  <div className="w-full max-w-md flex items-center justify-between gap-3 pointer-events-auto">
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      onClick={handleMarkAllNotifsRead}
                      disabled={unreadNotifCount === 0}
                      className={`flex-1 py-3 px-5 rounded-[28px] font-bold text-[13px] border backdrop-blur-2xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                        unreadNotifCount > 0
                          ? 'bg-[#007AFF]/90 hover:bg-[#007AFF] text-white border-blue-400/60 shadow-[0_12px_32px_rgba(0,122,255,0.38)]'
                          : 'bg-white/80 text-[#8E8E93] border-white/90 cursor-not-allowed opacity-60 shadow-[0_8px_24px_rgba(0,0,0,0.06)]'
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

            {/* Monthly Calendar View */}
            <CalendarModal
              isOpen={isCalendarOpen}
              selectedDate={selectedDateNum}
              onClose={() => setIsCalendarOpen(false)}
              onSelectDate={(dateNum) => {
                const matchedDay = days.find((d) => d.dateNum === dateNum);
                if (matchedDay) {
                  setSelectedDayId(matchedDay.id);
                }
              }}
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
      </div>
    </ErrorBoundary>
  );
}
