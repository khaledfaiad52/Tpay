import { StyleSheet, View } from 'react-native';

import { FadeInUp, Text } from '@/components/ui';
import { Icon, type IconName } from '@/icons';
import { colors } from '@/theme';

export type TransferOutcomeProps = {
  tone: 'success' | 'failure';
  title: string;
  description: string;
};

const TONES: Record<
  TransferOutcomeProps['tone'],
  { background: string; foreground: string; icon: IconName; title: string; body: string }
> = {
  success: {
    background: colors.surface,
    foreground: colors.primary,
    icon: 'check',
    title: colors.onDark,
    body: colors.primaryOnDark,
  },
  failure: {
    background: colors.dangerSoft,
    foreground: colors.danger,
    icon: 'alert-triangle',
    title: colors.ink,
    body: colors.inkMuted,
  },
};

/** The badge, headline and explanation at the top of an outcome screen. */
export function TransferOutcome({ tone, title, description }: TransferOutcomeProps) {
  const palette = TONES[tone];
  return (
    <>
      <View style={[styles.badge, { backgroundColor: palette.background }]}>
        <Icon
          name={palette.icon}
          size={tone === 'success' ? 38 : 34}
          color={palette.foreground}
          strokeWidth={tone === 'success' ? 2.4 : 2.1}
        />
      </View>
      <FadeInUp delay={120}>
        <View style={styles.copy}>
          <Text variant={tone === 'success' ? 'outcomeTitle' : 'screenTitle'} color={palette.title}>
            {title}
          </Text>
          <Text variant="rowBody" color={palette.body} style={styles.description}>
            {description}
          </Text>
        </View>
      </FadeInUp>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { alignItems: 'center', gap: 8 },
  description: { textAlign: 'center', maxWidth: 270, lineHeight: 20 },
});
