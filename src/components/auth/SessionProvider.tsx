import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { services } from '@/services';
import type { Credentials, SignupDraft } from '@/services';
import type { SessionState, SignupState } from '@/types';

/** Before the stored session has been looked at, the app knows nothing. */
const RESTORING: SessionState = { status: 'AUTHENTICATING', reason: 'never-signed-in' };

export type SessionContextValue = SessionState & {
  /** True until `restoreSession` has answered on launch. */
  readonly isRestoring: boolean;
  /**
   * The signup in progress, when there is one. A new account is authenticated
   * before it has finished onboarding, and this is how the guard knows.
   */
  readonly signup: SignupState | null;
  signIn: (credentials: Credentials) => Promise<SessionState>;
  signInWithBiometrics: (attestation: string) => Promise<SessionState>;
  signOut: () => Promise<void>;
  startSignup: (draft: SignupDraft) => Promise<void>;
  completeSignup: () => Promise<SessionState>;
  /** Re-reads the signup, after a stage completes. */
  refreshSignup: () => Promise<void>;
  /** Re-reads the session, e.g. after enabling biometric unlock. */
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * The app's one source of truth for who is signed in.
 *
 * Mounted at the root, above everything else. Screens never ask the session
 * service directly and never branch on "signed out" themselves — the guard
 * decides what may render at all.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(RESTORING);
  const [isRestoring, setIsRestoring] = useState(true);
  const [signup, setSignup] = useState<SignupState | null>(null);

  useEffect(() => {
    let cancelled = false;
    services.session.restoreSession().then(
      (restored) => {
        if (cancelled) return;
        setState(restored);
        setIsRestoring(false);
      },
      () => {
        if (cancelled) return;
        // A restore that fails is not a session. Fall back to signed out
        // rather than letting anyone in on a failure.
        setState({ status: 'SIGNED_OUT', reason: 'never-signed-in' });
        setIsRestoring(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (credentials: Credentials) => {
    setState({ status: 'AUTHENTICATING', reason: 'never-signed-in' });
    try {
      const next = await services.session.signIn(credentials);
      setState(next);
      return next;
    } catch (cause) {
      setState({ status: 'SIGNED_OUT', reason: 'never-signed-in' });
      throw cause;
    }
  }, []);

  const signInWithBiometrics = useCallback(async (attestation: string) => {
    setState({ status: 'AUTHENTICATING', reason: 'never-signed-in' });
    try {
      const next = await services.session.signInWithBiometrics(attestation);
      setState(next);
      return next;
    } catch (cause) {
      setState({ status: 'SIGNED_OUT', reason: 'never-signed-in' });
      throw cause;
    }
  }, []);

  const signOut = useCallback(async () => {
    setSignup(null);
    setState(await services.session.signOut());
  }, []);

  const startSignup = useCallback(async (draft: SignupDraft) => {
    setSignup(await services.session.startSignup(draft));
  }, []);

  const completeSignup = useCallback(async () => {
    const next = await services.session.completeSignup();
    setSignup(await services.session.getSignupState());
    setState(next);
    return next;
  }, []);

  const refreshSignup = useCallback(async () => {
    setSignup(await services.session.getSignupState());
  }, []);

  const refresh = useCallback(async () => {
    setState(await services.session.getSessionState());
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      isRestoring,
      signup,
      signIn,
      signInWithBiometrics,
      signOut,
      startSignup,
      completeSignup,
      refreshSignup,
      refresh,
    }),
    [
      state,
      isRestoring,
      signup,
      signIn,
      signInWithBiometrics,
      signOut,
      startSignup,
      completeSignup,
      refreshSignup,
      refresh,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside a SessionProvider');
  return context;
}
