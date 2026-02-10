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

const AllocatedTestsDetails = ({ section, onBack }) => {
    const { getApiUrl, token } = useAuth();
    const { isDarkMode } = useTheme();
    const [tests, setTests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTests = useCallback(async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const authToken = token || localStorage.getItem('auth_token');
            // Added timestamp to prevent caching
            const response = await axios.get(`${apiUrl}/api/tests/?_t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            // Filter tests that include this section in their allotted_sections
            const matched = response.data.filter(t =>
                t.allotted_sections?.includes(section.id)
            );
            setTests(matched);
        } catch (err) {
            console.error('Error fetching tests:', err);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    }, [getApiUrl, token, section.id]);

    useEffect(() => {
        fetchTests(true);

        // Auto-refresh every 5 seconds to keep in sync with Test Management
        const interval = setInterval(() => {
            fetchTests(false);
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchTests]);

    const filteredTests = tests.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-1 animate-in fade-in duration-500">
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
                                All Tests <span className="text-orange-500">Details</span>
                            </h2>
                            <p className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                <span className="px-2 py-0.5 rounded-[5px] bg-orange-500/10 text-orange-500 border border-orange-500/20">{section.code}</span>
                                <span>-</span>
                                <span className="opacity-80">{section.name}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-12 pr-4 py-3 rounded-[5px] border transition-all outline-none font-bold text-sm
                                    ${isDarkMode
                                        ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50'
                                        : 'bg-slate-50 border-slate-200 focus:border-orange-500/50 focus:bg-white'}`}
                            />
                        </div>
                        <button
                            onClick={fetchTests}
                            className={`p-3 rounded-[5px] border transition-all active:rotate-180 duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500 hover:text-orange-600'}`}
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className={`rounded-[5px] border shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-[0.2em] border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="py-6 px-10">#</th>
                                <th className="py-6 px-10">Test Name</th>
                                <th className="py-6 px-10">Test Code</th>
                                <th className="py-6 px-10 text-center">Test Duration</th>
                                <th className="py-6 px-10 text-right pr-12">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="py-32 text-center">
                                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                                        <span className="text-xs font-black uppercase tracking-widest opacity-40">Loading allocated tests...</span>
                                    </td>
                                </tr>
                            ) : filteredTests.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-20">
                                            <FileText size={64} />
                                            <p className="text-lg font-black uppercase tracking-widest">No Tests Allocated</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTests.map((test, index) => (
                                <tr key={test.id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-colors`}>
                                    <td className="py-6 px-10 text-sm font-black opacity-30 group-hover:opacity-100 transition-opacity">{index + 1}</td>
                                    <td className="py-6 px-10">
                                        <div className="flex flex-col">
                                            <span className={`font-black text-sm uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                                {test.name}
                                            </span>
                                            <span className="text-[10px] opacity-40 font-bold uppercase tracking-wider mt-0.5">
                                                ID: {test.id}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-10">
                                        <span className={`px-3 py-1 rounded-[5px] text-xs font-black tracking-wider ${isDarkMode ? 'bg-white/5 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                                            {test.code}
                                        </span>
                                    </td>
                                    <td className="py-6 px-10 text-center">
                                        <span className="font-bold text-sm opacity-60">
                                            {test.duration || 180}
                                        </span>
                                    </td>
                                    <td className="py-6 px-10 text-right pr-12">
                                        <div className="flex justify-end items-center">
                                            {/* Custom Pill Toggle (Read-Only) */}
                                            <div className="relative">
                                                <div className={`w-11 h-6 rounded-full transition-all duration-500 ${Boolean(test.is_completed) ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-200'}`}>
                                                    <div className={`absolute top-1 left-1 bg-white h-4 w-4 rounded-full shadow-sm transition-transform duration-500 ${Boolean(test.is_completed) ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </div>
                                            </div>
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
