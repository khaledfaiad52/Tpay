import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';
import { Tappable } from './Tappable';
import { Text } from './Text';

export type FilterChip<T extends string> = {
  readonly id: T;
  readonly label: string;
};

export type FilterChipsProps<T extends string> = {
  chips: readonly FilterChip<T>[];
  selected: T;
  onSelect: (id: T) => void;
};

/** Horizontally scrolling single-select filter row. */
export function FilterChips<T extends string>({
  chips,
  selected,
  onSelect,
}: FilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => {
        const isSelected = chip.id === selected;
        return (
          <Tappable
            key={chip.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            testID={`filter-${chip.id}`}
            onPress={() => onSelect(chip.id)}
          >
            <View style={[styles.chip, isSelected ? styles.chipActive : styles.chipIdle]}>
              <Text variant="action" color={isSelected ? colors.onDark : colors.inkSecondary}>
                {chip.label}
              </Text>
            </View>
          </Tappable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 7, paddingBottom: 2 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.md },
  chipActive: { backgroundColor: colors.ink },
  chipIdle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
