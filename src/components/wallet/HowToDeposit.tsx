import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { colors } from '@/theme';

/**
 * Deposit instructions. The beneficiary is always named TPay — the partner
 * institution behind the account is never surfaced to the user.
 */
const STEPS = [
  'Open your bank app',
  'Add TPay as a new beneficiary using the details above',
  'Send the amount you want to deposit',
  'Money appears in your wallet, usually within hours',
];

export function HowToDeposit() {
  return (
    <Card tone="tinted" style={styles.card}>
      <Text variant="label" color={colors.primaryDark}>
        How to deposit
      </Text>
      {STEPS.map((step, index) => (
        <View key={step} style={styles.step}>
          <Text variant="badge" color={colors.primary} style={styles.number}>
            {index + 1}
          </Text>
          <Text variant="caption" color={colors.primaryDeepText} style={styles.copy}>
            {step}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 11 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  number: { minWidth: 14 },
  copy: { flex: 1, lineHeight: 17 },
});
