import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { FormField } from '@/components/send';
import { Banner, Button, Card, Screen, Skeleton, Text, useToast } from '@/components/ui';
import { usePasswordPolicy } from '@/hooks';
import { Icon } from '@/icons';
import { meetsRequirement, PasswordRejectedError, services } from '@/services';
import type { PasswordProblem } from '@/services';
import { colors, radius } from '@/theme';

/** Which field a rejection belongs under. */
const PROBLEM_FIELD: Record<PasswordProblem, 'current' | 'next'> = {
  'current-incorrect': 'current',
  'too-short': 'next',
  'too-simple': 'next',
  'same-as-current': 'next',
};

/**
 * Change the password.
 *
 * The rules come from `securityService.getPasswordPolicy()` and are judged by
 * the same `meetsRequirement` the adapter uses, so this screen never restates
 * the policy and cannot drift from it.
 */
export default function ChangePasswordScreen() {
  const policy = usePasswordPolicy();
  const { showToast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<{ field: 'current' | 'next'; message: string }>();

  const requirements = policy.data?.requirements ?? [];
  const mismatch = confirm !== '' && confirm !== next;
  const rulesMet =
    policy.data !== undefined &&
    requirements.every((requirement) => meetsRequirement(requirement.id, next, policy.data));
  const ready = current !== '' && rulesMet && confirm === next;

  const save = async () => {
    setSaving(true);
    setProblem(undefined);
    try {
      await services.security.changePassword({ currentPassword: current, newPassword: next });
      showToast('Password updated');
      router.back();
    } catch (cause) {
      if (cause instanceof PasswordRejectedError) {
        setProblem({ field: PROBLEM_FIELD[cause.problem], message: cause.message });
      } else {
        setProblem({ field: 'next', message: "We couldn't change your password. Try again." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Change password" />

      <FormField
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        autoCapitalize="none"
        secureTextEntry
        placeholder="Your current password"
        error={problem?.field === 'current' ? problem.message : undefined}
        testID="password-current"
      />
      <FormField
        label="New password"
        value={next}
        onChangeText={setNext}
        autoCapitalize="none"
        secureTextEntry
        placeholder="Choose a new password"
        error={problem?.field === 'next' ? problem.message : undefined}
        testID="password-new"
      />
      <FormField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="none"
        secureTextEntry
        placeholder="Type it again"
        error={mismatch ? 'Those two do not match.' : undefined}
        testID="password-confirm"
      />

      {policy.status === 'loading' ? (
        <Skeleton height={72} cornerRadius={radius.card} />
      ) : (
        <Card padded={false} testID="password-rules">
          <View style={styles.rules}>
            {requirements.map((requirement) => {
              const met = policy.data !== undefined &&
                meetsRequirement(requirement.id, next, policy.data);
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

      <Banner>
        Changing your password signs you out everywhere except this device. Anyone still signed in
        elsewhere will need the new password.
      </Banner>

      <Button
        label="Update password"
        block
        disabled={!ready}
        loading={saving}
        onPress={save}
        style={styles.cta}
        testID="password-submit"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  rules: { padding: 16, gap: 8 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
});
