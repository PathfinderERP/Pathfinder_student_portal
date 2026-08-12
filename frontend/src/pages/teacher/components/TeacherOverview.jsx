import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Clock, Calendar, BookOpen, Sparkles,
    Mail, Briefcase, MapPin, Star,
    CheckCircle, TrendingUp, RefreshCw, Zap
} from 'lucide-react';
import { LogIn as LoginIcon } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';


const formatTime12h = (timeStr) => {
    if (!timeStr || timeStr === '--:--') return null;
    const match = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return timeStr;
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
};

const formatRelative = (isoStr) => {
    if (!isoStr) return 'Never';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const getClassStatus = (cls) => {
    const now = new Date();
    const classDate = new Date(cls.date);
    const todayStr = now.toDateString();
    if (classDate.toDateString() !== todayStr) return classDate > now ? 'UPCOMING' : 'DONE';
    const startMatch = (cls.startTime || cls.start_time || '').match(/^(\d{1,2}):(\d{2})/);
    const endMatch = (cls.endTime || cls.end_time || '').match(/^(\d{1,2}):(\d{2})/);
    if (startMatch && endMatch) {
        const s = parseInt(startMatch[1]) * 60 + parseInt(startMatch[2]);
        const e = parseInt(endMatch[1]) * 60 + parseInt(endMatch[2]);
        const n = now.getHours() * 60 + now.getMinutes();
        if (n >= s && n <= e) return 'LIVE';
        if (n < s) return 'NEXT';
    }
    return 'TODAY';
};

const getTeacherCentre = (user, feedbacks = [], upcomingClasses = []) => {
    if (user?.centre_name) return user.centre_name;
    if (user?.centreName) return user.centreName;
    if (typeof user?.centre === 'string' && user.centre) return user.centre;
    if (typeof user?.centre === 'object' && user?.centre) {
        const val = user.centre.centreName || user.centre.name || user.centre.centre_name;
        if (val) return val;
    }

    if (Array.isArray(user?.centres) && user.centres.length > 0) {
        const first = user.centres[0];
        if (typeof first === 'string' && first.trim()) return first;
        if (typeof first === 'object' && first !== null) {
            const val = first.centreName || first.name || first.centre_name || first.centreCode || first.code;
            if (val) return val;
        }
    }

    if (user?.centre_code) return user.centre_code;

    for (const fb of feedbacks) {
        if (fb?.student_center) return fb.student_center;
        if (fb?.centre_code) return fb.centre_code;
    }

    for (const cls of upcomingClasses) {
        if (cls?.centreName) return cls.centreName;
        if (cls?.centre) return typeof cls.centre === 'string' ? cls.centre : cls.centre.name;
    }

    return 'HQ';
};

const TeacherOverview = ({ user }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [upcomingClasses, setUpcomingClasses] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [doubts, setDoubts] = useState([]);
    const [activityStats, setActivityStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);

    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);


    const fetchAllData = useCallback(async () => {
        if (!lastRefresh) {
            setLoading(true);
        }
        const tokenVal = token || localStorage.getItem('auth_token');
        const apiUrl = getApiUrl();
        const h = { 'Authorization': `Bearer ${tokenVal}` };
        try {
            const [cRes, fRes, dRes] = await Promise.allSettled([
                fetch(`${apiUrl}/api/teacher-portal/classes/`, { headers: h }),
                fetch(`${apiUrl}/api/class-feedback/`, { headers: h }),
                fetch(`${apiUrl}/api/doubts/`, { headers: h }),
            ]);
            if (cRes.status === 'fulfilled' && cRes.value.ok) {
                const d = await cRes.value.json();
                setUpcomingClasses(d.upcoming || []);
            }
            if (fRes.status === 'fulfilled' && fRes.value.ok) {
                const d = await fRes.value.json();
                setFeedbacks(Array.isArray(d) ? d : []);
            }
            if (dRes.status === 'fulfilled' && dRes.value.ok) {
                const d = await dRes.value.json();
                setDoubts(Array.isArray(d) ? d : []);
            }
            if (user?.username) {
                const sRes = await fetch(`${apiUrl}/api/admin/teacher-activity-summary/${user.username}/`, { headers: h });
                if (sRes.ok) setActivityStats(await sRes.json());
            }
        } catch (e) {
            console.error('[TeacherOverview]', e);
        } finally {
            setLoading(false);
            setLastRefresh(new Date());
        }
    }, [token, getApiUrl, user?.username, lastRefresh]);

    useEffect(() => {
        if (token || localStorage.getItem('auth_token')) fetchAllData();
    }, [fetchAllData]);

    // Memoized derived data to prevent unnecessary recalculations on page updates / clock ticks
    const avgRating = useMemo(() => {
        return feedbacks.length > 0
            ? (feedbacks.reduce((s, f) => s + (f.average_score || 0), 0) / feedbacks.length).toFixed(1)
            : null;
    }, [feedbacks]);

    const totalSessions = feedbacks.length;

    const uniqueSubjects = useMemo(() => {
        return [...new Set(feedbacks.map(f => f.subject).filter(Boolean))];
    }, [feedbacks]);

    const pendingDoubts = useMemo(() => {
        return doubts.filter(d => d.status === 'Assign').length;
    }, [doubts]);

    const resolvedDoubts = useMemo(() => {
        return doubts.filter(d => d.status === 'Resolved').length;
    }, [doubts]);

    const todayStr = useMemo(() => new Date().toDateString(), []);

    const todayClasses = useMemo(() => {
        return upcomingClasses.filter(c => c.date && new Date(c.date).toDateString() === todayStr);
    }, [upcomingClasses, todayStr]);

    const agendaClasses = useMemo(() => {
        return upcomingClasses.slice(0, 5);
    }, [upcomingClasses]);

    const subjectRatingArr = useMemo(() => {
        return Object.entries(
            feedbacks.reduce((acc, f) => {
                if (!f.subject) return acc;
                if (!acc[f.subject]) acc[f.subject] = { t: 0, n: 0 };
                acc[f.subject].t += f.average_score || 0;
                acc[f.subject].n++;
                return acc;
            }, {})
        ).map(([s, v]) => ({ subject: s, avg: v.t / v.n })).sort((a, b) => b.avg - a.avg);
    }, [feedbacks]);

    const teacherCentre = useMemo(() => {
        return getTeacherCentre(user, feedbacks, upcomingClasses);
    }, [user, feedbacks, upcomingClasses]);

    const T = useMemo(() => ({
        card: isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        sub: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        item: isDarkMode ? 'bg-[#1E293B]/20' : 'bg-slate-50'
    }), [isDarkMode]);

    const Sk = ({ h = 'h-14' }) => (
        <div className={`${h} rounded-[5px] animate-pulse ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
    );

    return (
        <div className="space-y-6 selection:bg-cyan-500/30 font-mono">
            {/* Hero */}
            <section className={`relative overflow-hidden rounded-[5px] ${isDarkMode ? 'bg-[#0F172A]' : 'bg-slate-900'} p-8 md:p-10 text-white border-l-4 border-cyan-500 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500`}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1 space-y-5">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-[2px] text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                                <Sparkles size={12} /> System Status: Operational
                            </div>
                            <button onClick={fetchAllData} disabled={loading} className="ml-auto flex items-center gap-1.5 text-[9px] font-bold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-widest">
                                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                                {lastRefresh ? `Synced ${formatRelative(lastRefresh.toISOString())}` : 'Refresh'}
                            </button>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                            Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'},<br />
                            <span className="text-cyan-500 underline decoration-2 underline-offset-8">{user?.first_name} {user?.last_name}</span>
                        </h2>
                        <p className="text-slate-400 max-w-lg text-xs font-medium leading-relaxed uppercase tracking-wider">
                            Welcome back, {user?.first_name || 'Teacher'}.{' '}
                            {teacherCentre ? `Centre: ${teacherCentre} · ` : ''}
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                        <div className="flex flex-wrap gap-8 pt-2">
                            <QStat v={loading ? '—' : `${todayClasses.length}`} l="Today" u="Classes" c="text-cyan-400" />
                            <QStat v={loading ? '—' : `${pendingDoubts}`} l="Pending" u="Doubts" c="text-amber-400" />
                            <QStat v={loading ? '—' : (avgRating ? `${avgRating}★` : 'N/A')} l="Avg" u="Rating" c="text-rose-400" />
                            <QStat v={loading ? '—' : `${totalSessions}`} l="Feedback" u="Sessions" c="text-indigo-400" />
                        </div>
                    </div>
                    <div className={`hidden lg:flex w-44 h-44 border-2 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-700 bg-slate-800/50'} items-center justify-center relative group rounded-[5px] flex-col gap-2`}>
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500" />
                        <span className="text-4xl font-black text-cyan-400">{loading ? '…' : (avgRating || '—')}</span>
                        <span className="text-[9px] uppercase tracking-[0.3em] text-slate-400">Avg Rating</span>
                        <span className="text-[8px] uppercase tracking-[0.2em] text-slate-500">{totalSessions} Reviews</span>
                    </div>
                </div>
            </section>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Schedule */}
                    <div className={`${T.card} rounded-[5px] border p-6 shadow-xl`}>
                        <div className={`flex items-center justify-between mb-6 border-b ${T.border} pb-4`}>
                            <h3 className={`text-sm font-bold ${T.text} uppercase tracking-[0.3em] flex items-center gap-2`}>
                                <Clock size={16} className="text-cyan-400" /> Upcoming Schedule
                            </h3>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${T.sub}`}>{upcomingClasses.length} sessions</span>
                        </div>
                        {loading ? <div className="space-y-2">{[1,2,3].map(i => <Sk key={i} />)}</div>
                        : agendaClasses.length === 0 ? (
                            <div className={`py-10 text-center ${T.sub} text-xs uppercase tracking-widest`}>No upcoming classes scheduled</div>
                        ) : (
                            <div className="space-y-2">
                                {agendaClasses.map((cls, i) => {
                                    const status = getClassStatus(cls);
                                    const time = formatTime12h(cls.startTime || cls.start_time) || '—';
                                    const dateLabel = new Date(cls.date).toDateString() === todayStr ? 'Today'
                                        : new Date(cls.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                    return <SchedItem key={cls.id || i} time={time} dateLabel={dateLabel} subject={cls.subject} batch={cls.batch} status={status} T={T} isDarkMode={isDarkMode} />;
                                })}
                            </div>
                        )}
                    </div>

                    {/* Analytics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Subject Ratings */}
                        <div className={`${T.card} rounded-[5px] border p-6 shadow-xl`}>
                            <h3 className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-5 ${T.sub}`}>Rating by Subject</h3>
                            {loading ? <Sk h="h-24" /> : subjectRatingArr.length === 0 ? (
                                <div className={`text-[10px] ${T.sub} text-center py-8 uppercase tracking-widest`}>No feedback yet</div>
                            ) : (
                                <div className="space-y-3">
                                    {subjectRatingArr.slice(0, 4).map(({ subject, avg }) => (
                                        <div key={subject}>
                                            <div className="flex justify-between mb-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider truncate max-w-[120px] ${T.text}`}>{subject}</span>
                                                <span className="text-[10px] font-black text-amber-400">{avg.toFixed(1)}</span>
                                            </div>
                                            <div className={`w-full h-1.5 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-all duration-700" style={{ width: `${(avg / 5) * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Doubt Stats */}
                        <div className={`${T.card} rounded-[5px] border p-6 shadow-xl space-y-4`}>
                            <h3 className={`text-[10px] font-bold uppercase tracking-[0.3em] ${T.sub}`}>Doubt Portal Stats</h3>
                            {loading ? <Sk h="h-24" /> : (
                                <>
                                    <div className="flex gap-4">
                                        <div className={`flex-1 p-3 rounded-[5px] border ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                                            <div className="text-2xl font-black text-amber-400">{pendingDoubts}</div>
                                            <div className="text-[8px] uppercase tracking-[0.2em] text-slate-500 mt-1">Pending</div>
                                        </div>
                                        <div className={`flex-1 p-3 rounded-[5px] border ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                                            <div className="text-2xl font-black text-emerald-400">{resolvedDoubts}</div>
                                            <div className="text-[8px] uppercase tracking-[0.2em] text-slate-500 mt-1">Resolved</div>
                                        </div>
                                    </div>
                                    {doubts.length > 0 && (
                                        <div className={`w-full h-1.5 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-700" style={{ width: `${(resolvedDoubts / doubts.length) * 100}%` }} />
                                        </div>
                                    )}
                                    <p className={`text-[9px] uppercase tracking-widest ${T.sub}`}>
                                        {doubts.length > 0 ? `${Math.round((resolvedDoubts / doubts.length) * 100)}% resolution rate` : 'No doubts assigned yet'}
                                    </p>
                                    {activityStats?.avgDoubtTime && activityStats.avgDoubtTime !== '-' && (
                                        <p className={`text-[9px] uppercase tracking-widest ${T.sub}`}>
                                            Avg resolve: <span className="text-cyan-400 font-bold">{activityStats.avgDoubtTime}</span>
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Profile */}
                    <div className={`${T.card} rounded-[5px] border p-6 shadow-2xl`}>
                        <div className="text-center space-y-5">
                            <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} w-20 h-20 border-2 mx-auto flex items-center justify-center font-black text-2xl text-cyan-400 rounded-[5px]`}>
                                {user?.first_name?.charAt(0) || 'T'}
                            </div>
                            <div>
                                <h3 className={`text-lg font-bold ${T.text} uppercase tracking-tighter`}>{user?.first_name} {user?.last_name}</h3>
                                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-cyan-500 mt-1">{user?.role_label || 'Teacher'}</p>
                            </div>
                            <div className={`w-full space-y-2 pt-4 border-t ${T.border}`}>
                                <PItem icon={<Mail size={12} />} l="ID" v={user?.employee_id || user?.username || 'N/A'} T={T} />
                                <PItem icon={<Briefcase size={12} />} l="Dept" v={user?.teacherDepartment || 'Academic'} T={T} />
                                <PItem icon={<MapPin size={12} />} l="Centre" v={teacherCentre} T={T} />
                                <PItem icon={<LoginIcon size={12} />} l="Logins" v={loading ? '…' : (activityStats?.loginCount ?? '—')} T={T} />
                                <PItem icon={<Clock size={12} />} l="Active" v={loading ? '…' : formatRelative(activityStats?.lastActive)} T={T} />
                            </div>
                        </div>
                    </div>

                    {/* Live Metrics */}
                    <div className={`${T.card} rounded-[5px] border p-6 shadow-xl space-y-4`}>
                        <h3 className={`text-[10px] font-bold ${T.text} uppercase tracking-[0.3em] flex items-center gap-2`}>
                            <Zap size={13} className="text-amber-400" /> Live Metrics
                        </h3>
                        {loading ? <div className="space-y-2">{[1,2,3].map(i => <Sk key={i} h="h-8" />)}</div> : (
                            <div className="space-y-3">
                                <MRow l="Class Rating" v={avgRating ? `${avgRating} / 5.0` : 'No data'} icon={<Star size={11} className="text-amber-400" />} T={T} />
                                <MRow l="Subjects" v={uniqueSubjects.length > 0 ? uniqueSubjects.slice(0,2).join(', ') + (uniqueSubjects.length > 2 ? ` +${uniqueSubjects.length-2}` : '') : 'None'} icon={<BookOpen size={11} className="text-indigo-400" />} T={T} />
                                <MRow l="Doubts Solved" v={`${resolvedDoubts} / ${doubts.length}`} icon={<CheckCircle size={11} className="text-emerald-400" />} T={T} />
                                <MRow l="Avg Entry" v={activityStats?.avgEntryDiff || 'No data'} icon={<TrendingUp size={11} className="text-cyan-400" />} T={T} />
                                <MRow l="Upcoming" v={`${upcomingClasses.length} classes`} icon={<Calendar size={11} className="text-violet-400" />} T={T} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="h-10" />
        </div>
    );
};

const QStat = React.memo(({ v, l, u, c }) => (
    <div className="flex flex-col">
        <span className={`text-2xl font-black leading-none ${c}`}>{v}</span>
        <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-500 mt-1">{l}</span>
        <span className="text-[7px] font-black uppercase text-slate-400">{u}</span>
    </div>
));

const SchedItem = React.memo(({ time, dateLabel, subject, batch, status, T, isDarkMode }) => {
    const isLive = status === 'LIVE';
    const isNext = status === 'NEXT' || status === 'TODAY';
    return (
        <div className={`p-4 border transition-all duration-200 rounded-[5px] ${isLive ? 'bg-cyan-500/5 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : `${T.item} ${T.border} hover:border-slate-400`}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="flex flex-col items-center shrink-0">
                        <span className={`text-[10px] font-bold ${isLive ? 'text-cyan-400' : 'text-slate-500'}`}>{time}</span>
                        <span className={`text-[8px] font-bold uppercase ${isLive ? 'text-cyan-600' : 'text-slate-400'}`}>{dateLabel}</span>
                    </div>
                    <div className={`h-8 w-[1px] ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <div className="min-w-0">
                        <h4 className={`text-xs font-bold uppercase tracking-widest truncate ${isLive ? T.text : 'text-slate-500'}`}>{subject}</h4>
                        <p className={`text-[8px] font-bold uppercase tracking-widest ${isLive ? 'text-cyan-600' : 'text-slate-400'}`}>{batch || '—'}</p>
                    </div>
                </div>
                <div className={`shrink-0 px-2 py-0.5 text-[8px] font-black tracking-[0.2em] border ${isLive ? 'text-cyan-400 border-cyan-500 animate-pulse' : isNext ? 'text-amber-400 border-amber-500/50' : status === 'DONE' ? 'text-slate-500 border-slate-600' : 'text-indigo-400 border-indigo-500/50'}`}>
                    {status}
                </div>
            </div>
        </div>
    );
});

const PItem = React.memo(({ icon, l, v, T }) => (
    <div className={`flex items-center justify-between gap-4 py-2 border-b ${T.border} last:border-0 font-mono`}>
        <div className="flex items-center gap-2">
            <span className="text-cyan-500">{icon}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{l}</span>
        </div>
        <span className={`text-xs font-bold ${T.text} truncate max-w-[150px] uppercase opacity-90`}>{v}</span>
    </div>
));

const MRow = React.memo(({ l, v, icon, T }) => (
    <div className={`flex items-center justify-between py-2.5 border-b ${T.border} last:border-0`}>
        <div className="flex items-center gap-2">{icon}<span className={`text-xs font-bold uppercase tracking-wider ${T.sub}`}>{l}</span></div>
        <span className={`text-xs font-black ${T.text} uppercase truncate max-w-[140px]`}>{v}</span>
    </div>
));

export default TeacherOverview;
