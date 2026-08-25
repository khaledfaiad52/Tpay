import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Tappable, Text } from '@/components/ui';
import { colors, fonts, inputReset, radius, tabularNums } from '@/theme';
import type { Money } from '@/types';
import { formatMoney, formatMoneyParts } from '@/utils';

export type AmountEntryProps = {
  /** Raw text, in the source currency's major units. */
  value: string;
  onChangeText: (value: string) => void;
  currencyPrefix: string;
  /** "Ahmed receives ≈ AED 3,111.02", or a quiet prompt before an amount. */
  caption: string;
  /** Quick amounts, in the source currency. */
  presets: readonly Money[];
  selectedPreset: number | undefined;
  onSelectPreset: (amount: Money) => void;
  onSelectMax: () => void;
  testID?: string;
};

/** The centred amount field with its quick-amount chips. */
export function AmountEntry({
  value,
  onChangeText,
  currencyPrefix,
  caption,
  presets,
  selectedPreset,
  onSelectPreset,
  onSelectMax,
  testID,
}: AmountEntryProps) {
  // A text input has no intrinsic width, so it would stretch across the row.
  // An identical, invisible copy of the text measures it instead, keeping the
  // figure and its caret together and centred as the design draws them.
  const [measuredWidth, setMeasuredWidth] = useState(MIN_INPUT_WIDTH);

  return (
    <View style={styles.wrapper}>
      <View style={styles.entry}>
        <Text variant="eyebrow" color={colors.inkMuted}>
          YOU SEND
        </Text>
        <View style={styles.amountRow}>
          <Text variant="amountDisplay">{currencyPrefix}</Text>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0"
            placeholderTextColor={colors.inkFaint}
            accessibilityLabel="Amount to send"
            testID={testID}
            style={[styles.input, { width: measuredWidth }]}
          />
          <View style={styles.caret} />
          <Text
            variant="amountDisplay"
            style={styles.measure}
            onLayout={(event) =>
              setMeasuredWidth(Math.max(event.nativeEvent.layout.width, MIN_INPUT_WIDTH))
            }
          >
            {value || '0'}
          </Text>
        </View>
        <Text variant="body" color={colors.inkMuted} style={styles.caption}>
          {caption}
        </Text>
      </View>

      <View style={styles.chips}>
        {presets.map((preset) => {
          const isSelected = preset.minorUnits === selectedPreset;
          return (
            <Tappable
              key={preset.minorUnits}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              testID={`amount-preset-${preset.minorUnits}`}
              onPress={() => onSelectPreset(preset)}
            >
              <View style={[styles.chip, isSelected ? styles.chipActive : styles.chipIdle]}>
                <Text variant="action" color={isSelected ? colors.onDark : colors.inkSecondary}>
                  {formatMoney(preset)}
                </Text>
              </View>
            </Tappable>
          );
        })}

        <Tappable accessibilityRole="button" testID="amount-preset-max" onPress={onSelectMax}>
          <View style={[styles.chip, styles.chipIdle]}>
            <Text variant="action" color={colors.inkSecondary}>
              Max
            </Text>
          </View>
        </Tappable>
      </View>
    </View>
  );
}

/** "$" or "SAR " — the marker `formatMoney` would put in front. */
export function prefixFor(currency: Money['currency']): string {
  return formatMoneyParts({ minorUnits: 0, currency }).prefix;
}

/** Enough room for a single digit, so an empty field still shows its caret. */
const MIN_INPUT_WIDTH = 26;

const styles = StyleSheet.create({
  wrapper: { gap: 16 },
  entry: { alignItems: 'center', gap: 8, paddingTop: 22, paddingBottom: 6 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  input: {
    fontFamily: fonts.extrabold,
    fontSize: 44,
    letterSpacing: -1.76,
    color: colors.ink,
    padding: 0,
    textAlign: 'left',
    ...tabularNums,
    ...inputReset,
  },
  /** Off-screen twin of the field, used only to measure its text. */
  measure: {
    position: 'absolute',
    opacity: 0,
    left: -9999,
    ...tabularNums,
  },
  caret: { width: 2, height: 38, backgroundColor: colors.primary, marginLeft: 4 },
  caption: { textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.md },
  chipActive: { backgroundColor: colors.ink },
  chipIdle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
