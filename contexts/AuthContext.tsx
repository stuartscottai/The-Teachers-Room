
import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signup: (email: string, password: string, name: string) => Promise<{ error: any }>;
  logout: () => void;
  updateUserProfile: (updates: { name?: string; avatarUrl?: string | null }) => Promise<{ error: any }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          await supabase.auth.signOut();
          if (isMounted) setUser(null);
          return;
        }
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || 'Teacher',
            avatar: session.user.user_metadata?.avatar_url || undefined
          });
        }
      } catch (authError) {
        await supabase.auth.signOut();
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || 'Teacher',
          avatar: session.user.user_metadata?.avatar_url || undefined
        });
      } else {
        setUser(null);
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

  const signup = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name
            }
        }
    });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
    <AuthContext.Provider value={{ user, login, signup, logout, updateUserProfile, isLoading }}>
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
