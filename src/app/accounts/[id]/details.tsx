import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import {
  Banner,
  Button,
  Card,
  CopyRow,
  ErrorState,
  FadeInUp,
  Screen,
  Skeleton,
  useToast,
} from '@/components/ui';
import { formatAccountDetails } from '@/components/money';
import { useAccountDetails } from '@/hooks';
import { radius } from '@/theme';

/** The coordinates a user shares to receive money into a TPay account. */
export default function AccountDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const details = useAccountDetails(id);
  const { showToast } = useToast();

  const copy = async (value: string, label = 'Copied to clipboard') => {
    await Clipboard.setStringAsync(value);
    showToast(label);
  };

  if (details.status === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="Account details" />
        <Skeleton height={64} cornerRadius={16} />
        <Skeleton height={330} />
        <Skeleton height={52} cornerRadius={radius.xl} />
      </Screen>
    );
  }

  if (details.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Account details" />
        <ErrorState
          title="We couldn't load these details"
          description="Check your connection and try again."
          onRetry={details.reload}
        />
      </Screen>
    );
  }

  const { account, details: data } = details.data;

  return (
    <Screen>
      <ScreenHeader title="Account details" />

      <Banner>
        {`Share these details to receive salary, client payments or transfers in ${account.currency}.`}
      </Banner>

      <FadeInUp>
        <Card padded={false}>
          {data.fields.map((field) => (
            <CopyRow
              key={field.label}
              label={field.label}
              value={field.value}
              monospaced={field.monospaced}
              onCopy={copy}
              divided
            />
          ))}
          <CopyRow label="Bank" value={data.bankName} footnote={data.bankAddress} />
        </Card>
      </FadeInUp>

      <View style={styles.actions}>
        <Button
          label="Share details"
          block
          style={styles.action}
          onPress={() => copy(formatAccountDetails(data), 'Details copied — paste them anywhere')}
        />
        <Button
          label="Copy all"
          variant="secondary"
          block
          style={styles.action}
          onPress={() => copy(formatAccountDetails(data), 'All details copied')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, paddingVertical: 15 },
});
