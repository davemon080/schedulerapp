import React, { useState, useMemo, useCallback } from 'react';
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
import { DeadlineEditModal } from './components/DeadlineEditModal';
import { LoginPage } from './components/LoginPage';
import { INITIAL_DAYS, INITIAL_EVENTS, INITIAL_ASSIGNMENTS, NOTIFICATIONS } from './data/mockData';
import { AssignmentItem, EventItem, NavigationTab, NotificationItem, UserSession } from './types';
import { Plus, Check, CheckCheck, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [days, setDays] = useState(INITIAL_DAYS);
  const [selectedDayId, setSelectedDayId] = useState<string>('WED 19');
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<NavigationTab>('Schedule');
  const [showSplash, setShowSplash] = useState(true);
  
  // Student Portal Auth Session
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('university_schedule_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const handleLogin = (session: UserSession) => {
    setUserSession(session);
    try {
      localStorage.setItem('university_schedule_user', JSON.stringify(session));
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
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Assignments & Deadlines State
  const [assignments, setAssignments] = useState<AssignmentItem[]>(INITIAL_ASSIGNMENTS);
  const [selectedAssignmentForDetails, setSelectedAssignmentForDetails] = useState<AssignmentItem | null>(null);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);

  // Menu & Bottom Drawer States
  const [selectedEventForMenu, setSelectedEventForMenu] = useState<EventItem | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
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

  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  // Filter events for currently selected day
  const currentDayEvents = useMemo(() => {
    return events.filter((e) => e.dayKey === selectedDayId);
  }, [events, selectedDayId]);

  // Recalculate event counts on days
  const updatedDays = useMemo(() => {
    return days.map((day) => ({
      ...day,
      eventsCount: events.filter((e) => e.dayKey === day.id).length,
    }));
  }, [days, events]);

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
  const handleDeleteEvent = (eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    showToast('Event removed from your schedule');
    addActivityNotification(
      'Class Removed',
      `You removed ${target?.course || 'class'} (${target?.title || 'event'}) from your schedule.`,
      'schedule',
      'alert'
    );
  };

  // Handler to Toggle Postponed status
  const handleTogglePostponed = (eventId: string) => {
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
  const handleSaveEvent = (saved: EventItem) => {
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

  const handleProfileImageUpload = (imageDataUrl: string) => {
    setProfileImage(imageDataUrl || null);
    showToast(imageDataUrl ? 'Profile picture updated!' : 'Profile picture reset');
    addActivityNotification(
      'Profile Photo Changed',
      imageDataUrl
        ? 'You uploaded a new student profile picture.'
        : 'You reset your student profile avatar to default.',
      'profile',
      'info'
    );
  };

  const handleTriggerRefresh = () => {
    setIsDataLoading(true);
    setTimeout(() => {
      setIsDataLoading(false);
      showToast('Timetable & student data refreshed');
    }, 900);
  };

  // Assignment / Deadline Handlers
  const handleToggleCompleteAssignment = (id: string) => {
    setAssignments((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newStatus = !item.isCompleted;
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
  };

  const handleSaveAssignment = (savedAssignment: AssignmentItem) => {
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
  };

  const handleDeleteAssignment = (id: string) => {
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

  // Master animation variants for snappy, ultra-smooth page transitions across the entire app
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
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: {
      opacity: 0,
      y: -4,
      scale: 0.995,
      transition: {
        duration: 0.09,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1C1C1E] relative overflow-x-hidden flex flex-col items-center">
      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            onComplete={() => setShowSplash(false)}
            appName="Scheduler"
          />
        )}
      </AnimatePresence>

      {/* 
        Ambient Soft Gradient Orbs in Background 
        These ambient lights provide rich light refractions that shine through the frosted glass (backdrop-blur)
      */}
      <div className="fixed top-[-100px] left-[-80px] w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-blue-300/35 to-sky-200/40 blur-[90px] pointer-events-none -z-10" />
      <div className="fixed top-[280px] right-[-100px] w-[360px] h-[360px] rounded-full bg-gradient-to-br from-indigo-200/30 to-purple-200/25 blur-[100px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-60px] left-[15%] w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-sky-200/35 to-emerald-100/30 blur-[110px] pointer-events-none -z-10" />

      {/* Main Container mimicking iOS screen boundaries */}
      <div className="w-full max-w-lg min-h-screen flex flex-col px-4 sm:px-5 pt-3 pb-32 relative">
        
        {/* iOS Dynamic Header & Status Bar Area */}
        <div className="space-y-4 flex-1">
          {/* Top Header Row (Hidden when viewing dedicated Notifications page) */}
          {activeTab !== 'Notifications' && (
            <HeaderSection
              onOpenNotifications={() => setActiveTab('Notifications')}
              onOpenCalendarView={() => setIsCalendarOpen(true)}
              onOpenProfileTab={() => setActiveTab('Profile')}
              unreadCount={unreadNotifCount}
              profileImage={profileImage}
              onUploadProfileImage={handleProfileImageUpload}
              isNotificationsActive={activeTab === 'Notifications'}
            />
          )}

          {/* Conditional View by Active Navigation Tab with Slide & Blur Transition */}
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
                />
              </motion.div>
            )}

            {activeTab === 'Modules' && (
              <motion.div
                key="tab-modules"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <ModulesView
                  onBackToSchedule={() => setActiveTab('Schedule')}
                  isLoading={isDataLoading}
                />
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
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Standalone Hovering Floating Action Button (FAB) anchored to the viewport */}
      <AnimatePresence>
        {!isAnyDrawerOpen &&
          activeTab !== 'Profile' &&
          activeTab !== 'Notifications' &&
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

      {/* Standalone Bottom Navigation Bar permanently fixed in viewport (hidden on Notifications page and Deadline Details page) */}
      <AnimatePresence>
        {activeTab !== 'Notifications' && !(activeTab === 'Deadlines' && selectedAssignmentForDetails !== null) && (
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
                setActiveTab(tab);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Standalone Action Bar Fixed at the Exact Bottom Navigation Position on Notifications Page */}
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
              {/* Mark All Read - Floating Standalone Pill Button */}
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

              {/* Clear - Floating Standalone Pill Button */}
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

      {/* Frosted Glass Bottom Sheet (Slides up when three-dot menu is clicked) */}
      <EventBottomSheet
        isOpen={isBottomSheetOpen}
        event={selectedEventForMenu}
        onClose={() => setIsBottomSheetOpen(false)}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        onTogglePostponed={handleTogglePostponed}
        onShare={handleShareEvent}
      />

      {/* Edit / Add Activity Modal (Slides from under the app) */}
      <EventEditModal
        isOpen={isEditModalOpen}
        event={editingEvent}
        selectedDayKey={selectedDayId}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEvent}
      />

      {/* Add / Edit Deadline Modal (Slides from under the app) */}
      <DeadlineEditModal
        isOpen={isDeadlineModalOpen}
        assignment={editingAssignment}
        onClose={() => setIsDeadlineModalOpen(false)}
        onSave={handleSaveAssignment}
      />

      {/* Monthly Calendar View (Slides from under the app) */}
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
  );
}
