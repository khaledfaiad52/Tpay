import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';
import type { RequestStage } from '@/types';

export type RequestProgressProps = {
  stages: readonly RequestStage[];
};

/** The four-dot rail showing how far a request has got. */
export function RequestProgress({ stages }: RequestProgressProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.rail}>
        {stages.map((stage, index) => (
          // Dots keep their size; the connectors between them take the slack,
          // so the rail spans the card whatever the stage count.
          <Fragment key={stage.label}>
            {index > 0 ? (
              <View style={[styles.connector, stage.reached && styles.connectorReached]} />
            ) : null}
            <View style={[styles.dot, stage.reached ? styles.dotReached : styles.dotIdle]} />
          </Fragment>
        ))}
      </View>
      <View style={styles.labels}>
        {stages.map((stage) => (
          <Text
            key={stage.label}
            variant="tab"
            color={stage.current ? colors.primary : colors.inkMuted}
          >
            {stage.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  rail: { flexDirection: 'row', alignItems: 'center' },
  connector: { flex: 1, height: 2, backgroundColor: colors.border },
  connectorReached: { backgroundColor: colors.primary },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotReached: { backgroundColor: colors.primary },
  dotIdle: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
});
