import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, TrendingUp, Award, Target, BarChart3, PieChart } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

// Helper functions defined outside component to avoid hoisting issues
const calculateStreak = (data) => {
    let currentStreak = 0;
    const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
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

const Attendance = ({ isDarkMode, cache, setCache }) => {
    const { getApiUrl, token } = useAuth();
    const [rawData, setRawData] = useState(cache?.loaded ? cache.data : null);
    const [loading, setLoading] = useState(!cache?.loaded);
    const [error, setError] = useState(null);
    const [timePeriod, setTimePeriod] = useState('all'); // 'all', '1month', '3months', '6months', '1year'
    const [viewMode, setViewMode] = useState('overview'); // 'overview', 'subject', 'monthly'

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
                console.log("Attendance updated from ERP");
                setRawData(data);
                if (setCache) {
                    setCache({ data: data, loaded: true });
                }
            }

            if (!isBackground) setLoading(false);

        } catch (err) {
            console.error('Attendance fetch error:', err);
            if (!isBackground) {
                setError(err.response?.data?.error || 'Failed to load attendance records');
            }
            if (!isBackground) setLoading(false);
        }
    }, [getApiUrl, token, cache, setCache, rawData]);

    useEffect(() => {
        if (!cache?.loaded) {
            fetchAttendance(false);
        } else {
            fetchAttendance(true);
        }
    }, [fetchAttendance, cache?.loaded]);

    // Process attendance data with time filtering
    const processedData = useMemo(() => {
        if (!Array.isArray(rawData)) return null;

        const now = new Date();
        const filterDate = {
            'all': new Date(0),
            '1month': new Date(now.setMonth(now.getMonth() - 1)),
            '3months': new Date(now.setMonth(now.getMonth() - 3)),
            '6months': new Date(now.setMonth(now.getMonth() - 6)),
            '1year': new Date(now.setFullYear(now.getFullYear() - 1))
        }[timePeriod];

        const filtered = rawData.filter(record => {
            const recordDate = new Date(record.date || record.classScheduleId?.date);
            return recordDate >= filterDate;
        });

        // Overall stats
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

            // Monthly tracking
            if (!monthMap[monthName]) {
                monthMap[monthName] = { month: monthName, present: 0, absent: 0, total: 0 };
            }
            if (isPresent) monthMap[monthName].present++;
            else monthMap[monthName].absent++;
            monthMap[monthName].total++;

            // Subject tracking
            if (!subjectMap[subjectName]) {
                subjectMap[subjectName] = { subject: subjectName, present: 0, absent: 0, total: 0 };
            }
            if (isPresent) subjectMap[subjectName].present++;
            else subjectMap[subjectName].absent++;
            subjectMap[subjectName].total++;

            // Weekday tracking
            if (weekdayMap[weekday] !== undefined) {
                weekdayMap[weekday]++;
            }

            // Daily attendance for graph
            dailyAttendance.push({
                date: date.toLocaleDateString(),
                status: isPresent ? 1 : 0,
                subject: subjectName
            });
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

        return {
            overall,
            present: presentCount,
            absent: absentCount,
            total,
            monthlyData,
            subjectData,
            weekdayMap,
            dailyAttendance,
            streak: calculateStreak(filtered),
            trend: calculateTrend(monthlyData)
        };
    }, [rawData, timePeriod]);



    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 animate-pulse">
                <Calendar size={48} className="text-indigo-500 mb-4" />
                <p className="font-black uppercase tracking-widest text-xs opacity-50">Fetching your records...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100'} flex items-center gap-4`}>
                <AlertCircle className="text-red-500" size={24} />
                <div>
                    <h3 className="text-sm font-black text-red-500 uppercase">Attention</h3>
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-red-200/60' : 'text-red-700/60'}`}>{error}</p>
                    <button
                        onClick={() => fetchAttendance(false)}
                        className={`mt-2 text-xs font-bold underline ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}
                    >
                        Retry Sync
                    </button>
                </div>
            </div>
        );
    }

    if (!processedData) {
        return (
            <div className={`p-20 rounded-[5px] border border-dashed text-center ${isDarkMode ? 'border-white/10 opacity-40' : 'border-slate-200 opacity-60'}`}>
                <Clock size={40} className="mx-auto mb-4 border-2 border-current rounded-full p-2" />
                <p className="text-xs font-black uppercase tracking-widest">No attendance data available</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up pb-10">
            {/* Header with Controls */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="px-3 py-1 rounded-[5px] bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                                    Performance Analytics
                                </div>
                                {processedData.trend !== 0 && (
                                    <div className={`px-3 py-1 rounded-[5px] flex items-center gap-1 text-[10px] font-black uppercase ${processedData.trend > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                        <TrendingUp size={12} className={processedData.trend < 0 ? 'rotate-180' : ''} />
                                        {Math.abs(processedData.trend)}%
                                    </div>
                                )}
                            </div>
                            <h2 className={`text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                Attendance Dashboard
                            </h2>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Comprehensive attendance tracking with insights and analytics
                            </p>
                        </div>

                        <button
                            onClick={() => fetchAttendance(false)}
                            disabled={loading}
                            className={`p-3 rounded-full transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            title="Sync now"
                        >
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>

                    {/* Time Period Filter */}
                    <div className="flex flex-wrap gap-2 mt-6">
                        {[
                            { value: 'all', label: 'All Time' },
                            { value: '1month', label: '1 Month' },
                            { value: '3months', label: '3 Months' },
                            { value: '6months', label: '6 Months' },
                            { value: '1year', label: '1 Year' }
                        ].map(period => (
                            <button
                                key={period.value}
                                onClick={() => setTimePeriod(period.value)}
                                className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${timePeriod === period.value
                                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                                    : isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex gap-2 mt-4">
                        {[
                            { value: 'overview', label: 'Overview', icon: PieChart },
                            { value: 'subject', label: 'By Subject', icon: BarChart3 },
                            { value: 'monthly', label: 'Monthly', icon: Calendar }
                        ].map(mode => {
                            const Icon = mode.icon;
                            return (
                                <button
                                    key={mode.value}
                                    onClick={() => setViewMode(mode.value)}
                                    className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === mode.value
                                        ? 'bg-indigo-500 text-white'
                                        : isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    <Icon size={14} />
                                    {mode.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <Calendar size={200} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12" />
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Overall Attendance"
                    value={`${processedData.overall}%`}
                    icon={Target}
                    color="from-purple-500 to-indigo-600"
                    isDark={isDarkMode}
                    subtitle={`${processedData.present}/${processedData.total} classes`}
                />
                <MetricCard
                    title="Present"
                    value={processedData.present}
                    icon={CheckCircle}
                    color="from-emerald-500 to-green-600"
                    isDark={isDarkMode}
                    subtitle="Classes attended"
                />
                <MetricCard
                    title="Absent"
                    value={processedData.absent}
                    icon={XCircle}
                    color="from-red-500 to-orange-600"
                    isDark={isDarkMode}
                    subtitle="Classes missed"
                />
                <MetricCard
                    title="Current Streak"
                    value={processedData.streak}
                    icon={Award}
                    color="from-orange-500 to-pink-600"
                    isDark={isDarkMode}
                    subtitle="Consecutive days"
                />
            </div>

            {/* Main Content Area - Changes based on view mode */}
            {viewMode === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Attendance Pie Chart */}
                    <div className={`lg:col-span-1 p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Distribution
                        </h3>
                        <div className="relative w-48 h-48 mx-auto">
                            <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                                    strokeWidth="20"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke="url(#gradient)"
                                    strokeWidth="20"
                                    strokeDasharray={`${processedData.overall * 2.51} 251`}
                                    strokeLinecap="round"
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#8b5cf6" />
                                        <stop offset="100%" stopColor="#ec4899" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {processedData.overall}%
                                </span>
                                <span className="text-xs font-bold opacity-60 uppercase">Overall</span>
                            </div>
                        </div>
                        <div className="mt-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-600"></div>
                                    <span className="text-xs font-bold">Present</span>
                                </div>
                                <span className="text-sm font-black">{processedData.present}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-orange-600"></div>
                                    <span className="text-xs font-bold">Absent</span>
                                </div>
                                <span className="text-sm font-black">{processedData.absent}</span>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Pattern */}
                    <div className={`lg:col-span-2 p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Weekly Pattern
                        </h3>
                        <div className="grid grid-cols-7 gap-2">
                            {Object.entries(processedData.weekdayMap).map(([day, count]) => {
                                const maxCount = Math.max(...Object.values(processedData.weekdayMap));
                                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                return (
                                    <div key={day} className="flex flex-col items-center gap-2">
                                        <div className="w-full h-32 relative flex items-end">
                                            <div
                                                className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg transition-all duration-500"
                                                style={{ height: `${height}%` }}
                                            >
                                                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 text-xs font-black">
                                                    {count}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase opacity-60">{day}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'subject' && (
                <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Subject-wise Attendance
                    </h3>
                    <div className="space-y-4">
                        {processedData.subjectData.map((subject, idx) => (
                            <div key={idx} className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {subject.subject}
                                    </h4>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-bold opacity-60">
                                            {subject.present}/{subject.total}
                                        </span>
                                        <span className={`text-xs font-black px-3 py-1 rounded-[5px] ${subject.percentage >= 90 ? 'bg-emerald-500/10 text-emerald-500' :
                                            subject.percentage >= 75 ? 'bg-orange-500/10 text-orange-500' :
                                                'bg-red-500/10 text-red-500'
                                            }`}>
                                            {subject.percentage}%
                                        </span>
                                    </div>
                                </div>
                                <div className={`h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-200'}`}>
                                    <div
                                        className={`h-full transition-all duration-700 ${subject.percentage >= 90 ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
                                            subject.percentage >= 75 ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                                                'bg-gradient-to-r from-red-500 to-orange-600'
                                            }`}
                                        style={{ width: `${subject.percentage}%` }}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={14} className="text-emerald-500" />
                                        <span className={`font-bold ${isDarkMode ? 'text-white/70' : 'text-slate-700'}`}>
                                            Present: {subject.present}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <XCircle size={14} className="text-red-500" />
                                        <span className={`font-bold ${isDarkMode ? 'text-white/70' : 'text-slate-700'}`}>
                                            Absent: {subject.absent}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewMode === 'monthly' && (
                <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Monthly Breakdown
                    </h3>
                    <div className="space-y-4">
                        {processedData.monthlyData.map((month, idx) => (
                            <div key={idx} className={`p-5 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {month.month}
                                    </h4>
                                    <span className={`text-sm font-black px-4 py-1.5 rounded-[5px] ${month.percentage >= 90 ? 'bg-emerald-500/10 text-emerald-500' :
                                        month.percentage >= 75 ? 'bg-orange-500/10 text-orange-500' :
                                            'bg-red-500/10 text-red-500'
                                        }`}>
                                        {month.percentage}%
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Total</p>
                                        <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{month.total}</p>
                                    </div>
                                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50 border border-emerald-100'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Present</p>
                                        <p className="text-2xl font-black text-emerald-600">{month.present}</p>
                                    </div>
                                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50 border border-red-100'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Absent</p>
                                        <p className="text-2xl font-black text-red-600">{month.absent}</p>
                                    </div>
                                </div>
                                <div className={`h-4 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-200'}`}>
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 transition-all duration-700"
                                        style={{ width: `${month.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const MetricCard = React.memo(({ title, value, icon: Icon, color, isDark, subtitle }) => {
    return (
        <div className={`p-6 rounded-[5px] border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                    <Icon size={28} className="text-white" strokeWidth={2.5} />
                </div>
            </div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-white/60' : 'text-slate-900/60'}`}>
                {title}
            </p>
            <p className={`text-4xl font-black mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {value}
            </p>
            {subtitle && (
                <p className="text-xs font-medium opacity-60">{subtitle}</p>
            )}
        </div>
    );
});

export default Attendance;
