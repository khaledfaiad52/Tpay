import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { CurrencyPicker, ExchangeSide } from '@/components/wallet';
import {
  Button,
  Card,
  DetailRow,
  ErrorState,
  Screen,
  Skeleton,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { Icon } from '@/icons';
import { useExchange } from '@/hooks';
import { colors } from '@/theme';
import { formatCountdown } from '@/components/money';
import { totalDebit } from '@/services';
import { formatMoney } from '@/utils';

/** Below this the rate is about to lapse and the countdown turns amber. */
const RATE_WARNING_SECONDS = 30;

export default function ExchangeScreen() {
  const exchange = useExchange();
  const { showToast } = useToast();
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  if (exchange.accounts.status === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="Exchange" />
        <Skeleton height={78} />
        <Skeleton height={78} />
        <Skeleton height={140} />
        <Skeleton height={56} cornerRadius={16} />
      </Screen>
    );
  }

  if (exchange.accounts.status === 'error' || !exchange.source || !exchange.target) {
    return (
      <Screen>
        <ScreenHeader title="Exchange" />
        <ErrorState
          title="We couldn't load your accounts"
          description="Check your connection and try again."
          onRetry={exchange.accounts.reload}
        />
      </Screen>
    );
  }

  const { source, target, quote, secondsRemaining } = exchange;
  const expiring = secondsRemaining > 0 && secondsRemaining <= RATE_WARNING_SECONDS;

  const onConfirm = async () => {
    const received = await exchange.confirm();
    if (received) {
      showToast(`Exchanged — ${formatMoney(received)} added to your ${received.currency} wallet`);
      router.back();
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Exchange" />

      <View style={styles.sides}>
        <ExchangeSide
          account={source}
          role="from"
          amountText={exchange.amountText}
          onChangeAmount={exchange.setAmountText}
          onBlurAmount={exchange.blurAmount}
          onPressCurrency={() => setPicking('from')}
          testID="exchange-from"
        />
        <ExchangeSide
          account={target}
          role="to"
          amount={quote?.targetAmount}
          onPressCurrency={() => setPicking('to')}
          testID="exchange-to"
        />
        <Tappable
          accessibilityRole="button"
          accessibilityLabel="Swap currencies"
          testID="exchange-swap"
          onPress={exchange.swap}
          style={styles.swap}
        >
          <Icon name="arrow-down-up" size={16} color={colors.primary} strokeWidth={2} />
        </Tappable>
      </View>

      {exchange.error ? (
        <Card tone="danger" testID="exchange-error">
          <Text variant="caption" color={colors.dangerText}>
            {exchange.error}
          </Text>
        </Card>
      ) : null}

      <Card padded={false}>
        <DetailRow
          label="Rate"
          value={
            quote
              ? `1 ${quote.from} = ${quote.rate.toFixed(4)} ${quote.to}`
              : exchange.isQuoting
                ? 'Getting a rate…'
                : '—'
          }
          divided
        />
        <DetailRow
          label={quote ? `Fee (${(quote.feeRate * 100).toFixed(2)}%)` : 'Fee'}
          value={quote ? formatMoney(quote.fee) : '—'}
          divided
        />
        <DetailRow
          label="Total from your account"
          value={quote ? formatMoney(totalDebit(quote)) : '—'}
          divided
        />
        <DetailRow
          label="Rate expires in"
          value={quote ? formatCountdown(secondsRemaining) : '—'}
          valueColor={expiring ? colors.warning : colors.ink}
        />
      </Card>

      <Button
        label={secondsRemaining === 0 && quote ? 'Rate expired — refresh' : 'Confirm exchange'}
        block
        disabled={!exchange.canConfirm}
        loading={exchange.isSubmitting}
        onPress={onConfirm}
        style={styles.confirm}
        testID="exchange-confirm"
      />

      <Text variant="captionSm" color={colors.inkFaint} style={styles.footnote}>
        TPay uses the live mid-market rate. No hidden spread.
      </Text>

      <CurrencyPicker
        visible={picking !== null}
        title={picking === 'to' ? 'Exchange into' : 'Exchange from'}
        accounts={exchange.accounts.data}
        excludeAccountId={picking === 'from' ? target.id : source.id}
        onSelect={(account) => {
          if (picking === 'from') exchange.setSourceAccountId(account.id);
          else exchange.setTargetAccountId(account.id);
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  sides: { gap: 10, position: 'relative' },
  swap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -19,
    marginLeft: -19,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  confirm: { borderRadius: 16, paddingVertical: 17 },
  footnote: { textAlign: 'center' },
});
