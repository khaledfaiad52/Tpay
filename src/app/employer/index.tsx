import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import {
  Button,
  Card,
  DetailRow,
  EmptyState,
  ErrorState,
  FadeInUp,
  IconTile,
  Screen,
  Skeleton,
  StatusPill,
  Tappable,
  Text,
} from '@/components/ui';
import { useEmploymentData, useRefreshOnFocus } from '@/hooks';
import { colors, radius } from '@/theme';
import type { Employment, EmploymentStatus } from '@/types';
import { formatLongDate, formatMoney } from '@/utils';

const STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: 'Active employee',
  onboarding: 'Onboarding',
  'on-leave': 'On leave',
  offboarding: 'Offboarding',
  ended: 'Employment ended',
};

const TYPE_LABELS: Record<Employment['type'], string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contractor: 'Contractor',
};

/** Who you work for, and everything TPay knows about that relationship. */
export default function EmployerScreen() {
  const data = useEmploymentData();
  useRefreshOnFocus(data.reload);

  if (data.status === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="My employer" />
        <Skeleton height={330} cornerRadius={radius.sheet} />
        <Skeleton height={76} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="My employer" />
        <ErrorState
          title="We couldn't load your employer"
          description="Check your connection and try again."
          onRetry={data.reload}
        />
      </Screen>
    );
  }

  const { employment, openRequestCount } = data.data;

  if (!employment) {
    return (
      <Screen>
        <ScreenHeader title="My employer" />
        <EmptyState
          title="No employer linked"
          description="Once your employer connects you to TPay, your employment appears here."
        />
      </Screen>
    );
  }

  const { employer, accountManager } = employment;

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="My employer" />

      <FadeInUp>
        <Card style={styles.panel}>
          <IconTile name="building" tone="gold" size={60} cornerRadius={radius.card} />

          <View style={styles.identity}>
            <Text variant="displayXs">{employer.name}</Text>
            <Text variant="body" color={colors.inkMuted}>
              {employer.location ?? employer.country}
            </Text>
            <StatusPill label={STATUS_LABELS[employment.status]} tone="success" />
          </View>

          <View style={styles.facts}>
            <DetailRow label="Job title" value={employment.jobTitle} divided />
            <DetailRow label="Employed since" value={formatLongDate(employment.startDate)} divided />
            <DetailRow
              label="Employment type"
              value={
                employment.legalEmployer
                  ? `${TYPE_LABELS[employment.type]} · EOR`
                  : TYPE_LABELS[employment.type]
              }
              divided
            />
            <DetailRow
              label="Monthly salary"
              value={`${formatMoney(employment.grossSalary)} gross`}
            />
          </View>

          <Button
            label="Employment details"
            block
            style={styles.panelCta}
            testID="employment-details"
            onPress={() => router.push('/employer/employment')}
          />
        </Card>
      </FadeInUp>

      {accountManager ? (
        <Card style={styles.manager}>
          <View style={styles.managerAvatar}>
            <Text variant="rowTitle" color={colors.primarySoft}>
              {accountManager.initials}
            </Text>
          </View>
          <View style={styles.managerBody}>
            <Text variant="rowTitle">{accountManager.name}</Text>
            <Text variant="captionSm" color={colors.inkMuted}>
              {accountManager.role}
            </Text>
          </View>
          <Tappable
            accessibilityRole="button"
            testID="employer-message"
            onPress={() =>
              router.push({
                pathname: '/support/new',
                params: { topic: 'employer', subject: `Message for ${accountManager.name}` },
              })
            }
            style={styles.messageChip}
          >
            <Text variant="action" color={colors.primary}>
              Message
            </Text>
          </Tappable>
        </Card>
      ) : null}

      <View style={styles.tiles}>
        <Card onPress={() => router.push('/documents')} style={styles.tile} testID="employer-documents">
          <Text variant="label">Documents</Text>
          <Text variant="captionSm" color={colors.inkMuted}>
            Contract, letters, payslips
          </Text>
        </Card>
        <Card onPress={() => router.push('/requests')} style={styles.tile} testID="employer-requests">
          <Text variant="label">Requests</Text>
          <Text variant="captionSm" color={colors.inkMuted}>
            {openRequestCount === 0
              ? 'Nothing open'
              : `${openRequestCount} in progress`}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  panel: { borderRadius: radius.sheet, padding: 20, gap: 16, alignItems: 'center' },
  identity: { alignItems: 'center', gap: 5 },
  facts: {
    alignSelf: 'stretch',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelCta: { alignSelf: 'stretch', borderRadius: radius.xl, paddingVertical: 15 },
  manager: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  managerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managerBody: { flex: 1, gap: 2 },
  messageChip: {
    backgroundColor: colors.primarySoft,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, gap: 8 },
});
