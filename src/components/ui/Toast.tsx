import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadows } from '@/theme';
import { FadeInUp } from './FadeInUp';
import { Text } from './Text';

/** How long a toast stays on screen, matching the design's 2.2s. */
const TOAST_DURATION_MS = 2200;

type ToastContextValue = {
  /** Shows a short confirmation above the tab bar. */
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Mounted once at the root. Confirmations ("Copied to clipboard") surface
 * here rather than each screen inventing its own feedback.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((next: string) => {
    setMessage(next);
    setTimeout(() => {
      // Only clear if nothing newer replaced it.
      setMessage((current) => (current === next ? null : current));
    }, TOAST_DURATION_MS);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <View
          pointerEvents="none"
          style={[styles.layer, { paddingBottom: insets.bottom + 104 }]}
        >
          <FadeInUp>
            <View style={styles.toast} testID="toast">
              <Text variant="caption" color={colors.onDarkSoft}>
                {message}
              </Text>
            </View>
          </FadeInUp>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider');
  return context;
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    zIndex: 60,
  },
  toast: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...shadows.floating,
  },
});
