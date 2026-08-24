import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Checkbox, FormField, StepHeader, useSendFlow } from '@/components/send';
import { Button, Card, Screen, Text } from '@/components/ui';
import type { RecipientKind } from '@/services';
import type { CurrencyCode } from '@/types';
import { colors } from '@/theme';

/** How each kind of recipient is addressed, and what to call that field. */
const HANDLE_FIELDS: Record<
  RecipientKind,
  { label: string; placeholder: string; monospaced: boolean; keyboard: 'default' | 'phone-pad' }
> = {
  'bank-account': {
    label: 'IBAN or account number',
    placeholder: 'AE12 0260 0010 2233 4455 667',
    monospaced: true,
    keyboard: 'default',
  },
  international: {
    label: 'IBAN or account number',
    placeholder: 'GB29 NWBK 6016 1331 9268 19',
    monospaced: true,
    keyboard: 'default',
  },
  'tpay-user': {
    label: 'TPay username or phone',
    placeholder: '@username',
    monospaced: false,
    keyboard: 'default',
  },
  username: {
    label: 'TPay username',
    placeholder: '@username',
    monospaced: false,
    keyboard: 'default',
  },
  phone: {
    label: 'Phone number',
    placeholder: '+20 10 1234 5678',
    monospaced: false,
    keyboard: 'phone-pad',
  },
  'mobile-wallet': {
    label: 'Mobile wallet number',
    placeholder: '+20 10 1234 5678',
    monospaced: false,
    keyboard: 'phone-pad',
  },
};

/** Countries TPay pays out to, with the currency each one settles in. */
const COUNTRIES: readonly { name: string; currency: CurrencyCode; banks: readonly string[] }[] = [
  { name: 'United Arab Emirates', currency: 'AED', banks: ['Emirates NBD', 'Mashreq', 'ADCB'] },
  { name: 'Saudi Arabia', currency: 'SAR', banks: ['Al Rajhi Bank', 'SNB', 'Riyad Bank'] },
  { name: 'Egypt', currency: 'EGP', banks: ['Banque Misr', 'CIB', 'NBE'] },
  { name: 'United Kingdom', currency: 'GBP', banks: ['Barclays', 'HSBC UK', 'Lloyds'] },
  { name: 'United States', currency: 'USD', banks: ['Chase', 'Bank of America', 'Citi'] },
  { name: 'Germany', currency: 'EUR', banks: ['Deutsche Bank', 'Commerzbank', 'N26'] },
];

/** Mobile wallet operators, by country. */
const WALLETS: Record<string, readonly string[]> = {
  Egypt: ['Vodafone Cash', 'Orange Money', 'Etisalat Cash'],
  'Saudi Arabia': ['STC Pay', 'urpay'],
  'United Arab Emirates': ['e& money', 'Botim Pay'],
};

/** Step 1: who is being paid. */
export default function RecipientScreen() {
  const flow = useSendFlow();
  const kind = flow.kind ?? 'bank-account';
  const field = HANDLE_FIELDS[kind];
  const needsInstitution = kind === 'bank-account' || kind === 'international';
  const needsWallet = kind === 'mobile-wallet';
  const needsCountry = needsInstitution || needsWallet;

  const [name, setName] = useState(flow.recipient?.name ?? '');
  const [handle, setHandle] = useState(flow.recipient?.handle ?? '');
  const [countryIndex, setCountryIndex] = useState(0);
  const [institutionIndex, setInstitutionIndex] = useState(0);
  const [save, setSave] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const country = COUNTRIES[countryIndex];
  const institutions = needsWallet
    ? (WALLETS[country.name] ?? ['Mobile wallet'])
    : country.banks;
  const institution = institutions[institutionIndex % institutions.length];

  const canContinue = name.trim().length > 1 && handle.trim().length > 2;

  const onContinue = async () => {
    if (!canContinue) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await flow.createRecipient({
        kind,
        name: name.trim(),
        handle: handle.trim(),
        country: needsCountry ? country.name : undefined,
        currency: needsCountry ? country.currency : undefined,
        institution: needsCountry ? institution : 'TPay balance',
        save,
      });
      router.push('/send/amount');
    } catch {
      setError("We couldn't save that recipient. Check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <StepHeader title="Recipient" step={1} totalSteps={3} />

      <View style={styles.form}>
        <FormField
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="Ahmed Mansour"
          testID="recipient-name"
        />
        <FormField
          label={field.label}
          value={handle}
          onChangeText={setHandle}
          placeholder={field.placeholder}
          monospaced={field.monospaced}
          keyboardType={field.keyboard}
          autoCapitalize="none"
          testID="recipient-handle"
        />

        {needsCountry ? (
          <>
            <FormField
              label={needsWallet ? 'Wallet provider' : 'Bank'}
              value={institution}
              onPress={() => setInstitutionIndex((index) => index + 1)}
              testID="recipient-institution"
            />
            <FormField
              label="Country"
              value={country.name}
              onPress={() => {
                setCountryIndex((index) => (index + 1) % COUNTRIES.length);
                setInstitutionIndex(0);
              }}
              testID="recipient-country"
            />
          </>
        ) : null}

        <Checkbox
          label="Save this recipient for next time"
          checked={save}
          onChange={setSave}
          testID="recipient-save"
        />
      </View>

      {error ? (
        <Card tone="danger" testID="recipient-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Button
        label="Continue"
        block
        disabled={!canContinue}
        loading={submitting}
        onPress={onContinue}
        style={styles.cta}
        testID="recipient-continue"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  form: { gap: 12, marginTop: 4 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 6 },
});
