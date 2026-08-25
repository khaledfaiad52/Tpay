import { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, fonts, inputReset, radius } from '@/theme';

export type OtpFieldProps = {
  value: string;
  onChangeText: (next: string) => void;
  length?: number;
  /** Draws every box in danger, for a rejected code. */
  invalid?: boolean;
  testID?: string;
};

/**
 * The six code boxes the design draws.
 *
 * One hidden input holds the value — a box per digit would fight the keyboard
 * and break paste — and the boxes are a rendering of it.
 */
export function OtpField({
  value,
  onChangeText,
  length = 6,
  invalid = false,
  testID,
}: OtpFieldProps) {
  const input = useRef<TextInput>(null);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');
  const focused = Math.min(value.length, length - 1);

  return (
    <View style={styles.wrapper}>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(next) => onChangeText(next.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        accessibilityLabel="Verification code"
        testID={testID}
        style={styles.hidden}
      />
      <View
        style={styles.boxes}
        // Tapping any box puts the caret in the one real field.
        onStartShouldSetResponder={() => {
          input.current?.focus();
          return false;
        }}
      >
        {digits.map((digit, index) => (
          <View
            key={index}
            style={[
              styles.box,
              invalid && styles.boxInvalid,
              !invalid && index === focused && value.length < length && styles.boxFocused,
            ]}
          >
            <Text variant="displayXs" numeric>
              {digit}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  // Kept in the tree and focusable, but never seen: the boxes are the UI.
  hidden: {
    ...inputReset,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: 'transparent',
    fontFamily: fonts.semibold,
    zIndex: 2,
  },
  boxes: { flexDirection: 'row', gap: 9 },
  box: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFocused: { borderWidth: 1.5, borderColor: colors.primary },
  boxInvalid: { borderWidth: 1.5, borderColor: colors.danger },
});
