
import React from 'react';
import { 
  Square, Timer, TrendingDown, Database, Eye, History, PlusCircle, Download, Terminal,
  Cpu, Rocket
} from 'lucide-react';

const Training: React.FC = () => {
  return (
    <div className="max-w-[1600px] mx-auto p-8 space-y-8 flex flex-col h-[calc(100vh-64px)] overflow-hidden transition-colors duration-300">
      {/* Active Session Card */}
      <section className="p-8 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 relative overflow-hidden flex flex-col md:flex-row items-center gap-10 shrink-0 shadow-lg">
        <div className="absolute -top-32 -right-32 size-96 bg-primary/10 blur-[100px] -z-10 rounded-full animate-pulse" />
        <div className="flex-1 space-y-6 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary rounded-2xl shadow-xl shadow-primary/20">
                <Cpu className="text-white size-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Active Training: v1.5-LORA</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Moroccan Darija Speech Recognition Fine-tuning</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-primary">68%</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">Est. 2h 15m remaining</p>
            </div>
          </div>
          
          <div className="w-full bg-slate-200 dark:bg-panel rounded-full h-4 p-1 overflow-hidden">
            <div className="bg-primary h-full rounded-full w-[68%] relative shadow-[0_0_20px_rgba(60,60,246,0.4)] transition-all duration-1000">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-bold"><Timer className="size-4 text-primary" /> Epoch: 14/20</div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-bold"><TrendingDown className="size-4 text-primary" /> Loss: 0.245</div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-bold"><Database className="size-4 text-primary" /> Samples: 1.2M</div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 min-w-[160px] w-full md:w-auto">
          <button className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95 outline-none">
            <Eye className="size-4" /> MONITOR
          </button>
          <button className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-500 border border-rose-500/30 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 outline-none">
            <Square className="size-4" /> ABORT
          </button>
        </div>
      </section>

      {/* Registry and New Training Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 overflow-hidden">
        {/* Left: Versions */}
        <div className="lg:col-span-7 bg-white dark:bg-panel border border-slate-200 dark:border-border rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-border flex items-center justify-between shrink-0 bg-white/50 dark:bg-panel/50 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <History className="size-5 text-primary" />
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Model Version Registry</h3>
            </div>
            <button className="text-xs font-black text-primary hover:underline outline-none">VIEW ALL</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 dark:bg-panel/90 z-10 text-[10px] uppercase font-black text-slate-500 tracking-[0.15em] border-b border-slate-100 dark:border-border">
                <tr>
                  <th className="px-8 py-5">Version</th>
                  <th className="px-8 py-5">WER (%)</th>
                  <th className="px-8 py-5">Date</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-border/50">
                {[
                  { v: 'v1.4-prod', desc: 'Whisper Large v3', wer: '8.2%', date: 'Oct 24, 2023', status: 'Production', color: 'emerald' },
                  { v: 'v1.3-stable', desc: 'Whisper Medium', wer: '10.4%', date: 'Oct 12, 2023', status: 'Staging', color: 'blue' },
                  { v: 'v1.2-beta', desc: 'Whisper Small', wer: '14.1%', date: 'Sep 28, 2023', status: 'Archived', color: 'slate' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="font-mono text-sm font-black text-slate-800 dark:text-white">{row.v}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-600 font-bold">{row.desc}</div>
                    </td>
                    <td className="px-8 py-5"><span className={`${row.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'} font-black`}>{row.wer}</span></td>
                    <td className="px-8 py-5 text-xs text-slate-500 font-medium">{row.date}</td>
                    <td className="px-8 py-5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                        row.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-500' : 
                        row.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' : 
                        'bg-slate-100 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30 text-slate-500'
                      }`}>{row.status}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button className="p-2 text-slate-400 hover:text-primary transition-colors outline-none"><Download className="size-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: New Run Configuration */}
        <div className="lg:col-span-5 bg-white dark:bg-panel border border-slate-200 dark:border-border rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-border flex items-center gap-3 shrink-0 bg-white/50 dark:bg-panel/50 backdrop-blur-md">
            <PlusCircle className="size-5 text-primary" />
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">New Training Run</h3>
          </div>
          <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8">
            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Base Architecture</label>
              <select className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-200 dark:border-border rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:ring-primary focus:border-primary px-4 py-3 outline-none">
                <option>Whisper Large v3 (Advanced)</option>
                <option>Whisper Medium (Balanced)</option>
                <option>Custom Darija-Transformer</option>
              </select>
            </div>
            
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Datasets</label>
              {['Casablanca Street Speech', 'Rabat News Corpus'].map((ds, i) => (
                <label key={i} className="flex items-center p-4 rounded-xl border border-slate-100 dark:border-border bg-slate-50/50 dark:bg-background-dark/20 hover:border-primary/50 cursor-pointer transition-all">
                  <input type="checkbox" defaultChecked className="rounded text-primary focus:ring-primary bg-white dark:bg-background-dark border-slate-300 dark:border-border size-4" />
                  <div className="ml-4">
                    <span className="text-sm font-black text-slate-800 dark:text-white">{ds}</span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase mt-0.5">{i === 0 ? '450h Audio | 2023 Corpus' : '120h High Quality | Radio/TV'}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-4 mt-auto">
              <button className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-[0.98] outline-none">
                <Rocket className="size-5" /> INITIALIZE RUN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Emulator */}
      <section className="h-64 bg-slate-900 dark:bg-black border border-slate-800 dark:border-border rounded-2xl overflow-hidden flex flex-col shadow-inner">
        <div className="px-6 py-2.5 border-b border-slate-800 dark:border-border flex items-center justify-between bg-slate-800/50 dark:bg-panel/80">
          <div className="flex items-center gap-6">
            <div className="flex gap-2">
              <div className="size-3 rounded-full bg-rose-500/30 border border-rose-500/50" />
              <div className="size-3 rounded-full bg-amber-500/30 border border-amber-500/50" />
              <div className="size-3 rounded-full bg-emerald-500/30 border border-emerald-500/50" />
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-slate-400 dark:text-slate-600" />
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">Live Logs: v1.5-LORA</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-[10px] font-mono font-black text-slate-500 dark:text-slate-600 hover:text-slate-300 outline-none">CLEAR</button>
            <button className="text-[10px] font-mono font-black text-slate-500 dark:text-slate-600 hover:text-slate-300 outline-none">AUTOSCROLL: ON</button>
          </div>
        </div>
        <div className="flex-1 p-6 font-mono text-[11px] overflow-y-auto custom-scrollbar leading-relaxed">
          <div className="space-y-1.5 text-slate-300">
            <p><span className="text-blue-400 font-bold">[INFO]</span> <span className="text-slate-500">2023-11-05 14:32:01</span> - Loaded base weights from whisper-large-v3</p>
            <p><span className="text-blue-400 font-bold">[INFO]</span> <span className="text-slate-500">2023-11-05 14:32:04</span> - Initializing LoRA layers... Found 48 target modules</p>
            <p><span className="text-emerald-400 font-bold">[SUCCESS]</span> <span className="text-slate-500">2023-11-05 15:45:12</span> - Epoch 10 complete. Loss improved from 0.452 to 0.381</p>
            <p><span className="text-amber-400 font-bold">[WARNING]</span> <span className="text-slate-500">2023-11-05 16:12:44</span> - High GPU temperature detected (82°C) on Device 4</p>
            <p><span className="text-blue-400 font-bold">[INFO]</span> <span className="text-slate-500">2023-11-05 17:05:33</span> - Processing Epoch 14/20: Step 14200/20000</p>
            <p className="animate-pulse flex items-center gap-1">
              <span className="text-blue-400 font-bold">[INFO]</span> <span className="text-slate-500">2023-11-05 17:05:40</span> - Streaming next batch into VRAM...
              <span className="w-2 h-4 bg-primary/60 ml-1 block" />
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Training;
