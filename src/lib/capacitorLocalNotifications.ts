import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface LocalNotificationSchema {
  id: number;
  title: string;
  body: string;
  channelId?: string;
  sound?: string;
  smallIcon?: string;
  largeIcon?: string;
  iconColor?: string;
  extra?: any;
  schedule?: any;
  actionTypeId?: string;
  attachments?: any[];
}

export interface ScheduleOptions {
  notifications: LocalNotificationSchema[];
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  sound?: string;
  importance?: number;
  visibility?: number;
  lights?: boolean;
  lightColor?: string;
  vibration?: boolean;
}

export interface PermissionStatus {
  display: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';
}

export interface LocalNotificationsPlugin {
  schedule(options: ScheduleOptions): Promise<{ notifications: { id: number }[] }>;
  requestPermissions(): Promise<PermissionStatus>;
  checkPermissions(): Promise<PermissionStatus>;
  createChannel(channel: Channel): Promise<void>;
  deleteChannel(channel: { id: string }): Promise<void>;
  listChannels(): Promise<{ channels: Channel[] }>;
  cancel(options: { notifications: { id: number }[] }): Promise<void>;
  getPending(): Promise<{ notifications: any[] }>;
  registerActionTypes(options: { types: any[] }): Promise<void>;
  areEnabled(): Promise<{ value: boolean }>;
  addListener(eventName: string, listenerFunc: (...args: any[]) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  removeAllListeners(): Promise<void>;
}

class LocalNotificationsWeb implements LocalNotificationsPlugin {
  async schedule(options: ScheduleOptions): Promise<{ notifications: { id: number }[] }> {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      for (const n of options.notifications) {
        try {
          new Notification(n.title, {
            body: n.body,
            icon: '/logo-192.png',
            data: n.extra,
          });
        } catch {}
      }
    }
    return { notifications: options.notifications.map((n) => ({ id: n.id })) };
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
        return { display: p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt' };
      } catch {
        return { display: Notification.permission === 'granted' ? 'granted' : 'denied' };
      }
    }
    return { display: 'denied' };
  }

  async checkPermissions(): Promise<PermissionStatus> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const p = Notification.permission;
      return { display: p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt' };
    }
    return { display: 'prompt' };
  }

  async createChannel(): Promise<void> {}
  async deleteChannel(): Promise<void> {}
  async listChannels(): Promise<{ channels: Channel[] }> {
    return { channels: [] };
  }
  async cancel(): Promise<void> {}
  async getPending(): Promise<{ notifications: any[] }> {
    return { notifications: [] };
  }
  async registerActionTypes(): Promise<void> {}
  async areEnabled(): Promise<{ value: boolean }> {
    return { value: typeof Notification !== 'undefined' && Notification.permission === 'granted' };
  }
  addListener(): any {
    return { remove: async () => {} };
  }
  async removeAllListeners(): Promise<void> {}
}

export const LocalNotifications: LocalNotificationsPlugin = registerPlugin<LocalNotificationsPlugin>(
  'LocalNotifications',
  {
    web: () => new LocalNotificationsWeb(),
  }
);
