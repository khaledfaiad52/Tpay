import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';
import type { CurrencyCode } from '@/types';

export type CurrencyDiscProps = {
  currency: CurrencyCode;
  size?: number;
};

/** Circular currency-code disc that leads every account row. */
export function CurrencyDisc({ currency, size = 40 }: CurrencyDiscProps) {
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text variant="badge" color={colors.primaryDark}>
        {currency}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
