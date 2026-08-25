import { StyleSheet } from 'react-native';

import { Card, IconTile, ListRow } from '@/components/ui';
import type { IconName } from '@/icons';
import type { RecipientKind } from '@/services';

export type SendMethod = {
  readonly kind: RecipientKind;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: IconName;
};

export type SendMethodRowProps = {
  method: SendMethod;
  onPress: (kind: RecipientKind) => void;
};

/** One way to address a recipient. All of them lead into the same flow. */
export function SendMethodRow({ method, onPress }: SendMethodRowProps) {
  return (
    <Card padded={false} onPress={() => onPress(method.kind)} testID={`send-method-${method.kind}`}>
      <ListRow
        leading={<IconTile name={method.icon} tone="primary" size={42} cornerRadius={14} />}
        title={method.title}
        subtitle={method.subtitle}
        showChevron
        style={styles.row}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 17, gap: 14 },
});
