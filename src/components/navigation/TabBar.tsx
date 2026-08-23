import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Tappable, Text } from '@/components/ui';
import { Icon, type IconName } from '@/icons';
import { colors, radius } from '@/theme';

/** Icon for each tab route, in the order the design lays them out. */
const TAB_ICONS: Record<string, IconName> = {
  index: 'home',
  wallet: 'wallet',
  send: 'send',
  benefits: 'gift',
  profile: 'user',
};

/**
 * The TPay bottom navigation: five equal columns, an active pill behind the
 * icon, and a hairline over a near-opaque white ground.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;
        const iconName = TAB_ICONS[route.name] ?? 'home';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Tappable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={label}
            testID={`tab-${route.name}`}
            onPress={onPress}
            onLongPress={() =>
              navigation.emit({ type: 'tabLongPress', target: route.key })
            }
            style={styles.item}
          >
            <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
              <Icon
                name={iconName}
                size={20}
                color={isFocused ? colors.primary : colors.inkFaint}
                strokeWidth={isFocused ? 2 : 1.9}
              />
            </View>
            <Text
              variant={isFocused ? 'tab' : 'tabIdle'}
              color={isFocused ? colors.primary : colors.inkMuted}
            >
              {label}
            </Text>
          </Tappable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  item: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 5,
    paddingVertical: 2,
  },
  iconWrap: {
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.primarySoft },
});
