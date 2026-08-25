import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { KycDemoControls, KycStatusCard, KycStepRow, presentKyc } from '@/components/account';
import { ScreenHeader } from '@/components/navigation';
import {
  Banner,
  Button,
  Card,
  ErrorState,
  Eyebrow,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { useKycData, useRefreshOnFocus } from '@/hooks';
import { colors, radius } from '@/theme';
import type { KycStep, KycStepId } from '@/services';
import { formatMoney } from '@/utils';

/** Where each step is filled in. */
const STEP_ROUTES: Record<KycStepId, '/kyc/personal' | '/kyc/document'> = {
  'personal-information': '/kyc/personal',
  'identity-document': '/kyc/document',
  // Proof of address is only ever asked for after a review, and is supplied
  // through the document step.
  'proof-of-address': '/kyc/document',
};

/**
 * Identity verification: where it stands, what is left, and what the current
 * level means for how much can be sent.
 */
export default function KycScreen() {
  const data = useKycData();
  useRefreshOnFocus(data.reload);

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={40} width={200} cornerRadius={radius.lg} />
        <Skeleton height={90} cornerRadius={18} />
        <Skeleton height={80} cornerRadius={radius.card} />
        <Skeleton height={80} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Identity verification" />
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const { state, steps, limit } = data.data;
  const presentation = presentKyc(state);
  const outstanding = steps.filter((step) => step.status !== 'not-required');
  const doneCount = outstanding.filter((step) => step.status === 'done').length;
  const active = outstanding.find((step) => step.status !== 'done');
  // A blocked account is never offered "submit" — support is its only route.
  const canVerify = presentation.action?.target === 'verify';
  const readyToSubmit = canVerify && !active;

  const openStep = (step: KycStep) => router.push(STEP_ROUTES[step.id]);

  const takeAction = () => {
    if (presentation.action?.target === 'support') {
      router.push({
        pathname: '/support/new',
        params: { topic: 'account', subject: 'Identity verification' },
      });
      return;
    }
    if (readyToSubmit) {
      router.push('/kyc/review');
      return;
    }
    if (active) openStep(active);
    else router.push('/kyc/review');
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Identity verification" />

      <View style={styles.progress} accessibilityLabel={`Step ${doneCount} of ${outstanding.length}`}>
        {outstanding.map((step, index) => (
          <View
            key={step.id}
            style={[styles.segment, index < doneCount ? styles.segmentDone : styles.segmentTodo]}
          />
        ))}
      </View>

      <KycStatusCard presentation={presentation} testID="kyc-status" />

      {state.status === 'VERIFIED' ? null : (
        <Eyebrow label={`Step ${Math.min(doneCount + 1, outstanding.length)} of ${outstanding.length}`} />
      )}

      {steps.map((step, index) => (
        <KycStepRow
          key={step.id}
          step={step}
          position={index + 1}
          active={active?.id === step.id}
          onPress={
            step.status === 'done' || step.status === 'not-required' || state.status === 'SUBMITTED'
              ? undefined
              : () => openStep(step)
          }
          testID={`kyc-step-${step.id}`}
        />
      ))}

      <Eyebrow label="What this means today" />
      <Card padded={false} testID="kyc-limit">
        <View style={styles.limit}>
          <Text variant="label">
            {limit.max.minorUnits === 0
              ? 'Sending is paused'
              : `Transfer limit ${formatMoney(limit.max)}`}
          </Text>
          <Text variant="captionSm" color={colors.inkMuted} style={styles.limitCopy}>
            {limit.max.minorUnits === 0
              ? 'No transfers can be sent while your account is under review.'
              : `Your current verification level has a transfer limit of ${formatMoney(limit.max)} per transfer.`}
          </Text>
          {limit.action ? (
            <Text variant="captionSm" color={colors.primary}>
              {limit.action.kind === 'verify-identity'
                ? 'Complete identity verification to increase your limits.'
                : 'TPay Support can tell you what happens next.'}
            </Text>
          ) : null}
        </View>
      </Card>

      <Banner>
        Your documents are encrypted and only used for identity verification. TPay never shares
        them with your employer.
      </Banner>

      {presentation.action ? (
        <Button
          label={readyToSubmit ? 'Submit for review' : presentation.action.label}
          block
          onPress={takeAction}
          style={styles.cta}
          testID="kyc-action"
        />
      ) : null}

      <KycDemoControls onApplied={data.reload} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  progress: { flexDirection: 'row', gap: 5, marginTop: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  segmentDone: { backgroundColor: colors.primary },
  segmentTodo: { backgroundColor: colors.border },
  limit: { padding: 16, gap: 4 },
  limitCopy: { lineHeight: 16 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
});
