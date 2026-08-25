import { StyleSheet, View } from 'react-native';

import { Tappable, Text } from '@/components/ui';
import { Icon, type IconName } from '@/icons';
import { colors, radius } from '@/theme';

export type QuickAction = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
};

export type QuickActionsProps = {
  actions: readonly QuickAction[];
};

/** Send · Add money · Exchange — the three primary money verbs. */
export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Tappable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={styles.item}
        >
          <View style={styles.tile}>
            <Icon name={action.icon} size={22} color={colors.primary} strokeWidth={2} />
          </View>
          <Text variant="action" color={colors.inkSecondary}>
            {action.label}
          </Text>
        </Tappable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 10 },
  item: { flex: 1, alignItems: 'center', gap: 9 },
  tile: {
    alignSelf: 'stretch',
    height: 60,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
