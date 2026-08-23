import { Card, Screen, Text } from '@/components/ui';
import { colors } from '@/theme';
import { ScreenHeader } from './ScreenHeader';

export type PhasePlaceholderProps = {
  title: string;
  /** Which build phase delivers this screen. */
  phase: string;
  /** What the finished screen will contain, in the user's own terms. */
  summary: string;
  /** Tab roots have nothing to pop, so they render without a back control. */
  showBack?: boolean;
};

/**
 * Stand-in for a screen scheduled for a later phase.
 *
 * Home links to every one of these, so navigation and back-navigation are
 * exercised end-to-end from day one and no tap is a dead end.
 */
export function PhasePlaceholder({ title, phase, summary, showBack = true }: PhasePlaceholderProps) {
  return (
    <Screen>
      {showBack ? (
        <ScreenHeader title={title} />
      ) : (
        <Text variant="screenTitle">{title}</Text>
      )}
      <Card style={{ gap: 8 }}>
        <Text variant="action" color={colors.primary}>
          {phase}
        </Text>
        <Text variant="sectionTitle">{`${title} is not built yet`}</Text>
        <Text variant="caption" color={colors.inkMuted} style={{ lineHeight: 18 }}>
          {summary}
        </Text>
      </Card>
    </Screen>
  );
}
