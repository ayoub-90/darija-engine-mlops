import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PresenceUser {
  user_id: string;
  email?: string;
  current_page: string;
  online_at: string;
}

interface PresenceContextType {
  onlineUsers: Map<string, PresenceUser>;
  myPresence: PresenceUser | null;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: new Map(),
  myPresence: null,
});

export const usePresence = () => useContext(PresenceContext);

// ─── Page name resolver ───────────────────────────────────────────────────────
const PAGE_NAMES: Record<string, string> = {
  '': 'dashboard',
  dashboard: 'dashboard',
  datasets: 'datasets',
  training: 'training',
  deployments: 'deployments',
  team: 'team',
  settings: 'settings',
};

function getPageName(pathname: string): string {
  const seg = pathname.replace(/^\//, '').split('/')[0] || '';
  return PAGE_NAMES[seg] ?? (seg || 'dashboard');
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [myPresence, setMyPresence] = useState<PresenceUser | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to presence once authenticated
  useEffect(() => {
    if (!user) return;

    const ch = supabase.channel('online_users', {
      config: { presence: { key: user.id } },
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const map = new Map<string, PresenceUser>();
      for (const [uid, presences] of Object.entries(state)) {
        const p = (presences as any[])[0];
        if (p) {
          map.set(uid, {
            user_id: p.user_id ?? uid,
            email: p.email,
            current_page: p.current_page ?? 'unknown',
            online_at: p.online_at ?? new Date().toISOString(),
          });
        }
      }
      setOnlineUsers(map);
      const me = map.get(user.id);
      if (me) setMyPresence(me);
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const page = getPageName(location.pathname);
        await ch.track({
          user_id: user.id,
          email: user.email,
          current_page: page,
          online_at: new Date().toISOString(),
        });
      }
    });

    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [user?.id]);

  // Update presence when page changes (Realtime only, no DB write)
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch || !user) return;

    const page = getPageName(location.pathname);
    ch.track({
      user_id: user.id,
      email: user.email,
      current_page: page,
      online_at: new Date().toISOString(),
    }).catch(() => {});
  }, [location.pathname, user?.id]);

  // Periodic heartbeat every 60s (was 30s)
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(() => {
      const ch = channelRef.current;
      if (!ch) return;
      const page = getPageName(location.pathname);
      ch.track({
        user_id: user.id,
        email: user.email,
        current_page: page,
        online_at: new Date().toISOString(),
      }).catch(() => {});
      // Update last_seen_at in DB only on heartbeat (not on every page change)
      Promise.resolve(supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() } as any)
        .eq('id', user.id)
      ).catch(() => {});
    }, 60_000);
    return () => clearInterval(iv);
  }, [user?.id]);

  return (
    <PresenceContext.Provider value={{ onlineUsers, myPresence }}>
      {children}
    </PresenceContext.Provider>
  );
};
