import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Database, AlertCircle, MapPin, Mail, Phone, Globe, Hash, Navigation
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const CentreRegistry = ({ centresData, isERPLoading }) => {
    const { isDarkMode } = useTheme();
    const { user: portalUser } = useAuth();
    const [centres, setCentres] = useState(centresData || []);
    const [isLoading, setIsLoading] = useState(!centresData || centresData.length === 0);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (centresData && centresData.length > 0) {
            setCentres(centresData);
            setIsLoading(false);
            return;
        }

        const loadERPData = async () => {
            setIsLoading(true);
            try {
                const erpUrl = import.meta.env.VITE_ERP_API_URL || 'https://pathfinder-5ri2.onrender.com';
                const erpIdentifier = import.meta.env.VITE_ERP_ADMIN_EMAIL || "atanu@gmail.com";
                const erpPassword = import.meta.env.VITE_ERP_ADMIN_PASSWORD || "000000";

                const loginRes = await axios.post(`${erpUrl}/api/superAdmin/login`, {
                    email: erpIdentifier,
                    password: erpPassword
                });

                const token = loginRes.data.token;
                const centreRes = await axios.get(`${erpUrl}/api/centre`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                let erpData = centreRes.data?.data || (Array.isArray(centreRes.data) ? centreRes.data : []);
                setCentres(erpData);
            } catch (err) {
                console.error("❌ Centre Sync Failure:", err);
                setError(`Sync Failed: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        loadERPData();
    }, [centresData]);

    const filteredCentres = centres.filter(centre =>
        centre.centreName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        centre.enterCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        centre.state?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading || isERPLoading) return (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-orange-500/10 border-t-orange-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <MapPin size={20} className="text-orange-500 animate-pulse" />
                </div>
            </div>
            <div className="text-center">
                <p className="font-black uppercase tracking-[0.3em] text-[10px] text-orange-500 mb-1">Centre Gateway</p>
                <p className={`text-xs font-bold opacity-40 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Fetching Live Centre Registry...</p>
            </div>
        </div>
    );

    if (error && centres.length === 0) return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20 shadow-2xl shadow-red-500/10">
                <AlertCircle size={40} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">Sync Connection Failed</h3>
            <p className="text-sm font-medium opacity-50 max-w-xs mx-auto mb-8">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95">Retry Sync</button>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 p-1">
            <div className={`p-10 rounded-[3rem] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-orange-500/20">ERP Nodes</div>
                            <h2 className="text-3xl font-black tracking-tight uppercase">Centre <span className="text-orange-500">Management</span></h2>
                        </div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Managing global educational centres and regional hubs.</p>
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <Hash className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-orange-400'}`} size={18} />
                        <input
                            type="text"
                            placeholder="Filter by Name, Code or State..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-2xl border transition-all outline-none font-bold text-sm
                                ${isDarkMode
                                    ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50'
                                    : 'bg-white border-slate-200 focus:border-orange-500/50 focus:shadow-orange-500/10 focus:shadow-lg'}`}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="pb-6 px-4">Centre Identity</th>
                                <th className="pb-6 px-4">Location & Logistics</th>
                                <th className="pb-6 px-4">Communication</th>
                                <th className="pb-6 px-4 text-center">Reference</th>
                                <th className="pb-6 px-4 text-right">Coordinates</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {filteredCentres.length > 0 ? filteredCentres.map((centre, i) => (
                                <tr key={i} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-white shadow-sm'} transition-all duration-300`}>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border-2 transition-all group-hover:scale-110 group-hover:rotate-3 ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-white/5 shadow-inner' : 'bg-orange-50 text-orange-600 border-orange-100 shadow-sm'}`}>
                                                {centre.enterCode || 'C'}
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-base tracking-tight leading-none mb-1 group-hover:text-orange-500 transition-colors uppercase">{centre.centreName || 'Unknown Centre'}</p>
                                                <p className="text-[9px] opacity-40 font-black uppercase tracking-[0.2em]">{centre.state || 'Region'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 max-w-xs">
                                        <div className="flex items-start gap-2">
                                            <MapPin size={12} className="opacity-40 mt-1 shrink-0" />
                                            <span className="text-xs font-bold leading-relaxed opacity-60">
                                                {centre.address?.split('\\n').join(' ') || centre.locationAddress || 'No Address Provided'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Mail size={12} className="text-orange-500" />
                                            <span className="text-[11px] font-bold opacity-60 italic">{centre.email || 'no-contact@erp.system'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone size={12} className="text-orange-500" />
                                            <span className="text-[11px] font-black opacity-80 tracking-tight">{centre.phoneNumber || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest ${isDarkMode ? 'bg-white/5 text-orange-400 border border-white/5' : 'bg-orange-50 text-orange-600 border border-orange-100 shadow-sm'}`}>
                                                {centre.enterCode || 'ERP-NODE'}
                                            </span>
                                            <span className="text-[8px] font-bold opacity-20 mt-1 uppercase">Entity ID</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-2 text-orange-500/60">
                                                <Navigation size={10} />
                                                <span className="text-[10px] font-black font-mono tracking-tighter">
                                                    {centre.latitude?.toFixed(4)}, {centre.longitude?.toFixed(4)}
                                                </span>
                                            </div>
                                            <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg border shadow-lg ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                GEO-VERIFIED
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="py-40 text-center">
                                        <div className="flex flex-col items-center opacity-10">
                                            <Database size={80} className="mb-6" />
                                            <p className="font-black uppercase tracking-[0.4em] text-xl text-orange-500">Spectral Void</p>
                                            <p className="text-sm mt-2 font-bold italic">The ERP system returned zero matching centre nodes.</p>
                                        </div>
                                    </td>
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
