import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { FormField } from '@/components/send';
import { Banner, Button, Card, Screen, Text } from '@/components/ui';
import { services } from '@/services';
import { colors } from '@/theme';

/**
 * Step 1 of verification: the legal identity the provider checks against.
 *
 * Only what verification actually needs is asked for — nothing is collected
 * "just in case".
 */
export default function KycPersonalScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const dobValid = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim());
  const complete =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    dobValid &&
    nationality.trim() !== '' &&
    addressLine1.trim() !== '' &&
    city.trim() !== '' &&
    country.trim() !== '';

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      await services.kyc.submitPersonalDetails({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth.trim(),
        nationality: nationality.trim(),
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        country: country.trim(),
      });
      router.replace('/kyc/document');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't save those details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Personal information" subtitle="Step 1 of 2" />

      <Text variant="rowBody" color={colors.inkSecondary} style={styles.intro}>
        Enter your details exactly as they appear on the document you are about to upload.
      </Text>

      <FormField
        label="Legal first name"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Khaled"
        testID="kyc-first-name"
      />
      <FormField
        label="Legal last name"
        value={lastName}
        onChangeText={setLastName}
        placeholder="Faiad"
        testID="kyc-last-name"
      />
      <FormField
        label="Date of birth"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        error={dateOfBirth !== '' && !dobValid ? 'Use the format YYYY-MM-DD.' : undefined}
        testID="kyc-dob"
      />
      <FormField
        label="Nationality"
        value={nationality}
        onChangeText={setNationality}
        placeholder="Lebanese"
        testID="kyc-nationality"
      />
      <FormField
        label="Residential address"
        value={addressLine1}
        onChangeText={setAddressLine1}
        placeholder="4417 Olaya Street"
        testID="kyc-address"
      />
      <FormField label="City" value={city} onChangeText={setCity} placeholder="Riyadh" testID="kyc-city" />
      <FormField
        label="Country of residence"
        value={country}
        onChangeText={setCountry}
        placeholder="Saudi Arabia"
        testID="kyc-country"
      />

      {error ? (
        <Card tone="danger" testID="kyc-personal-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Banner>
        These details go straight to our verification partner. TPay never shares them with your
        employer.
      </Banner>

      <Button
        label="Continue"
        block
        disabled={!complete}
        loading={submitting}
        onPress={submit}
        style={styles.cta}
        testID="kyc-personal-submit"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  intro: { lineHeight: 20 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
});
