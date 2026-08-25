import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { Text } from './Text';
import { Toggle } from './Toggle';

export type SettingRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  divided?: boolean;
  testID?: string;
};

/** A titled setting with a switch — the repeating row on Security. */
export function SettingRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
  divided = false,
  testID,
}: SettingRowProps) {
  return (
    <View style={[styles.row, divided && styles.divided]}>
      <View style={styles.body}>
        <Text variant="label">{title}</Text>
        {subtitle ? (
          <Text variant="captionSm" color={colors.inkMuted}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Toggle
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={title}
        disabled={disabled}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
  },
  divided: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  body: { flex: 1, gap: 2 },
});
