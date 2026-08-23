import { StyleSheet, View } from 'react-native';

import { Card, IconTile, Text } from '@/components/ui';
import { colors } from '@/theme';
import type { BenefitsSummary, Employment } from '@/types';

export type WorkTilesProps = {
  benefits: BenefitsSummary;
  employment: Employment | null;
  onBenefitsPress: () => void;
  onEmployerPress: () => void;
};

const EMPLOYMENT_STATUS_LABELS: Record<Employment['status'], string> = {
  active: 'Active employee',
  onboarding: 'Onboarding',
  'on-leave': 'On leave',
  offboarding: 'Offboarding',
  ended: 'Employment ended',
};

/** Side-by-side entry points into Benefits and the employment relationship. */
export function WorkTiles({
  benefits,
  employment,
  onBenefitsPress,
  onEmployerPress,
}: WorkTilesProps) {
  return (
    <View style={styles.grid}>
      <Card onPress={onBenefitsPress} style={styles.tile}>
        <IconTile name="gift" tone="primary" size={34} />
        <Text variant="label">Benefits</Text>
        <Text variant="captionSm" color={colors.inkMuted}>
          {`${benefits.activeCount} active · ${benefits.highlights.join(', ')}`}
        </Text>
      </Card>

      <Card onPress={onEmployerPress} style={styles.tile}>
        <IconTile name="building" tone="gold" size={34} />
        <Text variant="label">{employment?.employer.name ?? 'No employer linked'}</Text>
        <Text variant="captionSm" color={colors.inkMuted}>
          {employment
            ? `${EMPLOYMENT_STATUS_LABELS[employment.status]} · ${employment.country}`
            : 'Connect your employer to get paid'}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, gap: 10 },
});
