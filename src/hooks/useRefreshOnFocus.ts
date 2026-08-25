import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Re-runs a loader whenever the screen comes back into focus.
 *
 * Money moves on other screens — an exchange booked from the Exchange screen
 * changes two balances — so a screen the user returns to must not show what it
 * fetched when it first mounted. The initial focus is skipped, because the
 * data hook has already loaded by then.
 */
export function useRefreshOnFocus(reload: () => void): void {
  const hasFocusedBefore = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedBefore.current) {
        hasFocusedBefore.current = true;
        return;
      }
      reload();
    }, [reload]),
  );
}
