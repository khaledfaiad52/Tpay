import { StyleSheet, View } from 'react-native';

import { colors, spacing, type } from '@/theme';
import { Text } from './Text';

export type DetailRowProps = {
  label: string;
  value: string;
  /** Renders the value in IBM Plex Mono — references, IBANs, rates. */
  monospaced?: boolean;
  /** Overrides the value colour, e.g. amber for an expiring rate. */
  valueColor?: string;
  divided?: boolean;
};

/** Label on the left, value on the right — receipts and summaries. */
export function DetailRow({
  label,
  value,
  monospaced = false,
  valueColor = colors.ink,
  divided = false,
}: DetailRowProps) {
  return (
    <View style={[styles.row, divided && styles.divided]}>
      <Text variant="body" color={colors.inkMuted} style={styles.label}>
        {label}
      </Text>
      <Text
        variant={monospaced ? 'mono' : 'label'}
        color={valueColor}
        numeric
        style={styles.value}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  divided: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  label: { flexShrink: 0 },
  value: { flexShrink: 1, textAlign: 'right', lineHeight: type.label.fontSize * 1.4 },
});
