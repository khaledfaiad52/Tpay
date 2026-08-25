import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AuthHeader, useSession } from '@/components/auth';
import { Checkbox } from '@/components/send';
import { Button, Card, Screen, Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import {
  BiometricUnavailableError,
  InvalidCredentialsError,
  services,
  TooManyAttemptsError,
} from '@/services';
import { deviceBiometricAuthenticator } from '@/services/device';
import type { BiometricCapability } from '@/types';
import { colors, fonts, inputReset, radius } from '@/theme';

/**
 * Sign in.
 *
 * Nothing here decides whether the app is signed in — it hands credentials to
 * the session service and the root guard does the rest.
 */
export default function LoginScreen() {
  const { expired } = useLocalSearchParams<{ expired?: string }>();
  const session = useSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [biometrics, setBiometrics] = useState<BiometricCapability>();
  const [biometricOffered, setBiometricOffered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      deviceBiometricAuthenticator.getCapability(),
      services.session.isBiometricUnlockAvailable(),
    ]).then(([capability, enabled]) => {
      if (cancelled) return;
      setBiometrics(capability);
      // Offered only when the device can actually do it AND the user turned
      // it on here. Either half missing and the button would promise
      // something that cannot work.
      setBiometricOffered(capability.available && enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = identifier.trim() !== '' && password !== '';

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const outcome = await session.signIn({
        identifier: identifier.trim(),
        password,
        rememberDevice,
      });
      if (outcome.kind === 'otp-required') {
        // Two-factor is on and this device is not trusted yet.
        router.push({
          pathname: '/(auth)/verify',
          params: { challengeId: outcome.challenge.id, flow: 'login' },
        });
      }
      // Otherwise the guard sends the user on; this screen does not navigate.
    } catch (cause) {
      if (cause instanceof InvalidCredentialsError || cause instanceof TooManyAttemptsError) {
        setError(cause.message);
      } else {
        setError("We couldn't reach TPay. Check your connection and try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const unlockWithBiometrics = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const { token } = await deviceBiometricAuthenticator.authenticate('Log in to TPay');
      await session.signInWithBiometrics(token);
    } catch (cause) {
      setError(
        cause instanceof BiometricUnavailableError || cause instanceof InvalidCredentialsError
          ? cause.message
          : 'That did not work. Use your password instead.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.body}>
        <AuthHeader />

        <View style={styles.headline}>
          <Text variant="screenTitle">Welcome back</Text>
          <Text variant="rowBody" color={colors.inkMuted}>
            Your salary, your money, your benefits — in one place.
          </Text>
        </View>

        {expired ? (
          <Card tone="gold" testID="login-expired">
            <Text variant="caption" color={colors.warningText}>
              Your session has expired. Log in again to pick up where you left off.
            </Text>
          </Card>
        ) : null}

        <View style={styles.fields}>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Email or phone number"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            accessibilityLabel="Email or phone number"
            testID="login-identifier"
            style={styles.input}
          />
          <View style={styles.passwordBox}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showPassword}
              accessibilityLabel="Password"
              testID="login-password"
              style={styles.passwordInput}
            />
            <Tappable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              testID="login-toggle-password"
              onPress={() => setShowPassword((current) => !current)}
              style={styles.showButton}
            >
              <Text variant="action" color={colors.primary}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </Tappable>
          </View>
        </View>

        <View style={styles.options}>
          <Checkbox
            label="Remember this device"
            checked={rememberDevice}
            onChange={setRememberDevice}
            testID="login-remember"
          />
          <Tappable
            accessibilityRole="link"
            testID="login-forgot"
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgot}
          >
            <Text variant="action" color={colors.primary}>
              Forgot password?
            </Text>
          </Tappable>
        </View>

        {error ? (
          <Card tone="danger" testID="login-error">
            <Text variant="caption" color={colors.dangerText}>
              {error}
            </Text>
          </Card>
        ) : null}

        <Button
          label="Log in"
          block
          disabled={!ready}
          loading={busy || session.status === 'AUTHENTICATING'}
          onPress={submit}
          style={styles.cta}
          testID="login-submit"
        />

        {biometricOffered ? (
          <Tappable
            accessibilityRole="button"
            testID="login-biometrics"
            disabled={busy}
            onPress={unlockWithBiometrics}
            style={styles.biometric}
          >
            <Icon name="face-scan" size={22} color={colors.primary} />
            <Text variant="label" color={colors.primary}>
              {`Log in with ${biometrics?.label ?? 'Face ID'}`}
            </Text>
          </Tappable>
        ) : biometrics && !biometrics.available ? (
          <Text variant="captionSm" color={colors.inkFaint} style={styles.biometricNote}>
            {biometrics.unavailableReason}
          </Text>
        ) : null}
      </View>

      <Tappable
        accessibilityRole="link"
        testID="login-create-account"
        onPress={() => router.push('/(auth)/signup')}
        style={styles.footer}
      >
        <Text variant="body" color={colors.inkMuted}>
          New to TPay?{' '}
          <Text variant="label" color={colors.primary}>
            Create an account
          </Text>
        </Text>
      </Tappable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'space-between', gap: 24, paddingHorizontal: 24 },
  body: { gap: 12, marginTop: 20 },
  headline: { gap: 6, marginTop: 4, marginBottom: 4 },
  fields: { gap: 11 },
  input: {
    ...inputReset,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 15,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  passwordBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingLeft: 15,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    ...inputReset,
    flex: 1,
    paddingVertical: 15,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  showButton: { paddingVertical: 8, paddingLeft: 10 },
  options: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  forgot: { paddingVertical: 6, paddingLeft: 12 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
  biometric: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  biometricNote: { textAlign: 'center', lineHeight: 16, paddingHorizontal: 8, paddingTop: 6 },
  footer: { alignItems: 'center', paddingVertical: 8 },
});
