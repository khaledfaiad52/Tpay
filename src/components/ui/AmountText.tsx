import { StyleSheet } from 'react-native';

import { colors, type } from '@/theme';
import type { Money, TransactionDirection } from '@/types';
import { formatMoneyParts, MINUS } from '@/utils';
import { Text } from './Text';

export type AmountTextProps = {
  value: Money;
  /** Type ramp entry for the whole part. */
  variant?: 'balance' | 'balanceSm' | 'amountLg' | 'amountMd' | 'amountSm';
  color?: string;
  /** Renders the cents smaller and in `fractionColor`, as the balance card does. */
  emphasiseWhole?: boolean;
  fractionColor?: string;
  /** Prefixes "+" or "−" for transaction rows. */
  direction?: TransactionDirection;
};

/**
 * The single way money reaches the screen. Always tabular, always formatted
 * through `@/utils` — no component formats an amount itself.
 */
export function AmountText({
  value,
  variant = 'amountSm',
  color = colors.ink,
  emphasiseWhole = false,
  fractionColor = colors.primaryOnDark,
  direction,
}: AmountTextProps) {
  const parts = formatMoneyParts(value);
  const sign = direction ? (direction === 'credit' ? '+' : MINUS) : '';
  const fractionSize = Math.round(type[variant].fontSize * 0.6);

  return (
    <Text variant={variant} color={color} numeric>
      {sign}
      {parts.prefix}
      {parts.whole}
      {parts.fraction ? (
        <Text
          variant={variant}
          color={emphasiseWhole ? fractionColor : color}
          numeric
          style={emphasiseWhole ? [styles.fraction, { fontSize: fractionSize }] : undefined}
        >
          {parts.fraction}
        </Text>
      ) : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  fraction: { letterSpacing: 0 },
});
