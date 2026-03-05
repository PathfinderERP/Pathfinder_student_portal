import React from 'react';
import { BookMarked, Sparkles, FileText, Download, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TeacherCurriculum = () => {
    const { isDarkMode } = useTheme();

    const theme = {
        card: isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        subtext: isDarkMode ? 'text-slate-500' : 'text-slate-500',
        accent: 'text-cyan-500'
    };

    const modules = [
        { id: 'M1', title: 'Plant Physiology', progress: 85, status: 'Active' },
        { id: 'M2', title: 'Genetics & Evolution', progress: 100, status: 'Completed' },
        { id: 'M3', title: 'Ecology & Environment', progress: 15, status: 'Upcoming' },
        { id: 'M4', title: 'Cell Structure', progress: 100, status: 'Completed' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono">
            <div className={`p-8 rounded-[5px] border ${theme.card} border-l-4 border-l-cyan-500`}>
                <h2 className={`text-2xl font-black uppercase tracking-tight ${theme.text}`}>Course Curriculum</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Academic Session 2024-25 • Botany Major</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modules.map((mod) => (
                    <div key={mod.id} className={`p-6 rounded-[5px] border ${theme.card} group hover:border-cyan-500/50 transition-all`}>
                        <div className="flex justify-between items-start mb-6">
                            <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                                <BookMarked size={24} />
                            </div>
                            <span className={`text-[8px] font-black uppercase px-2 py-1 border ${mod.status === 'Completed' ? 'border-emerald-500/50 text-emerald-500' : mod.status === 'Active' ? 'border-cyan-500/50 text-cyan-500' : 'border-slate-500/50 text-slate-500'}`}>
                                {mod.status}
                            </span>
                        </div>
                        <h3 className={`text-lg font-black uppercase tracking-tighter ${theme.text}`}>{mod.title}</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${theme.subtext}`}>Module ID: {mod.id}</p>

                        <div className="mt-8 space-y-2">
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                <span className={theme.subtext}>Progress</span>
                                <span className={theme.accent}>{mod.progress}%</span>
                            </div>
                            <div className={`w-full h-1 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'} rounded-full overflow-hidden`}>
                                <div className="bg-cyan-500 h-full transition-all duration-1000" style={{ width: `${mod.progress}%` }}></div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-4 pt-4 border-t border-inherit">
                            <button className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${theme.accent} hover:underline`}>
                                <FileText size={12} /> Syllabus
                            </button>
                            <button className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${theme.accent} hover:underline`}>
                                <Download size={12} /> Resources
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeacherCurriculum;
