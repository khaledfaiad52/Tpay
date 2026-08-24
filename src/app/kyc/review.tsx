import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { KycStatusCard, presentKyc } from '@/components/account';
import { ScreenHeader } from '@/components/navigation';
import {
  Banner,
  Button,
  Card,
  DetailRow,
  ErrorState,
  Eyebrow,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { useKycData } from '@/hooks';
import { services } from '@/services';
import { colors, radius } from '@/theme';
import { formatMoney } from '@/utils';

/** The last step: check what is being sent, then hand it to the reviewer. */
export default function KycReviewScreen() {
  const data = useKycData();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={40} width={200} cornerRadius={radius.lg} />
        <Skeleton height={140} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Submit for review" />
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const { state, steps, limit } = data.data;
  const submitted = state.status === 'SUBMITTED' || state.status === 'VERIFIED';
  const outstanding = steps.filter(
    (step) => step.status !== 'done' && step.status !== 'not-required',
  );

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      await services.kyc.submitForReview();
      data.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't submit your verification.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title={submitted ? 'Verification' : 'Submit for review'} />

      <KycStatusCard presentation={presentKyc(state)} testID="kyc-review-status" />

      <Eyebrow label="What we are sending" />
      <Card padded={false}>
        {steps.map((step, index) => (
          <DetailRow
            key={step.id}
            label={step.title}
            value={
              step.status === 'done'
                ? 'Ready'
                : step.status === 'not-required'
                  ? 'Not needed'
                  : 'Still needed'
            }
            valueColor={step.status === 'done' ? colors.success : colors.inkMuted}
            divided={index < steps.length - 1}
          />
        ))}
      </Card>

      <Card padded={false} testID="kyc-review-limit">
        <DetailRow
          label="Transfer limit today"
          value={limit.max.minorUnits === 0 ? 'Paused' : formatMoney(limit.max)}
        />
      </Card>

      {outstanding.length > 0 ? (
        <Card tone="gold" testID="kyc-review-outstanding">
          <Text variant="caption" color={colors.warningText}>
            {outstanding[0]!.title} is still needed before this can be reviewed.
          </Text>
        </Card>
      ) : null}

      {error ? (
        <Card tone="danger" testID="kyc-review-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Banner>
        Most checks finish in under five minutes. You can keep using TPay while it runs — your
        limits lift as soon as it clears.
      </Banner>

      {submitted ? (
        <Button
          label="Done"
          block
          variant="secondary"
          onPress={() => router.dismissAll()}
          style={styles.cta}
          testID="kyc-review-done"
        />
      ) : (
        <Button
          label="Submit for review"
          block
          disabled={outstanding.length > 0}
          loading={submitting}
          onPress={submit}
          style={styles.cta}
          testID="kyc-review-submit"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
});
