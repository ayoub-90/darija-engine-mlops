import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Check, Loader2, AlertTriangle } from 'lucide-react';

const SetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'done' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Listen for the auth event when user arrives via magic link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        setStatus('ready');
      }
    });

    // Check if already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus('ready');
      else {
        // Give a moment for the magic link auth to complete
        setTimeout(async () => {
          const { data: { session: s } } = await supabase.auth.getSession();
          if (s) setStatus('ready');
          else setStatus('error');
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setErrorMsg('Minimum 6 caractères'); return; }
    if (password !== confirm) { setErrorMsg('Les mots de passe ne correspondent pas'); return; }

    setStatus('saving');
    setErrorMsg('');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(error.message);
      setStatus('ready');
      return;
    }

    setStatus('done');
    setTimeout(() => { window.location.href = '/'; }, 2000);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0a0a14]">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-sm text-slate-400 font-bold">Vérification...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0a0a14]">
        <div className="w-full max-w-md p-10 bg-white dark:bg-[#16162a] rounded-3xl shadow-2xl border border-slate-100 dark:border-[#222249] text-center">
          <div className="size-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="size-7 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Lien expiré</h1>
          <p className="text-sm text-slate-400 mb-6">Ce lien n'est plus valide. Demandez un nouvel accès à l'administrateur.</p>
          <a href="/" className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl text-sm transition-all">
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0a0a14]">
        <div className="w-full max-w-md p-10 bg-white dark:bg-[#16162a] rounded-3xl shadow-2xl border border-slate-100 dark:border-[#222249] text-center">
          <div className="size-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <Check className="size-7 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Mot de passe défini !</h1>
          <p className="text-sm text-slate-400">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0a0a14] transition-colors duration-300">
      <div className="w-full max-w-md p-10 bg-white dark:bg-[#16162a] rounded-3xl shadow-2xl border border-slate-100 dark:border-[#222249]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl mb-6 relative">
            <div className="absolute inset-0 bg-emerald-500/30 rounded-2xl blur-lg" />
            <img src="/logo-hadik.png" alt="HADIK" className="size-14 relative z-10 drop-shadow-lg" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Définir votre mot de passe</h1>
          <p className="text-slate-400 mt-2 text-sm">Bienvenue dans HADIK Engine ! Créez votre mot de passe.</p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs font-bold text-red-500 mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#222249] rounded-xl pl-12 pr-5 py-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                placeholder="Min. 6 caractères"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#222249] rounded-xl pl-12 pr-5 py-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                placeholder="Répétez le mot de passe"
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'saving'}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl text-xs uppercase tracking-[0.15em] transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            {status === 'saving' ? (
              <><Loader2 className="size-4 animate-spin" /> Enregistrement...</>
            ) : (
              'Définir le mot de passe'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
