import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AuthHeader } from '@/components/auth';
import { Button, Screen, Text } from '@/components/ui';
import { Icon, type IconName } from '@/icons';
import { colors } from '@/theme';

/** What TPay is, in the order it matters to someone who has just been hired. */
const PROMISES: readonly { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'banknote',
    title: 'Your salary, on time',
    body: 'Paid straight into your own TPay account, in the currency you choose.',
  },
  {
    icon: 'send',
    title: 'Send money anywhere',
    body: 'To a bank, a mobile wallet or another TPay user, at the live rate.',
  },
  {
    icon: 'shield-check',
    title: 'Benefits and documents',
    body: 'Insurance, payslips and employment letters, without emailing anyone.',
  },
];

/** The first screen anyone sees. Leads to signing in or creating an account. */
export default function WelcomeScreen() {
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        <AuthHeader />

        <View style={styles.headline}>
          <Text variant="screenTitle">Everything you earn, in one place.</Text>
          <Text variant="rowBody" color={colors.inkMuted} style={styles.lede}>
            TPay is where your employer pays you, and where your money lives afterwards.
          </Text>
        </View>

        <View style={styles.promises}>
          {PROMISES.map((promise) => (
            <View key={promise.title} style={styles.promise}>
              <View style={styles.promiseIcon}>
                <Icon name={promise.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.promiseBody}>
                <Text variant="rowTitle">{promise.title}</Text>
                <Text variant="captionSm" color={colors.inkMuted} style={styles.promiseCopy}>
                  {promise.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label="Create an account"
          block
          onPress={() => router.push('/(auth)/signup')}
          style={styles.cta}
          testID="welcome-signup"
        />
        <Button
          label="I already have an account"
          block
          variant="secondary"
          onPress={() => router.push('/(auth)/login')}
          style={styles.secondary}
          testID="welcome-login"
        />
        <Text variant="captionSm" color={colors.inkFaint} style={styles.legal}>
          By continuing you agree to TPay&apos;s Terms and Privacy Policy.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'space-between', gap: 28, paddingHorizontal: 24 },
  top: { gap: 24, marginTop: 24 },
  headline: { gap: 8 },
  lede: { lineHeight: 20 },
  promises: { gap: 16 },
  promise: { flexDirection: 'row', gap: 13 },
  promiseIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseBody: { flex: 1, gap: 2 },
  promiseCopy: { lineHeight: 16 },
  actions: { gap: 10 },
  cta: { borderRadius: 16, paddingVertical: 17 },
  secondary: { borderRadius: 16, paddingVertical: 16 },
  legal: { textAlign: 'center', lineHeight: 16, marginTop: 4 },
});
