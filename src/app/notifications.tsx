import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import {
  EmptyState,
  ErrorState,
  IconTile,
  Screen,
  Skeleton,
  Tappable,
  Text,
} from '@/components/ui';
import { useNotificationsData, useRefreshOnFocus } from '@/hooks';
import { services } from '@/services';
import { colors, radius } from '@/theme';
import type { AppNotification, NotificationTarget, NotificationTone } from '@/types';
import { formatRelativeDateTime } from '@/utils';

/** The accent stripe and tile colour each tone gets. */
const TONES: Record<NotificationTone, { stripe: string; tile: 'primary' | 'gold' | 'neutral' }> = {
  salary: { stripe: colors.primary, tile: 'primary' },
  action: { stripe: colors.gold, tile: 'gold' },
  neutral: { stripe: 'transparent', tile: 'neutral' },
};

/** Money movements, salary alerts and anything that needs the user. */
export default function NotificationsScreen() {
  const data = useNotificationsData();
  useRefreshOnFocus(data.reload);

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={40} width={180} cornerRadius={radius.lg} />
        <Skeleton height={86} cornerRadius={18} />
        <Skeleton height={86} cornerRadius={18} />
        <Skeleton height={86} cornerRadius={18} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Notifications" />
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const notifications = data.data;
  const unread = notifications.filter((entry) => !entry.read).length;

  const markAllRead = async () => {
    await services.notifications.markAllRead();
    data.reload();
  };

  const open = async (notification: AppNotification) => {
    await services.notifications.markRead(notification.id);
    data.reload();
    if (notification.target) navigateTo(notification.target);
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader
        title="Notifications"
        trailing={
          unread > 0 ? (
            <Tappable
              accessibilityRole="button"
              testID="notifications-mark-all"
              onPress={markAllRead}
              style={styles.markAll}
            >
              <Text variant="action" color={colors.primary}>
                Mark all read
              </Text>
            </Tappable>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="Nothing to catch up on"
          description="Salary, transfers and anything that needs you will show up here."
        />
      ) : (
        notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onPress={() => open(notification)}
          />
        ))
      )}
    </Screen>
  );
}

function NotificationCard({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const tone = TONES[notification.tone];
  const dimmed = notification.read;

  return (
    <Tappable
      accessibilityRole="button"
      testID={`notification-${notification.id}`}
      onPress={onPress}
      style={StyleSheet.flatten([
        styles.card,
        dimmed ? styles.cardRead : styles.cardUnread,
        !dimmed && tone.stripe !== 'transparent'
          ? { borderLeftWidth: 3, borderLeftColor: tone.stripe }
          : null,
      ])}
    >
      <IconTile
        name={notification.icon}
        tone={dimmed ? 'neutral' : tone.tile}
        size={34}
        cornerRadius={11}
      />
      <View style={styles.body}>
        <Text variant={dimmed ? 'rowTitle' : 'rowTitleStrong'} color={dimmed ? colors.inkSecondary : colors.ink}>
          {notification.title}
        </Text>
        <Text variant="caption" color={dimmed ? colors.inkMuted : colors.inkSecondary} style={styles.copy}>
          {notification.body}
        </Text>
        <Text variant="captionSm" color={colors.inkFaint} numeric>
          {formatRelativeDateTime(notification.occurredAt)}
        </Text>
      </View>
    </Tappable>
  );
}

/** Every notification leads somewhere real in the app. */
function navigateTo(target: NotificationTarget): void {
  switch (target.kind) {
    case 'salary':
      router.push('/salary');
      return;
    case 'requests':
      router.push('/requests');
      return;
    case 'transaction':
      router.push({ pathname: '/transactions/[id]', params: { id: target.id } });
      return;
    case 'benefit':
      router.push({ pathname: '/benefits/[id]', params: { id: target.id } });
      return;
    case 'card':
      router.push({ pathname: '/cards/[id]', params: { id: target.id } });
      return;
    case 'kyc':
      router.push('/kyc');
  }
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  markAll: { paddingVertical: 6, paddingLeft: 10 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    gap: 12,
  },
  cardUnread: { backgroundColor: colors.surface, borderColor: colors.border },
  cardRead: { backgroundColor: colors.canvas, borderColor: colors.surfaceSunken },
  body: { flex: 1, gap: 3 },
  copy: { lineHeight: 17 },
});
