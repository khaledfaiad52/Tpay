import { StyleSheet, TextInput, View } from 'react-native';

import { Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import { colors, fonts, inputReset, radius } from '@/theme';

export type FormFieldProps = {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  /** IBM Plex Mono, for IBANs and account numbers. */
  monospaced?: boolean;
  /** Renders as a tappable picker with a chevron instead of a text input. */
  onPress?: () => void;
  autoCapitalize?: 'none' | 'words';
  keyboardType?: 'default' | 'phone-pad';
  /** Shown in danger beneath the field. */
  error?: string;
  testID?: string;
};

/** Labelled input, matching the recipient form in the design. */
export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  monospaced = false,
  onPress,
  autoCapitalize = 'words',
  keyboardType = 'default',
  error,
  testID,
}: FormFieldProps) {
  const filled = value.length > 0;

  return (
    <View style={styles.field}>
      <Text variant="action" color={colors.inkSecondary}>
        {label}
      </Text>

      {onPress ? (
        <Tappable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value || placeholder || 'choose'}`}
          testID={testID}
          onPress={onPress}
          style={StyleSheet.flatten([styles.box, styles.pickerBox])}
        >
          <Text variant="input" color={filled ? colors.ink : colors.inkFaint}>
            {value || placeholder}
          </Text>
          <Icon name="chevron-down" size={16} color={colors.inkFaint} />
        </Tappable>
      ) : (
        <View style={[styles.box, error ? styles.boxError : filled && styles.boxFilled]}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.inkFaint}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            keyboardType={keyboardType}
            accessibilityLabel={label}
            testID={testID}
            style={[styles.input, monospaced && styles.mono]}
          />
        </View>
      )}

      {error ? (
        <Text variant="captionSm" color={colors.danger}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  box: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  pickerBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boxFilled: { borderWidth: 1.5, borderColor: colors.primary },
  boxError: { borderWidth: 1.5, borderColor: colors.danger },
  input: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
    padding: 0,
    minHeight: 20,
    ...inputReset,
  },
  mono: { fontFamily: fonts.mono, fontSize: 14 },
});
