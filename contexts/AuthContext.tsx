
import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signup: (email: string, password: string, name: string) => Promise<{ error: any }>;
  logout: () => void;
  updateUserProfile: (name: string) => Promise<{ error: any }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || 'Teacher',
          avatar: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.user_metadata?.full_name || 'T')}&background=FACC15&color=0F172A`
        });
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || 'Teacher',
          avatar: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.user_metadata?.full_name || 'T')}&background=FACC15&color=0F172A`
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
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
                full_name: name,
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FACC15&color=0F172A`
            }
        }
    });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUserProfile = async (name: string) => {
    if (!user) return { error: 'No user logged in' };
    
    // 1. Update Auth User Metadata (for session persistence)
    const { error: authError } = await supabase.auth.updateUser({
      data: { 
        full_name: name,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FACC15&color=0F172A`
      }
    });

    if (authError) return { error: authError };

    // 2. Update Profiles Table (for relational data)
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ 
          full_name: name,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FACC15&color=0F172A`
      })
      .eq('id', user.id);
    
    if (dbError) return { error: dbError };

    // 3. Update Local State immediately
    setUser(prev => prev ? ({ 
        ...prev, 
        name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FACC15&color=0F172A`
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
