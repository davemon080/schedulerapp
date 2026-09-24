export interface EventItem {
  id: string;
  course: string;
  title: string;
  time: string;
  startTime?: string;
  endTime?: string;
  location: string;
  deliveryMode?: 'physical' | 'online';
  meetingLink?: string;
  views: string;
  tags: string[];
  isPostponed?: boolean;
  instructor?: string;
  dayKey: string; // e.g. "WED 19"
  colorAccent?: string;
  notes?: string;
  department_id?: string;
  level?: number;
  semester?: string;
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
  department_id?: string;
  level?: number;
  semester?: string;
}

export type NavigationTab = 'Schedule' | 'Deadlines' | 'Broadcasts' | 'Modules' | 'Profile' | 'Notifications' | 'Calendar';

export interface UserSession {
  id?: string;
  uid?: string;
  email: string;
  matricNumber: string;
  fullName: string;
  department: string;
  department_id?: string;
  faculty?: string;
  yearLevel?: string;
  year_level?: string;
  level?: number;
  profileImage?: string;
  profile_pic_url?: string;
  profile_picture?: string;
  photoURL?: string;
  profile_pic_storage_path?: string;
  isAdmin?: boolean;
  isCourseRep?: boolean;
  is_payed?: boolean;
  is_paid?: boolean;
  hasFreeAccess?: boolean;
  has_free_access?: boolean;
  freeSemesterGranted?: boolean;
  wallet_balance?: number;
  walletBalance?: number;
  paid_semester?: string | null;
  paidSemester?: string | null;
  paid_at?: string | null;
  paidAt?: string | null;
  password?: string;
  password_changed?: boolean;
  is_default_password?: boolean;
  has_custom_password?: boolean;
  password_updated_at?: string;
  semester?: string;
  current_semester?: string;
  session?: string;
  academic_session?: string;
  active_session_token?: string;
  last_active_at?: string;
  last_active_device?: string;
  isLoggedIn: boolean;
}

export interface LevelAdvisorInfo {
  id?: string;
  name: string;
  title: string;
  department: string;
  department_id?: string;
  level?: number | string;
  officeLocation: string;
  phoneNumber: string;
  email?: string;
  consultationHours?: string;
  photoUrl?: string;
}

export interface SupportTicket {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  matricNumber: string;
  category: 'academic' | 'timetable' | 'wallet' | 'materials' | 'session' | 'other';
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved';
  response?: string;
  respondedAt?: string;
  respondedBy?: string;
  createdAt: string;
  timestamp: number;
}

export interface AppVisitRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  matricNumber?: string;
  department?: string;
  level?: number | string;
  device?: string;
  path?: string;
  timestamp: number;
  dateStr: string; // YYYY-MM-DD
  hour: number; // 0-23
}

export interface WalletTransaction {
  id: string;
  user_id?: string;
  type: 'credit' | 'debit';
  title: string;
  category: 'dues' | 'topup' | 'transfer' | 'fee' | 'kit' | 'access';
  amount: number;
  date: string;
  timestamp: number;
  ref: string;
  status: 'Success' | 'Pending' | 'Failed';
  recipientOrSender?: string;
  note?: string;
  created_at?: string;
}

export interface UserWalletData {
  balance: number;
  is_paid: boolean;
  is_payed: boolean;
  paid_semester?: string;
  paid_at?: string;
  transactions: WalletTransaction[];
}


export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  timeAgo?: string;
  isUnread: boolean;
  type?: 'alert' | 'info' | 'success' | 'activity';
  category?: 'schedule' | 'profile' | 'deadline' | 'system' | 'broadcast' | 'modules' | 'wallet';
  timestamp?: number;
  department_id?: string;
  level?: number | string;
  semester?: string;
  author?: string;
  sender?: string;
  priority?: 'urgent' | 'normal';
  images?: string[];
  isCancelled?: boolean;
  isDeleted?: boolean;
  is_deleted?: boolean;
  isDismissed?: boolean;
  status?: string;
  target_id?: string;
  createdat?: string;
  created_at?: string;
}
