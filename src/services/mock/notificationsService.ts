import { NotFoundError } from '@/services/contracts';
import type { NotificationsService } from '@/services/contracts';
import type { AppNotification } from '@/types';
import { mockNotifications } from './data/fixtures';
import { respond } from './latency';

let notifications: AppNotification[] = [...mockNotifications];

export const mockNotificationsService: NotificationsService = {
  listNotifications: () =>
    respond(
      'notificationsService.listNotifications',
      [...notifications].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    ),

  markRead: (notificationId) => {
    const exists = notifications.some((entry) => entry.id === notificationId);
    if (!exists) return Promise.reject(new NotFoundError('Notification', notificationId));
    notifications = notifications.map((entry) =>
      entry.id === notificationId ? { ...entry, read: true } : entry,
    );
    return respond('notificationsService.markRead', notifications);
  },

  markAllRead: () => {
    notifications = notifications.map((entry) => ({ ...entry, read: true }));
    return respond('notificationsService.markAllRead', notifications);
  },
};

export function unreadCount(entries: readonly AppNotification[]): number {
  return entries.filter((entry) => !entry.read).length;
}

export function resetNotifications(): void {
  notifications = [...mockNotifications];
}
