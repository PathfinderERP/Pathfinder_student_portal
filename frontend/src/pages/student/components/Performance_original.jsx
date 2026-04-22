import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Award, Target, BarChart2, Loader2, Calendar, Zap, AlertCircle, Clock, CheckCircle, ArrowUpRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, RadialBarChart, RadialBar,
    RadarChart, PolarGrid, PolarAngleAxis, Radar, ReferenceLine
} from 'recharts';

const Performance = ({ isDarkMode }) => {
    const { token, getApiUrl } = useAuth();
    const [results, setResults] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            const apiUrl = getApiUrl();
            const [resultsRes, attendanceRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/my_results/`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${apiUrl}/api/student/attendance/`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setResults(resultsRes.data || []);
            setAttendance(attendanceRes.data || []);
        } catch (err) {
            console.error("Error fetching performance data:", err);
            setError("Failed to load performance metrics. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    const stats = useMemo(() => {
        if (!results.length) return { average: 0, rank: '—', percentile: 0, improvement: '0%', attendanceRate: 0, totalTests: 0 };

        const validResults = results.filter(r => !r.isMissed);
        const totalScore = validResults.reduce((acc, r) => acc + ((r.marks / (r.total || 1)) * 100), 0);
        const avg = validResults.length ? (totalScore / validResults.length).toFixed(1) : 0;

        const latest = results[0] || {};

        let imp = 0;
        if (validResults.length >= 2) {
            const lastPct = (validResults[0].marks / (validResults[0].total || 1)) * 100;
            const prevPct = (validResults[1].marks / (validResults[1].total || 1)) * 100;
            imp = (lastPct - prevPct).toFixed(1);
        }

        const gradedAttendance = attendance.filter(r => (r.attendanceStatus || r.status) === 'Present' || (r.attendanceStatus || r.status) === 'Absent');
        const presentCount = gradedAttendance.filter(r => (r.attendanceStatus || r.status) === 'Present').length;
        const attRate = gradedAttendance.length ? Math.round((presentCount / gradedAttendance.length) * 100) : 0;

        return {
            average: avg,
            rank: latest.rank || '—',
            percentile: latest.percentile ? latest.percentile.toFixed(1) : 0,
            improvement: imp,
            attendanceRate: attRate,
            totalTests: validResults.length
        };
    }, [results, attendance]);

    const trajectoryData = useMemo(() => {
        const data = [...results]
            .filter(r => !r.isMissed)
            .reverse()
            .map(r => ({
                date: new Date(r.date || r.end_time).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                score: parseFloat(((r.marks / (r.total || 1)) * 100).toFixed(1)),
                percentile: r.percentile || 0
            }))
            .slice(-10);

        // If only one data point, add a baseline at 0 to show a "line"
        if (data.length === 1) {
            return [{ date: 'Start', score: 0, percentile: 0 }, ...data];
        }
        return data;
    }, [results]);

    const subjects = useMemo(() => {
        const subjectMap = {};
        const sortedResults = [...results].sort((a, b) => new Date(b.date || b.end_time) - new Date(a.date || a.end_time));

        sortedResults.filter(r => !r.isMissed).forEach(r => {
            const sName = r.subject_details?.name || r.subject_name || 'General';
            if (!subjectMap[sName]) {
                subjectMap[sName] = { scores: [], totalMarks: 0, possibleMarks: 0 };
            }
            const pct = (r.marks / (r.total || 1)) * 100;
            subjectMap[sName].scores.push(pct);
            subjectMap[sName].totalMarks += r.marks;
            subjectMap[sName].possibleMarks += r.total;
        });

        const subjectList = Object.keys(subjectMap).map(sName => {
            const data = subjectMap[sName];
            const avgScore = (data.totalMarks / (data.possibleMarks || 1)) * 100;
            const recent = data.scores[0] || 0;
            const prev = data.scores[1] || recent;
            const trend = (recent - prev).toFixed(1);

            const colors = ['blue', 'purple', 'emerald', 'orange', 'rose', 'cyan'];
            const colorIdx = sName.length % colors.length;

            return {
                name: sName,
                score: Math.round(avgScore),
                displayScore: Math.max(1, Math.round(avgScore)), // For Pie/Radar rendering
                recent: Math.round(recent),
                trend: parseFloat(trend),
                color: colors[colorIdx],
                count: data.scores.length
            };
        }).sort((a, b) => b.score - a.score);

        // Ensure at least 3 points for Radar Chart by adding standard dimensions
        if (subjectList.length > 0 && subjectList.length < 3) {
            const placeholders = [
                { name: 'Presence', score: stats.attendanceRate, displayScore: Math.max(1, stats.attendanceRate), color: 'emerald', isStatic: true },
                { name: 'Momentum', score: Math.abs(stats.improvement * 10), displayScore: Math.max(1, Math.abs(stats.improvement * 10)), color: 'indigo', isStatic: true }
            ];
            return [...subjectList, ...placeholders.slice(0, 3 - subjectList.length)];
        }

        return subjectList;
    }, [results, stats]);

    const insights = useMemo(() => {
        if (!subjects.length) return null;
        const top = subjects[0];
        const low = subjects[subjects.length - 1];

        return {
            strongest: top,
            improvementArea: low.score < 80 ? low : null,
            consistency: stats.improvement >= 0 ? 'Positive' : 'Focus Needed'
        };
    }, [subjects, stats]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px]">
                <div className="relative">
                    <Loader2 className="animate-spin text-blue-500" size={64} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <TrendingUp size={24} className="text-blue-400" />
                    </div>
                </div>
                <p className="mt-6 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Syncing Advanced Analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`p-10 rounded-2xl border flex flex-col items-center text-center ${isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100'}`}>
                <AlertCircle className="text-red-500 mb-4" size={48} />
                <h3 className="text-lg font-black text-red-500 uppercase tracking-tight mb-2">Analysis Failed</h3>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-red-200/60' : 'text-red-700/60'} max-w-md`}>{error}</p>
                <button onClick={fetchData} className="mt-6 px-8 py-3 bg-red-500 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/20">
                    Retry Synchronization
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            {/* Header / Hero Section */}
            <div className={`p-10 rounded-2xl border relative overflow-hidden transition-all duration-700 ${isDarkMode ? 'bg-[#0f172a] border-white/5 shadow-2xl shadow-black/50' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="max-w-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.25em] border border-indigo-500/20">
                                Performance Intelligence
                            </div>
                            {stats.improvement !== 0 && (
                                <div className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase border ${stats.improvement > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                    <TrendingUp size={12} className={stats.improvement < 0 ? 'rotate-180' : ''} />
                                    {Math.abs(stats.improvement)}% Pace
                                </div>
                            )}
                        </div>
                        <h2 className={`text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Academic <span className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">Performance</span>
                        </h2>
                        <p className={`text-base font-medium max-w-lg leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Your comprehensive academic data hub. We've aggregated <span className="font-bold text-blue-500">{stats.totalTests} assessments</span> to visualize your current mastery and growth.
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className={`p-8 rounded-2xl border text-center min-w-[200px] group transition-all duration-500 hover:scale-[1.05] ${isDarkMode ? 'bg-white/[0.03] border-white/10 backdrop-blur-3xl' : 'bg-slate-50 border-slate-200 shadow-lg'}`}>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-2">Overall Mastery</p>
                            <div className="text-5xl font-black tracking-tighter text-blue-500 mb-1">{stats.average}%</div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aggregate Score</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <EnhancedStatCard
                    title="Class Position"
                    value={stats.rank === '—' ? '—' : `#${stats.rank}`}
                    subtitle="Institutional Standing"
                    icon={Award} color="emerald" isDark={isDarkMode} trend={stats.improvement}
                />
                <EnhancedStatCard
                    title="Student Percentile"
                    value={`${stats.percentile}th`}
                    subtitle="Relative Performance"
                    icon={Target} color="indigo" isDark={isDarkMode}
                />
                <EnhancedStatCard
                    title="Presence Ratio"
                    value={`${stats.attendanceRate}%`}
                    subtitle="Academic Consistency"
                    icon={Calendar} color="amber" isDark={isDarkMode}
                />
                <EnhancedStatCard
                    title="Current Momentum"
                    value={stats.improvement > 0 ? `+${stats.improvement}%` : `${stats.improvement}%`}
                    subtitle="Recent Score Delta"
                    icon={TrendingUp} color="rose" isDark={isDarkMode}
                />
            </div>

            {/* Growth Chart & Insights Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Trajectory Chart */}
                <div className={`xl:col-span-2 p-8 rounded-2xl border ${isDarkMode ? 'bg-[#0f172a] border-white/5 shadow-2xl' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/40'}`}>
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Academic Growth</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Historical Test Performance</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                            <Clock size={12} className="text-blue-500" />
                            <span className="text-[10px] font-black text-blue-500 uppercase">Last 10 Assessments</span>
                        </div>
                    </div>

                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 9, fontWeight: 800, fill: isDarkMode ? '#64748b' : '#94a3b8' }}
                                    padding={{ left: 20, right: 20 }}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: isDarkMode ? '#64748b' : '#94a3b8' }} />
                                <Tooltip
                                    content={<CustomTooltip isDarkMode={isDarkMode} />}
                                    cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                                />
                                <ReferenceLine y={0} stroke={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} strokeWidth={1} />
                                <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#3b82f6"
                                    strokeWidth={5}
                                    fillOpacity={1}
                                    fill="url(#colorScore)"
                                    animationDuration={2000}
                                    dot={{ r: 5, strokeWidth: 2, stroke: '#3b82f6', fill: isDarkMode ? '#0f172a' : '#fff' }}
                                    activeDot={{ r: 7, strokeWidth: 0, fill: '#3b82f6' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Insights Panel */}
                <div className={`p-8 rounded-2xl border flex flex-col justify-between ${isDarkMode ? 'bg-[#0f172a] border-white/5 shadow-2xl' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/40'}`}>
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/10">
                                <Zap size={20} strokeWidth={2.5} />
                            </div>
                            <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Insights</h3>
                        </div>

                        <div className="space-y-6">
                            {insights?.strongest && (
                                <InsightRow
                                    icon={CheckCircle}
                                    title="Dominant Subject"
                                    text={`Exhibiting mastery in ${insights.strongest.name} with ${insights.strongest.score}% aggregate.`}
                                    color="emerald"
                                    isDark={isDarkMode}
                                />
                            )}
                            {insights?.improvementArea && (
                                <InsightRow
                                    icon={Target}
                                    title="Opportunity Zone"
                                    text={`Score stabilization needed in ${insights.improvementArea.name} for competitive percentile growth.`}
                                    color="orange"
                                    isDark={isDarkMode}
                                />
                            )}
                            <InsightRow
                                icon={TrendingUp}
                                title="Growth Momentum"
                                text={stats.improvement >= 0 ? "Consistently positive score trajectory. Projecting higher rank outcomes." : "Recent results show minor fluctuation. Review last 3 test solutions."}
                                color={stats.improvement >= 0 ? "blue" : "rose"}
                                isDark={isDarkMode}
                            />
                        </div>
                    </div>

                    <button className={`mt-10 w-full py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                        View Comparison Metrics
                    </button>
                </div>
            </div>

            {/* Deep Analytics: Radar & Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/40'}`}>
                    <h3 className={`text-lg font-black uppercase tracking-tight mb-8 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Subject Radar</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjects}>
                                <PolarGrid stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 800, fill: isDarkMode ? '#fff' : '#64748b' }} />
                                <Radar
                                    name="Score"
                                    dataKey="displayScore"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fill="#3b82f6"
                                    fillOpacity={0.3}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/40'}`}>
                    <h3 className={`text-lg font-black uppercase tracking-tight mb-8 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Score Distribution</h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={subjects}
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="displayScore"
                                >
                                    {subjects.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4'][index % 6]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Subject-wise Cards Grid */}
            <div>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Subject Mastery</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Individual Component Analysis</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.length === 0 ? (
                        <div className="col-span-full py-20 text-center rounded-2xl border border-dashed border-slate-300 dark:border-white/10 opacity-30">
                            <BarChart2 size={40} className="mx-auto mb-4" />
                            <p className="font-black uppercase tracking-widest text-xs">No subject performance data indexed</p>
                        </div>
                    ) : (
                        subjects.filter(s => !s.isStatic).map((subject, idx) => (
                            <SubjectCard key={idx} subject={subject} idx={idx} isDark={isDarkMode} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const EnhancedStatCard = ({ title, value, subtitle, icon: Icon, color, isDark, trend }) => {
    const colorMap = {
        emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/20 text-emerald-500',
        indigo: 'from-indigo-500 to-blue-600 shadow-indigo-500/20 text-indigo-500',
        amber: 'from-amber-500 to-orange-600 shadow-amber-500/20 text-amber-500',
        rose: 'from-rose-500 to-pink-600 shadow-rose-500/20 text-rose-500',
        blue: 'from-blue-500 to-indigo-600 shadow-blue-500/20 text-blue-500',
    };

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={`p-6 rounded-2xl border flex flex-col group transition-all duration-300 ${isDark ? 'bg-[#0f172a] border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-lg'}`}
        >
            <div className="flex items-center justify-between mb-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color].split(' ').slice(0, 2).join(' ')} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                    <Icon size={24} className="text-white" strokeWidth={2.5} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-[10px] font-black ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        <TrendingUp size={10} className={trend < 0 ? 'rotate-180' : ''} />
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 opacity-40 ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</p>
            <p className={`text-3xl font-black tracking-tighter mb-1 ${isDark ? 'text-white' : 'text-slate-950'}`}>{value}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{subtitle}</p>
        </motion.div>
    );
};

const SubjectCard = ({ subject, idx, isDark }) => {
    const colorMap = {
        blue: 'from-blue-500 to-indigo-600 text-blue-500',
        purple: 'from-purple-500 to-fuchsia-600 text-purple-500',
        emerald: 'from-emerald-500 to-teal-600 text-emerald-500',
        orange: 'from-orange-500 to-amber-600 text-orange-500',
        rose: 'from-rose-500 to-pink-600 text-rose-500',
        cyan: 'from-cyan-500 to-blue-600 text-cyan-500',
    };

    const gradient = colorMap[subject.color].split(' ').slice(0, 2).join(' ');

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -8 }}
            className={`p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${isDark ? 'bg-[#0f172a] border-white/5 shadow-2xl hover:bg-white/[0.04]' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl'}`}
        >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-[0.03] blur-3xl`} />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                        <span className="text-white font-black text-lg">{subject.name[0]}</span>
                    </div>
                    <div>
                        <h4 className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{subject.name}</h4>
                        <p className={`text-[9px] font-black uppercase tracking-widest opacity-40 ${isDark ? 'text-white' : 'text-slate-950'}`}>{subject.count} Assessments</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-950'}`}>{subject.score}%</div>
                    {subject.trend !== 0 && (
                        <div className={`flex items-center justify-end gap-1 text-[8px] font-black uppercase tracking-widest ${subject.trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {subject.trend > 0 ? <TrendingUp size={10} /> : <TrendingUp size={10} className="rotate-180" />}
                            {Math.abs(subject.trend)}% Pivot
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>Performance Health</span>
                    <span className={isDark ? 'text-white/40' : 'text-slate-400'}>{subject.score}%</span>
                </div>
                {/* Progress Bar Container */}
                <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100 shadow-inner'}`}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${subject.score}%` }}
                        transition={{ duration: 1.5, delay: 0.5 + idx * 0.1 }}
                        className={`h-full rounded-full bg-gradient-to-r ${gradient} shadow-lg`}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Most Recent</p>
                        <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>{subject.recent}%</p>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Target</p>
                        <p className={`text-sm font-black text-indigo-500`}>{Math.min(100, subject.score + 5)}%</p>
                    </div>
                </div>
            </div>

            <button className={`mt-8 w-full flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] opacity-30 group-hover:opacity-100 group-hover:text-blue-500 transition-all duration-500 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Subject Deep-Dive <ArrowUpRight size={14} />
            </button>
        </motion.div>
    );
};

const InsightRow = ({ icon: Icon, title, text, color, isDark }) => {
    const colorClasses = {
        emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10',
        orange: 'bg-orange-500/10 text-orange-500 border-orange-500/10',
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/10',
        rose: 'bg-rose-500/10 text-rose-500 border-rose-500/10'
    };

    return (
        <div className={`flex gap-4 p-4 rounded-2xl border border-transparent transition-all duration-300 hover:border-slate-200 dark:hover:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]`}>
            <div className={`shrink-0 w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center border shadow-sm`}>
                <Icon size={18} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col gap-0.5">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</p>
                <p className={`text-xs font-bold leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{text}</p>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, isDarkMode }) => {
    if (active && payload && payload.length) {
        return (
            <div className={`p-4 rounded-xl border shadow-2xl backdrop-blur-xl ${isDarkMode ? 'bg-[#1e293b]/90 border-white/10' : 'bg-white/90 border-slate-200'}`}>
                <p className={`text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2`}>{payload[0].payload.date}</p>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>Score: {payload[0].value}%</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className={`text-[10px] font-bold text-slate-500`}>Percentile: {payload[0].payload.percentile}th</span>
                </div>
            </div>
        );
    }
    return null;
};

export default Performance;
