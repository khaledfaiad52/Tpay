import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DeliveryTracker, REPLACEMENT_REASON_LABELS } from '@/components/card';
import { ScreenHeader } from '@/components/navigation';
import {
  Banner,
  Button,
  Card as Surface,
  ErrorState,
  Eyebrow,
  Screen,
  Skeleton,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { useCardDetail } from '@/hooks';
import { Icon } from '@/icons';
import { services } from '@/services';
import { colors, radius, spacing } from '@/theme';
import type { CardReplacementReason } from '@/types';

/** What can go wrong with a card, in the order it usually does. */
const REASONS: readonly { reason: CardReplacementReason; description: string }[] = [
  { reason: 'lost', description: "You can't find it, but nobody has used it" },
  { reason: 'stolen', description: 'It was taken, or you have seen payments you did not make' },
  { reason: 'damaged', description: 'It no longer works at a terminal' },
  { reason: 'expired', description: 'It has passed its expiry date' },
];

/**
 * Report a card and order its replacement.
 *
 * Reporting cancels the card immediately — that is the point of reporting it —
 * and a physical replacement is put in the post with a delivery status the
 * card screen then tracks.
 */
export default function ReplaceCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useCardDetail(id);
  const { showToast } = useToast();
  const [reason, setReason] = useState<CardReplacementReason>('lost');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={40} width={200} cornerRadius={radius.lg} />
        <Skeleton height={220} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Replace card" />
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const { card, replacement } = data.data;

  const report = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      const ordered = await services.card.reportLostOrStolen(card.id, reason);
      showToast(`Card cancelled. A replacement is on its way.`);
      data.reload();
      if (ordered.replacementCardId) {
        router.replace({ pathname: '/cards/[id]', params: { id: ordered.replacementCardId } });
      } else {
        router.replace('/cards');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't report that card.");
    } finally {
      setSubmitting(false);
    }
  };

  if (replacement) {
    return (
      <Screen contentStyle={styles.content}>
        <ScreenHeader title="Replacement card" />
        <Surface tone="gold" testID="replace-already">
          <Text variant="caption" color={colors.warningText}>
            {`This card was reported ${REPLACEMENT_REASON_LABELS[replacement.reason].toLowerCase()} and cancelled. A replacement is on its way.`}
          </Text>
        </Surface>
        <Surface padded={false}>
          <DeliveryTracker delivery={replacement.delivery} testID="replace-delivery" />
        </Surface>
        <Button
          label="Back to cards"
          block
          variant="secondary"
          onPress={() => router.replace('/cards')}
          style={styles.cta}
          testID="replace-back"
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Report this card" subtitle={`Card ending ${card.last4}`} />

      <Text variant="rowBody" color={colors.inkSecondary} style={styles.intro}>
        Reporting cancels this card straight away so it cannot be used again. A replacement is
        posted to your address on file.
      </Text>

      <Eyebrow label="What happened?" />
      {REASONS.map((option) => {
        const selected = option.reason === reason;
        return (
          <Tappable
            key={option.reason}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            testID={`replace-reason-${option.reason}`}
            onPress={() => setReason(option.reason)}
            style={StyleSheet.flatten([styles.option, selected && styles.optionSelected])}
          >
            <View style={styles.optionBody}>
              <Text variant="rowTitle">{REPLACEMENT_REASON_LABELS[option.reason]}</Text>
              <Text variant="captionSm" color={colors.inkMuted}>
                {option.description}
              </Text>
            </View>
            {selected ? (
              <Icon name="check" size={18} color={colors.primary} strokeWidth={2.4} />
            ) : null}
          </Tappable>
        );
      })}

      {error ? (
        <Surface tone="danger" testID="replace-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Surface>
      ) : null}

      <Banner>
        If you think someone is using your account, freeze the whole account in Security as well —
        that blocks transfers too, not just this card.
      </Banner>

      <Button
        label="Cancel card and order a replacement"
        block
        variant="danger"
        loading={submitting}
        onPress={report}
        style={styles.cta}
        testID="replace-submit"
      />
      <Button
        label="Message TPay Support instead"
        block
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: '/support/new',
            params: { topic: 'account', subject: `Card ending ${card.last4}` },
          })
        }
        style={styles.secondary}
        testID="replace-support"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  intro: { lineHeight: 20 },
  option: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  optionSelected: { borderWidth: 1.5, borderColor: colors.primary },
  optionBody: { flex: 1, gap: 2 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
  secondary: { borderRadius: 16, paddingVertical: 15 },
});
