import { StyleSheet, View } from 'react-native';

import { Icon } from '@/icons';
import { colors, radius } from '@/theme';
import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

export type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/** Recoverable failure. Always offers a way forward, never a dead end. */
export function ErrorState({
  title = "That didn't load",
  description = 'Check your connection and try again — nothing has changed on your account.',
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <Card tone="danger" style={styles.card}>
      <View style={styles.badge}>
        <Icon name="alert-triangle" size={18} color={colors.danger} />
      </View>
      <Text variant="sectionTitle" color={colors.dangerText} style={styles.title}>
        {title}
      </Text>
      <Text variant="caption" color={colors.dangerTextSoft} style={styles.description}>
        {description}
      </Text>
      {onRetry ? (
        <Button label={retryLabel} variant="danger" onPress={onRetry} style={styles.action} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.panel,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 2 },
  description: { textAlign: 'center', maxWidth: 230, lineHeight: 18 },
  action: { marginTop: 6, paddingVertical: 12, alignSelf: 'center' },
});
