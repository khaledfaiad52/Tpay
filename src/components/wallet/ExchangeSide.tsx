import { StyleSheet, TextInput, View } from 'react-native';

import { AmountText, Card, Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import { colors, fonts, inputReset, radius, tabularNums } from '@/theme';
import type { Account, Money } from '@/types';
import { formatMoney, formatMoneyParts } from '@/utils';

export type ExchangeSideProps = {
  account: Account;
  /** `from` is editable and light; `to` is read-only and dark. */
  role: 'from' | 'to';
  /** Editable text for the `from` side. */
  amountText?: string;
  onChangeAmount?: (value: string) => void;
  onBlurAmount?: () => void;
  /** Computed amount for the `to` side. */
  amount?: Money;
  onPressCurrency: () => void;
  testID?: string;
};

/** One half of the exchange: a currency, a context line and a figure. */
export function ExchangeSide({
  account,
  role,
  amountText,
  onChangeAmount,
  onBlurAmount,
  amount,
  onPressCurrency,
  testID,
}: ExchangeSideProps) {
  const isFrom = role === 'from';
  const caption = isFrom
    ? `FROM · ${formatMoney(account.balance)} available`
    : `TO · ${formatMoney(account.balance)} balance`;

  return (
    <Card tone={isFrom ? 'plain' : 'dark'} style={styles.card}>
      <Tappable
        accessibilityRole="button"
        accessibilityLabel={`Change ${role} currency, currently ${account.currency}`}
        testID={`${testID}-currency`}
        onPress={onPressCurrency}
      >
        <View style={[styles.disc, isFrom ? styles.discLight : styles.discDark]}>
          <Text variant="badge" color={isFrom ? colors.primaryDark : colors.primarySoft}>
            {account.currency}
          </Text>
        </View>
      </Tappable>

      <View style={styles.body}>
        <Text variant="badge" color={isFrom ? colors.inkMuted : colors.primaryOnDarkMuted}>
          {caption}
        </Text>
        {isFrom ? (
          <View style={styles.amountRow}>
            {/* The currency marker sits outside the field so the user only
                ever edits digits. */}
            <Text variant="amountXl">{currencyPrefix(account)}</Text>
            <TextInput
              value={amountText}
              onChangeText={onChangeAmount}
              onBlur={onBlurAmount}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0.00"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
              accessibilityLabel="Amount to exchange"
              testID={testID}
            />
          </View>
        ) : (
          <AmountText
            value={amount ?? { minorUnits: 0, currency: account.currency }}
            variant="amountXl"
            color={colors.onDark}
          />
        )}
      </View>

      {isFrom ? <Icon name="chevron-down" size={16} color={colors.inkFaint} /> : null}
    </Card>
  );
}

/** "$" or "SAR " — the same marker `formatMoney` would put in front. */
function currencyPrefix(account: Account): string {
  return formatMoneyParts({ minorUnits: 0, currency: account.currency }).prefix;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  disc: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  discLight: { backgroundColor: colors.primarySoft },
  discDark: { backgroundColor: colors.overlayOnDarkStrong },
  body: { flex: 1, gap: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline' },
  input: {
    flex: 1,
    fontFamily: fonts.extrabold,
    fontSize: 24,
    letterSpacing: -0.72,
    color: colors.ink,
    padding: 0,
    ...tabularNums,
    ...inputReset,
  },
});
