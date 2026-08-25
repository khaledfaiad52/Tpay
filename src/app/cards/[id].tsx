import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RestrictionNotice } from '@/components/account';
import {
  canCardSpend,
  canReplace,
  CardDemoControls,
  CardFace,
  cardBlockedReason,
  CARD_FORMAT_LABELS,
  DeliveryTracker,
  SpendMeter,
} from '@/components/card';
import { TransactionRow } from '@/components/money';
import { ScreenHeader } from '@/components/navigation';
import {
  Button,
  Card as Surface,
  DetailRow,
  ErrorState,
  Eyebrow,
  ListRow,
  Screen,
  SectionHeader,
  SettingRow,
  Skeleton,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { useCardDetail, useRefreshOnFocus } from '@/hooks';
import { Icon } from '@/icons';
import { services } from '@/services';
import { resolveConfirmation } from '@/services/device';
import type { CardControlsUpdate } from '@/services';
import { colors, radius, spacing } from '@/theme';
import type { CardSecrets } from '@/types';
import { formatMoney } from '@/utils';

/** One card: what it is, what it can do, and what it has spent. */
export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useCardDetail(id);
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [secrets, setSecrets] = useState<CardSecrets>();
  useRefreshOnFocus(data.reload);

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={40} width={170} cornerRadius={radius.lg} />
        <Skeleton height={168} cornerRadius={radius.panel} />
        <Skeleton height={72} cornerRadius={18} />
        <Skeleton height={200} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Card" />
        <ErrorState title="We couldn't open that card" onRetry={data.reload} />
      </Screen>
    );
  }

  const { card, controls, spending, transactions, accountState, replacement } = data.data;
  const spendable = canCardSpend(card);
  const blocked = cardBlockedReason(card);

  const run = async (work: () => Promise<unknown>, confirmation?: string) => {
    setBusy(true);
    try {
      await work();
      if (confirmation) showToast(confirmation);
      data.reload();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const toggleFreeze = () =>
    run(
      () =>
        card.status === 'frozen'
          ? services.card.unfreezeCard(card.id)
          : services.card.freezeCard(card.id),
      card.status === 'frozen'
        ? 'Card unfrozen. Payments work again.'
        : 'Card frozen. All payments are blocked.',
    );

  const revealDetails = async () => {
    setBusy(true);
    try {
      // Showing a full card number is worth a real check when the user has
      // one available; it falls back to the tap confirmation when not.
      const settings = await services.security.getSettings();
      const confirmation = await resolveConfirmation(
        'Show your card details',
        settings.biometricsEnabled,
      );
      const revealed = await services.card.revealCardDetails(card.id, confirmation);
      setSecrets(revealed);
      showToast('Card details shown for 60 seconds');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "We couldn't show those details.");
    } finally {
      setBusy(false);
    }
  };

  const setControl = (update: CardControlsUpdate) =>
    run(() => services.card.updateControls(card.id, update));

  const activate = () =>
    run(async () => {
      const settings = await services.security.getSettings();
      const confirmation = await resolveConfirmation(
        'Activate your TPay card',
        settings.biometricsEnabled,
      );
      return services.card.activateCard(card.id, confirmation);
    }, 'Card activated');

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader
        title={CARD_FORMAT_LABELS[card.format]}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/cards'))}
      />

      {accountState.restriction ? (
        <RestrictionNotice restriction={accountState.restriction} testID="card-restriction" />
      ) : null}

      <CardFace card={card} secrets={secrets} footnote={blocked} testID="card-face" />

      <Surface tone="tinted" testID="card-one-balance">
        <View style={styles.balanceRow}>
          <View style={styles.balanceBody}>
            <Text variant="action" color={colors.primaryDark}>
              Spends from your TPay balance
            </Text>
            <Text variant="captionSm" color={colors.primaryOnDarkSubtle}>
              One balance · no separate card top-up
            </Text>
          </View>
          <Text variant="amountMd" color={colors.primaryDark} numeric testID="card-balance">
            {formatMoney(spending.availableBalance)}
          </Text>
        </View>
      </Surface>

      {card.delivery ? (
        <Surface padded={false} testID="card-delivery">
          <DeliveryTracker delivery={card.delivery} />
        </Surface>
      ) : null}

      {card.status === 'pending' ? (
        <Button
          label="Activate this card"
          block
          loading={busy}
          onPress={activate}
          style={styles.cta}
          testID="card-activate"
        />
      ) : null}

      {card.status === 'active' || card.status === 'frozen' ? (
        <View style={styles.actions}>
          <Tappable
            accessibilityRole="button"
            testID="card-toggle-freeze"
            disabled={busy}
            onPress={toggleFreeze}
            style={styles.action}
          >
            <Text variant="rowTitle">
              {card.status === 'frozen' ? 'Unfreeze card' : 'Freeze card'}
            </Text>
          </Tappable>
          <Tappable
            accessibilityRole="button"
            testID="card-show-details"
            disabled={busy}
            onPress={revealDetails}
            style={styles.action}
          >
            <Text variant="rowTitle">{secrets ? 'Details shown' : 'Show card details'}</Text>
          </Tappable>
        </View>
      ) : null}

      <Eyebrow label="Spending" />
      <Surface padded={false} testID="card-spending">
        <SpendMeter spending={spending} />
        <View style={styles.divider} />
        {spending.categories.map((category, index) => (
          <DetailRow
            key={category.label}
            label={category.label}
            value={formatMoney(category.amount)}
            divided={index < spending.categories.length - 1}
          />
        ))}
      </Surface>

      <Eyebrow label="Card settings" />
      <Surface padded={false} testID="card-settings">
        <SettingRow
          title="Online payments"
          subtitle="E-commerce and subscriptions"
          value={controls.onlinePayments}
          disabled={busy || !spendable}
          onValueChange={(next) => setControl({ onlinePayments: next })}
          divided
          testID="card-control-online"
        />
        <SettingRow
          title="ATM withdrawals"
          subtitle={
            card.format === 'virtual'
              ? 'A virtual card cannot be used at an ATM'
              : `${formatMoney(spending.atmDailyLimit)} daily limit`
          }
          value={controls.atmWithdrawals}
          disabled={busy || !spendable || card.format === 'virtual'}
          onValueChange={(next) => setControl({ atmWithdrawals: next })}
          divided
          testID="card-control-atm"
        />
        <SettingRow
          title="International payments"
          subtitle="Outside Saudi Arabia"
          value={controls.internationalPayments}
          disabled={busy || !spendable}
          onValueChange={(next) => setControl({ internationalPayments: next })}
          divided
          testID="card-control-international"
        />
        <ListRow
          title="Spending limits"
          trailing={
            <Text variant="caption" color={colors.inkMuted} numeric>
              {`${formatMoney(spending.monthlyLimit)} / month`}
            </Text>
          }
          divided
          testID="card-limits"
          onPress={() => router.push({ pathname: '/cards/[id]/limits', params: { id: card.id } })}
        />
        <ListRow
          title="Change PIN"
          subtitle="Set a new four-digit PIN"
          showChevron
          divided
          testID="card-change-pin"
          onPress={() => router.push({ pathname: '/cards/[id]/pin', params: { id: card.id } })}
        />
        <ListRow
          title="Add to Apple Pay"
          showChevron
          onPress={() => showToast('Apple Pay arrives with the native release.')}
        />
      </Surface>

      <SectionHeader
        title="Card activity"
        actionLabel={transactions.length > 0 ? 'View all' : undefined}
        onActionPress={transactions.length > 0 ? () => router.push('/transactions') : undefined}
        actionTestID="card-view-all"
      />
      <Surface padded={false} testID="card-transactions">
        {transactions.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="caption" color={colors.inkMuted}>
              Nothing has been paid for with this card yet.
            </Text>
          </View>
        ) : (
          transactions
            .slice(0, 5)
            .map((transaction, index) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                divided={index < Math.min(transactions.length, 5) - 1}
                onPress={() =>
                  router.push({
                    pathname: '/transactions/[id]',
                    params: { id: transaction.id },
                  })
                }
              />
            ))
        )}
      </Surface>

      {replacement ? (
        <Surface tone="gold" testID="card-replacement">
          <Text variant="caption" color={colors.warningText}>
            {`A replacement card was ordered on ${replacement.orderedAt.slice(0, 10)}.`}
          </Text>
        </Surface>
      ) : null}

      {canReplace(card) ? (
        <Tappable
          accessibilityRole="button"
          testID="card-report"
          onPress={() =>
            router.push({ pathname: '/cards/[id]/replace', params: { id: card.id } })
          }
          style={styles.report}
        >
          <Icon name="alert-triangle" size={15} color={colors.danger} />
          <Text variant="label" color={colors.danger}>
            Report lost or stolen
          </Text>
        </Tappable>
      ) : null}

      <CardDemoControls cardId={card.id} onApplied={data.reload} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  balanceBody: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: 15,
    alignItems: 'center',
  },
  divider: { height: 1, backgroundColor: colors.divider },
  empty: { padding: spacing.lg },
  cta: { borderRadius: 16, paddingVertical: 17 },
  report: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
});
