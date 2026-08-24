import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthHeader } from '@/components/auth';
import { FormField } from '@/components/send';
import { Banner, Button, Card, Screen, Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import { services } from '@/services';
import { colors, radius } from '@/theme';

/**
 * Ask for a reset code.
 *
 * The answer is deliberately the same whether or not the account exists —
 * confirming which addresses are registered is a way of enumerating users.
 */
export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const ready = identifier.trim() !== '';

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const challenge = await services.session.requestPasswordReset(identifier.trim());
      router.push({
        pathname: '/(auth)/verify',
        params: { challengeId: challenge.id, flow: 'reset' },
      });
    } catch {
      setError("We couldn't send a code just now. Try again in a moment.");
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
          testID="forgot-back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          style={styles.back}
        >
          <Icon name="arrow-left" size={18} color={colors.ink} />
        </Tappable>
      </View>

      <AuthHeader showTagline={false} />

      <View style={styles.headline}>
        <Text variant="outcomeTitle">Reset your password</Text>
        <Text variant="rowBody" color={colors.inkMuted} style={styles.lede}>
          Enter the email or phone number on your TPay account and we will send you a code.
        </Text>
      </View>

      <FormField
        label="Email or phone number"
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="you@company.com"
        autoCapitalize="none"
        testID="forgot-identifier"
      />

      {error ? (
        <Card tone="danger" testID="forgot-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Banner>
        We will send a code whether or not that address has an account, so nobody can use this
        screen to find out who banks with TPay.
      </Banner>

      <Button
        label="Send reset code"
        block
        disabled={!ready}
        loading={busy}
        onPress={submit}
        style={styles.cta}
        testID="forgot-submit"
      />

      <Tappable
        accessibilityRole="link"
        testID="forgot-back-to-login"
        onPress={() => router.replace('/(auth)/login')}
        style={styles.footer}
      >
        <Text variant="action" color={colors.primary}>
          Back to log in
        </Text>
      </Tappable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center' },
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
  headline: { gap: 6, marginTop: 4 },
  lede: { lineHeight: 20 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
  footer: { alignItems: 'center', paddingVertical: 10 },
});
