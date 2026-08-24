import { StyleSheet, View } from 'react-native';

import { Eyebrow, Tappable, Text } from '@/components/ui';
import { appConfig, services } from '@/services';
import { colors, radius } from '@/theme';
import { useSession } from './SessionProvider';

/**
 * Demo-only session controls.
 *
 * Hidden unless EXPO_PUBLIC_ENABLE_SESSION_DEMO=true. Expiring a session is
 * something only a real backend can do on its own, and the app has to handle
 * it — this drives `sessionService.expireSession()`, the same state a real
 * token running out produces.
 */
export function SessionDemoControls() {
  const { refresh } = useSession();

  if (!appConfig.demo.session) return null;

  const expire = async () => {
    await services.session.expireSession();
    // The guard sees SESSION_EXPIRED and sends the user to the login screen.
    await refresh();
  };

  return (
    <View style={styles.block}>
      <Eyebrow label="Demo · simulate a session event" />
      <View style={styles.row}>
        <Tappable
          accessibilityRole="button"
          testID="session-demo-expire"
          onPress={expire}
          style={styles.chip}
        >
          <Text variant="captionSm" color={colors.inkMuted}>
            Expire session
          </Text>
        </Tappable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
