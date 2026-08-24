import { StyleSheet } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import {
  Card,
  DetailRow,
  EmptyState,
  ErrorState,
  Eyebrow,
  FadeInUp,
  Screen,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { useEmploymentData } from '@/hooks';
import { colors } from '@/theme';
import type { ContractStatus, Employment } from '@/types';
import { formatLongDate, formatMoney, formatShortDate } from '@/utils';

const CONTRACT_LABELS: Record<ContractStatus, string> = {
  signed: 'Signed · active',
  'pending-signature': 'Awaiting your signature',
  expired: 'Expired',
};

const TYPE_LABELS: Record<Employment['type'], string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contractor: 'Contractor',
};

/** The full contractual picture, grouped the way the approved screen groups it. */
export default function EmploymentDetailsScreen() {
  const data = useEmploymentData();
  const { showToast } = useToast();

  if (data.status === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="Employment details" />
        <Skeleton height={16} width={110} cornerRadius={4} />
        <Skeleton height={300} />
        <Skeleton height={16} width={110} cornerRadius={4} />
        <Skeleton height={200} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Employment details" />
        <ErrorState
          title="We couldn't load your employment"
          description="Check your connection and try again."
          onRetry={data.reload}
        />
      </Screen>
    );
  }

  const { employment, nextSalary } = data.data;

  if (!employment) {
    return (
      <Screen>
        <ScreenHeader title="Employment details" />
        <EmptyState
          title="No employment on file"
          description="Your employment details appear once your employer connects you to TPay."
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Employment details" />

      <Eyebrow label="Employment" />
      <FadeInUp>
        <Card padded={false}>
          <DetailRow label="Employer" value={employment.employer.name} divided />
          {employment.legalEmployer ? (
            <DetailRow label="Legal employer" value={employment.legalEmployer} divided />
          ) : null}
          <DetailRow label="Position" value={employment.jobTitle} divided />
          {employment.department ? (
            <DetailRow label="Department" value={employment.department} divided />
          ) : null}
          <DetailRow label="Employment type" value={TYPE_LABELS[employment.type]} divided />
          <DetailRow label="Start date" value={formatLongDate(employment.startDate)} divided />
          <DetailRow label="Country" value={employment.country} divided />
          <DetailRow
            label="Contract status"
            value={CONTRACT_LABELS[employment.contractStatus]}
            valueColor={employment.contractStatus === 'signed' ? colors.success : colors.warning}
          />
        </Card>
      </FadeInUp>

      <Eyebrow label="Compensation" />
      <Card padded={false}>
        <DetailRow label="Monthly gross" value={formatMoney(employment.grossSalary)} divided />
        <DetailRow label="Currency" value={employment.grossSalary.currency} divided />
        <DetailRow label="Pay frequency" value={employment.payScheduleLabel} divided />
        <DetailRow
          label="Next salary"
          value={nextSalary ? formatShortDate(nextSalary.payDate) : 'Not scheduled'}
        />
      </Card>

      {employment.accountManager ? (
        <>
          <Eyebrow label="Talento" />
          <Card padded={false}>
            <DetailRow
              label="Account manager"
              value={employment.accountManager.name}
              divided
            />
            <DetailRow label="Employer of record" value={employment.legalEmployer ?? '—'} />
          </Card>
          <Text
            variant="captionSm"
            color={colors.inkFaint}
            style={styles.footnote}
            onPress={() => showToast('Support chat arrives with Profile in the next phase')}
          >
            Talento is your employer of record. TPay is where you get paid.
          </Text>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  footnote: { textAlign: 'center', lineHeight: 16, marginTop: 4 },
});
