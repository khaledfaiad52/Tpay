import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { Text } from './Text';

export type EyebrowProps = {
  label: string;
  /** Optional right-hand figure, e.g. a month's net total. */
  value?: string;
  valueColor?: string;
};

/** Small-caps group heading — "AUGUST 2026", "SEND TO THESE DETAILS". */
export function Eyebrow({ label, value, valueColor = colors.inkMuted }: EyebrowProps) {
  return (
    <View style={styles.row}>
      <Text variant="eyebrowSm" color={colors.inkMuted}>
        {label.toUpperCase()}
      </Text>
      {value ? (
        <Text variant="badge" color={valueColor} numeric>
          {value}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
