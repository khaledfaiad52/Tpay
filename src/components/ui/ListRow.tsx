import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon } from '@/icons';
import { colors, spacing } from '@/theme';
import { Text } from './Text';
import { Tappable } from './Tappable';

export type ListRowProps = {
  /** Leading element — an `IconTile`, `Avatar` or currency disc. */
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Right-hand element — an amount, badge or stacked pair. */
  trailing?: React.ReactNode;
  /** Shows the standard chevron when there is no custom trailing element. */
  showChevron?: boolean;
  onPress?: () => void;
  /** Hairline under the row, for rows grouped inside one card. */
  divided?: boolean;
  style?: ViewStyle;
};

/** Icon · title/subtitle · trailing — the repeating unit of the whole app. */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  showChevron = false,
  onPress,
  divided = false,
  style,
}: ListRowProps) {
  const content = (
    <>
      {leading}
      <View style={styles.body}>
        <Text variant="rowTitle">{title}</Text>
        {subtitle ? (
          <Text variant="captionSm" color={colors.inkMuted}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron && !trailing ? (
        <Icon name="chevron-right" size={18} color={colors.inkFaint} />
      ) : null}
    </>
  );

  const rowStyle = StyleSheet.flatten([styles.row, divided && styles.divided, style]) as ViewStyle;

  if (!onPress) return <View style={rowStyle}>{content}</View>;
  return (
    <Tappable accessibilityRole="button" onPress={onPress} style={rowStyle}>
      {content}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  divided: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  body: { flex: 1, gap: 2 },
});
