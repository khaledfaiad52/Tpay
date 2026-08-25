import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, screenPadding, sectionGap } from '@/theme';

export type ScreenProps = {
  children: React.ReactNode;
  /** Set false for screens that manage their own scrolling (e.g. a list). */
  scrollable?: boolean;
  /** Extra bottom inset, e.g. to clear the tab bar. */
  bottomInset?: number;
  contentStyle?: ViewStyle;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
};

/**
 * Standard screen shell: canvas ground, 20pt gutters, safe-area aware, and the
 * 18pt vertical rhythm between sections that the design uses everywhere.
 */
export function Screen({
  children,
  scrollable = true,
  bottomInset = 0,
  contentStyle,
  refreshControl,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const content = StyleSheet.flatten([
    styles.content,
    { paddingTop: insets.top + 8, paddingBottom: bottomInset + screenPadding },
    contentStyle,
  ]);

  if (!scrollable) {
    return <View style={[styles.screen, content]}>{children}</View>;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={content}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: screenPadding, gap: sectionGap },
});
