import { Modal, StyleSheet, View } from 'react-native';

import { AccountRow } from '@/components/money';
import { Button, Text } from '@/components/ui';
import { colors, radius, screenPadding } from '@/theme';
import type { Account } from '@/types';

export type CurrencyPickerProps = {
  visible: boolean;
  title: string;
  accounts: readonly Account[];
  /** Hidden from the list — you cannot exchange an account into itself. */
  excludeAccountId?: string;
  onSelect: (account: Account) => void;
  onClose: () => void;
};

/** Bottom sheet for choosing which of the user's accounts a side uses. */
export function CurrencyPicker({
  visible,
  title,
  accounts,
  excludeAccountId,
  onSelect,
  onClose,
}: CurrencyPickerProps) {
  const options = accounts.filter((account) => account.id !== excludeAccountId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID="currency-picker">
          <Text variant="headingSm">{title}</Text>
          {options.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              subtitle={`${account.currency} · ••${account.maskedNumber}`}
              useShortName
              onPress={onSelect}
            />
          ))}
          <Button label="Cancel" variant="secondary" block onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,26,22,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    padding: screenPadding,
    paddingBottom: 36,
    gap: 10,
  },
});
