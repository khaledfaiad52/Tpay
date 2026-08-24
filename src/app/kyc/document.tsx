import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { Banner, Button, Card, Screen, Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import { services } from '@/services';
import type { KycDocumentSubmission } from '@/services';
import { colors, radius, spacing } from '@/theme';

type DocumentOption = {
  readonly type: KycDocumentSubmission['documentType'];
  readonly title: string;
  readonly subtitle: string;
};

const OPTIONS: readonly DocumentOption[] = [
  { type: 'national-id', title: 'National ID', subtitle: 'Front and back' },
  { type: 'passport', title: 'Passport', subtitle: 'Photo page' },
  { type: 'residence-permit', title: 'Residence permit', subtitle: 'Front and back' },
];

/**
 * Step 2 of verification: which document is being used.
 *
 * The file itself never reaches the app — capture happens in the provider's
 * own hosted flow, and TPay records only that the step was completed.
 */
export default function KycDocumentScreen() {
  const [selected, setSelected] = useState<DocumentOption>(OPTIONS[0]!);
  const [captured, setCaptured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const capture = async () => {
    setError(undefined);
    try {
      // The hosted session is where the camera actually runs. Opening it is
      // what marks the document as captured.
      await services.kyc.createKycSession();
      setCaptured(true);
    } catch {
      setError("We couldn't start the document check. Try again in a moment.");
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      await services.kyc.submitIdentityDocument({
        documentType: selected.type,
        documentLabel: selected.title,
      });
      router.replace('/kyc/review');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't record that document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Identity document" subtitle="Step 2 of 2" />

      <Text variant="rowBody" color={colors.inkSecondary} style={styles.intro}>
        Choose the document you want to verify with. Have it to hand — the check takes about
        twenty seconds.
      </Text>

      {OPTIONS.map((option) => {
        const isSelected = option.type === selected.type;
        return (
          <Tappable
            key={option.type}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            testID={`kyc-document-${option.type}`}
            onPress={() => {
              setSelected(option);
              setCaptured(false);
            }}
            style={StyleSheet.flatten([styles.option, isSelected && styles.optionSelected])}
          >
            <View style={[styles.disc, isSelected ? styles.discSelected : styles.discIdle]}>
              <Icon
                name="id-card"
                size={17}
                color={isSelected ? colors.primary : colors.inkMuted}
              />
            </View>
            <View style={styles.optionBody}>
              <Text variant="rowTitle">{option.title}</Text>
              <Text variant="captionSm" color={colors.inkMuted}>
                {option.subtitle}
              </Text>
            </View>
            {isSelected ? <Icon name="check" size={18} color={colors.primary} strokeWidth={2.4} /> : null}
          </Tappable>
        );
      })}

      <Card tone={captured ? 'tinted' : 'plain'} testID="kyc-capture-state">
        <View style={styles.captureRow}>
          <Icon
            name={captured ? 'check' : 'face-scan'}
            size={18}
            color={captured ? colors.success : colors.primary}
            strokeWidth={captured ? 2.4 : 1.9}
          />
          <View style={styles.optionBody}>
            <Text variant="rowTitle">
              {captured ? `${selected.title} captured` : 'Photo and liveness check'}
            </Text>
            <Text variant="captionSm" color={colors.inkMuted}>
              {captured
                ? 'Ready to submit for review.'
                : 'Opens the secure capture session. Takes about 20 seconds.'}
            </Text>
          </View>
        </View>
      </Card>

      {error ? (
        <Card tone="danger" testID="kyc-document-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Banner>
        Photos are captured by our verification partner and encrypted end to end. They are used
        only to confirm your identity.
      </Banner>

      {captured ? (
        <Button
          label="Continue"
          block
          loading={submitting}
          onPress={submit}
          style={styles.cta}
          testID="kyc-document-submit"
        />
      ) : (
        <Button
          label={`Start ${selected.title.toLowerCase()} check`}
          block
          onPress={capture}
          style={styles.cta}
          testID="kyc-document-capture"
        />
      )}
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
  disc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  discSelected: { backgroundColor: colors.primarySoft },
  discIdle: { backgroundColor: colors.surfaceMuted },
  captureRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
});
