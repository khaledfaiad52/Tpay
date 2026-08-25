import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { FormField } from '@/components/send';
import { Banner, Button, Card as Surface, Screen, Text, useToast } from '@/components/ui';
import { Icon } from '@/icons';
import { colors } from '@/theme';

/** A PIN is four digits and nothing else. */
const PIN_LENGTH = 4;

/** Sequences and repeats a card issuer would reject outright. */
function pinProblem(pin: string, confirm: string): string | undefined {
  if (!/^\d{4}$/.test(pin)) return 'A PIN is exactly four digits.';
  if (/^(\d)\1{3}$/.test(pin)) return 'Choose a PIN that is not the same digit four times.';
  if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) {
    return 'Choose a PIN that is not four digits in a row.';
  }
  if (confirm !== '' && confirm !== pin) return 'Those two PINs do not match.';
  return undefined;
}

/**
 * Set a new card PIN.
 *
 * There is no card issuer connected yet, so the PIN is validated and
 * acknowledged but never sent anywhere. The screen says so plainly rather than
 * implying the card in the user's pocket has changed.
 */
export default function CardPinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const problem = pin === '' ? undefined : pinProblem(pin, confirm);
  const ready = problem === undefined && pin.length === PIN_LENGTH && confirm === pin;

  const save = () => {
    setSaving(true);
    // Nothing is transmitted: there is no issuer to transmit to. The seam for
    // one is `cardService`, which will take the PIN behind an authorization.
    showToast('PIN checked. It reaches your card once an issuer is connected.');
    setSaving(false);
    router.back();
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Change PIN" subtitle={`Card ${id.slice(-4)}`} />

      <FormField
        label="New PIN"
        value={pin}
        onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
        keyboardType="phone-pad"
        autoCapitalize="none"
        secureTextEntry
        placeholder="••••"
        error={problem}
        testID="card-pin-new"
      />
      <FormField
        label="Confirm new PIN"
        value={confirm}
        onChangeText={(value) => setConfirm(value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
        keyboardType="phone-pad"
        autoCapitalize="none"
        secureTextEntry
        placeholder="••••"
        testID="card-pin-confirm"
      />

      <Surface testID="card-pin-notice">
        <View style={styles.notice}>
          <Icon name="lock" size={17} color={colors.inkMuted} />
          <Text variant="caption" color={colors.inkSecondary} style={styles.noticeCopy}>
            No card issuer is connected yet, so this PIN is checked but not sent anywhere. Your
            card keeps the PIN it has today.
          </Text>
        </View>
      </Surface>

      <Banner>
        Never share your PIN. TPay Support will never ask you for it, in a chat or anywhere else.
      </Banner>

      <Button
        label="Set PIN"
        block
        disabled={!ready}
        loading={saving}
        onPress={save}
        style={styles.cta}
        testID="card-pin-save"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  notice: { flexDirection: 'row', gap: 11 },
  noticeCopy: { flex: 1, lineHeight: 18 },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
});
