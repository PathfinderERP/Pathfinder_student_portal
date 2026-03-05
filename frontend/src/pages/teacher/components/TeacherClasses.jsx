import React from 'react';
import { Construction, Sparkles } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TeacherClasses = () => {
    const { isDarkMode } = useTheme();

    return (
        <div className={`flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in fade-in zoom-in duration-700 font-mono`}>
            <div className={`w-24 h-24 rounded-[5px] border flex items-center justify-center ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-600'}`}>
                <Construction size={48} />
            </div>
            <div>
                <h2 className={`text-3xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Class Management</h2>
                <p className="text-slate-500 text-sm max-w-md mx-auto mt-2 uppercase tracking-widest font-bold text-[10px]">
                    Synchronizing ERP batch schedules and student rolls. This module will be live shortly.
                </p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 border rounded-[2px] text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'bg-white/5 border-white/10 text-cyan-400' : 'bg-slate-50 border-slate-200 text-cyan-600'}`}>
                <Sparkles size={14} /> System Sync: ERP Master Data
            </div>
        </div>
    );
};

export default TeacherClasses;
