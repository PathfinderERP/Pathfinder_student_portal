import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Database, AlertCircle, MapPin, Mail, Phone, Globe, Hash, Navigation, Search, ArrowLeft, RotateCcw, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const AllocatedTestsForCentre = ({ centre, onBack }) => {
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
            const response = await axios.get(`${apiUrl}/api/tests/?_t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            // Filter tests that include this centre
            const matched = response.data.filter(t =>
                t.centres?.includes(centre.id)
            );
            setTests(matched);
        } catch (err) {
            console.error('Error fetching tests:', err);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    }, [getApiUrl, token, centre.id]);

    useEffect(() => {
        fetchTests(true);
        const interval = setInterval(() => fetchTests(false), 5000);
        return () => clearInterval(interval);
    }, [fetchTests]);

    const filteredTests = tests.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-1 animate-in fade-in slide-in-from-right-4 duration-500">
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
                                Centre <span className="text-orange-500">Tests</span>
                            </h2>
                            <p className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                <span className="px-2 py-0.5 rounded-[5px] bg-orange-500/10 text-orange-500 border border-orange-500/20">{centre.code}</span>
                                <span>-</span>
                                <span className="opacity-80">{centre.name}</span>
                            </p>
                        </div>
                    </div>
                    <div className="relative w-full md:w-80 group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                        <input
                            type="text"
                            placeholder="Search tests..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-[5px] border transition-all outline-none font-bold text-sm
                                ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50' : 'bg-slate-50 border-slate-200 focus:border-orange-500/50'}`}
                        />
                    </div>
                </div>
            </div>

            <div className={`rounded-[5px] border shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left font-bold">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-[0.2em] border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="py-6 px-10">#</th>
                                <th className="py-6 px-10">Test Name</th>
                                <th className="py-6 px-10">Code</th>
                                <th className="py-6 px-10 text-right pr-12">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {isLoading ? (
                                <tr><td colSpan="4" className="py-32 text-center text-xs opacity-40">LOADING TESTS...</td></tr>
                            ) : filteredTests.length === 0 ? (
                                <tr><td colSpan="4" className="py-32 text-center text-xs opacity-40">NO TESTS ALLOTTED TO THIS CENTRE</td></tr>
                            ) : filteredTests.map((t, idx) => (
                                <tr key={t.id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                    <td className="py-6 px-10 text-xs opacity-30">{idx + 1}</td>
                                    <td className="py-6 px-10 uppercase text-sm">{t.name}</td>
                                    <td className="py-6 px-10 font-bold"><span className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded-[5px] text-[10px]">{t.code}</span></td>
                                    <td className="py-6 px-10 text-right pr-12">
                                        <div className="relative flex justify-end">
                                            <div className={`w-11 h-6 rounded-full transition-all duration-500 ${Boolean(t.is_completed) ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-1 left-1 bg-white h-4 w-4 rounded-full shadow-sm transition-transform duration-500 ${Boolean(t.is_completed) ? 'translate-x-5' : 'translate-x-0'}`} />
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

const CentreRegistry = ({ centresData, isERPLoading }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [centres, setCentres] = useState(centresData || []);
    const [localCentres, setLocalCentres] = useState([]);
    const [tests, setTests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterState, setFilterState] = useState('');
    const [filterAllotment, setFilterAllotment] = useState(''); // 'allotted', 'not_allotted'

    const [view, setView] = useState('list');
    const [selectedCentreForTests, setSelectedCentreForTests] = useState(null);

    const loadData = useCallback(async (force = false) => {
        if (!force && centres.length > 0 && localCentres.length > 0) return;
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const authToken = token || localStorage.getItem('auth_token');

            let erpData = centresData;
            if (!erpData || erpData.length === 0) {
                const erpUrl = import.meta.env.VITE_ERP_API_URL || 'https://pathfinder-5ri2.onrender.com';
                const erpIdentifier = import.meta.env.VITE_ERP_ADMIN_EMAIL || "atanu@gmail.com";
                const erpPassword = import.meta.env.VITE_ERP_ADMIN_PASSWORD || "000000";

                const loginRes = await axios.post(`${erpUrl}/api/superAdmin/login`, {
                    email: erpIdentifier,
                    password: erpPassword
                });

                const erpToken = loginRes.data.token;
                const centreRes = await axios.get(`${erpUrl}/api/centre`, {
                    headers: { 'Authorization': `Bearer ${erpToken}` }
                });
                erpData = centreRes.data?.data || (Array.isArray(centreRes.data) ? centreRes.data : []);
            }
            setCentres(erpData);

            const [localRes, testsRes] = await Promise.all([
                axios.get(`${apiUrl}/api/centres/`, { headers: { Authorization: `Bearer ${authToken}` } }),
                axios.get(`${apiUrl}/api/tests/`, { headers: { Authorization: `Bearer ${authToken}` } })
            ]);
            setLocalCentres(localRes.data);
            setTests(testsRes.data);

        } catch (err) {
            console.error("❌ Data Sync Failure:", err);
            setError(`Sync Failed: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [centresData, getApiUrl, token, centres.length, localCentres.length]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const uniqueStates = [...new Set(centres.map(c => c.state).filter(Boolean))].sort();

    const filteredCentres = centres.filter(centre => {
        const matchesSearch = centre.centreName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            centre.enterCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            centre.state?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesState = filterState ? centre.state === filterState : true;

        const localCentre = localCentres.find(lc => lc.code === centre.enterCode);
        const allottedTestsCount = localCentre ? tests.filter(t => t.centres?.includes(localCentre.id)).length : 0;

        const matchesAllotment = filterAllotment === 'allotted' ? allottedTestsCount > 0 :
            filterAllotment === 'not_allotted' ? allottedTestsCount === 0 : true;

        return matchesSearch && matchesState && matchesAllotment;
    });

    if (isLoading || isERPLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-orange-500/10 border-t-orange-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin size={20} className="text-orange-500 animate-pulse" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="font-black uppercase tracking-[0.3em] text-[10px] text-orange-500 mb-1">Centre Gateway</p>
                    <p className={`text-xs font-bold opacity-40 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Synchronizing Live Nodes...</p>
                </div>
            </div>
        );
    }

    if (error && centres.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-[5px] flex items-center justify-center mb-6 border border-red-500/20">
                    <AlertCircle size={40} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">Sync Connection Failed</h3>
                <p className="text-sm font-medium opacity-50 max-w-xs mx-auto mb-8">{error}</p>
                <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-900 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest">Retry Sync</button>
            </div>
        );
    }

    if (view === 'details' && selectedCentreForTests) {
        return <AllocatedTestsForCentre centre={selectedCentreForTests} onBack={() => setView('list')} />;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-1000 p-1">
            <div className={`p-10 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-orange-500/20">ERP Nodes</div>
                            <h2 className="text-3xl font-black tracking-tight uppercase">Centre <span className="text-orange-500">Management</span></h2>
                        </div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Managing global educational centres and regional hubs.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        {/* Region Filter */}
                        <div className="relative w-full sm:w-44">
                            <select
                                value={filterState}
                                onChange={(e) => setFilterState(e.target.value)}
                                className={`w-full pl-4 pr-10 py-3 rounded-[5px] border font-bold text-xs uppercase tracking-wider outline-none cursor-pointer appearance-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:bg-black/40' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'}`}
                            >
                                <option value="">All Regions</option>
                                {uniqueStates.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>

                        {/* Allotment Filter */}
                        <div className="relative w-full sm:w-44">
                            <select
                                value={filterAllotment}
                                onChange={(e) => setFilterAllotment(e.target.value)}
                                className={`w-full pl-4 pr-10 py-3 rounded-[5px] border font-bold text-xs uppercase tracking-wider outline-none cursor-pointer appearance-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:bg-black/40' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'}`}
                            >
                                <option value="">Show All</option>
                                <option value="allotted">Allotted Only</option>
                                <option value="not_allotted">Not Allotted Only</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-64 group">
                            <Hash className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-orange-400'}`} size={18} />
                            <input
                                type="text"
                                placeholder="Filter centres..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-12 pr-4 py-3 rounded-[5px] border transition-all outline-none font-bold text-sm
                                    ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50' : 'bg-white border-slate-200 focus:border-orange-500/50 focus:shadow-lg focus:shadow-orange-500/5'}`}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="pb-6 px-4">Sl No.</th>
                                <th className="pb-6 px-4">Centre Identity</th>
                                <th className="pb-6 px-4">Location & Logistics</th>
                                <th className="pb-6 px-4">Communication</th>
                                <th className="pb-6 px-4 text-center">No. of Tests</th>
                                <th className="pb-6 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {filteredCentres.length > 0 ? filteredCentres.map((centre, i) => {
                                const localCentre = localCentres.find(lc => lc.code === centre.enterCode);
                                const allottedTestsCount = localCentre ? tests.filter(t => t.centres?.includes(localCentre.id)).length : 0;

                                return (
                                    <tr key={i} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-white shadow-sm'} transition-all duration-300`}>
                                        <td className="py-6 px-4"><span className="text-[10px] font-black opacity-30">{(i + 1).toString().padStart(2, '0')}</span></td>
                                        <td className="py-6 px-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center font-black text-sm border-2 transition-all group-hover:scale-110 group-hover:rotate-3 ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-white/5 shadow-inner' : 'bg-orange-50 text-orange-600 border-orange-100 shadow-sm'}`}>
                                                    {centre.enterCode || 'C'}
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-sm tracking-tight leading-none mb-1 group-hover:text-orange-500 transition-colors uppercase">{centre.centreName || 'Unknown Centre'}</p>
                                                    <p className="text-[9px] opacity-40 font-black uppercase tracking-[0.2em]">{centre.state || 'Region'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4 max-w-xs">
                                            <div className="flex items-start gap-2">
                                                <MapPin size={10} className="opacity-40 mt-1 shrink-0" />
                                                <span className="text-[11px] font-bold leading-relaxed opacity-60">
                                                    {centre.address?.split('\\n').join(' ') || centre.locationAddress || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Mail size={10} className="text-orange-500 opacity-60" />
                                                    <span className="text-[10px] font-medium opacity-60 italic">{centre.email || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Phone size={10} className="text-orange-500 opacity-60" />
                                                    <span className="text-[10px] font-black opacity-80 tracking-tight">{centre.phoneNumber || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <span className={`text-lg font-black ${allottedTestsCount > 0 ? 'text-orange-500 animate-pulse' : 'opacity-20'}`}>{allottedTestsCount}</span>
                                                <span className="text-[8px] font-bold opacity-30 uppercase tracking-tighter">ALLOTTED</span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedCentreForTests({
                                                        id: localCentre?.id,
                                                        code: centre.enterCode,
                                                        name: centre.centreName
                                                    });
                                                    setView('details');
                                                }}
                                                className="px-4 py-2 bg-orange-500 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/30 active:scale-95"
                                            >
                                                Tests
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="6" className="py-40 text-center text-xs font-black uppercase opacity-20 tracking-widest">No matching centres found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CentreRegistry;
