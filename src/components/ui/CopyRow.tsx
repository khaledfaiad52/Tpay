import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { Tappable } from './Tappable';
import { Text } from './Text';

export type CopyRowProps = {
  /** Small caps label — "IBAN", "SWIFT / BIC". */
  label: string;
  value: string;
  monospaced?: boolean;
  /** Omit to render the row without a copy affordance. */
  onCopy?: (value: string) => void;
  /** Extra line under the value, used by the bank row. */
  footnote?: string;
  divided?: boolean;
};

/** A shareable account field with a copy action. */
export function CopyRow({
  label,
  value,
  monospaced = false,
  onCopy,
  footnote,
  divided = false,
}: CopyRowProps) {
  const body = (
    <>
      <View style={styles.body}>
        <Text variant="eyebrowSm" color={colors.inkMuted}>
          {label.toUpperCase()}
        </Text>
        <Text variant={monospaced ? 'mono' : 'rowTitle'}>{value}</Text>
        {footnote ? (
          <Text variant="caption" color={colors.inkMuted}>
            {footnote}
          </Text>
        ) : null}
      </View>
      {onCopy ? (
        <Text variant="badge" color={colors.primary}>
          Copy
        </Text>
      ) : null}
    </>
  );

  if (!onCopy) return <View style={[styles.row, divided && styles.divided]}>{body}</View>;

  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={`Copy ${label}`}
      testID={`copy-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      onPress={() => onCopy(value)}
      style={StyleSheet.flatten([styles.row, divided && styles.divided])}
    >
      {body}
    </Tappable>
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
  body: { flex: 1, gap: 3 },
});
