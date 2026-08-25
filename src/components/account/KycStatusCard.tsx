import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import { colors, radius, spacing } from '@/theme';
import type { KycPresentation, KycTone } from './kycPresentation';

export type KycStatusCardProps = {
  presentation: KycPresentation;
  /** Renders as a button when the card leads somewhere. */
  onPress?: () => void;
  /** Hides the supporting sentence, for the compact row on Profile. */
  compact?: boolean;
  testID?: string;
};

type Palette = {
  background: string;
  border: string;
  disc: string;
  discIcon: string;
  title: string;
  detail: string;
};

const PALETTES: Record<KycTone, Palette> = {
  verified: {
    background: '#EAF6F0',
    border: '#CFE6DA',
    disc: colors.success,
    discIcon: colors.onDark,
    title: '#14523C',
    detail: '#3D7360',
  },
  pending: {
    background: colors.goldSoft,
    border: colors.goldSoftBorder,
    disc: colors.gold,
    discIcon: colors.onDark,
    title: colors.goldText,
    detail: colors.warningTextSoft,
  },
  attention: {
    background: colors.goldSoft,
    border: colors.goldSoftBorder,
    disc: colors.warning,
    discIcon: colors.onDark,
    title: colors.warningText,
    detail: colors.warningTextSoft,
  },
  blocked: {
    background: colors.dangerSoft,
    border: colors.dangerSoftBorder,
    disc: colors.danger,
    discIcon: colors.onDark,
    title: colors.dangerText,
    detail: colors.dangerTextSoft,
  },
  todo: {
    background: colors.primarySoft,
    border: colors.primarySoftBorder,
    disc: colors.primary,
    discIcon: colors.onDark,
    title: colors.primaryDark,
    detail: colors.primaryDeepText,
  },
};

/**
 * The verification banner. One component covers all seven states so a status
 * can never be shown with the wrong voice.
 */
export function KycStatusCard({
  presentation,
  onPress,
  compact = false,
  testID,
}: KycStatusCardProps) {
  const palette = PALETTES[presentation.tone];
  const shell = StyleSheet.flatten([
    styles.card,
    { backgroundColor: palette.background, borderColor: palette.border },
  ]) as ViewStyle;

  const content = (
    <>
      <View style={[styles.disc, { backgroundColor: palette.disc }]}>
        <Icon
          name={presentation.icon}
          size={14}
          color={palette.discIcon}
          strokeWidth={presentation.icon === 'shield-check' ? 2.2 : 2}
        />
      </View>
      <View style={styles.body}>
        <Text variant="label" color={palette.title}>
          {presentation.headline}
        </Text>
        {compact ? null : (
          <Text variant="captionSm" color={palette.detail} style={styles.detail}>
            {presentation.detail}
          </Text>
        )}
      </View>
      {onPress ? <Icon name="chevron-right" size={18} color={palette.detail} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={shell} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={`${presentation.headline}. ${presentation.detail}`}
      onPress={onPress}
      testID={testID}
      style={shell}
    >
      {content}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.lg - 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  disc: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  detail: { lineHeight: 16 },
});
