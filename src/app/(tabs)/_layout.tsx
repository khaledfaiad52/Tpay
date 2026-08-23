import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/navigation';

/**
 * The five product areas: Home, Wallet, Send, Benefits, Profile.
 * The bar itself is fully custom — see `TabBar` — so it matches the design
 * rather than the platform default.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
      <Tabs.Screen name="send" options={{ title: 'Send' }} />
      <Tabs.Screen name="benefits" options={{ title: 'Benefits' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
