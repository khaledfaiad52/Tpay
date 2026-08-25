import { StyleSheet, View } from 'react-native';

import { Avatar, Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import { colors, radius } from '@/theme';

export type HomeHeaderProps = {
  greeting: string;
  firstName: string;
  initials: string;
  hasUnreadNotifications: boolean;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
};

/** Greeting, notification bell with unread dot, and the profile avatar. */
export function HomeHeader({
  greeting,
  firstName,
  initials,
  hasUnreadNotifications,
  onNotificationsPress,
  onProfilePress,
}: HomeHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.identity}>
        <Text variant="body" color={colors.inkMuted}>
          {greeting}
        </Text>
        <Text variant="displaySm">{firstName}</Text>
      </View>

      <View style={styles.actions}>
        <Tappable
          accessibilityRole="button"
          accessibilityLabel={
            hasUnreadNotifications ? 'Notifications, unread' : 'Notifications'
          }
          onPress={onNotificationsPress}
          style={styles.bell}
        >
          <Icon name="bell" size={20} color={colors.ink} />
          {hasUnreadNotifications ? <View style={styles.unreadDot} /> : null}
        </Tappable>

        <Avatar initials={initials} onPress={onProfilePress} accessibilityLabel="Your profile" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identity: { gap: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
