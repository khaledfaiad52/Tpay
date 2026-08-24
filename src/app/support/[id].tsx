import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, ErrorState, Screen, Skeleton, Tappable, Text, useToast } from '@/components/ui';
import { useConversation } from '@/hooks';
import { Icon } from '@/icons';
import { services } from '@/services';
import { colors, fonts, inputReset, radius, screenPadding } from '@/theme';
import type { SupportAttachment, SupportMessage } from '@/types';
import { formatDayDivider, formatTimeOfDay } from '@/utils';

/** What tapping an attachment offers, by what it points at. */
const ATTACHMENT_ACTIONS: Record<SupportAttachment['kind'], string> = {
  transfer: 'Open transfer',
  request: 'Open request',
  document: 'Open document',
};

/** One TPay Support conversation, and the reply box under it. */
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useConversation(id);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  if (data.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={44} cornerRadius={radius.lg} />
        <Skeleton height={70} cornerRadius={18} />
        <Skeleton height={70} cornerRadius={18} />
      </Screen>
    );
  }

  if (data.status === 'error') {
    return (
      <Screen>
        <ErrorState
          title="We couldn't open that conversation"
          onRetry={data.reload}
        />
      </Screen>
    );
  }

  const conversation = data.data;
  const closed = conversation.status === 'closed';

  const send = async () => {
    const body = draft.trim();
    if (body === '') return;
    setSending(true);
    try {
      await services.support.sendMessage(conversation.id, body);
      setDraft('');
      data.reload();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "We couldn't send that message.");
    } finally {
      setSending(false);
    }
  };

  const openAttachment = (attachment: SupportAttachment) => {
    if (attachment.kind === 'transfer') {
      router.push({ pathname: '/transfers/[id]', params: { id: attachment.targetId } });
    } else if (attachment.kind === 'request') {
      router.push('/requests');
    } else {
      router.push('/documents');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Tappable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="conversation-back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/support'))}
          style={styles.back}
        >
          <Icon name="arrow-left" size={18} color={colors.ink} />
        </Tappable>
        <View style={styles.agentAvatar}>
          <Text variant="label" color={colors.primarySoft}>
            {conversation.agent.initials}
          </Text>
        </View>
        <View style={styles.headerBody}>
          <Text variant="rowTitleStrong" testID="conversation-subject">
            {conversation.agent.name}
          </Text>
          <Text
            variant="captionSm"
            color={conversation.agent.online && !closed ? colors.success : colors.inkMuted}
          >
            {conversation.agent.role} · {closed ? 'conversation closed' : conversation.agent.online ? 'online' : 'offline'}
          </Text>
        </View>
        {closed ? <Badge label="Closed" tone="neutral" /> : null}
      </View>

      <ScrollView
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="captionSm" color={colors.inkMuted} style={styles.subject}>
          {conversation.subject}
        </Text>
        {conversation.messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            showDivider={index === 0}
            onOpenAttachment={openAttachment}
          />
        ))}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 14) + 14 }]}>
        {closed ? (
          <Tappable
            accessibilityRole="button"
            testID="conversation-start-new"
            onPress={() =>
              router.push({
                pathname: '/support/new',
                params: { topic: conversation.topic, subject: conversation.subject },
              })
            }
            style={styles.closedNotice}
          >
            <Text variant="caption" color={colors.inkMuted}>
              This conversation is closed. Start a new one to continue.
            </Text>
          </Tappable>
        ) : (
          <>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message…"
              placeholderTextColor={colors.inkFaint}
              accessibilityLabel="Write a message"
              testID="conversation-input"
              multiline
              style={styles.input}
            />
            <Tappable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              testID="conversation-send"
              disabled={sending || draft.trim() === ''}
              onPress={send}
              style={StyleSheet.flatten([
                styles.sendButton,
                (sending || draft.trim() === '') && styles.sendDisabled,
              ])}
            >
              <Icon name="send" size={19} color={colors.onDark} strokeWidth={2} />
            </Tappable>
          </>
        )}
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  showDivider,
  onOpenAttachment,
}: {
  message: SupportMessage;
  showDivider: boolean;
  onOpenAttachment: (attachment: SupportAttachment) => void;
}) {
  const mine = message.author === 'you';
  const attachment = message.attachment;
  return (
    <>
      {showDivider ? (
        <Text variant="badge" color={colors.inkFaint} style={styles.dayDivider} numeric>
          {formatDayDivider(message.sentAt)}
        </Text>
      ) : null}
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text variant="rowBody" color={mine ? colors.onDark : colors.ink} style={styles.bubbleText}>
          {message.body}
        </Text>
        <Text
          variant="captionSm"
          color={mine ? colors.primaryOnDark : colors.inkFaint}
          style={styles.bubbleTime}
          numeric
        >
          {formatTimeOfDay(message.sentAt)}
        </Text>
      </View>
      {attachment ? (
        <Tappable
          accessibilityRole="button"
          testID="conversation-attachment"
          onPress={() => onOpenAttachment(attachment)}
          style={styles.attachment}
        >
          <Text variant="eyebrowSm" color={colors.inkMuted}>
            {attachment.label}
          </Text>
          <Text variant="rowTitleStrong" numeric>
            {attachment.title}
          </Text>
          <Text variant="action" color={colors.primary}>
            {ATTACHMENT_ACTIONS[attachment.kind]}
          </Text>
        </Tappable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: screenPadding - 4,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: { flex: 1, gap: 1 },
  thread: { flex: 1 },
  threadContent: { padding: 16, gap: 12 },
  subject: { textAlign: 'center' },
  dayDivider: { textAlign: 'center' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingVertical: 13, paddingHorizontal: 15, gap: 4 },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  bubbleText: { lineHeight: 20 },
  bubbleTime: { alignSelf: 'flex-end' },
  attachment: {
    alignSelf: 'flex-start',
    maxWidth: '86%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  composer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    ...inputReset,
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 16,
    maxHeight: 96,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
  closedNotice: { flex: 1, alignItems: 'center', paddingVertical: 12 },
});
