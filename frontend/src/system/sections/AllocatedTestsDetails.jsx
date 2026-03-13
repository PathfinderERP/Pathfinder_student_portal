import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Search,
    RotateCcw,
    ArrowLeft,
    Loader2,
    FileText,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const AllocatedTestsDetails = ({ initialSection, allSections, onBack }) => {
    const { getApiUrl, token } = useAuth();
    const { isDarkMode } = useTheme();
    
    // State to track the current section being viewed
    const [section, setSection] = useState(initialSection);
    const [activeTab, setActiveTab] = useState(initialSection.initialTab || 'online');
    const [tests, setTests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTests = useCallback(async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const authToken = token || localStorage.getItem('auth_token');
            const response = await axios.get(`${apiUrl}/api/tests/?_t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            
            // Handle both array and paginated formats
            const testsData = Array.isArray(response.data) 
                ? response.data 
                : (response.data.results || response.data.tests || []);
            
            setTests(testsData);
        } catch (err) {
            console.error('Error fetching tests:', err);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchTests(true);
        const interval = setInterval(() => {
            fetchTests(false);
        }, 30000); // 30s refresh is enough
        return () => clearInterval(interval);
    }, [fetchTests]);

    const getActiveData = useCallback(() => {
        if (activeTab === 'study') {
            return (section.study_material_centres || []).filter(item => 
                (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const targetIds = activeTab === 'online' 
            ? (section.online_exam_centres || []).map(i => String(i.id))
            : (section.offline_exam_centres || []).map(i => String(i.id));

        return tests.filter(t => 
            targetIds.includes(String(t.id)) &&
            ((t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
             (t.code || '').toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [activeTab, section, tests, searchTerm]);

    const displayData = getActiveData();

    return (
        <div className="p-1 animate-in fade-in duration-500">
            {/* 1. SECTION TABS - Allow switching between sections */}
            <div className={`flex items-center gap-2 mb-6 p-2 rounded-[5px] overflow-x-auto custom-scrollbar ${isDarkMode ? 'bg-[#10141D] border border-white/5' : 'bg-slate-50 border border-slate-200 shadow-sm'}`}>
                {allSections.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => {
                            setSection(s);
                            setSearchTerm('');
                        }}
                        className={`px-8 py-3 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                            ${section.id === s.id 
                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30 active:scale-95' 
                                : isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-white hover:text-orange-600'}`}
                    >
                        {s.name}
                    </button>
                ))}
            </div>

            {/* 2. CATEGORY TABS - Sub-filtering within the section */}
            <div className="flex items-center gap-6 mb-8 px-2">
                {[
                    { id: 'online', label: 'Online Tests', count: (section.online_exam_centres || []).length, color: 'blue' },
                    { id: 'offline', label: 'Offline Tests', count: (section.offline_exam_centres || []).length, color: 'orange' },
                    { id: 'study', label: 'Study Materials', count: (section.study_material_centres || []).length, color: 'emerald' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`group relative flex items-center gap-3 pb-4 transition-all
                            ${activeTab === tab.id 
                                ? `text-${tab.color}-500 opacity-100` 
                                : 'text-slate-400 opacity-60 hover:opacity-100'}`}
                    >
                        <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black 
                            ${activeTab === tab.id 
                                ? (tab.color === 'blue' ? 'bg-blue-500/10' : tab.color === 'orange' ? 'bg-orange-500/10' : 'bg-emerald-500/10')
                                : 'bg-slate-500/10'}`}>
                            {tab.count}
                        </span>
                        {activeTab === tab.id && (
                            <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-full ${tab.color === 'blue' ? 'bg-blue-500' : tab.color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'} animate-in slide-in-from-left-2 duration-300`} />
                        )}
                    </button>
                ))}
            </div>

            {/* Header / Info Area */}
            <div className={`p-8 rounded-[5px] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={onBack}
                            className={`p-4 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
                        >
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                                {activeTab === 'study' ? 'Material' : 'Test'} <span className="text-orange-500">Details</span>
                            </h2>
                            <p className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                <span className={`px-2 py-0.5 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10 text-orange-400' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>{section.code}</span>
                                <span>-</span>
                                <span className="opacity-80">{section.name} {activeTab === 'study' ? 'Materials' : 'Tests'} List</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab} items...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-12 pr-4 py-3 rounded-[5px] border transition-all outline-none font-bold text-sm
                                    ${isDarkMode
                                        ? 'bg-[#1A1F2B] border-white/10 text-white focus:border-orange-500/50'
                                        : 'bg-slate-50 border-slate-200 focus:border-orange-500/50 focus:bg-white'}`}
                            />
                        </div>
                        <button
                            onClick={() => fetchTests(true)}
                            className={`p-3 rounded-[5px] border transition-all active:rotate-180 duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-orange-600'}`}
                            title="Refresh List"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className={`rounded-[5px] border shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 z-10">
                            <tr className={`text-[11px] font-black uppercase tracking-[0.2em] border-b ${isDarkMode ? 'bg-[#1A1F1D] text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                <th className="py-6 px-10">#</th>
                                <th className="py-6 px-10">{activeTab === 'study' ? 'Resource Name' : 'Test Name'}</th>
                                <th className="py-6 px-10 text-center">{activeTab === 'study' ? 'Type' : 'Test Code'}</th>
                                <th className="py-6 px-10 text-center">{activeTab === 'study' ? 'Assigned Centres' : 'Duration'}</th>
                                <th className="py-6 px-10 text-right pr-12">{activeTab === 'study' ? 'Status' : 'Progress'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="py-40 text-center">
                                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-6" strokeWidth={3} />
                                        <p className="text-xs font-black uppercase tracking-widest opacity-40 animate-pulse">Scanning database for {section.name} tests...</p>
                                    </td>
                                </tr>
                            ) : displayData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-48 text-center px-10">
                                        <div className="flex flex-col items-center gap-6 opacity-20">
                                            <div className="relative">
                                                <FileText size={80} strokeWidth={1} />
                                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-[10px] text-white font-black">!</div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-2xl font-black uppercase tracking-widest">No tests assigned</p>
                                                <p className="text-xs font-bold font-mono tracking-tighter max-w-sm mx-auto">Either this section has no tests allotted, or all tests are currently inactive.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : displayData.map((item, index) => (
                                <tr key={item.id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'} transition-all duration-300`}>
                                    <td className="py-7 px-10 text-sm font-black opacity-20 group-hover:opacity-100 transition-opacity">{index + 1}</td>
                                    <td className="py-7 px-10">
                                        <div className="flex flex-col">
                                            <span className={`font-black text-sm uppercase tracking-tight group-hover:text-blue-500 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                                {item.name || item.title}
                                            </span>
                                            <div className="flex items-center gap-3 mt-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> 
                                                    ID: {(item.id || '').toString().slice(-8).toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-7 px-10 text-center">
                                        <span className={`px-4 py-1.5 rounded-[5px] text-[10px] font-black tracking-widest border transition-all group-hover:scale-105
                                            ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/30' : 'bg-slate-50 border-slate-100 text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200'}`}>
                                            {activeTab === 'study' ? (item.type || 'Material') : item.code}
                                        </span>
                                    </td>
                                    <td className="py-7 px-10 text-center">
                                        {activeTab === 'study' ? (
                                            <div className="flex justify-center -space-x-2">
                                                {(item.centres || []).slice(0, 3).map((c, i) => (
                                                    <div key={i} title={c.name} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${isDarkMode ? 'bg-slate-800 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-600'}`}>
                                                        {c.code || c.name.charAt(0)}
                                                    </div>
                                                ))}
                                                {(item.centres || []).length > 3 && (
                                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[9px] font-black ${isDarkMode ? 'bg-slate-700 border-slate-900 text-white' : 'bg-slate-200 border-white text-slate-600'}`}>
                                                        +{(item.centres || []).length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="font-black text-sm opacity-80 group-hover:scale-110 transition-transform">{item.duration || 180}</span>
                                                <span className="text-[8px] font-black uppercase opacity-30 tracking-tighter">Minutes</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-7 px-10 text-right pr-12">
                                        <div className="flex justify-end items-center">
                                            {activeTab === 'study' ? (
                                                <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">Active</span>
                                            ) : (
                                                <div className="group/toggle relative flex items-center gap-4">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest transition-all ${Boolean(item.is_completed) ? 'text-emerald-500' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`}>
                                                        {Boolean(item.is_completed) ? 'Completed' : 'Pending'}
                                                    </span>
                                                    <div className={`w-12 h-6.5 rounded-full p-1.5 transition-all duration-500 flex items-center ${Boolean(item.is_completed) ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                                        <div className={`bg-white h-3.5 w-3.5 rounded-full shadow-sm transition-transform duration-500 ${Boolean(item.is_completed) ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AllocatedTestsDetails;
