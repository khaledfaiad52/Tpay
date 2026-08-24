import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import type { AccountRestriction } from '@/services';
import { colors } from '@/theme';

export type RestrictionNoticeProps = {
  restriction: AccountRestriction;
  testID?: string;
};

/**
 * Why money cannot move, and the one thing that changes it.
 *
 * Used wherever a frozen account blocks an action, so the explanation and the
 * route out of it are identical on every screen.
 */
export function RestrictionNotice({ restriction, testID }: RestrictionNoticeProps) {
  const takeAction = () => {
    if (restriction.action.kind === 'unfreeze-account') {
      router.push('/security');
      return;
    }
    router.push({
      pathname: '/support/new',
      params: { topic: 'account', subject: restriction.title },
    });
  };

  return (
    <Card tone="danger" testID={testID}>
      <View style={styles.body}>
        <Text variant="label" color={colors.dangerText}>
          {restriction.title}
        </Text>
        <Text variant="caption" color={colors.dangerTextSoft} style={styles.copy}>
          {restriction.explanation}
        </Text>
        <Button
          label={restriction.action.label}
          variant="secondary"
          style={styles.action}
          testID="restriction-action"
          onPress={takeAction}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: 6 },
  copy: { lineHeight: 17 },
  action: { marginTop: 6, paddingVertical: 11 },
});
