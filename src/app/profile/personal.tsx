import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { FormField } from '@/components/send';
import {
  Banner,
  Button,
  Card,
  DetailRow,
  ErrorState,
  Eyebrow,
  Screen,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { useProfileData } from '@/hooks';
import { services } from '@/services';
import { colors, radius } from '@/theme';
import type { PostalAddress } from '@/types';
import { formatLongDate } from '@/utils';

/**
 * The details TPay holds about you.
 *
 * Legal name, date of birth and nationality come from verification and cannot
 * be edited here — changing them means going through verification again.
 */
export default function PersonalInformationScreen() {
  const data = useProfileData();
  const { showToast } = useToast();
  const [email, setEmail] = useState<string>();
  const [phone, setPhone] = useState<string>();
  const [line1, setLine1] = useState<string>();
  const [city, setCity] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={40} width={200} cornerRadius={radius.lg} />
        <Skeleton height={190} cornerRadius={radius.card} />
        <Skeleton height={190} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Personal information" />
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const { user } = data.data;
  // Address, date of birth and nationality arrive with verification, so a
  // not-yet-verified account may have none of them.
  const address: PostalAddress = user.address ?? { line1: '', city: '', country: user.country };
  const emailValue = email ?? user.email;
  const phoneValue = phone ?? user.phone;
  const line1Value = line1 ?? address.line1;
  const cityValue = city ?? address.city;

  const dirty =
    emailValue !== user.email ||
    phoneValue !== user.phone ||
    line1Value !== address.line1 ||
    cityValue !== address.city;

  const save = async () => {
    setSaving(true);
    setError(undefined);
    try {
      await services.user.updateProfile({
        email: emailValue,
        phone: phoneValue,
        address: { ...address, line1: line1Value, city: cityValue },
      });
      showToast('Your details were updated');
      data.reload();
      router.back();
    } catch {
      setError("We couldn't save those details. Try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Personal information" />

      <Eyebrow label="Verified identity" />
      <Card padded={false}>
        <DetailRow label="Legal name" value={`${user.firstName} ${user.lastName}`} divided />
        <DetailRow
          label="Date of birth"
          value={user.dateOfBirth ? formatLongDate(user.dateOfBirth) : 'Not yet provided'}
          divided
        />
        <DetailRow label="Nationality" value={user.nationality ?? 'Not yet provided'} divided />
        <DetailRow label="Country of residence" value={user.country} />
      </Card>
      <Banner>
        Your legal name and date of birth come from identity verification. To change them, start
        verification again or message TPay Support.
      </Banner>

      <Eyebrow label="Contact" />
      <FormField
        label="Email"
        value={emailValue}
        onChangeText={setEmail}
        autoCapitalize="none"
        testID="profile-email"
      />
      <FormField
        label="Mobile number"
        value={phoneValue}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        testID="profile-phone"
      />

      <Eyebrow label="Address" />
      <FormField
        label="Street address"
        value={line1Value}
        onChangeText={setLine1}
        testID="profile-address-line1"
      />
      <FormField label="City" value={cityValue} onChangeText={setCity} testID="profile-city" />
      <Card padded={false}>
        <DetailRow label="Region" value={address.region ?? '—'} divided />
        <DetailRow label="Postal code" value={address.postalCode ?? '—'} divided />
        <DetailRow label="Country" value={address.country} />
      </Card>

      {error ? (
        <Card tone="danger" testID="profile-save-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Button
        label="Save changes"
        block
        disabled={!dirty}
        loading={saving}
        onPress={save}
        style={styles.cta}
        testID="profile-save"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
});
