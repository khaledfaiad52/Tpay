import { StyleSheet, View } from 'react-native';

import { Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import { colors, radius, spacing } from '@/theme';
import type { KycStep } from '@/services';

export type KycStepRowProps = {
  step: KycStep;
  /** 1-based position, shown in the disc until the step is done. */
  position: number;
  /** The step the user should do now — drawn with the primary outline. */
  active?: boolean;
  onPress?: () => void;
  testID?: string;
};

/** One verification step: state disc, title, what it needs. */
export function KycStepRow({ step, position, active = false, onPress, testID }: KycStepRowProps) {
  const done = step.status === 'done';
  const skipped = step.status === 'not-required';

  const content = (
    <>
      <View style={[styles.disc, done ? styles.discDone : active ? styles.discActive : styles.discIdle]}>
        {done ? (
          <Icon name="check" size={14} color={colors.success} strokeWidth={2.6} />
        ) : (
          <Text variant="rowTitleStrong" color={active ? colors.primary : colors.inkMuted}>
            {position}
          </Text>
        )}
      </View>
      <View style={styles.body}>
        <Text variant="rowTitle">{step.title}</Text>
        <Text variant="captionSm" color={done ? colors.success : colors.inkMuted}>
          {done ? 'Done' : step.description}
        </Text>
      </View>
      {onPress ? <Icon name="chevron-right" size={18} color={colors.primary} /> : null}
    </>
  );

  const shell = StyleSheet.flatten([
    styles.row,
    active && styles.rowActive,
    skipped && styles.rowSkipped,
  ]);

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
      accessibilityLabel={`${step.title}. ${step.description}`}
      onPress={onPress}
      testID={testID}
      style={shell}
    >
      {content}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  rowActive: { borderWidth: 1.5, borderColor: colors.primary },
  rowSkipped: { opacity: 0.6 },
  disc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  discDone: { backgroundColor: '#EAF6F0' },
  discActive: { backgroundColor: colors.primarySoft },
  discIdle: { backgroundColor: colors.surfaceMuted },
  body: { flex: 1, gap: 2 },
});
