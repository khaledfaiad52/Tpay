import { StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/icons';
import { colors, fonts, radius, spacing } from '@/theme';

export type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  testID?: string;
};

/** The search input used above a transaction list. */
export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search transactions',
  testID,
}: SearchFieldProps) {
  return (
    <View style={styles.field}>
      <Icon name="search" size={17} color={colors.inkFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
        accessibilityLabel={placeholder}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
    padding: 0,
    minHeight: spacing.xl,
  },
});
