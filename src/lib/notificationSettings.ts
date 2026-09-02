export interface NotificationChannelSettings {
  schedules: boolean;
  deadlines: boolean;
  broadcast: boolean;
  modules: boolean;
  wallet: boolean;
}

const STORAGE_KEY = 'university_notification_settings';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationChannelSettings = {
  schedules: true,
  deadlines: true,
  broadcast: true,
  modules: true,
  wallet: true,
};

export function getNotificationSettings(): NotificationChannelSettings {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load notification settings', e);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationChannelSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('notification-settings-changed', { detail: settings }));
  } catch (e) {
    console.error('Failed to save notification settings', e);
  }
}

export function isChannelNotificationEnabled(category: keyof NotificationChannelSettings | string): boolean {
  const current = getNotificationSettings();
  if (category === 'schedule' || category === 'schedules') return current.schedules;
  if (category === 'deadline' || category === 'deadlines') return current.deadlines;
  if (category === 'broadcast' || category === 'broadcasts') return current.broadcast;
  if (category === 'module' || category === 'modules') return current.modules;
  if (category === 'wallet') return current.wallet;
  return true;
}
