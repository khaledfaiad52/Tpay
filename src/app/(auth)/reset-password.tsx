import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthHeader, useSession } from '@/components/auth';
import { FormField } from '@/components/send';
import { Button, Card, Screen, Skeleton, Text } from '@/components/ui';
import { usePasswordPolicy } from '@/hooks';
import { Icon } from '@/icons';
import {
  meetsRequirement,
  OtpExpiredError,
  PasswordRejectedError,
  services,
} from '@/services';
import { colors, radius } from '@/theme';

/**
 * Choose a new password.
 *
 * The rules come from `securityService.getPasswordPolicy()` — the same source
 * the Security screen and signup use. Nothing here restates them.
 */
export default function ResetPasswordScreen() {
  const { challengeId, code } = useLocalSearchParams<{ challengeId?: string; code?: string }>();
  const policy = usePasswordPolicy();
  const session = useSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const requirements = policy.data?.requirements ?? [];
  const rulesMet =
    policy.data !== undefined &&
    requirements.every((requirement) =>
      meetsRequirement(requirement.id, password, policy.data),
    );
  const mismatch = confirm !== '' && confirm !== password;
  const ready = rulesMet && confirm === password && challengeId !== undefined;

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await services.session.resetPassword(challengeId!, code ?? '', password);
      // The reset signs the user in, so the guard takes it from here.
      await session.refresh();
    } catch (cause) {
      if (cause instanceof PasswordRejectedError || cause instanceof OtpExpiredError) {
        setError(cause.message);
      } else {
        setError("We couldn't change your password. Start again from the login screen.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <AuthHeader showTagline={false} />

      <View style={styles.headline}>
        <Text variant="outcomeTitle">Choose a new password</Text>
        <Text variant="rowBody" color={colors.inkMuted}>
          You will be signed in on this device once it is saved.
        </Text>
      </View>

      <FormField
        label="New password"
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        secureTextEntry
        placeholder="At least 10 characters"
        testID="reset-password"
      />
      <FormField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="none"
        secureTextEntry
        placeholder="Type it again"
        error={mismatch ? 'Those two do not match.' : undefined}
        testID="reset-confirm"
      />

      {policy.status === 'loading' ? (
        <Skeleton height={72} cornerRadius={radius.card} />
      ) : (
        <Card padded={false} testID="reset-rules">
          <View style={styles.rules}>
            {requirements.map((requirement) => {
              const met =
                policy.data !== undefined &&
                meetsRequirement(requirement.id, password, policy.data);
              return (
                <View key={requirement.id} style={styles.rule}>
                  <Icon
                    name={met ? 'check' : 'chevron-right'}
                    size={14}
                    color={met ? colors.success : colors.inkFaint}
                    strokeWidth={met ? 2.6 : 1.9}
                  />
                  <Text variant="caption" color={met ? colors.success : colors.inkMuted}>
                    {requirement.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {error ? (
        <Card tone="danger" testID="reset-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Button
        label="Save and log in"
        block
        disabled={!ready}
        loading={busy}
        onPress={submit}
        style={styles.cta}
        testID="reset-submit"
      />

      <Text
        variant="action"
        color={colors.primary}
        style={styles.footer}
        onPress={() => router.replace('/(auth)/login')}
      >
        Back to log in
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingHorizontal: 24 },
  headline: { gap: 6, marginTop: 4 },
  rules: { padding: 16, gap: 8 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
  footer: { textAlign: 'center', paddingVertical: 10 },
});
