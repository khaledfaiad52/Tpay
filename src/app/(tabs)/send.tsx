import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { KycStatusCard, presentKyc } from '@/components/account';
import {
  RecentRecipients,
  SendMethodRow,
  useSendFlow,
  type SendMethod,
} from '@/components/send';
import {
  ErrorState,
  Eyebrow,
  FadeInUp,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { useRefreshOnFocus, useSendHubData } from '@/hooks';
import type { Recipient, RecipientKind } from '@/services';
import { colors } from '@/theme';
import { formatMoney } from '@/utils';

/**
 * Every way to address a recipient, in the order the approved screen lists
 * them. They all lead into the same Send Money flow — TPay has no separate
 * remittance product.
 */
const METHODS: readonly SendMethod[] = [
  {
    kind: 'bank-account',
    title: 'Bank account',
    subtitle: 'Local or international bank · 1–2 days',
    icon: 'landmark',
  },
  {
    kind: 'tpay-user',
    title: 'TPay user',
    subtitle: 'Instant · @username, phone or contacts',
    icon: 'user',
  },
  {
    kind: 'international',
    title: 'International transfer',
    subtitle: '38 countries · live FX rate',
    icon: 'globe',
  },
  {
    kind: 'mobile-wallet',
    title: 'Mobile wallet',
    subtitle: 'Vodafone Cash, STC Pay and 20 more · minutes',
    icon: 'smartphone',
  },
];

export default function SendScreen() {
  const hub = useSendHubData();
  useRefreshOnFocus(hub.reload);
  const flow = useSendFlow();

  const startWith = (kind: RecipientKind) => {
    if (hub.status !== 'success') return;
    flow.start(kind);
    flow.chooseSourceAccount(hub.data.primary);
    router.push('/send/recipient');
  };

  const sendTo = (recipient: Recipient) => {
    if (hub.status !== 'success') return;
    flow.chooseRecipient(recipient);
    flow.chooseSourceAccount(hub.data.primary);
    router.push('/send/amount');
  };

  if (hub.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={30} width={160} cornerRadius={8} />
        <Skeleton height={76} />
        <Skeleton height={76} />
        <Skeleton height={76} />
        <Skeleton height={76} />
      </Screen>
    );
  }

  if (hub.status === 'error') {
    return (
      <Screen>
        <Text variant="screenTitle">Send money</Text>
        <ErrorState
          title="We couldn't open Send"
          description="Check your connection and try again."
          onRetry={hub.reload}
        />
      </Screen>
    );
  }

  const { primary, recipients, kyc, limit } = hub.data;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.heading}>
        <Text variant="screenTitle">Send money</Text>
        <Text variant="rowBody" color={colors.inkMuted} numeric>
          {`From your TPay balance · ${formatMoney(primary.balance)} available`}
        </Text>
      </View>

      {kyc.status === 'VERIFIED' ? null : (
        <KycStatusCard
          presentation={{
            ...presentKyc(kyc),
            detail:
              limit.max.minorUnits === 0
                ? 'Sending is paused while TPay reviews your account.'
                : `Your current verification level has a transfer limit of ${formatMoney(limit.max)} per transfer.`,
          }}
          onPress={() => router.push('/kyc')}
          testID="send-kyc-limit"
        />
      )}

      <FadeInUp>
        <View style={styles.methods}>
          {METHODS.map((method) => (
            <SendMethodRow key={method.kind} method={method} onPress={startWith} />
          ))}
        </View>
      </FadeInUp>

      <FadeInUp delay={60}>
        <View style={styles.recents}>
          <Eyebrow label="Recent recipients" />
          <RecentRecipients
            recipients={recipients}
            onSelect={sendTo}
            onNew={() => startWith('bank-account')}
          />
        </View>
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18 },
  heading: { gap: 6 },
  methods: { gap: 10 },
  recents: { gap: 12 },
});
