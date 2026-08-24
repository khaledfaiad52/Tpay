import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { FormField } from '@/components/send';
import { Banner, Button, Card, Screen, Text, useToast } from '@/components/ui';
import { Icon } from '@/icons';
import { PasswordRejectedError, services } from '@/services';
import type { PasswordProblem } from '@/services';
import { colors } from '@/theme';

/** Which field a rejection belongs under. */
const PROBLEM_FIELD: Record<PasswordProblem, 'current' | 'next'> = {
  'current-incorrect': 'current',
  'too-short': 'next',
  'too-simple': 'next',
  'same-as-current': 'next',
};

const RULES: readonly { readonly label: string; readonly test: (value: string) => boolean }[] = [
  { label: 'At least 10 characters', test: (value) => value.length >= 10 },
  { label: 'A letter and a number', test: (value) => /[a-zA-Z]/.test(value) && /[0-9]/.test(value) },
];

/** Change the password. Rules are shown as they are met, not after failure. */
export default function ChangePasswordScreen() {
  const { showToast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<{ field: 'current' | 'next'; message: string }>();

  const mismatch = confirm !== '' && confirm !== next;
  const rulesMet = RULES.every((rule) => rule.test(next));
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

      <Card padded={false} testID="password-rules">
        <View style={styles.rules}>
          {RULES.map((rule) => {
            const met = rule.test(next);
            return (
              <View key={rule.label} style={styles.rule}>
                <Icon
                  name={met ? 'check' : 'chevron-right'}
                  size={14}
                  color={met ? colors.success : colors.inkFaint}
                  strokeWidth={met ? 2.6 : 1.9}
                />
                <Text variant="caption" color={met ? colors.success : colors.inkMuted}>
                  {rule.label}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

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
