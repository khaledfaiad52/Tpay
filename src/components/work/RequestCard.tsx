import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Text, type BadgeTone } from '@/components/ui';
import { colors } from '@/theme';
import type { EmployeeRequest, RequestStage, RequestStatus } from '@/types';
import { formatShortDate } from '@/utils';
import { RequestProgress } from './RequestProgress';

export type RequestCardProps = {
  request: EmployeeRequest;
  stages: readonly RequestStage[];
  /** Shown on an `action-required` request. */
  onAction?: (request: EmployeeRequest) => void;
  actionLabel?: string;
  onPress?: (request: EmployeeRequest) => void;
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  processing: 'Processing',
  'action-required': 'Action needed',
  completed: 'Completed',
};

const STATUS_TONES: Record<RequestStatus, BadgeTone> = {
  submitted: 'neutral',
  processing: 'pending',
  'action-required': 'pending',
  completed: 'success',
};

/** An open request, with its progress rail and anything it needs from you. */
export function RequestCard({
  request,
  stages,
  onAction,
  actionLabel = 'Upload document',
  onPress,
}: RequestCardProps) {
  const needsAction = request.status === 'action-required';

  return (
    <Card
      onPress={onPress ? () => onPress(request) : undefined}
      style={needsAction ? styles.actionCard : styles.card}
      testID={`request-${request.reference}`}
    >
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text variant="rowTitleStrong">{request.title}</Text>
          <Text variant="captionSm" color={colors.inkMuted}>
            {`${request.reference} · submitted ${formatShortDate(request.submittedAt)}`}
          </Text>
        </View>
        <Badge label={STATUS_LABELS[request.status]} tone={STATUS_TONES[request.status]} />
      </View>

      {needsAction ? (
        <>
          <Text variant="caption" color={colors.inkSecondary} style={styles.actionCopy}>
            {request.actionNeeded}
          </Text>
          {onAction ? (
            <Button
              label={actionLabel}
              variant="ink"
              block
              style={styles.actionButton}
              testID={`request-action-${request.reference}`}
              onPress={() => onAction(request)}
            />
          ) : null}
        </>
      ) : (
        <RequestProgress stages={stages} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  actionCard: { gap: 12, borderWidth: 1.5, borderColor: colors.gold },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heading: { flex: 1, gap: 3 },
  actionCopy: { lineHeight: 18 },
  actionButton: { borderRadius: 12, paddingVertical: 13 },
});
