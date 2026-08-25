import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Eyebrow, Tappable, Text, useToast } from '@/components/ui';
import { appConfig, CardDeclinedError, newIdempotencyKey, services } from '@/services';
import { fromMajor, type Money } from '@/types';
import { colors, radius } from '@/theme';

/**
 * Purchases a real terminal would send.
 *
 * Each one goes through `authorizePurchase` — the same call a card processor's
 * webhook would drive — so a frozen card, a disabled control or a reached
 * limit refuses here exactly as it would in production.
 */
const PURCHASES: readonly {
  readonly label: string;
  readonly merchant: string;
  readonly amount: Money;
  readonly online?: boolean;
  readonly atm?: boolean;
  readonly international?: boolean;
}[] = [
  { label: 'In store', merchant: 'Panda Hypermarket', amount: fromMajor(24, 'USD') },
  { label: 'Online', merchant: 'Amazon', amount: fromMajor(38.5, 'USD'), online: true },
  { label: 'ATM', merchant: 'ATM withdrawal', amount: fromMajor(100, 'USD'), atm: true },
  {
    label: 'Abroad',
    merchant: 'Heathrow Express',
    amount: fromMajor(45, 'USD'),
    international: true,
  },
];

export type CardDemoControlsProps = {
  cardId: string;
  onApplied: () => void;
};

/**
 * Demo-only card terminal.
 *
 * Hidden unless EXPO_PUBLIC_ENABLE_CARD_DEMO=true, so a production build never
 * renders it. The service seam underneath is what production uses.
 */
export function CardDemoControls({ cardId, onApplied }: CardDemoControlsProps) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  if (!appConfig.demo.card) return null;

  const buy = async (purchase: (typeof PURCHASES)[number]) => {
    setBusy(true);
    try {
      await services.card.authorizePurchase({
        // A terminal generates one of these per authorisation attempt.
        idempotencyKey: newIdempotencyKey('auth'),
        cardId,
        amount: purchase.amount,
        merchant: purchase.merchant,
        online: purchase.online,
        atm: purchase.atm,
        international: purchase.international,
        authorization: { method: 'tap' },
      });
      showToast(`Approved — ${purchase.merchant}`);
    } catch (cause) {
      if (cause instanceof CardDeclinedError) {
        showToast(`Declined — ${cause.message}`);
      } else {
        showToast(cause instanceof Error ? `Declined — ${cause.message}` : 'Declined');
      }
    } finally {
      setBusy(false);
      onApplied();
    }
  };

  return (
    <View style={styles.block}>
      <Eyebrow label="Demo · simulate a card payment" />
      <View style={styles.row}>
        {PURCHASES.map((purchase) => (
          <Tappable
            key={purchase.label}
            accessibilityRole="button"
            testID={`card-demo-${purchase.label.toLowerCase().replace(/\s+/g, '-')}`}
            disabled={busy}
            onPress={() => buy(purchase)}
            style={styles.chip}
          >
            <Text variant="captionSm" color={colors.inkMuted}>
              {purchase.label}
            </Text>
          </Tappable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
