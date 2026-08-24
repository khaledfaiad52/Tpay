import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import {
  Card,
  ErrorState,
  Eyebrow,
  ListRow,
  Screen,
  SettingRow,
  Skeleton,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { SessionDemoControls, useSession } from '@/components/auth';
import { useRefreshOnFocus, useSecurityData } from '@/hooks';
import { Icon } from '@/icons';
import { services } from '@/services';
import { deviceBiometricAuthenticator } from '@/services/device';
import { colors, radius, spacing } from '@/theme';
import type { LoginEvent, LoginOutcome } from '@/types';
import { formatLongDate, formatRelativeDateTime } from '@/utils';

const OUTCOME_DOTS: Record<LoginOutcome, string> = {
  success: colors.success,
  failed: colors.inkFaint,
  blocked: colors.danger,
};

/** Everything protecting the account, and every session that can reach it. */
export default function SecurityScreen() {
  const data = useSecurityData();
  const session = useSession();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  useRefreshOnFocus(data.reload);

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={40} width={160} cornerRadius={radius.lg} />
        <Skeleton height={80} cornerRadius={radius.panel} />
        <Skeleton height={200} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Security" />
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const { settings, devices, activity, biometrics, kyc } = data.data;
  const protections = [
    settings.biometricsEnabled && biometrics.available ? biometrics.label : undefined,
    settings.twoFactorEnabled ? 'two-factor' : undefined,
    kyc.status === 'VERIFIED' ? 'identity verification' : undefined,
  ].filter((entry): entry is string => entry !== undefined);

  const toggleBiometrics = async (next: boolean) => {
    if (next && !biometrics.available) {
      // Never claim a protection the device cannot provide.
      showToast(biometrics.unavailableReason ?? `${biometrics.label} is not available here.`);
      return;
    }
    setBusy(true);
    try {
      if (next) {
        // Turning it on runs the real check once, so the switch can only be
        // set by someone who has actually passed it.
        await deviceBiometricAuthenticator.authenticate(`Use ${biometrics.label} with TPay`);
      }
      await services.security.setBiometricsEnabled(next);
      // The same preference gates unlocking the app on the next launch.
      await services.session.setBiometricUnlockEnabled(next);
      await session.refresh();
      data.reload();
      showToast(
        next
          ? `${biometrics.label} is on for logging in and approving transfers`
          : `${biometrics.label} is off`,
      );
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'That check did not complete.');
    } finally {
      setBusy(false);
    }
  };

  const toggleTwoFactor = async (next: boolean) => {
    setBusy(true);
    await services.security.setTwoFactorEnabled(next);
    data.reload();
    setBusy(false);
    showToast(next ? 'Two-factor authentication is on' : 'Two-factor authentication is off');
  };

  const toggleFreeze = async () => {
    setBusy(true);
    const next = await services.security.setAccountFrozen(!settings.accountFrozen);
    data.reload();
    setBusy(false);
    showToast(
      next.accountFrozen
        ? 'Account frozen. Cards and transfers are blocked.'
        : 'Account unfrozen. Cards and transfers work again.',
    );
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Security" />

      <View style={styles.shield} testID="security-summary">
        <View style={styles.shieldIcon}>
          <Icon name="shield-check" size={20} color="#7FE3C0" />
        </View>
        <View style={styles.shieldBody}>
          <Text variant="rowTitleStrong" color={colors.onDark}>
            {settings.accountFrozen ? 'Your account is frozen' : 'Your account is protected'}
          </Text>
          <Text variant="captionSm" color={colors.primaryOnDark}>
            {settings.accountFrozen
              ? 'Cards and transfers are blocked until you unfreeze it.'
              : protections.length > 0
                ? `${sentenceList(protections)} active`
                : 'Add two-factor authentication to protect this account.'}
          </Text>
        </View>
      </View>

      <Card padded={false}>
        <SettingRow
          title={biometrics.label}
          subtitle={
            biometrics.available
              ? 'Log in and approve transfers'
              : (biometrics.unavailableReason ?? 'Not available on this device')
          }
          value={settings.biometricsEnabled && biometrics.available}
          onValueChange={toggleBiometrics}
          disabled={busy}
          divided
          testID="security-biometrics"
        />
        <SettingRow
          title="Two-factor authentication"
          subtitle={`SMS to ${settings.twoFactorDestination}`}
          value={settings.twoFactorEnabled}
          onValueChange={toggleTwoFactor}
          disabled={busy}
          divided
          testID="security-two-factor"
        />
        <ListRow
          title="Change password"
          subtitle={`Last changed ${formatLongDate(settings.passwordUpdatedAt)}`}
          showChevron
          divided
          testID="security-change-password"
          onPress={() => router.push('/security/password')}
        />
        <ListRow
          title="Trusted devices"
          trailing={
            <Text variant="caption" color={colors.inkMuted}>
              {devices.length} {devices.length === 1 ? 'device' : 'devices'}
            </Text>
          }
          testID="security-devices"
          onPress={() => router.push('/security/devices')}
        />
      </Card>

      <Eyebrow label="Recent login activity" />
      <Card padded={false} testID="security-activity">
        {activity.map((event, index) => (
          <LoginRow key={event.id} event={event} divided={index < activity.length - 1} />
        ))}
      </Card>

      <Tappable
        accessibilityRole="button"
        testID="security-freeze"
        onPress={toggleFreeze}
        disabled={busy}
        style={styles.freeze}
      >
        <View style={styles.shieldBody}>
          <Text variant="label" color={colors.dangerText}>
            {settings.accountFrozen ? 'Unfreeze account' : 'Freeze account'}
          </Text>
          <Text variant="captionSm" color={colors.dangerTextSoft}>
            {settings.accountFrozen
              ? 'Restore cards and transfers on this account'
              : 'Instantly block all cards and transfers'}
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.danger} />
      </Tappable>

      <SessionDemoControls />
    </Screen>
  );
}

function LoginRow({ event, divided }: { event: LoginEvent; divided: boolean }) {
  const blocked = event.outcome === 'blocked';
  return (
    <View style={[styles.loginRow, divided && styles.divided]}>
      <View style={[styles.dot, { backgroundColor: OUTCOME_DOTS[event.outcome] }]} />
      <View style={styles.shieldBody}>
        <Text variant="label">
          {event.deviceName} · {event.location}
        </Text>
        <Text
          variant="captionSm"
          color={blocked ? colors.danger : colors.inkMuted}
          numeric
        >
          {blocked ? 'Blocked · ' : ''}
          {formatRelativeDateTime(event.occurredAt)}
        </Text>
      </View>
    </View>
  );
}

/** "Face ID, two-factor and identity verification". */
function sentenceList(entries: readonly string[]): string {
  if (entries.length === 1) return entries[0]!;
  return `${entries.slice(0, -1).join(', ')} and ${entries.at(-1)}`;
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  shield: {
    borderRadius: radius.panel,
    backgroundColor: colors.primaryDark,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  shieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.overlayOnDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldBody: { flex: 1, gap: 3 },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  divided: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  dot: { width: 8, height: 8, borderRadius: 4 },
  freeze: {
    borderRadius: 18,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerSoftBorder,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
