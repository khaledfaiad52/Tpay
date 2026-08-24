import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { Icon } from '@/icons';
import { colors } from '@/theme';
import type { CardDelivery } from '@/types';
import { formatLongDate } from '@/utils';
import { DELIVERY_STAGE_LABELS, DELIVERY_STAGES } from './cardPresentation';

export type DeliveryTrackerProps = {
  delivery: CardDelivery;
  testID?: string;
};

/** Where a physical card has got to, drawn as the four stages it passes. */
export function DeliveryTracker({ delivery, testID }: DeliveryTrackerProps) {
  const reached = DELIVERY_STAGES.indexOf(delivery.stage);

  return (
    <View style={styles.block} testID={testID}>
      <View style={styles.rail}>
        {DELIVERY_STAGES.map((stage, index) => (
          <View
            key={stage}
            style={[styles.segment, index <= reached ? styles.segmentDone : styles.segmentTodo]}
          />
        ))}
      </View>

      <View style={styles.row}>
        <Icon name="check" size={15} color={colors.primary} strokeWidth={2.4} />
        <Text variant="label" testID="card-delivery-stage">
          {DELIVERY_STAGE_LABELS[delivery.stage]}
        </Text>
      </View>
      <Text variant="captionSm" color={colors.inkMuted} numeric>
        {`Expected ${formatLongDate(delivery.estimatedArrival)} · ${delivery.addressSummary}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8, padding: 16 },
  rail: { flexDirection: 'row', gap: 5 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  segmentDone: { backgroundColor: colors.primary },
  segmentTodo: { backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
