import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { AuthenticatedProfile } from '@isieco/shared';
import type { Session } from '@supabase/supabase-js';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface MobileAuthContextValue {
  profile: AuthenticatedProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const MobileAuthContext = createContext<MobileAuthContextValue | null>(null);

export function MobileAuthProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<AuthenticatedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session) {
        setProfile(null);
        return;
      }
      const result = await api.request<AuthenticatedProfile>('/accounts/me');
      setProfile(result);
    } catch {
      setProfile(null);
      setError('Impossible de charger votre profil. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    setProfile(null);
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;
    let requestVersion = 0;

    const load = async (session: Session | null) => {
      const currentRequest = ++requestVersion;
      if (!session) {
        if (active) {
          setProfile(null);
          setError(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // INITIAL_SESSION contains the restored session. No extra getSession()
        // call is needed before /accounts/me.
        const result = await api.request<AuthenticatedProfile>('/accounts/me');
        if (active && currentRequest === requestVersion) setProfile(result);
      } catch {
        if (active && currentRequest === requestVersion) {
          setProfile(null);
          setError('Impossible de charger votre profil. Vérifiez votre connexion et réessayez.');
        }
      } finally {
        if (active && currentRequest === requestVersion) setLoading(false);
      }
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        requestVersion += 1;
        if (active) {
          setProfile(null);
          setError(null);
          setLoading(false);
        }
      } else if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED'
      ) {
        setLoading(true);
        // Work outside Supabase's auth callback to avoid holding its lock.
        void Promise.resolve().then(() => load(session));
      }
      // TOKEN_REFRESHED does not invalidate the business profile.
    });

    return () => {
      active = false;
      requestVersion += 1;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ profile, loading, error, refreshProfile, signOut }),
    [profile, loading, error, refreshProfile, signOut],
  );

  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuth(): MobileAuthContextValue {
  const value = useContext(MobileAuthContext);
  if (!value) throw new Error('useMobileAuth doit être utilisé dans MobileAuthProvider.');
  return value;
}
