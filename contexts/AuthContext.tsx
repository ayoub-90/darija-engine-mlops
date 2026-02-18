import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, recordUserIp, getUserRole } from "@/lib/supabase";
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: string | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: any }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signInWithEmail: async () => ({ error: null }),
  signInWithPassword: async () => ({ error: null }),
  signUpWithPassword: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        handleUserAuthenticated(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        handleUserAuthenticated(session.user.id, session.user.email);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserAuthenticated = async (userId: string, userEmail?: string) => {
    try {
      // Small delay to let the DB trigger (handle_new_user) finish creating the profile
      await new Promise(r => setTimeout(r, 500));

      // Fetch role
      let userRole = await getUserRole(userId);

      // Backfill profile if it's missing (trigger may have failed or legacy user)
      if (!userRole) {
        // Check what role was assigned in allowed_users (if whitelisted)
        let assignedRole = 'VIEWER'; // Safe default — NOT admin
        try {
          const { data: allowed } = await supabase
            .from('allowed_users')
            .select('role')
            .eq('email', userEmail?.toLowerCase() ?? '')
            .maybeSingle();
          if (allowed && (allowed as any).role) assignedRole = (allowed as any).role;
        } catch {
          // If allowed_users query fails, default to VIEWER
        }

        const { error } = await supabase.from('profiles').upsert({
          id: userId,
          email: userEmail,
          role: assignedRole,
          full_name: userEmail?.split('@')[0] || 'Utilisateur',
        } as any);
        if (!error) userRole = assignedRole;
      }

      setRole(userRole);
      
      // Record IP (non-blocking, don't await)
      recordUserIp(userId).catch(() => {});
    } catch (error) {
      console.error('Error in auth flow:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string) => {
    const result = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return result;
  };

  const signUpWithPassword = async (email: string, password: string) => {
    const result = await supabase.auth.signUp({ email, password });
    return result;
  };

  const signInWithPassword = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    return result;
  };

  const signOut = async () => {
    return await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signInWithEmail, signInWithPassword, signUpWithPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
