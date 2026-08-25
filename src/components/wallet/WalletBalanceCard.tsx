import { StyleSheet } from 'react-native';

import { AmountText, Card, Text } from '@/components/ui';
import { colors, radius } from '@/theme';
import type { Money } from '@/types';

export type WalletBalanceCardProps = {
  total: Money;
  /** Number of non-primary currency accounts, for the caption. */
  additionalCurrencies: number;
};

/** The wallet's headline: one USD-equivalent balance across every currency. */
export function WalletBalanceCard({ total, additionalCurrencies }: WalletBalanceCardProps) {
  return (
    <Card tone="dark" style={styles.card}>
      <Text variant="eyebrow" color={colors.primaryOnDarkMuted}>
        TPAY BALANCE · USD EQUIVALENT
      </Text>
      <AmountText value={total} variant="balanceSm" color={colors.onDark} />
      <Text variant="caption" color={colors.primaryOnDark}>
        {`Primary USD wallet + ${additionalCurrencies} currencies · your card spends from here`}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.sheet, padding: 20, gap: 8 },
});
