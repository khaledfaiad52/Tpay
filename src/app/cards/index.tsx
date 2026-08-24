import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RestrictionNotice } from '@/components/account';
import { CardFace, cardBlockedReason } from '@/components/card';
import { ScreenHeader } from '@/components/navigation';
import {
  Badge,
  Card as Surface,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { useCardsData, useRefreshOnFocus } from '@/hooks';
import { Icon } from '@/icons';
import { services } from '@/services';
import { colors, radius, spacing } from '@/theme';
import type { Card } from '@/types';
import { formatMoney } from '@/utils';

/**
 * Every card on the account.
 *
 * The physical card leads, virtual cards follow, and a new virtual card is one
 * tap away — the order the approved screen uses.
 */
export default function CardsScreen() {
  const data = useCardsData();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  useRefreshOnFocus(data.reload);

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={40} width={140} cornerRadius={radius.lg} />
        <Skeleton height={200} cornerRadius={radius.panel} />
        <Skeleton height={78} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Cards" />
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const { cards, accountState, availableBalance } = data.data;
  const physical = cards.filter((card) => card.format === 'physical');
  const virtual = cards.filter((card) => card.format === 'virtual');

  const open = (card: Card) =>
    router.push({ pathname: '/cards/[id]', params: { id: card.id } });

  const createVirtual = async () => {
    setCreating(true);
    try {
      const card = await services.card.createVirtualCard();
      showToast(`Virtual card •••• ${card.last4} created`);
      data.reload();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "We couldn't create that card.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Cards" />

      {accountState.restriction ? (
        <RestrictionNotice restriction={accountState.restriction} testID="cards-restriction" />
      ) : null}

      {cards.length === 0 ? (
        <EmptyState
          title="No cards yet"
          description="Your TPay card will appear here once your employer activates it."
        />
      ) : null}

      {physical.map((card) => (
        <CardFace
          key={card.id}
          card={card}
          size="list"
          onPress={() => open(card)}
          footnote={cardBlockedReason(card)}
          testID={`card-face-${card.id}`}
        />
      ))}

      {virtual.map((card) => (
        <Surface key={card.id} onPress={() => open(card)} testID={`card-row-${card.id}`}>
          <View style={styles.row}>
            <View style={styles.thumbnail} />
            <View style={styles.rowBody}>
              <Text variant="rowTitle">Virtual card</Text>
              <Text variant="mono" color={colors.inkMuted} numeric>
                {`•••• ${card.last4}`}
              </Text>
            </View>
            {card.status === 'active' ? (
              <View style={styles.onlineOnly}>
                <Text variant="badge" color={colors.info}>
                  Online only
                </Text>
              </View>
            ) : (
              <Badge label="Frozen" tone="neutral" />
            )}
          </View>
        </Surface>
      ))}

      <Tappable
        accessibilityRole="button"
        testID="cards-create-virtual"
        disabled={creating}
        onPress={createVirtual}
        style={styles.create}
      >
        <View style={styles.createIcon}>
          <Icon name="plus" size={20} color={colors.inkMuted} />
        </View>
        <View style={styles.rowBody}>
          <Text variant="rowTitle" color={colors.inkSecondary}>
            Create a virtual card
          </Text>
          <Text variant="captionSm" color={colors.inkMuted}>
            Instant, free, up to 5 cards
          </Text>
        </View>
      </Tappable>

      <Surface tone="tinted" testID="cards-one-balance">
        <View style={styles.balance}>
          <View style={styles.rowBody}>
            <Text variant="action" color={colors.primaryDark}>
              Every card spends from your TPay balance
            </Text>
            <Text variant="captionSm" color={colors.primaryOnDarkSubtle}>
              One balance · no separate card top-up
            </Text>
          </View>
          <Text variant="amountMd" color={colors.primaryDark} numeric testID="cards-balance">
            {formatMoney(availableBalance)}
          </Text>
        </View>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  rowBody: { flex: 1, gap: 2 },
  thumbnail: {
    width: 46,
    height: 30,
    borderRadius: 6,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
  },
  onlineOnly: {
    backgroundColor: colors.infoSoft,
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  create: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  createIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
