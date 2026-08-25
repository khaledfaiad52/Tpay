import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import type { SalaryLineItem } from '@/types';

/** The colour each deduction category carries, in the breakdown and its bar. */
export const DEDUCTION_COLORS: Record<SalaryLineItem['category'], string> = {
  tax: colors.gold,
  'social-insurance': colors.inkMuted,
  benefit: colors.borderStrong,
  deduction: colors.surfaceSunken,
  allowance: colors.primary,
  bonus: colors.primary,
};

export type SalaryBreakdownBarProps = {
  /** Net pay, which takes the brand-coloured majority of the bar. */
  netMinorUnits: number;
  deductions: readonly SalaryLineItem[];
};

/** A single stacked bar: what you kept, and what each deduction took. */
export function SalaryBreakdownBar({ netMinorUnits, deductions }: SalaryBreakdownBarProps) {
  return (
    <View style={styles.bar}>
      <View style={[styles.segment, { flex: netMinorUnits, backgroundColor: colors.primary }]} />
      {deductions.map((item) => (
        <View
          key={item.label}
          style={[
            styles.segment,
            { flex: item.amount.minorUnits, backgroundColor: DEDUCTION_COLORS[item.category] },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  segment: { height: 10 },
});
