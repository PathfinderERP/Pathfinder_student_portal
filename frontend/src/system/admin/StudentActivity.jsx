import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
    Search, Filter, ChevronLeft, ChevronRight, Activity, Clock, FileText, RotateCcw,
    MonitorPlay, Download, RefreshCw, CheckCircle2, Timer, Eye, X
} from 'lucide-react';
import MultiSelectDropdown from '../../components/common/MultiSelectDropdown';
import ResultReport from '../../pages/student/components/ResultReport';

// Full-Page Student Detail View (replaces modal)

const parseDate = (str) => {
    if (!str) return null;
    let formatted = str;
    if (typeof str === 'string' && !str.includes('Z') && !str.includes('+') && str.includes('T')) {
        formatted = str + 'Z';
    }
    return new Date(formatted);
};

const StudentDetailPage = ({ student, activity, admissionNumber, erpId, isDarkMode, onBack }) => {
    if (!student || !activity) return null;

    const details = student?.student?.studentsDetails?.[0] || student?.studentsDetails?.[0] || student || {};
    const name = details.studentName || details.name || 'Unknown';
    const admNo = student.admissionNumber || 'N/A';
    const course = student.course?.courseName || 'N/A';
    const centre = student.centre || 'N/A';
    const className = student.class?.name || student.student?.studentsDetails?.[0]?.className || 'N/A';
    const email = details.studentEmail || 'N/A';

    const { token, getApiUrl } = useAuth();
    const [activeDetail, setActiveDetail] = useState(null);
    const [cachedData, setCachedData] = useState({}); // { logins: [...], videos: [...], ... }
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [studyView, setStudyView] = useState('date');       // 'date' | 'tab'
    const [attendanceView, setAttendanceView] = useState('date'); // 'date' | 'subject'

    // Attendance Filters State
    const [attFilterDate, setAttFilterDate] = useState('');
    const [attFilterSubject, setAttFilterSubject] = useState('All');
    const [attFilterTeacher, setAttFilterTeacher] = useState('All');
    const [attFilterStatus, setAttFilterStatus] = useState('All');

    // Report View State
    const [selectedReport, setSelectedReport] = useState(null);


    const fetchDetail = useCallback(async (type) => {
        if (activeDetail === type) { setActiveDetail(null); return; }
        setActiveDetail(type);
        
        // If data is already cached, don't reload
        if (cachedData[type]) {
            return;
        }

        setLoadingDetail(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(
                `${apiUrl}/api/admin/student-activity-detail/${admissionNumber}/`,
                { params: { type, erp_id: erpId }, headers: { Authorization: `Bearer ${token}` } }
            );
            setCachedData(prev => ({ ...prev, [type]: res.data || [] }));
        } catch (e) {
            setCachedData(prev => ({ ...prev, [type]: [] }));
        } finally {
            setLoadingDetail(false);
        }
    }, [activeDetail, cachedData, admissionNumber, erpId, token, getApiUrl]);

    const handleRefreshDetail = useCallback(async () => {
        if (!activeDetail) return;
        setLoadingDetail(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(
                `${apiUrl}/api/admin/student-activity-detail/${admissionNumber}/`,
                { params: { type: activeDetail, erp_id: erpId }, headers: { Authorization: `Bearer ${token}` } }
            );
            setCachedData(prev => ({ ...prev, [activeDetail]: res.data || [] }));
        } catch (e) {
            setCachedData(prev => ({ ...prev, [activeDetail]: [] }));
        } finally {
            setLoadingDetail(false);
        }
    }, [activeDetail, admissionNumber, erpId, token, getApiUrl]);


    const fmtDate = useCallback((str) => {
        if (!str) return 'N/A';
        const d = parseDate(str);
        if (!d || isNaN(d)) return str;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }, [parseDate]);

    const fmtTime = useCallback((str) => {
        if (!str) return null;
        // Handle "HH:MM" or ISO
        if (str.includes('T')) {
            const d = parseDate(str);
            return d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
        }
        return str;
    }, [parseDate]);

    const renderDetailTable = () => {
        const detailData = cachedData[activeDetail] || [];
        if (loadingDetail) return (
            <div className="flex items-center justify-center py-10 gap-3">
                <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading records...</span>
            </div>
        );
        if (!detailData.length) return (
            <div className={`text-center py-10 text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No records found.</div>
        );

        if (activeDetail === 'logins') return (
            <table className="w-full text-xs">
                <thead><tr className={`${isDarkMode ? 'text-slate-400 border-white/10' : 'text-slate-500 border-slate-200'} border-b`}>
                    <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Date & Time</th>
                    <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">IP Address</th>
                    <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">Status</th>
                </tr></thead>
                <tbody>{detailData.map((r, i) => {
                    const parsed = parseDate(r.created_at);
                    return (
                        <tr key={i} className={`border-b ${isDarkMode ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50'}`}>
                            <td className="py-3 px-4 font-mono">{parsed ? parsed.toLocaleString('en-IN') : 'N/A'}</td>
                            <td className="py-3 px-4 font-mono">{r.ip_address || 'N/A'}</td>
                            <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${r.status === 'Success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{r.status}</span></td>
                        </tr>
                    );
                })}</tbody>
            </table>
        );

        if (activeDetail === 'videos') {
            const byVideo = {};
            detailData.forEach(r => {
                const title = r.path || 'Unknown Video';
                if (!byVideo[title]) {
                    byVideo[title] = {
                        duration: 0,
                        isCompleted: false,
                        latestTimestamp: null,
                    };
                }
                byVideo[title].duration = Math.max(byVideo[title].duration, r.duration || 0);
                if (r.activity_type === 'video_complete') {
                    byVideo[title].isCompleted = true;
                }
                const currentTS = parseDate(r.timestamp);
                const existingTS = parseDate(byVideo[title].latestTimestamp);
                if (!existingTS || (currentTS && currentTS > existingTS)) {
                    byVideo[title].latestTimestamp = r.timestamp;
                }
            });

            const aggregatedVideos = Object.entries(byVideo).map(([title, data]) => ({
                title,
                ...data
            })).sort((a, b) => {
                const da = parseDate(a.latestTimestamp);
                const db = parseDate(b.latestTimestamp);
                return (db || 0) - (da || 0);
            });

            return (
                <table className="w-full text-xs">
                    <thead><tr className={`${isDarkMode ? 'text-slate-400 border-white/10' : 'text-slate-500 border-slate-200'} border-b`}>
                        <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Video / Module</th>
                        <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">Duration Watched</th>
                        <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">Status</th>
                        <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Last Watched</th>
                    </tr></thead>
                    <tbody>{aggregatedVideos.map((r, i) => {
                        const mins = (r.duration / 60).toFixed(1);
                        const durationStr = `${mins} MIN`;
                        return (
                            <tr key={i} className={`border-b ${isDarkMode ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50'}`}>
                                <td className="py-3 px-4 font-medium">{r.title}</td>
                                <td className="py-3 px-4 text-center font-mono text-indigo-500 font-bold">{r.duration > 0 ? durationStr : '—'}</td>
                                <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${r.isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>{r.isCompleted ? 'Completed' : 'Played'}</span></td>
                                <td className="py-3 px-4">{r.latestTimestamp ? fmtDate(r.latestTimestamp) : 'N/A'}</td>
                            </tr>
                        );
                    })}</tbody>
                </table>
            );
        }

        if (activeDetail === 'tests') return (
            <table className="w-full text-xs">
                <thead><tr className={`${isDarkMode ? 'text-slate-400 border-white/10' : 'text-slate-500 border-slate-200'} border-b`}>
                    <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Test Name</th>
                    <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">Score</th>
                    <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">%</th>
                    <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Submitted</th>
                    <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">Action</th>
                </tr></thead>
                <tbody>{detailData.map((r, i) => (
                    <tr key={i} className={`border-b ${isDarkMode ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50'}`}>
                        <td className="py-3 px-4 font-medium max-w-xs truncate">{r.test_name}</td>
                        <td className="py-3 px-4 text-center font-bold">{r.score}{r.total_marks ? `/${r.total_marks}` : ''}</td>
                        <td className="py-3 px-4 text-center">{r.percentage != null ? <span className={`font-bold ${r.percentage >= 60 ? 'text-emerald-500' : r.percentage >= 40 ? 'text-orange-500' : 'text-red-500'}`}>{r.percentage}%</span> : '—'}</td>
                        <td className="py-3 px-4">{r.submitted_at ? fmtDate(r.submitted_at) : 'N/A'}</td>
                        <td className="py-3 px-4 text-center">
                            {r.id && (
                                <button
                                    onClick={() => setSelectedReport({ id: r.id, enrollment: admissionNumber })}
                                    className="bg-[#4871D9] hover:bg-[#3D60B8] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-[4px] transition-all active:scale-95 shadow-lg shadow-blue-500/10"
                                >
                                    Report
                                </button>
                            )}
                        </td>
                    </tr>
                ))}</tbody>
            </table>
        );

        if (activeDetail === 'attendance') {
            const detailData = cachedData[activeDetail] || [];
            // Apply filtering client-side
            const filteredAttendance = detailData.filter(r => {
                const status = r.attendanceStatus || r.status;
                const dateVal = r.classDate || r.date || r.classScheduleId?.date;
                const teacher = r.teacherId?.name || r.teacherName || '—';
                const subject = r.subject || r.subjectName || r.subjectId?.subjectName || '—';
                
                const matchStatus = attFilterStatus === 'All' || status === attFilterStatus;
                const matchSubject = attFilterSubject === 'All' || subject === attFilterSubject;
                const matchTeacher = attFilterTeacher === 'All' || teacher === attFilterTeacher;
                
                let matchDate = true;
                if (attFilterDate && dateVal) {
                    const parsedDate = parseDate(dateVal);
                    const formattedRowDate = parsedDate ? parsedDate.toISOString().split('T')[0] : '';
                    matchDate = formattedRowDate === attFilterDate;
                }

                return matchStatus && matchSubject && matchTeacher && matchDate;
            });

            // Get unique values for filters from full un-filtered list
            const uniqueSubjects = ['All', ...new Set(detailData.map(r => r.subject || r.subjectName || r.subjectId?.subjectName || '—').filter(Boolean))].sort();
            const uniqueTeachers = ['All', ...new Set(detailData.map(r => r.teacherId?.name || r.teacherName || '—').filter(Boolean))].sort();

            // Group by subject (using filtered data)
            const bySubject = {};
            let totalClasses = 0;
            filteredAttendance.forEach(r => {
                const subject = r.subject || r.subjectName || r.subjectId?.subjectName || 'Unknown';
                const status = r.attendanceStatus || r.status;
                if (!bySubject[subject]) bySubject[subject] = { present: 0, absent: 0, total: 0 };
                bySubject[subject].total++;
                totalClasses++;
                if (status === 'Present') bySubject[subject].present++;
                else bySubject[subject].absent++;
            });
            const subjectRows = Object.entries(bySubject).sort((a, b) => b[1].total - a[1].total);

            const ToggleBar = () => (
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setAttendanceView('date')} className={`px-3 py-1 rounded text-[11px] font-black uppercase tracking-wider transition-all ${attendanceView === 'date' ? 'bg-emerald-500 text-white' : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200')}`}>By Date</button>
                        <button onClick={() => setAttendanceView('subject')} className={`px-3 py-1 rounded text-[11px] font-black uppercase tracking-wider transition-all ${attendanceView === 'subject' ? 'bg-emerald-500 text-white' : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200')}`}>By Subject</button>
                    </div>

                    {/* Filter controls */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {/* Date Filter */}
                        <div className="flex flex-col">
                            <input
                                type="date"
                                value={attFilterDate}
                                onChange={(e) => setAttFilterDate(e.target.value)}
                                className={`px-2 py-1 border rounded-[5px] focus:outline-none text-xs ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                            />
                        </div>

                        {/* Subject Filter */}
                        <div className="flex flex-col">
                            <select
                                value={attFilterSubject}
                                onChange={(e) => setAttFilterSubject(e.target.value)}
                                className={`px-2 py-1 border rounded-[5px] focus:outline-none text-xs ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                            >
                                {uniqueSubjects.map(sub => <option key={sub} value={sub}>{sub === 'All' ? 'All Subjects' : sub}</option>)}
                            </select>
                        </div>

                        {/* Teacher Filter */}
                        <div className="flex flex-col">
                            <select
                                value={attFilterTeacher}
                                onChange={(e) => setAttFilterTeacher(e.target.value)}
                                className={`px-2 py-1 border rounded-[5px] focus:outline-none text-xs ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                            >
                                {uniqueTeachers.map(tch => <option key={tch} value={tch}>{tch === 'All' ? 'All Teachers' : tch}</option>)}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="flex flex-col">
                            <select
                                value={attFilterStatus}
                                onChange={(e) => setAttFilterStatus(e.target.value)}
                                className={`px-2 py-1 border rounded-[5px] focus:outline-none text-xs ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                            >
                                <option value="All">All Status</option>
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                            </select>
                        </div>

                        {/* Reset Button */}
                        {(attFilterDate || attFilterSubject !== 'All' || attFilterTeacher !== 'All' || attFilterStatus !== 'All') && (
                            <button
                                onClick={() => {
                                    setAttFilterDate('');
                                    setAttFilterSubject('All');
                                    setAttFilterTeacher('All');
                                    setAttFilterStatus('All');
                                }}
                                className={`px-2 py-1 rounded-[5px] text-[10px] font-black uppercase tracking-wider transition-all ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            );

            if (attendanceView === 'subject') return (
                <div>
                    <ToggleBar />
                    <div className="p-5 space-y-4">
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Filtered total classes: <span className={isDarkMode ? 'text-white' : 'text-slate-800'}>{totalClasses}</span>
                        </div>
                        {subjectRows.map(([subject, data], i) => {
                            const pct = Math.round((data.present / data.total) * 100) || 0;
                            const barColor = pct >= 75 ? 'from-emerald-500 to-green-400' : pct >= 50 ? 'from-amber-500 to-yellow-400' : 'from-red-500 to-rose-400';
                            const pctText = pct >= 75 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500';
                            return (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className={`text-xs font-black uppercase tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{subject}</span>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <span className="text-emerald-500">{data.present}P</span>
                                                {' / '}
                                                <span className="text-red-500">{data.absent}A</span>
                                                {' / '}{data.total} classes
                                            </span>
                                            <span className={`text-sm font-black min-w-[42px] text-right ${pctText}`}>{pct}%</span>
                                        </div>
                                    </div>
                                    <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                        <div className={`h-2 rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );

            return (
                <div>
                    <ToggleBar />
                    <table className="w-full text-xs">
                        <thead><tr className={`${isDarkMode ? 'text-slate-400 border-white/10' : 'text-slate-500 border-slate-200'} border-b`}>
                            <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Date</th>
                            <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Subject</th>
                            <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Teacher</th>
                            <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">Start Time</th>
                            <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">End Time</th>
                            <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">Status</th>
                        </tr></thead>
                        <tbody>{filteredAttendance.map((r, i) => {
                            const status = r.attendanceStatus || r.status;
                            const dateVal = r.classDate || r.date || r.classScheduleId?.date;
                            const teacher = r.teacherId?.name || r.teacherName || '—';
                            const subject = r.subject || r.subjectName || r.subjectId?.subjectName || '—';
                            const startT = r.startTime || r.classScheduleId?.startTime;
                            const endT = r.endTime || r.classScheduleId?.endTime;
                            return (
                                <tr key={i} className={`border-b ${isDarkMode ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50'}`}>
                                    <td className="py-3 px-4 font-medium">{fmtDate(dateVal)}</td>
                                    <td className="py-3 px-4 font-medium">{subject}</td>
                                    <td className="py-3 px-4">{teacher}</td>
                                    <td className="py-3 px-4 text-center font-mono">{fmtTime(startT) || '—'}</td>
                                    <td className="py-3 px-4 text-center font-mono">{fmtTime(endT) || '—'}</td>
                                    <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${status === 'Present' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{status}</span></td>
                                </tr>
                            );
                        })}</tbody>
                    </table>
                </div>
            );
        }

        if (activeDetail === 'study_time') {
            const detailData = cachedData[activeDetail] || [];
            // --- By Date view ---
            const byDate = {};
            const byTab = {};
            let totalAll = 0;
            detailData.forEach(r => {
                const dur = r.duration || 0;
                totalAll += dur;
                // group by date
                const dateKey = r.timestamp ? fmtDate(r.timestamp) : 'Unknown';
                if (!byDate[dateKey]) byDate[dateKey] = { totalSeconds: 0, pages: new Set(), rawDate: r.timestamp };
                byDate[dateKey].totalSeconds += dur;
                const pageLabel = r.path ? r.path.replace('StudentPortal/', '').split('/')[0] || 'Dashboard' : 'Portal';
                byDate[dateKey].pages.add(pageLabel);
                // group by tab
                const tabKey = r.path ? r.path.replace('StudentPortal/', '').split('/')[0] || 'Dashboard' : 'Portal';
                if (!byTab[tabKey]) byTab[tabKey] = 0;
                byTab[tabKey] += dur;
            });
            const grouped = Object.entries(byDate).sort((a, b) => {
                const da = parseDate(a[1].rawDate);
                const db = parseDate(b[1].rawDate);
                return (db || 0) - (da || 0);
            });
            const tabRows = Object.entries(byTab).sort((a, b) => b[1] - a[1]);
            const maxTabSeconds = tabRows.length ? tabRows[0][1] : 1;

            return (
                <div>
                    {/* View Toggle */}
                    <div className={`flex items-center gap-2 px-4 py-2 border-b ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                        <button
                            onClick={() => setStudyView('date')}
                            className={`px-3 py-1 rounded text-[11px] font-black uppercase tracking-wider transition-all ${
                                studyView === 'date'
                                    ? 'bg-teal-500 text-white'
                                    : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200')
                            }`}
                        >By Date</button>
                        <button
                            onClick={() => setStudyView('tab')}
                            className={`px-3 py-1 rounded text-[11px] font-black uppercase tracking-wider transition-all ${
                                studyView === 'tab'
                                    ? 'bg-teal-500 text-white'
                                    : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200')
                            }`}
                        >By Tab</button>
                    </div>

                    {studyView === 'date' ? (
                        <table className="w-full text-xs">
                            <thead><tr className={`${isDarkMode ? 'text-slate-400 border-white/10' : 'text-slate-500 border-slate-200'} border-b`}>
                                <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Date</th>
                                <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Pages Visited</th>
                                <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">Total Study Time</th>
                            </tr></thead>
                            <tbody>{grouped.map(([date, data], i) => (
                                <tr key={i} className={`border-b ${isDarkMode ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50'}`}>
                                    <td className="py-3 px-4 font-medium">{date}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex flex-wrap gap-1">
                                            {[...data.pages].slice(0, 5).map((p, j) => (
                                                <span key={j} className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{p}</span>
                                            ))}
                                            {data.pages.size > 5 && <span className="text-[10px] opacity-50">+{data.pages.size - 5} more</span>}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center font-bold text-teal-500">{formatTime(data.totalSeconds)}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    ) : (
                        <div className="p-4 space-y-3">
                            <div className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Total across all sessions: <span className="text-teal-500">{formatTime(totalAll)}</span>
                            </div>
                            {tabRows.map(([tab, seconds], i) => {
                                const pct = Math.round((seconds / totalAll) * 100) || 0;
                                const barPct = Math.round((seconds / maxTabSeconds) * 100);
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{tab}</span>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{pct}%</span>
                                                <span className="text-xs font-black text-teal-500">{formatTime(seconds)}</span>
                                            </div>
                                        </div>
                                        <div className={`w-full rounded-full h-1.5 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                            <div
                                                className="h-1.5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500"
                                                style={{ width: `${barPct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    const StatCard = ({ icon: Icon, color, value, label, detailKey }) => (
        <div
            onClick={() => fetchDetail(detailKey)}
            className={`p-6 rounded-[5px] border text-center cursor-pointer transition-all duration-200 group
                ${activeDetail === detailKey
                    ? (isDarkMode ? 'border-orange-500/50 bg-orange-500/10 shadow-lg shadow-orange-500/10' : 'border-orange-400 bg-orange-50')
                    : (isDarkMode ? 'bg-[#0B0F15] border-white/5 hover:border-white/20 hover:bg-white/5' : 'bg-white border-slate-200 shadow-sm hover:border-orange-300 hover:shadow-md')
                }`}
        >
            <Icon className={`w-8 h-8 mx-auto mb-3 ${color} transition-transform group-hover:scale-110`} />
            <div className="text-3xl font-black">{value}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">{label}</div>
            <div className={`text-[9px] mt-2 font-bold uppercase tracking-wider ${activeDetail === detailKey ? 'text-orange-500' : 'opacity-25'}`}>
                {activeDetail === detailKey ? '▲ Collapse' : '▼ View Details'}
            </div>
        </div>
    );

    const detailTitles = { logins: 'Login History', videos: 'Videos Watched', tests: 'Test Submissions', attendance: 'Attendance Records', study_time: 'Study Sessions' };

    // Calculate dynamic stats from cachedData if loaded, otherwise fall back to summary
    const uniqueVideosCount = useMemo(() => {
        if (cachedData.videos) {
            // Count unique video paths/titles from the detail logs
            return new Set(cachedData.videos.map(v => v.path).filter(Boolean)).size;
        }
        return activity.videosWatched || 0;
    }, [cachedData.videos, activity.videosWatched]);

    if (selectedReport) {
        return (
            <div className="space-y-4 animate-fade-in-up">
                <ResultReport
                    test={selectedReport}
                    isDarkMode={isDarkMode}
                    onBack={() => setSelectedReport(null)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header with Back Button */}
            <div className={`flex items-center justify-between p-5 rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className={`flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-bold transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                        <ChevronLeft size={16} /> Back to List
                    </button>
                    <div className={`w-px h-8 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
                    <div>
                        <h2 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{name}</h2>
                        <div className="text-xs font-bold text-orange-500 uppercase tracking-widest">ID: {admNo}</div>
                    </div>
                </div>
                <div className={`hidden md:flex items-center gap-6 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div><span className="opacity-50 uppercase tracking-wider font-bold">Class</span><div className="font-bold text-sm mt-0.5">{className}</div></div>
                    <div><span className="opacity-50 uppercase tracking-wider font-bold">Course</span><div className="font-bold text-sm mt-0.5">{course}</div></div>
                    <div><span className="opacity-50 uppercase tracking-wider font-bold">Centre</span><div className="font-bold text-sm mt-0.5">{centre}</div></div>
                    <div><span className="opacity-50 uppercase tracking-wider font-bold">Email</span><div className="font-bold text-sm mt-0.5">{email}</div></div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard icon={Activity} color="text-blue-500" value={activity.loginCount || 0} label="App Logins" detailKey="logins" />
                <StatCard icon={MonitorPlay} color="text-purple-500" value={uniqueVideosCount} label="Videos Watched" detailKey="videos" />
                <StatCard icon={FileText} color="text-orange-500" value={`${activity.testsTaken || 0}/${activity.testsTotal || 0}`} label="Tests Taken" detailKey="tests" />
                <StatCard icon={CheckCircle2} color="text-emerald-500" value={activity.attendanceTotal ? `${activity.attendancePresent}/${activity.attendanceTotal}` : '—'} label="Attendance" detailKey="attendance" />
                <StatCard icon={Timer} color="text-teal-500" value={formatTime(activity.totalStudyTimeSeconds)} label="Study Time" detailKey="study_time" />
                <div className={`p-6 rounded-[5px] border text-center ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <Clock className="w-8 h-8 mx-auto mb-3 text-slate-500" />
                    <div className="text-sm font-black leading-tight">{activity.lastActive ? fmtDate(activity.lastActive) : 'Never'}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">Last Active</div>
                </div>
            </div>

            {/* Detail Table Panel */}
            {activeDetail && (
                <div className={`rounded-[5px] border overflow-hidden ${isDarkMode ? 'border-white/10 bg-[#0B0F15]' : 'border-slate-200 bg-white'}`}>
                    <div className={`px-5 py-3 border-b flex items-center justify-between gap-3 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
                        <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{detailTitles[activeDetail]}</span>
                        <div className="flex items-center gap-3 ml-auto">
                            {!loadingDetail && <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{(cachedData[activeDetail] || []).length} record{((cachedData[activeDetail] || []).length) !== 1 ? 's' : ''}</span>}
                            <button
                                onClick={handleRefreshDetail}
                                disabled={loadingDetail}
                                className={`p-1 rounded-[3px] transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}
                                title="Refresh Detail Records"
                            >
                                <RefreshCw size={14} className={loadingDetail ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                    <div className={`overflow-x-auto ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {renderDetailTable()}
                    </div>
                </div>
            )}
        </div>
    );
};


const formatTime = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
};

const StudentActivity = ({ studentsData = [], isERPLoading, isDarkMode, onRefresh }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        course: [],
        status: ['ACTIVE'],
        centre: [],
        className: [],
        examTag: []
    });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Auth and Activity Loading
    const { token, getApiUrl } = useAuth();
    const [activityData, setActivityData] = useState({});
    const [loadingActivity, setLoadingActivity] = useState({});

    const loadActivity = useCallback(async (student) => {
        const admissionNumber = student.admissionNumber;
        const erpId = student.student?._id || student._id;
        if (!admissionNumber) return;

        setLoadingActivity(prev => ({ ...prev, [admissionNumber]: true }));
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/admin/student-activity-summary/${admissionNumber}/`, {
                params: { erp_id: erpId },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setActivityData(prev => ({ ...prev, [admissionNumber]: response.data }));
        } catch (error) {
            console.error('Failed to load activity:', error);
        } finally {
            setLoadingActivity(prev => ({ ...prev, [admissionNumber]: false }));
        }
    }, [token, getApiUrl]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    const activeStudents = useMemo(() => {
        return studentsData.filter(student => {
            const name = student.student?.studentsDetails?.[0]?.studentName || student.studentName;
            return name && name.trim() !== '';
        });
    }, [studentsData]);

    const extractExamTag = (s) => {
        let val = s.exam_tag || s.student?.studentsDetails?.[0]?.targetExam || s.target_exam || s.targetExam || s.examTag;
        if (val && typeof val === 'object') {
            val = val.examName || val.name || val.targetExamName || val.title || val.exam_name;
        }
        if (typeof val === 'string' && val.length === 24) {
             val = s.exam_tag_name || s.student?.studentsDetails?.[0]?.targetExamName || val;
        }
        return val ? String(val) : null;
    };

    const filteredStudents = useMemo(() => {
        return activeStudents.filter(student => {
            const name = (student.student?.studentsDetails?.[0]?.studentName || student.studentName || '').toLowerCase();
            const email = (student.student?.studentsDetails?.[0]?.studentEmail || '').toLowerCase();
            const mobile = (student.student?.studentsDetails?.[0]?.mobileNum || '').toLowerCase();
            const admissionNumber = (student.admissionNumber || '').toLowerCase();
            const courseName = student.course?.courseName || '';
            const centerName = student.centre || '';
            const status = student.admissionStatus || '';
            const className = student.class?.name || student.student?.studentsDetails?.[0]?.className || student.class || '';
            const examTag = extractExamTag(student) || '';

            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                name.includes(searchLower) ||
                email.includes(searchLower) ||
                mobile.includes(searchLower) ||
                admissionNumber.includes(searchLower);

            const matchesCourse = filters.course.length === 0 || filters.course.includes(courseName);
            const matchesCentre = filters.centre.length === 0 || filters.centre.includes(centerName);
            const matchesStatus = filters.status.length === 0 || filters.status.includes(status);
            const matchesClass = filters.className.length === 0 || filters.className.includes(className);
            const matchesExamTag = filters.examTag.length === 0 || filters.examTag.includes(examTag);

            return matchesSearch && matchesCourse && matchesCentre && matchesStatus && matchesClass && matchesExamTag;
        });
    }, [activeStudents, searchQuery, filters]);

    // Unique values for filters
    const uniqueCourses = useMemo(() => [...new Set(activeStudents.map(s => s.course?.courseName ? String(s.course.courseName) : null).filter(Boolean))], [activeStudents]);
    const uniqueCentres = useMemo(() => [...new Set(activeStudents.map(s => s.centre ? String(s.centre) : null).filter(Boolean))], [activeStudents]);
    const uniqueClasses = useMemo(() => [...new Set(activeStudents.map(s => {
        let val = s.class?.name || s.student?.studentsDetails?.[0]?.className || s.class;
        if (val && typeof val === 'object') val = val.name || val.className;
        return val ? String(val) : null;
    }).filter(Boolean))], [activeStudents]);
    
    const uniqueExamTags = useMemo(() => [...new Set(activeStudents.map(extractExamTag).filter(Boolean))], [activeStudents]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const displayedStudents = useMemo(() => {
        const startIdx = (currentPage - 1) * itemsPerPage;
        return filteredStudents.slice(startIdx, startIdx + itemsPerPage);
    }, [filteredStudents, currentPage, itemsPerPage]);

    const loadAllDisplayedActivity = useCallback((force = false) => {
        displayedStudents.forEach(student => {
            if (force || (!activityData[student.admissionNumber] && !loadingActivity[student.admissionNumber])) {
                loadActivity(student);
            }
        });
    }, [displayedStudents, activityData, loadingActivity, loadActivity]);

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({ course: [], status: ['ACTIVE'], centre: [], className: [], examTag: [] });
        setSearchQuery('');
        setCurrentPage(1);
    };

    if (isERPLoading && activeStudents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                <p className="text-slate-500">Loading student data...</p>
            </div>
        );
    }

    // If a student is selected, show full detail page
    if (selectedStudent) {
        return (
            <StudentDetailPage
                student={selectedStudent}
                activity={activityData[selectedStudent.admissionNumber] || {}}
                admissionNumber={selectedStudent.admissionNumber}
                erpId={selectedStudent.student?._id || selectedStudent._id}
                isDarkMode={isDarkMode}
                onBack={() => setSelectedStudent(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className={`rounded-[5px] border p-6 shadow-sm ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                    <div>
                        <h2 className={`text-2xl font-black uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            Student <span className="text-orange-500">Activity</span>
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Consolidated activity data for all students
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 border rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'}`}
                            />
                        </div>
                        <button
                            onClick={() => loadAllDisplayedActivity(false)}
                            title="Load Activity for Current Page"
                            className={`p-2 rounded-[5px] border transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500/20' : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100'}`}
                        >
                            <Download size={18} />
                        </button>
                        <button
                            onClick={() => loadAllDisplayedActivity(true)}
                            title="Force Refresh Page Summaries"
                            className={`p-2 rounded-[5px] border transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 rounded-[5px] border transition-colors ${showFilters ? 'bg-orange-500 border-orange-500 text-white' : (isDarkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')}`}
                        >
                            <Filter size={18} />
                        </button>
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                disabled={isERPLoading}
                                className={`p-2 rounded-[5px] border transition-all ${isERPLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                                title="Hard Refresh ERP Data"
                            >
                                <RefreshCw size={18} className={isERPLoading ? 'animate-spin' : ''} />
                            </button>
                        )}
                    </div>
                </div>

                {showFilters && (
                    <div className={`grid grid-cols-1 md:grid-cols-6 gap-4 p-4 mb-6 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <div>
                            <label className={`block text-xs font-bold mb-1 uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Class</label>
                            <MultiSelectDropdown
                                options={uniqueClasses}
                                selected={filters.className}
                                onChange={(val) => { setFilters(p => ({ ...p, className: val })); setCurrentPage(1); }}
                                placeholder="All Classes"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold mb-1 uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Exam Tag</label>
                            <MultiSelectDropdown
                                options={uniqueExamTags}
                                selected={filters.examTag}
                                onChange={(val) => { setFilters(p => ({ ...p, examTag: val })); setCurrentPage(1); }}
                                placeholder="All Exam Tags"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold mb-1 uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Centre</label>
                            <MultiSelectDropdown
                                options={uniqueCentres}
                                selected={filters.centre}
                                onChange={(val) => { setFilters(p => ({ ...p, centre: val })); setCurrentPage(1); }}
                                placeholder="All Centres"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold mb-1 uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Course</label>
                            <MultiSelectDropdown
                                options={uniqueCourses}
                                selected={filters.course}
                                onChange={(val) => { setFilters(p => ({ ...p, course: val })); setCurrentPage(1); }}
                                placeholder="All Courses"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold mb-1 uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status</label>
                            <MultiSelectDropdown
                                options={['ACTIVE', 'INACTIVE', 'PENDING']}
                                selected={filters.status}
                                onChange={(val) => { setFilters(p => ({ ...p, status: val })); setCurrentPage(1); }}
                                placeholder="All Status"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <RotateCcw size={16} /> Clear Filters
                            </button>
                        </div>
                    </div>
                )}

                <div className={`overflow-x-auto border-x border-t rounded-t-[5px] ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <table className="w-full text-sm text-left">
                        <thead className={`font-bold uppercase text-xs ${isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            <tr>
                                <th className="px-4 py-3">Student</th>
                                <th className="px-4 py-3">Course / Centre</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center">App Logins</th>
                                <th className="px-4 py-3 text-center">Videos Watched</th>
                                <th className="px-4 py-3 text-center">Tests Taken</th>
                                <th className="px-4 py-3 text-center">Attendance</th>
                                <th className="px-4 py-3 text-center">Study Time</th>
                                <th className="px-4 py-3 text-right">Last Active</th>
                                <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                            {displayedStudents.length > 0 ? (
                                displayedStudents.map((student, idx) => (
                                    <tr key={student.id || idx} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        <td className="px-4 py-3">
                                            <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.student?.studentsDetails?.[0]?.studentName || student.studentName || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500">
                                                {student.admissionNumber ? <span className="font-semibold text-orange-500/80">#{student.admissionNumber}</span> : ''}
                                                {student.admissionNumber ? ' • ' : ''}
                                                {student.student?.studentsDetails?.[0]?.mobileNum || student.student?.studentsDetails?.[0]?.studentEmail || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className={`font-medium text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{student.course?.courseName || 'N/A'}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wide">{student.centre || 'N/A'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${student.admissionStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {student.admissionStatus || 'N/A'}
                                            </span>
                                        </td>
                                        {activityData[student.admissionNumber] ? (
                                            <>
                                                <td className="px-4 py-3 text-center">
                                                    <div className={`inline-flex items-center justify-center gap-1.5 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        <Activity size={14} className="text-blue-500" title="App Logins" />
                                                        <span>{activityData[student.admissionNumber].loginCount || 0}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className={`inline-flex items-center justify-center gap-1.5 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        <MonitorPlay size={14} className="text-purple-500" title="Videos Watched" />
                                                        <span>{activityData[student.admissionNumber].videosWatched || 0}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className={`inline-flex items-center justify-center gap-1.5 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        <FileText size={14} className="text-orange-500" title="Tests Taken" />
                                                        <span>{activityData[student.admissionNumber].testsTaken || 0}/{activityData[student.admissionNumber].testsTotal || 0}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className={`inline-flex items-center justify-center gap-1.5 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        <CheckCircle2 size={14} className="text-emerald-500" title="Attendance" />
                                                        <span>{activityData[student.admissionNumber].attendanceTotal ? `${activityData[student.admissionNumber].attendancePresent}/${activityData[student.admissionNumber].attendanceTotal}` : '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className={`inline-flex items-center justify-center gap-1.5 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        <Timer size={14} className="text-teal-500" title="Study Time" />
                                                        <span>{formatTime(activityData[student.admissionNumber].totalStudyTimeSeconds)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="inline-flex items-center justify-end gap-1.5 text-xs text-slate-500 w-full">
                                                        <Clock size={12} title="Last Active" />
                                                        <span>{(() => {
                                                            const la = activityData[student.admissionNumber].lastActive;
                                                            const d = la ? parseDate(la) : null;
                                                            return d ? d.toLocaleDateString('en-IN') : 'Never';
                                                        })()}</span>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <td colSpan="6" className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => loadActivity(student)}
                                                    disabled={loadingActivity[student.admissionNumber]}
                                                    className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all w-full max-w-[150px] mx-auto flex items-center justify-center gap-2 ${loadingActivity[student.admissionNumber] ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${isDarkMode ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}
                                                >
                                                    {loadingActivity[student.admissionNumber] ? (
                                                        <div className="w-3 h-3 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                                                    ) : (
                                                        <Download size={12} />
                                                    )}
                                                    {loadingActivity[student.admissionNumber] ? 'Loading...' : 'Load Activity'}
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-center">
                                            {activityData[student.admissionNumber] ? (
                                                <button
                                                    onClick={() => setSelectedStudent(student)}
                                                    className={`p-1.5 rounded-[5px] transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            ) : (
                                                <span className="text-[10px] font-semibold opacity-30 select-none">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className={`px-4 py-8 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        No student activity data found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className={`flex flex-col md:flex-row justify-between items-center gap-4 mt-4 p-4 border border-t-0 rounded-b-[5px] ${isDarkMode ? 'border-white/10 bg-[#10141D]' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredStudents.length)} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} entries
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className={`p-1.5 text-sm border rounded-[5px] focus:outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                        >
                            <option value={50}>50 / page</option>
                            <option value={100}>100 / page</option>
                            <option value={500}>500 / page</option>
                        </select>

                        <div className="flex items-center gap-1 mx-2">
                            <span className={`text-xs font-medium mr-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Go to</span>
                            <input
                                type="number"
                                min="1"
                                max={totalPages || 1}
                                value={currentPage}
                                onChange={(e) => {
                                    let page = parseInt(e.target.value);
                                    if (!isNaN(page)) {
                                        if (page < 1) page = 1;
                                        if (page > (totalPages || 1)) page = totalPages || 1;
                                        setCurrentPage(page);
                                    }
                                }}
                                className={`w-14 p-1.5 text-sm border rounded-[5px] text-center focus:outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50' : 'bg-white border-slate-200 text-slate-800 focus:border-orange-400'}`}
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`p-1.5 rounded-[5px] border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-3 py-1 text-sm font-bold bg-orange-500/10 text-orange-500 rounded-[5px]">
                                {currentPage} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className={`p-1.5 rounded-[5px] border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentActivity;
