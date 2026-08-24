import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/components/auth';
import { Button, Card, Screen, Tappable, Text } from '@/components/ui';
import { useEmploymentData } from '@/hooks';
import { Icon } from '@/icons';
import { services } from '@/services';
import type { EmployerConnection } from '@/types';
import { colors, radius, spacing } from '@/theme';

/** How someone can be connected to the employer of record, as the design lists it. */
const OPTIONS: readonly { value: EmployerConnection; label: string }[] = [
  { value: 'employer-uses-talento', label: 'My employer uses Talento' },
  { value: 'hired-through-talento', label: 'I was hired through Talento' },
  { value: 'joining-managed-team', label: "I'm joining a Talento-managed team" },
  { value: 'other', label: 'Something else' },
];

/** The last step: link the account to the employer that pays it. */
export default function ConnectEmployerScreen() {
  const { refreshSignup } = useSession();
  const employment = useEmploymentData();
  const [choice, setChoice] = useState<EmployerConnection>('employer-uses-talento');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const employer = employment.data?.employment?.employer.name;

  const finish = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await services.session.connectEmployer(choice);
      // Onboarding is done, so the guard stops holding the user here.
      await refreshSignup();
      router.replace('/');
    } catch {
      setError("We couldn't save that. Try again in a moment.");
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
          testID="connect-back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/onboarding'))}
          style={styles.back}
        >
          <Icon name="arrow-left" size={18} color={colors.ink} />
        </Tappable>
        <View style={styles.rail} />
      </View>

      <View style={styles.headline}>
        <Text variant="eyebrowSm" color={colors.primary}>
          LAST STEP
        </Text>
        <Text variant="outcomeTitle">How are you connected to Talento?</Text>
        <Text variant="rowBody" color={colors.inkMuted}>
          This links your salary, benefits and documents.
        </Text>
      </View>

      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const selected = option.value === choice;
          return (
            <Tappable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              testID={`connect-${option.value}`}
              onPress={() => setChoice(option.value)}
              style={StyleSheet.flatten([
                styles.option,
                selected ? styles.optionSelected : styles.optionIdle,
              ])}
            >
              <Text variant="rowTitle" color={selected ? colors.onDark : colors.ink}>
                {option.label}
              </Text>
              {selected ? (
                <View style={styles.check}>
                  <Icon name="check" size={14} color={colors.primary} strokeWidth={2.6} />
                </View>
              ) : null}
            </Tappable>
          );
        })}
      </View>

      {employer ? (
        <View style={styles.employerBlock}>
          <Text variant="action" color={colors.inkSecondary}>
            Employer
          </Text>
          <View style={styles.employer} testID="connect-employer">
            <View style={styles.employerIcon}>
              <Icon name="building" size={18} color={colors.gold} />
            </View>
            <Text variant="input" style={styles.employerName}>
              {employer}
            </Text>
            <Text variant="badge" color={colors.success}>
              Matched
            </Text>
          </View>
        </View>
      ) : null}

      {error ? (
        <Card tone="danger" testID="connect-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Button
        label="Finish and open TPay"
        block
        loading={busy}
        onPress={finish}
        style={styles.cta}
        testID="connect-finish"
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
  rail: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  headline: { gap: 6, marginTop: 8 },
  options: { gap: 10, marginTop: 4 },
  option: {
    borderRadius: 18,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionSelected: { backgroundColor: colors.primary },
  optionIdle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.onDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employerBlock: { gap: 7, marginTop: 6 },
  employer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  employerIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employerName: { flex: 1 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 6 },
});
