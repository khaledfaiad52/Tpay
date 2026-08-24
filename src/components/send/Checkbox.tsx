import { StyleSheet, View } from 'react-native';

import { Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import { colors } from '@/theme';

export type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testID?: string;
};

export function Checkbox({ label, checked, onChange, testID }: CheckboxProps) {
  return (
    <Tappable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      testID={testID}
      onPress={() => onChange(!checked)}
      style={styles.row}
    >
      <View style={[styles.box, checked ? styles.boxChecked : styles.boxIdle]}>
        {checked ? <Icon name="check" size={14} color={colors.onDark} strokeWidth={2.6} /> : null}
      </View>
      <Text variant="caption" color={colors.inkSecondary}>
        {label}
      </Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, paddingHorizontal: 2 },
  box: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  boxChecked: { backgroundColor: colors.primary },
  boxIdle: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
});
