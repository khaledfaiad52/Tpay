import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';
import { Tappable } from './Tappable';

export type ToggleProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** Read out by assistive tech — "Face ID", "Two-factor authentication". */
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
};

/**
 * The 44×26 switch the design draws for a setting.
 *
 * Built from the design's own geometry rather than the platform `Switch`, so
 * the control looks identical on iOS, Android and web.
 */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
  testID,
}: ToggleProps) {
  return (
    <Tappable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      testID={testID}
      style={StyleSheet.flatten([
        styles.track,
        value ? styles.trackOn : styles.trackOff,
        value ? styles.alignEnd : styles.alignStart,
        disabled && styles.disabled,
      ])}
    >
      <View style={styles.knob} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: radius.lg,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackOn: { backgroundColor: '#0F5A50' },
  trackOff: { backgroundColor: colors.borderStrong },
  alignEnd: { justifyContent: 'flex-end' },
  alignStart: { justifyContent: 'flex-start' },
  disabled: { opacity: 0.45 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface },
});
