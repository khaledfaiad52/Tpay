import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { KycStatusCard, presentKyc } from '@/components/account';
import { useSession } from '@/components/auth';
import {
  Avatar,
  Card,
  ErrorState,
  Eyebrow,
  ListRow,
  Screen,
  Skeleton,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { useProfileData, useRefreshOnFocus } from '@/hooks';
import { Icon } from '@/icons';
import { services } from '@/services';
import { colors, radius } from '@/theme';

/** Who you are on TPay: identity, work, security and support in one place. */
export default function ProfileScreen() {
  const data = useProfileData();
  const session = useSession();
  const { showToast } = useToast();
  useRefreshOnFocus(data.reload);

  if (data.status === 'loading') {
    return (
      <Screen bottomInset={72}>
        <Skeleton height={60} cornerRadius={30} width={220} />
        <Skeleton height={62} cornerRadius={18} />
        <Skeleton height={150} cornerRadius={radius.card} />
        <Skeleton height={150} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen bottomInset={72}>
        <Text variant="screenTitle">Profile</Text>
        <ErrorState
          title="We couldn't load your profile"
          description="Check your connection and try again."
          onRetry={data.reload}
        />
      </Screen>
    );
  }

  const { user, kyc, openRequestCount, unreadNotificationCount } = data.data;
  const handle = `@${user.username}`;

  const copyHandle = async () => {
    await Clipboard.setStringAsync(handle);
    showToast(`${handle} copied`);
  };

  const signOut = async () => {
    // A real session transition, not a message: the guard sends the user to
    // the login screen the moment the session is gone.
    await services.user.signOut();
    await session.signOut();
  };

  return (
    <Screen bottomInset={72} contentStyle={styles.content}>
      <View style={styles.identity}>
        <Avatar initials={user.initials} size={60} />
        <View style={styles.identityBody}>
          <Text variant="displayXs" testID="profile-name">
            {user.firstName} {user.lastName}
          </Text>
          <Text variant="caption" color={colors.inkMuted}>
            {user.email}
          </Text>
          <Text variant="caption" color={colors.inkMuted} numeric>
            {user.phone}
          </Text>
          <Tappable
            accessibilityRole="button"
            accessibilityLabel={`Copy your TPay username, ${handle}`}
            testID="profile-copy-username"
            onPress={copyHandle}
            style={styles.handle}
          >
            <Text variant="mono" color={colors.primaryDark}>
              {handle}
            </Text>
            <Icon name="copy" size={13} color={colors.primaryOnDarkSubtle} />
          </Tappable>
        </View>
      </View>

      <KycStatusCard
        presentation={presentKyc(kyc)}
        onPress={() => router.push('/kyc')}
        testID="profile-kyc"
      />

      <Eyebrow label="Personal" />
      <Card padded={false}>
        <ListRow
          title="Personal information"
          showChevron
          divided
          onPress={() => router.push('/profile/personal')}
        />
        <ListRow
          title="TPay username"
          trailing={
            <Text variant="caption" color={colors.inkMuted}>
              {handle}
            </Text>
          }
          divided
          onPress={() => router.push('/profile/username')}
        />
        <ListRow
          title="Documents & identification"
          showChevron
          onPress={() => router.push('/documents')}
        />
      </Card>

      <Eyebrow label="Work" />
      <Card padded={false}>
        <ListRow
          title="My employer"
          showChevron
          divided
          onPress={() => router.push('/employer')}
        />
        <ListRow
          title="Salary & payslips"
          showChevron
          divided
          onPress={() => router.push('/salary')}
        />
        <ListRow
          title="Requests"
          trailing={
            openRequestCount > 0 ? (
              <Text variant="action" color={colors.gold}>
                {openRequestCount} open
              </Text>
            ) : undefined
          }
          showChevron={openRequestCount === 0}
          onPress={() => router.push('/requests')}
        />
      </Card>

      <Eyebrow label="Security & account" />
      <Card padded={false}>
        <ListRow
          title="Cards"
          showChevron
          divided
          testID="profile-cards"
          onPress={() => router.push('/cards')}
        />
        <ListRow
          title="Security centre"
          showChevron
          divided
          testID="profile-security"
          onPress={() => router.push('/security')}
        />
        <ListRow
          title="Notifications"
          trailing={
            unreadNotificationCount > 0 ? (
              <Text variant="action" color={colors.primary}>
                {unreadNotificationCount} new
              </Text>
            ) : undefined
          }
          showChevron={unreadNotificationCount === 0}
          divided
          onPress={() => router.push('/notifications')}
        />
        <ListRow
          title="Language"
          trailing={
            <Text variant="caption" color={colors.inkMuted}>
              {user.preferences.languageLabel}
            </Text>
          }
          divided
          onPress={() => showToast('Arabic is coming in a later release.')}
        />
        <ListRow
          title="Default currency"
          trailing={
            <Text variant="caption" color={colors.inkMuted}>
              {user.preferences.defaultCurrency}
            </Text>
          }
          onPress={() => router.push('/profile/personal')}
        />
      </Card>

      <Eyebrow label="Support & legal" />
      <Card padded={false}>
        <ListRow
          title="Help centre"
          showChevron
          divided
          testID="profile-help"
          onPress={() => router.push('/support')}
        />
        <ListRow
          title="Chat with TPay"
          showChevron
          divided
          onPress={() => router.push('/support')}
        />
        <ListRow
          title="Terms, privacy & fees"
          showChevron
          onPress={() => showToast('Opens tpay.app/legal in your browser.')}
        />
      </Card>

      <Tappable
        accessibilityRole="button"
        testID="profile-log-out"
        onPress={signOut}
        style={styles.logOut}
      >
        <Text variant="rowTitle" color={colors.danger}>
          Log out
        </Text>
      </Tappable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  identityBody: { flex: 1, gap: 3 },
  handle: {
    marginTop: 3,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    borderRadius: 9,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  logOut: { alignItems: 'center', paddingVertical: 14 },
});
