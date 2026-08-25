import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RestrictionNotice } from '@/components/account';
import { AmountEntry, prefixFor, SourceAccountRow, StepHeader, useSendFlow } from '@/components/send';
import { CurrencyPicker } from '@/components/wallet';
import { Button, Card, DetailRow, Screen, Text } from '@/components/ui';
import { presetAmountsFor, useSendHubData } from '@/hooks';
import { colors } from '@/theme';
import type { Money } from '@/types';
import { formatMoney } from '@/utils';

/** Step 2: how much, and which wallet it leaves from. */
export default function AmountScreen() {
  const flow = useSendFlow();
  const hub = useSendHubData();
  const [picking, setPicking] = useState(false);

  const { recipient, sourceAccount, sendAmount, quote, refreshQuote } = flow;

  // Price the transfer whenever the inputs settle.
  useEffect(() => {
    if (!sendAmount) return;
    const timer = setTimeout(() => {
      void refreshQuote();
    }, 250);
    return () => clearTimeout(timer);
  }, [sendAmount, refreshQuote]);

  const presets = useMemo(
    () => (sourceAccount ? presetAmountsFor(sourceAccount.currency) : []),
    [sourceAccount],
  );

  if (!recipient || !sourceAccount) {
    return (
      <Screen>
        <StepHeader title="Amount" step={2} totalSteps={3} />
        <Card>
          <Text variant="caption" color={colors.inkMuted}>
            Choose a recipient first.
          </Text>
        </Card>
        <Button label="Back to Send" onPress={() => router.replace('/send')} />
      </Screen>
    );
  }

  const caption = quote
    ? `${firstName(recipient.name)} receives ≈ ${formatMoney(quote.receiveAmount)}`
    : flow.isQuoting
      ? 'Working out what they receive…'
      : `Enter an amount to pay ${firstName(recipient.name)}`;

  const setAmount = (amount: Money) =>
    flow.setAmountText(String(amount.minorUnits / 100));

  return (
    <Screen contentStyle={styles.content}>
      <StepHeader
        title="Amount"
        step={2}
        totalSteps={3}
        context={`to ${recipient.name}`}
      />

      <AmountEntry
        value={flow.amountText}
        onChangeText={flow.setAmountText}
        currencyPrefix={prefixFor(sourceAccount.currency)}
        caption={caption}
        presets={presets}
        selectedPreset={sendAmount?.minorUnits}
        onSelectPreset={setAmount}
        onSelectMax={() => setAmount(sourceAccount.balance)}
        testID="send-amount"
      />

      <Card padded={false} style={styles.summary}>
        <SourceAccountRow account={sourceAccount} onChange={() => setPicking(true)} />
        {quote?.fxRate ? (
          <DetailRow
            label={`Rate · 1 ${quote.sendAmount.currency} = ${quote.fxRate.toFixed(4)} ${quote.receiveAmount.currency}`}
            value="Locked"
            valueColor={colors.primary}
          />
        ) : (
          <DetailRow
            label="Rate"
            value={quote ? 'Same currency · no FX' : '—'}
            valueColor={colors.inkMuted}
          />
        )}
      </Card>

      {flow.restriction ? (
        <RestrictionNotice restriction={flow.restriction} testID="send-restriction" />
      ) : flow.limitBreach ? (
        <Card tone="gold" testID="send-limit">
          <View style={styles.limit}>
            <Text variant="label" color={colors.warningText}>
              {flow.limitBreach.max.minorUnits === 0
                ? 'Sending is paused'
                : `Over your ${formatMoney(flow.limitBreach.max)} transfer limit`}
            </Text>
            <Text variant="caption" color={colors.warningTextSoft} style={styles.limitCopy}>
              {flow.limitBreach.explanation ??
                `Your current verification level has a transfer limit of ${formatMoney(flow.limitBreach.max)}.`}
            </Text>
            {flow.limitBreach.action ? (
              <Button
                label={flow.limitBreach.action.label}
                variant="secondary"
                style={styles.limitAction}
                testID="send-limit-action"
                onPress={() =>
                  flow.limitBreach?.action?.kind === 'verify-identity'
                    ? router.push('/kyc')
                    : router.push({
                        pathname: '/support/new',
                        params: { topic: 'transfers', subject: 'Transfer limit' },
                      })
                }
              />
            ) : null}
          </View>
        </Card>
      ) : flow.quoteError ? (
        <Card tone="danger" testID="send-amount-error">
          <Text variant="caption" color={colors.dangerText}>
            {flow.quoteError}
          </Text>
        </Card>
      ) : null}

      <Button
        label="Review transfer"
        block
        disabled={!quote}
        onPress={() => router.push('/send/review')}
        style={styles.cta}
        testID="send-review"
      />

      <CurrencyPicker
        visible={picking}
        title="Pay from"
        accounts={hub.status === 'success' ? hub.data.accounts : []}
        onSelect={(account) => {
          flow.chooseSourceAccount(account);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    </Screen>
  );
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  summary: { marginTop: 6 },
  limit: { gap: 6 },
  limitCopy: { lineHeight: 17 },
  limitAction: { marginTop: 6, paddingVertical: 11 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 6 },
});
