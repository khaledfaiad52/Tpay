import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { Icon } from '@/icons';
import { colors } from '@/theme';

export type RequestsBannerProps = {
  onPress: () => void;
};

/** Entry point into employee requests — letters, insurance, expenses, HR. */
export function RequestsBanner({ onPress }: RequestsBannerProps) {
  return (
    <Card tone="tinted" onPress={onPress} style={styles.card}>
      <View style={styles.tile}>
        <Icon name="headset" size={18} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <Text variant="label" color={colors.primaryDark}>
          Need something from HR?
        </Text>
        <Text variant="captionSm" color={colors.primaryOnDarkSubtle}>
          Letters, insurance, expenses, HR support
        </Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.primary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 3 },
});
