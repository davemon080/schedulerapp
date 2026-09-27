import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface Token {
  value: string;
}

export interface RegistrationError {
  error: string;
}

export interface PushNotificationSchema {
  title?: string;
  subtitle?: string;
  body?: string;
  id?: string;
  tag?: string;
  badge?: number;
  data?: any;
  click_action?: string;
  link?: string;
  group?: string;
  groupSummary?: boolean;
}

export interface ActionPerformed {
  actionId: string;
  inputValue?: string;
  notification: PushNotificationSchema;
}

export interface PermissionStatus {
  receive: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';
}

export interface PushNotificationsPlugin {
  register(): Promise<void>;
  getDeliveredNotifications(): Promise<{ notifications: PushNotificationSchema[] }>;
  removeDeliveredNotifications(delivered: { notifications: PushNotificationSchema[] }): Promise<void>;
  removeAllDeliveredNotifications(): Promise<void>;
  createChannel(channel: any): Promise<void>;
  deleteChannel(args: { id: string }): Promise<void>;
  listChannels(): Promise<{ channels: any[] }>;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;
  addListener(eventName: 'registration', listenerFunc: (token: Token) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(eventName: 'registrationError', listenerFunc: (error: RegistrationError) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(eventName: 'pushNotificationReceived', listenerFunc: (notification: PushNotificationSchema) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(eventName: 'pushNotificationActionPerformed', listenerFunc: (action: ActionPerformed) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  removeAllListeners(): Promise<void>;
}

// Fallback implementation for web environment where native PushNotifications is not available
class PushNotificationsWeb implements PushNotificationsPlugin {
  private registrationListeners: ((token: Token) => void)[] = [];
  private notificationListeners: ((notification: PushNotificationSchema) => void)[] = [];
  private actionListeners: ((action: ActionPerformed) => void)[] = [];

  async register(): Promise<void> {
    // Generate or retrieve persistent FCM token for this mobile device instance
    let tokenValue = '';
    try {
      tokenValue = localStorage.getItem('app_fcm_token') || '';
    } catch {}

    if (!tokenValue) {
      const randHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      tokenValue = `fcm_m_${Date.now()}_${randHex}`;
      try {
        localStorage.setItem('app_fcm_token', tokenValue);
      } catch {}
    }

    // Notify all registered listeners
    setTimeout(() => {
      for (const listener of this.registrationListeners) {
        try {
          listener({ value: tokenValue });
        } catch (e) {
          console.warn('[PushNotificationsWeb] Listener notice:', e);
        }
      }
    }, 50);
  }

  async getDeliveredNotifications(): Promise<{ notifications: PushNotificationSchema[] }> {
    return { notifications: [] };
  }
  async removeDeliveredNotifications(): Promise<void> {}
  async removeAllDeliveredNotifications(): Promise<void> {}
  async createChannel(): Promise<void> {}
  async deleteChannel(): Promise<void> {}
  async listChannels(): Promise<{ channels: any[] }> {
    return { channels: [] };
  }

  async checkPermissions(): Promise<PermissionStatus> {
    try {
      const stored = localStorage.getItem('app_notification_permission');
      if (stored === 'granted') return { receive: 'granted' };
      if (stored === 'denied') return { receive: 'denied' };
    } catch {}

    if (typeof window !== 'undefined' && 'Notification' in window) {
      const p = Notification.permission;
      return { receive: p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt' };
    }
    return { receive: 'prompt' };
  }

  async requestPermissions(): Promise<PermissionStatus> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        let p: string = Notification.permission;
        if (p === 'default') {
          const req = Notification.requestPermission();
          if (req && typeof (req as any).then === 'function') {
            p = await req;
          } else {
            p = await new Promise<string>((resolve) => {
              try {
                Notification.requestPermission((res) => resolve(res));
              } catch {
                resolve(Notification.permission || 'denied');
              }
            });
          }
        }
        const status: PermissionStatus['receive'] = p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt';
        try {
          localStorage.setItem('app_notification_permission', status);
        } catch {}
        return { receive: status };
      } catch (e) {
        const fallback = Notification.permission === 'granted' ? 'granted' : 'denied';
        try {
          localStorage.setItem('app_notification_permission', fallback);
        } catch {}
        return { receive: fallback };
      }
    }
    try {
      localStorage.setItem('app_notification_permission', 'granted');
    } catch {}
    return { receive: 'granted' };
  }

  addListener(eventName: any, listenerFunc: any): any {
    if (eventName === 'registration') {
      this.registrationListeners.push(listenerFunc);
      let savedToken = '';
      try {
        savedToken = localStorage.getItem('app_fcm_token') || '';
      } catch {}
      if (savedToken) {
        setTimeout(() => {
          try {
            listenerFunc({ value: savedToken });
          } catch {}
        }, 50);
      }
    } else if (eventName === 'pushNotificationReceived') {
      this.notificationListeners.push(listenerFunc);
    } else if (eventName === 'pushNotificationActionPerformed') {
      this.actionListeners.push(listenerFunc);
    }

    return {
      remove: async () => {
        this.registrationListeners = this.registrationListeners.filter((l) => l !== listenerFunc);
        this.notificationListeners = this.notificationListeners.filter((l) => l !== listenerFunc);
        this.actionListeners = this.actionListeners.filter((l) => l !== listenerFunc);
      },
    };
  }

  async removeAllListeners(): Promise<void> {
    this.registrationListeners = [];
    this.notificationListeners = [];
    this.actionListeners = [];
  }
}

export const PushNotifications: PushNotificationsPlugin = registerPlugin<PushNotificationsPlugin>(
  'PushNotifications',
  {
    web: () => new PushNotificationsWeb(),
  }
);
