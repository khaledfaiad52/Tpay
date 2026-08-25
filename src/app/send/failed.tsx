import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TransferOutcome, useSendFlow } from '@/components/send';
import { Button, Card, DetailRow, Text } from '@/components/ui';
import { colors } from '@/theme';
import { formatMoney } from '@/utils';

/**
 * The transfer did not go through. The first thing this screen says is that
 * the money never left the account.
 */
export default function FailedScreen() {
  const flow = useSendFlow();
  const insets = useSafeAreaInsets();
  const transfer = flow.result?.transfer;
  const quote = flow.quote;

  const attempted = transfer?.totalDebit ?? quote?.totalDebit;
  const recipientName = transfer?.recipient.name ?? quote?.recipient.name ?? 'your recipient';
  const reason =
    transfer?.failureReason ??
    flow.submitError ??
    "We couldn't complete this transfer. Nothing has left your account.";
  const errorCode = transfer?.errorCode ?? 'TRANSFER_REJECTED';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TransferOutcome tone="failure" title="Transfer failed" description={reason} />

      <Card padded={false} style={styles.card} testID="send-failed">
        {attempted ? (
          <DetailRow label="Attempted" value={formatMoney(attempted)} divided />
        ) : null}
        <DetailRow label="Recipient" value={recipientName} divided />
        <DetailRow label="Error code" value={errorCode} monospaced />
      </Card>

      <View style={styles.actions}>
        <Button
          label="Check details & retry"
          block
          style={styles.cta}
          testID="send-retry"
          onPress={() => router.replace('/send/recipient')}
        />
        <Button
          label="Talk to support"
          variant="secondary"
          block
          style={styles.cta}
          onPress={() => router.replace('/requests')}
        />
        <Button
          label="Back to home"
          variant="secondary"
          block
          style={styles.quiet}
          onPress={() => {
            flow.reset();
            router.dismissAll();
            setTimeout(() => router.navigate('/'), 0);
          }}
          testID="send-failed-home"
        />
      </View>

      <Text variant="captionSm" color={colors.inkFaint} style={styles.footnote}>
        Your balance is unchanged.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 24, gap: 18, alignItems: 'center', minHeight: '100%' },
  card: { width: '100%' },
  actions: { width: '100%', gap: 10 },
  cta: { borderRadius: 16, paddingVertical: 17 },
  quiet: {
    borderRadius: 16,
    paddingVertical: 17,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  footnote: { textAlign: 'center' },
});
