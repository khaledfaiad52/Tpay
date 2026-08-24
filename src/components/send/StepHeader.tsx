import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { colors } from '@/theme';

export type StepHeaderProps = {
  title: string;
  /** 1-based position in the Send flow. */
  step: number;
  totalSteps: number;
  /** Trailing context, e.g. "to Ahmed Mansour". */
  context?: string;
  onBack?: () => void;
};

/** Back chevron, title, "Step 2 of 3" and the progress rail beneath it. */
export function StepHeader({ title, step, totalSteps, context, onBack }: StepHeaderProps) {
  const progress = Math.min(Math.max(step / totalSteps, 0), 1);

  return (
    <View style={styles.wrapper}>
      <ScreenHeader
        title={title}
        onBack={onBack}
        subtitle={context ? `Step ${step} of ${totalSteps} · ${context}` : `Step ${step} of ${totalSteps}`}
      />
      <View style={styles.rail}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16 },
  rail: { height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2, backgroundColor: colors.primary },
});
