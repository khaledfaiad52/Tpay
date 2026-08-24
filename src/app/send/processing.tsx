import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSendFlow } from '@/components/send';
import { Screen, Text } from '@/components/ui';
import { colors } from '@/theme';

/**
 * The moment the transfer is in flight.
 *
 * The transfer itself is booked once, by the review screen, through the flow
 * provider — this screen only watches. It is reached with `replace`, so there
 * is nothing to go back to while money is moving.
 */
export default function ProcessingScreen() {
  const flow = useSendFlow();
  const { status, result, submitError } = flow;

  useEffect(() => {
    if (status !== 'done') return;
    if (submitError || result?.transfer.status === 'failed') {
      router.replace('/send/failed');
    } else if (result) {
      router.replace('/send/success');
    }
  }, [status, result, submitError]);

  return (
    <Screen scrollable={false} contentStyle={styles.content}>
      <View style={styles.body} testID="send-processing">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="sectionTitle">Sending your money</Text>
        <Text variant="caption" color={colors.inkMuted} style={styles.copy}>
          Hold on a moment — we&apos;re confirming this transfer with the payout network.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  body: { alignItems: 'center', gap: 14 },
  copy: { textAlign: 'center', maxWidth: 250, lineHeight: 18 },
});
