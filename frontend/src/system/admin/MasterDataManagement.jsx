import React, { useState } from 'react';
import {
    Calendar, Layers, GraduationCap, Plus, Search,
    MoreHorizontal, Edit2, Trash2, Filter
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const MasterDataManagement = ({ activeSubTab, setActiveSubTab }) => {
    const { isDarkMode } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');

    const subTabs = [
        { id: 'Session', icon: Calendar, label: 'Session' },
        { id: 'Exam Type', icon: Layers, label: 'Exam Type' },
        { id: 'Class', icon: GraduationCap, label: 'Class' }
    ];

    const renderHeader = () => (
        <div className={`p-8 rounded-[2.5rem] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                        Master <span className="text-orange-500">Data</span>
                    </h2>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Configure system-wide parameters and categories.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 p-1.5 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                        {subTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeSubTab === tab.id
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                                    : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-white'
                                    }`}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderContent = () => (
        <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={`Search ${activeSubTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                            }`}
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}>
                        <Filter size={16} />
                        Filter
                    </button>
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-600/30 active:scale-95">
                        <Plus size={16} strokeWidth={3} />
                        Add New {activeSubTab}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                            <th className="pb-4 px-4 font-black">Name / Title</th>
                            <th className="pb-4 px-4 font-black">Code</th>
                            <th className="pb-4 px-4 font-black">Description</th>
                            <th className="pb-4 px-4 font-black text-center">Status</th>
                            <th className="pb-4 px-4 text-right font-black">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-transparent">
                        {[1, 2, 3].map((item) => (
                            <tr key={item} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-200/50'} transition-colors`}>
                                <td className="py-5 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-orange-900/10 text-orange-500 border-white/5' : 'bg-orange-50 text-orange-600 border-orange-100'
                                            }`}>
                                            {activeSubTab.charAt(0)}
                                        </div>
                                        <span className="font-bold text-sm">{activeSubTab} Example {item}</span>
                                    </div>
                                </td>
                                <td className="py-5 px-4 text-sm font-bold opacity-70">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {activeSubTab.toUpperCase().replace(' ', '_')}_{item}
                                    </span>
                                </td>
                                <td className="py-5 px-4 text-sm font-medium opacity-50 italic">Standard configuration for {activeSubTab.toLowerCase()}.</td>
                                <td className="py-5 px-4">
                                    <div className="flex justify-center">
                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                                            Active
                                        </span>
                                    </div>
                                </td>
                                <td className="py-5 px-4">
                                    <div className="flex justify-end items-center gap-2">
                                        <button className={`p-2 rounded-xl transition-all hover:scale-110 ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button className={`p-2 rounded-xl transition-all hover:scale-110 ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white'}`}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderHeader()}
            {renderContent()}
        </div>
    );
};

export default MasterDataManagement;
