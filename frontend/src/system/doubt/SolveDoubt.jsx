import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Search, Eye, CheckCircle, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, X, User, 
    Upload, FileText, Mic, Image, Send, LayoutGrid, List, Filter, Clock, CheckCircle2, 
    Zap, HelpCircle, Sparkles, MessageSquare, Tag, Building2, BookOpen, Layers, ArrowRight, ExternalLink
} from 'lucide-react';
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
    if (!assignDate) return isDarkMode ? 'text-slate-400 bg-white/5 border-white/10' : 'text-slate-600 bg-slate-100 border-slate-200';
    
    const diffHours = (new Date() - assignDate) / (1000 * 60 * 60);
    
    if (diffHours < 6) return isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (diffHours < 12) return isDarkMode ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-amber-700 bg-amber-50 border-amber-200';
    if (diffHours < 24) return isDarkMode ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-orange-700 bg-orange-50 border-orange-200';
    return isDarkMode ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-700 bg-rose-50 border-rose-200';
};

const getSubjectBadgeColor = (subject) => {
    const s = String(subject || '').toLowerCase();
    if (s.includes('phy')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    if (s.includes('che')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (s.includes('math')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (s.includes('bio') || s.includes('bot') || s.includes('zoo')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

const SolveDoubt = ({ accentColor }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, user } = useAuth();
    const isTeacherRole = user?.role === 'teacher' || user?.user_type === 'teacher';
    const isCyanTheme = accentColor === 'cyan' || isTeacherRole;
    
    const [activeTab, setActiveTab] = useState('Unsolve');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('ALL');
    const [teachers, setTeachers] = useState([]);

    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDoubts = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/doubts/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const parseUTC = (str) => {
                if (!str) return null;
                return str.endsWith('Z') || str.includes('+') ? new Date(str) : new Date(str + 'Z');
            };

            const mappedDoubts = (response.data || []).map(d => ({
                id: d.id,
                student: d.student_name || 'Student',
                studentId: d.student_id,
                subject: d.subject || 'General',
                chapter: d.chapter || 'General',
                topic: d.topic || '',
                centre: d.centre_name || d.centre || 'N/A',
                studentClass: d.student_class || d.class_name || d.class || 'N/A',
                examTag: d.exam_tag || d.exam || 'N/A',
                title: d.title || 'Student Query',
                date: d.created_at ? parseUTC(d.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
                status: d.status,
                description: d.description || '',
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

    // Modal States
    const [isShowDoubtModalOpen, setIsShowDoubtModalOpen] = useState(false);
    const [selectedDoubtForView, setSelectedDoubtForView] = useState(null);

    const [isSolveModalOpen, setIsSolveModalOpen] = useState(false);
    const [selectedDoubtForSolve, setSelectedDoubtForSolve] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replyImages, setReplyImages] = useState([null, null, null]);
    const [replyPdf, setReplyPdf] = useState(null);
    const [replyVoice, setReplyVoice] = useState(null);
    const [existingReplyImages, setExistingReplyImages] = useState([null, null, null]);
    const [existingReplyPdf, setExistingReplyPdf] = useState(null);
    const [existingReplyVoice, setExistingReplyVoice] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const resolveMediaUrl = (url) => {
        if (!url) return '';
        if (typeof url !== 'string') return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
            return url;
        }
        const apiUrl = getApiUrl ? getApiUrl() : '';
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;
        return `${apiUrl}${cleanUrl}`;
    };

    const openMediaPreview = (url, type, title = 'Attachment') => {
        const fullUrl = resolveMediaUrl(url);
        setMediaPreview({ url: fullUrl, type, title });
    };

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
                setTeachers(response.data || []);
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
        { id: 'Unsolve', label: 'UNSOLVED DOUBTS' },
        { id: 'Solve', label: 'RESOLVED DOUBTS' }
    ];

    // Filter Logic
    const filteredDoubts = doubts.filter(d => {
        const matchesTab = (activeTab === 'Unsolve' && (d.status === 'Assign' || d.status === 'Unassigned')) || 
                           (activeTab === 'Solve' && d.status === 'Resolved');
        const matchesTeacher = isTeacherRole || selectedTeacherId === 'ALL' || String(d.teacherId) === String(selectedTeacherId);
        
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || 
            (d.student && d.student.toLowerCase().includes(q)) ||
            (d.subject && d.subject.toLowerCase().includes(q)) ||
            (d.title && d.title.toLowerCase().includes(q)) ||
            (d.chapter && d.chapter.toLowerCase().includes(q)) ||
            (d.centre && d.centre.toLowerCase().includes(q));

        return matchesTab && matchesTeacher && matchesSearch;
    });

    // Analytics
    const totalDoubtsCount = doubts.length;
    const pendingCount = doubts.filter(d => d.status === 'Assign' || d.status === 'Unassigned').length;
    const resolvedCount = doubts.filter(d => d.status === 'Resolved').length;
    const resolutionRate = totalDoubtsCount > 0 ? Math.round((resolvedCount / totalDoubtsCount) * 100) : 0;

    const openSolveModal = (doubt) => {
        setSelectedDoubtForSolve(doubt);
        setReplyText(doubt.teacherReply || '');
        setReplyImages([null, null, null]);
        setReplyPdf(null);
        setReplyVoice(null);
        setExistingReplyImages([doubt.replyImage || null, doubt.replyImage2 || null, doubt.replyImage3 || null]);
        setExistingReplyPdf(doubt.replyPdf || null);
        setExistingReplyVoice(doubt.replyVoiceNote || null);
        setIsSolveModalOpen(true);
    };

    const handleSubmitSolution = async () => {
        const hasText = replyText && replyText.trim().length > 0;
        const hasNewMedia = replyImages.some(Boolean) || replyPdf || replyVoice;
        const hasExistingMedia = existingReplyImages.some(Boolean) || existingReplyPdf || existingReplyVoice;
        if (!hasText && !hasNewMedia && !hasExistingMedia) return;

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

    const insertTemplateText = (tpl) => {
        setReplyText(prev => prev ? `${prev}\n\n${tpl}` : tpl);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
            
            {/* Top Analytics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-6 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 hover:translate-y-[-2px] ${
                    isDarkMode ? 'bg-[#10141D]/90 border-white/10 shadow-black/40' : 'bg-white border-slate-200/80 shadow-slate-200/50'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Total Assigned</span>
                        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                            <BookOpen size={18} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black tracking-tight">{totalDoubtsCount}</h3>
                        <span className="text-xs font-bold text-slate-400">queries</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 mt-2">Overall total student doubts</p>
                </div>

                <div className={`p-6 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 hover:translate-y-[-2px] ${
                    isDarkMode ? 'bg-[#10141D]/90 border-white/10 shadow-black/40' : 'bg-white border-slate-200/80 shadow-slate-200/50'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-black uppercase tracking-widest text-amber-500">Action Needed</span>
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                            <Clock size={18} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black tracking-tight text-amber-500">{pendingCount}</h3>
                        <span className="text-xs font-bold text-amber-500/80">pending</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 mt-2">Awaiting your resolution</p>
                </div>

                <div className={`p-6 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 hover:translate-y-[-2px] ${
                    isDarkMode ? 'bg-[#10141D]/90 border-white/10 shadow-black/40' : 'bg-white border-slate-200/80 shadow-slate-200/50'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500">Solved & Resolved</span>
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black tracking-tight text-emerald-500">{resolvedCount}</h3>
                        <span className="text-xs font-bold text-emerald-500/80">completed</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 mt-2">Successfully answered queries</p>
                </div>

                <div className={`p-6 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 hover:translate-y-[-2px] ${
                    isDarkMode ? 'bg-[#10141D]/90 border-white/10 shadow-black/40' : 'bg-white border-slate-200/80 shadow-slate-200/50'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-black uppercase tracking-widest text-purple-500">Resolution Rate</span>
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                            <Zap size={18} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black tracking-tight text-purple-500">{resolutionRate}%</h3>
                        <span className="text-xs font-bold text-slate-400">efficiency</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 mt-3 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${resolutionRate}%` }} />
                    </div>
                </div>
            </div>

            {/* Main Container */}
            <div className={`p-8 rounded-3xl border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-slate-200/40'}`}>
                
                {/* Header & Controls */}
                <div className="flex flex-col gap-6">
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-1.5">
                                <span className={`px-3 py-1 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md ${isCyanTheme ? 'bg-cyan-500 shadow-cyan-500/20' : 'bg-orange-500 shadow-orange-500/20'}`}>
                                    Faculty Hub
                                </span>
                                <h2 className="text-2xl font-black tracking-tight uppercase">
                                    Solve <span className={isCyanTheme ? 'text-cyan-500' : 'text-orange-500'}>Doubts</span>
                                </h2>
                            </div>
                            <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Review, clarify, and resolve student doubts efficiently.
                            </p>
                        </div>

                        {/* Teacher & Controls */}
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            {isTeacherRole ? (
                                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                    <User size={16} className={isCyanTheme ? 'text-cyan-500' : 'text-orange-500'} />
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned Teacher</p>
                                        <p className={`text-xs font-black uppercase ${isCyanTheme ? 'text-cyan-500' : 'text-orange-500'}`}>{selectedTeacherName}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative min-w-[220px]">
                                    <select
                                        value={selectedTeacherId}
                                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                                        className={`w-full px-4 py-2.5 rounded-xl border outline-none font-bold text-xs appearance-none transition-all ${isDarkMode
                                            ? `bg-slate-900 border-white/10 text-white ${isCyanTheme ? 'focus:border-cyan-500' : 'focus:border-orange-500'}`
                                            : `bg-slate-50 border-slate-200 text-slate-800 ${isCyanTheme ? 'focus:border-cyan-500' : 'focus:border-orange-500'}`}`}
                                    >
                                        <option value="ALL">ALL TEACHERS</option>
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* View Switcher */}
                            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' 
                                        ? (isDarkMode ? 'bg-white/10 text-white shadow-md' : 'bg-white text-slate-900 shadow-md')
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    title="Card Grid View"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'table' 
                                        ? (isDarkMode ? 'bg-white/10 text-white shadow-md' : 'bg-white text-slate-900 shadow-md')
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    title="Table List View"
                                >
                                    <List size={16} />
                                </button>
                            </div>

                            <button
                                onClick={fetchDoubts}
                                className={`p-2.5 rounded-xl border transition-all ${isDarkMode 
                                    ? 'bg-white/5 hover:bg-white/10 text-cyan-400 border-white/10' 
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}`}
                                title="Refresh Doubts"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                        <div className="flex gap-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all relative ${
                                        activeTab === tab.id
                                            ? (isCyanTheme ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'bg-orange-500 text-white shadow-lg shadow-orange-500/25')
                                            : (isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')
                                    }`}
                                >
                                    {tab.label}
                                    <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded-full bg-white/20">
                                        {tab.id === 'Unsolve' ? pendingCount : resolvedCount}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by student name, subject, topic, chapter, or question details..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-12 pr-10 py-3 rounded-xl border outline-none font-medium text-xs transition-all ${
                                isDarkMode
                                    ? 'bg-slate-900/80 border-white/10 text-white focus:border-cyan-500/50'
                                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500/50'
                            }`}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Body */}
                <div className="mt-8">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                            {Array(6).fill(0).map((_, i) => (
                                <div key={i} className={`h-64 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`} />
                            ))}
                        </div>
                    ) : filteredDoubts.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center gap-4 opacity-40">
                            <AlertCircle size={54} strokeWidth={1.5} />
                            <div>
                                <h3 className="text-lg font-bold">No Doubts Found</h3>
                                <p className="text-xs font-medium">No {activeTab === 'Unsolve' ? 'unsolved' : 'resolved'} doubts match your criteria.</p>
                            </div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* GRID CARDS VIEW */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredDoubts.map(doubt => (
                                <div 
                                    key={doubt.id}
                                    className={`group rounded-2xl border p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:translate-y-[-2px] ${
                                        isDarkMode 
                                            ? 'bg-slate-900/60 border-white/10 hover:border-cyan-500/40 shadow-black/40' 
                                            : 'bg-white border-slate-200/80 hover:border-cyan-500/40 shadow-slate-200/50'
                                    }`}
                                >
                                    <div>
                                        {/* Card Top Badges */}
                                        <div className="flex items-center justify-between mb-4 gap-2">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${getSubjectBadgeColor(doubt.subject)}`}>
                                                {doubt.subject}
                                            </span>
                                            
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                                                activeTab === 'Unsolve' 
                                                    ? getTimePendingColor(doubt.rawAssignDate, isDarkMode)
                                                    : (isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200')
                                            }`}>
                                                {activeTab === 'Unsolve' 
                                                    ? `⏱️ ${formatDuration(doubt.rawAssignDate, new Date())}`
                                                    : `✓ Solved in ${formatDuration(doubt.rawAssignDate, doubt.rawSolvedDate)}`}
                                            </span>
                                        </div>

                                        {/* Student Info */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                                                {doubt.student.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm truncate tracking-tight uppercase">{doubt.student}</h4>
                                                <div className="flex items-center gap-2 text-[10px] opacity-60 font-semibold">
                                                    <span>{doubt.studentClass}</span>
                                                    <span>•</span>
                                                    <span className="truncate">{doubt.centre}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Question Title & Description */}
                                        <div className="mb-4">
                                            <h5 className="font-bold text-sm tracking-tight mb-1 text-slate-800 dark:text-slate-100 line-clamp-1">{doubt.title}</h5>
                                            <p className="text-xs opacity-70 line-clamp-3 leading-relaxed font-medium italic">
                                                "{doubt.description || 'No detailed description provided.'}"
                                            </p>
                                        </div>

                                        {/* Attachments Indicators */}
                                        <div className="flex flex-wrap items-center gap-2 mb-6 text-[10px] font-bold">
                                            {(doubt.image || doubt.image2 || doubt.image3) && (
                                                <span className="px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 flex items-center gap-1">
                                                    <Image size={12} /> Image attached
                                                </span>
                                            )}
                                            {doubt.pdf && (
                                                <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
                                                    <FileText size={12} /> PDF
                                                </span>
                                            )}
                                            {doubt.voice_note && (
                                                <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center gap-1">
                                                    <Mic size={12} /> Audio
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                                        <button
                                            onClick={() => handleShowDoubtClick(doubt)}
                                            className={`p-2.5 rounded-xl border transition-all ${
                                                isDarkMode 
                                                    ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10' 
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                            }`}
                                            title="View Details"
                                        >
                                            <Eye size={16} />
                                        </button>

                                        {isTeacherRole && (
                                            activeTab === 'Unsolve' ? (
                                                <button
                                                    onClick={() => openSolveModal(doubt)}
                                                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Send size={14} />
                                                    <span>Write Solution</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => openSolveModal(doubt)}
                                                    className={`flex-1 py-2.5 px-4 rounded-xl text-white font-black text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2 ${
                                                        isCyanTheme ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/20' : 'bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-600/20'
                                                    }`}
                                                >
                                                    <Send size={14} />
                                                    <span>Edit Solution</span>
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* TABLE LIST VIEW */
                        <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-slate-200 dark:border-white/10">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${
                                        isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                                    }`}>
                                        <th className="py-4 px-6 text-center">Ref ID</th>
                                        <th className="py-4 px-6">Student</th>
                                        <th className="py-4 px-6">Subject & Chapter</th>
                                        <th className="py-4 px-6">Centre</th>
                                        <th className="py-4 px-6 text-center">Assign Date</th>
                                        <th className="py-4 px-6 text-center">{activeTab === 'Unsolve' ? 'Pending Time' : 'Time Taken'}</th>
                                        <th className="py-4 px-6 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {filteredDoubts.map(doubt => (
                                        <tr key={doubt.id} className={`transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                            <td className="py-4 px-6 text-center font-black text-xs text-slate-400">
                                                #{doubt.id}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm tracking-tight uppercase">{doubt.student}</span>
                                                    <span className="text-[10px] opacity-50 font-semibold">{doubt.studentClass} • ID: {doubt.studentId || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-black uppercase ${getSubjectBadgeColor(doubt.subject).split(' ')[1]}`}>{doubt.subject}</span>
                                                    <span className="text-[11px] font-medium opacity-70 truncate max-w-[200px]">{doubt.chapter || 'General'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-xs font-bold opacity-80">
                                                {doubt.centre}
                                            </td>
                                            <td className="py-4 px-6 text-center text-xs opacity-60 font-medium">
                                                {doubt.assignDate || 'N/A'}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${
                                                    activeTab === 'Unsolve' 
                                                        ? getTimePendingColor(doubt.rawAssignDate, isDarkMode)
                                                        : (isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200')
                                                }`}>
                                                    {activeTab === 'Unsolve' ? formatDuration(doubt.rawAssignDate, new Date()) : formatDuration(doubt.rawAssignDate, doubt.rawSolvedDate)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleShowDoubtClick(doubt)}
                                                        className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/10 hover:text-cyan-500 transition-all"
                                                        title="View Doubt"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {isTeacherRole && (
                                                        <button
                                                            onClick={() => openSolveModal(doubt)}
                                                            className={`px-3 py-1.5 rounded-xl text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${
                                                                activeTab === 'Unsolve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'
                                                            }`}
                                                        >
                                                            <Send size={12} />
                                                            <span>{activeTab === 'Unsolve' ? 'Solve' : 'Edit'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Count */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Showing {filteredDoubts.length} of {doubts.length} doubts</span>
                    <span>Role: {isTeacherRole ? 'Faculty' : 'Admin'} View</span>
                </div>
            </div>

            {/* Show Doubt Details Modal */}
            {isShowDoubtModalOpen && selectedDoubtForView && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#0E131F] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                        {/* Header */}
                        <div className={`flex items-center justify-between px-8 py-5 text-white ${isCyanTheme ? 'bg-cyan-600' : 'bg-orange-600'}`}>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight">Doubt Query #{selectedDoubtForView.id}</h3>
                                <p className="text-xs font-bold opacity-80">{selectedDoubtForView.student} ({selectedDoubtForView.studentClass}) — {selectedDoubtForView.centre}</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-full transition-all">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            {/* Metadata */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Subject</p>
                                    <p className="font-bold text-cyan-500 uppercase">{selectedDoubtForView.subject}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Chapter</p>
                                    <p className="font-semibold truncate">{selectedDoubtForView.chapter || 'General'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Topic</p>
                                    <p className="font-semibold truncate">{selectedDoubtForView.topic || 'General'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Posted Date</p>
                                    <p className="font-semibold opacity-80">{selectedDoubtForView.date}</p>
                                </div>
                            </div>

                            {/* Query Box */}
                            <div className={`p-6 rounded-2xl border ${isCyanTheme ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                                <h4 className={`text-sm font-black uppercase tracking-tight mb-2 ${isCyanTheme ? 'text-cyan-500' : 'text-orange-500'}`}>
                                    {selectedDoubtForView.title}
                                </h4>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                    "{selectedDoubtForView.description}"
                                </p>
                            </div>

                            {/* Attachments Gallery */}
                            {(selectedDoubtForView.image || selectedDoubtForView.image2 || selectedDoubtForView.image3) && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student Attached Images</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {[selectedDoubtForView.image, selectedDoubtForView.image2, selectedDoubtForView.image3].map((img, i) => img && (
                                            <button 
                                                key={i} 
                                                type="button"
                                                onClick={() => openMediaPreview(img, 'image', `Student Image ${i+1}`)} 
                                                className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 shadow-lg cursor-pointer"
                                            >
                                                <img src={resolveMediaUrl(img)} alt="Attachment" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <Eye size={20} className="text-white" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedDoubtForView.pdf && (
                                <button 
                                    type="button"
                                    onClick={() => openMediaPreview(selectedDoubtForView.pdf, 'pdf', 'Student Attached PDF')}
                                    className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-all font-bold text-xs w-full text-left"
                                >
                                    <FileText size={18} />
                                    <span>View Attached PDF Document</span>
                                    <Eye size={14} className="ml-auto opacity-70" />
                                </button>
                            )}

                            {selectedDoubtForView.voice_note && (
                                <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2"><Mic size={14}/>Voice Explanation</p>
                                    <audio controls src={resolveMediaUrl(selectedDoubtForView.voice_note)} className="w-full h-9" />
                                </div>
                            )}

                            {/* Existing Solution if solved */}
                            {selectedDoubtForView.status === 'Resolved' && (
                                <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                            <CheckCircle2 size={16} /> Teacher Solution Response
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-bold">{selectedDoubtForView.solvedDate}</span>
                                    </div>
                                    <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{selectedDoubtForView.teacherReply || 'No written explanation provided.'}</p>
                                    
                                    {/* Teacher Solution Attachments */}
                                    {(selectedDoubtForView.replyImage || selectedDoubtForView.replyImage2 || selectedDoubtForView.replyImage3) && (
                                        <div className="space-y-2 pt-2 border-t border-emerald-500/20">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Solution Images</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {[selectedDoubtForView.replyImage, selectedDoubtForView.replyImage2, selectedDoubtForView.replyImage3].map((img, i) => img && (
                                                    <button 
                                                        key={i} 
                                                        type="button"
                                                        onClick={() => openMediaPreview(img, 'image', `Solution Image ${i+1}`)} 
                                                        className="group relative aspect-video rounded-xl overflow-hidden border border-emerald-500/20 shadow-lg cursor-pointer"
                                                    >
                                                        <img src={resolveMediaUrl(img)} alt="Solution Image" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <Eye size={20} className="text-white" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedDoubtForView.replyPdf && (
                                        <button 
                                            type="button"
                                            onClick={() => openMediaPreview(selectedDoubtForView.replyPdf, 'pdf', "Teacher's Solution PDF")}
                                            className="flex items-center gap-3 p-3 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all font-bold text-xs w-full text-left"
                                        >
                                            <FileText size={18} />
                                            <span>View Solution PDF Document</span>
                                            <Eye size={14} className="ml-auto opacity-70" />
                                        </button>
                                    )}

                                    {selectedDoubtForView.replyVoiceNote && (
                                        <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-300 flex items-center gap-2"><Mic size={14}/>Teacher Voice Explanation</p>
                                            <audio controls src={resolveMediaUrl(selectedDoubtForView.replyVoiceNote)} className="w-full h-8" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Solve / Solution Composer Modal */}
            {isSolveModalOpen && selectedDoubtForSolve && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#0E131F] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                        
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-5 bg-emerald-600 text-white">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight">Submit Doubt Solution</h3>
                                <p className="text-xs font-bold opacity-80">{selectedDoubtForSolve.student} • {selectedDoubtForSolve.subject}</p>
                            </div>
                            <button onClick={() => setIsSolveModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-all">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            
                            {/* Question Summary & Attachments */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs space-y-3">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Student Question</span>
                                    <h5 className="font-bold text-cyan-500 text-sm">{selectedDoubtForSolve.title}</h5>
                                    <p className="opacity-80 leading-relaxed font-medium">{selectedDoubtForSolve.description}</p>
                                </div>

                                {/* Student Media Attachments */}
                                {(selectedDoubtForSolve.image || selectedDoubtForSolve.image2 || selectedDoubtForSolve.image3 || selectedDoubtForSolve.pdf || selectedDoubtForSolve.voice_note) && (
                                    <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Question Attachments</span>
                                        <div className="flex flex-wrap items-center gap-3">
                                            {[selectedDoubtForSolve.image, selectedDoubtForSolve.image2, selectedDoubtForSolve.image3].map((img, i) => img && (
                                                <button
                                                    type="button"
                                                    key={i}
                                                    onClick={() => openMediaPreview(img, 'image', `Question Attachment ${i+1}`)}
                                                    className="relative w-16 h-16 rounded-xl border border-white/20 overflow-hidden cursor-pointer hover:opacity-85 transition-opacity"
                                                >
                                                    <img src={resolveMediaUrl(img)} alt={`Question Img ${i+1}`} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                        <Eye size={12} className="text-white" />
                                                    </div>
                                                </button>
                                            ))}

                                            {selectedDoubtForSolve.pdf && (
                                                <button
                                                    type="button"
                                                    onClick={() => openMediaPreview(selectedDoubtForSolve.pdf, 'pdf', 'Student Question PDF')}
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-xs hover:bg-red-500/20 transition-all"
                                                >
                                                    <FileText size={14} />
                                                    <span>Question PDF</span>
                                                    <Eye size={12} />
                                                </button>
                                            )}

                                            {selectedDoubtForSolve.voice_note && (
                                                <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs">
                                                    <Mic size={14} />
                                                    <audio controls src={resolveMediaUrl(selectedDoubtForSolve.voice_note)} className="h-7 w-44" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick Solution Template Chips */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                    <Sparkles size={12} className="text-amber-400" /> Quick Response Templates
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => insertTemplateText("📐 Key Formula:\n\nStep-by-step calculation:")}
                                        className="px-3 py-1.5 rounded-lg border text-[11px] font-bold bg-white/5 border-white/10 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
                                    >
                                        📐 Step-by-Step Formula
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => insertTemplateText("💡 Key Concept Clarification:\n\nRemember that:")}
                                        className="px-3 py-1.5 rounded-lg border text-[11px] font-bold bg-white/5 border-white/10 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
                                    >
                                        💡 Concept Clarification
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => insertTemplateText("📝 Solution Diagram / Image Attached below.")}
                                        className="px-3 py-1.5 rounded-lg border text-[11px] font-bold bg-white/5 border-white/10 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
                                    >
                                        📝 Diagram Reference
                                    </button>
                                </div>
                            </div>

                            {/* Solution Text Editor */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Detailed Solution Explanation *</label>
                                <textarea
                                    rows={5}
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder="Write your comprehensive solution explanation for the student..."
                                    className={`w-full px-4 py-3 rounded-2xl border outline-none font-medium text-xs resize-none transition-all ${
                                        isDarkMode
                                            ? 'bg-slate-900 border-white/10 text-white focus:border-emerald-500'
                                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                                    }`}
                                />
                            </div>

                            {/* Image Attachments */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Image size={14}/> Solution Diagrams / Images (up to 3)
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {replyImages.map((file, i) => {
                                        const existing = existingReplyImages[i];
                                        return (
                                            <div key={i} className="relative aspect-square">
                                                {file ? (
                                                    <div className="relative w-full h-full rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 overflow-hidden group">
                                                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = [...replyImages];
                                                                updated[i] = null;
                                                                setReplyImages(updated);
                                                            }}
                                                            className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-red-500 text-white rounded-full transition-colors"
                                                            title="Remove"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                        <span className="absolute bottom-1 right-1 bg-emerald-500 text-white text-[8px] font-black rounded px-1">New ✓</span>
                                                    </div>
                                                ) : existing ? (
                                                    <div className="relative w-full h-full rounded-2xl border-2 border-cyan-500/40 bg-cyan-500/5 overflow-hidden group">
                                                        <img src={resolveMediaUrl(existing)} alt="existing" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                                                            <button
                                                                type="button"
                                                                onClick={() => openMediaPreview(existing, 'image', `Previous Image ${i+1}`)}
                                                                className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg text-[10px] font-bold"
                                                                title="View"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <label className="p-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-[10px] font-bold cursor-pointer" title="Replace">
                                                                <Upload size={14} />
                                                                <input type="file" accept="image/*" className="hidden" onChange={e => {
                                                                    const updated = [...replyImages];
                                                                    updated[i] = e.target.files[0] || null;
                                                                    setReplyImages(updated);
                                                                }} />
                                                            </label>
                                                        </div>
                                                        <span className="absolute bottom-1 left-1 bg-cyan-500/90 text-white text-[7.5px] font-black uppercase rounded px-1">Attached</span>
                                                    </div>
                                                ) : (
                                                    <label className={`w-full h-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                                                        isDarkMode ? 'border-white/10 hover:border-white/30' : 'border-slate-200 hover:border-slate-400'
                                                    }`}>
                                                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                                                            const updated = [...replyImages];
                                                            updated[i] = e.target.files[0] || null;
                                                            setReplyImages(updated);
                                                        }}/>
                                                        <Upload size={18} className="opacity-40"/>
                                                        <span className="text-[9px] font-bold opacity-40">Upload {i+1}</span>
                                                    </label>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* PDF & Audio Uploads */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><FileText size={14}/>Attach PDF Document</label>
                                    {replyPdf ? (
                                        <div className="flex items-center justify-between p-3 rounded-2xl border-2 border-emerald-500 bg-emerald-500/10">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-xs flex-shrink-0">PDF</div>
                                                <span className="text-xs font-bold truncate text-emerald-400">{replyPdf.name}</span>
                                            </div>
                                            <button type="button" onClick={() => setReplyPdf(null)} className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : existingReplyPdf ? (
                                        <div className="flex items-center justify-between p-3 rounded-2xl border-2 border-red-500/30 bg-red-500/5">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 font-black text-xs flex-shrink-0">PDF</div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-red-400 truncate">Previous Attached PDF</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => openMediaPreview(existingReplyPdf, 'pdf', 'Attached Solution PDF')}
                                                        className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                                                    >
                                                        <Eye size={10} /> View Document
                                                    </button>
                                                </div>
                                            </div>
                                            <label className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white cursor-pointer transition-colors">
                                                Replace
                                                <input type="file" accept=".pdf" className="hidden" onChange={e => setReplyPdf(e.target.files[0] || null)} />
                                            </label>
                                        </div>
                                    ) : (
                                        <label className={`flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${isDarkMode ? 'border-white/10 hover:border-white/30' : 'border-slate-200 hover:border-slate-400'}`}>
                                            <input type="file" accept=".pdf" className="hidden" onChange={e => setReplyPdf(e.target.files[0] || null)}/>
                                            <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 font-black text-xs flex-shrink-0">PDF</div>
                                            <span className="text-xs font-bold truncate opacity-70">Choose PDF file...</span>
                                        </label>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Mic size={14}/>Attach Audio Explanation</label>
                                    {replyVoice ? (
                                        <div className="flex items-center justify-between p-3 rounded-2xl border-2 border-emerald-500 bg-emerald-500/10">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0"><Mic size={16}/></div>
                                                <span className="text-xs font-bold truncate text-emerald-400">{replyVoice.name}</span>
                                            </div>
                                            <button type="button" onClick={() => setReplyVoice(null)} className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : existingReplyVoice ? (
                                        <div className="p-3 rounded-2xl border-2 border-purple-500/30 bg-purple-500/5 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                                                    <Mic size={14} /> Previous Audio Attached
                                                </div>
                                                <label className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white cursor-pointer transition-colors">
                                                    Replace
                                                    <input type="file" accept="audio/*" className="hidden" onChange={e => setReplyVoice(e.target.files[0] || null)} />
                                                </label>
                                            </div>
                                            <audio controls src={resolveMediaUrl(existingReplyVoice)} className="w-full h-7" />
                                        </div>
                                    ) : (
                                        <label className={`flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${isDarkMode ? 'border-white/10 hover:border-white/30' : 'border-slate-200 hover:border-slate-400'}`}>
                                            <input type="file" accept="audio/*" className="hidden" onChange={e => setReplyVoice(e.target.files[0] || null)}/>
                                            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500 flex-shrink-0"><Mic size={16}/></div>
                                            <span className="text-xs font-bold truncate opacity-70">Choose audio file...</span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmitSolution}
                                disabled={submitting || (!replyText.trim() && !replyImages.some(Boolean) && !replyPdf && !replyVoice && !existingReplyImages.some(Boolean) && !existingReplyPdf && !existingReplyVoice)}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                                    submitting || (!replyText.trim() && !replyImages.some(Boolean) && !replyPdf && !replyVoice && !existingReplyImages.some(Boolean) && !existingReplyPdf && !existingReplyVoice)
                                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xl shadow-emerald-600/25'
                                }`}
                            >
                                {submitting ? <><RefreshCw size={16} className="animate-spin"/>Submitting Solution...</> : <><Send size={16}/>Publish Solution</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Universal Media Preview Modal Overlay */}
            {mediaPreview && (
                <div 
                    className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-hidden animate-in fade-in"
                    onClick={() => setMediaPreview(null)}
                >
                    <div 
                        className={`relative w-full ${mediaPreview.type === 'pdf' ? 'max-w-5xl h-[80vh] max-h-[calc(100vh-3.5rem)]' : 'max-w-4xl max-h-[88vh] h-auto'} flex flex-col rounded-2xl overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#0d1119] border border-white/10 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="flex items-center gap-2">
                                {mediaPreview.type === 'pdf' ? <FileText size={16} className="text-rose-500" /> : <Eye size={16} className="text-cyan-500" />}
                                <span className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {mediaPreview.title || 'Preview'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={mediaPreview.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                    }`}
                                >
                                    <ExternalLink size={13} />
                                    <span>Open in New Tab</span>
                                </a>
                                <button onClick={() => setMediaPreview(null)} className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}>
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-auto flex flex-col bg-slate-900/5 dark:bg-black/40 p-2 sm:p-4">
                            {mediaPreview.type === 'pdf' ? (
                                <iframe src={mediaPreview.url} title="PDF Preview" className="w-full h-full flex-1 rounded-xl border-0 block" />
                            ) : (
                                <div className="w-full flex items-center justify-center m-auto">
                                    <img 
                                        src={mediaPreview.url} 
                                        alt="Preview" 
                                        className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-md block" 
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SolveDoubt;
