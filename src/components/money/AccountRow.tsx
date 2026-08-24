import { StyleSheet, View } from 'react-native';

import { AmountText, Card, ListRow, Text } from '@/components/ui';
import { colors } from '@/theme';
import { toMajor, type Account, type Money } from '@/types';
import { percentageOf } from '@/utils';
import { CurrencyDisc } from './CurrencyDisc';

export type AccountRowProps = {
  account: Account;
  /** Line under the account name — "Salary account · ••4821". */
  subtitle: string;
  /** Use the short currency name, for lists that are already about accounts. */
  useShortName?: boolean;
  /** Adds "66% of total" under the balance. Wallet shows this on the primary. */
  shareOfTotal?: Money;
  onPress?: (account: Account) => void;
  testID?: string;
};

/** A single currency account, presented as its own card. */
export function AccountRow({
  account,
  subtitle,
  useShortName = false,
  shareOfTotal,
  onPress,
  testID,
}: AccountRowProps) {
  const share = shareOfTotal
    ? percentageOf(toMajor(account.balance), toMajor(shareOfTotal))
    : undefined;

  return (
    <Card
      padded={false}
      onPress={onPress ? () => onPress(account) : undefined}
      testID={testID ?? `account-row-${account.id}`}
    >
      <ListRow
        leading={<CurrencyDisc currency={account.currency} size={useShortName ? 42 : 40} />}
        title={useShortName ? account.shortName : account.name}
        subtitle={subtitle}
        trailing={
          share === undefined ? (
            <AmountText value={account.balance} variant="amountMd" />
          ) : (
            <View style={styles.trailing}>
              <AmountText value={account.balance} variant="amountMd" />
              <Text variant="captionSm" color={colors.inkMuted}>
                {`${share}% of total`}
              </Text>
            </View>
          )
        }
        style={styles.row}
      />
    </Card>
  );
}

const KIND_LABELS: Record<Account['kind'], string> = {
  salary: 'Salary account',
  local: 'Local account',
  benefit: 'Benefit account',
  'multi-currency': 'Multi-currency',
  virtual: 'Virtual account',
};

/** "Salary account · ••4821" — the caption Home shows. */
export function accountSubtitle(account: Account): string {
  return `${KIND_LABELS[account.kind]} · ••${account.maskedNumber}`;
}

/** "Primary · salary & card" for the USD wallet, the kind label otherwise. */
export function accountWalletSubtitle(account: Account): string {
  return account.isPrimary ? 'Primary · salary & card' : KIND_LABELS[account.kind];
}

const styles = StyleSheet.create({
  row: { paddingVertical: 16, gap: 14 },
  trailing: { alignItems: 'flex-end', gap: 2 },
});
