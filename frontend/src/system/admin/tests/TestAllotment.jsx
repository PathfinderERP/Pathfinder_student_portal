import React from 'react';
import { Users, Search, Filter, Calendar, Clock, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TestAllotment = () => {
    const { isDarkMode } = useTheme();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className={`p-8 rounded-[2.5rem] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                            Test <span className="text-orange-500">Allotment</span>
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Assign tests to student groups, batches, or individual students.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                <Users size={64} className="mb-6 text-orange-500" strokeWidth={1.5} />
                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Assign <span className="text-orange-500">Modules</span> Soon</h3>
                <p className="max-w-md mx-auto text-sm font-medium">
                    This module will allow you to batch-allot tests to specific course sections
                    and set individual schedules for students.
                </p>
            </div>
        </div>
    );
};

export default TestAllotment;
