import { ScrollView, StyleSheet, View } from 'react-native';

import { Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import type { Recipient } from '@/services';
import { colors } from '@/theme';
import { RecipientAvatar } from './RecipientAvatar';

export type RecentRecipientsProps = {
  recipients: readonly Recipient[];
  onSelect: (recipient: Recipient) => void;
  onNew: () => void;
};

/** How many faces fit before the row asks the user to scroll. */
const PREVIEW_COUNT = 6;

/** The horizontal row of people the user sends to most. */
export function RecentRecipients({ recipients, onSelect, onNew }: RecentRecipientsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {recipients.slice(0, PREVIEW_COUNT).map((recipient) => (
        <Tappable
          key={recipient.id}
          accessibilityRole="button"
          accessibilityLabel={`Send to ${recipient.name}`}
          testID={`recent-recipient-${recipient.id}`}
          onPress={() => onSelect(recipient)}
          style={styles.item}
        >
          <RecipientAvatar initials={recipient.initials} seed={recipient.id} />
          <Text variant="captionSm" color={colors.inkSecondary}>
            {firstName(recipient.name)}
          </Text>
        </Tappable>
      ))}

      <Tappable
        accessibilityRole="button"
        accessibilityLabel="New recipient"
        testID="recent-recipient-new"
        onPress={onNew}
        style={styles.item}
      >
        <View style={styles.new}>
          <Icon name="plus" size={20} color={colors.inkMuted} />
        </View>
        <Text variant="captionSm" color={colors.inkSecondary}>
          New
        </Text>
      </Tappable>
    </ScrollView>
  );
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

const styles = StyleSheet.create({
  row: { gap: 14 },
  item: { alignItems: 'center', gap: 8, minWidth: 64 },
  new: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
