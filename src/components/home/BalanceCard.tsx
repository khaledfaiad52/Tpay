import { StyleSheet, View } from 'react-native';

import { AmountText, Card, Tappable, Text } from '@/components/ui';
import { colors, radius, shadows, tabularNums } from '@/theme';
import type { Account, Money } from '@/types';

export type BalanceCardProps = {
  total: Money;
  accounts: readonly Account[];
  hidden: boolean;
  onToggleHidden: () => void;
};

/** How many currency chips fit before the design collapses the rest into "+n". */
const VISIBLE_CURRENCIES = 4;

/**
 * The hero of the Home screen: one balance, the currencies behind it, and the
 * line that explains the card, transfers and salary all draw on it.
 */
export function BalanceCard({ total, accounts, hidden, onToggleHidden }: BalanceCardProps) {
  const visible = accounts.slice(0, VISIBLE_CURRENCIES);
  const overflow = accounts.length - visible.length;

  return (
    <Card tone="dark" style={styles.card}>
      <View style={styles.header}>
        <Text variant="eyebrow" color={colors.primaryOnDarkMuted}>
          TPAY BALANCE
        </Text>
        <Tappable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
          onPress={onToggleHidden}
          style={styles.toggle}
        >
          <Text variant="badge" color={colors.primaryOnDark}>
            {hidden ? 'Show' : 'Hide'}
          </Text>
        </Tappable>
      </View>

      <View style={styles.amountRow}>
        {hidden ? (
          <Text variant="balance" color={colors.onDark} numeric style={styles.masked}>
            ••••••
          </Text>
        ) : (
          <AmountText
            value={total}
            variant="balance"
            color={colors.onDark}
            emphasiseWhole
            fractionColor={colors.primaryOnDark}
          />
        )}
      </View>

      <Text variant="caption" color={colors.primaryOnDark} style={styles.explainer}>
        One balance — your card, transfers and salary all use it.
      </Text>

      <View style={styles.chips}>
        {visible.map((account, index) => (
          <View
            key={account.id}
            style={[styles.chip, index === 0 ? styles.chipPrimary : styles.chipMuted]}
          >
            <Text variant="badge" color={index === 0 ? colors.primaryDark : colors.primaryOnDark}>
              {account.currency}
            </Text>
          </View>
        ))}
        {overflow > 0 ? (
          <View style={[styles.chip, styles.chipMuted]}>
            <Text variant="badge" color={colors.primaryOnDark}>
              {`+${overflow}`}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.hero, padding: 22, gap: 18, ...shadows.hero },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggle: {
    backgroundColor: colors.overlayOnDark,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  masked: { letterSpacing: 2.4, ...tabularNums },
  explainer: { marginTop: -8 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 9 },
  chipPrimary: { backgroundColor: colors.primarySoft },
  chipMuted: { backgroundColor: colors.overlayOnDark },
});
