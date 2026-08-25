import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * Everything reachable without a session.
 *
 * `AuthGuard` keys off this group's name, so a screen is signed-out-reachable
 * purely by living here — there is no list to keep in step.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    />
  );
}
