/**
 * Persistent Notification Read State Store
 * Manages user-scoped read/unread status for notifications and activities.
 * Ensures:
 * 1. "Mark all read" marks all current notifications as read persistently.
 * 2. Unread badge resets to 0.
 * 3. When new notifications/activities arrive, badge starts afresh from new items.
 */

import { NotificationItem, UserSession } from '../types';

export function getUserNotificationKey(session?: UserSession | null): string {
  if (!session) {
    try {
      const saved = localStorage.getItem('university_schedule_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        const k = parsed.matricNumber || parsed.matric_number || parsed.email || parsed.uid || parsed.id;
        if (k) return String(k).toUpperCase().trim();
      }
    } catch {}
    return 'GUEST_STUDENT';
  }
  const raw = session.matricNumber || (session as any).matric_number || session.email || session.uid || session.id || 'GUEST_STUDENT';
  return String(raw).toUpperCase().trim();
}

/**
 * Returns the timestamp when notifications were last marked as read
 */
export function getLastNotificationsReadTime(userKey: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(`app_notifs_last_read_ts_${userKey}`);
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch {}
  return 0;
}

/**
 * Returns set of notification IDs that have been explicitly read by this student
 */
export function getReadNotificationIds(userKey: string): Set<string> {
  const set = new Set<string>();
  if (typeof window === 'undefined') return set;
  try {
    const raw = localStorage.getItem(`app_read_notifs_${userKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const id of parsed) {
          if (id) set.add(String(id));
        }
      }
    }
  } catch {}
  return set;
}

/**
 * Marks all notifications as read up to current moment
 */
export function markAllNotificationsAsRead(userKey: string, notificationIds: string[]): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  try {
    localStorage.setItem(`app_notifs_last_read_ts_${userKey}`, String(now));
    const existing = getReadNotificationIds(userKey);
    notificationIds.forEach((id) => {
      if (id) existing.add(id);
    });
    // Keep max 500 recent IDs to prevent unbounded storage
    const trimmed = Array.from(existing).slice(-500);
    localStorage.setItem(`app_read_notifs_${userKey}`, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Error saving read notifications state:', err);
  }
}

/**
 * Marks a single notification as read
 */
export function markNotificationAsRead(userKey: string, notificationId: string): void {
  if (typeof window === 'undefined' || !notificationId) return;
  try {
    const existing = getReadNotificationIds(userKey);
    existing.add(notificationId);
    const trimmed = Array.from(existing).slice(-500);
    localStorage.setItem(`app_read_notifs_${userKey}`, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Error saving single read notification:', err);
  }
}

/**
 * Clears read state or marks all current notifications as acknowledged on clear
 */
export function clearAllNotificationsReadState(userKey: string, notificationIds: string[]): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  try {
    localStorage.setItem(`app_notifs_last_read_ts_${userKey}`, String(now));
    const existing = getReadNotificationIds(userKey);
    notificationIds.forEach((id) => {
      if (id) existing.add(id);
    });
    localStorage.setItem(`app_read_notifs_${userKey}`, JSON.stringify(Array.from(existing).slice(-500)));
  } catch {}
}

/**
 * Applies persistent read tracking to an array of notifications.
 * Items created <= lastReadTime OR whose ID is in readIdsSet are marked as read (isUnread: false).
 * Items created AFTER lastReadTime without being in readIdsSet remain unread (isUnread: true).
 */
export function applyReadStateToNotifications(
  items: NotificationItem[],
  userKey: string
): NotificationItem[] {
  if (!items || !Array.isArray(items)) return [];
  const lastReadTs = getLastNotificationsReadTime(userKey);
  const readIds = getReadNotificationIds(userKey);

  return items.map((item) => {
    if (!item) return item;
    const itemTs = item.timestamp || 0;
    
    // If explicitly marked as read in memory or stored in readIdsSet
    const isExplicitlyRead = readIds.has(item.id) || item.isRead === true;
    
    // If created before or at the time user marked all as read
    const isPriorToMarkAll = lastReadTs > 0 && itemTs > 0 && itemTs <= lastReadTs;

    const isRead = isExplicitlyRead || isPriorToMarkAll;

    return {
      ...item,
      isUnread: !isRead,
      isRead: isRead,
    };
  });
}
