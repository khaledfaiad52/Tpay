import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { Text } from './Text';
import { Tappable } from './Tappable';

export type SectionHeaderProps = {
  title: string;
  /** Trailing link — "View all", "See all", "Manage". */
  actionLabel?: string;
  onActionPress?: () => void;
};

/** Section title with an optional trailing link, as used all over Home. */
export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text variant="sectionTitle">{title}</Text>
      {actionLabel && onActionPress ? (
        <Tappable accessibilityRole="link" onPress={onActionPress} style={styles.action}>
          <Text variant="action" color={colors.primary}>
            {actionLabel}
          </Text>
        </Tappable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  action: { paddingVertical: 4, paddingLeft: 12 },
});
