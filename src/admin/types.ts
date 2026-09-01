import { EventItem, AssignmentItem, NotificationItem } from '../types';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
  lastLogin?: string;
  profile_pic_url?: string;
  profileImage?: string;
  isAdmin?: boolean;
  isCourseRep?: boolean;
}

export type AdminTab = 
  | 'overview' 
  | 'analytics'
  | 'semester'
  | 'schedule' 
  | 'assignments' 
  | 'announcements' 
  | 'courses'
  | 'departments'
  | 'students' 
  | 'feedback'
  | 'database' 
  | 'settings';

export interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  level?: number;
  yearsOfStudy?: number;
  duration_years?: number;
  durationYears?: number;
  maxLevel?: number;
  max_level?: number;
  faculty?: string;
  created_at?: string;
}

export interface CourseMaterialPdf {
  id: string;
  title: string;
  topic?: string;
  pdfUrl: string;
  fileSize?: string;
  fileName?: string;
  uploadedAt?: string;
  description?: string;
}

export type CoursePdfModule = CourseMaterialPdf;

export interface CourseMaterialVideo {
  id: string;
  title: string;
  topic?: string;
  videoUrl: string;
  duration?: string;
  fileSize?: string;
  fileName?: string;
  videoType?: 'youtube' | 'uploaded';
  lecturer?: string;
  uploadedAt?: string;
  description?: string;
  thumbnailUrl?: string;
}

export type CourseVideoModule = CourseMaterialVideo;

export interface CourseRecord {
  id: string;
  courseCode: string;
  code?: string;
  title: string;
  description?: string;
  department_id: string;
  department_name?: string;
  units?: number;
  semester?: string;
  pdfurl?: string;
  level?: number;
  pdfModules?: CourseMaterialPdf[];
  pdfMaterials?: CourseMaterialPdf[];
  videoModules?: CourseMaterialVideo[];
  videoMaterials?: CourseMaterialVideo[];
  created_at?: string;
}

export interface ActivityRecord {
  id: string;
  courseCode: string;
  title: string;
  type: 'Lecture' | 'Lab' | 'Tutorial';
  day: number; // 1 to 7
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
  venue?: string;
  lecturer?: string;
  department_id: string;
  status: 'active' | 'postponed' | 'cancelled' | 'completed';
  notes?: string;
  semester?: string;
  level?: number;
  created_at?: string;
}

export interface DeadlineRecord {
  id: string;
  title: string;
  courseCode: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM:SS
  description?: string;
  department_id: string;
  isCompleted: boolean;
  attachmentUrl?: string;
  semester?: string;
  level?: number;
  created_at?: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  priority: 'urgent' | 'normal';
  author?: string;
  department_id: string;
  attachmentUrl?: string;
  semester?: string;
  level?: number;
  createdat?: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  type: string;
  department_id: string;
  isRead: boolean;
  semester?: string;
  level?: number;
  createdat?: string;
}

export interface StudentProfileRecord {
  id?: string;
  uid?: string;
  email: string;
  matric_number: string;
  matricNumber?: string;
  password?: string;
  portal_password?: string;
  full_name: string;
  fullName?: string;
  name?: string;
  department?: string;
  department_id?: string;
  year_level?: string;
  yearLevel?: string;
  level?: number;
  semester?: string;
  is_payed?: boolean;
  is_paid?: boolean;
  hasFreeAccess?: boolean;
  wallet_balance?: number;
  walletBalance?: number;
  paid_semester?: string;
  paid_at?: string;
  isadmin?: boolean;
  isAdmin?: boolean;
  iscourserep?: boolean;
  isCourseRep?: boolean;
  profile_pic_url?: string;
  profile_picture?: string;
  profilePicture?: string;
  profileImage?: string;
  photo_url?: string;
  photoURL?: string;
  activesessionid?: string;
  created_at?: string;
  createdat?: string;
  status?: string;
}


export interface FeedbackRecord {
  id: string;
  type: string;
  message: string;
  userEmail: string;
  user_id?: string;
  createdat: string;
}

export interface CurrentSemesterRecord {
  id: string;
  semester_code: string;
  is_active: boolean;
  updated_at?: string;
}

export interface SemesterAccessRecord {
  user_id: string;
  semester_code: string;
  status: 'active' | 'inactive' | 'refunded';
  expires_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface FirestoreCollectionInfo {
  name: string;
  description: string;
  recordCount: number;
  status: 'ready' | 'empty' | 'unmigrated';
}
