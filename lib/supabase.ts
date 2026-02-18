import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import type {
    Role,
    ProfileRow,
    InvitationRow,
    InvitationWithStatus,
    RolePermRow,
    RolePermMatrix,
    AuditLogRow,
} from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL: Supabase credentials missing in .env');
}

export const supabase = createClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

// =============================================================================
// EXISTING HELPERS (unchanged logic, kept exactly)
// =============================================================================

export const getUserRole = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            if (error.code !== 'PGRST116') {
                console.error('Error fetching user role:', error.message);
            }
            return null;
        }

        return data?.role || null;
    } catch (err) {
        console.error('Unexpected error in getUserRole:', err);
        return null;
    }
};

/**
 * Records the current user's IP in the user_ips table.
 *
 * FIX: onConflict was 'user_id, ip_address' (requires a composite unique
 * constraint in the DB). Changed to 'user_id' so it works with a simple
 * unique constraint on user_id alone (one row per user, updated each visit).
 */
export const recordUserIp = async (userId: string) => {
    if (!userId) return;

    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const { ip } = await response.json();
        if (!ip) return;

        const { error } = await supabase
            .from('user_ips')
            .upsert(
                {
                    user_id: userId,
                    ip_address: ip,
                    last_seen: new Date().toISOString(),
                },
                { onConflict: 'user_id' }   // ← FIX: was 'user_id, ip_address'
            );

        if (error) {
            if (error.code === '42501') {
                console.warn('RLS Policy blocked IP recording. Check Supabase Policies for "user_ips".');
            } else if (error.code === '42P10') {
                // No unique constraint at all — try a plain insert/update instead
                await supabase.from('user_ips').upsert(
                    { user_id: userId, ip_address: ip, last_seen: new Date().toISOString() }
                );
            } else {
                console.warn('recordUserIp (non-fatal):', error.message);
            }
        }
    } catch (err) {
        // Non-fatal — never crash the app over IP logging
        console.warn('recordUserIp (non-fatal):', err);
    }
};

// =============================================================================
// NEW HELPERS
// =============================================================================

// ─── Profiles ────────────────────────────────────────────────────────────────

export const getTeamMembers = async (): Promise<ProfileRow[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('role', 'is', null)
        .order('full_name', { ascending: true });

    if (error) throw error;
    return (data ?? []) as ProfileRow[];
};

export const updateMemberRole = async (userId: string, role: Role): Promise<void> => {
    const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);
    if (error) throw error;
    await logAuditEvent('ROLE_CHANGED', `User ${userId}`, { newRole: role });
};

export const updateLastSeen = async (): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
            .from('profiles')
            .update({ last_seen_at: new Date().toISOString() } as any)
            .eq('id', user.id);
    } catch {
        // Non-fatal
    }
};

export const isOnline = (lastSeen: string | null): boolean => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
};

// ─── Invitations ─────────────────────────────────────────────────────────────

export const inviteUser = async (email: string, role: Role): Promise<InvitationRow> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const trimmedEmail = email.toLowerCase().trim();

    const { data, error } = await supabase
        .from('invitations')
        .upsert(
            {
                email: trimmedEmail,
                role,
                invited_by: user.id,
                accepted_at: null,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
            { onConflict: 'email' }
        )
        .select()
        .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create invitation — no data returned.');

    await supabase
        .from('allowed_users')
        .upsert({ email: trimmedEmail, role }, { onConflict: 'email' });

    await logAuditEvent('MEMBER_WHITELISTED', `Role assigned: ${role}`, { email: trimmedEmail, role });

    // Non-fatal: Edge Function may not be deployed yet
    try {
        await supabase.functions.invoke('send-invitation', {
            body: { email: trimmedEmail, token: data.token, role },
        });
    } catch {
        console.warn('[invite] Edge function not deployed — token:', (data as any).token);
    }

    return data as InvitationRow;
};

export const getInvitations = async (): Promise<InvitationWithStatus[]> => {
    const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return ((data ?? []) as InvitationRow[]).map((inv) => ({
        ...inv,
        status:
            inv.accepted_at ? 'accepted'
                : new Date(inv.expires_at) < new Date() ? 'expired'
                    : 'pending',
    }));
};

export const cancelInvitation = async (id: string, email: string): Promise<void> => {
    const { error } = await supabase.from('invitations').delete().eq('id', id);
    if (error) throw error;
    await supabase.from('allowed_users').delete().eq('email', email);
    await logAuditEvent('INVITATION_CANCELLED', email);
};

export const acceptInvitation = async (token: string): Promise<InvitationRow> => {
    const { data: inv, error: fetchErr } = await supabase
        .from('invitations').select('*').eq('token', token).single();

    if (fetchErr || !inv) throw new Error('Invalid or expired invitation link.');
    if (new Date(inv.expires_at) < new Date()) throw new Error('This invitation has expired.');
    if (inv.accepted_at) throw new Error('This invitation has already been accepted.');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in to accept an invitation.');

    const { data: updated, error } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', inv.id).select().single();

    if (error) throw error;

    await supabase.from('profiles').update({ role: inv.role }).eq('id', user.id);
    await logAuditEvent('INVITATION_ACCEPTED', inv.email, { role: inv.role });

    return updated as InvitationRow;
};

// ─── Role Permissions ─────────────────────────────────────────────────────────

export const getRolePermissions = async (): Promise<RolePermRow[]> => {
    const { data, error } = await supabase
        .from('role_permissions').select('*').order('role').order('permission');
    if (error) throw error;
    return (data ?? []) as RolePermRow[];
};

export const getRolePermMatrix = async (): Promise<RolePermMatrix> => {
    const rows = await getRolePermissions();
    const matrix = {} as RolePermMatrix;
    for (const row of rows) {
        if (!matrix[row.role]) matrix[row.role] = {};
        matrix[row.role][row.permission] = row.enabled;
    }
    return matrix;
};

export const updateRolePermission = async (
    role: Role, permission: string, enabled: boolean
): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
        .from('role_permissions')
        .upsert({ role, permission, enabled, updated_by: user?.id ?? null }, { onConflict: 'role,permission' });
    if (error) throw error;
    await logAuditEvent('PERMISSION_TOGGLED', `${role} → ${permission}`, { enabled });
};

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export const getAuditLogs = async (limit = 50): Promise<AuditLogRow[]> => {
    const { data, error } = await supabase
        .from('audit_logs').select('*')
        .order('timestamp', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []) as AuditLogRow[];
};

export const logAuditEvent = async (
    action: string, resource?: string, details?: Record<string, unknown>
): Promise<void> => {
    try {
        await supabase.rpc('log_audit_event', {
            p_action: action,
            p_resource: resource ?? null,
            p_details: details ?? null,
        });
    } catch {
        console.warn('[audit] Failed to log:', action);
    }
};

// ─── Realtime ─────────────────────────────────────────────────────────────────

export const subscribeToProfiles = (cb: () => void): RealtimeChannel =>
    supabase.channel('rt-profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, cb)
        .subscribe();

export const subscribeToAuditLogs = (cb: () => void): RealtimeChannel =>
    supabase.channel('rt-audit-logs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, cb)
        .subscribe();

export const subscribeToInvitations = (cb: () => void): RealtimeChannel =>
    supabase.channel('rt-invitations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations' }, cb)
        .subscribe();

// ─── Presence ─────────────────────────────────────────────────────────────────

let _presenceChannel: RealtimeChannel | null = null;

export const trackPresence = async (
    onSync: (ids: Set<string>) => void
): Promise<RealtimeChannel> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    _presenceChannel = supabase.channel('team_presence', {
        config: { presence: { key: user.id } },
    });

    _presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = _presenceChannel!.presenceState();
            // Presence state keys are user_ids as configured in channel creation
            onSync(new Set(Object.keys(state)));
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await _presenceChannel!.track({
                    user_id: user.id,
                    online_at: new Date().toISOString(),
                });
            }
        });

    return _presenceChannel;
};

export const stopPresenceTracking = (): void => {
    if (_presenceChannel) {
        supabase.removeChannel(_presenceChannel);
        _presenceChannel = null;
    }
};

export const getOnlineUsers = async (): Promise<string[]> => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await supabase
        .from('user_ips').select('user_id').gte('last_seen', fiveMinutesAgo);
    return (data ?? []).map((r) => r.user_id);
};