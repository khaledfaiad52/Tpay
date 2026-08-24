import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TransferOutcome, useSendFlow } from '@/components/send';
import { formatDateTime } from '@/components/money';
import { Button, Text, useToast } from '@/components/ui';
import { colors, radius } from '@/theme';
import { formatMoney } from '@/utils';

const STATUS_LABELS = {
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
} as const;

/** The transfer landed. Dark, celebratory, and specific about what happens next. */
export default function SuccessScreen() {
  const flow = useSendFlow();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const transfer = flow.result?.transfer;

  if (!transfer) {
    router.replace('/send');
    return null;
  }

  const done = () => {
    flow.reset();
    // Unwind the send stack, then switch back to the Home tab. A `replace`
    // here would leave the Send tab selected behind the flow.
    router.dismissAll();
    // The dismiss and the tab switch must not land in the same tick, or the
    // navigator keeps Send selected behind the unwound flow.
    setTimeout(() => router.navigate('/'), 0);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TransferOutcome
        tone="success"
        title="Money sent"
        description={`${formatMoney(transfer.receiveAmount)} is on its way to ${transfer.recipient.name}. ${transfer.estimatedDelivery}.`}
      />

      <View style={styles.card} testID="send-success">
        <Row label="Amount sent" value={formatMoney(transfer.totalDebit)} divided />
        <Row label="Recipient receives" value={formatMoney(transfer.receiveAmount)} divided />
        <Row label="Date" value={formatDateTime(transfer.createdAt)} divided />
        <Row label="Reference" value={transfer.reference} monospaced divided />
        <Row
          label="Status"
          value={STATUS_LABELS[transfer.status]}
          valueColor={colors.successOnDark}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="Done"
          variant="light"
          block
          onPress={done}
          style={styles.cta}
          testID="send-done"
        />
        <Button
          label="View transfer"
          variant="ghostOnDark"
          block
          style={styles.cta}
          onPress={() => router.push({ pathname: '/transfers/[id]', params: { id: transfer.id } })}
        />
        <Button
          label="Share receipt"
          variant="ghostOnDark"
          block
          style={styles.cta}
          onPress={async () => {
            await Clipboard.setStringAsync(
              [
                `TPay transfer · ${STATUS_LABELS[transfer.status]}`,
                `${formatMoney(transfer.receiveAmount)} to ${transfer.recipient.name}`,
                `Debited ${formatMoney(transfer.totalDebit)}`,
                `Reference ${transfer.reference}`,
              ].join('\n'),
            );
            showToast('Receipt copied — paste it anywhere');
          }}
        />
      </View>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  monospaced = false,
  valueColor = colors.onDark,
  divided = false,
}: {
  label: string;
  value: string;
  monospaced?: boolean;
  valueColor?: string;
  divided?: boolean;
}) {
  return (
    <View style={[styles.row, divided && styles.divided]}>
      <Text variant="label" color={colors.primaryOnDark}>
        {label}
      </Text>
      <Text variant={monospaced ? 'mono' : 'label'} color={valueColor} numeric>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primaryDark },
  content: {
    paddingHorizontal: 24,
    gap: 18,
    alignItems: 'center',
    minHeight: '100%',
  },
  card: {
    width: '100%',
    borderRadius: radius.panel,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 4,
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  divided: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  actions: { width: '100%', gap: 10, marginTop: 6 },
  cta: { borderRadius: 16, paddingVertical: 17 },
});
