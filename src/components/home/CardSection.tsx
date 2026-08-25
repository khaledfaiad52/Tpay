import { StyleSheet, View } from 'react-native';

import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  CARD_FORMAT_LABELS,
  CARD_STATUS_LABELS,
  CARD_STATUS_TONES_ON_DARK,
} from '@/components/card';
import { Badge, Card as Surface, EmptyState, SectionHeader, Text } from '@/components/ui';
import { colors } from '@/theme';
import type { Card } from '@/types';

export type CardSectionProps = {
  card: Card | null;
  onManage: () => void;
  onOpenCard: () => void;
};

/**
 * The TPay Card summary. The caption states plainly that the card spends from
 * the wallet balance — there is no separate card balance anywhere in TPay.
 */
export function CardSection({ card, onManage, onOpenCard }: CardSectionProps) {
  return (
    <View style={{ gap: 10 }}>
      <SectionHeader
        title="Your card"
        actionLabel={card ? 'Manage' : undefined}
        onActionPress={card ? onManage : undefined}
      />
      {card ? (
        <Surface tone="ink" onPress={onOpenCard} style={styles.card}>
          <CardChip />
          <View style={styles.body}>
            <Text variant="label" color={colors.onDark}>
              {`TPay Card · ${CARD_FORMAT_LABELS[card.format]}`}
            </Text>
            <Text variant="captionSm" color={colors.inkOnDarkMuted}>
              {`•••• ${card.last4} · spends from your balance`}
            </Text>
          </View>
          <Badge
            label={CARD_STATUS_LABELS[card.status]}
            tone={CARD_STATUS_TONES_ON_DARK[card.status]}
          />
        </Surface>
      ) : (
        <EmptyState
          title="No cards yet"
          description="Your TPay card will appear here once your employer activates it."
        />
      )}
    </View>
  );
}

/** The 52×34 card thumbnail: a 135° sweep from brand green to deep green. */
function CardChip() {
  return (
    <Svg width={52} height={34}>
      <Defs>
        <LinearGradient id="tpayCardChip" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} />
          <Stop offset="1" stopColor={colors.primaryDark} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={52} height={34} rx={7} fill="url(#tpayCardChip)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  body: { flex: 1, gap: 3 },
});
