import React from 'react';
import { Package, Search, Plus, Filter, ArrowLeft } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const PackageDummyPage = ({ title, subtitle, onBack }) => {
    const { isDarkMode } = useTheme();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className={`p-10 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-100 border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className={`p-4 rounded-2xl transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
                            >
                                <ArrowLeft size={24} strokeWidth={3} />
                            </button>
                        )}
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="px-3 py-1 bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-purple-500/20">
                                    Package Module
                                </div>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    {title} <span className="text-purple-500">Details</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {subtitle || 'Manage and configure your packages efficiently.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="px-6 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95 flex items-center gap-2 shadow-xl">
                            <Plus size={16} strokeWidth={3} />
                            <span>Action</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className={`rounded-[3rem] border overflow-hidden min-h-[400px] flex flex-col items-center justify-center p-12 text-center ${isDarkMode ? 'bg-[#0B0F17] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="w-24 h-24 rounded-3xl bg-purple-500/10 flex items-center justify-center mb-6 animate-bounce">
                    <Package size={48} className="text-purple-500" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Under Development</h3>
                <p className={`max-w-md text-sm font-medium opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    The <span className="text-purple-500 font-bold">{title}</span> module is currently being built. Check back soon for full functionality including advanced package configuration and analytics.
                </p>
            </div>
        </div>
    );
};

export default PackageDummyPage;
