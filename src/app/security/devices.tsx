import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  IconTile,
  Screen,
  Skeleton,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { useSecurityData } from '@/hooks';
import { services } from '@/services';
import { colors, radius, spacing } from '@/theme';
import type { TrustedDevice } from '@/types';
import { formatRelativeDateTime } from '@/utils';

/** Every session that can reach this account, and how to end one. */
export default function TrustedDevicesScreen() {
  const data = useSecurityData();
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string>();

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={40} width={180} cornerRadius={radius.lg} />
        <Skeleton height={160} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Trusted devices" />
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const devices = data.data.devices;
  const others = devices.filter((device) => !device.isCurrent);

  const signOut = async (device: TrustedDevice) => {
    setBusyId(device.id);
    try {
      await services.security.signOutDevice(device.id);
      showToast(`${device.name} signed out`);
      data.reload();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "We couldn't sign that device out.");
    } finally {
      setBusyId(undefined);
    }
  };

  const signOutAll = async () => {
    setBusyId('all');
    await services.security.signOutAllOtherDevices();
    showToast('Signed out of every other device');
    data.reload();
    setBusyId(undefined);
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Trusted devices" />

      <Text variant="rowBody" color={colors.inkSecondary} style={styles.intro}>
        These devices are signed in to your TPay account. Sign out any you do not recognise.
      </Text>

      <Card padded={false} testID="devices-list">
        {devices.map((device, index) => (
          <View
            key={device.id}
            style={[styles.row, index < devices.length - 1 && styles.divided]}
            testID={`device-${device.id}`}
          >
            <IconTile
              name={device.name.toLowerCase().includes('iphone') ? 'smartphone' : 'monitor'}
              tone={device.isCurrent ? 'primary' : 'neutral'}
              size={38}
            />
            <View style={styles.body}>
              <Text variant="rowTitle">{device.name}</Text>
              <Text variant="captionSm" color={colors.inkMuted} numeric>
                {device.location} · {device.isCurrent ? 'This device' : formatRelativeDateTime(device.lastSeenAt)}
              </Text>
            </View>
            {device.isCurrent ? (
              <Badge label="Current" tone="success" />
            ) : (
              <Tappable
                accessibilityRole="button"
                accessibilityLabel={`Sign out ${device.name}`}
                testID={`device-sign-out-${device.id}`}
                disabled={busyId !== undefined}
                onPress={() => signOut(device)}
                style={styles.action}
              >
                <Text variant="action" color={colors.danger}>
                  Sign out
                </Text>
              </Tappable>
            )}
          </View>
        ))}
      </Card>

      {others.length > 0 ? (
        <Button
          label="Sign out of all other devices"
          block
          variant="secondary"
          loading={busyId === 'all'}
          onPress={signOutAll}
          style={styles.cta}
          testID="devices-sign-out-all"
        />
      ) : (
        <Card tone="tinted" testID="devices-only-this">
          <Text variant="caption" color={colors.primaryDark}>
            This is the only device signed in to your account.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  intro: { lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  divided: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  body: { flex: 1, gap: 2 },
  action: { paddingVertical: 6, paddingLeft: 10 },
  cta: { borderRadius: 16, paddingVertical: 15 },
});
