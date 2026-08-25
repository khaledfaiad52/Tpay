import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  FadeInUp,
  IconTile,
  ListRow,
  Screen,
  Skeleton,
  Text,
  type BadgeTone,
} from '@/components/ui';
import { Icon } from '@/icons';
import { useBenefitsData, useRefreshOnFocus } from '@/hooks';
import { colors, radius } from '@/theme';
import type { Benefit, BenefitStatus } from '@/types';

const STATUS_LABELS: Record<BenefitStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  'not-eligible': 'Not eligible',
  inactive: 'Inactive',
};

const STATUS_TONES: Record<BenefitStatus, BadgeTone> = {
  active: 'success',
  pending: 'pending',
  'not-eligible': 'neutral',
  inactive: 'neutral',
};

/** Everything the employer provides, easy to browse and easy to understand. */
export default function BenefitsScreen() {
  const data = useBenefitsData();
  useRefreshOnFocus(data.reload);

  const open = (benefit: Benefit) =>
    router.push({ pathname: '/benefits/[id]', params: { id: benefit.id } });

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={30} width={130} cornerRadius={8} />
        <Skeleton height={170} cornerRadius={radius.panel} />
        <Skeleton height={74} />
        <Skeleton height={74} />
        <Skeleton height={74} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <Text variant="screenTitle">Benefits</Text>
        <ErrorState
          title="We couldn't load your benefits"
          description="Check your connection and try again."
          onRetry={data.reload}
        />
      </Screen>
    );
  }

  const { benefits, summary, employerName } = data.data;
  const featured = benefits.find((benefit) => benefit.featured);
  const rest = benefits.filter((benefit) => !benefit.featured);

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.heading}>
        <Text variant="screenTitle">Benefits</Text>
        <Text variant="rowBody" color={colors.inkMuted}>
          {`${summary.activeCount} benefits active through ${employerName}`}
        </Text>
      </View>

      {benefits.length === 0 ? (
        <EmptyState
          title="No benefits yet"
          description="When your employer adds benefits, they will appear here."
        />
      ) : null}

      {featured ? (
        <FadeInUp>
          <Card
            tone="dark"
            onPress={() => open(featured)}
            style={styles.featured}
            testID={`benefit-${featured.id}`}
          >
            <View style={styles.featuredHeader}>
              <View style={styles.featuredTile}>
                <Icon name={featured.icon} size={18} color={colors.primarySoft} />
              </View>
              <View style={styles.featuredBadge}>
                <Text variant="badge" color={colors.successOnDark}>
                  {featured.statusLabel ?? STATUS_LABELS[featured.status]}
                </Text>
              </View>
            </View>
            <Text variant="featureTitle" color={colors.onDark}>
              {featured.name}
            </Text>
            <Text variant="caption" color={colors.primaryOnDark} style={styles.featuredCopy}>
              {featured.summary}
            </Text>
            <Text variant="action" color={colors.onDark}>
              View coverage ›
            </Text>
          </Card>
        </FadeInUp>
      ) : null}

      <View style={styles.list}>
        {rest.map((benefit) => {
          const unavailable = benefit.status === 'not-eligible' || benefit.status === 'inactive';
          return (
            <Card
              key={benefit.id}
              padded={false}
              onPress={() => open(benefit)}
              style={unavailable ? styles.unavailable : undefined}
              testID={`benefit-${benefit.id}`}
            >
              <ListRow
                leading={
                  <IconTile
                    name={benefit.icon}
                    tone={unavailable ? 'neutral' : 'primary'}
                    size={40}
                  />
                }
                title={benefit.name}
                subtitle={benefit.summary}
                trailing={
                  <Badge
                    label={benefit.statusLabel ?? STATUS_LABELS[benefit.status]}
                    tone={STATUS_TONES[benefit.status]}
                  />
                }
                style={styles.row}
              />
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  heading: { gap: 6 },
  featured: { borderRadius: radius.panel, padding: 18, gap: 12 },
  featuredHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featuredTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.overlayOnDarkStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBadge: {
    backgroundColor: colors.overlayOnDarkStrong,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  featuredCopy: { lineHeight: 18 },
  list: { gap: 10 },
  row: { paddingVertical: 16, gap: 13 },
  unavailable: { opacity: 0.62 },
});
