import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { KycStatusCard, presentKyc } from '@/components/account';
import { useSession } from '@/components/auth';
import { Banner, Button, Card, ErrorState, Screen, Skeleton, Tappable, Text } from '@/components/ui';
import { useKycData, useRefreshOnFocus } from '@/hooks';
import { Icon, type IconName } from '@/icons';
import { colors, radius } from '@/theme';
import { formatMoney } from '@/utils';

/** What activating the wallet actually unlocks, in the order it matters. */
const UNLOCKS: readonly { icon: IconName; label: string }[] = [
  { icon: 'banknote', label: 'Receive your salary into your own TPay account' },
  { icon: 'send', label: 'Send money without a restricted limit' },
  { icon: 'credit-card', label: 'Use your TPay Card' },
];

/**
 * The bridge between a new account and a usable one.
 *
 * It explains why verification exists and hands straight over to the existing
 * KYC flow — this screen owns no verification logic of its own.
 */
export default function OnboardingScreen() {
  const { signup, refreshSignup } = useSession();
  const data = useKycData();
  useRefreshOnFocus(data.reload);

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={30} width={220} cornerRadius={8} />
        <Skeleton height={92} cornerRadius={18} />
        <Skeleton height={150} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <Text variant="screenTitle">Activate your account</Text>
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const { state, limit } = data.data;
  const verified = state.status === 'VERIFIED';
  const submitted = state.status === 'SUBMITTED';
  const firstName = signup?.firstName ?? 'there';

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.headline}>
        <Text variant="eyebrowSm" color={colors.primary}>
          ALMOST THERE
        </Text>
        <Text variant="outcomeTitle" testID="onboarding-title">
          {`Welcome to TPay, ${firstName}.`}
        </Text>
        <Text variant="rowBody" color={colors.inkMuted} style={styles.lede}>
          Verify your identity to activate your TPay Wallet and receive your salary.
        </Text>
      </View>

      <KycStatusCard presentation={presentKyc(state)} testID="onboarding-kyc" />

      <Card padded={false} testID="onboarding-unlocks">
        <View style={styles.unlocks}>
          {UNLOCKS.map((unlock) => (
            <View key={unlock.label} style={styles.unlock}>
              <View style={styles.unlockIcon}>
                <Icon name={unlock.icon} size={16} color={colors.primary} />
              </View>
              <Text variant="caption" color={colors.inkSecondary} style={styles.unlockCopy}>
                {unlock.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card tone="tinted" testID="onboarding-limit">
        <Text variant="caption" color={colors.primaryDark}>
          {limit.max.minorUnits === 0
            ? 'Sending is paused until this is sorted out.'
            : `Until you are verified, transfers are capped at ${formatMoney(limit.max)}.`}
        </Text>
      </Card>

      <Banner>
        Your documents are encrypted and only used for identity verification. TPay never shares
        them with your employer.
      </Banner>

      {verified || submitted ? (
        <Button
          label="Continue"
          block
          onPress={() => router.push('/onboarding/connect')}
          style={styles.cta}
          testID="onboarding-continue"
        />
      ) : (
        <Button
          label="Verify my identity"
          block
          onPress={() => router.push('/kyc')}
          style={styles.cta}
          testID="onboarding-verify"
        />
      )}

      <Tappable
        accessibilityRole="button"
        testID="onboarding-skip"
        onPress={() => {
          void refreshSignup();
          router.push('/onboarding/connect');
        }}
        style={styles.skip}
      >
        <Text variant="action" color={colors.inkMuted}>
          I&apos;ll do this later
        </Text>
      </Tappable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingHorizontal: 24 },
  headline: { gap: 6, marginTop: 12 },
  lede: { lineHeight: 20 },
  unlocks: { padding: 16, gap: 12 },
  unlock: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  unlockIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockCopy: { flex: 1, lineHeight: 17 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
  skip: { alignItems: 'center', paddingVertical: 12 },
});
