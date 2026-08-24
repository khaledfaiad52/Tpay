import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { FormField } from '@/components/send';
import {
  Banner,
  Button,
  Card,
  ErrorState,
  Screen,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { useProfileData } from '@/hooks';
import { isValidUsername, normaliseUsername, services } from '@/services';
import { colors, radius } from '@/theme';

/**
 * The handle other TPay users send money to.
 *
 * Availability is checked before the change is offered, so the user is never
 * told "taken" only after committing.
 */
export default function UsernameScreen() {
  const data = useProfileData();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={40} width={200} cornerRadius={radius.lg} />
        <Skeleton height={120} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="TPay username" />
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const current = data.data.user.username;
  const value = draft ?? current;
  const handle = normaliseUsername(value);
  const changed = handle !== current;
  const malformed = changed && !isValidUsername(handle);

  const change = (next: string) => {
    setDraft(next);
    setAvailable(undefined);
    setError(undefined);
  };

  const check = async () => {
    setChecking(true);
    setError(undefined);
    try {
      setAvailable(await services.user.isUsernameAvailable(handle));
    } catch {
      setError("We couldn't check that username. Try again in a moment.");
    } finally {
      setChecking(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(undefined);
    try {
      await services.user.setUsername(handle);
      showToast(`You are now @${handle}`);
      data.reload();
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't save that username.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="TPay username" />

      <Text variant="rowBody" color={colors.inkSecondary} style={styles.intro}>
        Your username is how other TPay users find you. Sharing it never reveals your account
        number or your balance.
      </Text>

      <FormField
        label="Username"
        value={value}
        onChangeText={change}
        autoCapitalize="none"
        placeholder="khaled"
        error={malformed ? 'Use 3–20 letters, numbers or underscores.' : undefined}
        testID="username-field"
      />

      <View style={styles.preview}>
        <Text variant="caption" color={colors.inkMuted}>
          People will send to
        </Text>
        <Text variant="mono" color={colors.primaryDark} testID="username-preview">
          @{handle}
        </Text>
      </View>

      {available === true ? (
        <Card tone="tinted" testID="username-available">
          <Text variant="caption" color={colors.primaryDark}>
            @{handle} is available.
          </Text>
        </Card>
      ) : null}
      {available === false ? (
        <Card tone="danger" testID="username-taken">
          <Text variant="caption" color={colors.dangerText}>
            @{handle} is not available. Try another.
          </Text>
        </Card>
      ) : null}
      {error ? (
        <Card tone="danger" testID="username-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Banner>
        Changing your username does not affect transfers already on their way, and your old
        username stops working immediately.
      </Banner>

      {available === true ? (
        <Button
          label="Save username"
          block
          loading={saving}
          onPress={save}
          style={styles.cta}
          testID="username-save"
        />
      ) : (
        <Button
          label="Check availability"
          block
          disabled={!changed || malformed}
          loading={checking}
          onPress={check}
          style={styles.cta}
          testID="username-check"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  intro: { lineHeight: 20 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    borderRadius: radius.xl,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
});
