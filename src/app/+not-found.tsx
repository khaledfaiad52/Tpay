import { router } from 'expo-router';

import { Button, Card, Screen, Text } from '@/components/ui';
import { colors } from '@/theme';

/** Shown when a deep link points at a route that does not exist. */
export default function NotFoundScreen() {
  return (
    <Screen>
      <Card style={{ gap: 10, alignItems: 'flex-start' }}>
        <Text variant="sectionTitle">This page doesn&apos;t exist</Text>
        <Text variant="caption" color={colors.inkMuted} style={{ lineHeight: 18 }}>
          The link you followed points somewhere we couldn&apos;t find.
        </Text>
        <Button label="Go to Home" onPress={() => router.replace('/')} />
      </Card>
    </Screen>
  );
}
