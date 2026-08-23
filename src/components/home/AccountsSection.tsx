import { View } from 'react-native';

import { AccountRow, accountSubtitle } from '@/components/money';
import { SectionHeader } from '@/components/ui';
import type { Account } from '@/types';

export type AccountsSectionProps = {
  accounts: readonly Account[];
  onSeeAll: () => void;
  onSelect: (account: Account) => void;
};

/** How many currency accounts Home previews before "See all". */
const PREVIEW_COUNT = 2;

export function AccountsSection({ accounts, onSeeAll, onSelect }: AccountsSectionProps) {
  return (
    <View style={{ gap: 10 }}>
      <SectionHeader title="Your accounts" actionLabel="See all" onActionPress={onSeeAll} />
      {accounts.slice(0, PREVIEW_COUNT).map((account) => (
        <AccountRow
          key={account.id}
          account={account}
          subtitle={accountSubtitle(account)}
          onPress={onSelect}
        />
      ))}
    </View>
  );
}
