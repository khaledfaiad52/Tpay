import type { AppNotification } from '@/types';

/** The activity feed behind the bell on Home. */
export type NotificationsService = {
  listNotifications(): Promise<readonly AppNotification[]>;
  markRead(notificationId: string): Promise<readonly AppNotification[]>;
  markAllRead(): Promise<readonly AppNotification[]>;
};
