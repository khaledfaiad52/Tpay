import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import { colors, radius } from '@/theme';

export type ScreenHeaderProps = {
  title: string;
  /** Quiet line under the title — "Step 2 of 3 · to Ahmed Mansour". */
  subtitle?: string;
  /** Defaults to going back; falls back to Home when there is nothing to pop. */
  onBack?: () => void;
  /** Optional trailing control, e.g. an "Exchange" shortcut. */
  trailing?: React.ReactNode;
};

/** Back chevron + title, the standard header on every pushed screen. */
export function ScreenHeader({ title, subtitle, onBack, trailing }: ScreenHeaderProps) {
  const handleBack =
    onBack ??
    (() => {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    });

  return (
    <View style={styles.row}>
      <Tappable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        testID="screen-header-back"
        onPress={handleBack}
        style={styles.back}
      >
        <Icon name="arrow-left" size={18} color={colors.ink} />
      </Tappable>
      <View style={styles.titleBlock}>
        <Text variant="headingSm">{title}</Text>
        {subtitle ? (
          <Text variant="captionSm" color={colors.inkMuted}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  titleBlock: { flex: 1, gap: 3 },
});
