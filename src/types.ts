export interface EventItem {
  id: string;
  course: string;
  title: string;
  time: string;
  location: string;
  views: string;
  tags: string[];
  isPostponed?: boolean;
  instructor?: string;
  dayKey: string; // e.g. "WED 19"
  colorAccent?: string;
}

export interface DayTimelineItem {
  id: string;
  dayName: string;
  dateNum: number;
  eventsCount: number;
  fullDate: string;
  isToday?: boolean;
}

export interface AssignmentItem {
  id: string;
  course: string;
  title: string;
  description: string;
  dueDate: string;
  dueTime?: string;
  priority: 'High' | 'Medium' | 'Low';
  isCompleted: boolean;
  completedAt?: string;
  images: string[];
  tags?: string[];
  maxGrade?: string;
  submissionType?: string;
  instructor?: string;
  notes?: string;
}

export type NavigationTab = 'Schedule' | 'Deadlines' | 'Broadcasts' | 'Modules' | 'Profile' | 'Notifications';

export interface UserSession {
  email: string;
  matricNumber: string;
  fullName: string;
  department: string;
  faculty?: string;
  yearLevel?: string;
  isLoggedIn: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  timeAgo?: string;
  isUnread: boolean;
  type?: 'alert' | 'info' | 'success' | 'activity';
  category?: 'schedule' | 'profile' | 'deadline' | 'system';
  timestamp?: number;
}
