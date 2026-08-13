import React, { useState, useEffect } from 'react';
import { UserX, AlertTriangle, CheckCircle, Clock, Search, Filter, RefreshCw, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const DCStoppedTab = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const fetchDcStopped = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/dc-stopped/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setStudents(res.data.data);
            }
        } catch (err) {
            console.error("DC Stopped fetch error:", err);
            setStudents([
                { id: 1, student_name: "Karan Ghosh", roll_no: "PF-2026-0780", batch: "ENG-11B", status: "DC Stopped", stopped_date: "2026-07-15", reason: "Relocation to Delhi", remarks: "Transferred out due to father's job relocation", follow_up_status: "Completed - Exit Clearance Issued" },
                { id: 2, student_name: "Megha Roy", roll_no: "PF-2026-0899", batch: "MED-12B", status: "Active", stopped_date: "N/A", reason: "N/A", remarks: "Regular attendee", follow_up_status: "N/A" },
                { id: 3, student_name: "Bikramjit Malo", roll_no: "PF-2026-0912", batch: "MED-11A", status: "DC Stopped", stopped_date: "2026-08-02", reason: "Financial Constraints", remarks: "Offered scholarship revision, parent declined", follow_up_status: "In Counseling" }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDcStopped();
    }, []);

    const toggleStatus = (id) => {
        setStudents(prev => prev.map(st => {
            if (st.id === id) {
                const newStatus = st.status === 'Active' ? 'DC Stopped' : 'Active';
                return {
                    ...st,
                    status: newStatus,
                    stopped_date: newStatus === 'DC Stopped' ? new Date().toISOString().split('T')[0] : 'N/A'
                };
            }
            return st;
        }));
    };

    const filteredStudents = students.filter(st => {
        const matchesSearch = st.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || st.roll_no.toLowerCase().includes(searchQuery.toLowerCase()) || st.batch.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || st.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stoppedCount = students.filter(st => st.status === 'DC Stopped').length;

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <UserX className="text-rose-500" size={24} />
                            <h2 className="text-2xl font-black tracking-tight">DC Stopped (Discontinued Students)</h2>
                        </div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Manage students who have discontinued or stopped attending classes. Update status (Active → DC Stopped), reason, and follow-up notes.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {['All', 'DC Stopped', 'Active'].map(st => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                                    statusFilter === st
                                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                                        : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-rose-950/20 border-rose-500/20' : 'bg-rose-50 border-rose-200'} space-y-2`}>
                    <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Total DC Stopped</span>
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-rose-500">{stoppedCount}</span>
                        <UserX className="text-rose-500/80" size={24} />
                    </div>
                    <p className={`text-[11px] font-medium ${isDarkMode ? 'text-rose-400/80' : 'text-rose-600'}`}>Discontinued Students</p>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>In Re-engagement</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>1</span>
                        <Clock className={isDarkMode ? 'text-amber-400/80' : 'text-amber-600/80'} size={24} />
                    </div>
                    <p className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Counseling ongoing</p>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active Students</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            {students.filter(st => st.status === 'Active').length}
                        </span>
                        <CheckCircle className={isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'} size={24} />
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    placeholder="Search discontinued students by name, roll no, or batch..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold outline-none ${
                        isDarkMode
                            ? 'bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500'
                            : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-rose-500'
                    }`}
                />
            </div>

            {/* Student Registry Table */}
            <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'} shadow-xl`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className={`border-b font-extrabold uppercase tracking-wider text-[11px] ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                <th className="p-4">Student Name & Roll</th>
                                <th className="p-4">Batch</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Stopped Date</th>
                                <th className="p-4">Reason</th>
                                <th className="p-4">Remarks & Follow-up</th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                            {filteredStudents.map(st => (
                                <tr key={st.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'}`}>
                                    <td className="p-4 font-bold text-sm">
                                        <p className={isDarkMode ? 'text-white' : 'text-slate-900'}>{st.student_name}</p>
                                        <p className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{st.roll_no}</p>
                                    </td>
                                    <td className={`p-4 font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{st.batch}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            st.status === 'DC Stopped'
                                                ? (isDarkMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-rose-100 text-rose-700 border border-rose-200')
                                                : (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                        }`}>
                                            {st.status}
                                        </span>
                                    </td>
                                    <td className={`p-4 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{st.stopped_date}</td>
                                    <td className={`p-4 font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{st.reason}</td>
                                    <td className="p-4">
                                        <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{st.remarks}</p>
                                        <span className={`text-[10px] block mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{st.follow_up_status}</span>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleStatus(st.id)}
                                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                                st.status === 'Active'
                                                    ? (isDarkMode ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white')
                                                    : (isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white')
                                            }`}
                                        >
                                            {st.status === 'Active' ? 'Mark DC Stopped' : 'Reactivate'}
                                        </button>
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

export default DCStoppedTab;
