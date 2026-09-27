import { isChannelNotificationEnabled } from './notificationSettings';
import { showDeviceLocalNotification, getPushPermissionState } from './pushNotificationClient';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Checks the current browser/device notification permission status.
 */
export function getPhoneNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined') return 'unsupported';
  const stored = localStorage.getItem('app_notification_permission');
  if (stored === 'granted' || stored === 'denied') return stored as NotificationPermissionState;
  if ('Notification' in window) {
    return Notification.permission as NotificationPermissionState;
  }
  return 'default';
}

/**
 * Requests device permission to deliver native notifications to the user's phone.
 */
export async function requestPhoneNotificationPermission(): Promise<NotificationPermissionState> {
  const state = await getPushPermissionState();
  if (state === 'granted') {
    triggerPhoneVibration([100, 50, 150]);
  }
  return state;
}

/**
 * In-app notification sound has been removed per user preference.
 * Kept as a safe no-op for backward compatibility.
 */
export function playNotificationSound(): void {
  // Silent - in-app audio chime disabled
}

/**
 * Triggers hardware haptic vibration feedback on compatible mobile devices.
 */
export function triggerPhoneVibration(pattern: number[] = [150, 80, 150]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration errors
    }
  }
}

interface PhoneNotificationOptions {
  body: string;
  category?: string;
  tag?: string;
  icon?: string;
  url?: string;
  force?: boolean;
}

/**
 * Delivers a real-time native notification to the phone/device, including
 * vibration and local/push alert.
 */
export async function triggerPhoneNotification(
  title: string,
  options: PhoneNotificationOptions
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Check if user enabled alerts for this notification category
  if (!options.force && options.category && !isChannelNotificationEnabled(options.category)) {
    return false;
  }

  // 2. Tactile vibration alert on phone (silent - no in-app audio)
  triggerPhoneVibration([180, 90, 180]);

  // 3. Trigger native local/OS notification on the device
  try {
    await showDeviceLocalNotification({
      title,
      body: options.body,
      data: { url: options.url || '/', category: options.category || 'general' },
    });
    return true;
  } catch (err) {
    console.warn('Native notification delivery note:', err);
  }

  // 4. Web fallback if in browser environment
  if ('Notification' in window && Notification.permission === 'granted') {
    const iconUrl = options.icon || '/logo-192.png';
    const tag = options.tag || `notif_${Date.now()}`;

    // Prefer active Service Worker registration (handles locked screen / background on Android/iOS)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body: options.body,
            icon: iconUrl,
            badge: iconUrl,
            tag,
            silent: true,
            vibrate: [200, 100, 200],
            data: {
              url: options.url || '/',
            },
          } as NotificationOptions);
          return true;
        }
      } catch (swErr) {
        console.warn('Service worker showNotification fallback:', swErr);
      }
    }

    // Direct window Notification fallback
    try {
      new Notification(title, {
        body: options.body,
        icon: iconUrl,
        tag,
        silent: true,
      });
      return true;
    } catch (notifErr) {
      console.warn('Window Notification fallback failed:', notifErr);
    }
  }

  return false;
}
