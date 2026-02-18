import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Users, UserPlus, ShieldCheck, History, Circle, Save, Loader2,
  RefreshCw, Shield, X, Download, Filter, ChevronDown, Trash2, AlertTriangle,
} from 'lucide-react';
import { supabase, getInvitations, cancelInvitation } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePresence, type PresenceUser } from '@/contexts/PresenceContext';
import type { Database, InvitationWithStatus } from '@/types/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────
type Profile = Database['public']['Tables']['profiles']['Row'];
type Role = 'ADMIN' | 'RESEARCHER' | 'ANNOTATOR';

interface AuditLog {
  id?: string;
  user_email: string;
  action: string;
  resource: string;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  'Manage Models', 'Training Access', 'Dataset Labeling',
  'API Keys', 'User Mgmt', 'Deployment',
] as const;
type PermKey = typeof ALL_PERMISSIONS[number];

const ADMIN_PERMS: Record<PermKey, boolean> = {
  'Manage Models': true, 'Training Access': true, 'Dataset Labeling': true,
  'API Keys': true, 'User Mgmt': true, 'Deployment': true,
};

const DEFAULT_MATRIX: Record<Role, Record<PermKey, boolean>> = {
  ADMIN:      { ...ADMIN_PERMS },
  RESEARCHER: { 'Manage Models': true,  'Training Access': true,  'Dataset Labeling': true,  'API Keys': false, 'User Mgmt': false, 'Deployment': false },
  ANNOTATOR:  { 'Manage Models': false, 'Training Access': false, 'Dataset Labeling': true,  'API Keys': false, 'User Mgmt': false, 'Deployment': false },
};

const VIEW_LABELS: Record<string, string> = {
  dashboard: '📊 Dashboard', datasets: '🗃️ Datasets', training: '🧠 Training',
  deployments: '🚀 Déploiements', team: '👥 Équipe', settings: '⚙️ Paramètres',
};

const AVATAR_LIBRARY = [
  { id: 'wolf', emoji: '🐺', bg: 'from-slate-600 to-slate-800' },
  { id: 'lion', emoji: '🦁', bg: 'from-amber-500 to-orange-600' },
  { id: 'eagle', emoji: '🦅', bg: 'from-yellow-600 to-amber-700' },
  { id: 'dragon', emoji: '🐉', bg: 'from-emerald-500 to-green-700' },
  { id: 'fox', emoji: '🦊', bg: 'from-orange-400 to-red-500' },
  { id: 'cat', emoji: '🐱', bg: 'from-pink-400 to-rose-500' },
  { id: 'owl', emoji: '🦉', bg: 'from-purple-500 to-indigo-600' },
  { id: 'bear', emoji: '🐻', bg: 'from-amber-700 to-yellow-900' },
  { id: 'panda', emoji: '🐼', bg: 'from-gray-400 to-gray-600' },
  { id: 'shark', emoji: '🦈', bg: 'from-blue-500 to-cyan-600' },
  { id: 'rocket', emoji: '🚀', bg: 'from-indigo-500 to-violet-600' },
  { id: 'fire', emoji: '🔥', bg: 'from-red-500 to-orange-500' },
  { id: 'star', emoji: '⭐', bg: 'from-yellow-400 to-amber-500' },
  { id: 'gem', emoji: '💎', bg: 'from-cyan-400 to-blue-500' },
  { id: 'bolt', emoji: '⚡', bg: 'from-yellow-300 to-yellow-500' },
  { id: 'crown', emoji: '👑', bg: 'from-yellow-500 to-amber-600' },
];

const ROLE_STYLES: Record<string, string> = {
  ADMIN:      'bg-red-500/15 text-red-400 border-red-500/25',
  RESEARCHER: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  ANNOTATOR:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  VIEWER:     'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast: React.FC<{ msg: string; type: 'ok' | 'err' }> = ({ msg, type }) => (
  <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold backdrop-blur-xl border ${
    type === 'ok'
      ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
      : 'bg-red-950/90 border-red-500/30 text-red-300'
  }`} style={{ animation: 'slideUp 300ms ease-out' }}>
    {type === 'ok' ? '✓' : '✕'} {msg}
  </div>
);

// ─── Role Change Popup (inline, friendly) ─────────────────────────────────────
interface RolePopupProps {
  member: Profile;
  online: boolean;
  currentPage?: string;
  anchorRect: DOMRect;
  onRoleChange: (id: string, email: string, role: Role) => Promise<void>;
  onDelete: (id: string, email: string) => Promise<void>;
  onClose: () => void;
}

const RolePopup: React.FC<RolePopupProps> = ({ member, online, currentPage, anchorRect, onRoleChange, onDelete, onClose }) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const name = member.full_name || (member as any).email?.split('@')[0] || 'Utilisateur';
  const avatarData = AVATAR_LIBRARY.find(a => a.id === member.avatar_url);
  const isMemberAdmin = member.role === 'ADMIN';

  const handleApply = async (role: Role) => {
    setSaving(true);
    setSelectedRole(role);
    await onRoleChange(member.id, (member as any).email || name, role);
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    await onDelete(member.id, (member as any).email || name);
    setDeleting(false);
    onClose();
  };

  // Position popup near member card
  const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 280);
  const left = Math.min(anchorRect.left + 20, window.innerWidth - 320);

  return (
    <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[2px]" style={{ animation: 'fadeIn 150ms ease-out' }}>
      <div ref={popupRef}
        className="absolute w-[300px] bg-white dark:bg-[#1a1a36] border border-slate-200 dark:border-[#2a2a52] rounded-2xl shadow-2xl overflow-hidden"
        style={{ top, left, animation: 'popupIn 200ms cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Header with member info */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-100 dark:border-[#2a2a52]">
          <div className="relative">
            {avatarData ? (
              <div className={`size-10 rounded-full flex items-center justify-center text-lg bg-gradient-to-br ${avatarData.bg} shadow-lg`}>
                {avatarData.emoji}
              </div>
            ) : (
              <div className="size-10 rounded-full bg-gradient-to-br from-primary/30 to-emerald-500/30 flex items-center justify-center text-white font-black text-xs">
                {name.slice(0, 2).toUpperCase()}
              </div>
            )}
            {online && <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-400 border-2 border-white dark:border-[#1a1a36] rounded-full" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {online && currentPage ? (
                <span className="text-[10px] text-emerald-500 font-semibold">
                  {VIEW_LABELS[currentPage] || currentPage}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-semibold">
                  {online ? 'En ligne' : 'Hors-ligne'}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="size-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
            <X className="size-3.5" />
          </button>
        </div>

        {/* Role selection */}
        {isMemberAdmin ? (
          <div className="p-4">
            <div className="flex items-center gap-2 text-[11px] text-amber-500 bg-amber-500/10 rounded-xl px-3 py-2.5 border border-amber-500/15">
              <Shield className="size-3.5 shrink-0" />
              <span className="font-semibold">Impossible de modifier le rôle d'un admin</span>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mb-2">
              Changer le rôle
            </p>
            {(['ANNOTATOR', 'RESEARCHER', 'ADMIN'] as Role[]).map(r => {
              const isCurrentRole = member.role === r;
              const isSelecting = saving && selectedRole === r;
              return (
                <button key={r}
                  onClick={() => !isCurrentRole && handleApply(r)}
                  disabled={isCurrentRole || saving}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                    isCurrentRole
                      ? 'bg-primary/10 text-primary border border-primary/20 cursor-default'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-white border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {r === 'ADMIN' && <Shield className="size-3" />}
                    {r}
                  </span>
                  {isCurrentRole && (
                    <span className="text-[8px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-md font-bold">ACTUEL</span>
                  )}
                  {isSelecting && <Loader2 className="size-3 animate-spin" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Delete button */}
        {!isMemberAdmin && (
          <div className="px-3 pb-3">
            <div className="border-t border-slate-100 dark:border-[#2a2a52] pt-3">
              {!confirmDelete ? (
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                >
                  <Trash2 className="size-3" />
                  Supprimer le membre
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-amber-500 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/15">
                    <AlertTriangle className="size-3 shrink-0" />
                    <span className="font-semibold">Êtes-vous sûr ? Cette action est irréversible.</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-[#2a2a52] text-[10px] font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                      Confirmer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Team: React.FC = () => {
  const { role: myRole, user: authUser } = useAuth();
  const { onlineUsers } = usePresence();
  const isAdmin = myRole === 'ADMIN';

  const [members, setMembers]         = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<InvitationWithStatus[]>([]);
  const [logs, setLogs]               = useState<AuditLog[]>([]);
  const [loading, setLoading]         = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState<Role>('ANNOTATOR');
  const [inviting, setInviting]       = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [toast, setToast]             = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [popupMember, setPopupMember] = useState<{ member: Profile; rect: DOMRect } | null>(null);
  const [logFilter, setLogFilter]     = useState<string>('all');
  const [logDateFilter, setLogDateFilter] = useState<string>('');
  const [logArchiving, setLogArchiving] = useState(false);

  const [activeRoleTab, setActiveRoleTab] = useState<Role>('ANNOTATOR');
  const [matrix, setMatrix] = useState<Record<Role, Record<PermKey, boolean>>>(
    JSON.parse(JSON.stringify(DEFAULT_MATRIX))
  );

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadPermissions = useCallback(async () => {
    try {
      const { data } = await supabase.from('role_permissions' as any).select('*');
      if (!data || data.length === 0) return;
      const built: Record<Role, Record<PermKey, boolean>> = JSON.parse(JSON.stringify(DEFAULT_MATRIX));
      for (const row of data) {
        if ((row as any).role === 'ADMIN') continue;
        const r = (row as any).role as Role;
        const p = (row as any).permission as PermKey;
        if (built[r] && (ALL_PERMISSIONS as readonly string[]).includes(p)) built[r][p] = (row as any).enabled;
      }
      built.ADMIN = { ...ADMIN_PERMS };
      setMatrix(built);
    } catch { /* table may not exist */ }
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('profiles').select('*').not('role', 'is', null).order('full_name', { ascending: true });
      if (data) setMembers(data as Profile[]);
      const invs = await getInvitations();
      setInvitations(invs);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('timestamp', thirtyDaysAgo)
        .order('timestamp', { ascending: false })
        .limit(100);
      if (data) setLogs(data as AuditLog[]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { Promise.all([fetchMembers(), fetchLogs(), loadPermissions()]); }, []);

  // ── Archive old logs ──────────────────────────────────────────────────────
  const archiveOldLogs = async () => {
    if (!isAdmin) return;
    setLogArchiving(true);
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: oldLogs } = await supabase.from('audit_logs').select('*').lt('timestamp', thirtyDaysAgo).order('timestamp', { ascending: false });

      if (oldLogs && oldLogs.length > 0) {
        const content = [
          `=== AUDIT LOG ARCHIVE ===`,
          `Generated: ${new Date().toLocaleString()}`,
          `Period: Before ${new Date(thirtyDaysAgo).toLocaleDateString()}`,
          `Total: ${oldLogs.length} entries`,
          '='.repeat(60), '',
          ...oldLogs.map((l: any) => `[${new Date(l.timestamp).toLocaleString()}] ${l.user_email} | ${l.action} | ${l.resource}`),
        ].join('\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.log`;
        a.click(); URL.revokeObjectURL(url);

        await supabase.from('audit_logs').delete().lt('timestamp', thirtyDaysAgo);
        await fetchLogs();
        notify(`${oldLogs.length} logs archivés ✓`);
      } else {
        notify('Aucun log ancien à archiver', 'err');
      }
    } catch (e: any) { notify(e.message || 'Erreur', 'err'); }
    setLogArchiving(false);
  };

  // ── Role change ───────────────────────────────────────────────────────────
  const handleRoleChange = async (memberId: string, memberEmail: string, newRole: Role) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole } as any).eq('id', memberId);
      if (error) throw new Error(error.message);
      await supabase.from('audit_logs' as any).insert([{
        user_email: authUser?.email ?? 'unknown',
        action: 'ROLE_CHANGED',
        resource: `${memberEmail} → ${newRole}`,
      }] as any);
      await fetchMembers();
      await fetchLogs();
      notify(`${memberEmail} → ${newRole}`);
    } catch (e: any) { notify(e.message || 'Erreur', 'err'); }
  };

  // ── Delete user ────────────────────────────────────────────────────────────
  const handleDeleteUser = async (memberId: string, memberEmail: string) => {
    if (!isAdmin) return;
    try {
      // Try full deletion via RPC (deletes from auth.users too)
      const { error: rpcErr } = await (supabase.rpc as any)('delete_user_fully', { target_user_id: memberId });

      if (rpcErr) {
        // Fallback: delete from profiles only if RPC not available
        const { error: profileErr } = await supabase.from('profiles').delete().eq('id', memberId);
        if (profileErr) throw new Error(profileErr.message);
        await supabase.from('user_ips').delete().eq('user_id', memberId).then(() => {});
      }

      // Remove from whitelist too
      await supabase.from('allowed_users').delete().eq('email', memberEmail.toLowerCase()).then(() => {});

      // Log the deletion
      await supabase.from('audit_logs' as any).insert([{
        user_email: authUser?.email ?? 'unknown',
        action: 'USER_DELETED',
        resource: memberEmail,
      }] as any);

      await fetchMembers();
      await fetchLogs();
      notify(`${memberEmail} supprimé`);
    } catch (e: any) { notify(e.message || 'Erreur lors de la suppression', 'err'); }
  };

  // ── Invite ────────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!inviteEmail.trim() || !isAdmin) return;
    setInviting(true);
    try {
      const email = inviteEmail.toLowerCase().trim();

      // 1. Whitelist the email
      await supabase.from('allowed_users').upsert([{ email, role: inviteRole }] as any, { onConflict: 'email' });

      // 2. Record invitation
      const { data: authData } = await supabase.auth.getUser();
      await supabase.from('invitations' as any).upsert([{
        email, role: inviteRole,
        invited_by: authData.user?.id ?? null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }] as any, { onConflict: 'email' }).then(() => {});

      // 3. Send magic link email → user clicks → sets password
      const siteUrl = window.location.origin;
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${siteUrl}/set-password`,
        },
      });

      if (otpErr) {
        // If magic link fails (rate limit, etc.), still whitelist but warn
        console.warn('Magic link send failed:', otpErr.message);
        notify(`${email} ajouté à la whitelist (email non envoyé: ${otpErr.message})`, 'err');
      } else {
        notify(`Invitation envoyée à ${email} 📧`);
      }

      // 4. Log
      await supabase.from('audit_logs' as any).insert([{
        user_email: authData.user?.email ?? email,
        action: 'MEMBER_INVITED',
        resource: `${email} → ${inviteRole}`,
      }] as any);

      setInviteEmail('');
      await fetchLogs(); await fetchMembers();
    } catch (e: any) {
      notify(e.message?.includes('row-level security') ? 'Permission refusée' : (e.message || 'Erreur'), 'err');
    }
    setInviting(false);
  };

  const handleCancelInvite = async (id: string, email: string) => {
    try { await cancelInvitation(id, email); notify('Invitation annulée'); await fetchMembers(); }
    catch (e: any) { notify(e.message, 'err'); }
  };

  // ── Permissions ───────────────────────────────────────────────────────────
  const togglePermission = (key: PermKey) => {
    if (activeRoleTab === 'ADMIN' || !isAdmin) return;
    setMatrix(prev => ({ ...prev, [activeRoleTab]: { ...prev[activeRoleTab], [key]: !prev[activeRoleTab][key] } }));
  };

  const savePermissions = async () => {
    if (activeRoleTab === 'ADMIN' || !isAdmin) return;
    setSavingPerms(true);
    try {
      const rows = (['RESEARCHER', 'ANNOTATOR'] as Role[]).flatMap(role =>
        ALL_PERMISSIONS.map(perm => ({ role, permission: perm, enabled: matrix[role][perm] }))
      );
      await supabase.from('role_permissions' as any).upsert(rows as any, { onConflict: 'role,permission' });
      await supabase.from('audit_logs' as any).insert([{
        user_email: authUser?.email ?? 'unknown',
        action: 'PERMISSIONS_SAVED',
        resource: `Role: ${activeRoleTab}`,
      }] as any);
      await fetchLogs();
      notify('Permissions sauvegardées ✓');
    } catch (e: any) { notify(e.message, 'err'); }
    setSavingPerms(false);
  };

  // ── Filtered logs ─────────────────────────────────────────────────────────
  const uniqueEmails = [...new Set(logs.map(l => l.user_email))];
  const filteredLogs = logs.filter(l => {
    if (logFilter !== 'all' && l.user_email !== logFilter) return false;
    if (logDateFilter) {
      const logDay = new Date(l.timestamp).toISOString().split('T')[0];
      if (logDay !== logDateFilter) return false;
    }
    return true;
  });
  const currentPerms = activeRoleTab === 'ADMIN' ? ADMIN_PERMS : matrix[activeRoleTab];
  const isAdminTab = activeRoleTab === 'ADMIN';

  // ── Member card click handler ─────────────────────────────────────────────
  const handleMemberClick = (member: Profile, e: React.MouseEvent) => {
    if (!isAdmin) return;
    const isMe = member.id === authUser?.id;
    if (isMe) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopupMember({ member, rect });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1400px] mx-auto space-y-8">

      {/* Online bar */}
      <div className="bg-emerald-500/8 border border-emerald-500/15 py-3 rounded-2xl flex items-center justify-center gap-3 text-emerald-500 text-sm font-semibold">
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        {onlineUsers.size} Membre{onlineUsers.size > 1 ? 's' : ''} en ligne
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT: Members + Invite ──────────────────────────────── */}
        <div className="lg:col-span-5 space-y-6">

          {/* Active Team */}
          <div className="bg-white dark:bg-[#12122a] border border-slate-200 dark:border-[#222250] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#222250] flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2.5">
                <Users className="size-4 text-primary" />
                Équipe Active
              </h3>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${ROLE_STYLES[myRole || 'VIEWER']}`}>
                  {myRole || 'VIEWER'}
                </span>
                <button onClick={fetchMembers} className="size-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-all">
                  <RefreshCw className="size-3" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-[#1e1e40] max-h-[500px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="size-5 animate-spin text-primary" /></div>
              ) : members.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">Aucun membre</div>
              ) : members.map((m) => {
                const presence = onlineUsers.get(m.id);
                const online = !!presence;
                const currentPage = presence?.current_page;
                const name = m.full_name || (m as any).email?.split('@')[0] || 'User';
                const isMe = m.id === authUser?.id;
                const avatarData = AVATAR_LIBRARY.find(a => a.id === m.avatar_url);
                const canClick = isAdmin && !isMe;

                return (
                  <div key={m.id}
                    onClick={(e) => handleMemberClick(m, e)}
                    className={`px-5 py-4 flex items-center gap-4 transition-all ${
                      canClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02]' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {avatarData ? (
                        <div className={`size-11 rounded-full flex items-center justify-center text-lg bg-gradient-to-br ${avatarData.bg} shadow-md`}>
                          {avatarData.emoji}
                        </div>
                      ) : (
                        <div className="size-11 rounded-full bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center text-primary dark:text-emerald-400 font-bold text-xs">
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white dark:border-[#12122a] ${
                        online ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'
                      }`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{name}</span>
                        {isMe && <span className="text-[8px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">MOI</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold ${online ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {online ? '● En ligne' : '○ Hors-ligne'}
                        </span>
                        {online && currentPage && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role badge */}
                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border shrink-0 ${ROLE_STYLES[m.role || 'VIEWER']}`}>
                      {m.role}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="bg-white dark:bg-[#12122a] border border-slate-200 dark:border-[#222250] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-[#222250]">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2.5">
                  <History className="size-4 text-amber-500" />
                  Invitations en attente
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-[#1e1e40] max-h-[250px] overflow-y-auto custom-scrollbar">
                {invitations.map(inv => (
                  <div key={inv.id} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{inv.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${ROLE_STYLES[inv.role]}`}>{inv.role}</span>
                        <span className={`text-[9px] font-semibold ${
                          inv.status === 'accepted' ? 'text-emerald-500' : inv.status === 'expired' ? 'text-red-400' : 'text-amber-500'
                        }`}>• {inv.status}</span>
                      </div>
                    </div>
                    {inv.status === 'pending' && isAdmin && (
                      <button onClick={() => handleCancelInvite(inv.id, inv.email)}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg px-3 py-1.5 hover:bg-red-500/5 transition-all">
                        Annuler
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite form */}
          {isAdmin && (
            <div className="bg-white dark:bg-[#12122a] border border-slate-200 dark:border-[#222250] rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2.5">
                <UserPlus className="size-4 text-primary" />
                Inviter un membre
              </h3>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                className="w-full bg-slate-50 dark:bg-[#0a0a1a] border border-slate-200 dark:border-[#2a2a52] rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="email@exemple.com" />
              <div className="flex gap-3">
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="flex-1 bg-slate-50 dark:bg-[#0a0a1a] border border-slate-200 dark:border-[#2a2a52] rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 outline-none cursor-pointer">
                  <option value="ANNOTATOR">Annotator</option>
                  <option value="RESEARCHER">Researcher</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-white font-bold px-6 rounded-xl text-sm transition-all shadow-lg shadow-primary/20 flex items-center gap-2 justify-center">
                  {inviting ? <Loader2 className="size-3.5 animate-spin" /> : 'Inviter'}
                </button>
              </div>
              {lastInviteLink && (
                <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/15 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-2">⚠️ Lien d'invitation (mode test)</p>
                  <div className="flex gap-2">
                    <input readOnly value={lastInviteLink}
                      className="flex-1 bg-white dark:bg-[#0a0a1a] border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2 text-xs font-mono text-slate-500 dark:text-slate-400" />
                    <button onClick={() => { navigator.clipboard.writeText(lastInviteLink); notify("Copié !"); }}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-bold shrink-0">Copier</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: RBAC ────────────────────────────────────────── */}
        <div className="lg:col-span-7 bg-white dark:bg-[#12122a] border border-slate-200 dark:border-[#222250] rounded-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-[#222250] flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2.5">
              <ShieldCheck className="size-4 text-primary" />
              Matrice RBAC
            </h3>
            {isAdmin && (
              <button onClick={savePermissions} disabled={savingPerms || isAdminTab}
                className="bg-primary hover:bg-primary/90 disabled:opacity-30 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                {savingPerms ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                Sauvegarder
              </button>
            )}
          </div>
          <div className="flex flex-1 min-h-[400px]">
            {/* Role tabs */}
            <div className="w-36 border-r border-slate-100 dark:border-[#222250] flex flex-col">
              {(['ADMIN', 'RESEARCHER', 'ANNOTATOR'] as Role[]).map(r => (
                <button key={r} onClick={() => setActiveRoleTab(r)}
                  className={`px-5 py-4 text-left text-[10px] font-bold tracking-wider transition-all ${
                    activeRoleTab === r
                      ? 'bg-primary/8 text-primary border-l-3 border-primary'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                  }`}>{r}</button>
              ))}
            </div>
            {/* Permissions grid */}
            <div className="flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
              {isAdminTab && (
                <div className="sm:col-span-2 bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 text-[10px] font-bold text-primary flex items-center gap-2">
                  <ShieldCheck className="size-3.5" /> Admin possède tous les privilèges
                </div>
              )}
              {ALL_PERMISSIONS.map(p => {
                const enabled = currentPerms[p];
                return (
                  <div key={p} onClick={() => togglePermission(p)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all select-none ${
                      (isAdminTab || !isAdmin)
                        ? 'opacity-50 cursor-not-allowed border-slate-100 dark:border-[#1e1e40]'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer border-slate-100 dark:border-[#1e1e40]'
                    }`}>
                    <div className={`size-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      enabled ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {enabled && <div className="size-1.5 bg-white rounded-sm" />}
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{p}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Audit Logs ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#12122a] border border-slate-200 dark:border-[#222250] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#222250] flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2.5">
            <History className="size-4 text-primary" />
            Logs de Sécurité
            <span className="text-[10px] text-slate-400 font-normal ml-1">— dernier mois</span>
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0a0a1a] border border-slate-200 dark:border-[#2a2a52] rounded-lg px-2.5 py-1.5">
              <Filter className="size-3 text-slate-400" />
              <select value={logFilter} onChange={(e) => setLogFilter(e.target.value)}
                className="bg-transparent text-[10px] font-semibold text-slate-500 dark:text-slate-400 outline-none cursor-pointer">
                <option value="all">Tous</option>
                {uniqueEmails.map(em => <option key={em} value={em}>{em.split('@')[0]}</option>)}
              </select>
            </div>
            <input type="date" value={logDateFilter} onChange={(e) => setLogDateFilter(e.target.value)}
              className="bg-slate-50 dark:bg-[#0a0a1a] border border-slate-200 dark:border-[#2a2a52] rounded-lg px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 outline-none cursor-pointer" />
            {logDateFilter && (
              <button onClick={() => setLogDateFilter('')}
                className="size-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all" title="Effacer la date">
                <X className="size-3" />
              </button>
            )}
            {isAdmin && (
              <button onClick={archiveOldLogs} disabled={logArchiving}
                className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-1.5 text-[10px] font-bold text-amber-500 hover:bg-amber-500/10 transition-all disabled:opacity-40">
                {logArchiving ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                Archiver
              </button>
            )}
            <button onClick={fetchLogs} className="size-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-all">
              <RefreshCw className="size-3" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-[#0a0a1a] text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-[#222250]">
              <tr>
                <th className="px-6 py-3">Opérateur</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Détails</th>
                <th className="px-6 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1a1a38]">
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-xs">Aucune activité</td></tr>
              ) : filteredLogs.map((log, i) => (
                <tr key={log.id ?? i} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-3 text-[11px] font-semibold text-slate-700 dark:text-slate-300">{log.user_email}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      log.action === 'ROLE_CHANGED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : log.action === 'PAGE_VIEW' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        : log.action === 'CLICK' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>{log.action}</span>
                  </td>
                  <td className="px-6 py-3 text-[10px] text-slate-400 font-mono">{log.resource}</td>
                  <td className="px-6 py-3 text-right text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline role popup */}
      {popupMember && (
        <RolePopup
          member={popupMember.member}
          online={onlineUsers.has(popupMember.member.id)}
          currentPage={onlineUsers.get(popupMember.member.id)?.current_page}
          anchorRect={popupMember.rect}
          onRoleChange={handleRoleChange}
          onDelete={handleDeleteUser}
          onClose={() => setPopupMember(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <style>{`
        @keyframes popupIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Team;