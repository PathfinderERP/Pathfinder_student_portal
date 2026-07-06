import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Eye, CheckCircle, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, X, User, Upload, FileText, Mic, Image, Send } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const formatDuration = (start, end) => {
    if (!start || !end) return '-';
    const diff = end - start;
    if (diff < 0) return '-';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        return `${days}d ${remHours}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

const getTimePendingColor = (assignDate, isDarkMode) => {
    if (!assignDate) return isDarkMode ? 'text-slate-400 bg-white/5' : 'text-slate-600 bg-slate-100';
    
    const diffHours = (new Date() - assignDate) / (1000 * 60 * 60);
    
    if (diffHours < 6) return isDarkMode ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-500/10';
    if (diffHours < 12) return isDarkMode ? 'text-yellow-400 bg-yellow-500/10' : 'text-yellow-600 bg-yellow-500/10';
    if (diffHours < 24) return isDarkMode ? 'text-orange-400 bg-orange-500/10' : 'text-orange-600 bg-orange-500/10';
    return isDarkMode ? 'text-red-400 bg-red-500/10' : 'text-red-600 bg-red-500/10';
};

const SolveDoubt = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, user } = useAuth();
    const isTeacherRole = user?.role === 'teacher' || user?.user_type === 'teacher';
    const [activeTab, setActiveTab] = useState('Unsolve');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('ALL');
    const [teachers, setTeachers] = useState([]);

    // Mock Doubts State
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDoubts = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/doubts/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Map the data to the format expected by the table
            const parseUTC = (str) => {
                if (!str) return null;
                return str.endsWith('Z') || str.includes('+') ? new Date(str) : new Date(str + 'Z');
            };

            const mappedDoubts = response.data.map(d => ({
                id: d.id,
                student: d.student_name,
                studentId: d.student_id,
                subject: d.subject,
                chapter: d.chapter,
                topic: d.topic,
                centre: d.centre_name || d.centre || 'N/A',
                studentClass: d.student_class || d.class_name || d.class || 'N/A',
                examTag: d.exam_tag || d.exam || 'N/A',
                title: d.title,
                date: d.created_at ? parseUTC(d.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
                status: d.status,
                description: d.description,
                image: d.image,
                image2: d.image2,
                image3: d.image3,
                pdf: d.pdf,
                voice_note: d.voice_note,
                teacherId: d.teacher_id,
                teacherName: d.teacher_name,
                assignDate: d.assign_date ? parseUTC(d.assign_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : null,
                solvedDate: d.resolved_at ? parseUTC(d.resolved_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : null,
                rawAssignDate: parseUTC(d.assign_date),
                rawSolvedDate: parseUTC(d.resolved_at),
                teacherReply: d.teacher_reply,
                replyImage: d.reply_image,
                replyImage2: d.reply_image2,
                replyImage3: d.reply_image3,
                replyPdf: d.reply_pdf,
                replyVoiceNote: d.reply_voice_note
            }));
            setDoubts(mappedDoubts);
        } catch (error) {
            console.error('Failed to fetch doubts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoubts();
    }, []);

    // Show Doubt Modal State
    const [isShowDoubtModalOpen, setIsShowDoubtModalOpen] = useState(false);
    const [selectedDoubtForView, setSelectedDoubtForView] = useState(null);

    // Solve Reply Modal State
    const [isSolveModalOpen, setIsSolveModalOpen] = useState(false);
    const [selectedDoubtForSolve, setSelectedDoubtForSolve] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replyImages, setReplyImages] = useState([null, null, null]);
    const [replyPdf, setReplyPdf] = useState(null);
    const [replyVoice, setReplyVoice] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Fetch ERP teachers for the dropdown
    useEffect(() => {
        if (isTeacherRole && user) {
            const tId = String(user.id || user.pk || user._id || '');
            setSelectedTeacherId(tId);
            return;
        }

        const fetchTeachers = async () => {
            try {
                const apiUrl = getApiUrl();
                const activeToken = token || localStorage.getItem('auth_token');
                if (!activeToken) return;

                const response = await axios.get(`${apiUrl}/api/admin/erp-teachers/`, {
                    headers: { 'Authorization': `Bearer ${activeToken}` }
                });
                setTeachers(response.data);
            } catch (error) {
                console.error("Failed to fetch ERP teachers:", error);
            }
        };
        fetchTeachers();
    }, [getApiUrl, token, user, isTeacherRole]);

    const selectedTeacherName = isTeacherRole 
        ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'Teacher'
        : (selectedTeacherId === 'ALL' ? 'ALL TEACHERS' : (teachers.find(t => String(t.id) === String(selectedTeacherId))?.name || 'Select Teacher'));

    const tabs = [
        { id: 'Unsolve', label: 'UNSOLVE DOUBTS' },
        { id: 'Solve', label: 'SOLVE DOUBTS' }
    ];

    const filteredDoubts = doubts.filter(d =>
        ((activeTab === 'Unsolve' && d.status === 'Assign') || (activeTab === 'Solve' && d.status === 'Resolved')) &&
        (isTeacherRole || selectedTeacherId === 'ALL' || String(d.teacherId) === String(selectedTeacherId)) &&
        (d.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const openSolveModal = (doubt) => {
        setSelectedDoubtForSolve(doubt);
        setReplyText(doubt.teacherReply || '');
        setReplyImages([null, null, null]);
        setReplyPdf(null);
        setReplyVoice(null);
        setIsSolveModalOpen(true);
    };

    const handleSubmitSolution = async () => {
        if (!replyText.trim() && !replyImages.some(Boolean) && !replyPdf && !replyVoice) return;
        setSubmitting(true);
        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            formData.append('status', 'Resolved');
            formData.append('resolved_at', new Date().toISOString());
            formData.append('teacher_reply', replyText);
            const imgFields = ['reply_image', 'reply_image2', 'reply_image3'];
            replyImages.forEach((f, i) => { if (f) formData.append(imgFields[i], f); });
            if (replyPdf) formData.append('reply_pdf', replyPdf);
            if (replyVoice) formData.append('reply_voice_note', replyVoice);
            await axios.patch(`${apiUrl}/api/doubts/${selectedDoubtForSolve.id}/`, formData, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            fetchDoubts();
            setIsSolveModalOpen(false);
        } catch (err) {
            console.error('Submit solution failed:', err);
            alert('Failed to submit solution.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleShowDoubtClick = (doubt) => {
        setSelectedDoubtForView(doubt);
        setIsShowDoubtModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsShowDoubtModalOpen(false);
        setSelectedDoubtForView(null);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
            <div className={`p-8 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                {/* Header & Teacher Selector */}
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-[5px] shadow-lg shadow-orange-500/20">
                                    Faculty Portal
                                </span>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    Solve <span className="text-orange-500">Doubts</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                View and resolve assigned student queries.
                            </p>
                        </div>

                        {/* Teacher Selection UI */}
                        {isTeacherRole ? (
                            <div className="flex items-center gap-4 p-2 rounded-[5px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                <div className="pr-4 pl-2 py-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Assigned Faculty</p>
                                    <p className="text-sm font-black text-orange-500 uppercase tracking-tight">{selectedTeacherName}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 p-2 rounded-[5px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                <div className="relative group min-w-[200px]">
                                    <label className="absolute -top-7 left-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Teacher</label>
                                    <select
                                        value={selectedTeacherId}
                                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                                        className={`w-full px-4 py-2.5 rounded-[5px] border-2 outline-none font-bold appearance-none transition-all ${isDarkMode
                                            ? 'bg-slate-800 border-white/10 text-white focus:border-orange-500'
                                            : 'bg-white border-slate-200 text-slate-700 focus:border-orange-500'}`}
                                    >
                                        <option value="ALL">ALL TEACHERS</option>
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                        {/* Fallback for mock if API fails */}
                                        {teachers.length === 0 && <option value="1">Rohan Singh</option>}
                                    </select>
                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />
                                </div>
                                <div className="h-10 w-px bg-slate-200 dark:bg-white/10 mx-2" />
                                <div className="pr-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Teacher Name</p>
                                    <p className="text-sm font-black text-orange-500 uppercase tracking-tight">:{selectedTeacherName}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-[5px] transition-all relative
                                    ${activeTab === tab.id
                                        ? (isDarkMode ? 'text-orange-400 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-orange-500' : 'text-orange-600 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-orange-600')
                                        : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search & Refresh */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative group w-full md:w-96">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search student or subject..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-14 pr-6 py-3 rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode
                                    ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5'
                                    : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5'
                                    }`}
                            />
                        </div>
                        <button
                            onClick={fetchDoubts}
                            className={`p-3 rounded-[5px] transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-orange-400 border border-white/10' : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-100'}`}>
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[5px] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-orange-50 text-orange-900/50'}`}>
                                <th className="py-4 px-6 text-center">Doubt No.</th>
                                <th className="py-4 px-6">Student Name</th>
                                <th className="py-4 px-6">Class</th>
                                <th className="py-4 px-6">Centre</th>
                                <th className="py-4 px-6">Exam Tag</th>
                                <th className="py-4 px-6">Subject</th>
                                <th className="py-4 px-6 text-center">{activeTab === 'Unsolve' ? 'Status' : 'Solved Date'}</th>
                                <th className="py-4 px-6 text-center">Assign Date</th>
                                <th className="py-4 px-6 text-center">{activeTab === 'Unsolve' ? 'Time Pending' : 'Time Taken'}</th>
                                <th className="py-4 px-6 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-6 text-center"><div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-2">
                                                <div className={`h-4 w-40 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-2.5 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className={`h-5 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className={`h-5 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className={`h-5 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className={`h-5 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className={`h-4 w-20 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className={`h-4 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className={`h-4 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex justify-center gap-2">
                                                <div className={`h-9 w-9 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-9 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredDoubts.length > 0 ? (
                                filteredDoubts.map((doubt) => (
                                    <tr key={doubt.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {doubt.id}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm tracking-tight uppercase">{doubt.student}</span>
                                                <span className={`text-[10px] font-black opacity-40 uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ID: {doubt.studentId || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {doubt.studentClass}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {doubt.centre}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-3 py-1 rounded-[5px] text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                {doubt.examTag}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-3 py-1 rounded-[5px] text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                {doubt.subject}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {activeTab === 'Unsolve' ? (
                                                <span className="text-xs font-black text-orange-500 uppercase tracking-widest">
                                                    Pending
                                                </span>
                                            ) : (
                                                <span className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                    {doubt.solvedDate}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {doubt.assignDate}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`text-xs font-black px-2.5 py-1 rounded-[5px] ${
                                                activeTab === 'Unsolve' 
                                                    ? getTimePendingColor(doubt.rawAssignDate, isDarkMode)
                                                    : (isDarkMode ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-50')
                                            }`}>
                                                {activeTab === 'Unsolve' ? formatDuration(doubt.rawAssignDate, new Date()) : formatDuration(doubt.rawAssignDate, doubt.rawSolvedDate)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleShowDoubtClick(doubt)}
                                                    className="p-2.5 rounded-[5px] bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                                                    title="View Doubt"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {isTeacherRole && (
                                                    activeTab === 'Unsolve' ? (
                                                        <button
                                                            onClick={() => openSolveModal(doubt)}
                                                            className="px-4 py-2.5 rounded-[5px] bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-2"
                                                        >
                                                            <Send size={14} strokeWidth={3} />
                                                            <span>Write Solution</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => openSolveModal(doubt)}
                                                            className="px-4 py-2.5 rounded-[5px] bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-600/20 hover:bg-orange-700 active:scale-95 transition-all flex items-center gap-2"
                                                        >
                                                            <Send size={14} strokeWidth={3} />
                                                            <span>Edit Solution</span>
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-30">
                                            <AlertCircle size={48} />
                                            <p className="font-bold text-lg">No doubts found for this teacher</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer status */}
                <div className={`p-6 border-t flex items-center justify-between ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                    <span className="text-xs font-bold opacity-50 uppercase tracking-widest">
                        Total {activeTab === 'Unsolve' ? 'Pending' : 'Resolved'}: {filteredDoubts.length}
                    </span>
                    <div className="flex gap-2">
                        <button className="p-2 rounded-lg hover:bg-black/5 opacity-30 cursor-not-allowed"><ChevronLeft size={16} /></button>
                        <button className="p-2 rounded-lg hover:bg-black/5 opacity-30 cursor-not-allowed"><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Show Doubt Modal */}
            {isShowDoubtModalOpen && selectedDoubtForView && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md overflow-y-auto py-12 animate-in fade-in duration-300">
                    <div className="w-full max-w-3xl mx-4 overflow-hidden rounded-[5px] shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 bg-orange-600 text-white">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Doubt Detail</h3>
                                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Ref ID: #{selectedDoubtForView.id}</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className={`p-8 min-h-[300px] max-h-[80vh] overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#0d1119] text-slate-200' : 'bg-white text-slate-700'}`}>
                            
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Subject</p>
                                    <p className="font-black text-xs uppercase text-orange-500">{selectedDoubtForView.subject}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Chapter</p>
                                    <p className="font-bold text-xs truncate">{selectedDoubtForView.chapter || 'General'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Topic</p>
                                    <p className="font-bold text-xs truncate">{selectedDoubtForView.topic || 'General'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Posted On</p>
                                    <p className="font-bold text-[10px] opacity-60">{selectedDoubtForView.date}</p>
                                </div>
                            </div>

                            <div className="mb-8 p-5 rounded-[5px] border border-orange-500/10 bg-orange-500/5">
                                <h4 className="text-sm font-black uppercase tracking-tight mb-3 text-orange-500">{selectedDoubtForView.title || 'Doubt Description'}</h4>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium italic">
                                    "{selectedDoubtForView.description}"
                                </p>
                            </div>

                            {/* Multimedia Attachments */}
                            <div className="space-y-8">
                                {/* Images Gallery */}
                                {(selectedDoubtForView.image || selectedDoubtForView.image2 || selectedDoubtForView.image3) && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Image Attachments</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {[selectedDoubtForView.image, selectedDoubtForView.image2, selectedDoubtForView.image3].map((img, i) => img && (
                                                <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="group relative aspect-square rounded-[5px] overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all shadow-lg">
                                                    <img src={img} alt={`Attachment ${i+1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Eye size={20} className="text-white" />
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* PDF Attachment */}
                                {selectedDoubtForView.pdf && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">PDF Attachment</p>
                                        <a href={selectedDoubtForView.pdf} target="_blank" rel="noopener noreferrer" 
                                            className="flex items-center gap-4 p-4 rounded-[5px] border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all group">
                                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-black">PDF</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">Study Material / Reference PDF</p>
                                                <p className="text-[10px] opacity-50 font-medium">Click to open in new tab</p>
                                            </div>
                                            <Eye size={16} className="text-red-500 group-hover:translate-x-1 transition-transform" />
                                        </a>
                                    </div>
                                )}

                                {/* Voice Note */}
                                {selectedDoubtForView.voice_note && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voice Explanation</p>
                                        <div className="p-4 rounded-[5px] border border-blue-500/20 bg-blue-500/5 space-y-3">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Audio Clip</span>
                                            </div>
                                            <audio controls className="w-full h-10 custom-audio-player">
                                                <source src={selectedDoubtForView.voice_note} type="audio/mpeg" />
                                                Your browser does not support the audio element.
                                            </audio>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Student Identity Grid */}
                            <div className={`mt-10 pt-6 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'} grid grid-cols-2 gap-4`}>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Student</p>
                                    <p className="font-bold text-sm tracking-tight">{selectedDoubtForView.student}</p>
                                    <p className={`text-[9px] font-black opacity-40 uppercase tracking-widest mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ID: {selectedDoubtForView.studentId || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Subject</p>
                                    <p className="font-bold text-sm tracking-tight">{selectedDoubtForView.subject}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Solve Reply Modal */}
            {isSolveModalOpen && selectedDoubtForSolve && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-md overflow-y-auto pt-24 pb-12">
                    <div className="w-full max-w-4xl mx-4 rounded-[5px] shadow-2xl border border-white/10 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-5 bg-emerald-600 text-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-lg font-black uppercase">Submit Solution</h3>
                                <p className="text-[10px] opacity-70 uppercase tracking-widest">{selectedDoubtForSolve.subject} — {selectedDoubtForSolve.student}</p>
                            </div>
                            <button onClick={() => setIsSolveModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full"><X size={22} strokeWidth={3}/></button>
                        </div>

                        {/* Body */}
                        <div className={`p-8 space-y-6 ${isDarkMode ? 'bg-[#0d1119] text-slate-200' : 'bg-white text-slate-700'}`}>

                            {/* Original Doubt Summary */}
                            <div className={`p-4 rounded-[5px] border text-sm ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Student's Question</p>
                                <p className="font-bold text-orange-500">{selectedDoubtForSolve.title}</p>
                                <p className="mt-1 opacity-70 text-xs">{selectedDoubtForSolve.description}</p>
                                {/* Student's attached images */}
                                {(selectedDoubtForSolve.image || selectedDoubtForSolve.image2 || selectedDoubtForSolve.image3) && (
                                    <div className="flex gap-2 mt-3">
                                        {[selectedDoubtForSolve.image, selectedDoubtForSolve.image2, selectedDoubtForSolve.image3].map((img, i) => img && (
                                            <a key={i} href={img} target="_blank" rel="noreferrer" className="w-16 h-16 rounded overflow-hidden border border-white/10 flex-shrink-0">
                                                <img src={img} alt="student attachment" className="w-full h-full object-cover" />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                             {/* Existing reply attachments preview */}
                             {(selectedDoubtForSolve.replyImage || selectedDoubtForSolve.replyImage2 || selectedDoubtForSolve.replyImage3 || selectedDoubtForSolve.replyPdf || selectedDoubtForSolve.replyVoiceNote) && (
                                 <div className={`p-4 rounded-[5px] border text-xs ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Current Solution Attachments</p>
                                     <div className="flex flex-wrap gap-4 items-center">
                                         {[selectedDoubtForSolve.replyImage, selectedDoubtForSolve.replyImage2, selectedDoubtForSolve.replyImage3].map((img, idx) => img && (
                                             <a key={idx} href={img} target="_blank" rel="noreferrer" className="w-12 h-12 rounded overflow-hidden border border-white/10 flex-shrink-0">
                                                 <img src={img} alt={`Current Solution Image ${idx+1}`} className="w-full h-full object-cover" />
                                             </a>
                                         ))}
                                         {selectedDoubtForSolve.replyPdf && (
                                             <a href={selectedDoubtForSolve.replyPdf} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-[5px] border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold transition-all">
                                                 Current PDF
                                             </a>
                                         )}
                                         {selectedDoubtForSolve.replyVoiceNote && (
                                             <a href={selectedDoubtForSolve.replyVoiceNote} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-[5px] border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-500 font-bold transition-all">
                                                 Current Audio
                                             </a>
                                         )}
                                     </div>
                                     <p className="text-[9px] text-slate-500 mt-2 italic font-bold">Uploading new files below will overwrite the current files.</p>
                                 </div>
                             )}

                             {/* Text Reply */}
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Explanation *</label>
                                <textarea
                                    rows={5}
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder="Write your detailed solution here..."
                                    className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-medium text-sm resize-none transition-all ${isDarkMode
                                        ? 'bg-white/5 border-white/10 text-white focus:border-emerald-500'
                                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'}`}
                                />
                            </div>

                            {/* Image Uploads */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Image size={14}/>Solution Images (max 3)</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {replyImages.map((file, i) => (
                                        <label key={i} className={`relative aspect-square flex flex-col items-center justify-center gap-2 rounded-[5px] border-2 border-dashed cursor-pointer transition-all ${file ? 'border-emerald-500 bg-emerald-500/10' : (isDarkMode ? 'border-white/10 hover:border-white/30' : 'border-slate-200 hover:border-slate-400')}`}>
                                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                                                const updated = [...replyImages];
                                                updated[i] = e.target.files[0] || null;
                                                setReplyImages(updated);
                                            }}/>
                                            {file
                                                ? <><img src={URL.createObjectURL(file)} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-[5px]"/><span className="absolute bottom-1 right-1 bg-emerald-500 text-white text-[9px] font-black rounded px-1">✓</span></>
                                                : <><Upload size={20} className="opacity-30"/><span className="text-[9px] font-bold opacity-30">Image {i+1}</span></>}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* PDF Upload */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><FileText size={14}/>PDF Solution</label>
                                <label className={`flex items-center gap-4 p-4 rounded-[5px] border-2 border-dashed cursor-pointer transition-all ${replyPdf ? 'border-red-500 bg-red-500/10' : (isDarkMode ? 'border-white/10 hover:border-white/30' : 'border-slate-200 hover:border-slate-400')}`}>
                                    <input type="file" accept=".pdf" className="hidden" onChange={e => setReplyPdf(e.target.files[0] || null)}/>
                                    <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-black text-xs flex-shrink-0">PDF</div>
                                    <span className="text-sm font-bold opacity-60">{replyPdf ? replyPdf.name : 'Attach a PDF document...'}</span>
                                </label>
                            </div>

                            {/* Voice Note Upload */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Mic size={14}/>Voice Note</label>
                                <label className={`flex items-center gap-4 p-4 rounded-[5px] border-2 border-dashed cursor-pointer transition-all ${replyVoice ? 'border-blue-500 bg-blue-500/10' : (isDarkMode ? 'border-white/10 hover:border-white/30' : 'border-slate-200 hover:border-slate-400')}`}>
                                    <input type="file" accept="audio/*" className="hidden" onChange={e => setReplyVoice(e.target.files[0] || null)}/>
                                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 flex-shrink-0"><Mic size={18}/></div>
                                    <span className="text-sm font-bold opacity-60">{replyVoice ? replyVoice.name : 'Attach an audio explanation...'}</span>
                                </label>
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleSubmitSolution}
                                disabled={submitting || (!replyText.trim() && !replyImages.some(Boolean) && !replyPdf && !replyVoice)}
                                className={`w-full py-4 rounded-[5px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                                    submitting || (!replyText.trim() && !replyImages.some(Boolean) && !replyPdf && !replyVoice)
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-600/20'}`}>
                                {submitting ? <><RefreshCw size={16} className="animate-spin"/>Submitting...</> : <><Send size={16}/>Submit Solution</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SolveDoubt;
