import { StyleSheet, View } from 'react-native';

import { Badge, ListRow, Text, type BadgeTone } from '@/components/ui';
import { colors, radius } from '@/theme';
import type { DocumentStatus, EmployeeDocument } from '@/types';

export type DocumentRowProps = {
  document: EmployeeDocument;
  onPress: (document: EmployeeDocument) => void;
  divided?: boolean;
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  signed: 'Signed',
  valid: 'Valid',
  active: 'Active',
  expiring: 'Expiring',
  expired: 'Expired',
  issued: 'Issued',
  unavailable: 'Not ready',
};

const STATUS_TONES: Record<DocumentStatus, BadgeTone> = {
  signed: 'success',
  valid: 'success',
  active: 'success',
  expiring: 'pending',
  expired: 'danger',
  issued: 'neutral',
  unavailable: 'neutral',
};

/** A document, with the paper thumbnail the design draws beside it. */
export function DocumentRow({ document, onPress, divided = false }: DocumentRowProps) {
  const isBundle = document.format === 'bundle';

  return (
    <ListRow
      leading={<DocumentThumbnail label={isBundle ? `×${document.itemCount ?? ''}` : 'PDF'} />}
      title={document.title}
      subtitle={document.subtitle}
      divided={divided}
      onPress={() => onPress(document)}
      showChevron={isBundle}
      trailing={
        isBundle ? undefined : (
          <Badge label={STATUS_LABELS[document.status]} tone={STATUS_TONES[document.status]} />
        )
      }
      style={styles.row}
    />
  );
}

/** The small sheet-of-paper mark that stands in for a file preview. */
export function DocumentThumbnail({
  label = 'PDF',
  width = 34,
  height = 42,
}: {
  label?: string;
  width?: number;
  height?: number;
}) {
  return (
    <View style={[styles.thumbnail, { width, height }]}>
      <Text variant="thumbnail" color={colors.inkMuted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 15, gap: 13 },
  thumbnail: {
    borderRadius: radius.xs,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
});
