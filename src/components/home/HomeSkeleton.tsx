import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui';
import { radius } from '@/theme';

/**
 * Home's loading state. It mirrors the real layout's block sizes so the screen
 * does not jump when data lands.
 */
export function HomeSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Skeleton height={13} width={110} cornerRadius={radius.xs} />
          <Skeleton height={22} width={140} cornerRadius={radius.sm} />
        </View>
        <Skeleton height={44} width={44} cornerRadius={22} />
      </View>

      <Skeleton height={196} cornerRadius={radius.hero} />

      <View style={styles.actions}>
        <Skeleton height={60} width="31%" />
        <Skeleton height={60} width="31%" />
        <Skeleton height={60} width="31%" />
      </View>

      <Skeleton height={76} />
      <Skeleton height={220} />
      <Skeleton height={76} />
      <Skeleton height={76} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { gap: 7 },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
});
