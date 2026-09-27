/**
 * Unified Native Device Push Notification Service
 * Supports:
 *  1. Native Capacitor (Android APK & iOS) via @capacitor/push-notifications & @capacitor/local-notifications
 *  2. Web Push API via Service Worker (/sw.js) & VAPID for PWA / Mobile Browser
 *  3. Real-time Firestore synchronization in 'push_subscriptions' collection
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from './capacitorPushNotifications';
import { LocalNotifications } from './capacitorLocalNotifications';
import { UserSession } from '../types';
import { db, isNativeMobileApp } from './firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

export const DEFAULT_VAPID_PUBLIC_KEY =
  'BHoy9tfmziOVOcP4VtTpaRDqZN_26K2a1pNrC_KxPBYQ_zsZknVGe3tqUgOFlSJkXLP95uTa5PIA2gDN5s02XBU';

export type PushPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

// Resolve backend base URL (for Web relative, or cloud host for native mobile APK)
export function getBackendApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  if (
    typeof window.location !== 'undefined' &&
    window.location.origin &&
    !window.location.origin.startsWith('capacitor:')
  ) {
    return window.location.origin.replace(/\/$/, '');
  }
  const envUrl = (import.meta as any).env?.VITE_APP_URL || (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
    return envUrl.replace(/\/$/, '');
  }
  return 'https://ais-dev-xdnnwnwejw7sx7yu7fqlmt-797567576447.europe-west2.run.app';
}

/**
 * Generates a clean, safe alphanumeric document ID from a push endpoint or token
 */
function getSubscriptionDocId(endpointOrToken: string): string {
  let hash = 0;
  for (let i = 0; i < endpointOrToken.length; i++) {
    const char = endpointOrToken.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const cleanTail = endpointOrToken.slice(-16).replace(/[^a-zA-Z0-9]/g, '');
  return `sub_${Math.abs(hash)}_${cleanTail || 'dev'}`;
}

/**
 * Converts a base64 string to a Uint8Array for Web Push applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detects device OS platform
 */
export function getDevicePlatform(): 'android' | 'ios' | 'web' {
  if (typeof window === 'undefined') return 'web';
  if (Capacitor.isNativePlatform() || isNativeMobileApp()) {
    try {
      const p = Capacitor.getPlatform();
      if (p === 'android' || p === 'ios') return p;
    } catch {}
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    return 'android';
  }
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/.test(ua)) {
    return 'android';
  }
  return 'web';
}

/**
 * Checks if push notifications are supported on this device/environment
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform() || isNativeMobileApp()) return true;
  return 'Notification' in window;
}

/**
 * Requests web notification permission supporting both promise and callback models
 */
export async function requestWebNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const res = Notification.requestPermission();
    if (res && typeof (res as any).then === 'function') {
      return await res;
    }
    return new Promise((resolve) => {
      try {
        Notification.requestPermission((result) => resolve(result));
      } catch {
        resolve(Notification.permission || 'denied');
      }
    });
  } catch (err) {
    return new Promise((resolve) => {
      try {
        Notification.requestPermission((result) => resolve(result));
      } catch {
        resolve(Notification.permission || 'denied');
      }
    });
  }
}

/**
 * Gets the current notification permission state
 */
export async function getPushPermissionState(): Promise<PushPermissionStatus> {
  if (typeof window === 'undefined') return 'unsupported';

  if (Capacitor.isNativePlatform() || isNativeMobileApp()) {
    try {
      const perm = await PushNotifications.checkPermissions();
      if (perm?.receive === 'granted') return 'granted';
      if (perm?.receive === 'denied') return 'denied';
    } catch {}

    try {
      const localPerm = await LocalNotifications.checkPermissions();
      if (localPerm?.display === 'granted') return 'granted';
      if (localPerm?.display === 'denied') return 'denied';
    } catch {}

    const stored = localStorage.getItem('app_notification_permission');
    if (stored === 'granted' || stored === 'denied') return stored as PushPermissionStatus;
    return 'default';
  }

  if ('Notification' in window) {
    return Notification.permission as PushPermissionStatus;
  }

  return 'unsupported';
}

/**
 * Registers the Web Service Worker (/sw.js)
 */
export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    return registration;
  } catch (err) {
    console.warn('[PWA SW] Service worker registration notice:', err);
    return null;
  }
}

/**
 * Fetches the VAPID Public Key from the server or uses the fallback default
 */
export async function getVapidPublicKey(): Promise<string> {
  try {
    const baseUrl = getBackendApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/push/config`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.vapidPublicKey) {
        return data.vapidPublicKey;
      }
    }
  } catch {}
  return DEFAULT_VAPID_PUBLIC_KEY;
}

/**
 * Direct sync of FCM token and device metadata to Firestore 'push_subscriptions' collection
 * and student user profile. This guarantees admin-to-student push targeting works seamlessly
 * on mobile without depending on web-push.
 */
export async function syncDeviceTokenToFirestore(
  tokenValue: string,
  userSession?: UserSession | null
): Promise<void> {
  if (!tokenValue) return;

  const platform = getDevicePlatform();
  const docId = getSubscriptionDocId(tokenValue);
  const cleanMatric = (userSession?.matricNumber || userSession?.matric_number || '').toUpperCase().trim();
  const cleanDept = (userSession?.department || userSession?.department_id || '').trim();
  const cleanLevel = userSession?.level || 100;
  const cleanUid = userSession?.uid || userSession?.id || 'anonymous';
  const cleanName = userSession?.fullName || (userSession as any)?.full_name || '';

  const payload: any = {
    endpoint: `fcm_${tokenValue.slice(-32)}`,
    fcmToken: tokenValue,
    token: tokenValue,
    userId: cleanUid,
    fullName: cleanName,
    matricNumber: cleanMatric,
    department: cleanDept,
    level: cleanLevel,
    platform,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Capacitor-Android',
    timestamp: Date.now(),
    active: true,
  };

  try {
    await setDoc(doc(db, 'push_subscriptions', docId), payload, { merge: true });
    console.log('[Native Push] Device FCM token synced to Firestore push_subscriptions:', docId);
  } catch (err) {
    console.warn('[Native Push] Firestore push_subscriptions sync notice:', err);
  }

  // Also update user's document in Firestore if student is logged in
  try {
    if (cleanUid && cleanUid !== 'anonymous') {
      await updateDoc(doc(db, 'users', cleanUid), {
        fcmToken: tokenValue,
        push_device_id: docId,
        push_enabled: true,
        last_device_sync: Date.now(),
      }).catch(() => {});
    }
  } catch {}

  // Backend sync (graceful fallback)
  try {
    const baseUrl = getBackendApiBaseUrl();
    await fetch(`${baseUrl}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {}
}

/**
 * Configures native Capacitor notification channels and listeners on Android/iOS
 */
async function configureCapacitorNativePush(userSession?: UserSession | null): Promise<void> {
  if (!Capacitor.isNativePlatform() && !isNativeMobileApp()) return;

  try {
    // 1. Create native notification channel for Android (High Importance, Sound & Vibration)
    await LocalNotifications.createChannel({
      id: 'academic-alerts',
      name: 'Class & Timetable Alerts',
      description: 'Notifications for class cancellations, timetable updates, deadlines, and official announcements',
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: 'beep.wav',
    }).catch(() => {});

    // 2. Immediately sync existing cached token if available so Firestore has current student session
    try {
      const cachedToken = localStorage.getItem('app_fcm_token');
      if (cachedToken) {
        await syncDeviceTokenToFirestore(cachedToken, userSession);
      }
    } catch {}

    // 3. Remove any previous listeners to avoid duplicates
    await PushNotifications.removeAllListeners().catch(() => {});

    // 4. Listen for device token registration
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[Native Push] Device registered with FCM token:', token.value.substring(0, 15) + '...');
      try {
        localStorage.setItem('app_fcm_token', token.value);
      } catch {}
      await syncDeviceTokenToFirestore(token.value, userSession);
    });

    PushNotifications.addListener('registrationError', (err: any) => {
      console.warn('[Native Push] Device registration notice:', err);
    });

    // 5. Foreground push notification received -> Trigger local notification banner
    PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
      console.log('[Native Push] Notification received in foreground:', notification);
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 100000),
              title: notification.title || 'University Schedule',
              body: notification.body || 'New timetable or course update.',
              channelId: 'academic-alerts',
              extra: notification.data,
            },
          ],
        });
      } catch (localErr) {
        console.warn('[Native Push] Local notification schedule notice:', localErr);
      }
    });

    // 6. User tapped on the notification in the Android notification shade
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[Native Push] Notification action performed by user:', action);
    });

    // 7. Register with FCM on the device
    await PushNotifications.register().catch((regErr) => {
      console.warn('[Native Push] PushNotifications.register notice:', regErr);
    });
  } catch (err) {
    console.warn('[Native Push] Capacitor push configuration notice:', err);
  }
}

/**
 * Primary function: Requests Notification Permission ONLY from the device.
 * When allowed by the user, immediately sets up all native push notification logic.
 */
export async function requestAppNotificationPermission(
  userSession?: UserSession | null
): Promise<{ success: boolean; status: PushPermissionStatus; error?: string }> {
  try {
    const isNative = Capacitor.isNativePlatform() || isNativeMobileApp();

    // A. Native Capacitor Android APK / iOS Device Flow
    if (isNative) {
      console.log('[Push] Requesting native device notification permission via Capacitor...');
      let isGranted = false;

      // 1. Check existing permissions first
      try {
        const pushCheck = await PushNotifications.checkPermissions();
        if (pushCheck?.receive === 'granted') isGranted = true;
      } catch {}

      try {
        const localCheck = await LocalNotifications.checkPermissions();
        if (localCheck?.display === 'granted') isGranted = true;
      } catch {}

      // 2. If not yet granted, prompt via PushNotifications
      if (!isGranted) {
        try {
          const permResult = await PushNotifications.requestPermissions();
          if (permResult?.receive === 'granted') {
            isGranted = true;
          }
        } catch (pushErr) {
          console.warn('[Push] Push permission request note:', pushErr);
        }
      }

      // 3. If still not granted, prompt via LocalNotifications (Android 13+ POST_NOTIFICATIONS)
      if (!isGranted) {
        try {
          const localResult = await LocalNotifications.requestPermissions();
          if (localResult?.display === 'granted') {
            isGranted = true;
          }
        } catch (localErr) {
          console.warn('[Push] Local notification permission request note:', localErr);
        }
      }

      // 4. Also verify web Notification in Android WebView if present
      if (!isGranted && typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const webPerm = await requestWebNotificationPermission();
          if (webPerm === 'granted') isGranted = true;
        } catch {}
      }

      const status: PushPermissionStatus = isGranted ? 'granted' : 'denied';

      try {
        localStorage.setItem('app_notification_prompt_completed', 'true');
        localStorage.setItem('app_notification_permission_requested', 'true');
        localStorage.setItem('app_notification_permission', status);
      } catch {}

      if (isGranted) {
        await configureCapacitorNativePush(userSession);
        // Show instant native test notification to prove it works on the mobile system
        await showDeviceLocalNotification({
          title: 'Notifications Active 🔔',
          body: 'Your device will receive instant alerts for timetable changes & announcements.',
        }).catch(() => {});
        return { success: true, status: 'granted' };
      }

      return { success: false, status };
    }

    // B. Web Push / PWA Flow
    if (typeof window !== 'undefined' && 'Notification' in window) {
      console.log('[Push] Requesting Web Notification permission from browser...');
      const permission = await requestWebNotificationPermission();
      const status = permission as PushPermissionStatus;

      try {
        localStorage.setItem('app_notification_prompt_completed', 'true');
        localStorage.setItem('app_notification_permission_requested', 'true');
        localStorage.setItem('app_notification_permission', status);
      } catch {}

      if (status === 'granted') {
        subscribeDeviceToPush(userSession, { userInitiated: true }).catch((e) => {
          console.warn('[Push] Background push subscribe note:', e);
        });
        // Show immediate test notification to verify device receipt
        await showDeviceLocalNotification({
          title: 'Notifications Active 🔔',
          body: 'Your device will receive instant alerts for timetable changes & announcements.',
        }).catch(() => {});
        return { success: true, status: 'granted' };
      }

      return { success: false, status };
    }

    return { success: false, status: 'unsupported', error: 'Notifications not supported on this platform' };
  } catch (err: any) {
    console.error('[Push] Request permission exception:', err);
    return { success: false, status: 'denied', error: err?.message || 'Permission request failed' };
  }
}

/**
 * Subscribes the device to Web Push and registers the token with Firestore and backend
 */
export async function subscribeDeviceToPush(
  userSession?: UserSession | null,
  options: { userInitiated?: boolean } = {}
): Promise<{ success: boolean; status: PushPermissionStatus; error?: string }> {
  // If native Capacitor, route to native flow
  if (Capacitor.isNativePlatform()) {
    await configureCapacitorNativePush(userSession);
    return { success: true, status: 'granted' };
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, status: 'unsupported', error: 'Notifications not supported' };
  }

  try {
    let currentPermission = Notification.permission;

    if (currentPermission === 'default') {
      if (!options.userInitiated) {
        return { success: false, status: 'default' };
      }
      currentPermission = await Notification.requestPermission();
    }

    if (currentPermission !== 'granted') {
      return { success: false, status: currentPermission as PushPermissionStatus };
    }

    // Ensure service worker is registered
    await registerAppServiceWorker();
    const registration = await navigator.serviceWorker.ready;

    if (!registration || !registration.pushManager) {
      return { success: true, status: 'granted' };
    }

    const vapidKey = await getVapidPublicKey();
    const appServerKey = urlBase64ToUint8Array(vapidKey);

    // Retrieve or create push subscription
    let subscription: PushSubscription | null = null;
    try {
      subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey as unknown as BufferSource,
        });
      }
    } catch (subErr) {
      console.warn('[Push] Direct subscribe failed, attempting clean renewal:', subErr);
      try {
        const staleSub = await registration.pushManager.getSubscription();
        if (staleSub) {
          await staleSub.unsubscribe().catch(() => {});
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey as unknown as BufferSource,
        });
      } catch (retryErr) {
        console.error('[Push] Resubscribe attempt also failed:', retryErr);
        throw retryErr;
      }
    }

    if (!subscription) {
      return { success: true, status: 'granted' };
    }

    const subscriptionJson = subscription.toJSON();
    const platform = getDevicePlatform();

    const payload = {
      subscription: subscriptionJson,
      endpoint: subscription.endpoint,
      userId: userSession?.uid || userSession?.id || 'anonymous',
      matricNumber: (userSession?.matricNumber || userSession?.matric_number || '').toUpperCase().trim(),
      department: (userSession?.department || userSession?.department_id || '').trim(),
      level: userSession?.level || 100,
      platform,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: Date.now(),
      active: true,
    };

    // 1. Direct, authoritative Firestore write in push_subscriptions
    try {
      const docId = getSubscriptionDocId(subscription.endpoint);
      await setDoc(doc(db, 'push_subscriptions', docId), payload, { merge: true });
      console.log('[Push] Subscription recorded in Firestore push_subscriptions');
    } catch (firestoreErr) {
      console.warn('[Push] Firestore push_subscriptions save note:', firestoreErr);
    }

    // 2. Backend server synchronization (graceful fallback)
    try {
      const baseUrl = getBackendApiBaseUrl();
      await fetch(`${baseUrl}/api/push/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}

    return { success: true, status: 'granted' };
  } catch (err: any) {
    console.error('[Push] Web subscription failed:', err);
    return { success: false, status: 'denied', error: err?.message || 'Push subscription failed' };
  }
}

/**
 * Automatically ensures device is registered for push if permission was already granted
 */
export async function ensureNativePushRegistered(userSession?: UserSession | null): Promise<void> {
  if (typeof window === 'undefined') return;

  const isNative = Capacitor.isNativePlatform() || isNativeMobileApp();

  if (isNative) {
    try {
      const perm = await PushNotifications.checkPermissions().catch(() => null);
      const localPerm = await LocalNotifications.checkPermissions().catch(() => null);
      const stored = localStorage.getItem('app_notification_permission');
      const isGranted = perm?.receive === 'granted' || localPerm?.display === 'granted' || stored === 'granted';

      if (isGranted) {
        // Sync cached FCM token immediately to Firestore with student details
        const cachedToken = localStorage.getItem('app_fcm_token');
        if (cachedToken) {
          await syncDeviceTokenToFirestore(cachedToken, userSession);
        }
        await configureCapacitorNativePush(userSession);
      }
    } catch (e) {
      console.warn('[Push] ensureNativePushRegistered error:', e);
    }
    return;
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      await subscribeDeviceToPush(userSession, { userInitiated: false });
    } catch {}
  }
}

/**
 * Shows an instant local notification on the device (in foreground or background)
 */
export async function showDeviceLocalNotification(params: {
  title: string;
  body: string;
  id?: number;
  data?: any;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const isNative = Capacitor.isNativePlatform() || isNativeMobileApp();

  if (isNative) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: params.id || Math.floor(Math.random() * 100000),
            title: params.title,
            body: params.body,
            channelId: 'academic-alerts',
            extra: params.data,
          },
        ],
      });
      return;
    } catch (e) {
      console.warn('[Push] LocalNotifications schedule notice:', e);
    }
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg) {
          await reg.showNotification(params.title, {
            body: params.body,
            icon: '/logo-192.png',
            badge: '/logo-192.png',
            data: params.data,
          });
          return;
        }
      }
      new Notification(params.title, {
        body: params.body,
        icon: '/logo-192.png',
      });
    } catch {}
  }
}

/**
 * Dispatches a native push notification to specific users or groups via backend API
 */
export async function sendNativePushNotification(params: {
  title: string;
  body: string;
  url?: string;
  targetMatric?: string;
  targetUserId?: string;
  department?: string;
  level?: string;
  broadcastAll?: boolean;
  category?: string;
}): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  try {
    const baseUrl = getBackendApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    return {
      success: Boolean(data.success),
      sentCount: data.sentCount,
      error: data.message,
    };
  } catch (err: any) {
    console.error('[Push] Failed to dispatch push notification:', err);
    return { success: false, error: err?.message || 'Failed to dispatch push' };
  }
}

/**
 * Universal activity notification dispatcher for course reps and admin
 */
export async function dispatchCourseRepActivityPushNotification(options: {
  title: string;
  message: string;
  department?: string;
  level?: string | number;
  category?: 'schedule' | 'deadline' | 'broadcast' | 'modules' | 'system';
  url?: string;
}): Promise<void> {
  try {
    const cleanTitle = options.title.trim();
    const cleanMessage = options.message.trim();
    const dept = options.department ? options.department.trim() : undefined;
    const lvl = options.level ? String(options.level).replace(/\D/g, '') : undefined;

    // Show local notification immediately for instant feedback
    await showDeviceLocalNotification({
      title: cleanTitle,
      body: cleanMessage,
      data: { category: options.category || 'schedule' },
    }).catch(() => {});

    // Dispatch background push to all devices in department/level
    await sendNativePushNotification({
      title: cleanTitle,
      body: cleanMessage,
      department: dept,
      level: lvl,
      category: options.category || 'schedule',
      url: options.url || '/',
      broadcastAll: !dept,
    });
  } catch (err) {
    console.warn('[Push] Activity push dispatch notice:', err);
  }
}

export interface RegisteredDeviceItem {
  endpoint: string;
  userId?: string;
  matricNumber?: string;
  department?: string;
  level?: string | number;
  platform?: string;
  userAgent?: string;
  timestamp: number;
  active: boolean;
}

/**
 * Fetches all registered device subscriptions for Admin inspection and testing
 */
export async function fetchRegisteredDevices(): Promise<{
  devices: RegisteredDeviceItem[];
  total: number;
  byDepartment: Record<string, number>;
  byLevel: Record<string, number>;
  byPlatform: Record<string, number>;
}> {
  try {
    const baseUrl = getBackendApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/push/subscriptions`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.devices)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[Push] Could not fetch devices from server endpoint:', err);
  }

  return {
    devices: [],
    total: 0,
    byDepartment: {},
    byLevel: {},
    byPlatform: {},
  };
}

/**
 * Dispatches an instant test push to a single target endpoint or current device
 */
export async function sendTestPushToDevice(targetEndpoint?: string): Promise<{ success: boolean; message: string }> {
  try {
    const baseUrl = getBackendApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/push/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: targetEndpoint }),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      message: data.message || (data.success ? 'Test push dispatched' : 'Test push failed'),
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to dispatch test push' };
  }
}

/**
 * Admin dispatcher for custom push notifications with full targeting
 */
export async function sendAdminCustomPushNotification(params: {
  title: string;
  body: string;
  department?: string;
  level?: string | number;
  targetMatric?: string;
  url?: string;
  priority?: 'normal' | 'high' | 'urgent';
  broadcastAll?: boolean;
}): Promise<{ success: boolean; sentCount: number; targetedCount: number; message: string }> {
  try {
    const baseUrl = getBackendApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      sentCount: data.sentCount || 0,
      targetedCount: data.targetedCount || 0,
      message: data.message || 'Notification processed',
    };
  } catch (err: any) {
    return {
      success: false,
      sentCount: 0,
      targetedCount: 0,
      message: err?.message || 'Failed to dispatch notification',
    };
  }
}

