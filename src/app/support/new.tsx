import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { FormField } from '@/components/send';
import { Banner, Button, Card, Screen, Skeleton, Tappable, Text } from '@/components/ui';
import { services } from '@/services';
import { colors, fonts, inputReset, radius } from '@/theme';
import type { SupportTopic } from '@/types';
import { useSupportTopics } from '@/hooks';

/** Topics are a service concern; anything unrecognised falls back to "other". */
const KNOWN_TOPICS: readonly SupportTopic[] = [
  'employer',
  'benefits',
  'employment',
  'transfers',
  'salary',
  'account',
  'other',
];

function topicFrom(value: string | undefined): SupportTopic {
  return KNOWN_TOPICS.find((candidate) => candidate === value) ?? 'other';
}

/**
 * Start a TPay Support conversation.
 *
 * Every entry point in the app — employer, a benefit, employment details, the
 * help centre — lands here with the topic already set, so support opens with
 * context instead of asking the user to explain where they came from.
 */
export default function NewConversationScreen() {
  const params = useLocalSearchParams<{ topic?: string; subject?: string }>();
  const topics = useSupportTopics();
  const [topic, setTopic] = useState<SupportTopic>(() => topicFrom(params.topic));
  const [subject, setSubject] = useState(params.subject ?? '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const ready = subject.trim() !== '' && message.trim() !== '';

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      const conversation = await services.support.startConversation({
        topic,
        subject: subject.trim(),
        message: message.trim(),
      });
      router.replace({ pathname: '/support/[id]', params: { id: conversation.id } });
    } catch {
      setError("We couldn't start that conversation. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Message TPay Support" />

      <Text variant="action" color={colors.inkSecondary}>
        What is this about?
      </Text>
      <View style={styles.grid}>
        {topics.status === 'loading' ? <Skeleton height={38} width={220} cornerRadius={radius.md} /> : null}
        {(topics.data ?? []).map((candidate) => {
          const selected = candidate.topic === topic;
          return (
            <Tappable
              key={candidate.topic}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              testID={`support-new-topic-${candidate.topic}`}
              onPress={() => setTopic(candidate.topic)}
              style={StyleSheet.flatten([
                styles.chip,
                selected ? styles.chipSelected : styles.chipIdle,
              ])}
            >
              <Text variant="label" color={selected ? colors.onDark : colors.ink}>
                {candidate.label}
              </Text>
            </Tappable>
          );
        })}
      </View>

      <FormField
        label="Subject"
        value={subject}
        onChangeText={setSubject}
        placeholder="Transfer to Ahmed failed"
        testID="support-new-subject"
      />

      <View style={styles.field}>
        <Text variant="action" color={colors.inkSecondary}>
          Message
        </Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Tell us what happened…"
          placeholderTextColor={colors.inkFaint}
          multiline
          accessibilityLabel="Message"
          testID="support-new-message"
          style={styles.message}
        />
      </View>

      {error ? (
        <Card tone="danger" testID="support-new-error">
          <Text variant="caption" color={colors.dangerText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Banner>
        TPay Support can see your account, transfers and employment. You never need to send account
        numbers or passwords in a message.
      </Banner>

      <Button
        label="Send message"
        block
        disabled={!ready}
        loading={submitting}
        onPress={submit}
        style={styles.cta}
        testID="support-new-submit"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14 },
  chipSelected: { backgroundColor: colors.primary },
  chipIdle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  field: { gap: 7 },
  message: {
    ...inputReset,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 15,
    minHeight: 110,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  cta: { borderRadius: 16, paddingVertical: 17, marginTop: 4 },
});
