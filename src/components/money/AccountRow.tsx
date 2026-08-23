import { AmountText, Card, ListRow } from '@/components/ui';
import type { Account } from '@/types';
import { CurrencyDisc } from './CurrencyDisc';

export type AccountRowProps = {
  account: Account;
  /** Line under the account name — "Salary account · ••4821". */
  subtitle: string;
  onPress?: (account: Account) => void;
};

/** A single currency account, presented as its own card. */
export function AccountRow({ account, subtitle, onPress }: AccountRowProps) {
  return (
    <Card padded={false} onPress={onPress ? () => onPress(account) : undefined}>
      <ListRow
        leading={<CurrencyDisc currency={account.currency} />}
        title={account.name}
        subtitle={subtitle}
        trailing={<AmountText value={account.balance} variant="amountMd" />}
        style={{ paddingVertical: 16, gap: 14 }}
      />
    </Card>
  );
}

/** "Salary account · ••4821" — the caption the design shows on Home. */
export function accountSubtitle(account: Account): string {
  const kindLabel: Record<Account['kind'], string> = {
    salary: 'Salary account',
    local: 'Local account',
    benefit: 'Benefit account',
    'multi-currency': 'Multi-currency',
    virtual: 'Virtual account',
  };
  return `${kindLabel[account.kind]} · ••${account.maskedNumber}`;
}
