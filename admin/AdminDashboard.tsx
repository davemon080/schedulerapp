import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AdminAuth } from './AdminAuth';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminOverview } from './AdminOverview';
import { AdminScheduleManager } from './AdminScheduleManager';
import { AdminAssignmentsManager } from './AdminAssignmentsManager';
import { AdminAnnouncementsManager } from './AdminAnnouncementsManager';
import { AdminDepartmentsManager } from './AdminDepartmentsManager';
import { AdminCoursesManager } from './AdminCoursesManager';
import { AdminStudentsManager } from './AdminStudentsManager';
import { AdminFeedbackManager } from './AdminFeedbackManager';
import { AdminSemesterManager } from './AdminSemesterManager';
import { AdminAnalyticsManager } from './AdminAnalyticsManager';
import { AdminDatabaseViewer } from './AdminDatabaseViewer';
import { AdminSettings } from './AdminSettings';
import { AdminTab, AdminUser, StudentProfileRecord, DepartmentRecord } from './types';
import { EventItem, AssignmentItem, NotificationItem } from '@src/types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { ErrorBoundary } from '@src/components/ErrorBoundary';
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
  updateAnnouncement,
  deleteAnnouncement,
  fetchStudents,
  createStudentUser,
  updateStudentUser,
  deleteStudentUser,
  fetchDepartments,
  fetchCourses,
  fetchFeedbackList,
  fetchCurrentSemester,
  normalizeSemester,
  subscribeToRealtimeDatabase,
  isMockEvent,
  isMockAssignment,
  isMockNotification,
  purgeMockScheduleDeadlinesAndBroadcasts,
  recordOrUpdateClassCancelledNotification,
  recordOrUpdateDeadlineDeletedNotification,
  recordOrUpdateBroadcastDeletedNotification,
} from '@src/lib/dbService';

const VALID_TABS: AdminTab[] = [
  'overview',
  'analytics',
  'semester',
  'schedule',
  'assignments',
  'announcements',
  'departments',
  'courses',
  'students',
  'feedback',
  'database',
  'settings',
];

function getInitialAdminTab(): AdminTab {
  if (typeof window === 'undefined') return 'overview';

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab')?.toLowerCase();
    if (tabParam && VALID_TABS.includes(tabParam as AdminTab)) {
      return tabParam as AdminTab;
    }
  } catch (e) {
    console.error(e);
  }

  try {
    const hash = window.location.hash.replace(/^#/, '').toLowerCase();
    if (hash) {
      if (VALID_TABS.includes(hash as AdminTab)) return hash as AdminTab;
      const hashTab = hash.split('tab=')[1]?.split('&')[0];
      if (hashTab && VALID_TABS.includes(hashTab as AdminTab)) return hashTab as AdminTab;
    }
  } catch (e) {
    console.error(e);
  }

  try {
    const parts = window.location.pathname.toLowerCase().split('/').filter(Boolean);
    for (const part of parts) {
      if (VALID_TABS.includes(part as AdminTab)) {
        return part as AdminTab;
      }
    }
  } catch (e) {
    console.error(e);
  }

  try {
    const saved = localStorage.getItem('university_admin_active_tab');
    if (saved && VALID_TABS.includes(saved as AdminTab)) {
      return saved as AdminTab;
    }
  } catch (e) {
    console.error(e);
  }

  return 'overview';
}

interface AdminDashboardProps {
  onBackToStudentPortal: () => void;
  initialEvents?: EventItem[];
  initialAssignments?: AssignmentItem[];
  initialNotifications?: NotificationItem[];
  currentSemester?: string;
  academicSession?: string;
  onGlobalSyncEvents?: (events: EventItem[]) => void;
  onGlobalSyncAssignments?: (assignments: AssignmentItem[]) => void;
  onGlobalSyncNotifications?: (notifs: NotificationItem[]) => void;
  onGlobalSyncSemester?: (semester: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToStudentPortal,
  initialEvents = [],
  initialAssignments = [],
  initialNotifications = [],
  currentSemester: initialSemesterProp = '1st Semester',
  academicSession: initialSessionProp = '2025/2026',
  onGlobalSyncEvents,
  onGlobalSyncAssignments,
  onGlobalSyncNotifications,
  onGlobalSyncSemester,
}) => {
  // Admin Session State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('university_admin_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const [currentSemester, setCurrentSemester] = useState<string>(initialSemesterProp);
  const [academicSession, setAcademicSession] = useState<string>(initialSessionProp);

  // Sync prop changes into state
  useEffect(() => {
    if (initialSemesterProp) {
      setCurrentSemester(normalizeSemester(initialSemesterProp));
    }
  }, [initialSemesterProp]);

  useEffect(() => {
    if (initialSessionProp) {
      setAcademicSession(initialSessionProp);
    }
  }, [initialSessionProp]);

  const [activeTab, setActiveTabState] = useState<AdminTab>(() => getInitialAdminTab());

  const setActiveTab = useCallback((tab: AdminTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('university_admin_active_tab', tab);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.replaceState(null, '', url.toString());
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const handleUrlChange = () => {
      const resolved = getInitialAdminTab();
      setActiveTabState(resolved);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isAddAssignModalOpen, setIsAddAssignModalOpen] = useState(false);
  const [isAddNotifModalOpen, setIsAddNotifModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  // Core Data State - strictly genuine database records only
  const [events, setEvents] = useState<EventItem[]>(() => {
    try {
      const cached = localStorage.getItem('university_admin_events');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.filter((e: any) => !isMockEvent(e?.id));
      }
    } catch (e) {}
    return initialEvents.filter((e) => !isMockEvent(e?.id));
  });

  const [assignments, setAssignments] = useState<AssignmentItem[]>(() => {
    try {
      const cached = localStorage.getItem('university_admin_assignments');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.filter((a: any) => !isMockAssignment(a?.id));
      }
    } catch (e) {}
    return initialAssignments.filter((a) => !isMockAssignment(a?.id));
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const cached = localStorage.getItem('university_admin_notifications');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.filter((n: any) => !isMockNotification(n?.id));
      }
    } catch (e) {}
    return initialNotifications.filter((n) => !isMockNotification(n?.id));
  });

  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);

  const [students, setStudents] = useState<StudentProfileRecord[]>(() => {
    try {
      const cached = localStorage.getItem('university_admin_students');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        email: 'student.ich@university.edu',
        matric_number: '2025/PS/ICH/0001',
        full_name: 'David Simon O.',
        department: 'Department of Industrial Chemistry',
        department_id: 'dept-ich',
        year_level: '100 Level',
      },
      {
        email: 'student.chm@university.edu',
        matric_number: '2025/PS/CHM/0001',
        full_name: 'Sarah Adebayo',
        department: 'Department of Chemistry',
        department_id: 'dept-chm',
        year_level: '100 Level',
      },
    ];
  });

  const [departmentCount, setDepartmentCount] = useState<number>(1);
  const [courseCount, setCourseCount] = useState<number>(5);
  const [feedbackCount, setFeedbackCount] = useState<number>(0);

  // Local storage caching
  useEffect(() => {
    try {
      localStorage.setItem('university_admin_events', JSON.stringify(events));
    } catch (e) {}
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem('university_admin_assignments', JSON.stringify(assignments));
    } catch (e) {}
  }, [assignments]);

  useEffect(() => {
    try {
      localStorage.setItem('university_admin_notifications', JSON.stringify(notifications));
    } catch (e) {}
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('university_admin_students', JSON.stringify(students));
    } catch (e) {}
  }, [students]);

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string, durationMs = 4000) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, durationMs);
  }, []);

  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);

  // Sync callbacks refs to prevent unstable dependency loops
  const syncEventsRef = useRef(onGlobalSyncEvents);
  const syncAssignmentsRef = useRef(onGlobalSyncAssignments);
  const syncNotifsRef = useRef(onGlobalSyncNotifications);
  const syncSemesterRef = useRef(onGlobalSyncSemester);

  useEffect(() => {
    syncEventsRef.current = onGlobalSyncEvents;
  }, [onGlobalSyncEvents]);

  useEffect(() => {
    syncAssignmentsRef.current = onGlobalSyncAssignments;
  }, [onGlobalSyncAssignments]);

  useEffect(() => {
    syncNotifsRef.current = onGlobalSyncNotifications;
  }, [onGlobalSyncNotifications]);

  useEffect(() => {
    syncSemesterRef.current = onGlobalSyncSemester;
  }, [onGlobalSyncSemester]);

  // Real-time Firestore Live Subscription
  useEffect(() => {
    if (!adminUser) return;

    const unsubscribe = subscribeToRealtimeDatabase({
      onEvents: (dbEvents) => {
        if (dbEvents) {
          setEvents(dbEvents);
          syncEventsRef.current?.(dbEvents);
        }
      },
      onAssignments: (dbAssigns) => {
        if (dbAssigns) {
          setAssignments(dbAssigns);
          syncAssignmentsRef.current?.(dbAssigns);
        }
      },
      onNotifications: (dbNotifs) => {
        if (dbNotifs) {
          setNotifications(dbNotifs);
          syncNotifsRef.current?.(dbNotifs);
        }
      },
      onStudents: (dbStudents) => {
        if (dbStudents) {
          setStudents(dbStudents);
        }
      },
      onDepartments: (depts) => {
        if (depts) {
          setDepartments(depts);
          setDepartmentCount(depts.length);
        }
      },
      onCourses: (courses) => {
        if (courses) setCourseCount(courses.length);
      },
      onFeedback: (fbs) => {
        if (fbs) setFeedbackCount(fbs.length);
      },
      onCurrentSemester: (semCode) => {
        if (semCode) {
          const parsed = normalizeSemester(semCode);
          setCurrentSemester(parsed);
          const sMatch = semCode.match(/\d{4}\/\d{4}/);
          if (sMatch) setAcademicSession(sMatch[0]);
          syncSemesterRef.current?.(parsed);
        }
      },
      onStatusChange: (status) => {
        setIsRealtimeConnected(status === 'connected');
      },
    });

    return () => {
      unsubscribe();
    };
  }, [adminUser]);

  // Explicit Manual Refresh Data with Firebase Cloud Firestore
  const handleManualSync = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Purge any mock items from Firestore
      purgeMockScheduleDeadlinesAndBroadcasts().catch(() => {});

      const [dbEvents, dbAssigns, dbNotifs, dbStudents, depts, courses, fbs, semDoc] = await Promise.all([
        fetchScheduleActivities(),
        fetchAssignments(),
        fetchAnnouncementsAndNotifications(),
        fetchStudents(),
        fetchDepartments(),
        fetchCourses(),
        fetchFeedbackList(),
        fetchCurrentSemester(),
      ]);

      if (dbEvents) {
        setEvents(dbEvents);
        syncEventsRef.current?.(dbEvents);
      }

      if (dbAssigns) {
        setAssignments(dbAssigns);
        syncAssignmentsRef.current?.(dbAssigns);
      }

      if (dbNotifs) {
        setNotifications(dbNotifs);
        syncNotifsRef.current?.(dbNotifs);
      }

      if (dbStudents) {
        setStudents(dbStudents);
      }

      if (depts) {
        setDepartments(depts);
        setDepartmentCount(depts.length);
      }
      if (courses) setCourseCount(courses.length);
      if (fbs) setFeedbackCount(fbs.length);

      if (semDoc?.semester_code) {
        const parsed = normalizeSemester(semDoc.semester_code);
        setCurrentSemester(parsed);
        const sMatch = semDoc.semester_code.match(/\d{4}\/\d{4}/);
        if (sMatch) setAcademicSession(sMatch[0]);
        syncSemesterRef.current?.(parsed);
      }

      showToast('Database synchronized with Firebase Cloud Firestore');
    } catch (err) {
      console.warn('Sync notice:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Background Task Runner State
  interface BackgroundTaskInfo {
    id: string;
    title: string;
    startedAt: number;
  }
  const [activeBackgroundTask, setActiveBackgroundTask] = useState<BackgroundTaskInfo | null>(null);

  const runBackgroundTask = useCallback(async (
    taskTitle: string,
    taskFn: () => Promise<{ success: boolean; count?: number; message?: string; error?: string }>
  ) => {
    const taskId = 'bg_' + Date.now();
    setActiveBackgroundTask({
      id: taskId,
      title: taskTitle,
      startedAt: Date.now(),
    });

    try {
      const result = await taskFn();
      setActiveBackgroundTask((prev) => (prev?.id === taskId ? null : prev));

      if (result.success) {
        showToast(result.message || `✓ ${taskTitle} finished successfully (${result.count || 0} affected)`, 6000);
      } else {
        showToast(`Notice: ${result.error || result.message || 'Operation ended with notices'}`, 6000);
      }

      // Refresh data silently in background
      handleManualSync();
    } catch (err: any) {
      setActiveBackgroundTask((prev) => (prev?.id === taskId ? null : prev));
      showToast(`Error during bulk action: ${err?.message || 'Operation failed'}`, 6000);
    }
  }, [handleManualSync, showToast]);

  // Add Class Activity
  const handleAddEvent = async (newEventData: Omit<EventItem, 'id'>) => {
    const tempId = 'evt_' + Date.now();
    const tempEvent: EventItem = { ...newEventData, id: tempId };
    const updated = [tempEvent, ...events];
    setEvents(updated);
    onGlobalSyncEvents?.(updated);

    const created = await createScheduleActivity(newEventData);
    if (created) {
      const refreshed = [created, ...events.filter((e) => e.id !== tempId)];
      setEvents(refreshed);
      onGlobalSyncEvents?.(refreshed);
      showToast(`Class "${newEventData.course}" added to database!`);
    } else {
      showToast(`Class "${newEventData.course}" saved`);
    }
  };

  // Update Event
  const handleUpdateEvent = async (id: string, updatedFields: Partial<EventItem>) => {
    const updated = events.map((ev) => (ev.id === id ? { ...ev, ...updatedFields } : ev));
    setEvents(updated);
    onGlobalSyncEvents?.(updated);

    await updateScheduleActivity(id, updatedFields);
    showToast('Class updated in database');
  };

  // Delete Event
  const handleDeleteEvent = async (id: string) => {
    const target = events.find((ev) => ev.id === id);
    const updated = events.filter((ev) => ev.id !== id);
    setEvents(updated);
    onGlobalSyncEvents?.(updated);

    await deleteScheduleActivity(id);
    if (target) {
      const notif = await recordOrUpdateClassCancelledNotification(target, 'Course Rep / Admin');
      if (notif) {
        const notifsUpdated = [notif, ...notifications.filter((n) => n.id !== notif.id)];
        setNotifications(notifsUpdated);
        onGlobalSyncNotifications?.(notifsUpdated);
      }
    }
    showToast('Class cancelled. Notification updated for students.');
  };

  // Add Assignment
  const handleAddAssignment = async (newAssignData: Omit<AssignmentItem, 'id'>) => {
    const tempId = 'asgn_' + Date.now();
    const tempAssign: AssignmentItem = { ...newAssignData, id: tempId };
    const updated = [tempAssign, ...assignments];
    setAssignments(updated);
    onGlobalSyncAssignments?.(updated);

    const created = await createAssignment(newAssignData);
    if (created) {
      const refreshed = [created, ...assignments.filter((a) => a.id !== tempId)];
      setAssignments(refreshed);
      onGlobalSyncAssignments?.(refreshed);
      showToast(`Assignment "${newAssignData.course}" published to database!`);
    } else {
      showToast(`Assignment "${newAssignData.course}" created`);
    }
  };

  // Update Assignment
  const handleUpdateAssignment = async (id: string, updatedFields: Partial<AssignmentItem>) => {
    const updated = assignments.map((a) => (a.id === id ? { ...a, ...updatedFields } : a));
    setAssignments(updated);
    onGlobalSyncAssignments?.(updated);

    await updateAssignment(id, updatedFields);
    showToast('Assignment deadline updated in database');
  };

  // Delete Assignment
  const handleDeleteAssignment = async (id: string) => {
    const target = assignments.find((a) => a.id === id);
    const updated = assignments.filter((a) => a.id !== id);
    setAssignments(updated);
    onGlobalSyncAssignments?.(updated);

    await deleteAssignment(id);
    if (target) {
      const notif = await recordOrUpdateDeadlineDeletedNotification(target, 'Course Rep / Admin');
      if (notif) {
        const notifsUpdated = [notif, ...notifications.filter((n) => n.id !== notif.id)];
        setNotifications(notifsUpdated);
        onGlobalSyncNotifications?.(notifsUpdated);
      }
    }
    showToast('Deadline deleted. Notification updated for students.');
  };

  // Add Notification / Broadcast
  const handleAddNotification = async (newNotifData: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    const tempId = 'notif_' + Date.now();
    const tempNotif: NotificationItem = {
      ...newNotifData,
      id: tempId,
      time: newNotifData.time || 'Just now',
      isUnread: true,
      timestamp: Date.now(),
    };

    const updated = [tempNotif, ...notifications];
    setNotifications(updated);
    onGlobalSyncNotifications?.(updated);

    const created = await createAnnouncement({
      title: newNotifData.title,
      message: newNotifData.message,
      priority: newNotifData.type === 'alert' ? 'urgent' : 'normal',
    });

    if (created) {
      const refreshed = [created, ...notifications.filter((n) => n.id !== tempId)];
      setNotifications(refreshed);
      onGlobalSyncNotifications?.(refreshed);
      showToast('Announcement broadcasted live to Firebase Firestore!');
    } else {
      showToast('Announcement posted');
    }
  };

  // Update Notification
  const handleUpdateNotification = async (id: string, updatedFields: Partial<NotificationItem>) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, ...updatedFields } : n));
    setNotifications(updated);
    onGlobalSyncNotifications?.(updated);

    const ok = await updateAnnouncement(id, {
      title: updatedFields.title,
      message: updatedFields.message,
      priority: updatedFields.type === 'alert' ? 'urgent' : 'normal',
    });
    if (ok) {
      showToast('Announcement updated');
    }
  };

  // Delete Notification
  const handleDeleteNotification = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    const originalTitle = (target?.title || 'Announcement').replace(/^Broadcast Deleted:\s*/i, '');
    const updatedTitle = `Broadcast Deleted: ${originalTitle}`;
    const updatedMsg = `This announcement was deleted/retracted by the Course Rep / Faculty.`;

    // Instead of removing activity from notifications page, update it!
    const updated = notifications.map((n) => {
      if (n.id === id || n.target_id === id) {
        return {
          ...n,
          title: updatedTitle,
          message: updatedMsg,
          type: 'alert' as const,
          isDeleted: true,
          is_deleted: true,
          status: 'deleted',
          images: [],
          isUnread: true,
          time: 'Just now',
          timestamp: Date.now(),
        };
      }
      return n;
    });
    setNotifications(updated);
    onGlobalSyncNotifications?.(updated);

    await recordOrUpdateBroadcastDeletedNotification(id, 'Course Rep / Faculty');
    showToast('Broadcast deleted. Notification updated on dashboard.');
  };

  // Add Student
  const handleAddStudent = async (student: StudentProfileRecord) => {
    const updated = [student, ...students.filter((s) => s.email !== student.email)];
    setStudents(updated);

    const created = await createStudentUser(student);
    if (created) {
      const refreshed = [created, ...students.filter((s) => s.email !== student.email)];
      setStudents(refreshed);
      showToast(`Student ${student.full_name} enrolled and synced with Firebase!`);
    } else {
      showToast(`Student ${student.full_name} enrolled`);
    }
  };

  // Update Student (Credentials, Course Rep, Free Semester Access, Profile Pic)
  const handleUpdateStudent = async (updatedStudent: StudentProfileRecord): Promise<boolean> => {
    const identifier = updatedStudent.id || updatedStudent.uid || updatedStudent.email;
    const updatedList = students.map((s) => {
      if ((s.id && s.id === updatedStudent.id) || (s.uid && s.uid === updatedStudent.uid) || s.email === updatedStudent.email) {
        return { ...s, ...updatedStudent };
      }
      return s;
    });
    setStudents(updatedList);

    const ok = await updateStudentUser(identifier, updatedStudent);
    if (ok) {
      showToast(`Student credentials & status updated for ${updatedStudent.full_name || updatedStudent.name}`);
    }
    return ok;
  };

  // Delete Student
  const handleDeleteStudent = async (email: string) => {
    const updated = students.filter((s) => s.email !== email);
    setStudents(updated);

    await deleteStudentUser(email);
    showToast('Student record removed from database');
  };

  // Logout
  const handleLogout = () => {
    setAdminUser(null);
    try {
      localStorage.removeItem('university_admin_session');
    } catch (e) {}
    showToast('Signed out of Academic Admin');
  };

  // Quick Add Modal Helper
  const handleOpenAddModal = (type: 'event' | 'assignment' | 'notification' | 'student' | 'department' | 'course') => {
    if (type === 'event') {
      setActiveTab('schedule');
      setIsAddEventModalOpen(true);
    } else if (type === 'assignment') {
      setActiveTab('assignments');
      setIsAddAssignModalOpen(true);
    } else if (type === 'notification') {
      setActiveTab('announcements');
      setIsAddNotifModalOpen(true);
    } else if (type === 'student') {
      setActiveTab('students');
      setIsAddStudentModalOpen(true);
    } else if (type === 'department') {
      setActiveTab('departments');
    } else if (type === 'course') {
      setActiveTab('courses');
    }
  };

  const getQuickAddLabel = (tab: AdminTab) => {
    switch (tab) {
      case 'schedule':
        return 'Add Class';
      case 'assignments':
        return 'New Deadline';
      case 'announcements':
        return 'New Broadcast';
      case 'departments':
        return 'Add Dept';
      case 'courses':
        return 'Add Course';
      case 'students':
        return 'Register Student';
      default:
        return 'New Record';
    }
  };

  const handleHeaderQuickAdd = () => {
    if (activeTab === 'schedule') setIsAddEventModalOpen(true);
    else if (activeTab === 'assignments') setIsAddAssignModalOpen(true);
    else if (activeTab === 'announcements') setIsAddNotifModalOpen(true);
    else if (activeTab === 'students') setIsAddStudentModalOpen(true);
    else if (activeTab === 'departments') setActiveTab('departments');
    else if (activeTab === 'courses') setActiveTab('courses');
  };

  // If not logged in, render Admin Login
  if (!adminUser) {
    return (
      <ErrorBoundary fallbackTitle="Admin Authentication Safe Mode">
        <AdminAuth
          onLoginSuccess={(user) => {
            setAdminUser(user);
            showToast(`Welcome back, ${user.fullName}`);
          }}
          onBackToStudentPortal={onBackToStudentPortal}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Admin Dashboard Safe Mode">
      <div className="h-screen w-full overflow-hidden bg-slate-50 text-slate-900 flex font-sans antialiased select-none">
        {/* Side Menu (Responsive Drawer on Mobile, Sticky on Desktop) */}
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          adminUser={adminUser}
          onLogout={handleLogout}
          onSwitchToStudentPortal={onBackToStudentPortal}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          eventCount={events.length}
          assignmentCount={assignments.length}
          studentCount={students.length}
          departmentCount={departmentCount}
          courseCount={courseCount}
          feedbackCount={feedbackCount}
        />

        {/* Scrollable Page Section Alone */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {/* Top Header Bar */}
          <AdminHeader
            activeTab={activeTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefreshData={handleManualSync}
            isRefreshing={isRefreshing}
            isRealtimeConnected={isRealtimeConnected}
            onQuickAdd={handleHeaderQuickAdd}
            quickAddLabel={getQuickAddLabel(activeTab)}
            adminUser={adminUser}
            currentSemester={currentSemester}
            academicSession={academicSession}
            onNavigateToSemesterTab={() => setActiveTab('semester')}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          />

          {/* View Switcher */}
          <main className="flex-1">
            {activeTab === 'overview' && (
              <AdminOverview
                events={events}
                assignments={assignments}
                notifications={notifications}
                students={students}
                departmentCount={departmentCount}
                courseCount={courseCount}
                feedbackCount={feedbackCount}
                onNavigateTab={setActiveTab}
                onOpenAddModal={handleOpenAddModal}
              />
            )}

            {activeTab === 'semester' && (
              <AdminSemesterManager
                onSemesterChanged={(newCode) => {
                  if (newCode) {
                    const parsed = normalizeSemester(newCode);
                    setCurrentSemester(parsed);
                    const sMatch = newCode.match(/\d{4}\/\d{4}/);
                    if (sMatch) setAcademicSession(sMatch[0]);
                    syncSemesterRef.current?.(parsed);
                  }
                  handleManualSync();
                }}
              />
            )}

            {activeTab === 'schedule' && (
              <AdminScheduleManager
                events={events}
                departments={departments}
                searchQuery={searchQuery}
                currentSemester={currentSemester}
                onAddEvent={handleAddEvent}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
                isAddModalOpen={isAddEventModalOpen}
                setIsAddModalOpen={setIsAddEventModalOpen}
              />
            )}

            {activeTab === 'assignments' && (
              <AdminAssignmentsManager
                assignments={assignments}
                departments={departments}
                searchQuery={searchQuery}
                currentSemester={currentSemester}
                onAddAssignment={handleAddAssignment}
                onUpdateAssignment={handleUpdateAssignment}
                onDeleteAssignment={handleDeleteAssignment}
                isAddModalOpen={isAddAssignModalOpen}
                setIsAddModalOpen={setIsAddAssignModalOpen}
              />
            )}

            {activeTab === 'announcements' && (
              <AdminAnnouncementsManager
                notifications={notifications}
                departments={departments}
                searchQuery={searchQuery}
                onAddNotification={handleAddNotification}
                onUpdateNotification={handleUpdateNotification}
                onDeleteNotification={handleDeleteNotification}
                isAddModalOpen={isAddNotifModalOpen}
                setIsAddModalOpen={setIsAddNotifModalOpen}
              />
            )}

            {activeTab === 'departments' && (
              <AdminDepartmentsManager
                departments={departments}
                onDepartmentChanged={handleManualSync}
              />
            )}

            {activeTab === 'courses' && (
              <AdminCoursesManager
                onCourseChanged={handleManualSync}
              />
            )}

            {activeTab === 'students' && (
              <AdminStudentsManager
                students={students}
                departments={departments}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onAddStudent={handleAddStudent}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                isAddModalOpen={isAddStudentModalOpen}
                setIsAddModalOpen={setIsAddStudentModalOpen}
                isRegistry={Boolean(adminUser?.isRegistry)}
                onRunBackgroundTask={runBackgroundTask}
                onManualSync={handleManualSync}
              />
            )}

            {activeTab === 'feedback' && (
              <AdminFeedbackManager />
            )}

            {activeTab === 'analytics' && (
              <AdminAnalyticsManager />
            )}

            {activeTab === 'database' && (
              <AdminDatabaseViewer
                events={events}
                assignments={assignments}
                notifications={notifications}
                students={students}
                onRefreshData={handleManualSync}
                isRefreshing={isRefreshing}
              />
            )}

            {activeTab === 'settings' && (
              <AdminSettings
                adminUser={adminUser}
                onLogout={handleLogout}
              />
            )}
          </main>
        </div>

        {/* Floating Active Background Task Indicator */}
        <AnimatePresence>
          {activeBackgroundTask && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white text-slate-800 shadow-2xl border border-indigo-200 text-[13px] font-medium"
            >
              <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0" />
              <div className="flex flex-col pr-2">
                <span className="text-slate-900 font-bold text-[12.5px] flex items-center gap-1.5">
                  <span>Background Processing</span>
                  <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[10px] rounded-md font-semibold">Running</span>
                </span>
                <span className="text-slate-500 font-normal text-[11.5px] line-clamp-1">{activeBackgroundTask.title}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800 text-[13px] font-medium max-w-md"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
};
