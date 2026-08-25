import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import { colors, tabularNums, type, type TypeVariant } from '@/theme';

export type TextProps = RNTextProps & {
  /** Named entry in the type ramp — never set fontSize/fontFamily inline. */
  variant?: TypeVariant;
  color?: string;
  /** Applies tabular figures. Every money and date figure should set this. */
  numeric?: boolean;
};

/**
 * The app's only text primitive. Using it guarantees the approved font,
 * weight and tracking for a given role.
 */
export function Text({
  variant = 'body',
  color = colors.ink,
  numeric = false,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      style={StyleSheet.flatten([type[variant], { color }, numeric && tabularNums, style])}
    />
  );
}
