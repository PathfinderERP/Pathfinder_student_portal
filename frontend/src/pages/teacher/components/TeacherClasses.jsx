import React from 'react';
import { Construction, Sparkles } from 'lucide-react';

const TeacherClasses = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in fade-in zoom-in duration-700">
        <div className="w-24 h-24 bg-orange-500/10 rounded-3xl border border-orange-500/20 flex items-center justify-center text-orange-500">
            <Construction size={48} />
        </div>
        <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Class Management</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto mt-2">
                We are synchronizing your ERP batch schedules and student rolls. This module will be live shortly.
            </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-500">
            <Sparkles size={14} /> Synchronizing with ERP Master Data
        </div>
    </div>
);

export default TeacherClasses;
