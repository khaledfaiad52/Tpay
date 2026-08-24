import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

export type StepRailProps = {
  /** 1-based position of the step being shown. */
  step: number;
  totalSteps: number;
};

/** The segmented progress bar the signup and verification screens carry. */
export function StepRail({ step, totalSteps }: StepRailProps) {
  return (
    <View
      style={styles.rail}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          style={[styles.segment, index < step ? styles.done : styles.todo]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { flex: 1, flexDirection: 'row', gap: 5 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  done: { backgroundColor: colors.primary },
  todo: { backgroundColor: colors.border },
});
