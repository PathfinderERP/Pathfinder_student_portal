import React from 'react';
import { Users, Search, Filter, Mail, Phone, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TeacherStudents = () => {
    const { isDarkMode } = useTheme();

    const theme = {
        card: isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm',
        input: isDarkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        subtext: isDarkMode ? 'text-slate-500' : 'text-slate-500',
        iconBg: isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-100'
    };

    return (
        <div className={`space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono`}>
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[5px] border ${theme.card}`}>
                <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tight ${theme.text}`}>Active Students</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Total 124 Registered in your batches</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="SEARCH STUDENT..."
                            className={`rounded-[5px] border px-12 py-3 text-[10px] font-bold tracking-widest focus:outline-none focus:border-cyan-500/50 min-w-[300px] uppercase ${theme.input}`}
                        />
                    </div>
                    <button className={`p-3 border rounded-[5px] hover:bg-cyan-500/10 transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <Filter size={18} className="text-slate-500" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={`group border p-6 rounded-[5px] transition-all cursor-pointer relative overflow-hidden ${theme.card} hover:border-cyan-500/50`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 border rounded-[5px] flex items-center justify-center font-black text-xl ${theme.iconBg}`}>
                                {String.fromCharCode(64 + i)}
                            </div>
                            <div>
                                <h4 className={`font-black uppercase tracking-tight text-sm ${theme.text}`}>Student Name {i}</h4>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">NEET Batch A • {i}0293</p>
                            </div>
                        </div>
                        <div className={`mt-6 flex items-center gap-4 border-t pt-4 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                            <div className="flex items-center gap-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                <Mail size={12} className="text-cyan-500" /> Email
                            </div>
                            <div className="flex items-center gap-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                <Phone size={12} className="text-cyan-500" /> Contact
                            </div>
                            <ChevronRight className={`ml-auto transition-all ${isDarkMode ? 'text-slate-600 group-hover:text-cyan-400' : 'text-slate-400 group-hover:text-cyan-600'} group-hover:translate-x-1`} size={20} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeacherStudents;
