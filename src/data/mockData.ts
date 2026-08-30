import { AssignmentItem, DayTimelineItem, EventItem, NotificationItem } from '../types';

export const INITIAL_DAYS: DayTimelineItem[] = [
  { id: 'MON 17', dayName: 'MON', dateNum: 17, eventsCount: 0, fullDate: 'Monday, Oct 17', isToday: false },
  { id: 'TUE 18', dayName: 'TUE', dateNum: 18, eventsCount: 0, fullDate: 'Tuesday, Oct 18', isToday: false },
  { id: 'WED 19', dayName: 'WED', dateNum: 19, eventsCount: 0, fullDate: 'Wednesday, Oct 19', isToday: true },
  { id: 'THU 20', dayName: 'THU', dateNum: 20, eventsCount: 0, fullDate: 'Thursday, Oct 20', isToday: false },
  { id: 'FRI 21', dayName: 'FRI', dateNum: 21, eventsCount: 0, fullDate: 'Friday, Oct 21', isToday: false },
  { id: 'SAT 22', dayName: 'SAT', dateNum: 22, eventsCount: 0, fullDate: 'Saturday, Oct 22', isToday: false },
  { id: 'SUN 23', dayName: 'SUN', dateNum: 23, eventsCount: 0, fullDate: 'Sunday, Oct 23', isToday: false },
];

export const INITIAL_EVENTS: EventItem[] = [];
export const NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_ASSIGNMENTS: AssignmentItem[] = [];
