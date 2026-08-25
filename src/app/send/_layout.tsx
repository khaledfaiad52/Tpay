import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * The Send Money steps. The draft they share lives in `SendFlowProvider`,
 * mounted at the app root so the flow survives a tab switch mid-send.
 */
export default function SendFlowLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    />
  );
}
