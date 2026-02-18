
import React from 'react';
import { 
  Activity, Signal, Waves, ChevronRight, Download, 
  ShieldAlert, RefreshCw, MoreVertical, Terminal, Send
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

const LATENCY_DATA = [
  { time: '12:00', val: 180 }, { time: '13:00', val: 210 }, { time: '14:00', val: 195 },
  { time: '15:00', val: 240 }, { time: '16:00', val: 280 }, { time: '17:00', val: 230 },
  { time: '18:00', val: 190 }, { time: '19:00', val: 205 }, { time: '20:00', val: 220 },
  { time: '21:00', val: 310 }, { time: '22:00', val: 260 }, { time: '23:00', val: 185 },
];

const Deployments: React.FC = () => {
  return (
    <div className="max-w-[1400px] mx-auto p-8 lg:px-20 space-y-10 transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 font-bold uppercase tracking-wider">
            Models <ChevronRight className="size-3" /> <span className="text-slate-400">Deployment & Monitoring</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Production Monitoring</h1>
          <p className="text-slate-500 mt-2 max-w-2xl font-medium">Real-time telemetry and management for Darija-v2-speech-to-text endpoints across all environments.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-border text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-panel transition-all flex items-center gap-2 shadow-sm outline-none">
            <Download className="size-4" /> EXPORT LOGS
          </button>
          <button className="px-5 py-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-500 border border-rose-500/20 text-xs font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all flex items-center gap-2 outline-none">
            <ShieldAlert className="size-4" /> EMERGENCY STOP
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Production Status', val: 'LIVE', detail: '99.9% Uptime', icon: Signal, color: 'emerald' },
          { label: 'API Health', val: '245ms', detail: '-12ms Latency', icon: Activity, color: 'primary' },
          { label: 'Traffic Volume', val: '2.4M', detail: '+5.2% Growth', icon: Waves, color: 'amber' },
        ].map((c, i) => (
          <div key={i} className={`p-8 rounded-2xl bg-white dark:bg-panel/40 border border-slate-200 dark:border-border border-l-4 shadow-sm backdrop-blur-md ${
            c.color === 'emerald' ? 'border-l-emerald-500' : c.color === 'primary' ? 'border-l-primary' : 'border-l-amber-500'
          }`}>
            <div className="flex justify-between items-start mb-6">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{c.label}</span>
              <c.icon className={`size-5 ${
                c.color === 'emerald' ? 'text-emerald-500' : c.color === 'primary' ? 'text-primary' : 'text-amber-500'
              }`} />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{c.val}</span>
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                c.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400 dark:text-slate-500'
              }`}>{c.detail}</span>
            </div>
            <p className="text-slate-400 dark:text-slate-600 text-[10px] mt-6 font-bold uppercase tracking-widest">Active since last patch</p>
          </div>
        ))}
      </div>

      {/* Endpoints Table */}
      <div className="bg-white dark:bg-panel/40 border border-slate-200 dark:border-border rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-border flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Active API Endpoints</h3>
          <div className="flex gap-2">
            <button className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-border text-slate-400 transition-all outline-none"><RefreshCw className="size-4" /></button>
            <button className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-border text-slate-400 transition-all outline-none"><MoreVertical className="size-4" /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-background-dark/50 text-slate-500 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Env</th>
                <th className="px-8 py-5">Endpoint URL</th>
                <th className="px-8 py-5">Model</th>
                <th className="px-8 py-5">Latency</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-border/50 text-sm">
              {[
                { env: 'PROD', url: 'api.darijaengine.ai/v1/stt', model: 'darija-v2.1-base', lat: '184ms', status: 'Operational', sColor: 'emerald' },
                { env: 'STAGING', url: 'stage.darijaengine.ai/v1/stt', model: 'darija-v2.2-beta', lat: '312ms', status: 'Warming Up', sColor: 'primary' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-primary/5 transition-all group">
                  <td className="px-8 py-6">
                    <span className={`px-2 py-1 rounded border text-[9px] font-black ${
                      row.env === 'PROD' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500' : 'bg-primary/10 border-primary/20 text-primary'
                    }`}>{row.env}</span>
                  </td>
                  <td className="px-8 py-6 font-mono text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors cursor-pointer">{row.url}</td>
                  <td className="px-8 py-6 font-bold text-slate-800 dark:text-slate-300">{row.model}</td>
                  <td className="px-8 py-6 font-black text-slate-900 dark:text-white">{row.lat}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${row.sColor === 'emerald' ? 'bg-emerald-500' : 'bg-primary animate-pulse'}`} />
                      <span className={`font-bold uppercase text-[10px] tracking-wider ${row.sColor === 'emerald' ? 'text-emerald-600 dark:text-emerald-500' : 'text-primary'}`}>{row.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right"><button className="p-2 text-slate-400 hover:text-primary outline-none"><RefreshCw className="size-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-panel/40 border border-slate-200 dark:border-border rounded-2xl p-8 shadow-sm backdrop-blur-md">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm mb-8">Response Latency (ms)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={LATENCY_DATA}>
                <Tooltip cursor={{ fill: 'rgba(60,60,246,0.05)' }} contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)' }} className="dark:[--tooltip-bg:#16162a] dark:[--tooltip-border:#222249] [--tooltip-bg:white] [--tooltip-border:#e2e8f0]" />
                <Bar dataKey="val" fill="#3c3cf6" radius={[4, 4, 0, 0]} />
                <XAxis dataKey="time" stroke="currentColor" className="text-slate-400" fontSize={10} axisLine={false} tickLine={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-panel/40 border border-slate-200 dark:border-border rounded-2xl p-8 shadow-sm backdrop-blur-md relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Request Volume</h3>
            <span className="text-[10px] font-black text-primary uppercase">Last 24 Hours</span>
          </div>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={LATENCY_DATA}>
                <defs>
                  <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3c3cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3c3cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#3c3cf6" strokeWidth={3} fillOpacity={1} fill="url(#trafficGrad)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-4xl sm:text-5xl font-black text-slate-100 dark:text-white/5 uppercase tracking-[0.5em] select-none">TRAFFIC FLOW</span>
            </div>
          </div>
        </div>
      </div>

      {/* API Testing Playground */}
      <section className="bg-white dark:bg-panel/40 border border-slate-200 dark:border-border rounded-2xl overflow-hidden shadow-xl backdrop-blur-md flex flex-col">
        <div className="px-8 py-5 border-b border-slate-100 dark:border-border bg-slate-50/50 dark:bg-background-dark/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="size-5 text-primary" />
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">API Playground</h3>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest bg-white dark:bg-panel border border-slate-200 dark:border-border px-3 py-1 rounded text-slate-500">POST REQUEST</span>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/30 px-5 h-[46px] rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-500 font-black text-xs uppercase">POST</div>
            <input className="flex-1 bg-slate-100 dark:bg-background-dark/50 border border-slate-200 dark:border-border rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 font-mono focus:ring-1 focus:ring-primary outline-none transition-all" readOnly value="https://api.darijaengine.ai/v1/stt" />
            <button className="bg-primary hover:bg-primary/90 text-white font-black px-8 h-[46px] rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 outline-none">
              <Send className="size-4" /> RUN
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-80">
            <div className="flex flex-col h-full">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Payload (JSON)</label>
              <textarea 
                className="flex-1 bg-slate-50 dark:bg-background-dark/80 border border-slate-200 dark:border-border rounded-2xl p-6 font-mono text-xs text-slate-700 dark:text-white resize-none outline-none focus:ring-1 focus:ring-primary transition-all"
                spellCheck={false}
                defaultValue={JSON.stringify({ audio_url: "s3://bucket/test.wav", language: "ary-MA", config: { dialect: "casa", punctuation: true }}, null, 2)}
              />
            </div>
            <div className="flex flex-col h-full">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Response</label>
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 font-mono text-xs text-emerald-400 overflow-auto scrollbar-hide">
                <pre>{JSON.stringify({ status: "success", job_id: "stt_9842xL", transcript: "Labas, kidayra l'omour?", confidence: 0.982, processing_time: "142ms" }, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Deployments;
