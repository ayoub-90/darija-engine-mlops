
import React from 'react';
import { 
  Puzzle, Cloud, Shield, Palette, Key, CreditCard, ChevronRight, 
  Plus, Eye, CheckCircle, DatabaseZap
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden transition-colors duration-300">
      <aside className="w-full lg:w-64 border-r border-slate-200 dark:border-border bg-white dark:bg-panel/30 flex flex-col py-8 overflow-y-auto shrink-0">
        <div className="px-8 mb-8">
          <h1 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-600">Platform Settings</h1>
        </div>
        <nav className="flex flex-col gap-1.5 px-4">
          {[
            { id: 'integrations', label: 'Integrations', icon: Puzzle, active: true },
            { id: 'storage', label: 'Cloud Storage', icon: Cloud },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'api', label: 'API Keys', icon: Key },
            { id: 'billing', label: 'Billing', icon: CreditCard },
          ].map((item) => (
            <button
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm outline-none ${
                item.active 
                  ? 'bg-primary/10 text-primary border-r-4 border-primary shadow-sm' 
                  : 'text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-border hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 sm:p-12 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
        <div className="max-w-4xl mx-auto space-y-12 pb-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 mb-2">
                Settings <ChevronRight className="size-3" /> <span className="text-primary">Integrations</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Integrations</h2>
              <p className="text-slate-500 mt-2 font-medium">Connect cloud providers and developer tools for the pipeline.</p>
            </div>
            <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20 active:scale-95 outline-none">
              <Plus className="size-4" /> ADD NEW
            </button>
          </div>

          <div className="space-y-8">
            {/* Azure Card */}
            <div className="bg-white dark:bg-panel border border-slate-200 dark:border-border rounded-2xl p-8 shadow-sm hover:border-primary/50 transition-all group">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-8">
                <div className="flex gap-5">
                  <div className="size-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform shrink-0">
                    <Cloud className="text-blue-600 dark:text-blue-500 size-7" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-slate-900 dark:text-white tracking-tight">Azure Cognitive Services</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-black mt-0.5">Speech-to-Text Backbone</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">Connection String</label>
                  <div className="relative">
                    <input className="w-full text-xs font-mono bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border rounded-xl px-4 py-3 pr-12 outline-none text-slate-500 dark:text-slate-400 focus:ring-1 focus:ring-primary transition-all" readOnly type="password" defaultValue="••••••••••••••••••••••••••••••••" />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white outline-none"><Eye className="size-4" /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">Active Region</label>
                  <div className="text-sm font-black text-slate-800 dark:text-white px-4 py-3 bg-slate-50 dark:bg-background-dark/30 rounded-xl border border-slate-200 dark:border-border/50">westeurope</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100 dark:border-border">
                <button className="px-6 py-2.5 bg-slate-100 dark:bg-border text-slate-700 dark:text-white text-[10px] font-black rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest outline-none">TEST CONNECTION</button>
                <button className="px-6 py-2.5 text-slate-400 dark:text-slate-600 hover:text-rose-500 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest outline-none">DISCONNECT</button>
              </div>
            </div>

            {/* Supabase Card */}
            <div className="bg-white dark:bg-panel border border-slate-200 dark:border-border rounded-2xl p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-8">
                <div className="flex gap-5">
                  <div className="size-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                    <DatabaseZap className="text-emerald-600 dark:text-emerald-500 size-7" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-slate-900 dark:text-white tracking-tight">Supabase</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-black mt-0.5">Metadata & Auth Sync</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                  Synced
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100 dark:border-border">
                <button className="px-6 py-2.5 bg-primary text-white text-[10px] font-black rounded-xl hover:bg-primary/90 transition-all uppercase tracking-widest shadow-lg shadow-primary/20 outline-none">CONFIGURE WEBHOOKS</button>
                <button className="px-6 py-2.5 bg-slate-100 dark:bg-border text-slate-700 dark:text-white text-[10px] font-black rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest outline-none">TEST SYNC</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Status Notification */}
      <div className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-50 pointer-events-none">
        <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="size-5" />
          <span className="font-black text-xs tracking-tight uppercase">Config Synced</span>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
