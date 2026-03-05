import React from 'react';
import { BarChart3, TrendingUp, Award, Target, ChevronRight, Activity } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TeacherPerformance = () => {
    const { isDarkMode } = useTheme();

    const theme = {
        card: isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        subtext: isDarkMode ? 'text-slate-500' : 'text-slate-500',
        border: isDarkMode ? 'border-white/5' : 'border-slate-100'
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono">
            <div className={`p-8 rounded-[5px] border ${theme.card} border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-500/5 to-transparent`}>
                <h2 className={`text-2xl font-black uppercase tracking-tight ${theme.text}`}>Performance Analytics</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Class Metrics & Student Grade Distribution</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard icon={<TrendingUp size={20} />} label="Avg. Score" value="78.5%" color="text-cyan-500" theme={theme} />
                <MetricCard icon={<Target size={20} />} label="Accuracy" value="92.0%" color="text-emerald-500" theme={theme} />
                <MetricCard icon={<Activity size={20} />} label="Class Rank" value="#04/20" color="text-rose-500" theme={theme} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-6 rounded-[5px] border ${theme.card}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-8 ${theme.text}`}>Mark Distribution</h3>
                    <div className="flex items-end gap-2 h-40">
                        {[30, 45, 80, 60, 95, 40].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className={`w-full bg-cyan-500/50 rounded-[2px] transition-all duration-500 group-hover:bg-cyan-400 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]`} style={{ height: `${h}%` }}></div>
                                <span className="text-[8px] font-bold text-slate-500 uppercase">G-{i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`p-6 rounded-[5px] border ${theme.card}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-8 ${theme.text}`}>Top Performers</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={`flex items-center justify-between p-3 border ${theme.border} rounded-[2px] hover:border-cyan-500/30 transition-all`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center font-black ${isDarkMode ? 'bg-slate-800 text-cyan-400' : 'bg-slate-50 text-cyan-600'}`}>
                                        <Award size={20} className={i === 1 ? 'text-amber-500' : 'text-slate-400'} />
                                    </div>
                                    <div>
                                        <h4 className={`text-[10px] font-black uppercase tracking-tight ${theme.text}`}>Top Student {i}</h4>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Score: {98 - i * 2}%</p>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-600" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ icon, label, value, color, theme }) => (
    <div className={`p-6 rounded-[5px] border ${theme.card} flex items-center gap-6 group hover:translate-y-[-4px] transition-all duration-300`}>
        <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center ${color} bg-current/10 border border-current/20`}>
            {icon}
        </div>
        <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</p>
            <h3 className={`text-2xl font-black uppercase tracking-tighter ${theme.text}`}>{value}</h3>
        </div>
    </div>
);

export default TeacherPerformance;
