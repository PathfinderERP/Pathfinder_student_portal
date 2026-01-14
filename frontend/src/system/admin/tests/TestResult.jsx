import React from 'react';
import { BarChart3, TrendingUp, Award, Download } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TestResult = () => {
    const { isDarkMode } = useTheme();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className={`p-8 rounded-[2.5rem] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                            Test <span className="text-orange-500">Analytics</span>
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Generate rank lists, scorecard reports, and performance metrics.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                <BarChart3 size={64} className="mb-6 text-orange-500" strokeWidth={1.5} />
                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Results & <span className="text-orange-500">Analytics</span></h3>
                <p className="max-w-md mx-auto text-sm font-medium">
                    Comprehensive performance tracking, AIR generation,
                    and automated result distribution to parents and students.
                </p>
            </div>
        </div>
    );
};

export default TestResult;
