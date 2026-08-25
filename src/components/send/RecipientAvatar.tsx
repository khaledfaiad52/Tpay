import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';
import { avatarToneIndex } from './avatarTone';

/** Avatar grounds, cycled by name so a recipient keeps the same colour. */
const TONES = [
  { background: colors.primaryDark, foreground: colors.primarySoft },
  { background: colors.gold, foreground: colors.onDark },
  { background: colors.inkSecondary, foreground: colors.onDark },
  { background: colors.primary, foreground: colors.onDark },
] as const;

export type RecipientAvatarProps = {
  initials: string;
  /** Seed for the colour, so the same person is always the same colour. */
  seed: string;
  size?: number;
};

export function RecipientAvatar({ initials, seed, size = 54 }: RecipientAvatarProps) {
  const tone = TONES[avatarToneIndex(seed)];
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tone.background },
      ]}
    >
      <Text variant={size >= 48 ? 'rowTitle' : 'badge'} color={tone.foreground}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
});
