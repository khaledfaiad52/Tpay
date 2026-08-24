import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import {
  Badge,
  Card,
  ErrorState,
  Eyebrow,
  ListRow,
  Screen,
  Skeleton,
  Tappable,
  Text,
} from '@/components/ui';
import { useRefreshOnFocus, useSupportData } from '@/hooks';
import { Icon } from '@/icons';
import { colors, radius, spacing } from '@/theme';
import type { SupportConversation, SupportConversationStatus } from '@/types';
import { formatRelativeDateTime } from '@/utils';

const STATUS_LABELS: Record<SupportConversationStatus, string> = {
  open: 'Open',
  'awaiting-you': 'Needs you',
  closed: 'Closed',
};

/**
 * TPay Support — one surface, whichever screen sent the user here.
 *
 * Employer, benefits and employment all open this same place, so a user never
 * has to work out which support they need.
 */
export default function SupportScreen() {
  const data = useSupportData();
  useRefreshOnFocus(data.reload);

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={40} width={220} cornerRadius={radius.lg} />
        <Skeleton height={80} cornerRadius={radius.card} />
        <Skeleton height={140} cornerRadius={radius.card} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="TPay Support" />
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const { conversations, topics, articles } = data.data;
  const openConversations = conversations.filter(
    (conversation) => conversation.status !== 'closed',
  );
  const agent = conversations[0]?.agent;

  const startWith = (topic: string, subject?: string) =>
    router.push({ pathname: '/support/new', params: { topic, ...(subject ? { subject } : {}) } });

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="How can we help?" />

      <Tappable
        accessibilityRole="button"
        accessibilityLabel="Start a conversation with TPay Support"
        testID="support-start"
        onPress={() => startWith('other')}
        style={styles.chatCard}
      >
        <View style={styles.chatAvatar}>
          <Text variant="rowTitle" color={colors.primarySoft}>
            {agent?.initials ?? 'TP'}
          </Text>
        </View>
        <View style={styles.chatBody}>
          <Text variant="rowTitleStrong" color={colors.onDark}>
            Chat with TPay
          </Text>
          <Text variant="captionSm" color={colors.primaryOnDark}>
            Real people · replies in under 2 min
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.primaryOnDark} />
      </Tappable>

      {conversations.length > 0 ? (
        <>
          <Eyebrow
            label="Your conversations"
            value={openConversations.length > 0 ? `${openConversations.length} open` : undefined}
            valueColor={colors.primary}
          />
          <Card padded={false} testID="support-conversations">
            {conversations.map((conversation, index) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                divided={index < conversations.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}

      <Eyebrow label="Browse by topic" />
      <View style={styles.grid}>
        {topics.map((topic) => (
          <Tappable
            key={topic.topic}
            accessibilityRole="button"
            testID={`support-topic-${topic.topic}`}
            onPress={() => startWith(topic.topic, topic.label)}
            style={styles.topic}
          >
            <Text variant="label">{topic.label}</Text>
          </Tappable>
        ))}
      </View>

      <Eyebrow label="Popular right now" />
      <Card padded={false} testID="support-articles">
        {articles.map((article, index) => (
          <ListRow
            key={article.id}
            title={article.question}
            showChevron
            divided={index < articles.length - 1}
            onPress={() => startWith(article.topic, article.question)}
          />
        ))}
      </Card>

      <Card padded={false}>
        <ListRow
          title="Create a request for HR"
          subtitle="Letters, payslips and payroll questions"
          showChevron
          testID="support-create-request"
          onPress={() => router.push('/requests/new')}
        />
      </Card>
    </Screen>
  );
}

function ConversationRow({
  conversation,
  divided,
}: {
  conversation: SupportConversation;
  divided: boolean;
}) {
  const last = conversation.messages.at(-1);
  return (
    <ListRow
      title={conversation.subject}
      subtitle={last ? `${last.author === 'you' ? 'You' : conversation.agent.name}: ${last.body}` : undefined}
      trailing={
        <View style={styles.rowTrailing}>
          <Badge
            label={STATUS_LABELS[conversation.status]}
            tone={
              conversation.status === 'closed'
                ? 'neutral'
                : conversation.status === 'awaiting-you'
                  ? 'pending'
                  : 'success'
            }
          />
          <Text variant="captionSm" color={colors.inkFaint} numeric>
            {formatRelativeDateTime(conversation.updatedAt)}
          </Text>
        </View>
      }
      divided={divided}
      testID={`support-conversation-${conversation.id}`}
      onPress={() =>
        router.push({ pathname: '/support/[id]', params: { id: conversation.id } })
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  chatCard: {
    borderRadius: radius.card,
    backgroundColor: colors.primaryDark,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.overlayOnDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBody: { flex: 1, gap: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  topic: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg - 1,
  },
  rowTrailing: { alignItems: 'flex-end', gap: 4 },
});
