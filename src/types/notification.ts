import type { IconName } from '@/icons';

/** How loudly a notification should read. */
export type NotificationTone = 'salary' | 'action' | 'neutral';

/** Where tapping a notification leads. */
export type NotificationTarget =
  | { readonly kind: 'salary' }
  | { readonly kind: 'requests' }
  | { readonly kind: 'transaction'; readonly id: string }
  | { readonly kind: 'benefit'; readonly id: string }
  | { readonly kind: 'kyc' };

export type AppNotification = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  /** ISO-8601 timestamp. */
  readonly occurredAt: string;
  readonly tone: NotificationTone;
  readonly icon: IconName;
  readonly read: boolean;
  readonly target?: NotificationTarget;
};
