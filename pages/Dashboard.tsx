
import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Volume2, CheckSquare, SpellCheck, Wallet, MoreHorizontal, Filter, Search,
  Cpu
} from 'lucide-react';
import { Metric } from '../types';

const METRICS: Metric[] = [
  { label: 'Audio Hours', value: '1,247h', change: '+12% MoM', trend: 'up', color: 'text-primary', icon: 'Volume2' },
  { label: 'Validation Rate', value: '94.3%', change: '+2.1%', trend: 'up', color: 'text-indigo-500', icon: 'CheckSquare' },
  { label: 'WER (Word Error Rate)', value: '8.4%', change: '-0.5% Target', trend: 'down', color: 'text-amber-500', icon: 'SpellCheck' },
  { label: 'Azure Credits', value: '$847', change: '-15% Usage', trend: 'down', color: 'text-rose-500', icon: 'Wallet' },
];

const DATA = [
  { name: 'v1.0', accuracy: 65 },
  { name: 'v1.1', accuracy: 72 },
  { name: 'v1.2', accuracy: 78 },
  { name: 'v1.3', accuracy: 85 },
  { name: 'v1.4', accuracy: 92 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto w-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {METRICS.map((m, i) => (
          <div key={i} className="p-6 rounded-xl bg-white dark:bg-panel border border-slate-200 dark:border-border shadow-sm group hover:border-primary/50 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-primary/10 ${m.color}`}>
                {i === 0 && <Volume2 className="size-5" />}
                {i === 1 && <CheckSquare className="size-5" />}
                {i === 2 && <SpellCheck className="size-5" />}
                {i === 3 && <Wallet className="size-5" />}
              </div>
              <span className={`${m.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'} text-xs font-bold`}>{m.change}</span>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{m.label}</p>
            <h3 className="text-2xl font-bold mt-1 tracking-tight text-slate-900 dark:text-white">{m.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Accuracy Chart */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-panel border border-slate-200 dark:border-border shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Model Accuracy Evolution</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">v1.0 to v1.4 performance trajectory</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded bg-slate-100 dark:bg-border text-xs text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white transition-colors">7 Days</button>
              <button className="px-3 py-1 rounded bg-primary text-white text-xs font-bold">Full History</button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DATA}>
                <defs>
                  <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3c3cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3c3cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-border" vertical={false} />
                <XAxis dataKey="name" stroke="currentColor" className="text-slate-400 dark:text-slate-600" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="currentColor" className="text-slate-400 dark:text-slate-600" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: '8px' }}
                  className="dark:[--tooltip-bg:#16162a] dark:[--tooltip-border:#222249] [--tooltip-bg:white] [--tooltip-border:#e2e8f0]"
                  itemStyle={{ color: '#3c3cf6' }}
                />
                <Area type="monotone" dataKey="accuracy" stroke="#3c3cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAcc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Training Widget */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-primary text-white relative overflow-hidden group cursor-pointer shadow-lg shadow-primary/20">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-1">Current Training</h3>
              <p className="text-primary-100/70 text-sm mb-4">darija-whisper-v1.5-beta</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black tracking-tight">72%</span>
                <span className="text-xs font-medium mb-1 opacity-80 uppercase">ETA 14m</span>
              </div>
              <div className="mt-4 w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full w-[72%] transition-all duration-500 group-hover:scale-x-105 origin-left"></div>
              </div>
            </div>
            <Cpu className="absolute -right-4 -bottom-4 size-32 opacity-10 rotate-12" />
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-panel border border-slate-200 dark:border-border shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Cloud Infrastructure</h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><Volume2 className="size-4" /></div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Azure Blob</span>
                    <span className="text-[10px] text-emerald-500 font-bold uppercase">Healthy</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-border h-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[99%]"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><Wallet className="size-4" /></div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Supabase DB</span>
                    <span className="text-[10px] text-primary font-bold uppercase">Connected</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-border h-1 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[85%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="p-6 rounded-xl bg-white dark:bg-panel border border-slate-200 dark:border-border shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 size-4" />
              <input className="w-full bg-slate-100 dark:bg-border border-none rounded-lg pl-10 pr-4 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 outline-none" placeholder="Filter events..." />
            </div>
            <button className="p-2 rounded-lg bg-slate-100 dark:bg-border text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white transition-colors"><Filter className="size-4" /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-border">
              <tr>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">User / System</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-border">
              {[
                { type: 'Model v1.4 Deployment', system: 'Auto-Deploy CI/CD', time: '2 mins ago', status: 'Success' },
                { type: 'Dataset Validation - #281', system: 'Yassine Amrani', time: '14 mins ago', status: 'Processing' },
                { type: 'Backup Sync: Azure', system: 'System Scheduler', time: '1 hour ago', status: 'Completed' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-4 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">{row.type}</td>
                  <td className="px-4 py-4 text-xs text-slate-500">{row.system}</td>
                  <td className="px-4 py-4 text-xs text-slate-400 dark:text-slate-500">{row.time}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      row.status === 'Success' || row.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-amber-500/10 text-amber-600 dark:text-amber-500'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button className="text-slate-400 hover:text-primary transition-colors"><MoreHorizontal className="size-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
