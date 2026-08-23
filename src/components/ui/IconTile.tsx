import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/icons';
import { colors, radius } from '@/theme';

export type IconTileTone = 'primary' | 'gold' | 'neutral' | 'surface' | 'danger';

export type IconTileProps = {
  name: IconName;
  tone?: IconTileTone;
  /** Tile edge length. Icon scales to roughly 45% of it, as in the design. */
  size?: number;
  /** Overrides the tile radius; defaults to the design's per-size value. */
  cornerRadius?: number;
  strokeWidth?: number;
};

const TONES: Record<IconTileTone, { background: string; foreground: string }> = {
  primary: { background: colors.primarySoft, foreground: colors.primary },
  gold: { background: colors.goldSoft, foreground: colors.gold },
  neutral: { background: colors.surfaceMuted, foreground: colors.inkSecondary },
  surface: { background: colors.surface, foreground: colors.primary },
  danger: { background: colors.dangerSoft, foreground: colors.danger },
};

/** Rounded square holding a single stroked icon — used on every list row. */
export function IconTile({
  name,
  tone = 'primary',
  size = 38,
  cornerRadius,
  strokeWidth = 1.9,
}: IconTileProps) {
  const palette = TONES[tone];
  const style: ViewStyle = {
    width: size,
    height: size,
    borderRadius: cornerRadius ?? defaultRadius(size),
    backgroundColor: palette.background,
  };
  return (
    <View style={[styles.tile, style]}>
      <Icon name={name} size={Math.round(size * 0.47)} color={palette.foreground} strokeWidth={strokeWidth} />
    </View>
  );
}

function defaultRadius(size: number): number {
  if (size <= 34) return radius.md;
  if (size <= 38) return 12;
  if (size <= 40) return radius.lg;
  return radius.xl;
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
