import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Badge, Tappable, Text } from '@/components/ui';
import { colors, radius } from '@/theme';
import type { Card, CardSecrets, CardStatus } from '@/types';
import { CARD_STATUS_LABELS, CARD_STATUS_TONES_ON_DARK } from './cardPresentation';

export type CardFaceProps = {
  card: Card;
  /** Revealed credentials. Without them the number stays masked. */
  secrets?: CardSecrets;
  /** Compact face for the cards list; full face on the card's own screen. */
  size?: 'list' | 'detail';
  onPress?: () => void;
  /** One line under the number, e.g. why the card cannot be used. */
  footnote?: string;
  testID?: string;
};

/** Ground and ink per state, transcribed from the approved card faces. */
const FACES: Record<CardStatus, { background: string; ink: string; muted: string }> = {
  active: { background: colors.ink, ink: colors.onDark, muted: colors.inkOnDarkMuted },
  frozen: { background: colors.inkSecondary, ink: '#D6DDD9', muted: '#B9C2BE' },
  pending: { background: colors.inkSecondary, ink: '#D6DDD9', muted: '#B9C2BE' },
  expired: { background: colors.inkSecondary, ink: '#D6DDD9', muted: '#B9C2BE' },
  cancelled: { background: colors.inkSecondary, ink: '#D6DDD9', muted: '#B9C2BE' },
};

const NETWORK_LABELS: Record<Card['network'], string> = {
  visa: 'VISA',
  mastercard: 'MASTERCARD',
};

/**
 * The TPay card itself.
 *
 * One component draws every state, so a card can never appear active on one
 * screen and frozen on another. The full number is shown only when the caller
 * passes credentials it has just had authorized.
 */
export function CardFace({
  card,
  secrets,
  size = 'detail',
  onPress,
  footnote,
  testID,
}: CardFaceProps) {
  const face = FACES[card.status];
  const revealed = secrets !== undefined && card.status === 'active';
  const number = revealed ? secrets.pan : `•••• •••• •••• ${card.last4}`;

  const shell = StyleSheet.flatten([
    styles.face,
    size === 'list' ? styles.faceList : styles.faceDetail,
    { backgroundColor: face.background },
  ]) as ViewStyle;

  const body = (
    <>
      <View style={styles.top}>
        <Text variant="rowTitleStrong" color={face.ink} style={styles.wordmark}>
          tpay
        </Text>
        <Badge
          label={CARD_STATUS_LABELS[card.status]}
          tone={CARD_STATUS_TONES_ON_DARK[card.status]}
        />
      </View>

      {size === 'list' ? <CardChip /> : null}

      <View style={styles.bottom}>
        <Text variant="mono" color={face.ink} style={styles.number} numeric testID="card-number">
          {number}
        </Text>
        {footnote ? (
          <Text variant="captionSm" color={face.ink}>
            {footnote}
          </Text>
        ) : (
          <View style={styles.meta}>
            <Text variant="captionSm" color={face.muted} numeric>
              EXP <Text variant="captionSm" color={face.ink}>{card.expiry}</Text>
            </Text>
            <Text variant="captionSm" color={face.muted} numeric>
              CVV{' '}
              <Text variant="captionSm" color={face.ink}>
                {revealed ? secrets.cvv : '•••'}
              </Text>
            </Text>
            <View style={styles.spacer} />
            <Text variant="captionSm" color={face.ink}>
              {NETWORK_LABELS[card.network]}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={shell} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={`${card.holderName} card ending ${card.last4}, ${CARD_STATUS_LABELS[card.status]}`}
      onPress={onPress}
      testID={testID}
      style={shell}
    >
      {body}
    </Tappable>
  );
}

/** The 44×32 chip on the full-size card, as the design draws it. */
function CardChip() {
  return (
    <Svg width={44} height={32}>
      <Defs>
        <LinearGradient id="tpayChip" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} />
          <Stop offset="1" stopColor={colors.primaryOnDarkMuted} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={44} height={32} rx={6} fill="url(#tpayChip)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  face: {
    borderRadius: radius.panel,
    padding: 18,
    justifyContent: 'space-between',
  },
  faceList: { height: 200, padding: 20 },
  faceDetail: { height: 168 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  wordmark: { letterSpacing: 0.26 },
  bottom: { gap: 10 },
  number: { fontSize: 16, letterSpacing: 0.96 },
  meta: { flexDirection: 'row', alignItems: 'flex-end', gap: 20 },
  spacer: { flex: 1 },
});
