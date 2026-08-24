import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthHeader, StepRail, useSession } from '@/components/auth';
import { FormField } from '@/components/send';
import { Button, Card, Screen, Tappable, Text } from '@/components/ui';
import { usePasswordPolicy } from '@/hooks';
import { Icon } from '@/icons';
import { meetsRequirement, PasswordRejectedError, services } from '@/services';
import { colors, radius } from '@/theme';

/** The six steps a new account passes, as the approved flow numbers them. */
const TOTAL_STEPS = 6;

/**
 * Step 1 of signup: who you are and how to reach you.
 *
 * The password rules come from `securityService.getPasswordPolicy()` — the
 * same source the Security screen uses — so signup cannot accept a password
 * the app would later reject.
 */
export default function SignupScreen() {
  const policy = usePasswordPolicy();
  const session = useSession();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    // Landing here means starting over, so no half-finished signup lingers.
    void services.session.getSignupState();
  }, []);

  const requirements = policy.data?.requirements ?? [];
  const metCount = policy.data
    ? requirements.filter((requirement) =>
        meetsRequirement(requirement.id, password, policy.data),
      ).length
    : 0;
  const passwordOk = policy.data !== undefined && metCount === requirements.length;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneOk = phone.replace(/\D/g, '').length >= 8;
  const ready =
    firstName.trim() !== '' && lastName.trim() !== '' && emailOk && phoneOk && passwordOk;

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await session.startSignup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      const state = await services.session.getSignupState();
      router.push({
        pathname: '/(auth)/verify',
        params: { challengeId: state?.challenge?.id ?? '', step: '2' },
      });
    } catch (cause) {
      setError(
        cause instanceof PasswordRejectedError
          ? cause.message
          : "We couldn't start that signup. Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Tappable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="signup-back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
          style={styles.back}
        >
          <Icon name="arrow-left" size={18} color={colors.ink} />
        </Tappable>
        <StepRail step={1} totalSteps={TOTAL_STEPS} />
      </View>

      <View style={styles.headline}>
        <Text variant="eyebrowSm" color={colors.primary}>
          STEP 1 OF {TOTAL_STEPS}
        </Text>
        <Text variant="outcomeTitle">Create your account</Text>
        <Text variant="rowBody" color={colors.inkMuted}>
          Takes about 4 minutes. You can pause anytime.
        </Text>
      </View>

      <View style={styles.names}>
        <View style={styles.nameField}>
          <FormField
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Khaled"
            testID="signup-first-name"
          />
        </View>
        <View style={styles.nameField}>
          <FormField
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Faiad"
            testID="signup-last-name"
          />
        </View>
      </View>

      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@company.com"
        autoCapitalize="none"
        error={email !== '' && !emailOk ? 'Enter a full email address.' : undefined}
        testID="signup-email"
      />
      <FormField
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        placeholder="+966 55 000 0000"
        keyboardType="phone-pad"
        autoCapitalize="none"
        error={phone !== '' && !phoneOk ? 'Enter a full phone number.' : undefined}
        testID="signup-phone"
      />
      <FormField
        label="Create password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 10 characters"
        autoCapitalize="none"
        secureTextEntry
        testID="signup-password"
      />

      <View style={styles.strengthRail} testID="signup-password-strength">
        {requirements.map((requirement, index) => (
          <View
            key={requirement.id}
            style={[styles.strengthSegment, index < metCount ? styles.strengthMet : styles.strengthTodo]}
          />
        ))}
      </View>
      <Text variant="captionSm" color={passwordOk ? colors.success : colors.inkMuted}>
        {password === ''
          ? requirements.map((requirement) => requirement.label).join(' · ')
          : passwordOk
            ? 'Strong enough — that meets every rule.'
            : (requirements.find(
                (requirement) =>
                  policy.data !== undefined &&
                  !meetsRequirement(requirement.id, password, policy.data),
              )?.label ?? '')}
      </Text>

      {error ? (
        <Card tone="danger" testID="signup-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Button
        label="Continue"
        block
        disabled={!ready}
        loading={busy}
        onPress={submit}
        style={styles.cta}
        testID="signup-submit"
      />

      <Text variant="captionSm" color={colors.inkFaint} style={styles.legal}>
        By continuing you agree to TPay&apos;s Terms and Privacy Policy.
      </Text>

      <View style={styles.lockup}>
        <AuthHeader showTagline={false} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 13, paddingHorizontal: 24 },
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
  headline: { gap: 6, marginTop: 6 },
  names: { flexDirection: 'row', gap: 10 },
  nameField: { flex: 1 },
  strengthRail: { flexDirection: 'row', gap: 5, paddingHorizontal: 2 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthMet: { backgroundColor: colors.success },
  strengthTodo: { backgroundColor: colors.border },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
  legal: { textAlign: 'center', lineHeight: 16 },
  lockup: { alignItems: 'center', opacity: 0.6, marginTop: 4 },
});
