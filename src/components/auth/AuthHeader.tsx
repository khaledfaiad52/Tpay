import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';

export type AuthHeaderProps = {
  /** Adds the "powered by Talento" line under the wordmark. */
  showTagline?: boolean;
};

/** The TPay lockup that opens every signed-out screen. */
export function AuthHeader({ showTagline = true }: AuthHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.mark}>
        <Text variant="screenTitle" color={colors.primarySoft}>
          T
        </Text>
      </View>
      <View style={styles.body}>
        <Text variant="displayXs">TPay</Text>
        {showTagline ? (
          <Text variant="captionSm" color={colors.inkMuted}>
            powered by Talento
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { gap: 2 },
});
