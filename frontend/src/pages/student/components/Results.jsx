import React, { useState, useEffect, useMemo } from 'react';
import { Award, TrendingUp, Search, Filter, Loader2, Target, BarChart3, RotateCw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import ResultReport from './ResultReport';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';



const DoughnutChart = ({ slices, size = 160, thickness = 24, isDarkMode }) => {
    const [hovered, setHovered] = useState(null);
    const cx = size / 2;
    const r = (size - thickness) / 2;
    const circumference = 2 * Math.PI * r;

    const total = useMemo(() => slices.reduce((acc, s) => acc + (s.value || 0), 0), [slices]);

    const arcs = useMemo(() => {
        let offset = 0;
        return slices.map((s) => {
            const pct = (s.value || 0) / (total || 1);
            const arc = { ...s, pct, offset: offset * circumference, dash: pct * circumference };
            offset += pct;
            return arc;
        });
    }, [slices, total, circumference]);

    const dominant = useMemo(() => {
        if (!arcs.length) return null;
        return arcs.reduce((a, b) => (b.value || 0) > (a.value || 0) ? b : a);
    }, [arcs]);

    const hov = hovered !== null ? arcs[hovered] : null;
    const display = hov || dominant;

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg
                width={size} height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{ transform: 'rotate(-90deg)', display: 'block', overflow: 'visible' }}
            >
                {/* Background Ring */}
                <circle
                    cx={cx} cy={cx} r={r}
                    fill="none"
                    stroke={isDarkMode ? "rgba(255,255,255,0.08)" : "#E2E8F0"}
                    strokeWidth={thickness}
                />

                {arcs.map((arc, i) => {
                    const isHov = hovered === i;
                    return (
                        <g key={i}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ cursor: 'pointer' }}
                        >
                            <circle
                                cx={cx} cy={cx} r={r}
                                fill="none"
                                stroke={arc.color}
                                strokeWidth={isHov ? thickness + 12 : thickness}
                                strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                                strokeDashoffset={-arc.offset}
                                style={{
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    opacity: hovered !== null && !isHov ? 0.3 : 1,
                                    filter: isHov ? `drop-shadow(0 0 12px ${arc.color}cc)` : 'none',
                                }}
                            />
                        </g>
                    );
                })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-black font-brand leading-none tracking-tighter" style={{ color: display?.color || (isDarkMode ? '#fff' : '#1e293b') }}>
                    {display ? `${(display.pct * 100).toFixed(2)}%` : '--'}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">
                    {display?.name || 'Status'}
                </p>
            </div>
        </div>
    );
};

const ResultAnalytics = ({ results, isDarkMode }) => {
    const chartData = results || [];

    const performanceData = useMemo(() => {
        if (!chartData || chartData.length === 0) return [];
        const sorted = [...chartData].sort((a, b) => new Date(a.date) - new Date(b.date));
        return sorted.map(t => ({
            name: t.code,
            fullName: t.name,
            score: t.isMissed ? 0 : (parseFloat(((t.marks / t.total) * 100).toFixed(2)) || 0),
            percentile: t.isMissed ? 0 : (parseFloat(t.percentile?.toFixed(2)) || 0),
            rank: t.rank || 0,
            isMissed: t.isMissed
        })).slice(-10); // Show last 10 for better visibility
    }, [chartData]);

    const distribution = useMemo(() => {
        let excel = 0, avg = 0, poor = 0;
        const validResults = chartData.filter(t => !t.isMissed);
        validResults.forEach(r => {
            const pct = (r.marks / r.total) * 100;
            if (pct >= 80) excel++;
            else if (pct >= 50) avg++;
            else poor++;
        });
        const dist = [
            { name: 'Excellent', value: excel, color: '#10b981' },
            { name: 'Average', value: avg, color: '#f59e0b' },
            { name: 'Needs Work', value: poor, color: '#ef4444' }
        ].filter(d => d.value > 0);
        return dist.length > 0 ? dist : [{ name: 'No Data', value: 1, color: '#94a3b8' }];
    }, [chartData]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className={`p-4 rounded-[12px] border ${isDarkMode ? 'bg-[#1e293b] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'} min-w-[150px]`}>
                    <div className="flex items-center justify-between gap-4 mb-2">
                        <p className={`text-[10px] font-black uppercase tracking-widest text-slate-500`}>{data.name}</p>
                        {data.isMissed && (
                            <span className="px-1.5 py-0.5 rounded-[3px] bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest border border-red-500/20">
                                Missed
                            </span>
                        )}
                    </div>
                    <p className={`text-xs font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{data.fullName}</p>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-10">
                            <span className="text-[10px] font-black text-blue-500 uppercase">Percentile</span>
                            <span className={`text-[11px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{data.percentile}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-10">
                            <span className="text-[10px] font-black text-emerald-500 uppercase">Score</span>
                            <span className={`text-[11px] font-black ${data.score < 0 ? 'text-red-500' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
                                {data.score.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Percentile Trend Area Chart */}
            <div className={`col-span-1 lg:col-span-2 p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Percentile Trend</h3>
                        <p className={`text-lg font-black font-brand ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Academic Growth</p>
                    </div>
                    <TrendingUp className="text-blue-500 transition-transform hover:scale-125" size={20} />
                </div>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height={140}>
                        <AreaChart data={performanceData}>
                            <defs>
                                <linearGradient id="colorPercentile" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 700 }}
                                padding={{ left: 30, right: 30 }}
                            />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="percentile"
                                stroke="#3b82f6"
                                fillOpacity={1}
                                fill="url(#colorPercentile)"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: isDarkMode ? '#10141D' : '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                animationDuration={2000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Performance Distribution Pie Chart */}
            <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Score Matrix</h3>
                        <p className={`text-lg font-black font-brand ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Grade Mix</p>
                    </div>
                    <BarChart3 className="text-emerald-500 transition-transform hover:scale-125" size={20} />
                </div>
                <div className="h-48 w-full flex items-center justify-center mt-2">
                    <DoughnutChart slices={distribution} isDarkMode={isDarkMode} thickness={24} />
                </div>
                {/* Custom Legend */}
                <div className="flex justify-center flex-wrap gap-4 mt-2">
                    {distribution.map(item => (
                        <div key={item.name} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Results = ({ isDarkMode }) => {
    const { user, getApiUrl, token } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('recent'); // 'recent', 'all'
    const [selectedReport, setSelectedReport] = useState(null);
    const [detailedResults, setDetailedResults] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchResults = React.useCallback(async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const apiUrl = getApiUrl();
            const [resultsRes, testsRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/my_results/`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${apiUrl}/api/tests/`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const results = resultsRes.data || [];
            const allTests = testsRes.data || [];
            const now = new Date();

            // Identify all tests not taken yet
            const otherTests = allTests.filter(t => {
                const isTaken = results.some(r => r.code === t.code || (r.id === t.id && !r.isMissed));
                return !isTaken;
            }).map(t => {
                const end = t.end_time ? new Date(t.end_time) : null;
                const start = t.start_time ? new Date(t.start_time) : null;
                const isExpired = end && now > end;
                const isUpcoming = start && now < start;

                return {
                    ...t,
                    isMissed: isExpired,
                    isPlanned: !isExpired,
                    isUpcoming: isUpcoming,
                    date: t.end_time ? new Date(t.end_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '—',
                    marks: 0,
                    total: 0,
                    rank: '--',
                    percentile: 0
                };
            });

            const combined = [...results, ...otherTests].sort((a, b) => {
                const dateA = new Date(a.date || a.end_time || a.start_time);
                const dateB = new Date(b.date || b.end_time || b.start_time);
                return dateB - dateA;
            });

            setDetailedResults(combined);
        } catch (err) {
            console.error("Error fetching results", err);
        } finally {
            setIsLoading(false);
        }
    }, [token, getApiUrl]);

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

    // Derived statistics - only from actual attempts
    const actualAttempts = useMemo(() =>
        (detailedResults || []).filter(r => !r.isMissed && !r.isPlanned && !r.isUpcoming),
        [detailedResults]);

    const latestResult = useMemo(() => actualAttempts[0] || null, [actualAttempts]);

    const highestScore = useMemo(() => {
        if (actualAttempts.length === 0) return null;
        return actualAttempts.reduce((best, res) => {
            const resPct = res.total > 0 ? (res.marks / res.total) * 100 : 0;
            const bestPct = best.total > 0 ? (best.marks / best.total) * 100 : 0;
            return resPct > bestPct ? { ...res, pct: resPct } : { ...best, pct: bestPct };
        }, { ...actualAttempts[0], pct: actualAttempts[0].total > 0 ? (actualAttempts[0].marks / actualAttempts[0].total) * 100 : 0 });
    }, [actualAttempts]);

    const averagePercentile = useMemo(() => {
        const validResults = actualAttempts.filter(r => r.percentile != null && !isNaN(r.percentile) && Number(r.percentile) > 0);
        if (validResults.length === 0) return { value: 0, count: 0 };
        const recent5 = validResults.slice(0, 5);
        const sum = recent5.reduce((acc, curr) => acc + Number(curr.percentile), 0);
        return { value: (sum / recent5.length), count: recent5.length };
    }, [actualAttempts]);

    const globalRank = useMemo(() => {
        if (actualAttempts.length === 0) return 'N/A';
        const ranks = actualAttempts.map(r => r.rank).filter(r => r != null && !isNaN(r) && r > 0);
        return ranks.length > 0 ? Math.min(...ranks) : 'N/A';
    }, [actualAttempts]);

    const filteredDetailedResults = useMemo(() => {
        let results = detailedResults || [];
        if (searchTerm) {
            results = results.filter(res =>
                res.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                res.code?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (activeTab === 'recent') {
            // Only show actual attempts (completed exams) in Recent Results
            return results.filter(res => !res.isMissed && !res.isPlanned && !res.isUpcoming).slice(0, 5);
        }

        // For "View All" show only finished exams: either actual attempts or expired (missed) tests.
        // This hides ongoing / available / upcoming tests from the results tab until the exam is over.
        return results.filter(res => res.isMissed || (!res.isPlanned && !res.isUpcoming));
    }, [detailedResults, searchTerm, activeTab]);

    // Only use finished exams (expired or actual attempts) for analytics and global summaries
    const finishedResults = useMemo(() => {
        return (detailedResults || []).filter(r => r.isMissed || (!r.isPlanned && !r.isUpcoming));
    }, [detailedResults]);

    // If a report is selected, show the report view
    if (selectedReport) {
        return (
            <AnimatePresence mode="wait">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                >
                    <ResultReport
                        test={selectedReport}
                        isDarkMode={isDarkMode}
                        onBack={() => setSelectedReport(null)}
                    />
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 pb-10 pt-4"
            >
                {/* Embedded Premium Analytics Dashboard (only finished exams) */}
                {!isLoading && (
                    <ResultAnalytics results={finishedResults} isDarkMode={isDarkMode} />
                )}

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-2">
                    <div className="flex items-center gap-6">
                        <h2 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {activeTab === 'recent' ? 'Recent Results' : 'Score History'}
                        </h2>
                        <div className={`flex p-1 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200 shadow-inner'}`}>
                            <button
                                onClick={() => setActiveTab('recent')}
                                className={`px-4 py-1.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'recent'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Recent
                            </button>
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-1.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                View All
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                            <input
                                type="text"
                                placeholder={"Search by test name..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full md:w-64 pl-11 pr-4 py-2.5 rounded-[5px] border text-xs font-bold transition-all outline-none ${isDarkMode
                                    ? 'bg-[#10141D] border-white/10 focus:border-blue-500/50 text-white'
                                    : 'bg-white border-slate-200 focus:border-blue-400 focus:shadow-lg focus:shadow-blue-500/5 text-slate-700'}`}
                            />
                        </div>
                        <button
                            onClick={fetchResults}
                            disabled={isLoading}
                            className={`p-2.5 rounded-[5px] border transition-all ${isDarkMode
                                ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                                : 'bg-white border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm'}`}
                        >
                            <RotateCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button className={`p-2.5 rounded-[5px] border transition-all ${isDarkMode
                            ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 shadow-sm'}`}>
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {/* Results Table */}
                <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                    <th className="py-5 px-6 w-16 text-center">#</th>
                                    <th className="py-5 px-6">Test Detail</th>
                                    <th className="py-5 px-6">Date</th>
                                    <th className="py-5 px-6 text-center">Score</th>
                                    <th className="py-5 px-6 text-center">Rank</th>
                                    <th className="py-5 px-6 text-center">Percentile</th>
                                    <th className="py-5 px-6 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-50">
                                                <Loader2 size={48} className="animate-spin text-blue-500" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Loading Results...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredDetailedResults.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-20 text-center">
                                            <div className="opacity-20 flex flex-col items-center gap-3">
                                                <Search size={48} />
                                                <p className="text-sm font-black uppercase tracking-[0.2em]">No Results Found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDetailedResults.map((res, index) => (
                                        <tr key={res.id || res.code} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'} ${res.isMissed ? 'opacity-80' : ''}`}>
                                            <td className="py-5 px-6 text-center text-xs font-bold opacity-40">{index + 1}</td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[11px] font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                            {res.name}
                                                        </span>
                                                        {res.isMissed && (
                                                            <span className="px-1.5 py-0.5 rounded-[3px] bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest border border-red-500/20">
                                                                Missed
                                                            </span>
                                                        )}
                                                        {res.isPlanned && !res.isUpcoming && (
                                                            <span className="px-1.5 py-0.5 rounded-[3px] bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase tracking-widest border border-blue-500/20">
                                                                Available
                                                            </span>
                                                        )}
                                                        {res.isUpcoming && (
                                                            <span className="px-1.5 py-0.5 rounded-[3px] bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-500/20">
                                                                Upcoming
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest mt-0.5">{res.code}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className="text-[11px] font-bold opacity-50">{res.date}</span>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                {res.isMissed || res.isPlanned || res.isUpcoming ? (
                                                    <span className="text-[11px] font-bold text-slate-400">-- / --</span>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-[11px] font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                            {res.marks}/{res.total}
                                                        </span>
                                                        <div className={`h-1 w-12 rounded-full overflow-hidden mt-1 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                                            <div
                                                                className="h-full bg-emerald-500"
                                                                style={{ width: `${Math.max(0, Math.min(100, (res.marks / res.total) * 100))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <div className="flex items-center justify-center gap-1.5 opacity-50">
                                                    <Award size={12} />
                                                    <span className="text-[11px] font-bold">{(!res.isMissed && !res.isPlanned && !res.isUpcoming) ? `#${res.rank}` : '--'}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <div className="flex items-center justify-center gap-1.5 opacity-50">
                                                    <TrendingUp size={12} className="text-blue-500" />
                                                    <span className="text-[11px] font-bold">{(!res.isMissed && !res.isPlanned && !res.isUpcoming) ? `${res.percentile?.toFixed(2)}%` : '--'}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                {res.isUpcoming ? (
                                                    <div className="bg-slate-100 dark:bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-[4px] cursor-not-allowed inline-block">
                                                        Locked
                                                    </div>
                                                ) : res.isPlanned ? (
                                                    <button
                                                        onClick={() => window.location.hash = '#exams'}
                                                        className="bg-[#4871D9] hover:bg-[#3D60B8] text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-[4px] transition-all active:scale-95 shadow-lg shadow-blue-500/10"
                                                    >
                                                        Go To Test
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setSelectedReport(res)}
                                                        className={`${res.isMissed ? 'bg-slate-500 hover:bg-slate-600' : 'bg-[#4871D9] hover:bg-[#3D60B8]'} text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-[4px] transition-all active:scale-95 shadow-lg shadow-blue-500/10`}
                                                    >
                                                        {res.isMissed ? 'Solutions' : 'Report'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Performance Summary Cards (Moved to bottom as highlights) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className={`p-6 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Latest Result</h4>
                        <div className={`text-3xl font-black text-center mb-1 ${!latestResult ? 'text-slate-400' : 'text-blue-500'}`}>
                            {latestResult ? `${((latestResult.marks / latestResult.total) * 100).toFixed(2)}%` : '—'}
                        </div>
                        <p className="text-[10px] font-bold text-center opacity-40 uppercase tracking-tighter truncate px-2">
                            {latestResult?.name || 'No Attempts'}
                        </p>
                        <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12">
                            <Target size={100} />
                        </div>
                    </div>

                    <div className={`p-6 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Highest Score</h4>
                        <div className={`text-3xl font-black text-center mb-1 ${!highestScore ? 'text-slate-400' : 'text-emerald-500'}`}>
                            {highestScore ? `${highestScore.pct.toFixed(2)}%` : '—'}
                        </div>
                        <p className="text-[10px] font-bold text-center opacity-40 uppercase tracking-tighter truncate px-2">
                            {highestScore?.name || 'No data'}
                        </p>
                        <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12">
                            <Award size={100} />
                        </div>
                    </div>

                    <div className={`p-6 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Avg. Percentile</h4>
                        <div className="text-3xl font-black text-center text-blue-500 mb-1">
                            {averagePercentile.value > 0 ? `${averagePercentile.value.toFixed(2)}%` : '—'}
                        </div>
                        <p className="text-[10px] font-bold text-center opacity-40 uppercase tracking-tighter">
                            Across {averagePercentile.count} tests
                        </p>
                        <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12">
                            <TrendingUp size={100} />
                        </div>
                    </div>

                    <div className={`p-6 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Global Rank</h4>
                        <div className="text-3xl font-black text-center text-orange-500 mb-1">
                            {globalRank !== 'N/A' ? `#${globalRank}` : '—'}
                        </div>
                        <p className="text-[10px] font-bold text-center opacity-40 uppercase tracking-tighter">
                            Current Best Standing
                        </p>
                        <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12">
                            <Award size={100} />
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default Results;
