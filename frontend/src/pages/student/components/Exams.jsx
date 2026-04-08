import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { FileText, Calendar, Clock, Award, TrendingUp, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import StartExamModal from './StartExamModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
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
                <p className="text-3xl font-black font-brand leading-none tracking-tighter" style={{ color: display?.color || (isDarkMode ? '#fff' : '#1e293b') }}>
                    {display ? `${Math.round(display.pct * 100)}%` : '--'}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">
                    {display?.name || 'Status'}
                </p>
            </div>
        </div>
    );
};

const ExamAnalytics = ({ tests, isDarkMode, onTabChange }) => {
    const now = new Date();
    
    const { upcoming, ongoing, previous, totals } = useMemo(() => {
        const up = [];
        const on = [];
        const pre = [];
        
        tests.forEach(t => {
            const start = t.start_time ? new Date(t.start_time) : null;
            const end = t.end_time ? new Date(t.end_time) : null;
            const isExpired = end && now > end;
            const isStudentCompleted = (t.submission?.is_finalized || isExpired) && !t.submission?.allow_resume;
            const hasStarted = t.submission?.time_spent > 0;
            
            if (isStudentCompleted) {
                pre.push(t);
            } else if (start && now < start) {
                up.push(t);
            } else {
                on.push(t);
            }
        });
        
        const sortedPre = pre.sort((a, b) => new Date(b.end_time) - new Date(a.end_time));
        const lastAttempted = sortedPre.find(t => t.submission?.is_finalized && !t.isMissed) || sortedPre[0];

        return {
            upcoming: up.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)).slice(0, 1),
            ongoing: on.sort((a, b) => new Date(b.start_time) - new Date(a.start_time)).slice(0, 1),
            previous: lastAttempted ? [lastAttempted] : [],
            totals: {
                upcoming: up.length,
                ongoing: on.length,
                previous: pre.length
            }
        };
    }, [tests, now]);

    const formatTime = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const StatusCard = ({ title, test, icon: Icon, color, type, count, onClick }) => {
        const hasStarted = test?.submission?.time_spent > 0;
        const isExpired = test?.end_time && new Date() > new Date(test.end_time);
        const isFinalized = test?.submission?.is_finalized;
        const isMissed = isExpired && !hasStarted && !isFinalized;

        return (
            <div 
                onClick={onClick}
                className={`flex flex-col gap-3 p-4 rounded-[5px] border transition-all ${
                    onClick ? 'cursor-pointer hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5' : ''
                } ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} flex-1`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full ${color.bg} ${color.text}`}>
                            <Icon size={12} strokeWidth={3} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black ${color.text}`}>
                            {count || 0}
                        </span>
                        {test && (
                            <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${isMissed ? 'bg-red-500/10 text-red-500' : color.bg + ' ' + color.text} opacity-80`}>
                                {type === 'upcoming' ? 'Soon' : type === 'ongoing' ? 'Live' : isMissed ? 'Expired' : 'Done'}
                            </span>
                        )}
                    </div>
                </div>

                {test ? (
                    <div className="flex flex-col">
                        <p className={`text-[11px] font-black uppercase truncate mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`} title={test.name}>
                            {test.name}
                        </p>
                        <div className="flex items-center gap-4">
                            {type === 'previous' ? (
                                <>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Marks</span>
                                        <span className={`text-[11px] font-black ${isMissed ? 'text-slate-400 opacity-40' : (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>
                                            {isMissed ? '--' : `${(test.submission?.score || 0).toFixed(2)}%`}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Rank</span>
                                        <span className={`text-[11px] font-black ${isMissed ? 'text-slate-400 opacity-40' : 'text-blue-500'}`}>
                                            #{isMissed ? '--' : (test.submission?.rank || '--')}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-1.5 opacity-60">
                                    <Calendar size={10} className="text-slate-400" />
                                    <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                        {formatTime(type === 'upcoming' ? test.start_time : test.end_time)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-[11px] font-bold text-slate-400 italic py-2">No exams scheduled</p>
                )}
            </div>
        );
    };

    const { completedCount, missedCount, ongoingCountpie } = useMemo(() => {
        let comp = 0;
        let miss = 0;
        let on = 0;
        const now = new Date();
        tests.forEach(t => {
            const end = t.end_time ? new Date(t.end_time) : null;
            const isExpired = end && now > end;
            const isFinalized = t.submission?.is_finalized;
            if (isFinalized) comp++;
            else if (isExpired) miss++;
            else on++;
        });
        return { completedCount: comp, missedCount: miss, ongoingCountpie: on };
    }, [tests]);

    const dataPie = [
        { name: 'Ongoing', value: ongoingCountpie, color: '#6366f1' },
        { name: 'Completed', value: completedCount, color: '#10b981' },
        { name: 'Missed', value: missedCount, color: '#ef4444' }
    ].filter(d => d.value > 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Quick Status Roadmap */}
            <div className={`col-span-1 lg:col-span-2 p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1 text-sky-500">Test Timeline</h3>
                        <p className={`text-lg font-black font-brand ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Roadmap Overview</p>
                    </div>
                    <Award className="text-blue-500 transition-transform hover:scale-125" size={20} />
                </div>
                
                <div className="flex flex-col md:flex-row gap-4">
                    <StatusCard 
                        title="Upcoming" 
                        test={upcoming[0]} 
                        icon={Calendar} 
                        type="upcoming"
                        count={totals.upcoming}
                        color={{ bg: 'bg-amber-500/10', text: 'text-amber-500' }} 
                        onClick={() => onTabChange?.('ongoing')}
                    />
                    <StatusCard 
                        title="Ongoing" 
                        test={ongoing[0]} 
                        icon={Clock} 
                        type="ongoing"
                        count={totals.ongoing}
                        color={{ bg: 'bg-blue-500/10', text: 'text-blue-500' }} 
                        onClick={() => onTabChange?.('ongoing')}
                    />
                    <StatusCard 
                        title="Previous" 
                        test={previous[0]} 
                        icon={Award} 
                        type="previous"
                        count={totals.previous}
                        color={{ bg: 'bg-emerald-500/10', text: 'text-emerald-500' }} 
                        onClick={() => onTabChange?.('previous')}
                    />
                </div>
            </div>

            {/* Test Distribution Pie Chart */}
            <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Status Mix</h3>
                        <p className={`text-lg font-black font-brand ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Test Volume</p>
                    </div>
                    <FileText className="text-emerald-500 transition-transform hover:scale-125" size={20} />
                </div>
                <div className="h-48 w-full flex items-center justify-center">
                    <DoughnutChart slices={dataPie} isDarkMode={isDarkMode} size={150} />
                </div>
                {/* Custom Legend */}
                <div className="flex justify-center gap-6 mt-2">
                    {dataPie.map(item => (
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



const Exams = ({ isDarkMode, onRefresh, cache, setCache }) => {
    const { user, getApiUrl, token } = useAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('ongoing'); // 'ongoing' or 'previous'
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [tests, setTests] = useState(cache?.data || []);
    const [loading, setLoading] = useState(!cache?.loaded);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);

    const fetchTests = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const apiUrl = getApiUrl();
            const [testsRes, resultsRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                axios.get(`${apiUrl}/api/tests/my_results/`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ data: [] }))
            ]);
            
            const testsData = testsRes.data || [];
            const resultsData = resultsRes.data || [];

            // Merge results data (rank, marks) into tests data
            const mergedData = testsData.map(test => {
                const result = resultsData.find(r => r.code === test.code || r.id === test.id);
                if (result) {
                    return {
                        ...test,
                        submission: {
                            ...(test.submission || {}),
                            score: result.marks != null && result.total > 0 
                                ? (result.marks / result.total) * 100 
                                : (test.submission?.score ?? 0),
                            rank: result.rank || test.submission?.rank || null
                        }
                    };
                }
                return test;
            });

            setTests(mergedData);
            if (setCache) setCache({ data: mergedData, loaded: true });
        } catch (err) {
            console.error("Error fetching tests:", err);
            setError("Failed to load exams. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [getApiUrl, token, setCache]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        // Show table-level loader while syncing
        setLoading(true);
        
        // Step 1: Tell parent to refresh ERP data (if it has the callback)
        // We pass 'true' for forceRefresh and second 'true' for silentBackground
        if (onRefresh) await onRefresh(true, true);
        
        // Step 2: Fetch fresh tests from our backend
        await fetchTests();
        setTimeout(() => setIsRefreshing(false), 1000);
    }, [onRefresh, fetchTests]);


    useEffect(() => {
        if (token && (!cache || !cache.loaded)) {
            fetchTests();
        }
    }, [token, fetchTests, cache]);

    const handleStartClick = useCallback((test) => {
        setSelectedTest(test);
        setIsModalOpen(true);
    }, []);

    const handleVerifyCode = useCallback(async (code) => {
        const apiUrl = getApiUrl();
        try {
            const response = await axios.post(`${apiUrl}/api/tests/${selectedTest.id}/verify_access_code/`, {
                code
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success('Access code verified! Launching instructions...');
                setIsModalOpen(false);
                navigate(`/student/exam/instructions/${selectedTest.id}`);
            }
        } catch (err) {
            // Rethrow so the modal can handle it
            throw err;
        }
    }, [getApiUrl, selectedTest, token, navigate]);

    const formatDateTime = useCallback((dateStr) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('en-IN', {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (e) {
            return '—';
        }
    }, []);

    const filteredTests = useMemo(() => {
        return (tests || []).filter(test =>
            (test.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (test.code || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).filter(test => {
            const now = new Date();
            const end = test.end_time ? new Date(test.end_time) : null;
            const isExpired = end && now > end;
            const isStudentCompleted = (test.submission?.is_finalized || isExpired) && !test.submission?.allow_resume;
            return activeTab === 'ongoing' ? !isStudentCompleted : isStudentCompleted;
        });
    }, [tests, searchTerm, activeTab]);

    return (
        <AnimatePresence mode="wait">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 pb-10 pt-4"
            >
                {/* Analytics Section */}
                <ExamAnalytics tests={tests} isDarkMode={isDarkMode} onTabChange={setActiveTab} />
            {/* Header Section with Search and Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <h2 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {activeTab === 'ongoing' ? 'All Active Test' : 'Previous Tests'}
                    </h2>
                    {/* View Switcher */}
                    <div className={`flex p-1 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200 shadow-inner'}`}>
                        <button
                            onClick={() => setActiveTab('ongoing')}
                            className={`px-6 py-1.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ongoing' 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Ongoing
                        </button>
                        <button
                            onClick={() => setActiveTab('previous')}
                            className={`px-6 py-1.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'previous' 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Previous
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                        <input
                            type="text"
                            placeholder="Enter the test name"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full md:w-64 pl-11 pr-4 py-2.5 rounded-[5px] border text-xs font-bold transition-all outline-none ${isDarkMode 
                                ? 'bg-[#10141D] border-white/10 focus:border-blue-500/50 text-white' 
                                : 'bg-white border-slate-200 focus:border-blue-400 focus:shadow-lg focus:shadow-blue-500/5 text-slate-700'}`}
                        />
                    </div>
                    <button 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={`p-2.5 rounded-[5px] border transition-all ${isDarkMode 
                        ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' 
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 shadow-sm'}`}>
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Test Table Section */}
            <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                <th className="py-5 px-6 w-16 text-center">#</th>
                                <th className="py-5 px-6">Test Name</th>
                                <th className="py-5 px-6">Test Code</th>
                                <th className="py-5 px-6 text-center">Duration</th>
                                <th className="py-5 px-6">Active Time</th>
                                <th className="py-5 px-6">Expire</th>
                                <th className="py-5 px-6 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 animate-pulse text-blue-500/50">
                                            <RefreshCw size={48} className="animate-spin" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Loading Secure Exams...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center text-red-500/60">
                                        <p className="text-sm font-bold">{error}</p>
                                    </td>
                                </tr>
                            ) : filteredTests.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <div className="opacity-20 flex flex-col items-center gap-3">
                                            <Search size={48} />
                                            <p className="text-sm font-black uppercase tracking-[0.2em]">No Restricted Tests Found</p>
                                            <p className="text-[10px] font-bold">Contact Admin if your Section is not visible</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTests.map((test, index) => {
                                    const now = new Date();
                                    const end = test.end_time ? new Date(test.end_time) : null;
                                    const isExpired = end && now > end;
                                    const isUnlocked = test.submission?.allow_resume;
                                    const studentCompleted = (test.submission?.is_finalized || isExpired) && !test.submission?.allow_resume;
                                    const hasStarted = (test.submission?.time_spent > 0) || test.submission?.is_finalized;
                                    const isMissed = isExpired && !hasStarted;
                                    
                                    return (
                                        <tr key={test.id || test._id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}`}>
                                            <td className="py-5 px-6 text-center text-xs font-bold opacity-40">{index + 1}</td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[11px] font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                            {test.name}
                                                        </span>
                                                        {isUnlocked && (
                                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-orange-500/10 text-orange-500 text-[8px] font-black uppercase tracking-widest animate-pulse border border-orange-500/20">
                                                                <RefreshCw size={8} /> Unlocked
                                                            </span>
                                                        )}
                                                        {isMissed && (
                                                            <span className="px-1.5 py-0.5 rounded-[3px] bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest border border-red-500/20">
                                                                Missed
                                                            </span>
                                                        )}
                                                    </div>
                                                    {!studentCompleted && hasStarted && (
                                                        <span className="text-[9px] font-bold text-blue-500 opacity-80 uppercase tracking-tighter">
                                                            Progress saved: {Math.floor((test.submission?.time_spent || 0) / 60)}m elapsed
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className="text-[11px] font-bold font-mono opacity-50 uppercase">{test.code}</span>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <span className="text-[11px] font-black opacity-60">{test.duration} MIN</span>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className="text-[11px] font-bold font-mono opacity-50">
                                                    {formatDateTime(test.start_time)}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className="text-[11px] font-bold font-mono opacity-50">
                                                    {formatDateTime(test.end_time)}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <button 
                                                    disabled={studentCompleted}
                                                    onClick={() => handleStartClick(test)}
                                                    className={`px-4 py-2 rounded-[4px] text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg
                                                    ${studentCompleted
                                                        ? isMissed ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none border border-slate-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                                        : isUnlocked || hasStarted
                                                            ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/30'
                                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}
                                                >
                                                    {studentCompleted ? (isMissed ? 'Expired' : 'Completed') : (isUnlocked || hasStarted ? 'Resume Profile' : 'Start Test')}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Placeholder (per screenshot visuals) */}
            <div className="flex justify-between items-center px-2">
                <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Showing {filteredTests.length} tests
                </p>
                <div className="flex gap-2">
                    <button className={`p-2 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-white border-slate-200 text-slate-400 shadow-sm hover:bg-slate-50'}`}>
                        <ChevronLeft size={16} />
                    </button>
                    <button className={`p-2 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-white border-slate-200 text-slate-400 shadow-sm hover:bg-slate-50'}`}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            </motion.div>
            
            <StartExamModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleVerifyCode}
                test={selectedTest}
                isDarkMode={isDarkMode}
            />
        </AnimatePresence>
    );
};

export default Exams;
