
import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Mic, Copy, Trash2, 
  Flag, Send, Clock, Search, ChevronDown, 
  BrainCircuit, History
} from 'lucide-react';
import { AudioFile } from '../types';

const MOCK_FILES: AudioFile[] = [
  { id: '1', name: 'audio_042_final.wav', duration: '00:12s', dialect: 'Moroccan Arabic', confidence: 68, status: 'Review', prediction: 'السلام عليكم، بغيت نعرف واش الماكينة خدامة دبا ولا لا؟' },
  { id: '2', name: 'audio_043_clean.wav', duration: '00:08s', dialect: 'Casablanca Dialect', confidence: 92, status: 'Valid' },
  { id: '3', name: 'audio_044.wav', duration: '00:04s', dialect: 'Untagged', confidence: 18, status: 'Queue' },
  { id: '4', name: 'audio_045.wav', duration: '00:10s', dialect: 'Marrakech Acc.', confidence: 45, status: 'Queue' },
];

const Datasets: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<AudioFile>(MOCK_FILES[0]);
  const [correction, setCorrection] = useState(selectedFile.prediction || '');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setCorrection(selectedFile.prediction || '');
  }, [selectedFile]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] w-full overflow-hidden transition-colors duration-300">
      {/* List Sidebar */}
      <section className="w-full lg:w-[350px] flex flex-col bg-white dark:bg-background-surface border-r border-slate-200 dark:border-border shrink-0">
        <header className="p-6 border-b border-slate-100 dark:border-border">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Moroccan_Speech_v2</h1>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-border text-[10px] font-bold text-slate-500">4.2k Files</span>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 size-4 group-focus-within:text-primary transition-colors" />
            <input className="w-full bg-slate-50 dark:bg-panel border-none rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none" placeholder="Search files..." />
          </div>
          <div className="flex gap-2 mt-4">
            <button className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-panel text-slate-700 dark:text-white text-[10px] font-bold uppercase flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-border transition-colors">
              Status: All <ChevronDown className="size-3" />
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-panel text-slate-700 dark:text-white text-[10px] font-bold uppercase flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-border transition-colors">
              Confidence <ChevronDown className="size-3" />
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2">
          {MOCK_FILES.map((file) => (
            <div 
              key={file.id}
              onClick={() => setSelectedFile(file)}
              className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer border transition-all ${
                selectedFile.id === file.id 
                  ? 'bg-primary/5 dark:bg-primary/10 border-primary/30' 
                  : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-panel'
              }`}
            >
              <div className="relative size-12 shrink-0 flex items-center justify-center">
                <svg className="size-12 -rotate-90">
                  <circle className="text-slate-100 dark:text-border" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" strokeWidth="2.5" />
                  <circle 
                    className={`${file.confidence > 80 ? 'text-emerald-500' : file.confidence > 50 ? 'text-amber-500' : 'text-primary'}`} 
                    cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" strokeWidth="2.5" 
                    strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * file.confidence / 100)} 
                  />
                </svg>
                <span className="absolute text-[10px] font-black text-slate-900 dark:text-white">{file.confidence}%</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{file.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                    file.status === 'Valid' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-500' : 
                    file.status === 'Review' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-500' : 
                    'bg-slate-500/20 text-slate-600 dark:text-slate-500'
                  }`}>{file.status}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                  <Clock className="size-3" /> {file.duration} • {file.dialect}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Editor Main */}
      <main className="flex-1 flex flex-col bg-slate-50/50 dark:bg-background-dark/30">
        <div className="p-8 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedFile.name}</h2>
              <p className="text-slate-500 text-sm">Uploaded 2 hours ago • Size: 1.2 MB</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white dark:bg-panel rounded-xl p-1.5 gap-2 shadow-sm border border-slate-200 dark:border-border">
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-border rounded-lg text-slate-400 transition-colors outline-none"><SkipBack className="size-4" /></button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="size-10 flex items-center justify-center bg-primary rounded-lg text-white shadow-lg shadow-primary/30 active:scale-95 transition-all outline-none"
                >
                  {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-border rounded-lg text-slate-400 transition-colors outline-none"><SkipForward className="size-4" /></button>
              </div>
              <div className="bg-white dark:bg-panel rounded-xl px-4 py-2 text-xs font-black text-slate-500 dark:text-slate-400 cursor-pointer flex items-center gap-2 border border-slate-200 dark:border-border shadow-sm">
                1.0x <ChevronDown className="size-3" />
              </div>
            </div>
          </div>

          <div className="w-full h-32 bg-white dark:bg-panel/30 rounded-2xl relative overflow-hidden flex items-center justify-center gap-1.5 px-6 border border-slate-200 dark:border-border shadow-sm">
            {Array.from({ length: 100 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-1 rounded-full transition-all duration-300 ${i < 40 ? 'bg-primary h-[40%]' : 'bg-slate-300 dark:bg-slate-800 h-[20%]'}`} 
                style={{ height: `${Math.random() * 80 + 10}%` }}
              />
            ))}
            <div className="absolute inset-y-0 left-[33.3%] w-0.5 bg-primary/40 dark:bg-white/40 z-10 shadow-[0_0_10px_rgba(60,60,246,0.3)]" />
            <div className="absolute bottom-3 left-6 text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase">0:04.2 / 0:12.0</div>
          </div>
        </div>

        <div className="flex-1 p-8 grid grid-rows-[auto_1fr] gap-8 overflow-y-auto custom-scrollbar">
          {/* AI Prediction Section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <BrainCircuit className="size-4 text-primary" /> AI Prediction
              </h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase">Model: Darija-XL-v4</span>
            </div>
            <div className="p-8 bg-white dark:bg-panel rounded-2xl border border-slate-200 dark:border-border relative overflow-hidden group shadow-sm">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
              <p className="font-arabic text-3xl sm:text-4xl leading-relaxed text-slate-900 dark:text-white text-right select-none" dir="rtl">
                السلام عليكم، <span className="bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 border-b-2 border-amber-500 px-1 cursor-help">بغيت</span> نعرف واش <span className="bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-500 border-b-2 border-rose-500 px-1 cursor-help">الماكينة</span> خدامة دبا ولا لا؟
              </p>
            </div>
          </section>

          {/* Human Ground Truth Section */}
          <section className="flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <History className="size-4" /> Human Ground Truth (Correction)
              </h3>
              <div className="hidden sm:block px-2 py-0.5 rounded bg-white dark:bg-panel border border-slate-200 dark:border-border text-[9px] font-bold text-slate-400 tracking-wider">
                CMD + ENTER TO SAVE
              </div>
            </div>
            <div className="flex-1 bg-white dark:bg-panel rounded-2xl border border-slate-200 dark:border-primary/30 focus-within:border-primary focus-within:ring-4 ring-primary/5 transition-all flex flex-col shadow-xl">
              <textarea 
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                className="flex-1 w-full bg-transparent border-none focus:ring-0 p-8 font-arabic text-3xl sm:text-4xl leading-relaxed text-slate-900 dark:text-white resize-none text-right outline-none"
                dir="rtl"
                placeholder="اكتب التصحيح هنا..."
              />
              <div className="p-4 border-t border-slate-100 dark:border-border flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-background-surface/30">
                <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-border rounded-xl text-slate-400 hover:text-primary transition-all outline-none"><Mic className="size-5" /></button>
                <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-border rounded-xl text-slate-400 hover:text-primary transition-all outline-none"><Copy className="size-5" /></button>
                <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-border rounded-xl text-slate-400 hover:text-rose-500 transition-all outline-none"><Trash2 className="size-5" /></button>
              </div>
            </div>
          </section>
        </div>

        <footer className="p-8 pt-0 mt-auto bg-white/50 dark:bg-transparent backdrop-blur-sm sm:backdrop-blur-none">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex gap-4 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-white dark:bg-panel text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-border font-bold hover:bg-slate-50 dark:hover:bg-border transition-all flex items-center justify-center gap-2 active:scale-95 outline-none">
                Skip
              </button>
              <button className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/30 font-bold hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 outline-none">
                <Flag className="size-4" /> Mark
              </button>
            </div>
            <div className="hidden sm:block flex-1" />
            <button className="w-full sm:w-auto px-10 py-3 rounded-xl bg-primary text-white font-black shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 tracking-wide uppercase text-sm outline-none">
              <Send className="size-4" /> Submit to Memory
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Datasets;
