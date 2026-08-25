import { router, useRootNavigationState, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from './SessionProvider';

/** Everything under this group is reachable without a session. */
const AUTH_GROUP = '(auth)';

/**
 * Where a signed-in account that has not finished signing up may go.
 *
 * Onboarding itself, and the existing verification flow it hands over to —
 * onboarding reuses those screens rather than carrying copies of them, so the
 * guard has to let them through.
 */
const ONBOARDING_SEGMENTS = new Set(['onboarding', 'kyc', 'support']);

/**
 * The one place that decides whether a route may render.
 *
 * Screens carry no signed-out branch of their own: an authenticated route is
 * simply never reached without a session, and the login screen is never
 * reached with one. Adding a screen adds nothing here.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status, isRestoring, signup } = useSession();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Redirecting before the navigator has mounted throws; wait for it.
    if (!navigationState?.key) return;
    // While the stored session is being read, the app is neither in nor out.
    if (isRestoring) return;

    const inAuthGroup = segments[0] === AUTH_GROUP;
    const authenticated = status === 'AUTHENTICATED';

    if (!authenticated && !inAuthGroup) {
      // A signed-out user never sees an authenticated route, whatever URL
      // they arrived on.
      router.replace(status === 'SESSION_EXPIRED' ? '/(auth)/login?expired=1' : '/(auth)/welcome');
      return;
    }

    if (authenticated && inAuthGroup) {
      // And a signed-in user never sees the login screen during normal use.
      router.replace(signup && signup.stage !== 'done' ? '/onboarding' : '/');
      return;
    }

    // A brand-new account is authenticated but not finished. Onboarding is
    // where it belongs until it is — along with the screens onboarding hands
    // over to.
    if (
      authenticated &&
      signup &&
      signup.stage !== 'done' &&
      !ONBOARDING_SEGMENTS.has(segments[0] ?? '')
    ) {
      router.replace('/onboarding');
    }
  }, [status, isRestoring, signup, segments, navigationState?.key]);

  return <>{children}</>;
}
