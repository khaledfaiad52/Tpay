import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { DocumentRow } from '@/components/work';
import {
  Card,
  EmptyState,
  ErrorState,
  FadeInUp,
  FilterChips,
  Screen,
  Skeleton,
  Text,
  useToast,
  type FilterChip,
} from '@/components/ui';
import { Icon } from '@/icons';
import { useDocuments } from '@/hooks';
import { services } from '@/services';
import { colors } from '@/theme';
import type { DocumentCategory, EmployeeDocument } from '@/types';

type DocumentFilterId = 'all' | DocumentCategory;

/** The filter row, in the order the approved Documents screen lists it. */
const FILTERS: readonly FilterChip<DocumentFilterId>[] = [
  { id: 'all', label: 'All' },
  { id: 'employment', label: 'Employment' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'identification', label: 'Identification' },
  { id: 'tax', label: 'Tax' },
];

/** Employment paperwork: view, download or share. */
export default function DocumentsScreen() {
  const documents = useDocuments();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<DocumentFilterId>('all');

  const visible = useMemo(() => {
    if (documents.status !== 'success') return [];
    return filter === 'all'
      ? documents.data
      : documents.data.filter((document) => document.category === filter);
  }, [documents, filter]);

  const open = async (document: EmployeeDocument) => {
    if (document.opensRoute === 'payslips') {
      router.push('/salary/payslips');
      return;
    }
    try {
      const opened = await services.documents.openDocument(document.id);
      await Clipboard.setStringAsync(opened.shareText);
      showToast(`${document.title} copied — files open once document storage lands`);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "That document isn't ready yet");
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Documents" />

      <FilterChips chips={FILTERS} selected={filter} onSelect={setFilter} />

      {documents.status === 'loading' ? (
        <>
          <Skeleton height={230} />
          <Skeleton height={76} />
        </>
      ) : documents.status === 'error' ? (
        <ErrorState
          title="We couldn't load your documents"
          description="Check your connection and try again."
          onRetry={documents.reload}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'No documents yet' : 'Nothing in this category'}
          description={
            filter === 'all'
              ? 'Your contract, payslips and insurance paperwork will appear here.'
              : 'Try another category, or ask HR for the document you need.'
          }
          actionLabel="Request a document"
          onActionPress={() => router.push('/requests/new')}
        />
      ) : (
        <FadeInUp>
          <Card padded={false} testID="documents-list">
            {visible.map((document, index) => (
              <DocumentRow
                key={document.id}
                document={document}
                onPress={open}
                divided={index < visible.length - 1}
              />
            ))}
          </Card>
        </FadeInUp>
      )}

      <Card tone="tinted" onPress={() => router.push('/requests/new')} style={styles.banner}>
        <View style={styles.bannerTile}>
          <Icon name="headset" size={18} color={colors.primary} />
        </View>
        <Text variant="label" color={colors.primaryDark} style={styles.bannerCopy}>
          Request a document from HR
        </Text>
        <Icon name="chevron-right" size={18} color={colors.primary} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCopy: { flex: 1 },
});
