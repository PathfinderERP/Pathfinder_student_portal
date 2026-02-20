import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, TrendingUp, Award, Target, BarChart3, PieChart } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Helper functions defined outside component to avoid hoisting issues
const calculateStreak = (data) => {
    let currentStreak = 0;
    const sorted = [...data].sort((a, b) => new Date(b.date || b.classScheduleId?.date) - new Date(a.date || a.classScheduleId?.date));
    for (let record of sorted) {
        if (record.status === 'Present') currentStreak++;
        else break;
    }
    return currentStreak;
};

const calculateTrend = (monthlyData) => {
    if (monthlyData.length < 2) return 0;
    const recent = monthlyData.slice(-2);
    return recent[1].percentage - recent[0].percentage;
};

const AttendanceAreaChart = ({ data, isDarkMode }) => {
    if (!data || data.length < 2) return null;

    const width = 1000;
    const height = 300;
    const padding = 40;

    const maxValue = 100;
    const points = data.map((d, i) => ({
        x: padding + (i * (width - 2 * padding)) / (data.length - 1),
        y: height - padding - (d.percentage * (height - 2 * padding)) / maxValue,
        percentage: d.percentage,
        month: d.month
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
        <div className="relative w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 25, 50, 75, 100].map((val) => {
                    const y = height - padding - (val * (height - 2 * padding)) / maxValue;
                    return (
                        <g key={val}>
                            <line
                                x1={padding}
                                y1={y}
                                x2={width - padding}
                                y2={y}
                                stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                                strokeDasharray="4 4"
                            />
                            <text
                                x={padding - 10}
                                y={y + 4}
                                textAnchor="end"
                                className={`text-[10px] font-bold ${isDarkMode ? 'fill-slate-500' : 'fill-slate-400'}`}
                            >
                                {val}%
                            </text>
                        </g>
                    );
                })}

                {/* Area */}
                <motion.path
                    d={areaPath}
                    fill="url(#areaGradient)"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />

                {/* Line */}
                <motion.path
                    d={linePath}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                />

                {/* Points */}
                {points.map((p, i) => (
                    <g key={i} className="group cursor-pointer">
                        <motion.circle
                            cx={p.x}
                            cy={p.y}
                            r="6"
                            className="fill-white stroke-indigo-500 stroke-[3px]"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.1 + 0.5 }}
                            whileHover={{ scale: 1.5 }}
                        />
                        <text
                            x={p.x}
                            y={height - padding + 20}
                            textAnchor="middle"
                            className={`text-[10px] font-black uppercase ${isDarkMode ? 'fill-slate-400' : 'fill-slate-500'}`}
                        >
                            {p.month.split(' ')[0].substring(0, 3)}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

const Attendance = ({ isDarkMode, cache, setCache }) => {
    const { getApiUrl, token } = useAuth();
    const [rawData, setRawData] = useState(cache?.loaded ? cache.data : null);
    const [loading, setLoading] = useState(!cache?.loaded);
    const [error, setError] = useState(null);
    const [timePeriod, setTimePeriod] = useState('all');
    const [viewMode, setViewMode] = useState('overview');

    const fetchAttendance = useCallback(async (isBackground = false) => {
        if (!token) return;
        try {
            if (!isBackground) setLoading(true);
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/student/attendance/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = response.data;
            const prevData = cache?.loaded ? cache.data : rawData;
            if (JSON.stringify(data) !== JSON.stringify(prevData)) {
                setRawData(data);
                if (setCache) setCache({ data: data, loaded: true });
            }
            if (!isBackground) setLoading(false);
        } catch (err) {
            console.error('Attendance fetch error:', err);
            if (!isBackground) setError(err.response?.data?.error || 'Failed to load attendance records');
            if (!isBackground) setLoading(false);
        }
    }, [getApiUrl, token, cache, setCache, rawData]);

    useEffect(() => {
        if (!cache?.loaded) fetchAttendance(false);
        else fetchAttendance(true);
    }, [fetchAttendance, cache?.loaded]);

    const processedData = useMemo(() => {
        if (!Array.isArray(rawData)) return null;
        const now = new Date();
        const filterDate = {
            'all': new Date(0),
            '1month': new Date(new Date().setMonth(now.getMonth() - 1)),
            '3months': new Date(new Date().setMonth(now.getMonth() - 3)),
            '6months': new Date(new Date().setMonth(now.getMonth() - 6)),
            '1year': new Date(new Date().setFullYear(now.getFullYear() - 1))
        }[timePeriod];

        const filtered = rawData.filter(record => {
            const recordDate = new Date(record.date || record.classScheduleId?.date);
            return recordDate >= filterDate;
        });

        let presentCount = 0;
        let absentCount = 0;
        const monthMap = {};
        const subjectMap = {};
        const weekdayMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        const dailyAttendance = [];

        filtered.forEach(record => {
            const isPresent = record.status === 'Present';
            if (isPresent) presentCount++;
            else absentCount++;
            const date = new Date(record.date || record.classScheduleId?.date);
            const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            const weekday = date.toLocaleString('default', { weekday: 'short' });
            const subjectName = record.classScheduleId?.subjectId?.subjectName || 'Unknown';

            if (!monthMap[monthName]) monthMap[monthName] = { month: monthName, present: 0, absent: 0, total: 0 };
            if (isPresent) monthMap[monthName].present++;
            else monthMap[monthName].absent++;
            monthMap[monthName].total++;

            if (!subjectMap[subjectName]) subjectMap[subjectName] = { subject: subjectName, present: 0, absent: 0, total: 0 };
            if (isPresent) subjectMap[subjectName].present++;
            else subjectMap[subjectName].absent++;
            subjectMap[subjectName].total++;

            if (weekdayMap[weekday] !== undefined) weekdayMap[weekday]++;
            dailyAttendance.push({ date: date.toLocaleDateString(), status: isPresent ? 1 : 0, subject: subjectName });
        });

        const total = presentCount + absentCount;
        const overall = total > 0 ? Math.round((presentCount / total) * 100) : 0;
        const monthlyData = Object.values(monthMap).map(m => ({
            ...m,
            percentage: m.total > 0 ? Math.round((m.present / m.total) * 100) : 0
        })).sort((a, b) => new Date(a.month) - new Date(b.month));
        const subjectData = Object.values(subjectMap).map(s => ({
            ...s,
            percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
        })).sort((a, b) => b.percentage - a.percentage);

        return { overall, present: presentCount, absent: absentCount, total, monthlyData, subjectData, weekdayMap, dailyAttendance, streak: calculateStreak(filtered), trend: calculateTrend(monthlyData) };
    }, [rawData, timePeriod]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <RefreshCw size={48} className="text-indigo-500 mb-4" />
            </motion.div>
            <p className="font-black uppercase tracking-widest text-[10px] opacity-50">Syncing Attendance Records...</p>
        </div>
    );

    if (error) return (
        <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100'} flex items-center gap-4`}>
            <AlertCircle className="text-red-500" size={24} />
            <div>
                <h3 className="text-sm font-black text-red-500 uppercase tracking-tighter">Sync Failed</h3>
                <p className={`text-xs font-medium ${isDarkMode ? 'text-red-200/60' : 'text-red-700/60'}`}>{error}</p>
                <button onClick={() => fetchAttendance(false)} className="mt-2 text-[10px] font-black uppercase underline text-red-500">Try Again</button>
            </div>
        </div>
    );

    if (!processedData) return (
        <div className={`p-20 rounded-[5px] border border-dashed text-center ${isDarkMode ? 'border-white/10 opacity-40' : 'border-slate-200 opacity-60'}`}>
            <Clock size={40} className="mx-auto mb-4 border-2 border-current rounded-full p-2" />
            <p className="text-xs font-black uppercase tracking-widest">No attendance data discovered</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* New Stylish Header */}
            <div className={`p-10 rounded-2xl border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl shadow-black/50' : 'bg-white border-slate-100 shadow-xl'}`}>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/20">
                                Student Intelligence
                            </span>
                            {processedData.trend !== 0 && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase border ${processedData.trend > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                    <TrendingUp size={12} className={processedData.trend < 0 ? 'rotate-180' : ''} />
                                    {Math.abs(processedData.trend)}% Momentum
                                </motion.div>
                            )}
                        </div>
                        <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            Attendance <span className="text-indigo-600">Analytics</span>
                        </h1>
                        <p className={`text-sm md:text-base font-medium max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Visualizing your academic consistency through advanced data analysis. Keep your streak alive to unlock performance badges.
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className={`p-6 rounded-2xl border text-center min-w-[160px] ${isDarkMode ? 'bg-white/5 border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'}`}>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">Current Sync</p>
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>LIVE ERP</span>
                            </div>
                        </div>
                        <button
                            onClick={() => fetchAttendance(false)}
                            disabled={loading}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl'}`}
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                            Refresh Records
                        </button>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Consistency Score"
                    value={`${processedData.overall}%`}
                    icon={Target}
                    color="from-indigo-600 to-blue-700"
                    isDark={isDarkMode}
                    subtitle={`${processedData.present} Classes Captured`}
                />
                <MetricCard
                    title="Present Days"
                    value={processedData.present}
                    icon={CheckCircle}
                    color="from-emerald-500 to-teal-700"
                    isDark={isDarkMode}
                    subtitle="Validated Presence"
                />
                <MetricCard
                    title="Absent Days"
                    value={processedData.absent}
                    icon={XCircle}
                    color="from-rose-500 to-red-700"
                    isDark={isDarkMode}
                    subtitle="Missed Opportunities"
                />
                <MetricCard
                    title="Current Streak"
                    value={processedData.streak}
                    icon={Award}
                    color="from-amber-500 to-orange-700"
                    isDark={isDarkMode}
                    subtitle="Consecutive Days"
                />
            </div>

            {/* Area Chart Section - THE MAIN UPGRADE */}
            <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Attendance Trajectory
                        </h3>
                        <p className={`text-xs font-bold opacity-40 uppercase tracking-widest`}>Monthly Growth Patterns</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {['all', '3months', '6months', '1year'].map(p => (
                            <button
                                key={p}
                                onClick={() => setTimePeriod(p)}
                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${timePeriod === p
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {p === 'all' ? 'FULL DATA' : p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <AttendanceAreaChart data={processedData.monthlyData} isDarkMode={isDarkMode} />
            </div>

            {/* Bottom Row: Breakdown and Subject Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Modern Distribution Circle */}
                <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-10 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Volume Metric
                    </h3>
                    <div className="relative w-56 h-56 mx-auto">
                        <svg viewBox="0 0 100 100" className="transform -rotate-90 drop-shadow-2xl">
                            <circle cx="50" cy="50" r="42" fill="none" stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'} strokeWidth="12" />
                            <motion.circle
                                cx="50" cy="50" r="42" fill="none" stroke="url(#circleGradient)" strokeWidth="12"
                                strokeDasharray="264"
                                initial={{ strokeDashoffset: 264 }}
                                animate={{ strokeDashoffset: 264 - (processedData.overall * 2.64) }}
                                transition={{ duration: 2, ease: "easeOut" }}
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{processedData.overall}%</span>
                            <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Score</span>
                        </div>
                    </div>
                </div>

                {/* Subject Wise Cards */}
                <div className={`lg:col-span-2 p-8 rounded-2xl border ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}>
                    <div className="flex items-center justify-between mb-8">
                        <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Subject Efficiency
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {processedData.subjectData.slice(0, 4).map((subject, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`text-xs font-black max-w-[120px] truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{subject.subject}</span>
                                    <span className={`text-xs font-black ${subject.percentage >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>{subject.percentage}%</span>
                                </div>
                                <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full bg-gradient-to-r ${subject.percentage >= 75 ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-500'}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${subject.percentage}%` }}
                                        transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = React.memo(({ title, value, icon: Icon, color, isDark, subtitle }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className={`p-8 rounded-2xl border transition-all ${isDark ? 'bg-[#10141D]/50 border-white/5 shadow-2xl backdrop-blur-3xl' : 'bg-white border-slate-100 shadow-lg'}`}>
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg mb-6`}>
            <Icon size={24} className="text-white" strokeWidth={2.5} />
        </div>
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{title}</p>
        <p className={`text-4xl font-black mb-2 tracking-tighter ${isDark ? 'text-white' : 'text-slate-950'}`}>{value}</p>
        {subtitle && <p className="text-[10px] font-black uppercase opacity-30 tracking-widest">{subtitle}</p>}
    </motion.div>
));

export default Attendance;

