import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { RequestCard } from '@/components/work';
import {
  Card,
  EmptyState,
  ErrorState,
  Eyebrow,
  FadeInUp,
  ListRow,
  Screen,
  Skeleton,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { useRefreshOnFocus, useRequestsData } from '@/hooks';
import { services } from '@/services';
import { colors, radius } from '@/theme';
import type { EmployeeRequest } from '@/types';
import { formatShortDate } from '@/utils';

/** The employee service centre: what you asked for, and where it has got to. */
export default function RequestsScreen() {
  const requests = useRequestsData();
  useRefreshOnFocus(requests.reload);
  const { showToast } = useToast();

  const supplyDocument = async (request: EmployeeRequest) => {
    try {
      await services.requests.resolveAction(request.id, 'Receipt supplied from the TPay app');
      requests.reload();
      showToast(`Thanks — ${request.reference} is back with HR`);
    } catch {
      showToast("We couldn't update that request");
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader
        title="Requests"
        trailing={
          <Tappable
            accessibilityRole="button"
            testID="requests-new"
            onPress={() => router.push('/requests/new')}
            style={styles.newChip}
          >
            <Text variant="action" color={colors.onDark}>
              New
            </Text>
          </Tappable>
        }
      />

      {requests.status === 'loading' ? (
        <>
          <Skeleton height={150} />
          <Skeleton height={170} />
        </>
      ) : requests.status === 'error' ? (
        <ErrorState
          title="We couldn't load your requests"
          description="Check your connection and try again."
          onRetry={requests.reload}
        />
      ) : (
        <RequestsList data={requests.data} onAction={supplyDocument} />
      )}
    </Screen>
  );
}

function RequestsList({
  data,
  onAction,
}: {
  data: { open: readonly EmployeeRequest[]; completed: readonly EmployeeRequest[] };
  onAction: (request: EmployeeRequest) => void;
}) {
  if (data.open.length === 0 && data.completed.length === 0) {
    return (
      <EmptyState
        title="No active requests"
        description="Ask for a letter, an expense claim or HR help — we'll track it here."
        actionLabel="New request"
        onActionPress={() => router.push('/requests/new')}
      />
    );
  }

  return (
    <>
      {data.open.map((request) => (
        <FadeInUp key={request.id}>
          <RequestCard
            request={request}
            stages={services.requests.getStages(request.status)}
            onAction={onAction}
          />
        </FadeInUp>
      ))}

      {data.open.length === 0 ? (
        <EmptyState
          title="Nothing open"
          description="Every request you've made has been dealt with."
          actionLabel="New request"
          onActionPress={() => router.push('/requests/new')}
        />
      ) : null}

      {data.completed.length > 0 ? (
        <View style={styles.completed}>
          <Eyebrow label="Completed" />
          <Card padded={false}>
            {data.completed.map((request, index) => (
              <ListRow
                key={request.id}
                title={request.title}
                subtitle={
                  request.completedAt
                    ? `Completed ${formatShortDate(request.completedAt)}`
                    : request.reference
                }
                divided={index < data.completed.length - 1}
                trailing={
                  <Text variant="badge" color={colors.success}>
                    Done
                  </Text>
                }
                style={styles.completedRow}
              />
            ))}
          </Card>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  newChip: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: radius.md,
  },
  completed: { gap: 10 },
  completedRow: { paddingVertical: 15, gap: 12 },
});
