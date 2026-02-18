import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * Tracks PAGE_VIEW and CLICK events to audit_logs.
 * Presence is handled by PresenceContext — this hook only does audit logging.
 */
export function useActivityTracker() {
    const location = useLocation();

    // Log page views
    useEffect(() => {
        const page = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            supabase.from('audit_logs').insert([{
                user_email: user.email ?? 'unknown',
                action: 'PAGE_VIEW',
                resource: page,
            }]).then(() => { }).catch(() => { });
        });
    }, [location.pathname]);

    // Log clicks on interactive elements
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const btn = target.closest('button, a, [role="button"]');
            if (!btn) return;

            const label =
                btn.getAttribute('aria-label') ||
                (btn as HTMLElement).innerText?.slice(0, 50) ||
                btn.tagName;

            // Skip noisy labels
            if (!label || label.length < 2) return;

            supabase.auth.getUser().then(({ data: { user } }) => {
                if (!user) return;
                supabase.from('audit_logs').insert([{
                    user_email: user.email ?? 'unknown',
                    action: 'CLICK',
                    resource: label,
                }]).then(() => { }).catch(() => { });
            });
        };

        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);
}
