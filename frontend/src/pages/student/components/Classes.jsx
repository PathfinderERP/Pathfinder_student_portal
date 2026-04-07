import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, MapPin, User, Video, AlertCircle, BookOpen, RefreshCw, X, FileText, Info, Hash, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart as RechartsAreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Mock data generator for classes when ERP returns empty
const getMockClasses = () => {
    const subjects = [
        { name: 'Advanced Mathematics', teacher: 'Dr. Sarah Wilson', mode: 'Online' },
        { name: 'Quantum Physics', teacher: 'Prof. James Miller', mode: 'Offline' },
        { name: 'Organic Chemistry', teacher: 'Dr. Elena Rodriguez', mode: 'Online' },
        { name: 'Molecular Biology', teacher: 'Dr. Michael Chen', mode: 'Offline' }
    ];
    
    const now = new Date();
    const data = [];
    
    // Classes for today
    subjects.slice(0, 2).forEach((sub, i) => {
        const date = new Date(now);
        data.push({
            _id: `mock-today-${i}`,
            classMode: sub.mode,
            subjectId: { subjectName: sub.name },
            className: 'Batch A-12',
            date: date.toISOString(),
            startTime: i === 0 ? '09:00 AM' : '11:45 AM',
            endTime: i === 0 ? '11:00 AM' : '01:45 PM',
            teacherId: { name: sub.teacher },
            status: i === 0 ? 'Completed' : 'Ongoing',
            session: '2024-25'
        });
    });
    
    // Classes for tomorrow
    subjects.slice(2, 4).forEach((sub, i) => {
        const date = new Date(now);
        date.setDate(now.getDate() + 1);
        data.push({
            _id: `mock-tomorrow-${i}`,
            classMode: sub.mode,
            subjectId: { subjectName: sub.name },
            className: 'Batch B-08',
            date: date.toISOString(),
            startTime: i === 0 ? '10:00 AM' : '02:00 PM',
            endTime: i === 0 ? '12:00 PM' : '04:00 PM',
            teacherId: { name: sub.teacher },
            status: 'SCHEDULED',
            session: '2024-25'
        });
    });
    
    return data;
};

// Helper functions for history
const formatLocalDate = (date) => {
    if (!date || isNaN(new Date(date).getTime())) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DoughnutChart = ({ slices, size = 160, thickness = 28, isDarkMode }) => {
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
                <circle cx={cx} cy={cx} r={r} fill="none"
                    stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(148,163,184,0.12)"} strokeWidth={thickness} />

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
                                stroke={arc.color || arc.fill}
                                strokeWidth={isHov ? thickness + 8 : thickness}
                                strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                                strokeDashoffset={-arc.offset}
                                strokeLinecap="butt"
                                style={{
                                    transition: 'stroke-width 0.18s ease, opacity 0.18s ease',
                                    opacity: hovered !== null && !isHov ? 0.35 : 1,
                                    filter: isHov ? `drop-shadow(0 0 10px ${arc.color || arc.fill}cc)` : 'none',
                                }}
                            />
                            <circle
                                cx={cx} cy={cx} r={r}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={thickness + 16}
                                strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                                strokeDashoffset={-arc.offset}
                            />
                        </g>
                    );
                })}
            </svg>

            <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                transition: 'all 0.18s ease',
            }}>
                <p style={{
                    fontSize: size * 0.18,
                    fontWeight: 900,
                    color: display ? (display.color || display.fill) : (isDarkMode ? '#fff' : '#1e293b'),
                    lineHeight: 1,
                    margin: 0,
                }}>
                    {display ? `${Math.round(display.pct * 100)}%` : '—'}
                </p>
                <p style={{
                    fontSize: size * 0.07,
                    fontWeight: 800,
                    color: '#94a3b8',
                    marginTop: 4,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                }}>
                    {display ? (display.name || display.label || 'Overall') : ''}
                </p>
            </div>
        </div>
    );
};

const DetailedHistory = ({ records, isDarkMode }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [jumpToPage, setJumpToPage] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('All');
    const [teacherFilter, setTeacherFilter] = useState('All');

    const isFiltered = statusFilter !== 'All' || dateFilter !== '' || subjectFilter !== 'All' || teacherFilter !== 'All';

    const clearFilters = () => {
        setStatusFilter('All');
        setDateFilter('');
        setSubjectFilter('All');
        setTeacherFilter('All');
        setCurrentPage(1);
    };

    const uniqueSubjects = useMemo(() => {
        const subjects = new Set();
        records.forEach(r => {
            const subject = r.subjectId?.subjectName || r.subjectName || r.subject || 'General';
            subjects.add(subject);
        });
        return ['All', ...Array.from(subjects)].sort();
    }, [records]);

    const uniqueTeachers = useMemo(() => {
        const teachers = new Set();
        records.forEach(r => {
            const teacher = r.teacherId?.name || r.teacherName || 'Assigned Staff';
            teachers.add(teacher);
        });
        return ['All', ...Array.from(teachers)].sort();
    }, [records]);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const status = r.attendanceStatus || r.status;
            const subject = r.subjectId?.subjectName || r.subjectName || r.subject || 'General';
            const teacher = r.teacherId?.name || r.teacherName || 'Assigned Staff';

            const d = new Date(r.date || r.classScheduleId?.date);
            const dateStr = formatLocalDate(d);

            const matchStatus = statusFilter === 'All' || status === statusFilter;
            const matchSubject = subjectFilter === 'All' || subject === subjectFilter;
            const matchTeacher = teacherFilter === 'All' || teacher === teacherFilter;
            const matchDate = !dateFilter || dateStr === dateFilter;

            return matchStatus && matchSubject && matchTeacher && matchDate;
        });
    }, [records, statusFilter, subjectFilter, teacherFilter, dateFilter]);

    const summaryStats = useMemo(() => {
        if (!filteredRecords.length) return null;

        let present = 0;
        let absent = 0;
        let notMarked = 0;

        const subjectCounts = {};
        const teacherCounts = {};
        const timelineDataRaw = {};

        filteredRecords.forEach(r => {
            const status = r.attendanceStatus || r.status;
            if (status === 'Present') present++;
            else if (status === 'Absent') absent++;
            else notMarked++;

            const subject = r.subjectId?.subjectName || r.subjectName || r.subject || 'General';
            if (!subjectCounts[subject]) subjectCounts[subject] = { name: subject, Present: 0, Absent: 0, NotMarked: 0, value: 0 };
            if (status === 'Present') subjectCounts[subject].Present++;
            else if (status === 'Absent') subjectCounts[subject].Absent++;
            else subjectCounts[subject].NotMarked++;
            subjectCounts[subject].value++;

            const teacher = r.teacherId?.name || r.teacherName || 'Assigned Staff';
            if (!teacherCounts[teacher]) teacherCounts[teacher] = { name: teacher, Present: 0, Absent: 0, NotMarked: 0, value: 0 };
            if (status === 'Present') teacherCounts[teacher].Present++;
            else if (status === 'Absent') teacherCounts[teacher].Absent++;
            else teacherCounts[teacher].NotMarked++;
            teacherCounts[teacher].value++;

            const d = new Date(r.date || r.classScheduleId?.date);
            const dateStr = formatLocalDate(d);
            if (!timelineDataRaw[dateStr]) timelineDataRaw[dateStr] = { date: dateStr, displayDate: `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('en-US', { month: 'short' })}`, classes: 0, Present: 0, Absent: 0, NotMarked: 0 };

            timelineDataRaw[dateStr].classes++;
            if (status === 'Present') timelineDataRaw[dateStr].Present++;
            else if (status === 'Absent') timelineDataRaw[dateStr].Absent++;
            else timelineDataRaw[dateStr].NotMarked++;
        });

        const pieData = [
            { name: 'Present', value: present, color: '#10b981' },
            { name: 'Absent', value: absent, color: '#f43f5e' },
            { name: 'Not Marked', value: notMarked, color: '#f59e0b' }
        ].filter(d => d.value > 0);

        const barData = Object.values(subjectCounts).sort((a, b) => b.value - a.value).slice(0, 5);
        const teacherData = Object.values(teacherCounts).sort((a, b) => b.value - a.value).slice(0, 5);
        const areaData = Object.values(timelineDataRaw).sort((a, b) => new Date(a.date) - new Date(b.date));

        return { pieData, barData, areaData, teacherData };
    }, [filteredRecords]);

    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredRecords.length / itemsPerPage);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        } else if (totalPages === 0) {
            setCurrentPage(1);
        }
    }, [itemsPerPage, totalPages, currentPage, statusFilter, subjectFilter, teacherFilter, dateFilter]);

    const handleJump = (e) => {
        e.preventDefault();
        const page = parseInt(jumpToPage);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setJumpToPage('');
        }
    };

    const displayRecords = itemsPerPage === 'all'
        ? filteredRecords
        : filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className={`px-2.5 py-2 rounded-lg border shadow-xl backdrop-blur-md z-50 min-w-[90px] ${isDarkMode ? 'bg-[#1e293b]/95 border-white/10' : 'bg-white/95 border-slate-200'}`}>
                    <div className="space-y-0.5">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[9px] font-bold text-emerald-500">Present</span>
                            <span className={`text-[9px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{data.Present || 0}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[9px] font-bold text-rose-500">Absent</span>
                            <span className={`text-[9px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{data.Absent || 0}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[9px] font-bold text-amber-500">Pending</span>
                            <span className={`text-[9px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{data.NotMarked || 0}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 overflow-hidden">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Academic History
                        </h3>
                        <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Session Archives</p>
                    </div>

                    {isFiltered && (
                        <button
                            onClick={clearFilters}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                        >
                            <X size={14} /> Clear All
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest opacity-50 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Date</span>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-3 py-2 text-xs font-bold rounded-lg outline-none transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'} cursor-pointer uppercase`}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest opacity-50 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Subject</span>
                        <select
                            value={subjectFilter}
                            onChange={e => { setSubjectFilter(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-3 py-2 text-xs font-bold rounded-lg outline-none cursor-pointer transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'} truncate`}
                        >
                            {uniqueSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest opacity-50 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Teacher</span>
                        <select
                            value={teacherFilter}
                            onChange={e => { setTeacherFilter(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-3 py-2 text-xs font-bold rounded-lg outline-none cursor-pointer transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'} truncate`}
                        >
                            {uniqueTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest opacity-50 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Status</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-3 py-2 text-xs font-bold rounded-lg outline-none cursor-pointer transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'}`}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Not Marked">Not Marked</option>
                        </select>
                    </div>
                </div>
            </div>

            {summaryStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-2">
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} flex flex-col items-center justify-center`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 w-full text-left opacity-70 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Status Breakdown</h4>
                        <div className="py-2">
                            <DoughnutChart slices={summaryStats.pieData} size={130} thickness={20} isDarkMode={isDarkMode} />
                        </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} flex flex-col`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 opacity-70 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Top Subjects</h4>
                        <div className="relative w-full h-[140px] min-h-[140px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                <BarChart data={summaryStats.barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: isDarkMode ? '#94a3b8' : '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(val) => val.substring(0, 6)} />
                                    <YAxis tick={{ fontSize: 8, fill: isDarkMode ? '#94a3b8' : '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }} position={{ y: 0 }} />
                                    <Bar dataKey="value" name="Classes" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} flex flex-col`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 opacity-70 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Top Faculties</h4>
                        <div className="relative w-full h-[140px] min-h-[140px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                <BarChart data={summaryStats.teacherData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: isDarkMode ? '#94a3b8' : '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(val) => val.substring(0, 6)} />
                                    <YAxis tick={{ fontSize: 8, fill: isDarkMode ? '#94a3b8' : '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }} position={{ y: 0 }} />
                                    <Bar dataKey="value" name="Sessions" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} flex flex-col`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 opacity-70 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Activity Timeline</h4>
                        <div className="relative w-full h-[140px] min-h-[140px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                <RechartsAreaChart data={summaryStats.areaData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorClasses" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                    <XAxis dataKey="displayDate" tick={{ fontSize: 8, fill: isDarkMode ? '#94a3b8' : '#64748b' }} tickLine={false} axisLine={false} minTickGap={20} />
                                    <YAxis tick={{ fontSize: 8, fill: isDarkMode ? '#94a3b8' : '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <RechartsTooltip content={<CustomTooltip />} position={{ y: 0 }} />
                                    <Area type="monotone" dataKey="classes" name="Classes" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorClasses)" />
                                </RechartsAreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            <div className={`overflow-x-auto custom-scrollbar rounded-xl border ${isDarkMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-white'}`}>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className={`${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 whitespace-nowrap">Class Name & Subject</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 whitespace-nowrap">Date & Time</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 whitespace-nowrap">Teacher</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 whitespace-nowrap">Chapter</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-center whitespace-nowrap">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {displayRecords.map((record, i) => {
                            const status = record.attendanceStatus || record.status;
                            const subject = record.subjectId?.subjectName || record.subjectName || record.subject || 'General';
                            const date = new Date(record.date || record.classScheduleId?.date);

                            return (
                                <motion.tr
                                    key={`${record._id || i}-${currentPage}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: (i % 15) * 0.03 }}
                                    className={`${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-colors cursor-default`}>
                                    <td className="p-4">
                                        <p className={`text-xs font-black uppercase tracking-tight whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {record.className || 'Academic Session'}
                                        </p>
                                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest whitespace-nowrap">{subject}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className={`text-xs font-bold whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <p className="text-[10px] opacity-40 font-bold whitespace-nowrap">{record.startTime} - {record.endTime}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className={`text-xs font-bold whitespace-nowrap max-w-[150px] truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {record.teacherId?.name || record.teacherName || 'Assigned Staff'}
                                        </p>
                                    </td>
                                    <td className="p-4 text-xs font-medium opacity-60 italic max-w-[150px] truncate">
                                        {record.chapterName || 'General Topic'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap
                                                ${status === 'Present' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    status === 'Absent' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                        'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                {status}
                                            </span>
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filteredRecords.length > 0 && (
                <div className={`flex flex-col md:flex-row flex-wrap items-center justify-between gap-4 py-2 border-t pt-4 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Rows per page:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                const val = e.target.value;
                                setItemsPerPage(val === 'all' ? 'all' : Number(val));
                                setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg outline-none cursor-pointer transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'} border focus:border-indigo-500`}>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value="all">All</option>
                        </select>
                    </div>

                    <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Showing {itemsPerPage === 'all' ? `1-${filteredRecords.length}` : `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredRecords.length)}`} of {filteredRecords.length}
                    </div>

                    {itemsPerPage !== 'all' && totalPages > 1 && (
                        <div className="flex items-center gap-3">
                            <form onSubmit={handleJump} className="flex items-center gap-2 mr-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Jump to</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    value={jumpToPage}
                                    onChange={(e) => setJumpToPage(e.target.value)}
                                    className={`w-14 px-2 py-1.5 text-xs font-bold text-center rounded-lg outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder-white/20 focus:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white'} focus:border-indigo-500`}
                                    placeholder={`Pg`}
                                />
                            </form>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-lg border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-white/5' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:border-transparent'} shadow-sm`}>
                                    <ChevronLeft size={14} strokeWidth={3} />
                                </button>
                                <span className={`text-xs font-black px-3 tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {currentPage} <span className="opacity-40 font-medium">/</span> {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-lg border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-white/5' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:border-transparent'} shadow-sm`}>
                                    <ChevronRight size={14} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const Classes = ({ isDarkMode, cache, setCache }) => {
    const { getApiUrl, token } = useAuth();

    // Use a ref for comparison to avoid the infinite loop in dependency arrays
    const classesRef = useRef(cache?.loaded ? cache.data : getMockClasses());
    const [classes, setClasses] = useState(classesRef.current);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);

    const fetchAttendanceHistory = useCallback(async () => {
        if (!token) return;
        try {
            setHistoryLoading(true);
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/student/attendance/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            let data = response.data;
            let records = [];
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                records = data.data || [];
            } else {
                records = data || [];
            }
            setHistory(records);
            setHistoryLoading(false);
        } catch (err) {
            console.error("Error fetching attendance history:", err);
            setHistoryLoading(false);
        }
    }, [getApiUrl, token]);

    const fetchClasses = useCallback(async (isBackground = false) => {
        if (!token) return;

        try {
            if (!isBackground) setLoading(true);

            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/student/classes/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Handle various response structures
            let data = [];
            if (Array.isArray(response.data)) {
                data = response.data;
            } else if (response.data?.classes && Array.isArray(response.data.classes)) {
                data = response.data.classes;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                data = response.data.data;
            } else if (response.data?.schedule && Array.isArray(response.data.schedule)) {
                data = response.data.schedule;
            }

            // Inject mock data if ERP returns empty for demonstration
            if (data.length === 0) {
                data = getMockClasses();
            }

            // Compare with current ref value to determine if state update is needed
            const isDataSame = JSON.stringify(data) === JSON.stringify(classesRef.current);

            if (!isDataSame) {
                classesRef.current = data;
                setClasses(data);

                // Update parent cache only if changed
                if (setCache) {
                    setCache({ data: data, loaded: true });
                }
            }

            if (!isBackground) setLoading(false);

        } catch (err) {
            console.error("Error fetching classes:", err);
            // Don't show error immediately if it's just empty or 404 (no classes yet)
            if (err.response?.status === 404) {
                if (classesRef.current.length !== 0) {
                    classesRef.current = [];
                    setClasses([]);
                    if (setCache) setCache({ data: [], loaded: true });
                }
            } else {
                if (!isBackground) setError("Failed to load class schedule.");
            }
            if (!isBackground) setLoading(false);
        }
    }, [getApiUrl, token, setCache]);

    useEffect(() => {
        if (!cache?.loaded) {
            fetchClasses(false); // Initial load
            fetchAttendanceHistory();
        } else {
            fetchClasses(true); // Background sync on mount/tab switch
            fetchAttendanceHistory();
        }
    }, [fetchClasses, fetchAttendanceHistory, cache?.loaded]);

    // Format Date Helper
    const formatDate = (dateString) => {
        if (!dateString) return 'TBA';
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 animate-pulse">
                <Calendar size={48} className="text-indigo-500 mb-4" />
                <p className="font-black uppercase tracking-widest text-xs opacity-50">Syncing Schedule...</p>
            </div>
        );
    }

    if (error) {
        const isPermissionError = error.includes("403") || error.includes("Forbidden");
        return (
            <div className={`p-8 rounded-[5px] border ${isPermissionError ? 'bg-orange-500/5 border-orange-500/20' : (isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100')} flex items-center gap-4`}>
                <AlertCircle className={isPermissionError ? "text-orange-500" : "text-red-500"} size={24} />
                <div>
                    <h3 className={`text-sm font-black uppercase ${isPermissionError ? "text-orange-500" : "text-red-500"}`}>
                        {isPermissionError ? "Access Restricted" : "Attention"}
                    </h3>
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {isPermissionError
                            ? "Unable to sync class schedule directly from ERP due to permission restrictions. Please check the Study Planner for tasks."
                            : error}
                    </p>
                    <button
                        onClick={() => fetchClasses(false)}
                        className={`mt-2 text-xs font-bold underline ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
                    >
                        Try Refreshing
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Header */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="px-3 py-1 rounded-[5px] bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                    Academic Schedule
                                </div>
                            </div>
                            <h2 className={`text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                My Classes
                            </h2>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Upcoming live sessions, offline batches, and timetable.
                            </p>
                        </div>
                        <button
                            onClick={() => fetchClasses(false)}
                            disabled={loading}
                            className={`p-2 rounded-full transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            title="Sync now"
                        >
                            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
                <Clock size={200} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12" />
            </div>

            {/* Classes List */}
            {classes.filter(cls => {
                const s = cls.status?.toLowerCase() || '';
                return s === 'ongoing' || s === 'scheduled';
            }).length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {classes.filter(cls => {
                        const s = cls.status?.toLowerCase() || '';
                        return s === 'ongoing' || s === 'scheduled';
                    }).map((cls, idx) => (
                        <div
                            key={cls._id || idx}
                            onClick={() => setSelectedClass(cls)}
                            className={`p-6 rounded-[5px] border group hover:border-blue-500/50 transition-all cursor-pointer ${isDarkMode ? 'bg-white/[0.02] border-white/5 hover:bg-white/5' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center text-white shadow-lg shrink-0
                                        ${cls.classMode === 'Online' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'}`}>
                                        {cls.classMode === 'Online' ? <Video size={20} /> : <BookOpen size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {cls.subjectId?.subjectName || cls.subject || 'Class Session'}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded-[5px] text-[8px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-white/10 text-white/70 border-white/10' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {cls.className}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium opacity-60">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar size={12} /> {formatDate(cls.date)}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={12} /> {cls.startTime} - {cls.endTime}
                                            </span>
                                            {cls.teacherId?.name && (
                                                <span className="flex items-center gap-1.5">
                                                    <User size={12} /> {cls.teacherId.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 md:self-center self-end">
                                    <div className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest ${cls.status === 'Completed' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600') :
                                        cls.status === 'Cancelled' ? (isDarkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-600') :
                                            cls.status === 'Ongoing' ? (isDarkMode ? 'bg-orange-500/10 text-orange-500 animate-pulse' : 'bg-orange-50 text-orange-600 animate-pulse') :
                                                (isDarkMode ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600')
                                        }`}>
                                        {cls.status || 'SCHEDULED'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={`py-20 text-center rounded-[5px] border-2 border-dashed ${isDarkMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="flex flex-col items-center gap-4 opacity-30">
                        <Calendar size={60} />
                        <div className="space-y-1">
                            <p className="font-black uppercase tracking-[0.2em] text-sm">No classes scheduled</p>
                            <p className="text-xs font-bold">Check back later for updates</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Class History (Attendance Dossier) Section */}
            <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <DetailedHistory records={history} isDarkMode={isDarkMode} />
            </div>

            {/* Selected Class Detail Modal - Using Portal to escape parent transforms */}
            {selectedClass && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div
                        className={`w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden ${isDarkMode ? 'bg-[#1e293b] text-white border border-white/10' : 'bg-white text-slate-900'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`px-6 py-4 flex items-center justify-between border-b ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight">
                                    Class Details
                                </h3>
                                <p className={`text-xs font-bold uppercase tracking-wider opacity-60`}>
                                    {selectedClass.className}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedClass(null)}
                                className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100 text-slate-500'}`}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content - Scrollable if needed */}
                        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-6">
                                {/* Primary Info Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center gap-2 mb-2 opacity-60">
                                            <BookOpen size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Subject</span>
                                        </div>
                                        <p className="font-bold text-sm leading-tight">
                                            {selectedClass.subjectId?.subjectName || 'N/A'}
                                        </p>
                                    </div>
                                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center gap-2 mb-2 opacity-60">
                                            <Info size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Status</span>
                                        </div>
                                        <p className={`font-bold text-sm ${selectedClass.status === 'Completed' ? 'text-emerald-500' :
                                            selectedClass.status === 'Ongoing' ? 'text-orange-500' :
                                                selectedClass.status === 'Cancelled' ? 'text-red-500' :
                                                    'text-blue-500'
                                            }`}>
                                            {selectedClass.status || 'Scheduled'}
                                        </p>
                                    </div>
                                </div>

                                {/* Detailed Lists */}
                                <div className="space-y-4">
                                    {/* Timing */}
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                            <Clock size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-black uppercase tracking-wide mb-1 opacity-80">Timing</h4>
                                            <div className="text-sm font-medium space-y-1">
                                                <p>{formatDate(selectedClass.date)}</p>
                                                <p>{selectedClass.startTime} - {selectedClass.endTime}</p>
                                                {selectedClass.actualStartTime && (
                                                    <p className="text-xs opacity-60 mt-1">
                                                        Started at: {new Date(selectedClass.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Faculty */}
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                            <User size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-black uppercase tracking-wide mb-1 opacity-80">Faculty</h4>
                                            <div className="text-sm font-medium">
                                                <p>{selectedClass.teacherId?.name || 'Assigned Staff'}</p>
                                                {selectedClass.teacherId?.email && (
                                                    <p className="text-xs opacity-60">{selectedClass.teacherId.email}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location/Mode */}
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                                            <MapPin size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-black uppercase tracking-wide mb-1 opacity-80">Class Information</h4>
                                            <div className="text-sm font-medium space-y-1">
                                                <p>{selectedClass.classMode || 'Offline'}</p>
                                                {selectedClass.classMode === 'Offline' && (
                                                    <p className="text-xs opacity-60">Centre ID: {selectedClass.centreId}</p>
                                                )}
                                                <p className="text-xs opacity-60">Session: {selectedClass.session}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className={`p-4 border-t flex justify-end ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
                            <button
                                onClick={() => setSelectedClass(null)}
                                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${isDarkMode ? 'bg-white text-black hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Classes;
