
import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import {
  ensureProfileRow,
  getMyEntitlements,
  normalizeAccountType,
  requestSchoolJoinWithCode
} from '../services/accountAccess';
import { getPublicAppUrl } from '../utils/appUrl';

const PENDING_SCHOOL_CODE_STORAGE_KEY = 'teachers-room:pending-school-code';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signup: (
    email: string,
    password: string,
    name: string,
    schoolCode?: string
  ) => Promise<{ error: any; requiresEmailConfirmation?: boolean; email?: string }>;
  resendSignupConfirmation: (email: string) => Promise<{ error: any }>;
  requestPasswordReset: (email: string) => Promise<{ error: any }>;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  logout: () => Promise<void>;
  updateUserProfile: (updates: { name?: string; avatarUrl?: string | null }) => Promise<{ error: any }>;
  refreshUserAccess: () => Promise<void>;
  needsPlanSelection: boolean;
  completePlanSelection: () => Promise<{ error: any }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [needsPlanSelection, setNeedsPlanSelection] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const redirectToHome = () => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const createBaseUser = (authUser: any): User => {
    const accountType = normalizeAccountType(authUser?.user_metadata?.account_type);
    return {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.full_name || 'Teacher',
      avatar: authUser.user_metadata?.avatar_url || undefined,
      accountType,
      canUseAi: accountType === 'teacher' || accountType === 'school',
      schoolAccess: null
    };
  };

  const normalizeSchoolCode = (value: unknown) => {
    if (typeof value !== 'string') return '';
    return value.trim().toUpperCase();
  };

  const getAuthEmailRedirectUrl = () => {
    if (typeof window === 'undefined') return undefined;
    return `${getPublicAppUrl()}/`;
  };

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
  };

  const hasPendingPlanSelection = (authUser: any) =>
    Boolean(authUser?.user_metadata?.needs_plan_selection);

  const hydrateUserAccess = async (authUser: any) => {
    if (!authUser) {
      setUser(null);
      setNeedsPlanSelection(false);
      return;
    }

    const baseUser = createBaseUser(authUser);
    setUser(baseUser);
    setNeedsPlanSelection(hasPendingPlanSelection(authUser));

    try {
      await ensureProfileRow({
        userId: authUser.id,
        fullName: baseUser.name,
        avatarUrl: baseUser.avatar || null
      });
      if (typeof window !== 'undefined') {
        const pendingCodeFromStorage = normalizeSchoolCode(window.localStorage.getItem(PENDING_SCHOOL_CODE_STORAGE_KEY));
        const pendingCodeFromMetadata = normalizeSchoolCode(authUser?.user_metadata?.pending_school_code);
        const pendingCode = pendingCodeFromStorage || pendingCodeFromMetadata;

        if (pendingCode) {
          const joinResult = await requestSchoolJoinWithCode(pendingCode);
          if (!joinResult.error) {
            window.localStorage.removeItem(PENDING_SCHOOL_CODE_STORAGE_KEY);
            if (pendingCodeFromMetadata) {
              try {
                await supabase.auth.updateUser({ data: { pending_school_code: null } });
              } catch {
                // Ignore metadata cleanup errors; request already succeeded.
              }
            }
          } else {
            console.warn('Failed to submit pending school code request:', joinResult.error.message);
          }
        }
      }
      const entitlements = await getMyEntitlements(authUser.id);

      setUser((prev) => {
        if (!prev || prev.id !== authUser.id) {
          return { ...baseUser, ...entitlements };
        }
        return { ...prev, ...entitlements };
      });
    } catch (error) {
      console.warn('Failed to hydrate account entitlements:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          await supabase.auth.signOut();
          if (isMounted) {
            setUser(null);
            setNeedsPlanSelection(false);
          }
          return;
        }
        if (session?.user) {
          await hydrateUserAccess(session.user);
        }
      } catch (authError) {
        await supabase.auth.signOut();
        if (isMounted) {
          setUser(null);
          setNeedsPlanSelection(false);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        if (typeof window !== 'undefined' && window.location.pathname !== '/reset-password') {
          window.history.pushState(null, '', '/reset-password');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } else {
        setIsPasswordRecovery(false);
      }

      if (session?.user) {
        void hydrateUserAccess(session.user);
      } else {
        setUser(null);
        setNeedsPlanSelection(false);
        if (event === 'SIGNED_OUT') {
          redirectToHome();
        }
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return { error };
  };

  const signup = async (email: string, password: string, name: string, schoolCode?: string) => {
    const cleanSchoolCode = normalizeSchoolCode(schoolCode);
    const signupMeta: Record<string, any> = {
      full_name: name,
      account_type: 'free',
      needs_plan_selection: true
    };
    if (cleanSchoolCode) {
      signupMeta.pending_school_code = cleanSchoolCode;
    }

    const emailRedirectTo = getAuthEmailRedirectUrl();

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: signupMeta,
            ...(emailRedirectTo ? { emailRedirectTo } : {})
        }
    });

    if (!error && data?.user && data.session?.user) {
      await ensureProfileRow({
        userId: data.user.id,
        fullName: name,
        avatarUrl: null,
        accountType: 'free'
      });
    }

    if (!error && data?.user && cleanSchoolCode) {
      if (data.session?.user) {
        const joinResult = await requestSchoolJoinWithCode(cleanSchoolCode);
        if (joinResult.error) {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(PENDING_SCHOOL_CODE_STORAGE_KEY, cleanSchoolCode);
          }
          return {
            error: new Error(
              `Account created, but school join request failed: ${joinResult.error.message}`
            ),
            requiresEmailConfirmation: !data.session,
            email: data.user.email || email
          };
        }

        try {
          await supabase.auth.updateUser({ data: { pending_school_code: null } });
        } catch {
          // Ignore metadata cleanup errors; join request already exists.
        }
      } else if (typeof window !== 'undefined') {
        window.localStorage.setItem(PENDING_SCHOOL_CODE_STORAGE_KEY, cleanSchoolCode);
      }
    }
    return {
      error,
      requiresEmailConfirmation: !error && Boolean(data?.user) && !data?.session,
      email: data?.user?.email || email
    };
  };

  const resendSignupConfirmation = async (email: string) => {
    const emailRedirectTo = getAuthEmailRedirectUrl();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: emailRedirectTo ? { emailRedirectTo } : undefined
    });

    return { error };
  };

  const requestPasswordReset = async (email: string) => {
    const redirectTo = getAuthEmailRedirectUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      ...(redirectTo ? { redirectTo } : {})
    });

    return { error };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setNeedsPlanSelection(false);
      setIsPasswordRecovery(false);
      redirectToHome();
    }
  };

  const refreshUserAccess = async () => {
    const userId = user?.id;
    if (!userId) return;
    try {
      const entitlements = await getMyEntitlements(userId);
      setUser((prev) => (prev ? { ...prev, ...entitlements } : prev));
    } catch (error) {
      console.warn('Failed to refresh user access:', error);
    }
  };

  const completePlanSelection = async () => {
    if (!user) return { error: 'No user logged in' };

    const { error } = await supabase.auth.updateUser({
      data: { needs_plan_selection: false }
    });

    if (!error) {
      setNeedsPlanSelection(false);
    }

    return { error };
  };

  const updateUserProfile = async (updates: { name?: string; avatarUrl?: string | null }) => {
    if (!user) return { error: 'No user logged in' };

    const authUpdates: { full_name?: string; avatar_url?: string | null } = {};
    if (updates.name !== undefined) authUpdates.full_name = updates.name;
    if (updates.avatarUrl !== undefined) authUpdates.avatar_url = updates.avatarUrl;

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabase.auth.updateUser({
        data: authUpdates
      });

      if (authError) return { error: authError };
    }

    const profileUpdates: { full_name?: string; avatar_url?: string | null } = {};
    if (updates.name !== undefined) profileUpdates.full_name = updates.name;
    if (updates.avatarUrl !== undefined) profileUpdates.avatar_url = updates.avatarUrl;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: dbError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);

      if (dbError) return { error: dbError };
    }

    setUser(prev => prev ? ({
        ...prev,
        name: updates.name ?? prev.name,
        avatar: updates.avatarUrl !== undefined ? (updates.avatarUrl || undefined) : prev.avatar
    }) : null);

    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        resendSignupConfirmation,
        requestPasswordReset,
        isPasswordRecovery,
        clearPasswordRecovery,
        logout,
        updateUserProfile,
        refreshUserAccess,
        needsPlanSelection,
        completePlanSelection,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
