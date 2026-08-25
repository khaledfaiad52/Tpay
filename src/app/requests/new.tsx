import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { FormField } from '@/components/send';
import { Button, Card, Screen, Tappable, Text, useToast } from '@/components/ui';
import { services } from '@/services';
import { colors, fonts, inputReset, radius } from '@/theme';
import type { RequestType } from '@/types';

type RequestOption = {
  readonly type: RequestType;
  readonly title: string;
  readonly subtitle: string;
  /** Prompt above the "addressed to" field, when the type needs one. */
  readonly addresseeLabel?: string;
  readonly addresseeHint?: string;
};

/** What an employee can ask for, in the order the approved screen lists it. */
const OPTIONS: readonly RequestOption[] = [
  {
    type: 'employment-letter',
    title: 'Employment letter',
    subtitle: 'For banks & embassies',
    addresseeLabel: 'Addressed to',
    addresseeHint: "We'll include your role, salary and start date",
  },
  { type: 'payslip', title: 'Payslip copy', subtitle: 'Instant PDF' },
  { type: 'payroll-question', title: 'Payroll question', subtitle: 'Salary & deductions' },
  { type: 'insurance-support', title: 'Insurance support', subtitle: 'Claims & cards' },
  { type: 'reimbursement', title: 'Reimbursement', subtitle: 'Upload receipts' },
  { type: 'hr-support', title: 'Something else', subtitle: 'Talk to HR' },
];

/** Ask HR for something. One short form, whatever the request. */
export default function NewRequestScreen() {
  const { showToast } = useToast();
  const [selected, setSelected] = useState<RequestType>('employment-letter');
  const [addressedTo, setAddressedTo] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const option = OPTIONS.find((candidate) => candidate.type === selected)!;

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      const request = await services.requests.createRequest({
        type: selected,
        addressedTo: addressedTo.trim() || undefined,
        note: note.trim() || undefined,
      });
      showToast(`Request submitted — ${request.reference}`);
      router.replace('/requests');
    } catch {
      setError("We couldn't submit that request. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="New request" />

      <Text variant="action" color={colors.inkSecondary}>
        What do you need?
      </Text>

      <View style={styles.grid}>
        {OPTIONS.map((candidate) => {
          const isSelected = candidate.type === selected;
          return (
            <Tappable
              key={candidate.type}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              testID={`request-type-${candidate.type}`}
              onPress={() => setSelected(candidate.type)}
              style={[styles.option, isSelected ? styles.optionSelected : styles.optionIdle]}
            >
              <Text variant="label" color={isSelected ? colors.onDark : colors.ink}>
                {candidate.title}
              </Text>
              <Text
                variant="captionSm"
                color={isSelected ? colors.primaryOnDark : colors.inkMuted}
              >
                {candidate.subtitle}
              </Text>
            </Tappable>
          );
        })}
      </View>

      {option.addresseeLabel ? (
        <View style={styles.field}>
          <FormField
            label={option.addresseeLabel}
            value={addressedTo}
            onChangeText={setAddressedTo}
            placeholder="Emirates NBD — account opening"
            testID="request-addressed-to"
          />
          {option.addresseeHint ? (
            <Text variant="captionSm" color={colors.inkMuted}>
              {option.addresseeHint}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.field}>
        <Text variant="action" color={colors.inkSecondary}>
          Reason (optional)
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add context for your HR team…"
          placeholderTextColor={colors.inkFaint}
          multiline
          accessibilityLabel="Reason"
          testID="request-note"
          style={styles.note}
        />
      </View>

      {error ? (
        <Card tone="danger" testID="request-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Button
        label="Submit request"
        block
        loading={submitting}
        onPress={submit}
        style={styles.cta}
        testID="request-submit"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    /** Two per row, allowing for the 10pt gap. */
    width: '48%',
    flexGrow: 1,
    borderRadius: 18,
    padding: 15,
    gap: 7,
  },
  optionSelected: { backgroundColor: colors.primary },
  optionIdle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  field: { gap: 7 },
  note: {
    // The reset clears the platform's own chrome first; this field then draws
    // the border the design gives it.
    ...inputReset,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 15,
    minHeight: 80,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  cta: { borderRadius: 16, paddingVertical: 17 },
});
