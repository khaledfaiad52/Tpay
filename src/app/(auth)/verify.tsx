import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OtpField, StepRail, useSession } from '@/components/auth';
import { Button, Card, Screen, Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import {
  OtpExpiredError,
  OtpInvalidError,
  services,
  TooManyAttemptsError,
} from '@/services';
import type { OtpChallenge, SignupStage } from '@/types';
import { colors, radius } from '@/theme';

const TOTAL_STEPS = 6;

/** What the screen says, per signup stage. */
const STAGE_COPY: Partial<Record<SignupStage, { title: string; step: number }>> = {
  'verify-email': { title: 'Verify your email', step: 2 },
  'verify-phone': { title: 'Verify your phone', step: 3 },
};

/**
 * One-time code entry, shared by signup, sign-in and password reset.
 *
 * There is no SMS provider: the mock accepts one fixed code. The screen never
 * says a message was really sent to a network.
 */
export default function VerifyScreen() {
  const params = useLocalSearchParams<{ challengeId?: string; step?: string; flow?: string }>();
  const session = useSession();
  const [challenge, setChallenge] = useState<OtpChallenge>();
  const [stage, setStage] = useState<SignupStage>('verify-email');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const isReset = params.flow === 'reset';

  useEffect(() => {
    let cancelled = false;
    services.session.getSignupState().then((state) => {
      if (cancelled || !state) return;
      setStage(state.stage);
      if (state.challenge) setChallenge(state.challenge);
    });
    return () => {
      cancelled = true;
    };
  }, [params.challengeId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const challengeId = challenge?.id ?? params.challengeId ?? '';
  const resendIn = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000))
    : 0;
  const copy = STAGE_COPY[stage] ?? { title: 'Verify your identity', step: 2 };
  const title = isReset ? 'Check your email' : copy.title;

  const submit = useCallback(async () => {
    if (challengeId === '') return;
    setBusy(true);
    setError(undefined);
    setExpired(false);
    try {
      if (isReset) {
        // The reset flow needs the code and the new password together, so it
        // carries the verified code on to the next screen rather than
        // spending it here.
        await services.session.verifyOtp(challengeId, code);
        router.replace({
          pathname: '/(auth)/reset-password',
          params: { challengeId, code },
        });
        return;
      }

      const next = await services.session.advanceSignup(challengeId, code);
      setCode('');
      setStage(next.stage);
      setChallenge(next.challenge);

      if (next.stage === 'identity') {
        // Account created. The guard moves the new session into onboarding,
        // where the existing KYC flow takes over — there is no second
        // verification implementation.
        await session.completeSignup();
      }
    } catch (cause) {
      if (cause instanceof OtpExpiredError) {
        setExpired(true);
        setError(cause.message);
      } else if (cause instanceof OtpInvalidError || cause instanceof TooManyAttemptsError) {
        setError(cause.message);
      } else {
        setError("We couldn't check that code. Try again in a moment.");
      }
      setCode('');
    } finally {
      setBusy(false);
    }
  }, [challengeId, code, isReset, session]);

  const resend = async () => {
    setBusy(true);
    setError(undefined);
    try {
      setChallenge(await services.session.resendOtp(challengeId));
      setExpired(false);
      setCode('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't send another code.");
    } finally {
      setBusy(false);
    }
  };

  const length = challenge?.length ?? 6;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Tappable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="verify-back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
          style={styles.back}
        >
          <Icon name="arrow-left" size={18} color={colors.ink} />
        </Tappable>
        {isReset ? <View style={styles.spacer} /> : <StepRail step={copy.step} totalSteps={TOTAL_STEPS} />}
      </View>

      <View style={styles.headline}>
        {isReset ? null : (
          <Text variant="eyebrowSm" color={colors.primary}>
            STEP {copy.step} OF {TOTAL_STEPS}
          </Text>
        )}
        <Text variant="outcomeTitle" testID="verify-title">
          {title}
        </Text>
        <Text variant="rowBody" color={colors.inkMuted} numeric>
          {challenge
            ? `We sent a ${length}-digit code to ${challenge.destination}`
            : 'Enter the code we sent you.'}
        </Text>
      </View>

      <OtpField
        value={code}
        onChangeText={setCode}
        length={length}
        invalid={error !== undefined}
        testID="verify-code"
      />

      <View style={styles.meta}>
        <Text variant="caption" color={colors.inkMuted} numeric>
          {resendIn > 0 ? (
            <>
              Resend code in{' '}
              <Text variant="label" numeric>
                {`0:${String(resendIn).padStart(2, '0')}`}
              </Text>
            </>
          ) : (
            'You can send another code now'
          )}
        </Text>
        <Tappable
          accessibilityRole="button"
          testID="verify-resend"
          disabled={resendIn > 0 || busy}
          onPress={resend}
          style={styles.resend}
        >
          <Text variant="action" color={resendIn > 0 ? colors.inkFaint : colors.primary}>
            Resend code
          </Text>
        </Tappable>
      </View>

      {error ? (
        <Card tone="danger" testID="verify-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Card tone="tinted" testID="verify-demo-hint">
        <Text variant="caption" color={colors.primaryDark}>
          No SMS or email provider is connected yet, so nothing was actually sent. Use the demo
          code 419204 to continue.
        </Text>
      </Card>

      <Button
        label={expired ? 'Send a new code' : 'Verify'}
        block
        disabled={!expired && code.length < length}
        loading={busy}
        onPress={expired ? resend : submit}
        style={styles.cta}
        testID="verify-submit"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { flex: 1 },
  headline: { gap: 6, marginTop: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resend: { paddingVertical: 6, paddingLeft: 12 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
});
