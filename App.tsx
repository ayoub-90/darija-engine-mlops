import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Database, Rocket, Users, Settings as SettingsIcon,
  Bell, Sun, Moon, Lock, ShieldAlert, LogOut, Activity, X, Check, Pencil, Brain,
} from 'lucide-react';

import Dashboard    from './pages/Dashboard';
import Datasets     from './pages/Datasets';
import Training     from './pages/Training';
import Deployments  from './pages/Deployments';
import Team         from './pages/Team';
import SettingsPage from './pages/Settings';
import AcceptInvitation from './pages/AcceptInvitation';
import { AuthProvider, useAuth }   from './contexts/AuthContext';
import { PresenceProvider, usePresence } from './contexts/PresenceContext';
import { supabase } from './lib/supabase';

// ─── View enum ────────────────────────────────────────────────────────────────
enum View {
  DASHBOARD   = 'dashboard',
  DATASETS    = 'datasets',
  TRAINING    = 'training',
  DEPLOYMENTS = 'deployments',
  TEAM        = 'team',
  SETTINGS    = 'settings',
}

const ADMIN_ONLY_VIEWS = new Set([View.SETTINGS, View.TEAM, View.DEPLOYMENTS]);

const VIEW_LABELS: Record<string, string> = {
  dashboard: '📊 Dashboard',
  datasets: '🗃️ Datasets',
  training: '🧠 Training',
  deployments: '🚀 Deployments',
  team: '👥 Team',
  settings: '⚙️ Settings',
};

// ─── Avatar Library ───────────────────────────────────────────────────────────
const AVATAR_LIBRARY = [
  { id: 'wolf',    emoji: '🐺', bg: 'from-slate-600 to-slate-800' },
  { id: 'lion',    emoji: '🦁', bg: 'from-amber-500 to-orange-600' },
  { id: 'eagle',   emoji: '🦅', bg: 'from-yellow-600 to-amber-700' },
  { id: 'dragon',  emoji: '🐉', bg: 'from-emerald-500 to-green-700' },
  { id: 'fox',     emoji: '🦊', bg: 'from-orange-400 to-red-500' },
  { id: 'cat',     emoji: '🐱', bg: 'from-pink-400 to-rose-500' },
  { id: 'owl',     emoji: '🦉', bg: 'from-purple-500 to-indigo-600' },
  { id: 'bear',    emoji: '🐻', bg: 'from-amber-700 to-yellow-900' },
  { id: 'panda',   emoji: '🐼', bg: 'from-gray-400 to-gray-600' },
  { id: 'shark',   emoji: '🦈', bg: 'from-blue-500 to-cyan-600' },
  { id: 'rocket',  emoji: '🚀', bg: 'from-indigo-500 to-violet-600' },
  { id: 'fire',    emoji: '🔥', bg: 'from-red-500 to-orange-500' },
  { id: 'star',    emoji: '⭐', bg: 'from-yellow-400 to-amber-500' },
  { id: 'gem',     emoji: '💎', bg: 'from-cyan-400 to-blue-500' },
  { id: 'bolt',    emoji: '⚡', bg: 'from-yellow-300 to-yellow-500' },
  { id: 'crown',   emoji: '👑', bg: 'from-yellow-500 to-amber-600' },
];

// ─── Error boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0a0a14] text-slate-900 dark:text-white p-8">
          <div className="max-w-lg w-full bg-white dark:bg-[#16162a] border border-red-500/30 rounded-2xl p-8">
            <h1 className="text-lg font-black text-red-400 mb-2">Runtime Error</h1>
            <pre className="bg-black/50 rounded-lg p-4 text-xs text-red-300 overflow-auto mb-4">
              {this.state.error.message}
            </pre>
            <button onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-colors">
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Access Denied ────────────────────────────────────────────────────────────
const AccessDenied: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full gap-6 py-20">
    <div className="size-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
      <ShieldAlert className="size-10 text-red-500" />
    </div>
    <div className="text-center">
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Accès Refusé</h2>
      <p className="text-sm text-slate-500 max-w-md">
        Cette page est réservée aux administrateurs. Contactez un admin.
      </p>
    </div>
  </div>
);

// ─── Profile Edit Popup ───────────────────────────────────────────────────────
interface ProfilePopupProps {
  user: any;
  role: string | null;
  currentPage: string;
  onSignOut: () => void;
  onClose: () => void;
}

const ProfilePopup: React.FC<ProfilePopupProps> = ({ user, role, currentPage, onSignOut, onClose }) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null);

  // Load current profile
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single();
      if (data) {
        setProfile(data as any);
        setNewName((data as any).full_name || '');
        setSelectedAvatar((data as any).avatar_url || null);
      }
    })();
  }, [user.id]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {};
      if (newName.trim()) updates.full_name = newName.trim();
      if (selectedAvatar) updates.avatar_url = selectedAvatar;
      
      await supabase.from('profiles').update(updates).eq('id', user.id);
      setProfile({ ...profile, ...updates });
      setEditing(false);
    } catch (e) {
      console.error('Save error:', e);
    }
    setSaving(false);
  };

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const currentAvatar = AVATAR_LIBRARY.find(a => a.id === (selectedAvatar || profile?.avatar_url));
  
  const roleBadge = role === 'ADMIN'
    ? 'bg-red-500/10 text-red-400 border-red-500/20'
    : role === 'RESEARCHER'
    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    : 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  return (
    <div ref={popupRef}
      className="absolute bottom-20 left-4 w-80 bg-white dark:bg-[#16162a] border border-slate-200 dark:border-[#222249] rounded-2xl shadow-2xl z-[100] overflow-hidden"
      style={{ animation: 'popupIn 150ms ease-out' }}
    >
      {/* Header */}
      <div className="p-5 bg-gradient-to-br from-primary/5 to-emerald-500/5 border-b border-slate-100 dark:border-[#222249]">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <button onClick={() => setEditing(true)} className="relative group">
            <div className={`size-14 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
              currentAvatar
                ? `bg-gradient-to-br ${currentAvatar.bg} border-white/20`
                : 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30'
            }`}>
              {currentAvatar ? currentAvatar.emoji : displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Pencil className="size-4 text-white" />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">{displayName}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${roleBadge}`}>
                {role || 'VIEWER'}
              </span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] text-emerald-500 font-bold">En ligne</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit mode */}
      {editing ? (
        <div className="p-5 space-y-4">
          {/* Name input */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
              Nom d'affichage
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#222249] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Votre nom..."
            />
          </div>

          {/* Avatar picker */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
              Choisir un avatar
            </label>
            <div className="grid grid-cols-8 gap-1.5">
              {AVATAR_LIBRARY.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAvatar(a.id)}
                  className={`size-8 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-110 ${
                    selectedAvatar === a.id
                      ? 'ring-2 ring-primary ring-offset-1 ring-offset-white dark:ring-offset-[#16162a] scale-110'
                      : 'hover:ring-1 hover:ring-slate-300'
                  } bg-gradient-to-br ${a.bg}`}
                >
                  {a.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)}
              className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-[#222249] text-xs font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-black hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 justify-center">
              {saving ? '...' : <><Check className="size-3" /> Sauvegarder</>}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Current activity */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-[#222249]">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <Activity className="size-3" />
              Activité actuelle
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">
              {VIEW_LABELS[currentPage] || `📄 ${currentPage}`}
            </p>
          </div>

          {/* Actions */}
          <div className="p-3 space-y-1">
            <button onClick={() => setEditing(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-white transition-all text-sm font-bold">
              <Pencil className="size-4" />
              Modifier le profil
            </button>
            <button onClick={onSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all text-sm font-bold">
              <LogOut className="size-4" />
              Se déconnecter
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main App Content ─────────────────────────────────────────────────────────
import { useActivityTracker } from './src/hooks/useActivityTracker';

const AppContent: React.FC = () => {
  const location = useLocation();
  useActivityTracker();

  const { user, loading, role, signInWithEmail, signInWithPassword, signUpWithPassword, signOut } = useAuth();
  const { onlineUsers, myPresence } = usePresence();
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const [isExpanded, setIsExpanded] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Debounced sidebar hover
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setIsExpanded(true), 40);
  };
  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setIsExpanded(false), 40);
    setShowProfilePopup(false);
  };

  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  // Load user profile for avatar
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (data) setUserProfile(data); });
  }, [user?.id]);

  // Listen for profile changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`profile_${user.id}`).on(
      'postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
      (payload: any) => { setUserProfile(payload.new); }
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // Public route
  if (location.pathname === '/accept-invitation') return <AcceptInvitation />;

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0a0a14]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  // Login
  if (!user) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginStatus(''); setLoginError('');
      setLoginStatus('Connexion...');

      // 1. Try to sign in (existing user)
      const { error: signInErr } = await signInWithPassword(email, password);
      if (!signInErr) { setLoginStatus('✓ Connecté !'); return; }

      // 2. If invalid credentials, check whitelist before creating account
      if (signInErr.message?.includes('Invalid login credentials') || signInErr.message?.includes('invalid_credentials')) {
        // Verify user is whitelisted via RPC (works for anonymous users)
        setLoginStatus('Vérification...');
        const { data: isAllowed } = await supabase.rpc('check_email_allowed', { check_email: email.toLowerCase().trim() });

        if (!isAllowed) {
          setLoginError('Accès refusé. Votre email n\'est pas autorisé.\n\nDemandez à un administrateur de vous inviter.');
          setLoginStatus('');
          return;
        }

        // Whitelisted → create account
        setLoginStatus('Création du compte...');
        const { data: signUpData, error: signUpErr } = await signUpWithPassword(email, password);
        if (signUpErr) {
          setLoginError(`Erreur: ${signUpErr.message}`);
          setLoginStatus('');
          return;
        }
        if (signUpData && (signUpData as any).session) {
          setLoginStatus('✓ Compte créé !');
          return;
        }
        // If no session, it means email confirmation is required
        setLoginError('Compte créé ! Réessayez de vous connecter avec le même mot de passe.');
        setLoginStatus('');
        return;
      }
      setLoginError(signInErr.message); setLoginStatus('');
    };

    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0a0a14] transition-colors duration-300">
        <div className="w-full max-w-md p-10 bg-white dark:bg-[#16162a] rounded-3xl shadow-2xl border border-slate-100 dark:border-[#222249]">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center size-14 rounded-2xl mb-6 rotate-3 hover:rotate-6 transition-transform relative">
              <div className="absolute inset-0 bg-emerald-500/30 rounded-2xl blur-lg" />
              <img src="/logo-hadik.png" alt="HADIK" className="size-14 relative z-10 drop-shadow-lg" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 mt-3 font-medium">hadik-engine workspace</p>
          </div>
          {loginError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs font-bold text-red-500 mb-4 whitespace-pre-line">{loginError}</div>
          )}
          {loginStatus && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs font-bold text-emerald-500 mb-4">{loginStatus}</div>
          )}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#222249] rounded-xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                placeholder="name@darija-engine.ma" required />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#222249] rounded-xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                placeholder="Min. 6 caractères" minLength={6} required />
            </div>
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl text-xs uppercase tracking-[0.15em] transition-all shadow-xl shadow-emerald-500/20 active:scale-95">
              Se connecter / Créer un compte
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navigation = [
    { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { id: View.DATASETS, label: 'Datasets', icon: Database, adminOnly: false },
    { id: View.TRAINING, label: 'Training', icon: Brain, adminOnly: false },
    { id: View.DEPLOYMENTS, label: 'Déploiements', icon: Rocket, adminOnly: true },
    { id: View.TEAM, label: 'Équipe', icon: Users, adminOnly: true },
    { id: View.SETTINGS, label: 'Paramètres', icon: SettingsIcon, adminOnly: true },
  ];

  const handleNavClick = (item: typeof navigation[0]) => {
    if (item.adminOnly && !isAdmin) return;
    setActiveView(item.id);
    setShowProfilePopup(false);
  };

  const renderContent = () => {
    if (ADMIN_ONLY_VIEWS.has(activeView) && !isAdmin) return <AccessDenied />;
    switch (activeView) {
      case View.DASHBOARD: return <Dashboard />;
      case View.DATASETS: return <Datasets />;
      case View.TRAINING: return <Training />;
      case View.DEPLOYMENTS: return <Deployments />;
      case View.TEAM: return <Team />;
      case View.SETTINGS: return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  // Resolve avatar
  const avatarData = AVATAR_LIBRARY.find(a => a.id === userProfile?.avatar_url);
  const displayName = userProfile?.full_name || user.email?.split('@')[0] || 'User';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0a0a14] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      {/* SIDEBAR */}
      <aside
        className={`flex flex-col bg-white dark:bg-[#16162a] border-r border-slate-200 dark:border-[#222249] z-50 will-change-[width] transition-[width] duration-150 ease-out ${isExpanded ? 'w-72' : 'w-[88px]'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Logo */}
        <div className="h-24 flex items-center px-6">
          <div className="flex items-center gap-4">
            <div className="relative size-10 min-w-10">
              <div className="absolute inset-0 bg-emerald-500/25 rounded-xl blur-md" />
              <img src="/logo-hadik.png" alt="HADIK" className="size-10 relative z-10 drop-shadow-md" />
            </div>
            <div className={`overflow-hidden transition-[opacity,width] duration-100 ease-out ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
              <h1 className="font-black text-lg tracking-tight leading-none text-slate-900 dark:text-white">HADIK</h1>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Engine v1.0</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1 py-6">
          {navigation.map((item) => {
            const locked = item.adminOnly && !isAdmin;
            return (
              <button key={item.id} onClick={() => handleNavClick(item)}
                title={locked ? 'Réservé aux admins' : item.label}
                className={`group flex items-center h-12 rounded-xl transition-colors duration-100 relative overflow-hidden outline-none w-full ${
                  locked ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                    : activeView === item.id ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                } ${isExpanded ? 'px-4 gap-4' : 'justify-center'}`}
              >
                {activeView === item.id && !locked && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-emerald-500" />}
                <div className="relative">
                  <item.icon className={`size-5 transition-transform duration-100 ${!locked ? 'group-hover:scale-110' : ''}`} />
                  {locked && <Lock className="absolute -top-1 -right-1 size-2.5 text-slate-400 dark:text-slate-600" />}
                </div>
                <span className={`font-bold text-sm whitespace-nowrap transition-[opacity,width] duration-100 ease-out ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 pointer-events-none'}`}>
                  {item.label}
                </span>
                {locked && isExpanded && <Lock className="size-3 ml-auto text-slate-300 dark:text-slate-700" />}
              </button>
            );
          })}
        </nav>

        {/* Online users count */}
        {isExpanded && onlineUsers.size > 0 && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
              {onlineUsers.size} en ligne
            </p>
          </div>
        )}

        {/* Bottom section */}
        <div className="p-4 border-t border-slate-100 dark:border-[#222249] space-y-2 relative">
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className={`flex items-center h-12 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-100 outline-none w-full ${isExpanded ? 'px-4 gap-4' : 'justify-center'}`}>
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
            {isExpanded && <span className="font-bold text-sm">Thème</span>}
          </button>

          {/* Avatar button */}
          <button onClick={() => setShowProfilePopup(!showProfilePopup)}
            className={`flex items-center gap-3 bg-slate-50 dark:bg-[#0a0a14]/50 rounded-xl border border-slate-100 dark:border-[#222249] transition-all duration-100 w-full hover:border-primary/50 ${isExpanded ? 'p-3' : 'p-2 justify-center'}`}>
            <div className="relative">
              {avatarData ? (
                <div className={`size-8 min-w-8 rounded-full flex items-center justify-center text-sm bg-gradient-to-br ${avatarData.bg} border border-white/20`}>
                  {avatarData.emoji}
                </div>
              ) : (
                <div className="size-8 min-w-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-black text-xs border border-emerald-200 dark:border-emerald-500/30">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-emerald-500 border-2 border-white dark:border-[#16162a] rounded-full" />
            </div>
            {isExpanded && (
              <div className="flex-1 overflow-hidden text-left">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">{displayName}</p>
                <p className="text-[9px] font-bold text-primary uppercase tracking-wider mt-0.5">{role || 'VIEWER'}</p>
              </div>
            )}
          </button>

          {showProfilePopup && (
            <ProfilePopup
              user={user}
              role={role}
              currentPage={activeView}
              onSignOut={signOut}
              onClose={() => setShowProfilePopup(false)}
            />
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-24 flex items-center justify-between px-10 shrink-0 z-30">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{activeView}</h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Platform Overview</p>
          </div>
          <div className="flex items-center gap-6">
            {isAdmin && (
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">
                <ShieldAlert className="size-3" /> Admin
              </div>
            )}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              {onlineUsers.size} En Ligne
            </div>
            <button className="relative p-2 text-slate-400 hover:text-emerald-500 transition-colors">
              <Bell className="size-6" />
              <span className="absolute top-2 right-2 size-2.5 bg-red-500 border-2 border-slate-50 dark:border-[#0a0a14] rounded-full" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-10 pb-10">
          <ErrorBoundary>{renderContent()}</ErrorBoundary>
        </main>
      </div>

      <style>{`
        @keyframes popupIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <PresenceProvider>
          <Routes>
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            <Route path="*" element={<AppContent />} />
          </Routes>
        </PresenceProvider>
      </BrowserRouter>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;