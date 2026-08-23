import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { Text } from './Text';
import { Tappable } from './Tappable';

export type AvatarProps = {
  initials: string;
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Circular initials avatar — deep green ground, light type. */
export function Avatar({ initials, size = 44, onPress, accessibilityLabel }: AvatarProps) {
  const body = (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text variant="rowTitle" color={colors.primarySoft}>
        {initials}
      </Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Tappable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}>
      {body}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
