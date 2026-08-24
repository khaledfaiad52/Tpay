import { StyleSheet } from 'react-native';

import { Card, IconTile, ListRow } from '@/components/ui';

export type AccountDetailsRowProps = {
  onPress: () => void;
};

/** Entry point to the coordinates a user shares in order to get paid. */
export function AccountDetailsRow({ onPress }: AccountDetailsRowProps) {
  return (
    <Card padded={false} onPress={onPress} testID="wallet-account-details">
      <ListRow
        leading={<IconTile name="landmark" tone="primary" size={40} />}
        title="Your TPay account details"
        subtitle="Share these to get paid · IBAN, SWIFT, routing"
        showChevron
        style={styles.row}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 16, gap: 13 },
});
