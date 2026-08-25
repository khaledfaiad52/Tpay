import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';
import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

export type EmptyStateProps = {
  title: string;
  description: string;
  /** Optional call to action, e.g. "Add money". */
  actionLabel?: string;
  onActionPress?: () => void;
  /** Placeholder shape above the copy — a soft square by default. */
  illustration?: React.ReactNode;
};

/** Centred empty state used wherever a collection has no rows yet. */
export function EmptyState({
  title,
  description,
  actionLabel,
  onActionPress,
  illustration,
}: EmptyStateProps) {
  return (
    <Card style={styles.card}>
      {illustration ?? <View style={styles.placeholder} />}
      <Text variant="sectionTitle" style={styles.title}>
        {title}
      </Text>
      <Text variant="caption" color={colors.inkMuted} style={styles.description}>
        {description}
      </Text>
      {actionLabel && onActionPress ? (
        <Button label={actionLabel} onPress={onActionPress} style={styles.action} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.panel,
    paddingVertical: 30,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 10,
  },
  placeholder: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.surfaceSunken,
  },
  title: { marginTop: 4 },
  description: { textAlign: 'center', maxWidth: 220, lineHeight: 18 },
  action: { marginTop: 8, paddingVertical: 12, alignSelf: 'center' },
});
