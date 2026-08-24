import { StyleSheet, View } from 'react-native';

import { Eyebrow, Tappable, Text } from '@/components/ui';
import { appConfig, services } from '@/services';
import { colors, radius } from '@/theme';

/**
 * Demo outcomes, expressed as a payout partner's own vocabulary.
 *
 * These go through `handleKycCallback` — the same seam a real webhook lands
 * on — so exercising a state here exercises the production path rather than a
 * backdoor into the store.
 */
const OUTCOMES: readonly { readonly label: string; readonly providerStatus: string; readonly reason?: string }[] = [
  { label: 'Start over', providerStatus: 'created' },
  { label: 'In review', providerStatus: 'in_review' },
  {
    label: 'Needs action',
    providerStatus: 'requires_action',
    reason: 'We need a recent proof of address — a utility bill or bank statement.',
  },
  { label: 'Verified', providerStatus: 'approved' },
  {
    label: 'Declined',
    providerStatus: 'declined',
    reason: 'We could not match the document to your details.',
  },
  { label: 'Suspended', providerStatus: 'suspended' },
];

export type KycDemoControlsProps = {
  /** Called once the mock callback has been applied. */
  onApplied: () => void;
};

/**
 * Demo-only shortcuts for walking every verification state.
 *
 * Clearly labelled so it can never be mistaken for a product control, and the
 * whole component drops out when a real verification backend is wired in.
 */
export function KycDemoControls({ onApplied }: KycDemoControlsProps) {
  // Off unless EXPO_PUBLIC_ENABLE_KYC_DEMO=true, so a production build never
  // renders it. The callback abstraction underneath is unaffected.
  const enabled = appConfig.demo.kyc;

  const apply = async (providerStatus: string, reason?: string) => {
    await services.kyc.handleKycCallback({ sessionId: 'kyc_demo', providerStatus, reason });
    onApplied();
  };

  if (!enabled) return null;

  return (
    <View style={styles.block}>
      <Eyebrow label="Demo · simulate a reviewer outcome" />
      <View style={styles.row}>
        {OUTCOMES.map((outcome) => (
          <Tappable
            key={outcome.providerStatus}
            accessibilityRole="button"
            testID={`kyc-demo-${outcome.providerStatus}`}
            onPress={() => apply(outcome.providerStatus, outcome.reason)}
            style={styles.chip}
          >
            <Text variant="captionSm" color={colors.inkMuted}>
              {outcome.label}
            </Text>
          </Tappable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
