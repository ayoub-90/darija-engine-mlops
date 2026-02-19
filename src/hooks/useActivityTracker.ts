import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * Tracks PAGE_VIEW events to audit_logs (debounced).
 * Click tracking removed — it was causing ~50-100 DB writes/min per user.
 */
export function useActivityTracker() {
    const location = useLocation();
    const userRef = useRef<{ email: string } | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cache user once
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) userRef.current = { email: user.email ?? 'unknown' };
        });
    }, []);

    // Debounced page view logging (2s delay to avoid rapid navigation spam)
    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            const u = userRef.current;
            if (!u) return;
            const page = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
            Promise.resolve(supabase.from('audit_logs' as any).insert([{
                user_email: u.email,
                action: 'PAGE_VIEW',
                resource: page,
            }] as any)).catch(() => { });
        }, 2000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [location.pathname]);
}
