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
      setError("Impossible de charger votre profil. Vérifiez votre connexion et réessayez.");
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

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) {
          if (active) setProfile(null);
          return;
        }
        const result = await api.request<AuthenticatedProfile>('/accounts/me');
        if (active) setProfile(result);
      } catch {
        if (active) {
          setProfile(null);
          setError("Impossible de charger votre profil. Vérifiez votre connexion et réessayez.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (active) {
          setProfile(null);
          setError(null);
          setLoading(false);
        }
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Token refreshes do not change the business profile. Avoid blocking the
        // current screen on routine Supabase session renewal.
        void Promise.resolve().then(load);
      }
    });

    void load();
    return () => {
      active = false;
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
