import { StyleSheet, View } from 'react-native';

import { Card, IconTile, ListRow, type IconTileTone } from '@/components/ui';
import { Icon, type IconName } from '@/icons';
import { colors } from '@/theme';

export type DepositMethod = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: IconName;
  readonly tone: IconTileTone;
};

export type DepositMethodRowProps = {
  method: DepositMethod;
  /** Selected methods carry a brand border and a check, rather than a chevron. */
  selected: boolean;
  onPress: () => void;
};

export function DepositMethodRow({ method, selected, onPress }: DepositMethodRowProps) {
  return (
    <Card
      padded={false}
      onPress={onPress}
      testID={`deposit-method-${method.id}`}
      style={selected ? styles.selected : undefined}
    >
      <ListRow
        leading={<IconTile name={method.icon} tone={method.tone} size={40} />}
        title={method.title}
        subtitle={method.subtitle}
        showChevron={!selected}
        trailing={
          selected ? (
            <View style={styles.check}>
              <Icon name="check" size={14} color={colors.onDark} strokeWidth={2.6} />
            </View>
          ) : undefined
        }
        style={styles.row}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 16, gap: 13 },
  selected: { borderWidth: 1.5, borderColor: colors.primary },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
