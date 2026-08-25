import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { formatRecipientDestination, StepHeader, useSendFlow } from '@/components/send';
import {
  AmountText,
  Button,
  Card,
  DetailRow,
  FadeInUp,
  Screen,
  Tappable,
  Text,
} from '@/components/ui';
import { Icon } from '@/icons';
import { colors, radius } from '@/theme';
import { formatMoney, formatShortDate } from '@/utils';

/**
 * Step 3: exactly what will happen. Every figure the user could be surprised
 * by is on this screen — what they send, the fee, what actually leaves the
 * account, what the recipient gets, the rate and when it lands.
 */
export default function ReviewScreen() {
  const flow = useSendFlow();
  const { quote } = flow;

  if (!quote) {
    return (
      <Screen>
        <StepHeader title="Review transfer" step={3} totalSteps={3} />
        <Card>
          <Text variant="caption" color={colors.inkMuted}>
            That quote is no longer valid. Go back and check the amount.
          </Text>
        </Card>
        <Button label="Back to amount" onPress={() => router.replace('/send/amount')} />
      </Screen>
    );
  }

  const confirm = (demoFailure: boolean) => {
    void flow.submit({ demoFailure });
    router.replace('/send/processing');
  };

  return (
    <Screen contentStyle={styles.content}>
      <StepHeader title="Review transfer" step={3} totalSteps={3} />

      <FadeInUp>
        <Card tone="dark" style={styles.hero}>
          <Text variant="eyebrow" color={colors.primaryOnDarkMuted}>
            {`${firstName(quote.recipient.name).toUpperCase()} RECEIVES`}
          </Text>
          <AmountText value={quote.receiveAmount} variant="balanceSm" color={colors.onDark} />
          <Text variant="caption" color={colors.primaryOnDark}>
            {`${quote.estimatedDelivery} · by ${formatShortDate(quote.arrivesBy)}`}
          </Text>
        </Card>
      </FadeInUp>

      <Card padded={false}>
        <DetailRow label="You send" value={formatMoney(quote.sendAmount)} divided />
        <DetailRow label="Transfer fee" value={formatMoney(quote.fee)} divided />
        {quote.fxRate ? (
          <DetailRow
            label="Exchange rate"
            value={`1 ${quote.sendAmount.currency} = ${quote.fxRate.toFixed(4)} ${quote.receiveAmount.currency}`}
            divided
          />
        ) : null}
        <DetailRow label="Total debited" value={formatMoney(quote.totalDebit)} divided />
        <DetailRow label="Recipient receives" value={formatMoney(quote.receiveAmount)} divided />
        <DetailRow
          label="To"
          value={formatRecipientDestination(quote.recipient)}
          divided
        />
        <DetailRow
          label="Payout"
          value={`${quote.payoutMethod} · ${quote.receiveAmount.currency}`}
        />
      </Card>

      <View style={styles.assurance}>
        <View style={styles.shield}>
          <Icon name="shield-check" size={11} color={colors.primary} strokeWidth={2.2} />
        </View>
        <Text variant="captionSm" color={colors.inkMuted} style={styles.assuranceCopy}>
          Protected by TPay. You&apos;ll confirm with Face ID.
        </Text>
      </View>

      <Button
        label="Confirm transfer"
        block
        onPress={() => confirm(false)}
        style={styles.cta}
        testID="send-confirm"
      />

      <Tappable
        accessibilityRole="button"
        testID="send-simulate-failure"
        onPress={() => confirm(true)}
        style={styles.simulate}
      >
        <Text variant="caption" color={colors.inkFaint}>
          Simulate failure
        </Text>
      </Tappable>
    </Screen>
  );
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  hero: { borderRadius: radius.sheet, padding: 20, gap: 6, alignItems: 'center' },
  assurance: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 4 },
  shield: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assuranceCopy: { flex: 1 },
  cta: { borderRadius: 16, paddingVertical: 17 },
  simulate: { alignItems: 'center', paddingVertical: 4 },
});
