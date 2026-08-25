import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/icons';
import { colors } from '@/theme';
import { Text } from './Text';

export type StatusPillTone = 'success' | 'pending' | 'failed';

export type StatusPillProps = {
  label: string;
  tone: StatusPillTone;
};

const TONES: Record<StatusPillTone, { background: string; foreground: string; icon: IconName }> = {
  success: { background: '#EAF6F0', foreground: colors.success, icon: 'check' },
  pending: { background: colors.goldSoft, foreground: colors.warning, icon: 'help-circle' },
  failed: { background: colors.dangerSoft, foreground: colors.danger, icon: 'alert-triangle' },
};

/**
 * The status badge on a transaction receipt. The design draws a check glyph
 * here; this uses the icon system so no Unicode symbol stands in for an icon.
 */
export function StatusPill({ label, tone }: StatusPillProps) {
  const palette = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.background }]}>
      <Icon name={palette.icon} size={13} color={palette.foreground} strokeWidth={2.6} />
      <Text variant="badge" color={palette.foreground}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 9,
    alignSelf: 'center',
  },
});
