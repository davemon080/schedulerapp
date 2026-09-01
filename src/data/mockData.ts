import { AssignmentItem, DayTimelineItem, EventItem, NotificationItem } from '../types';

export const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getWeekDaysForDate(targetDate: Date = new Date()): DayTimelineItem[] {
  const today = new Date();
  const current = new Date(targetDate);
  // Get day of week: 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const dayOfWeek = current.getDay();
  // We want Monday as the first day of our academic week (index 0), Sunday as index 6
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  const week: DayTimelineItem[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayIdx = d.getDay();
    const dayName = DAY_NAMES[dayIdx];
    const fullDayName = FULL_DAY_NAMES[dayIdx];
    const dateNum = d.getDate();
    const monthName = MONTH_SHORT_NAMES[d.getMonth()];
    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();

    week.push({
      id: `${dayName} ${dateNum}`,
      dayName,
      dateNum,
      eventsCount: 0,
      fullDate: `${fullDayName}, ${monthName} ${dateNum}`,
      isToday,
    });
  }
  return week;
}

export const INITIAL_DAYS: DayTimelineItem[] = getWeekDaysForDate(new Date());

export const INITIAL_EVENTS: EventItem[] = [];
export const NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_ASSIGNMENTS: AssignmentItem[] = [];

