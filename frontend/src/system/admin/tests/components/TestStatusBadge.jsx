import React from 'react';
import { Check } from 'lucide-react';

export const TestStatusBadge = ({ test }) => {
    if (!test) return null;

    if (test.is_completed) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20 whitespace-nowrap">
                <Check size={10} strokeWidth={3} /> Completed
            </span>
        );
    }

    if (test.is_running) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/20 border border-emerald-500/30 dark:text-emerald-400 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live
            </span>
        );
    }

    if ((test.centres_count || 0) === 0) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 dark:text-slate-400 dark:bg-white/5 dark:border-white/10 whitespace-nowrap">
                Not Allotted
            </span>
        );
    }

    if (!test.has_schedule) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20 whitespace-nowrap">
                Not Scheduled
            </span>
        );
    }

    if (test.is_over) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 border border-purple-200 dark:text-purple-400 dark:bg-purple-500/10 dark:border-purple-500/20 whitespace-nowrap">
                Ended
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20 whitespace-nowrap">
            Scheduled
        </span>
    );
};

export default TestStatusBadge;
