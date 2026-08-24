import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { DepositMethodRow, HowToDeposit, type DepositMethod } from '@/components/wallet';
import {
  Card,
  CopyRow,
  ErrorState,
  Eyebrow,
  FadeInUp,
  Screen,
  Skeleton,
  useToast,
} from '@/components/ui';
import { useAddMoneyData } from '@/hooks';
import { formatShortDate } from '@/utils';

/** Ways money can reach the wallet. Ordered as the approved screen shows them. */
const METHODS: readonly DepositMethod[] = [
  {
    id: 'bank-transfer',
    title: 'Bank transfer',
    subtitle: 'Free · same day',
    icon: 'landmark',
    tone: 'primary',
  },
  {
    id: 'card-topup',
    title: 'Debit card top-up',
    subtitle: 'Instant · 1.2% fee',
    icon: 'credit-card',
    tone: 'neutral',
  },
];

export default function AddMoneyScreen() {
  const data = useAddMoneyData();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<string>('bank-transfer');

  const copy = async (value: string, label = 'Copied to clipboard') => {
    await Clipboard.setStringAsync(value);
    showToast(label);
  };

  if (data.status === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="Add money" />
        <Skeleton height={72} />
        <Skeleton height={72} />
        <Skeleton height={72} />
        <Skeleton height={200} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Add money" />
        <ErrorState
          title="We couldn't load your deposit details"
          description="Check your connection and try again."
          onRetry={data.reload}
        />
      </Screen>
    );
  }

  const { details, nextSalary } = data.data;

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Add money" />

      <View style={styles.methods}>
        {METHODS.map((method) => (
          <DepositMethodRow
            key={method.id}
            method={method}
            selected={method.id === selected}
            onPress={() => {
              setSelected(method.id);
              if (method.id === 'card-topup') {
                showToast('Debit card top-up arrives with the card release');
              }
            }}
          />
        ))}
        {nextSalary ? (
          <DepositMethodRow
            method={{
              id: 'salary',
              title: `Salary from ${nextSalary.employerName}`,
              subtitle: `Automatic on ${formatShortDate(nextSalary.payDate)}`,
              icon: 'banknote',
              tone: 'gold',
            }}
            selected={false}
            onPress={() => router.push('/salary')}
          />
        ) : null}
      </View>

      <Eyebrow label="Send to these details" />

      <FadeInUp>
        <Card padded={false}>
          {details.fields.slice(0, 4).map((field, index, shown) => (
            <CopyRow
              key={field.label}
              label={field.label}
              value={field.value}
              monospaced={field.monospaced}
              onCopy={copy}
              divided={index < shown.length - 1}
            />
          ))}
        </Card>
      </FadeInUp>

      <HowToDeposit />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  methods: { gap: 10 },
});
