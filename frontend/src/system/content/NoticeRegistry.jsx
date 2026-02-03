import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, FileText, Eye, Edit2, Trash2, RefreshCw, X, Upload, FileCheck, AlertCircle, ChevronLeft, Loader2, Maximize2, Minimize2, ExternalLink, ChevronsLeft, ChevronsRight, ChevronRight, Filter, Bell } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const NoticeRegistry = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Master Data State
    const [sessions, setSessions] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [targetExams, setTargetExams] = useState([]);
    const [sections, setSections] = useState([]);

    // View Modal State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedItemForView, setSelectedItemForView] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Pagination & Filter State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpToPage, setJumpToPage] = useState('');
    const [activeFilters, setActiveFilters] = useState({
        session: '',
        class_level: '',
        subject: '',
        exam_type: '',
        target_exam: '',
        section: ''
    });

    const [notices, setNotices] = useState([]);
    const [previews, setPreviews] = useState({
        file_attachment: null
    });

    const [newItem, setNewItem] = useState({
        title: '',
        description: '',
        file_attachment: null,
        session: '',
        class_level: '',
        subject: '',
        exam_type: '',
        target_exam: '',
        section: ''
    });

    const fetchNotices = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/notices/`);
            setNotices(response.data);
        } catch (error) {
            console.error("Failed to fetch notices", error);
            toast.error("Failed to load academic notices");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl]);

    const fetchMasterData = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const [sessRes, classRes, subRes, etRes, teRes, secRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/sessions/`),
                axios.get(`${apiUrl}/api/master-data/classes/`),
                axios.get(`${apiUrl}/api/master-data/subjects/`),
                axios.get(`${apiUrl}/api/master-data/exam-types/`),
                axios.get(`${apiUrl}/api/master-data/target-exams/`),
                axios.get(`${apiUrl}/api/sections/`)
            ]);
            setSessions(sessRes.data);
            setClasses(classRes.data);
            setSubjects(subRes.data);
            setExamTypes(etRes.data);
            setTargetExams(teRes.data);
            setSections(secRes.data);
        } catch (error) {
            console.error("Failed to fetch master data", error);
        }
    }, [getApiUrl]);

    useEffect(() => {
        fetchNotices();
        fetchMasterData();
    }, [fetchNotices, fetchMasterData]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewItem({ ...newItem, file_attachment: file });
            const isImage = file.type.startsWith('image/');
            setPreviews({
                file_attachment: file.name,
                image_preview: isImage ? URL.createObjectURL(file) : null
            });
        }
    };

    const handleRemoveFile = () => {
        setNewItem({ ...newItem, file_attachment: null });
        setPreviews({ file_attachment: null, image_preview: null });
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            formData.append('title', newItem.title);
            formData.append('description', newItem.description);
            if (newItem.session) formData.append('session', newItem.session);
            if (newItem.class_level) formData.append('class_level', newItem.class_level);
            if (newItem.subject) formData.append('subject', newItem.subject);
            if (newItem.exam_type) formData.append('exam_type', newItem.exam_type);
            if (newItem.target_exam) formData.append('target_exam', newItem.target_exam);
            if (newItem.section) formData.append('section', newItem.section);
            if (newItem.file_attachment) formData.append('file_attachment', newItem.file_attachment);

            await axios.post(`${apiUrl}/api/master-data/notices/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Notice published successfully");
            setIsAddModalOpen(false);
            resetForm();
            fetchNotices();
        } catch (error) {
            console.error("Failed to add notice", error);
            toast.error("Failed to publish notice");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEditClick = (item) => {
        setSelectedItemForEdit(item);
        setNewItem({
            title: item.title,
            description: item.description || '',
            session: item.session || '',
            class_level: item.class_level || '',
            subject: item.subject || '',
            exam_type: item.exam_type || '',
            target_exam: item.target_exam || '',
            section: item.section || '',
            file_attachment: null
        });
        const isImage = item.file_attachment && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.file_attachment);
        setPreviews({
            file_attachment: item.file_attachment ? item.file_attachment.split('/').pop() : null,
            image_preview: isImage ? item.file_attachment : null
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            formData.append('title', newItem.title);
            formData.append('description', newItem.description);
            formData.append('session', newItem.session || '');
            formData.append('class_level', newItem.class_level || '');
            formData.append('subject', newItem.subject || '');
            formData.append('exam_type', newItem.exam_type || '');
            formData.append('target_exam', newItem.target_exam || '');
            formData.append('section', newItem.section || '');
            if (newItem.file_attachment) formData.append('file_attachment', newItem.file_attachment);

            await axios.patch(`${apiUrl}/api/master-data/notices/${selectedItemForEdit.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Notice updated successfully");
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
            resetForm();
            fetchNotices();
        } catch (error) {
            console.error("Failed to update notice", error);
            toast.error("Failed to update notice");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this notice?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/notices/${id}/`);
            toast.success("Notice deleted");
            fetchNotices();
        } catch (error) {
            console.error("Failed to delete notice", error);
            toast.error("Failed to delete notice");
        }
    };

    const resetForm = () => {
        setNewItem({ title: '', description: '', file_attachment: null, session: '', class_level: '', subject: '', exam_type: '', target_exam: '', section: '' });
        setPreviews({ file_attachment: null });
    };

    // Advanced Filtered Logic
    const filteredNotices = useMemo(() => {
        return notices.filter(n => {
            const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSession = !activeFilters.session || n.session === activeFilters.session;
            const matchesClass = !activeFilters.class_level || n.class_level === activeFilters.class_level;
            const matchesSubject = !activeFilters.subject || n.subject === activeFilters.subject;
            const matchesExamType = !activeFilters.exam_type || n.exam_type === activeFilters.exam_type;
            const matchesTargetExam = !activeFilters.target_exam || n.target_exam === activeFilters.target_exam;
            const matchesSection = !activeFilters.section || n.section === activeFilters.section;
            return matchesSearch && matchesSession && matchesClass && matchesSubject && matchesExamType && matchesTargetExam && matchesSection;
        });
    }, [notices, searchQuery, activeFilters]);

    // Dynamic Filter Options based on available data
    const dynamicFilterOptions = useMemo(() => {
        return {
            sessions: [...new Set(notices.filter(n => n.session_name).map(n => JSON.stringify({ id: n.session, name: n.session_name })))].map(s => JSON.parse(s)),
            classes: [...new Set(notices.filter(n => n.class_name).map(n => JSON.stringify({ id: n.class_level, name: n.class_name })))].map(c => JSON.parse(c)),
            subjects: [...new Set(notices.filter(n => n.subject_name).map(n => JSON.stringify({ id: n.subject, name: n.subject_name })))].map(s => JSON.parse(s)),
            examTypes: [...new Set(notices.filter(n => n.exam_type_name).map(n => JSON.stringify({ id: n.exam_type, name: n.exam_type_name })))].map(e => JSON.parse(e)),
            targetExams: [...new Set(notices.filter(n => n.target_exam_name).map(n => JSON.stringify({ id: n.target_exam, name: n.target_exam_name })))].map(t => JSON.parse(t)),
            sections: [...new Set(notices.filter(n => n.section_name).map(n => JSON.stringify({ id: n.section, name: n.section_name })))].map(s => JSON.parse(s))
        };
    }, [notices]);

    // Pagination logic
    const totalPages = Math.ceil(filteredNotices.length / itemsPerPage);
    const paginatedNotices = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredNotices.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredNotices, currentPage, itemsPerPage]);

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const pageNum = parseInt(jumpToPage);
        if (pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
            setJumpToPage('');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative text-slate-900 dark:text-white">
            <div className={`p-8 rounded-[2.5rem] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/20">
                                    Announcements
                                </span>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    Academic <span className="text-amber-500">Notices</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Post important updates and announcements for students and staff.
                            </p>
                        </div>
                        <button
                            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                            className="group flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-amber-500/25 active:scale-95 whitespace-nowrap"
                        >
                            <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-all duration-300" />
                            <span>Add Notice</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 group">
                                <Search className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-amber-500' : 'text-slate-400 group-focus-within:text-amber-500'}`} size={18} />
                                <input
                                    type="text"
                                    placeholder="Search notices by title..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full pl-14 pr-6 py-4 rounded-2xl border-2 outline-none transition-all font-bold text-sm ${isDarkMode ? 'bg-white/[0.01] border-white/5 focus:border-amber-500/50 text-white' : 'bg-slate-50 border-slate-100 focus:border-amber-500 focus:bg-white text-slate-900'}`}
                                />
                            </div>
                            <button
                                onClick={() => { fetchNotices(); fetchMasterData(); }}
                                className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-amber-500 border border-white/5' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100'}`}
                            >
                                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className={`p-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                <Filter size={14} /> Filters
                            </div>
                            <select
                                value={activeFilters.session}
                                onChange={(e) => setActiveFilters({ ...activeFilters, session: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Sessions</option>
                                {dynamicFilterOptions.sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select
                                value={activeFilters.class_level}
                                onChange={(e) => setActiveFilters({ ...activeFilters, class_level: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Classes</option>
                                {dynamicFilterOptions.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select
                                value={activeFilters.subject}
                                onChange={(e) => setActiveFilters({ ...activeFilters, subject: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Subjects</option>
                                {dynamicFilterOptions.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select
                                value={activeFilters.exam_type}
                                onChange={(e) => setActiveFilters({ ...activeFilters, exam_type: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Exam Types</option>
                                {dynamicFilterOptions.examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <select
                                value={activeFilters.target_exam}
                                onChange={(e) => setActiveFilters({ ...activeFilters, target_exam: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Target Exams</option>
                                {dynamicFilterOptions.targetExams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <select
                                value={activeFilters.section}
                                onChange={(e) => setActiveFilters({ ...activeFilters, section: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Sections</option>
                                {dynamicFilterOptions.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            {(activeFilters.session || activeFilters.class_level || activeFilters.subject || activeFilters.exam_type || activeFilters.target_exam || activeFilters.section) && (
                                <button
                                    onClick={() => setActiveFilters({ session: '', class_level: '', subject: '', exam_type: '', target_exam: '', section: '' })}
                                    className="px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10 active:scale-95"
                                >
                                    Clear All Filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`rounded-[2.5rem] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-900/50'}`}>
                                <th className="py-5 px-6 text-center w-20">#</th>
                                <th className="py-5 px-6">Notice Details</th>
                                <th className="py-5 px-6 text-center">Category</th>
                                <th className="py-5 px-6 text-center">Attachment</th>
                                <th className="py-5 px-6 text-center">Published</th>
                                <th className="py-5 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 border-t border-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <Loader2 size={40} className="animate-spin text-amber-500" />
                                            <p className="font-bold text-lg opacity-50 text-slate-500 uppercase tracking-widest">Fetching notices...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedNotices.length > 0 ? (
                                paginatedNotices.map((notice, index) => (
                                    <tr key={notice.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`text-xs font-black ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>{((currentPage - 1) * itemsPerPage) + index + 1}</span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm block group-hover:text-amber-500 transition-colors uppercase tracking-tight">{notice.title}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {notice.session_name && <span className="text-[10px] font-bold text-amber-500/60 uppercase">{notice.session_name}</span>}
                                                    {notice.class_name && (
                                                        <>
                                                            <span className="w-1 h-1 bg-slate-500 rounded-full opacity-30" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{notice.class_name}</span>
                                                        </>
                                                    )}
                                                    {notice.section_name && (
                                                        <>
                                                            <span className="w-1 h-1 bg-slate-500 rounded-full opacity-30" />
                                                            <span className="text-[10px] font-bold text-indigo-500 uppercase">{notice.section_name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                {notice.subject_name ? (
                                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-lg border border-emerald-500/20">{notice.subject_name}</span>
                                                ) : <span className="text-[9px] font-black uppercase opacity-20">General</span>}
                                                {notice.exam_type_name && <span className="text-[8px] font-black uppercase opacity-40">{notice.exam_type_name}</span>}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                {notice.file_attachment ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        {/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(notice.file_attachment) ? (
                                                            <div
                                                                onClick={() => {
                                                                    setSelectedItemForView(notice);
                                                                    setIsViewModalOpen(true);
                                                                }}
                                                                className="relative group/img overflow-hidden rounded-lg shadow-md w-12 h-12 border border-white/10 bg-black/5 cursor-pointer active:scale-90 transition-all"
                                                            >
                                                                <img src={notice.file_attachment} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <Eye size={14} className="text-white" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedItemForView(notice);
                                                                    setIsViewModalOpen(true);
                                                                }}
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                                                            >
                                                                <FileText size={12} /> View Document
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : <span className="text-[10px] opacity-20 italic font-bold">No File</span>}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black opacity-60 uppercase">{new Date(notice.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                <span className="text-[9px] font-bold opacity-30 uppercase">{new Date(notice.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditClick(notice)} className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-blue-500/5">
                                                    <Edit2 size={14} strokeWidth={3} />
                                                </button>
                                                <button onClick={() => handleDeleteItem(notice.id)} className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-red-500/5">
                                                    <Trash2 size={14} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-500 font-bold uppercase tracking-[0.2em] text-xs opacity-40 italic">No notices matching criteria</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className={`p-8 border-t flex flex-col md:flex-row justify-between items-center gap-8 ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Showing</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-xl font-bold text-xs outline-none border-none cursor-pointer ${isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-700 shadow-sm transition-all'}`}
                        >
                            {[10, 20, 50].map(val => (
                                <option key={val} value={val} className={isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-800'}>{val} per page</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className={`p-2 rounded-xl bg-white/5 hover:bg-amber-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronsLeft size={18} strokeWidth={2.5} /></button>
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className={`p-2 rounded-xl bg-white/5 hover:bg-amber-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronLeft size={18} strokeWidth={2.5} /></button>
                        <div className="flex items-center gap-1 mx-4">
                            <span className="text-[10px] font-black uppercase opacity-40 tracking-tighter">Page</span>
                            <span className="px-4 py-1.5 bg-amber-500 text-white rounded-lg font-black text-xs shadow-lg shadow-amber-500/20">{currentPage}</span>
                            <span className="text-[10px] font-black uppercase opacity-40 tracking-tighter">of {totalPages || 1}</span>
                        </div>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className={`p-2 rounded-xl bg-white/5 hover:bg-amber-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronRight size={18} strokeWidth={2.5} /></button>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(totalPages)} className={`p-2 rounded-xl bg-white/5 hover:bg-amber-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronsRight size={18} strokeWidth={2.5} /></button>
                    </div>

                    <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="Jump..."
                            value={jumpToPage}
                            onChange={(e) => setJumpToPage(e.target.value)}
                            className={`w-20 px-4 py-2 rounded-xl text-xs font-bold outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white focus:border-amber-500/50' : 'bg-white border-slate-200 text-slate-800 focus:border-amber-500'}`}
                        />
                        <button type="submit" className={`p-2 rounded-xl transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-amber-500' : 'bg-amber-50 hover:bg-amber-100 text-amber-600'}`}>Go</button>
                    </form>
                </div>
            </div>

            {/* Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                    <div className={`w-full max-w-2xl rounded-[2.5rem] border shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/10 shadow-black' : 'bg-white border-slate-100 shadow-slate-200'}`}>
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-500/20"><Bell size={20} /></div>
                                <h2 className="text-xl font-black uppercase tracking-tight">{isAddModalOpen ? 'Create New' : 'Edit'} <span className="text-amber-500">Notice</span></h2>
                            </div>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={isAddModalOpen ? handleAddItem : handleUpdateItem} className="p-8 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            {/* Top Section: Academic Targeting */}
                            <div className={`p-6 rounded-[2rem] border transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-1.5 h-5 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80 text-amber-500">Academic Targeting</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    {[
                                        { label: 'Session', field: 'session', options: sessions },
                                        { label: 'Class Level', field: 'class_level', options: classes },
                                        { label: 'Subject', field: 'subject', options: subjects },
                                        { label: 'Exam Type', field: 'exam_type', options: examTypes },
                                        { label: 'Target Exam', field: 'target_exam', options: targetExams },
                                        { label: 'Section', field: 'section', options: sections }
                                    ].map((meta, idx) => (
                                        <div key={idx} className="space-y-1.5">
                                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">{meta.label}</label>
                                            <select
                                                value={newItem[meta.field]}
                                                onChange={(e) => setNewItem({ ...newItem, [meta.field]: e.target.value })}
                                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                                className={`w-full px-4 py-3 rounded-xl border-2 outline-none font-bold text-xs transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/5 text-white focus:border-amber-500/50' : 'bg-white border-slate-200 text-slate-800 focus:border-amber-500'}`}
                                            >
                                                <option value="">All {meta.label}s</option>
                                                {meta.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Section: Content Details */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Notice Title *</label>
                                        <input
                                            required
                                            type="text"
                                            value={newItem.title}
                                            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                            className={`w-full px-6 py-4 rounded-2xl outline-none border-2 font-black transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5 focus:border-amber-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-100 focus:border-amber-500 focus:bg-white text-slate-800'}`}
                                            placeholder="Enter notice title..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Description (Optional)</label>
                                        <textarea
                                            value={newItem.description}
                                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            className={`w-full px-6 py-4 rounded-2xl outline-none border-2 font-bold transition-all min-h-[140px] resize-none ${isDarkMode ? 'bg-white/[0.02] border-white/5 focus:border-amber-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-200 focus:border-amber-500 focus:bg-white text-slate-800'}`}
                                            placeholder="Provide more context for students..."
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col">
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Attachment</label>
                                    <div className={`relative flex-grow min-h-[220px] rounded-[2rem] border-2 border-dashed transition-all group overflow-hidden flex flex-col items-center justify-center p-6 ${isDarkMode ? 'border-white/10 hover:border-amber-500/50 bg-white/[0.01]' : 'border-slate-200 hover:border-amber-500 bg-slate-50'}`}>
                                        {(previews.image_preview || previews.file_attachment) ? (
                                            <div className="relative w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                                                    className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-xl shadow-xl hover:bg-red-600 transition-all active:scale-90"
                                                >
                                                    <X size={16} strokeWidth={3} />
                                                </button>

                                                {previews.image_preview ? (
                                                    <img src={previews.image_preview} alt="Notice Preview" className="max-h-40 w-full object-contain rounded-2xl shadow-2xl border border-white/10 mb-3" />
                                                ) : (
                                                    <FileCheck size={48} className="text-amber-500 mb-2" />
                                                )}
                                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 truncate max-w-full px-4">{previews.file_attachment}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                <div className="p-5 rounded-3xl bg-amber-500/10 text-amber-500 mb-4 group-hover:scale-110 transition-transform duration-500">
                                                    <Upload size={40} strokeWidth={2.5} />
                                                </div>
                                                <h4 className="text-xs font-black uppercase tracking-widest mb-1">Click or Drag File</h4>
                                                <p className="text-[10px] font-bold opacity-40">JPG, PNG, or PDF up to 10MB</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isActionLoading}
                                className={`w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex justify-center items-center gap-2 ${isActionLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isActionLoading ? <Loader2 className="animate-spin" size={24} /> : (isAddModalOpen ? 'Publish Official Notice' : 'Update Notice Details')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {isViewModalOpen && selectedItemForView && (
                <div className={`fixed z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 ${isFullScreen ? 'inset-0 p-0' : 'inset-0 p-4'}`}>
                    <div className={`transition-all duration-300 overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col ${isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl rounded-[2.5rem] h-[85vh]'}`}>
                        <div className={`flex-grow overflow-hidden flex flex-col relative ${isDarkMode ? 'bg-black/80' : 'bg-slate-900/90'}`}>
                            {/* Minimalism Controls */}
                            <div className="absolute top-6 right-6 z-[110] flex items-center gap-3">
                                <button
                                    onClick={() => setIsFullScreen(!isFullScreen)}
                                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl transition-all active:scale-90"
                                >
                                    {isFullScreen ? <Minimize2 size={20} strokeWidth={3} /> : <Maximize2 size={20} strokeWidth={3} />}
                                </button>
                                <button
                                    onClick={() => { setIsViewModalOpen(false); setSelectedItemForView(null); setIsFullScreen(false); }}
                                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl transition-all active:scale-90"
                                >
                                    <X size={24} strokeWidth={3} />
                                </button>
                            </div>

                            {selectedItemForView.file_attachment && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(selectedItemForView.file_attachment) ? (
                                <div className="flex-grow flex items-center justify-center p-4 overflow-hidden">
                                    <img
                                        src={selectedItemForView.file_attachment}
                                        alt={selectedItemForView.title}
                                        className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-500"
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-full pt-20">
                                    {selectedItemForView.file_attachment ? (
                                        <iframe src={selectedItemForView.file_attachment} className="w-full h-full bg-white" title="Document Preview" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full gap-4 text-white/50 italic">
                                            <AlertCircle size={40} className="opacity-20" />
                                            <p className="font-bold uppercase tracking-widest text-xs">No attachment available</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NoticeRegistry;
