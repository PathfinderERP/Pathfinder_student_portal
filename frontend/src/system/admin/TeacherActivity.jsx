import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
    Search, ChevronLeft, ChevronRight, Activity, Clock, RefreshCw, Download, RotateCcw, Filter, MessageCircle, Star, X, Timer, LogIn, Trophy, ArrowRightLeft, Users
} from 'lucide-react';
import MultiSelectDropdown from '../../components/common/MultiSelectDropdown';
import TopperRankTab from '../../components/tabs/TopperRankTab';
import MentorshipConversionTab from '../../components/tabs/MentorshipConversionTab';
import PTMHistoryTab from '../../components/tabs/PTMHistoryTab';

const FEEDBACK_QUESTIONS = [
    "Explains concepts clearly and uses real-world examples to improve understanding.",
    "Maintains excellent classroom discipline and encourages student participation.",
    "Always well-prepared and delivers structured, easy-to-follow lessons.",
    "Provides timely feedback and supports students beyond classroom hours.",
    "Demonstrates strong subject knowledge and effective teaching methodologies.",
    "Creates a positive learning environment that motivates students to perform better.",
    "Uses interactive teaching methods and digital tools effectively.",
    "Regularly tracks student progress and addresses learning gaps proactively.",
    "Encourages critical thinking and problem-solving skills among students.",
    "Shows professionalism, punctuality, and dedication towards student success."
];

const parseDate = (str) => {
    if (!str) return null;
    let formatted = str;
    if (typeof str === 'string' && !str.includes('Z') && !str.includes('+') && str.includes('T')) {
        formatted = str + 'Z';
    }
    return new Date(formatted);
};

const TeacherDetailPage = ({ teacher, activity, username, isDarkMode, onBack }) => {
    if (!teacher || !activity) return null;

    const name = teacher.name || teacher.username || 'Unknown';
    const email = teacher.email || 'N/A';

    const { token, getApiUrl } = useAuth();
    const [activeDetail, setActiveDetail] = useState(null);
    const [cachedData, setCachedData] = useState({});
    const [loadingDetail, setLoadingDetail] = useState(false);
    
    // Feedback Group State
    const [expandedFeedbacks, setExpandedFeedbacks] = useState({});
    const [expandedStudentFeedbacks, setExpandedStudentFeedbacks] = useState({});

    const toggleFeedback = (key) => {
        setExpandedFeedbacks(prev => ({ ...prev, [key]: !prev[key] }));
    };
    
    const toggleStudentFeedback = (key) => {
        setExpandedStudentFeedbacks(prev => ({ ...prev, [key]: !prev[key] }));
    };
    
    // Doubt Modal State
    const [selectedDoubt, setSelectedDoubt] = useState(null);
    const [isDoubtLoading, setIsDoubtLoading] = useState(false);
    const [activePreview, setActivePreview] = useState(null);

    const viewDoubtDetails = async (doubtId) => {
        setIsDoubtLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/doubts/${doubtId}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedDoubt(res.data);
        } catch (e) {
            console.error("Failed to load doubt details:", e);
        } finally {
            setIsDoubtLoading(false);
        }
    };

    const fetchDetail = useCallback(async (type) => {
        if (activeDetail === type) { setActiveDetail(null); return; }
        setActiveDetail(type);
        
        if (type === 'topper_ranks') return;
        if (cachedData[type]) return;

        setLoadingDetail(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(
                `${apiUrl}/api/admin/teacher-activity-detail/${username}/`,
                { params: { type, erp_id: teacher.id }, headers: { Authorization: `Bearer ${token}` } }
            );
            setCachedData(prev => ({ ...prev, [type]: res.data || [] }));
        } catch (e) {
            setCachedData(prev => ({ ...prev, [type]: [] }));
        } finally {
            setLoadingDetail(false);
        }
    }, [activeDetail, cachedData, username, token, getApiUrl]);

    const handleRefreshDetail = useCallback(async () => {
        if (!activeDetail) return;
        setLoadingDetail(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(
                `${apiUrl}/api/admin/teacher-activity-detail/${username}/`,
                { params: { type: activeDetail, erp_id: teacher.id }, headers: { Authorization: `Bearer ${token}` } }
            );
            setCachedData(prev => ({ ...prev, [activeDetail]: res.data || [] }));
        } catch (e) {
            setCachedData(prev => ({ ...prev, [activeDetail]: [] }));
        } finally {
            setLoadingDetail(false);
        }
    }, [activeDetail, username, token, getApiUrl]);

    const fmtDate = useCallback((str) => {
        if (!str) return 'N/A';
        const d = parseDate(str);
        if (!d || isNaN(d)) return str;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }, []);

    const renderDetailTable = () => {
        if (activeDetail === 'topper_ranks') {
            return (
                <div className="p-2 md:p-4">
                    <TopperRankTab teacherUser={teacher} />
                </div>
            );
        }

        if (activeDetail === 'mentorship_conversion') {
            return (
                <div className="p-2 md:p-4">
                    <MentorshipConversionTab 
                        isAdminView={true} 
                        filterMentorName={name} 
                        filterTeacherEmail={email} 
                    />
                </div>
            );
        }

        if (activeDetail === 'ptm_records') {
            return (
                <div className="p-2 md:p-4">
                    <PTMHistoryTab 
                        isAdminView={true} 
                        filterTeacherName={name}
                    />
                </div>
            );
        }

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
        if (activeDetail === 'doubts') return (
            <table className="w-full text-xs">
                <thead><tr className={`${isDarkMode ? 'text-slate-400 border-white/10' : 'text-slate-500 border-slate-200'} border-b`}>
                    <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Created</th>
                    <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Assigned</th>
                    <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Resolved</th>
                    <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Time Taken</th>
                    <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Student</th>
                    <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Subject</th>
                    <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Title</th>
                    <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-right font-bold uppercase tracking-wider">Action</th>
                </tr></thead>
                <tbody>{detailData.map((r, i) => {
                    const parsed = parseDate(r.created_at);
                    const assignParsed = parseDate(r.assign_date);
                    const resolvedParsed = parseDate(r.resolved_at);
                    
                    let timeTaken = '-';
                    if (resolvedParsed && assignParsed) {
                        const diffMs = resolvedParsed - assignParsed;
                        if (diffMs >= 0) {
                            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            if (days > 0) timeTaken = `${days}d ${hours}h`;
                            else if (hours > 0) timeTaken = `${hours}h`;
                            else {
                                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                timeTaken = `${mins}m`;
                            }
                        }
                    }

                    return (
                        <tr key={i} className={`border-b ${isDarkMode ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50'}`}>
                            <td className="py-3 px-4 font-mono">{parsed ? parsed.toLocaleDateString('en-IN') : 'N/A'}</td>
                            <td className="py-3 px-4 font-mono">{assignParsed ? assignParsed.toLocaleDateString('en-IN') : '-'}</td>
                            <td className="py-3 px-4 font-mono">{resolvedParsed ? resolvedParsed.toLocaleDateString('en-IN') : '-'}</td>
                            <td className="py-3 px-4 font-bold text-[10px] text-orange-500">{timeTaken}</td>
                            <td className="py-3 px-4 font-bold">{r.student_name || 'N/A'}</td>
                            <td className="py-3 px-4 font-medium">{r.subject || 'N/A'}</td>
                            <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate" title={r.title}>{r.title || 'N/A'}</td>
                            <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${r.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>{r.status}</span></td>
                            <td className="py-3 px-4 text-right">
                                <button
                                    onClick={() => viewDoubtDetails(r.id)}
                                    className={`px-3 py-1.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white'}`}
                                >
                                    View
                                </button>
                            </td>
                        </tr>
                    );
                })}</tbody>
            </table>
        );
        
        if (activeDetail === 'feedback') {
            const grouped = detailData.reduce((acc, curr) => {
                const dateKey = curr.date_of_class ? curr.date_of_class.split('T')[0].split(' ')[0] : 'UnknownDate';
                const key = `${dateKey}_${curr.subject || 'Unknown'}`;
                if (!acc[key]) {
                    acc[key] = {
                        date_of_class: curr.date_of_class,
                        start_time: curr.start_time,
                        end_time: curr.end_time,
                        entry_time: curr.entry_time,
                        exit_time: curr.exit_time,
                        subject: curr.subject,
                        chapter_name: curr.chapter_name,
                        topics: curr.topics,
                        students: [],
                        total_score: 0
                    };
                }
                acc[key].students.push(curr);
                if (!acc[key].entry_time && curr.entry_time) acc[key].entry_time = curr.entry_time;
                if (!acc[key].exit_time && curr.exit_time) acc[key].exit_time = curr.exit_time;
                if (!acc[key].chapter_name || acc[key].chapter_name === 'N/A') acc[key].chapter_name = curr.chapter_name;
                if ((!acc[key].topics || acc[key].topics.length === 0) && curr.topics) acc[key].topics = curr.topics;
                acc[key].total_score += parseFloat(curr.average_score) || 0;
                return acc;
            }, {});

            const groupedArray = Object.entries(grouped).map(([key, val]) => ({
                key,
                ...val,
                avg_score: (val.total_score / val.students.length).toFixed(1)
            }));

            const cleanActualTime = (t) => {
                if (!t || t === '--:--') return null;
                if (t.includes(',')) {
                    return t.split(',')[1]?.trim() || t;
                }
                return t;
            };

            return (
                <table className="w-full text-xs">
                    <thead><tr className={`${isDarkMode ? 'text-slate-400 border-white/10' : 'text-slate-500 border-slate-200'} border-b`}>
                        <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Date of Class</th>
                        <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Class Time</th>
                        <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Entry / Exit</th>
                        <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Subject & Details</th>
                        <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">Feedbacks</th>
                        <th className="py-3 px-4 text-center font-bold uppercase tracking-wider">Avg Class Score</th>
                        <th className="py-3 px-4"></th>
                    </tr></thead>
                    <tbody>{groupedArray.map((group) => {
                        const parsed = parseDate(group.date_of_class);
                        const isExpanded = expandedFeedbacks[group.key];
                        
                        const formatTime = (t) => t ? t.substring(0, 5) : '?';
                        const timeStr = group.start_time || group.end_time ? `${formatTime(group.start_time)} - ${formatTime(group.end_time)}` : '-';
                        const topicsStr = Array.isArray(group.topics) ? group.topics.join(', ') : (group.topics || '');

                        const entryDisplay = cleanActualTime(group.entry_time);
                        const exitDisplay = cleanActualTime(group.exit_time);
                        const entryExitStr = (entryDisplay || exitDisplay) ? `${entryDisplay || '--:--'} - ${exitDisplay || '--:--'}` : '--:-- - --:--';

                        return (
                            <React.Fragment key={group.key}>
                                <tr 
                                    onClick={() => toggleFeedback(group.key)}
                                    className={`border-b cursor-pointer transition-colors ${isDarkMode ? 'border-white/5 hover:bg-white/[0.04]' : 'border-slate-100 hover:bg-slate-100'} ${isExpanded ? (isDarkMode ? 'bg-white/[0.02]' : 'bg-slate-50') : ''}`}
                                >
                                    <td className="py-3 px-4 font-mono">{parsed ? parsed.toLocaleDateString('en-IN') : 'N/A'}</td>
                                    <td className="py-3 px-4 font-mono text-[11px] opacity-80">{timeStr}</td>
                                    <td className="py-3 px-4 font-mono text-[11px] opacity-80 text-emerald-500 font-semibold">{entryExitStr}</td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold">{group.subject || 'N/A'}</div>
                                        {((group.chapter_name && group.chapter_name !== 'N/A') || topicsStr) && (
                                            <div className="text-[10px] opacity-80 mt-1 space-y-0.5">
                                                {group.chapter_name && group.chapter_name !== 'N/A' && (
                                                    <div className="text-amber-500 font-semibold">Ch: {group.chapter_name}</div>
                                                )}
                                                {topicsStr && (
                                                    <div className="text-slate-400 truncate max-w-[220px]" title={topicsStr}>
                                                        Topic: {topicsStr}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-center font-bold text-orange-500">{group.students.length}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className="font-bold flex items-center justify-center gap-1">
                                            {group.avg_score} <Star size={12} className="text-amber-400 fill-amber-400" />
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                                            {isExpanded ? <ChevronLeft size={16} className="-rotate-90 transition-transform" /> : <ChevronRight size={16} className="transition-transform" />}
                                        </button>
                                    </td>
                                </tr>
                                {isExpanded && group.students.map((r, i) => (
                                    <React.Fragment key={r.id || i}>
                                        <tr 
                                            onClick={() => toggleStudentFeedback(r.id)}
                                            className={`border-b cursor-pointer transition-colors ${isDarkMode ? 'border-white/5 bg-black/20 hover:bg-white/[0.04]' : 'border-slate-50 bg-slate-50/50 hover:bg-slate-100'}`}
                                        >
                                            <td className="py-2 px-4 pl-12 font-mono text-[10px] opacity-60" colSpan="3">Student:</td>
                                            <td className="py-2 px-4 font-bold text-[11px]">
                                                {r.student_name || 'N/A'}
                                                <div className="font-normal text-[9px] opacity-70 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                    {r.student_class && <span>Class: {r.student_class}</span>}
                                                    {r.student_center && <span>• Center: {r.student_center}</span>}
                                                    {r.student_exam_tag && <span>• Exam: {r.student_exam_tag}</span>}
                                                </div>
                                            </td>
                                            <td colSpan="2" className="py-2 px-4 text-center">
                                                <span className="font-bold text-[11px] flex items-center justify-center gap-1">
                                                    {r.average_score} <Star size={10} className="text-amber-400 fill-amber-400 opacity-80" />
                                                </span>
                                            </td>
                                            <td className="py-2 px-4 text-right">
                                                <button className={`p-1 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                                                    {expandedStudentFeedbacks[r.id] ? <ChevronLeft size={14} className="-rotate-90 transition-transform" /> : <ChevronRight size={14} className="transition-transform" />}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedStudentFeedbacks[r.id] && r.responses && Object.keys(r.responses).length > 0 && (
                                            <tr className={`border-b ${isDarkMode ? 'border-white/5 bg-black/40' : 'border-slate-50 bg-slate-100/50'}`}>
                                                <td colSpan="7" className="py-4 px-8 md:px-16">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                                        {Object.entries(r.responses).map(([qIdx, ans]) => (
                                                            <div key={qIdx} className={`flex justify-between items-start gap-4 text-[10px] pb-2 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-200'} last:border-0`}>
                                                                <span className="opacity-80 leading-relaxed font-medium">Q{parseInt(qIdx) + 1}: {FEEDBACK_QUESTIONS[qIdx] || 'Feedback Question'}</span>
                                                                <span className={`font-black shrink-0 px-2 py-0.5 rounded-[3px] ${ans === 'EXCELLENT' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-600') : ans === 'GOOD' ? (isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600') : ans === 'AVERAGE' ? (isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-100 text-orange-600') : (isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-600')}`}>{ans}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        );
                    })}</tbody>
                </table>
            );
        }

        return null;
    };

    const StatCard = ({ icon: Icon, color, value, label, detailKey }) => (
        <div
            onClick={() => fetchDetail(detailKey)}
            className={`p-3.5 rounded-[5px] border text-center cursor-pointer transition-all duration-200 group flex flex-col justify-between items-center min-h-[110px]
                ${activeDetail === detailKey
                    ? (isDarkMode ? 'border-orange-500/50 bg-orange-500/10 shadow-lg shadow-orange-500/10' : 'border-orange-400 bg-orange-50')
                    : (isDarkMode ? 'bg-[#0B0F15] border-white/5 hover:border-white/20 hover:bg-white/5' : 'bg-white border-slate-200 shadow-sm hover:border-orange-300 hover:shadow-md')
                }`}
        >
            <Icon className={`w-5 h-5 mx-auto mb-1 ${color} transition-transform group-hover:scale-110`} />
            <div className="text-xl font-black">{value}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider opacity-60 mt-0.5 leading-tight">{label}</div>
            <div className={`text-[8px] mt-1 font-bold uppercase tracking-wider ${activeDetail === detailKey ? 'text-orange-500' : 'opacity-30'}`}>
                {activeDetail === detailKey ? '▲ Collapse' : '▼ View Details'}
            </div>
        </div>
    );

    const detailTitles = { 
        logins: 'Login History', 
        doubts: 'Doubts Activity', 
        feedback: 'Class Feedback',
        topper_ranks: `Topper Ranks (Rank Produce) — ${name}`,
        mentorship_conversion: `Mentorship & Conversion Logs — ${name}`,
        ptm_records: `Parent-Teacher Meeting (PTM) Records — ${name}`
    };

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
                        <div className="text-xs font-bold text-orange-500 uppercase tracking-widest">USER: {username}</div>
                    </div>
                </div>
                <div className={`hidden md:flex items-center gap-6 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div><span className="opacity-50 uppercase tracking-wider font-bold">Email</span><div className="font-bold text-sm mt-0.5">{email}</div></div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                <StatCard icon={Activity} color="text-blue-500" value={activity.loginCount || 0} label="App Logins" detailKey="logins" />
                <div
                    onClick={() => fetchDetail('doubts')}
                    className={`p-3.5 rounded-[5px] border text-center cursor-pointer transition-all duration-200 group flex flex-col justify-between items-center min-h-[110px]
                        ${activeDetail === 'doubts'
                            ? (isDarkMode ? 'border-orange-500/50 bg-orange-500/10 shadow-lg shadow-orange-500/10' : 'border-orange-400 bg-orange-50')
                            : (isDarkMode ? 'bg-[#0B0F15] border-white/5 hover:border-white/20 hover:bg-white/5' : 'bg-white border-slate-200 shadow-sm hover:border-orange-300 hover:shadow-md')
                        }`}
                >
                    <MessageCircle className="w-5 h-5 mx-auto mb-1 text-purple-500 transition-transform group-hover:scale-110" />
                    <div className="text-xl font-black">{activity.doubtsSolved || 0}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider opacity-60 mt-0.5 leading-tight">Doubts Solved</div>
                    <div className={`text-[8px] font-bold mt-0.5 flex items-center justify-center gap-0.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        <Timer size={10} /> {activity.avgDoubtTime || '-'}
                    </div>
                    <div className={`text-[8px] mt-1 font-bold uppercase tracking-wider ${activeDetail === 'doubts' ? 'text-orange-500' : 'opacity-30'}`}>
                        {activeDetail === 'doubts' ? '▲ Collapse' : '▼ View Details'}
                    </div>
                </div>

                <StatCard icon={Star} color="text-amber-500" value={activity.classRating || "0.0"} label="Class Rating" detailKey="feedback" />
                <StatCard icon={Trophy} color="text-amber-400" value="View" label="Topper Ranks" detailKey="topper_ranks" />
                <StatCard icon={ArrowRightLeft} color="text-orange-500" value="View" label="Mentorship & Conversion" detailKey="mentorship_conversion" />
                <StatCard icon={Users} color="text-cyan-500" value="View" label="PTM Records" detailKey="ptm_records" />

                <div className={`p-3.5 rounded-[5px] border text-center flex flex-col justify-between items-center min-h-[110px] ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <LogIn className={`w-5 h-5 mx-auto mb-1 ${activity.avgEntryDiff?.includes('Late') ? 'text-amber-500' : activity.avgEntryDiff?.includes('Early') || activity.avgEntryDiff === 'On Time' ? 'text-emerald-500' : 'text-slate-500'}`} />
                    <div className={`text-base font-black truncate max-w-full ${activity.avgEntryDiff?.includes('Late') ? 'text-amber-500' : activity.avgEntryDiff?.includes('Early') || activity.avgEntryDiff === 'On Time' ? 'text-emerald-500' : ''}`}>
                        {activity.avgEntryDiff || '-'}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider opacity-60 mt-0.5 leading-tight">Avg Entry Time</div>
                </div>

                <div className={`p-3.5 rounded-[5px] border text-center flex flex-col justify-between items-center min-h-[110px] ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <Clock className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                    <div className="text-xs font-black leading-tight">{activity.lastActive ? fmtDate(activity.lastActive) : 'Never'}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider opacity-60 mt-0.5 leading-tight">Last Active</div>
                </div>
            </div>

            {/* Detail Table Panel */}
            {activeDetail && (
                <div className={`rounded-[5px] border overflow-hidden ${isDarkMode ? 'border-white/10 bg-[#0B0F15]' : 'border-slate-200 bg-white'}`}>
                    <div className={`px-5 py-3 border-b flex items-center justify-between gap-3 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
                        <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{detailTitles[activeDetail]}</span>
                        <div className="flex items-center gap-3 ml-auto">
                            {!loadingDetail && !['topper_ranks', 'mentorship_conversion', 'ptm_records'].includes(activeDetail) && (
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {(cachedData[activeDetail] || []).length} record{((cachedData[activeDetail] || []).length) !== 1 ? 's' : ''}
                                </span>
                            )}
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

            {/* Doubt Modal Overlay */}
            {selectedDoubt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className={`w-full max-w-3xl rounded-[5px] shadow-2xl relative animate-in zoom-in-95 duration-200 my-auto ${isDarkMode ? 'bg-[#0B0F15] text-slate-200 border border-white/10' : 'bg-white text-slate-700'}`}>
                        
                        {/* Header */}
                        <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-orange-500">Doubt Details</h3>
                                <div className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">ID: #{selectedDoubt.id}</div>
                            </div>
                            <button onClick={() => setSelectedDoubt(null)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-200'}`}>
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</p>
                                    <p className="font-bold text-sm truncate" title={selectedDoubt.subject}>{selectedDoubt.subject}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student</p>
                                    <p className="font-bold text-sm truncate" title={selectedDoubt.student_name}>{selectedDoubt.student_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Topic</p>
                                    <p className="font-bold text-sm truncate" title={selectedDoubt.topic}>{selectedDoubt.topic || 'General'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                                    <p className={`font-bold text-sm ${selectedDoubt.status === 'Resolved' ? 'text-emerald-500' : 'text-orange-500'}`}>{selectedDoubt.status}</p>
                                </div>
                            </div>

                            <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <h4 className="text-sm font-black uppercase tracking-wider mb-2">{selectedDoubt.title}</h4>
                                <p className="text-sm font-medium whitespace-pre-wrap opacity-80">{selectedDoubt.description}</p>
                                
                                {/* Images */}
                                {(selectedDoubt.image || selectedDoubt.image2 || selectedDoubt.image3) && (
                                    <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                                        {[selectedDoubt.image, selectedDoubt.image2, selectedDoubt.image3].map((img, i) => img && (
                                            <button 
                                                key={i} 
                                                onClick={() => setActivePreview(img)}
                                                className={`shrink-0 h-24 rounded border overflow-hidden cursor-zoom-in hover:opacity-80 transition-opacity ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
                                            >
                                                <img src={img} alt={`Attachment ${i+1}`} className="h-full w-auto object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedDoubt.status === 'Resolved' && (
                                <div className="p-4 rounded-[5px] border border-emerald-500/20 bg-emerald-500/5">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Teacher's Reply</h4>
                                    <p className="text-sm font-medium whitespace-pre-wrap">{selectedDoubt.teacher_reply || 'No written reply provided.'}</p>
                                    
                                    {/* Reply Images */}
                                    {(selectedDoubt.reply_image || selectedDoubt.reply_image2 || selectedDoubt.reply_image3) && (
                                        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                                            {[selectedDoubt.reply_image, selectedDoubt.reply_image2, selectedDoubt.reply_image3].map((img, i) => img && (
                                                <button 
                                                    key={i} 
                                                    onClick={() => setActivePreview(img)}
                                                    className={`shrink-0 h-24 rounded border overflow-hidden cursor-zoom-in hover:opacity-80 transition-opacity ${isDarkMode ? 'border-emerald-500/20' : 'border-emerald-200'}`}
                                                >
                                                    <img src={img} alt={`Reply Attachment ${i+1}`} className="h-full w-auto object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Image Preview Overlay */}
            {activePreview && (
                <div 
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in"
                    onClick={() => setActivePreview(null)}
                >
                    <button 
                        onClick={() => setActivePreview(null)} 
                        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        <X size={24} strokeWidth={3} />
                    </button>
                    <img 
                        src={activePreview} 
                        alt="Preview" 
                        className="max-w-full max-h-[90vh] object-contain rounded-[5px] animate-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Loading Overlay */}
            {isDoubtLoading && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                    <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                </div>
            )}

        </div>
    );
};


const TeacherActivity = ({ teachersData = [], isERPLoading, isDarkMode, onRefresh }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [ratingFilter, setRatingFilter] = useState('');

    // Auth and Activity Loading
    const { token, getApiUrl } = useAuth();
    const [activityData, setActivityData] = useState({});
    const [loadingActivity, setLoadingActivity] = useState({});

    // Filtering
    const filteredTeachers = useMemo(() => {
        let filtered = Array.isArray(teachersData) ? teachersData : [];
        
        // Filter out inactive teachers
        filtered = filtered.filter(t => t.isActive !== false);

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                (t.name || '').toLowerCase().includes(q) || 
                (t.username || t.email || '').toLowerCase().includes(q)
            );
        }
        
        if (ratingFilter) {
            filtered = filtered.filter(t => {
                const username = t.username || t.email;
                const activity = activityData[username];
                if (!activity) return false;
                const rating = parseFloat(activity.classRating) || 0;
                
                if (ratingFilter === '4.5+') return rating >= 4.5;
                if (ratingFilter === '4.0+') return rating >= 4.0;
                if (ratingFilter === '3.0+') return rating >= 3.0;
                if (ratingFilter === '<3.0') return rating < 3.0;
                return true;
            });
        }

        return filtered;
    }, [teachersData, searchQuery, ratingFilter, activityData]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
    const displayedTeachers = useMemo(() => {
        const startIdx = (currentPage - 1) * itemsPerPage;
        return filteredTeachers.slice(startIdx, startIdx + itemsPerPage);
    }, [filteredTeachers, currentPage, itemsPerPage]);

    const loadActivity = useCallback(async (teacher, force = false) => {
        const username = teacher.username || teacher.email;
        if (!username) return;

        setLoadingActivity(prev => ({ ...prev, [username]: true }));
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/admin/teacher-activity-summary/${username}/`, {
                params: { erp_id: teacher.id },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setActivityData(prev => ({ ...prev, [username]: response.data }));
        } catch (error) {
            console.error('Failed to load activity:', error);
        } finally {
            setLoadingActivity(prev => ({ ...prev, [username]: false }));
        }
    }, [token, getApiUrl]);

    const loadAllDisplayedActivity = useCallback((force = false) => {
        displayedTeachers.forEach(teacher => {
            const username = teacher.username || teacher.email;
            if (force || (username && !activityData[username] && !loadingActivity[username])) {
                loadActivity(teacher);
            }
        });
    }, [displayedTeachers, activityData, loadingActivity, loadActivity]);



    if (selectedTeacher) {
        const username = selectedTeacher.username || selectedTeacher.email;
        return (
            <TeacherDetailPage
                teacher={selectedTeacher}
                username={username}
                activity={activityData[username] || {}}
                isDarkMode={isDarkMode}
                onBack={() => setSelectedTeacher(null)}
            />
        );
    }

    return (
        <div className={`flex flex-col h-full space-y-4 animate-fade-in-up ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
                        <div className="relative w-full md:max-w-md">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type="text"
                                placeholder="Search by name, username, or email..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className={`w-full pl-9 pr-4 py-2 text-sm rounded-[3px] border outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-orange-500/50 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 focus:border-orange-400 focus:bg-white'}`}
                            />
                        </div>
                        <div className="w-full md:w-64">
                            <select
                                value={ratingFilter}
                                onChange={(e) => { setRatingFilter(e.target.value); setCurrentPage(1); }}
                                className={`w-full px-3 py-2 text-sm rounded-[3px] border outline-none transition-all ${isDarkMode ? 'bg-[#10141D] border-white/10 focus:border-orange-500/50 text-white' : 'bg-slate-50 border-slate-200 focus:border-orange-400 focus:bg-white text-slate-800'}`}
                            >
                                <option value="">Any Rating</option>
                                <option value="4.5+">4.5 & Above (Excellent)</option>
                                <option value="4.0+">4.0 & Above (Good)</option>
                                <option value="3.0+">3.0 & Above (Average)</option>
                                <option value="<3.0">Below 3.0 (Needs Improvement)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => loadAllDisplayedActivity(false)}
                            title="Load Activity for Current Page"
                            className={`p-2 rounded-[3px] border transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500/20' : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100'}`}
                        >
                            <Download size={16} />
                        </button>
                        <button
                            onClick={() => loadAllDisplayedActivity(true)}
                            title="Force Refresh Page Summaries"
                            className={`p-2 rounded-[3px] border transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <RotateCcw size={16} />
                        </button>
                        <button
                            onClick={onRefresh}
                            className={`p-2 rounded-[3px] border transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/10 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                            title="Sync/Refresh Teachers"
                        >
                            <RefreshCw size={16} className={isERPLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className={`flex-1 overflow-hidden flex flex-col rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-[#0B0F15] shadow-[0_1px_0_rgba(255,255,255,0.1)] text-slate-400' : 'bg-white shadow-[0_1px_0_rgba(0,0,0,0.1)] text-slate-500'}`}>
                            <tr>
                                <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs">Teacher Name</th>
                                <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs">Email</th>
                                <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs text-center">Doubts</th>
                                <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs text-center">Rating</th>
                                <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs text-center">App Logins</th>
                                <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs text-center">Last Active</th>
                                <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {displayedTeachers.length > 0 ? displayedTeachers.map((teacher, idx) => {
                                const username = teacher.username || teacher.email;
                                const isActivityLoading = loadingActivity[username];
                                const activity = activityData[username];
                                
                                return (
                                    <tr key={username || idx} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.02] divide-white/5' : 'hover:bg-slate-50 divide-slate-100 border-b border-slate-100'}`}>
                                        <td className="px-5 py-3">
                                            <div className={`font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{teacher.name || teacher.username}</div>
                                            <div className="text-xs font-bold text-orange-500 uppercase tracking-widest">{username}</div>
                                        </td>
                                        <td className="px-5 py-3 text-xs opacity-70 font-mono">{teacher.email || '-'}</td>
                                        {activity ? (
                                            <>
                                                <td className="px-5 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-[3px] text-xs font-black ${activity.doubtsSolved > 0 ? (isDarkMode ? 'bg-purple-500/10 text-purple-500' : 'bg-purple-100 text-purple-600') : (isDarkMode ? 'bg-white/5' : 'bg-slate-100')}`}>
                                                        {activity.doubtsSolved || 0}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className="font-bold flex items-center justify-center gap-1 text-xs">
                                                        {activity.classRating || "0.0"} <Star size={10} className="text-amber-400 fill-amber-400" />
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-[3px] text-xs font-black ${activity.loginCount > 0 ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-100 text-emerald-600') : (isDarkMode ? 'bg-white/5' : 'bg-slate-100')}`}>
                                                        {activity.loginCount || 0}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    {activity.lastActive ? (
                                                        <div className="text-xs font-bold">
                                                            {parseDate(activity.lastActive)?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs opacity-50 font-bold uppercase">Never</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <button
                                                        onClick={() => setSelectedTeacher(teacher)}
                                                        className={`px-4 py-1.5 rounded-[3px] text-xs font-bold uppercase tracking-widest transition-all ${isDarkMode ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white'}`}
                                                    >
                                                        Details
                                                    </button>
                                                </td>
                                            </>
                                        ) : (
                                            <td colSpan="5" className="px-5 py-3 text-center">
                                                <button
                                                    onClick={() => loadActivity(teacher)}
                                                    disabled={isActivityLoading}
                                                    className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all w-full max-w-[150px] mx-auto flex items-center justify-center gap-2 ${isActivityLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${isDarkMode ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}
                                                >
                                                    {isActivityLoading ? (
                                                        <div className="w-3 h-3 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                                                    ) : (
                                                        <span className="flex items-center gap-1"><Activity size={12} /> Load</span>
                                                    )}
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="7" className="px-5 py-10 text-center opacity-50">
                                        No teacher activity data found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                <div className={`flex flex-col md:flex-row justify-between items-center gap-4 mt-4 p-4 border border-t-0 rounded-b-[5px] ${isDarkMode ? 'border-white/10 bg-[#10141D]' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTeachers.length)} to {Math.min(currentPage * itemsPerPage, filteredTeachers.length)} of {filteredTeachers.length} entries
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

export default TeacherActivity;
