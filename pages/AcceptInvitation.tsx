// src/pages/AcceptInvitation.tsx
// Route: /accept-invitation?token=<hex_token>
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { Loader2, Camera, Check } from 'lucide-react';
import { supabase, acceptInvitation } from '@/lib/supabase';
import type { InvitationRow, Role } from '@/types/database.types';
import { ROLE_LABELS } from '@/types/database.types';

type Step = 'loading' | 'avatar' | 'signup' | 'accepting' | 'done' | 'error';

const AVATARS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Scooby',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Troubel',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bandit',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Misty',
];

const AcceptInvitation: React.FC = () => {
    const token = new URLSearchParams(window.location.search).get('token') ?? '';

    const [step,       setStep]       = useState<Step>('loading');
    const [invitation, setInvitation] = useState<InvitationRow | null>(null);
    const [error,      setError]      = useState<string | null>(null);

    const [fullName,  setFullName]  = useState('');
    const [email,     setEmail]     = useState('');
    const [password,  setPassword]  = useState('');
    const [avatar,    setAvatar]    = useState(AVATARS[0]);
    const [userIp,    setUserIp]    = useState<string | null>(null);
    const [loading,   setLoading]   = useState(false);

    // ── Pre-load IP & Metadata ────────────────────────────────────────────────
    useEffect(() => {
        fetch('https://api.ipify.org?format=json')
            .then(r => r.json())
            .then(data => setUserIp(data.ip))
            .catch(err => console.error('IP capture failed', err));
    }, []);

    // ── Validate token on mount ──────────────────────────────────────────────
    useEffect(() => {
        if (!token) {
            setError('Aucun token d\'invitation trouvé dans l\'URL.');
            setStep('error');
            return;
        }

        supabase
            .from('invitations')
            .select('*')
            .eq('token', token)
            .single()
            .then(({ data, error: e }) => {
                if (e || !data) {
                    setError('Lien d\'invitation invalide ou déjà utilisé.');
                    setStep('error');
                    return;
                }
                if (new Date(data.expires_at) < new Date()) {
                    setError('Ce lien a expiré. Demandez un nouvel envoi à un administrateur.');
                    setStep('error');
                    return;
                }
                if (data.accepted_at) {
                    setError('Cette invitation a déjà été acceptée.');
                    setStep('error');
                    return;
                }

                addLog(`Token verified. Email: ${data.email}, Role: ${data.role}`);
                setInvitation(data as InvitationRow);
                setEmail(data.email);

                // If already logged in → skip signup/avatar step
                supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user) {
                        addLog(`User already logged in: ${user.id}`);
                        doAccept(user.id);
                    } else {
                        addLog('No active session. Proceeding to Avatar selection.');
                        setStep('avatar'); // Go to Avatar selection first
                    }
                });
            });
    }, [token]);

    const doAccept = async (userId?: string) => {
        setStep('accepting');
        addLog(`Starting doAccept for user: ${userId}`);
        try {
            // 1. Secure Accept RPC
            addLog('Calling RPC: accept_invitation_secure...');
            const { error: rpcErr, data: rpcData } = await supabase.rpc('accept_invitation_secure', { token_str: token });
            if (rpcErr) {
                addLog(`RPC Error: ${rpcErr.message}`);
                throw rpcErr;
            }
            addLog('RPC Success. Invitation marked accepted.');

            // 2. Log extra metadata
            if (userId && userIp) {
                 addLog('Logging IP and Audit event...');
                 await supabase.from('user_ips').insert({
                     user_id: userId,
                     ip_address: userIp
                 }).catch(e => addLog(`IP Log skipped: ${e.message}`));
                 
                 await supabase.from('audit_logs').insert({
                     user_id: userId,
                     user_email: email,
                     action: 'INVITATION_ACCEPTED_WITH_IP',
                     resource: userIp,
                     ip_address: userIp
                 }).catch(e => addLog(`Audit Log skipped: ${e.message}`));
            }

            addLog('Process complete. Showing Done screen.');
            setStep('done');
        } catch (e: any) {
            console.error(e);
            addLog(`CRITICAL ERROR: ${e.message}`);
            setError(e.message || 'Erreur lors de l\'acceptation');
            setStep('error');
        }
    };

    const handleAvatarSelection = () => {
        setStep('signup');
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(null);
        addLog(`Starting signup for ${email}...`);

        try {
            const { error: signupErr, data } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        avatar_url: avatar,
                        role: invitation?.role ?? 'ANNOTATOR',
                    },
                    emailRedirectTo: window.location.href,
                },
            });
            
            if (signupErr) {
                addLog(`Signup Error: ${signupErr.message}`);
                throw signupErr;
            }
            
            addLog('Signup call successful.');
            
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                addLog('Session active. Proceeding to accept...');
                await doAccept(session.user.id);
            } else {
                addLog('No session returned. Email confirmation likely required.');
                setLoading(false);
                alert("Compte créé ! Veuillez vérifier votre email pour confirmer, puis revenez sur ce lien.");
            }
        } catch (e: any) {
            console.error(e);
            addLog(`EXCEPTION: ${e.message} (Status: ${e.status})`);
            if (e.status === 429 || e.message?.includes('rate limit')) {
                setError("Trop de tentatives (Rate Limit). Veuillez désactiver 'Confirm Email' dans Supabase ou attendre 1 heure.");
            } else {
                setError(e.message || "Erreur lors de l'inscription");
            }
            setLoading(false);
        }
    };

    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    // ── Layout ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-background-dark dark:bg-background-dark flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                {/* Debug Console */}
                <div className="mb-4 bg-black/50 p-4 rounded-xl font-mono text-[10px] text-green-400 h-32 overflow-y-auto border border-white/10">
                    <p className="text-white/50 mb-2 border-b border-white/10 pb-1">DEBUG CONSOLE</p>
                    {logs.length === 0 && <p className="text-white/20 italic">Waiting fogs...</p>}
                    {logs.map((l, i) => <div key={i}>{l}</div>)}
                </div>

                {/* Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                        bg-primary mb-4 shadow-xl shadow-primary/30">
                        <span className="text-white font-black text-xl">DE</span>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Darija Engine</h1>
                    <p className="text-slate-500 text-sm mt-1 font-bold uppercase tracking-widest">MLOps Platform</p>
                </div>

                <div className="bg-white dark:bg-panel border border-slate-200 dark:border-border
                    rounded-2xl p-8 shadow-xl shadow-black/20">

                    {/* Loading */}
                    {(step === 'loading' || step === 'accepting') && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <Loader2 className="size-8 animate-spin text-primary" />
                            <p className="text-slate-400 text-sm font-bold">
                                {step === 'loading' ? 'Validation du lien…' : 'Finalisation du compte…'}
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {step === 'error' && (
                        <div className="text-center">
                            <div className="text-5xl mb-4">🚫</div>
                            <h2 className="font-black text-slate-900 dark:text-white text-lg mb-2">
                                Invitation invalide
                            </h2>
                            <p className="text-slate-400 text-sm mb-6">{error}</p>
                            <a href="/"
                                className="inline-block bg-slate-100 dark:bg-white/10 hover:bg-slate-200
                                    dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 rounded-xl
                                    px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all">
                                Retour à l'accueil
                            </a>
                        </div>
                    )}

                    {/* Done */}
                    {step === 'done' && (
                        <div className="text-center">
                            <div className="text-5xl mb-4">🎉</div>
                            <h2 className="font-black text-slate-900 dark:text-white text-lg mb-2">
                                Compte activé !
                            </h2>
                            <p className="text-slate-400 text-sm mb-1">
                                Votre rôle :{' '}
                                <strong className="text-primary">
                                    {ROLE_LABELS[(invitation?.role ?? 'ANNOTATOR') as Role]}
                                </strong>
                            </p>
                            <a href="/"
                                className="inline-block mt-6 bg-primary hover:bg-primary/90 text-white
                                    rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest
                                    shadow-lg shadow-primary/20 transition-all">
                                Ouvrir le tableau de bord
                            </a>
                        </div>
                    )}

                    {/* Avatar Selection Step */}
                    {step === 'avatar' && (
                        <div className="text-center">
                            <h2 className="font-black text-slate-900 dark:text-white text-lg mb-2">
                                Choisissez votre avatar
                            </h2>
                            <p className="text-slate-400 text-xs mb-6">
                                Cela servira à vous identifier dans l'équipe.
                            </p>
                            
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                {AVATARS.map((url, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setAvatar(url)}
                                        className={`relative rounded-full p-1 border-2 transition-all group
                                            ${avatar === url 
                                                ? 'border-primary ring-4 ring-primary/20 scale-110 z-10' 
                                                : 'border-transparent hover:border-slate-200 dark:hover:border-white/20'
                                            }`}
                                    >
                                        <img src={url} alt="Avatar option" className="rounded-full bg-slate-100" />
                                        {avatar === url && (
                                            <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1">
                                                <Check className="size-3" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            
                            <button
                                onClick={handleAvatarSelection}
                                className="w-full bg-slate-900 dark:bg-white hover:opacity-90 
                                    text-white dark:text-slate-900 rounded-xl py-3 text-xs font-black 
                                    uppercase tracking-widest transition-all">
                                Continuer
                            </button>
                        </div>
                    )}

                    {/* Signup form */}
                    {step === 'signup' && invitation && (
                        <div>
                            <div className="mb-6 flex items-center gap-4">
                                <img src={avatar} alt="Selected" className="size-12 rounded-full border-2 border-slate-100 bg-slate-50" />
                                <div>
                                    <h2 className="font-black text-slate-900 dark:text-white uppercase
                                        tracking-widest text-xs mb-0.5">
                                        Finalisation
                                    </h2>
                                    <p className="text-slate-400 text-xs">
                                        Rejoindre en tant que <span className="text-primary font-bold">{ROLE_LABELS[invitation.role as Role]}</span>
                                    </p>
                                </div>
                            </div>
                            
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl
                                    px-4 py-3 text-xs font-bold text-red-500 mb-4">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSignup} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400
                                        uppercase tracking-widest mb-1.5">
                                        Nom complet
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Prénom Nom"
                                        required
                                        autoFocus
                                        className="w-full bg-white dark:bg-background-dark border border-slate-200
                                            dark:border-border rounded-xl px-4 py-3 text-sm outline-none
                                            focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400
                                        uppercase tracking-widest mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        readOnly
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200
                                            dark:border-border rounded-xl px-4 py-3 text-sm
                                            text-slate-400 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400
                                        uppercase tracking-widest mb-1.5">
                                        Mot de passe
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min. 8 caractères"
                                        minLength={8}
                                        required
                                        className="w-full bg-white dark:bg-background-dark border border-slate-200
                                            dark:border-border rounded-xl px-4 py-3 text-sm outline-none
                                            focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep('avatar')}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl px-4 py-3 font-bold transition-all"
                                    >BACK</button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50
                                            text-white rounded-xl py-3 text-xs font-black uppercase
                                            tracking-widest transition-all shadow-lg shadow-primary/20
                                            flex items-center justify-center gap-2">
                                        {loading
                                            ? <><Loader2 className="size-3.5 animate-spin" /> Création…</>
                                            : 'CRÉER LE COMPTE'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AcceptInvitation;