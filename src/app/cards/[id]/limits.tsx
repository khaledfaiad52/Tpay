import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { SpendMeter } from '@/components/card';
import { ScreenHeader } from '@/components/navigation';
import { FormField } from '@/components/send';
import {
  Banner,
  Button,
  Card as Surface,
  ErrorState,
  Screen,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { useCardDetail } from '@/hooks';
import { services } from '@/services';
import { fromMajor, toMajor, type Money } from '@/types';
import { colors, radius } from '@/theme';
import { formatMoney } from '@/utils';

/** A limit is always a whole amount, so the field shows it without cents. */
function editableAmount(value: Money): string {
  return String(Math.round(toMajor(value)));
}

/** How much this card may spend, and how much it may take from an ATM. */
export default function CardLimitsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useCardDetail(id);
  const { showToast } = useToast();
  const [monthly, setMonthly] = useState<string>();
  const [atm, setAtm] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={40} width={170} cornerRadius={radius.lg} />
        <Skeleton height={120} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Spending limits" />
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const { card, spending } = data.data;
  const currency = spending.monthlyLimit.currency;
  const monthlyValue = monthly ?? editableAmount(spending.monthlyLimit);
  const atmValue = atm ?? editableAmount(spending.atmDailyLimit);

  const monthlyNumber = Number(monthlyValue.replace(/,/g, ''));
  const atmNumber = Number(atmValue.replace(/,/g, ''));
  const valid =
    Number.isFinite(monthlyNumber) &&
    monthlyNumber > 0 &&
    Number.isFinite(atmNumber) &&
    atmNumber >= 0;
  const dirty =
    monthlyValue !== editableAmount(spending.monthlyLimit) ||
    atmValue !== editableAmount(spending.atmDailyLimit);

  const save = async () => {
    setSaving(true);
    setError(undefined);
    try {
      await services.card.updateLimits(card.id, {
        monthlyLimit: fromMajor(monthlyNumber, currency),
        atmDailyLimit: fromMajor(atmNumber, currency),
      });
      showToast('Spending limits updated');
      data.reload();
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't save those limits.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Spending limits" subtitle={`Card ending ${card.last4}`} />

      <Surface padded={false} testID="card-limits-meter">
        <SpendMeter spending={spending} />
      </Surface>

      <FormField
        label={`Monthly limit (${currency})`}
        value={monthlyValue}
        onChangeText={setMonthly}
        keyboardType="phone-pad"
        autoCapitalize="none"
        error={
          Number.isFinite(monthlyNumber) && monthlyNumber > 0
            ? undefined
            : 'Enter an amount above zero.'
        }
        testID="card-limit-monthly"
      />
      <FormField
        label={`Daily ATM limit (${currency})`}
        value={atmValue}
        onChangeText={setAtm}
        keyboardType="phone-pad"
        autoCapitalize="none"
        testID="card-limit-atm"
      />

      {error ? (
        <Surface tone="danger" testID="card-limits-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Surface>
      ) : null}

      <Banner>
        {`A limit caps this card only. Your TPay balance of ${formatMoney(spending.availableBalance)} is shared with every other way you pay.`}
      </Banner>

      <Button
        label="Save limits"
        block
        disabled={!dirty || !valid}
        loading={saving}
        onPress={save}
        style={styles.cta}
        testID="card-limits-save"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
});
