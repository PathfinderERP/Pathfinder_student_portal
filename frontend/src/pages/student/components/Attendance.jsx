import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, TrendingUp, Award, Target, BarChart3, PieChart as PieChartIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart as RechartsAreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Helper functions defined outside component to avoid hoisting issues
const calculateStreak = (data) => {
    if (!Array.isArray(data)) return 0;

    const sorted = [...data]
        .filter(r => (r.attendanceStatus || r.status) !== 'Not Marked')
        .sort((a, b) => new Date(a.date || a.classScheduleId?.date) - new Date(b.date || b.classScheduleId?.date));

    let currentStreak = 0;
    let maxStreak = 0;

    for (let record of sorted) {
        const status = record.attendanceStatus || record.status;
        if (status === 'Present') {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else if (status === 'Absent') {
            currentStreak = 0;
        }
    }
    return maxStreak;
};

const formatLocalDate = (date) => {
    if (!date || isNaN(new Date(date).getTime())) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const calculateTrend = (monthlyData) => {
    if (monthlyData.length < 2) return 0;
    const recent = monthlyData.slice(-2);
    return recent[1].percentage - recent[0].percentage;
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

    // Dominant slice = largest by value (shown in center when not hovering)
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
                            {/* Wider invisible hit-area */}
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

            {/* Center label */}
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


// Realistic mock data generator for demonstration
const getMockAttendance = () => {
    const data = [];
    const subjects = ['Mathematics', 'Physics', 'Inorganic Chemistry', 'Biology', 'Coordinate Geometry'];
    const now = new Date();

    // Generate records for the last 120 days to fill the charts
    for (let i = 120; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);

        // Skip weekends for more realism
        const day = date.getDay();
        if (day === 0 || day === 6) continue;

        // High attendance rate (88%) for a "good" student profile
        const status = Math.random() > 0.12 ? 'Present' : 'Absent';
        const subject = subjects[i % subjects.length];

        data.push({
            date: formatLocalDate(date),
            status: status,
            classScheduleId: {
                subjectId: {
                    subjectName: subject
                }
            }
        });
    }
    return data;
};

// Module-level constant — never recreated, keeps React.memo on MonthBlock stable
const HEATMAP_DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const HEATMAP_STATUS = {
    1: { text: 'Present', color: '#10b981' },
    0: { text: 'Absent', color: '#f43f5e' },
    [-1]: { text: 'Pending', color: '#f59e0b' },
    null: { text: 'No Record', color: '#94a3b8' },
};

// Extracted outside — stable reference for React.memo
const MonthBlock = React.memo(({ month, isDarkMode, getCellStyle, onCellEnter, onCellLeave }) => (
    <div className="flex flex-col gap-1 flex-1">
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] text-center mb-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {month.label}
        </span>
        <div className="grid grid-cols-7 gap-[2px] mb-0.5">
            {HEATMAP_DAY_LABELS.map(dl => (
                <span key={dl} className={`text-[6px] font-black uppercase text-center leading-none ${isDarkMode ? 'text-white/20' : 'text-slate-300'}`}>
                    {dl}
                </span>
            ))}
        </div>
        <div className="flex flex-col gap-[2px]">
            {month.grid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-[2px]">
                    {week.map((cell, di) => (
                        <motion.div
                            key={di}
                            whileHover={cell ? { scale: 1.3, zIndex: 50, transition: { duration: 0.1 } } : {}}
                            className={`aspect-square rounded-[2px] cursor-pointer ${getCellStyle(cell)} transition-colors`}
                            style={{ minWidth: 10, minHeight: 10 }}
                            onMouseEnter={(e) => cell && onCellEnter(e, cell)}
                            onMouseMove={(e) => cell && onCellEnter(e, cell)}
                            onMouseLeave={onCellLeave}
                        />
                    ))}
                </div>
            ))}
        </div>
    </div>
));

const AttendanceCalendar = ({ dailyData, isDarkMode }) => {
    // Tooltip via DOM ref — NO React state = NO re-renders = NO flickering
    const tooltipRef = React.useRef(null);
    const now = new Date();

    const statusMap = React.useMemo(() => {
        const m = {};
        dailyData.forEach(r => {
            if (!r.date) return;
            const raw = r.status;
            let norm;
            if (raw === 1 || raw === 'Present') norm = 1;
            else if (raw === 0 || raw === 'Absent') norm = 0;
            else if (raw === -1 || raw === 'Not Marked' || raw === 'NotMarked') norm = -1;
            else norm = null;

            if (!m[r.date]) m[r.date] = { present: 0, absent: 0, pending: 0, total: 0, status: null };
            if (norm === 1) { m[r.date].present++; m[r.date].total++; }
            else if (norm === 0) { m[r.date].absent++; m[r.date].total++; }
            else if (norm === -1) { m[r.date].pending++; m[r.date].total++; }

            // Dominant status: Present > Absent > Pending
            if (m[r.date].present > 0) m[r.date].status = 1;
            else if (m[r.date].absent > 0) m[r.date].status = 0;
            else m[r.date].status = -1;
        });
        return m;
    }, [dailyData]);

    const months = React.useMemo(() => {
        const currentYear = now.getFullYear();
        const list = [];
        for (let month = 0; month < 12; month++) {
            const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
            const firstDow = new Date(currentYear, month, 1).getDay();
            const grid = Array.from({ length: 6 }, () => Array(7).fill(null));
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(currentYear, month, d);
                const dow = date.getDay();
                const weekRow = Math.floor((d - 1 + firstDow) / 7);
                const dateStr = formatLocalDate(date);
                const dayData = Object.prototype.hasOwnProperty.call(statusMap, dateStr) ? statusMap[dateStr] : null;
                grid[weekRow][dow] = { date, dateStr, status: dayData?.status ?? null, dayData };
            }
            while (grid.length > 0 && grid[grid.length - 1].every(c => c === null)) grid.pop();
            list.push({ label: new Date(currentYear, month, 1).toLocaleString('default', { month: 'short' }), grid });
        }
        return list;
    }, [statusMap]);

    const getCellStyle = React.useCallback((cell) => {
        if (!cell) return 'bg-transparent';
        if (cell.status === null) return isDarkMode ? 'bg-white/[0.04] border border-white/[0.06]' : 'bg-slate-100 border border-slate-200/60';
        if (cell.status === 1) return 'bg-[#10b981] shadow-[0_0_4px_rgba(16,185,129,0.5)]';
        if (cell.status === 0) return 'bg-[#f43f5e] shadow-[0_0_4px_rgba(244,63,94,0.5)]';
        return 'bg-[#f59e0b] shadow-[0_0_4px_rgba(245,158,11,0.5)]';
    }, [isDarkMode]);

    // Direct DOM manipulation — bypasses React state entirely
    const handleCellEnter = React.useCallback((e, cell) => {
        const el = tooltipRef.current;
        if (!el || !cell) return;
        
        const container = el.offsetParent;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        
        const d = cell.dayData;
        const statusEl = el.querySelector('.tt-status');
        const dateEl = el.querySelector('.tt-date');
        const countsEl = el.querySelector('.tt-counts');
        const presentEl = el.querySelector('.tt-present');
        const absentEl = el.querySelector('.tt-absent');
        const pendingEl = el.querySelector('.tt-pending');

        if (d && d.total > 0) {
            const pct = Math.round((d.present / d.total) * 100);
            statusEl.textContent = `${d.present}/${d.total} Attended`;
            statusEl.style.color = d.present > 0 ? '#10b981' : d.absent > 0 ? '#f43f5e' : '#f59e0b';
            presentEl.textContent = `${d.present} Present`;
            absentEl.textContent = `${d.absent} Absent`;
            pendingEl.textContent = d.pending > 0 ? `${d.pending} Pending` : '';
            pendingEl.style.display = d.pending > 0 ? 'inline' : 'none';
            countsEl.style.display = 'flex';
        } else {
            statusEl.textContent = 'No Classes';
            statusEl.style.color = '#94a3b8';
            countsEl.style.display = 'none';
        }

        dateEl.textContent = cell.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        // Accurate coordinate calculation relative to the 'relative' container
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        el.style.left = `${x}px`;
        el.style.top = `${y - 10}px`;
        el.style.opacity = '1';
        el.style.visibility = 'visible';
    }, []);

    const handleCellLeave = React.useCallback(() => {
        const el = tooltipRef.current;
        if (el) { el.style.opacity = '0'; el.style.visibility = 'hidden'; }
    }, []);

    const row1 = months.slice(0, 6);
    const row2 = months.slice(6, 12);

    return (
        <div className="space-y-4 relative">
            <div className="flex items-center justify-between">
                <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Activity Heatmap <span className="font-medium opacity-40">{now.getFullYear()}</span>
                </h3>
                <div className="flex items-center gap-4">
                    {[
                        { color: '#10b981', label: 'Present', shadow: 'rgba(16,185,129,0.4)' },
                        { color: '#f43f5e', label: 'Absent', shadow: 'rgba(244,63,94,0.4)' },
                        { color: '#f59e0b', label: 'Pending', shadow: 'rgba(245,158,11,0.4)' },
                    ].map(({ color, label, shadow }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: color, boxShadow: `0 0 6px ${shadow}` }} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex gap-3">
                    {row1.map((month, mi) => (
                        <MonthBlock key={mi} month={month} isDarkMode={isDarkMode} getCellStyle={getCellStyle} onCellEnter={handleCellEnter} onCellLeave={handleCellLeave} />
                    ))}
                </div>
                <div className={`w-full h-px ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                <div className="flex gap-3">
                    {row2.map((month, mi) => (
                        <MonthBlock key={mi + 6} month={month} isDarkMode={isDarkMode} getCellStyle={getCellStyle} onCellEnter={handleCellEnter} onCellLeave={handleCellLeave} />
                    ))}
                </div>
            </div>

            {/* Tooltip — always in DOM, shown/hidden via direct DOM style (zero React re-renders) */}
            <div
                ref={tooltipRef}
                className={`pointer-events-none absolute z-[9999] px-3 py-2.5 rounded-xl border shadow-2xl whitespace-nowrap
                    ${isDarkMode ? 'bg-[#1e293b] border-white/10' : 'bg-white border-slate-200'}`}
                style={{ opacity: 0, visibility: 'hidden', transform: 'translate(-50%, -100%)', transition: 'opacity 0.1s ease' }}
            >
                <p className={`tt-status text-[11px] font-black text-center mb-1`}></p>
                <div className="tt-counts flex-col gap-0.5" style={{ display: 'none' }}>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className={`tt-present text-[9px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                        <span className={`tt-absent text-[9px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                        <span className={`tt-pending text-[9px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}></span>
                    </div>
                </div>
                <p className={`tt-date text-[9px] font-semibold mt-1.5 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}></p>
                <span className={`absolute left-1/2 -translate-x-1/2 bottom-[-5px] w-2.5 h-2.5 rotate-45 border-r border-b
                    ${isDarkMode ? 'bg-[#1e293b] border-white/10' : 'bg-white border-slate-200'}`} />
            </div>
        </div>
    );
};





const DetailedHistory = ({ records, isDarkMode }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [jumpToPage, setJumpToPage] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('All');
    const [teacherFilter, setTeacherFilter] = useState('All');

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
        const areaData = Object.values(timelineDataRaw).sort((a, b) => new Date(a.date) - new Date(b.date));

        return { pieData, barData, areaData };
    }, [filteredRecords]);

    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredRecords.length / itemsPerPage);

    // Ensure currentPage is valid when itemsPerPage changes
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
                            Attendance Dossier
                        </h3>
                        <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Academic Session Archives</p>
                    </div>
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

            {/* Dynamic Summarization Widgets */}
            {summaryStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} flex flex-col items-center justify-center`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 w-full text-left opacity-70 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Status Breakdown</h4>
                        <div className="py-2">
                            <DoughnutChart slices={summaryStats.pieData} size={130} thickness={20} isDarkMode={isDarkMode} />
                        </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} flex flex-col justify-center`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 opacity-70 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Top Subjects</h4>
                        <div className="h-[140px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
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

                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} flex flex-col justify-center`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 opacity-70 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Activity Timeline</h4>
                        <div className="h-[140px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
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
                                    className={`${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-colors cursor-default`}
                                >
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

            {filteredRecords.length > 0 ? (
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
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg outline-none cursor-pointer transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'} border focus:border-indigo-500`}
                        >
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
                                    className={`p-2 rounded-lg border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-white/5' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:border-transparent'} shadow-sm`}
                                >
                                    <ChevronLeft size={14} strokeWidth={3} />
                                </button>
                                <span className={`text-xs font-black px-3 tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {currentPage} <span className="opacity-40 font-medium">/</span> {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-lg border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-white/5' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:border-transparent'} shadow-sm`}
                                >
                                    <ChevronRight size={14} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-8">
                    <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`}>
                        No records match the current filter.
                    </p>
                </div>
            )}
        </div>
    );
};

const MonthlyDigest = ({ data, isDarkMode }) => {
    if (!data || data.length === 0) return null;

    // Sort to show latest months first in the table
    const sortedData = [...data].sort((a, b) => new Date(b.month) - new Date(a.month));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Monthly Performance <span className="font-medium opacity-40">Archive</span>
                </h3>
            </div>

            <div className={`overflow-x-auto custom-scrollbar rounded-xl border ${isDarkMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-white'}`}>
                <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                        <tr className={`${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                            <th className="p-4 text-[9px] font-black uppercase tracking-widest opacity-50 whitespace-nowrap">Month</th>
                            <th className="p-4 text-[9px] font-black uppercase tracking-widest opacity-50 text-center whitespace-nowrap">Total Classes</th>
                            <th className="p-4 text-[9px] font-black uppercase tracking-widest opacity-50 text-center whitespace-nowrap text-emerald-500">Present</th>
                            <th className="p-4 text-[9px] font-black uppercase tracking-widest opacity-50 text-center whitespace-nowrap text-rose-500">Absent</th>
                            <th className="p-4 text-[9px] font-black uppercase tracking-widest opacity-50 text-right whitespace-nowrap">Consistency</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedData.filter(m => m.total > 0).map((m, i) => (
                            <tr key={m.month} className={`${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-colors`}>
                                <td className="p-4 text-xs font-black uppercase tracking-tight whitespace-nowrap">
                                    {m.month}
                                </td>
                                <td className="p-4 text-xs font-bold text-center tabular-nums opacity-60">
                                    {m.total}
                                </td>
                                <td className="p-4 text-xs font-black text-center text-emerald-500 tabular-nums">
                                    {m.present}
                                </td>
                                <td className="p-4 text-xs font-black text-center text-rose-500 tabular-nums">
                                    {m.absent}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className={`text-xs font-black ${m.percentage >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {m.percentage}%
                                        </span>
                                        <div className="w-20 h-1 bg-black/10 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${m.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                style={{ width: `${m.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AttendanceAreaChart = ({ data, isDarkMode }) => {
    // Gracefully handle empty or single-point data
    if (!data || data.length === 0) {
        return (
            <div className={`h-[300px] flex items-center justify-center rounded-xl border border-dashed ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Data for this period</p>
            </div>
        );
    }

    const width = 1000;
    const height = 300;
    const padding = 60;
    const maxValue = 100;

    // Handle single point case by creating a horizontal line or a single dot
    const points = data.map((d, i) => {
        const xOffset = data.length > 1 ? (i * (width - 2 * padding)) / (data.length - 1) : (width - 2 * padding) / 2;
        return {
            x: padding + xOffset,
            y: height - padding - (d.percentage * (height - 2 * padding)) / maxValue,
            percentage: d.percentage,
            month: d.month
        };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
        <div className="relative w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
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
                    strokeWidth="2.5"
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
                            r="4"
                            className="fill-white stroke-indigo-500 stroke-[1.5px]"
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

    // Use a ref for comparison to avoid the infinite loop in dependency arrays
    const rawDataRef = useRef(cache?.loaded ? cache.data : getMockAttendance());
    const [rawData, setRawData] = useState(rawDataRef.current);
    const [loading, setLoading] = useState(false);
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

            // Handle new structure: { success, totalClasses, presentCount, absentCount, data: [...] }
            // or old structure: [...]
            let data = response.data;
            let records = [];
            let summary = null;

            if (data && typeof data === 'object' && !Array.isArray(data)) {
                records = data.data || [];
                summary = {
                    totalClasses: data.totalClasses,
                    presentCount: data.presentCount,
                    absentCount: data.absentCount
                };
            } else {
                records = data || [];
            }

            // If ERP returns empty data, injection of dummy data for demonstration
            if (records.length === 0) {
                console.log("No ERP data found, using optimized mock data");
                records = getMockAttendance();
                summary = null;
            }

            // Compare with current ref value to determine if state update is needed
            const isDataSame = JSON.stringify(records) === JSON.stringify(rawDataRef.current);

            if (!isDataSame) {
                console.log("Attendance updated from ERP");
                rawDataRef.current = records;
                setRawData(records);

                if (setCache) {
                    setCache({ data: records, summary: summary, loaded: true });
                }
            }
            if (!isBackground) setLoading(false);
        } catch (err) {
            console.error('Attendance fetch error:', err);
            if (!isBackground) setError(err.response?.data?.error || 'Failed to load attendance records');
            if (!isBackground) setLoading(false);
        }
    }, [getApiUrl, token, setCache]);

    useEffect(() => {
        if (!cache?.loaded) fetchAttendance(false);
        else fetchAttendance(true);
    }, [fetchAttendance, cache?.loaded]);

    const processedData = useMemo(() => {
        if (!Array.isArray(rawData)) return null;
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        let filterDate;
        let monthsToInclude = [];

        // Determine range and filter date
        switch(timePeriod) {
            case '1month':
                filterDate = new Date(new Date(startOfThisMonth).setMonth(startOfThisMonth.getMonth() - 1));
                break;
            case '3months':
                filterDate = new Date(new Date(startOfThisMonth).setMonth(startOfThisMonth.getMonth() - 3));
                break;
            case '6months':
                filterDate = new Date(new Date(startOfThisMonth).setMonth(startOfThisMonth.getMonth() - 6));
                break;
            case '1year':
                filterDate = new Date(new Date(startOfThisMonth).setFullYear(startOfThisMonth.getFullYear() - 1));
                break;
            default: // all
                filterDate = new Date(0);
        }

        const filtered = rawData.filter(record => {
            const recordDate = new Date(record.date || record.classScheduleId?.date);
            return recordDate >= filterDate;
        });

        // Pre-generate all months in the range for a consistent X-axis scale
        if (timePeriod !== 'all') {
            let runner = new Date(filterDate);
            while (runner <= now) {
                const mName = runner.toLocaleString('default', { month: 'long', year: 'numeric' });
                monthsToInclude.push(mName);
                runner.setMonth(runner.getMonth() + 1);
            }
        }

        let presentCount = 0;
        let absentCount = 0;
        const monthMap = {};
        const subjectMap = {};
        const weekdayMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        const dailyAttendance = [];

        // Initialize monthsToInclude in monthMap with 0s
        monthsToInclude.forEach(m => {
            monthMap[m] = { month: m, present: 0, absent: 0, total: 0 };
        });

        filtered.forEach(record => {
            const status = record.attendanceStatus || record.status;
            const isPresent = status === 'Present';
            const isAbsent = status === 'Absent';

            if (isPresent) presentCount++;
            else if (isAbsent) absentCount++;

            const date = new Date(record.date || record.classScheduleId?.date);
            const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            const weekday = date.toLocaleString('default', { weekday: 'short' });
            const subjectName = record.subjectId?.subjectName || record.classScheduleId?.subjectId?.subjectName || record.subjectName || 'General';

            if (!monthMap[monthName]) monthMap[monthName] = { month: monthName, present: 0, absent: 0, total: 0 };
            if (isPresent) monthMap[monthName].present++;
            if (isAbsent) monthMap[monthName].absent++;
            if (isPresent || isAbsent) monthMap[monthName].total++;

            if (!subjectMap[subjectName]) subjectMap[subjectName] = { subject: subjectName, present: 0, absent: 0, total: 0 };
            if (isPresent) subjectMap[subjectName].present++;
            if (isAbsent) subjectMap[subjectName].absent++;
            if (isPresent || isAbsent) subjectMap[subjectName].total++;

            if (weekdayMap[weekday] !== undefined) weekdayMap[weekday]++;
            dailyAttendance.push({
                date: formatLocalDate(date),
                status: isPresent ? 1 : (isAbsent ? 0 : -1),
                subject: subjectName
            });
        });

        const sortedMonthNames = Object.keys(monthMap).sort((a, b) => new Date(a) - new Date(b));
        const monthlyData = sortedMonthNames.map(mName => {
            const m = monthMap[mName];
            return {
                ...m,
                percentage: m.total > 0 ? Math.round((m.present / m.total) * 100) : 0
            };
        });

        const gradedTotal = presentCount + absentCount;
        const total = filtered.length;
        const overall = gradedTotal > 0 ? Math.round((presentCount / gradedTotal) * 100) : 0;
        const subjectData = Object.values(subjectMap).map(s => ({
            ...s,
            percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
        })).sort((a, b) => b.percentage - a.percentage);

        return { overall, present: presentCount, absent: absentCount, total, monthlyData, subjectData, weekdayMap, dailyAttendance, streak: calculateStreak(filtered), trend: calculateTrend(monthlyData) };
    }, [rawData, timePeriod]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20">
            <div className="w-16 h-16 flex items-center justify-center mb-4">
                <RefreshCw size={48} className="text-indigo-500 animate-spin" />
            </div>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <MetricCard
                    title="Total Classes"
                    value={processedData.total}
                    icon={BarChart3}
                    color="from-indigo-500 to-indigo-700"
                    isDark={isDarkMode}
                    subtitle="Session Count"
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
                    title="Consistency Score"
                    value={`${processedData.overall}%`}
                    icon={Target}
                    color="from-blue-600 to-cyan-700"
                    isDark={isDarkMode}
                    subtitle="Performance Ratio"
                />
                <MetricCard
                    title="Longest Streak"
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
                    <div className="flex flex-wrap gap-2 relative z-20">
                        {['all', '1month', '3months', '6months', '1year'].map(p => (
                            <button
                                key={p}
                                onClick={() => setTimePeriod(p)}
                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all cursor-pointer ${timePeriod === p
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {p === 'all' ? 'FULL DATA' : p === '1month' ? '1 MONTH' : p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <AttendanceAreaChart data={processedData.monthlyData} isDarkMode={isDarkMode} />
                
                <div className={`w-full h-px my-10 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                
                <MonthlyDigest data={processedData.monthlyData} isDarkMode={isDarkMode} />
            </div>

            {/* Calendar Heatmap & Distribution Mix Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`lg:col-span-2 p-8 rounded-2xl border ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}>
                    <AttendanceCalendar dailyData={processedData.dailyAttendance} isDarkMode={isDarkMode} />
                </div>
                <div className={`p-8 rounded-2xl border flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-10 w-full text-left opacity-30 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Attendance Health
                    </h3>

                    <DoughnutChart
                        slices={[
                            { name: 'Present', value: processedData.present, color: '#10b981' },
                            { name: 'Absent', value: processedData.absent, color: '#f43f5e' }
                        ]}
                        size={190}
                        thickness={32}
                        isDarkMode={isDarkMode}
                    />

                    <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.02] border border-white/5 transition-all hover:bg-emerald-500/5 hover:border-emerald-500/20">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Present</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.02] border border-white/5 transition-all hover:bg-rose-500/5 hover:border-rose-500/20">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Absent</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subject Efficiency Section */}
            <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}>
                <div className="flex items-center justify-between mb-8">
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Subject-wise Performance
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {processedData.subjectData.slice(0, 6).map((subject, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-5 rounded-xl border ${isDarkMode ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-[10px] font-black uppercase tracking-widest max-w-[120px] truncate ${isDarkMode ? 'text-white/70' : 'text-slate-700'}`}>{subject.subject}</span>
                                <span className={`text-xs font-black ${subject.percentage >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>{subject.percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full bg-gradient-to-r ${subject.percentage >= 75 ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-500'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${subject.percentage}%` }}
                                    transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-3 text-[9px] font-bold opacity-40 uppercase tracking-tighter">
                                <span>Present: {subject.present}</span>
                                <span>Total: {subject.total}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Attendance Dossier (History List) */}
            <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}>
                <DetailedHistory records={rawData} isDarkMode={isDarkMode} />
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
