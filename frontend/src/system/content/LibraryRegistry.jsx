import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, FileText, Eye, Edit2, Trash2, RefreshCw, X, Upload, FileCheck, AlertCircle, ChevronLeft, Loader2, Maximize2, Minimize2, ExternalLink, Filter, ChevronsLeft, ChevronsRight, ChevronRight, Video, PlayCircle, ArrowUpDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const LibraryRegistry = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, loading: authLoading } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [thumbnailError, setThumbnailError] = useState(null);
    const [pdfError, setPdfError] = useState(null);

    const safeArray = (arr) => Array.isArray(arr) ? arr : [];

    const getYouTubeThumbnail = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
        }
        if (url.includes('vimeo.com')) {
            return 'https://f.vimeocdn.com/images_v6/default_640.png'; // Basic vimeo placeholder until API call
        }
        return null;
    };

    const getYouTubeEmbedUrl = (url) => {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return `https://www.youtube.com/embed/${match[2]}`;
        }
        return url.replace('watch?v=', 'embed/').split('&')[0].replace('m.youtube.com', 'www.youtube.com').replace('youtu.be/', 'www.youtube.com/embed/');
    };

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
    const [viewPage, setViewPage] = useState(1); // 1 for Thumbnail, 2 for PDF
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
        section: '',
        contentType: ''
    });
    const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest, az, za

    const [libraryItems, setLibraryItems] = useState([]);

    const [newItem, setNewItem] = useState({
        name: '',
        description: '',
        thumbnail: null,
        pdf: null,
        video_link: '',
        video_file: null,
        content_type: 'pdf',
        session: '',
        class_level: '',
        subject: '',
        exam_type: '',
        target_exam: '',
        section: ''
    });

    const fetchLibraryItems = useCallback(async () => {
        if (authLoading) return;
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/library/`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            setLibraryItems(response.data);
        } catch (error) {
            console.error("Failed to fetch library items", error);
            toast.error("Failed to load library content");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, token, authLoading]);

    const fetchMasterData = useCallback(async () => {
        if (authLoading) return;
        try {
            const apiUrl = getApiUrl();
            const config = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
            const [sessRes, classRes, subRes, etRes, teRes, secRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/sessions/`, config),
                axios.get(`${apiUrl}/api/master-data/classes/`, config),
                axios.get(`${apiUrl}/api/master-data/subjects/`, config),
                axios.get(`${apiUrl}/api/master-data/exam-types/`, config),
                axios.get(`${apiUrl}/api/master-data/target-exams/`, config),
                axios.get(`${apiUrl}/api/master-data/master-sections/`, config)
            ]);
            setSessions(safeArray(sessRes.data));
            setClasses(safeArray(classRes.data));
            setSubjects(safeArray(subRes.data));
            setExamTypes(safeArray(etRes.data));
            setTargetExams(safeArray(teRes.data));
            
            // Handle MasterSection API (Array, {results: []}, or {sections: []})
            const secData = secRes.data;
            setSections(
                Array.isArray(secData) ? secData : 
                (Array.isArray(secData?.results) ? secData.results : 
                (Array.isArray(secData?.sections) ? secData.sections : []))
            );
        } catch (error) {
            console.error("Failed to fetch master data", error);
        }
    }, [getApiUrl, token, authLoading]);

    useEffect(() => {
        if (!authLoading) {
            fetchLibraryItems();
            fetchMasterData();
        }
    }, [fetchLibraryItems, fetchMasterData, authLoading]);

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        // Ensure thumbnail image size does not exceed 5MB
        if (field === 'thumbnail') {
            if (file.size > 5 * 1024 * 1024) {
                setThumbnailError("Image size exceeds 5MB max limit");
                e.target.value = ''; // Reset input
                return;
            } else {
                setThumbnailError(null);
            }
        }

        // Ensure PDF size does not exceed 25MB
        if (field === 'pdf') {
            if (file.size > 25 * 1024 * 1024) {
                setPdfError("PDF size exceeds 25MB max limit");
                e.target.value = ''; // Reset input
                return;
            } else {
                setPdfError(null);
            }
        }

        setNewItem({ ...newItem, [field]: file });
    };

    const handleRemoveFile = (field) => {
        if (field === 'thumbnail') {
            setNewItem({ ...newItem, thumbnail: null, existing_thumbnail: null });
        } else if (field === 'pdf') {
            setNewItem({ ...newItem, pdf: null });
        } else if (field === 'video_file') {
            setNewItem({ ...newItem, video_file: null });
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            formData.append('name', newItem.name);
            formData.append('description', newItem.description);
            if (newItem.session) formData.append('session', newItem.session);
            if (newItem.class_level) formData.append('class_level', newItem.class_level);
            if (newItem.subject) formData.append('subject', newItem.subject);
            if (newItem.exam_type) formData.append('exam_type', newItem.exam_type);
            if (newItem.target_exam) formData.append('target_exam', newItem.target_exam);
            if (newItem.section) formData.append('section', newItem.section);
            if (newItem.thumbnail) formData.append('thumbnail', newItem.thumbnail);
            if (newItem.pdf) formData.append('pdf_file', newItem.pdf);
            if (newItem.video_link) formData.append('video_link', newItem.video_link);
            if (newItem.video_file) formData.append('video_file', newItem.video_file);

            await axios.post(`${apiUrl}/api/master-data/library/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
            });

            toast.success("Item added successfully");
            setIsAddModalOpen(false);
            resetForm();
            fetchLibraryItems();
        } catch (error) {
            console.error("Failed to add item", error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || "Failed to add library item";
            if (error.response?.status === 413) {
                toast.error("File size rejected by server. Increase Nginx client_max_body_size.");
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEditClick = (item) => {
        setSelectedItemForEdit(item);
        setNewItem({
            name: item.name,
            description: item.description,
            session: item.session || '',
            class_level: item.class_level || '',
            subject: item.subject || '',
            exam_type: item.exam_type || '',
            target_exam: item.target_exam || '',
            section: item.section || '',
            thumbnail: null,
            pdf: null,
            video_link: item.video_link || '',
            video_file: null,
            content_type: (item.video_link || item.video_file) ? 'video' : 'pdf',
            existing_thumbnail: item.thumbnail
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            formData.append('name', newItem.name);
            formData.append('description', newItem.description);
            formData.append('session', newItem.session || '');
            formData.append('class_level', newItem.class_level || '');
            formData.append('subject', newItem.subject || '');
            formData.append('exam_type', newItem.exam_type || '');
            formData.append('target_exam', newItem.target_exam || '');
            formData.append('section', newItem.section || '');
            if (newItem.thumbnail) formData.append('thumbnail', newItem.thumbnail);
            if (newItem.pdf) formData.append('pdf_file', newItem.pdf);
            if (newItem.video_link) formData.append('video_link', newItem.video_link || '');
            if (newItem.video_file) formData.append('video_file', newItem.video_file);

            await axios.patch(`${apiUrl}/api/master-data/library/${selectedItemForEdit.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
            });

            toast.success("Item updated successfully");
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
            resetForm();
            fetchLibraryItems();
        } catch (error) {
            console.error("Failed to update item", error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || "Failed to update library item";
            if (error.response?.status === 413) {
                toast.error("File size rejected by server. Increase Nginx client_max_body_size.");
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/library/${id}/`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            toast.success("Item deleted successfully");
            fetchLibraryItems();
        } catch (error) {
            console.error("Failed to delete item", error);
            toast.error("Failed to delete library item");
        }
    };

    const resetForm = () => {
        setThumbnailError(null);
        setPdfError(null);
        setNewItem({
            name: '',
            description: '',
            thumbnail: null,
            pdf: null,
            video_link: '',
            video_file: null,
            content_type: 'pdf',
            session: '',
            class_level: '',
            subject: '',
            exam_type: '',
            target_exam: '',
            section: ''
        });
        setSelectedItemForEdit(null);
    };

    // Filter Logic
    const filteredItems = useMemo(() => {
        const safeItems = safeArray(libraryItems);
        return safeItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSession = !activeFilters.session || String(item.session) === String(activeFilters.session);
            const matchesClass = !activeFilters.class_level || String(item.class_level) === String(activeFilters.class_level);
            const matchesSubject = !activeFilters.subject || String(item.subject) === String(activeFilters.subject);
            const matchesExamType = !activeFilters.exam_type || String(item.exam_type) === String(activeFilters.exam_type);
            const matchesTargetExam = !activeFilters.target_exam || String(item.target_exam) === String(activeFilters.target_exam);
            const matchesSection = !activeFilters.section || String(item.section) === String(activeFilters.section);
            const matchesContentType = !activeFilters.contentType ||
                (activeFilters.contentType === 'pdf' && item.pdf_file) ||
                (activeFilters.contentType === 'video' && (item.video_link || item.video_file));

            return matchesSearch && matchesSession && matchesClass && matchesSubject && matchesExamType && matchesTargetExam && matchesSection && matchesContentType;
        }).sort((a, b) => {
            if (sortOrder === 'newest') return new Date(b.created_at) - new Date(a.created_at);
            if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
            if (sortOrder === 'az') return (a.name || "").localeCompare(b.name || "");
            if (sortOrder === 'za') return (b.name || "").localeCompare(a.name || "");
            return 0;
        });
    }, [libraryItems, searchQuery, activeFilters, sortOrder]);

    // Dynamic Filter Options based on available data
    const dynamicFilterOptions = useMemo(() => {
        const safeItems = safeArray(libraryItems);
        return {
            sessions: [...new Set(safeItems.filter(i => i.session_name).map(i => JSON.stringify({ id: i.session, name: i.session_name })))].map(s => JSON.parse(s)),
            classes: [...new Set(safeItems.filter(i => i.class_name).map(i => JSON.stringify({ id: i.class_level, name: i.class_name })))].map(c => JSON.parse(c)),
            subjects: [...new Set(safeItems.filter(i => i.subject_name).map(i => JSON.stringify({ id: i.subject, name: i.subject_name })))].map(s => JSON.parse(s)),
            examTypes: [...new Set(safeItems.filter(i => i.exam_type_name).map(i => JSON.stringify({ id: i.exam_type, name: i.exam_type_name })))].map(e => JSON.parse(e)),
            targetExams: [...new Set(safeItems.filter(i => i.target_exam_name).map(i => JSON.stringify({ id: i.target_exam, name: i.target_exam_name })))].map(t => JSON.parse(t)),
            sections: [...new Set(safeItems.filter(i => i.section_name).map(i => JSON.stringify({ id: i.section, name: i.section_name })))].map(s => JSON.parse(s))
        };
    }, [libraryItems]);

    // Stats logic
    const stats = useMemo(() => {
        const items = safeArray(libraryItems);
        return {
            total: items.length,
            pdfs: items.filter(item => item.pdf_file).length,
            videos: items.filter(item => item.video_link || item.video_file).length
        };
    }, [libraryItems]);

    // Pagination logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredItems, currentPage, itemsPerPage]);

    // Generate page numbers for numeric pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

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
            <div className={`p-8 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/20">
                                    Content Management
                                </span>
                                <h2 className={`text-3xl font-black tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    Study <span className="text-emerald-500">Library</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage educational materials, PDFs, and thumbnails with advanced academic targeting.
                            </p>
                        </div>

                        {/* Stats Section */}
                        <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-[5px] border border-slate-100 dark:border-white/5">
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total Materials</span>
                                <span className="text-xl font-black text-emerald-500">{stats.total}</span>
                            </div>
                            <div className={`w-px h-8 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>PDF Documents</span>
                                <span className="text-xl font-black text-blue-500">{stats.pdfs}</span>
                            </div>
                            <div className={`w-px h-8 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Video Content</span>
                                <span className="text-xl font-black text-amber-500">{stats.videos}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[5px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center gap-2 group"
                        >
                            <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-all duration-300" />
                            <span>Add New File</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative group flex-1">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by book name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full pl-14 pr-6 py-4 rounded-[5px] border-2 outline-none font-bold transition-colors text-sm ${isDarkMode
                                        ? 'bg-white/1 border-white/5 text-white focus:border-emerald-500/50'
                                        : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-emerald-500/50'
                                        }`}
                                />
                            </div>
                            <button
                                onClick={() => { fetchLibraryItems(); fetchMasterData(); }}
                                className={`p-4 rounded-[5px] transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/5' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100'}`}
                            >
                                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className={`p-2 rounded-[5px] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                <Filter size={14} /> Filters
                            </div>
                            <select
                                value={activeFilters.session}
                                onChange={(e) => setActiveFilters({ ...activeFilters, session: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-colors ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Sessions</option>
                                {dynamicFilterOptions.sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select
                                value={activeFilters.class_level}
                                onChange={(e) => setActiveFilters({ ...activeFilters, class_level: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-colors ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Classes</option>
                                {dynamicFilterOptions.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select
                                value={activeFilters.subject}
                                onChange={(e) => setActiveFilters({ ...activeFilters, subject: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-colors ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Subjects</option>
                                {dynamicFilterOptions.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select
                                value={activeFilters.exam_type}
                                onChange={(e) => setActiveFilters({ ...activeFilters, exam_type: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-colors ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Exam Types</option>
                                {dynamicFilterOptions.examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <select
                                value={activeFilters.target_exam}
                                onChange={(e) => setActiveFilters({ ...activeFilters, target_exam: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-colors ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Target Exams</option>
                                {dynamicFilterOptions.targetExams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <select
                                value={activeFilters.section}
                                onChange={(e) => setActiveFilters({ ...activeFilters, section: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-colors ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Sections</option>
                                {dynamicFilterOptions.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select
                                value={activeFilters.contentType}
                                onChange={(e) => setActiveFilters({ ...activeFilters, contentType: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-colors ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Types</option>
                                <option value="pdf">PDF Documents</option>
                                <option value="video">Video Content</option>
                            </select>
                            {(activeFilters.session || activeFilters.class_level || activeFilters.subject || activeFilters.exam_type || activeFilters.target_exam || activeFilters.section || activeFilters.contentType) && (
                                <button
                                    onClick={() => setActiveFilters({ session: '', class_level: '', subject: '', exam_type: '', target_exam: '', section: '', contentType: '' })}
                                    className="px-4 py-2.5 rounded-[5px] font-bold text-[10px] uppercase tracking-widest text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10 active:scale-95"
                                >
                                    Clear All Filters
                                </button>
                            )}
                            <div className="flex items-center gap-2 ml-auto">
                                <div className={`p-2 rounded-[5px] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                    <ArrowUpDown size={14} /> Sort
                                </div>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                    className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-colors ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="az">Alphabetical (A-Z)</option>
                                    <option value="za">Alphabetical (Z-A)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[5px] border shadow-2xl overflow-hidden transition-colors ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-900/50'}`}>
                                <th className="py-5 px-6 text-center w-20">#</th>
                                <th className="py-5 px-6">Resource Details</th>
                                <th className="py-5 px-6 text-center">Image</th>
                                <th className="py-5 px-6 text-center">Category</th>
                                <th className="py-5 px-6 text-center">Attachment</th>
                                <th className="py-5 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 border-t border-white/5">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-5 px-6 text-center"><div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col gap-2">
                                                <div className={`h-5 w-48 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-3 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                    <div className={`h-3 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className={`mx-auto w-12 h-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className={`h-6 w-20 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex justify-center gap-2">
                                                <div className={`h-8 w-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-8 w-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedItems.length > 0 ? (
                                paginatedItems.map((item, index) => (
                                    <tr key={item.id} className={`group transition-colors duration-200 ${isDarkMode ? 'hover:bg-white/1' : 'hover:bg-slate-50'}`}>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`text-xs font-black ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                                {((currentPage - 1) * itemsPerPage) + index + 1}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm block text-emerald-500 transition-colors uppercase tracking-tight">{item.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {item.session_name && <span className="text-[10px] font-bold text-emerald-500/60 uppercase">{item.session_name}</span>}
                                                    {item.class_name && (
                                                        <>
                                                            <span className="w-1 h-1 bg-slate-500 rounded-full opacity-30" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{item.class_name}</span>
                                                        </>
                                                    )}
                                                    {item.section_name && (
                                                        <>
                                                            <span className="w-1 h-1 bg-slate-500 rounded-full opacity-30" />
                                                            <span className="text-[10px] font-bold text-indigo-500 uppercase">{item.section_name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex justify-center">
                                                <div
                                                    onClick={() => {
                                                        setSelectedItemForView(item);
                                                        setViewPage(1);
                                                        setIsViewModalOpen(true);
                                                        setIsFullScreen(false);
                                                    }}
                                                    className="relative group/img overflow-hidden rounded-[5px] w-12 h-16 border border-slate-200 dark:border-white/10 bg-black/5 cursor-pointer flex items-center justify-center"
                                                >
                                                    {item.thumbnail ? (
                                                        <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110 will-change-transform" />
                                                    ) : item.video_link && getYouTubeThumbnail(item.video_link) ? (
                                                        <img src={getYouTubeThumbnail(item.video_link)} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110 will-change-transform" />
                                                    ) : (item.video_link || item.video_file) ? (
                                                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-emerald-500 group-hover/img:scale-110 transition-transform duration-500">
                                                            <PlayCircle size={24} strokeWidth={2.5} />
                                                        </div>
                                                    ) : (
                                                        <img src={'https://via.placeholder.com/100x130?text=NO+IMAGE'} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110 will-change-transform" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                        <Eye size={16} className="text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                {item.subject_name ? (
                                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase rounded-[5px] border border-blue-500/20">{item.subject_name}</span>
                                                ) : <span className="text-[9px] font-black uppercase opacity-20 tracking-widest">Unsorted</span>}
                                                {item.exam_type_name && <span className="text-[8px] font-black uppercase opacity-40">{item.exam_type_name}</span>}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button
                                                disabled={!item.pdf_file && !item.video_link && !item.video_file}
                                                onClick={() => {
                                                    setSelectedItemForView(item);
                                                    setViewPage(1);
                                                    setIsViewModalOpen(true);
                                                    setIsFullScreen(false);
                                                }}
                                                className={`px-4 py-1.5 rounded-[5px] font-black text-[10px] uppercase tracking-widest transition-all ${(!item.pdf_file && !item.video_link && !item.video_file) ? 'opacity-20 cursor-not-allowed' : (item.pdf_file ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-600 hover:text-white')} shadow-sm`}
                                            >
                                                {item.pdf_file ? 'View PDF' : (item.video_link || item.video_file ? 'Watch Video' : 'No File')}
                                            </button>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditClick(item)} className="p-2.5 rounded-[5px] bg-blue-500/10 text-blue-500 hover:bg-blue-600 hover:text-white transition-colors active:scale-95">
                                                    <Edit2 size={14} strokeWidth={3} />
                                                </button>
                                                <button onClick={() => handleDeleteItem(item.id)} className="p-2.5 rounded-[5px] bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-colors active:scale-95">
                                                    <Trash2 size={14} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-500 font-bold uppercase tracking-[0.2em] text-xs opacity-40 italic">No resources found</td></tr>
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
                            className={`px-4 py-2 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer ${isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-700 shadow-sm transition-all'}`}
                        >
                            {[10, 20, 50].map(val => (
                                <option key={val} value={val} className={isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-800'}>{val} per page</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className={`p-2 rounded-[5px] bg-white/5 hover:bg-emerald-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronLeft size={18} strokeWidth={2.5} /></button>

                        <div className="flex items-center gap-1.5">
                            {getPageNumbers().map(pageNum => (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-9 h-9 rounded-[5px] font-black text-xs transition-all active:scale-90 ${currentPage === pageNum
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : (isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm')}`}
                                >
                                    {pageNum}
                                </button>
                            ))}
                            {totalPages > 5 && getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                                <>
                                    <span className="text-slate-400 font-bold px-1">...</span>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className={`w-9 h-9 rounded-[5px] font-black text-xs transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm'}`}
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                        </div>

                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className={`p-2 rounded-[5px] bg-white/5 hover:bg-emerald-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronRight size={18} strokeWidth={2.5} /></button>
                    </div>

                    <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="Jump..."
                            value={jumpToPage}
                            onChange={(e) => setJumpToPage(e.target.value)}
                            className={`w-20 px-4 py-2 rounded-[5px] text-xs font-bold outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white focus:border-emerald-500/50' : 'bg-white border-slate-200 text-slate-800'}`}
                        />
                        <button type="submit" className={`p-2 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-emerald-500' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'}`}>Go</button>
                    </form>
                </div>
            </div>

            {/* Modals */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-[9999] flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4 py-2 custom-scrollbar">
                    <div className={`w-full max-w-4xl my-auto flex flex-col rounded-[5px] border shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/10 shadow-black text-white' : 'bg-white border-slate-100 shadow-slate-200 text-slate-800'}`}>
                        <div className={`p-4 border-b border-white/10 flex justify-between items-center text-white sticky top-0 z-10 ${isEditModalOpen ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-[5px]"><FileText size={20} /></div>
                                <h2 className="text-xl font-black uppercase tracking-tight">{isAddModalOpen ? 'Add To' : 'Edit'} <span className="opacity-70">Library</span></h2>
                            </div>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }} className="p-2 hover:bg-white/10 rounded-[5px] transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={isAddModalOpen ? handleAddItem : handleUpdateItem} className="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                            {/* Top Section: Academic Categorization */}
                            <div className={`p-4 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/2 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 text-emerald-500">Resource Categorization</span>
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
                                            <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>{meta.label}</label>
                                            <select
                                                required
                                                value={newItem[meta.field]}
                                                onChange={(e) => setNewItem({ ...newItem, [meta.field]: e.target.value })}
                                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                                className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-xs transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/5 text-white focus:border-emerald-500/50' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500'}`}
                                            >
                                                <option value="">Select {meta.label}</option>
                                                {safeArray(meta.options).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Content Type Toggle */}
                            <div className="flex items-center gap-4 p-3 rounded-[5px] bg-slate-100 dark:bg-white/5">
                                <span className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isDarkMode ? 'opacity-60 text-white' : 'text-slate-500'}`}>Content Type:</span>
                                <div className="flex bg-white dark:bg-black/20 p-1 rounded-[5px]">
                                    <button
                                        type="button"
                                        onClick={() => setNewItem({ ...newItem, content_type: 'pdf' })}
                                        className={`px-6 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${newItem.content_type === 'pdf' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : (isDarkMode ? 'opacity-40 hover:opacity-100' : 'text-slate-400 hover:text-slate-600')}`}
                                    >
                                        <FileText size={14} strokeWidth={3} />
                                        PDF Document
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewItem({ ...newItem, content_type: 'video' })}
                                        className={`px-6 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${newItem.content_type === 'video' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : (isDarkMode ? 'opacity-40 hover:opacity-100' : 'text-slate-400 hover:text-slate-600')}`}
                                    >
                                        <PlayCircle size={14} strokeWidth={3} />
                                        Video Content
                                    </button>
                                </div>
                            </div>

                            {/* Bottom Section: Resource Details */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>Resource Name *</label>
                                        <input
                                            required
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                            className={`w-full px-5 py-3 rounded-[5px] outline-none border-2 font-black transition-all text-sm ${isDarkMode ? 'bg-white/2 border-white/5 focus:border-emerald-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-100 focus:border-emerald-500 focus:bg-white text-slate-800'}`}
                                            placeholder="e.g. Physics Module Vol 1"
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>Short Description</label>
                                        <textarea
                                            value={newItem.description}
                                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            className={`w-full px-5 py-3 rounded-[5px] outline-none border-2 font-bold transition-all min-h-[80px] text-xs resize-none ${isDarkMode ? 'bg-white/2 border-white/5 focus:border-emerald-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-800'}`}
                                            placeholder="Provide a brief summary of this resource..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>Thumbnail</label>
                                        <div className={`relative h-[160px] rounded-[5px] border-2 border-dashed transition-all group overflow-hidden flex flex-col items-center justify-center p-3 ${isDarkMode ? 'border-white/10 hover:border-emerald-500/50 bg-white/1' : 'border-slate-200 hover:border-emerald-500 bg-slate-50'}`}>
                                            {(newItem.thumbnail || newItem.existing_thumbnail) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFile('thumbnail')}
                                                    className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-[5px] shadow-xl hover:bg-red-600 transition-all active:scale-90"
                                                >
                                                    <X size={14} strokeWidth={3} />
                                                </button>
                                            )}
                                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'thumbnail')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            {newItem.thumbnail ? (
                                                <img src={URL.createObjectURL(newItem.thumbnail)} className="h-40 w-full object-contain rounded-[5px] shadow-2xl" alt="Preview" />
                                            ) : newItem.existing_thumbnail ? (
                                                <img src={newItem.existing_thumbnail} className="h-40 w-full object-contain rounded-[5px] shadow-2xl" alt="Existing" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="p-4 rounded-[5px] bg-emerald-500/10 text-emerald-500">
                                                        <Upload size={32} />
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>Cover Image</span>
                                                </div>
                                            )}
                                        </div>
                                        {thumbnailError && (
                                            <p className="text-red-500 text-[10px] font-black uppercase flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                                                <AlertCircle size={12} /> {thumbnailError}
                                            </p>
                                        )}
                                    </div>

                                    {newItem.content_type === 'pdf' ? (
                                        <div className="space-y-1.5 animate-in fade-in duration-300">
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>PDF File</label>
                                            <div className={`relative h-[160px] rounded-[5px] border-2 border-dashed transition-all group overflow-hidden flex flex-col items-center justify-center p-3 ${isDarkMode ? 'border-white/10 hover:border-blue-500/50 bg-white/1' : 'border-slate-200 hover:border-blue-500 bg-slate-50'}`}>
                                                {newItem.pdf && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile('pdf')}
                                                        className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-[5px] shadow-xl hover:bg-red-600 transition-all active:scale-90"
                                                    >
                                                        <X size={14} strokeWidth={3} />
                                                    </button>
                                                )}
                                                <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'pdf')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                {newItem.pdf ? (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="p-4 rounded-[5px] bg-blue-500/20 text-blue-500 shadow-xl shadow-blue-500/10">
                                                            <FileCheck size={40} />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 max-w-[120px] truncate">{newItem.pdf.name}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="p-4 rounded-[5px] bg-blue-500/10 text-blue-500">
                                                            <FileText size={32} />
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>Main Document</span>
                                                    </div>
                                                )}
                                            </div>
                                            {pdfError && (
                                                <p className="text-red-500 text-[10px] font-black uppercase flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                                                    <AlertCircle size={12} /> {pdfError}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            <div className="space-y-2">
                                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>Video Link (YouTube/Vimeo)</label>
                                                <input
                                                    type="url"
                                                    value={newItem.video_link}
                                                    onChange={(e) => setNewItem({ ...newItem, video_link: e.target.value })}
                                                    className={`w-full px-4 py-3 rounded-[5px] outline-none border-2 font-bold text-xs transition-all ${isDarkMode ? 'bg-white/2 border-white/5 focus:border-emerald-500/50 text-white' : 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-800'}`}
                                                    placeholder="https://youtube.com/watch?v=..."
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>Or Upload Video File</label>
                                                <div className={`relative h-[120px] rounded-[5px] border-2 border-dashed transition-all group overflow-hidden flex flex-col items-center justify-center p-2 ${isDarkMode ? 'border-white/10 hover:border-amber-500/50 bg-white/1' : 'border-slate-200 hover:border-amber-500 bg-slate-50'}`}>
                                                    {newItem.video_file && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFile('video_file')}
                                                            className="absolute top-1 right-1 z-20 p-1.5 bg-red-500 text-white rounded-[5px] shadow-xl hover:bg-red-600 transition-all active:scale-90"
                                                        >
                                                            <X size={10} strokeWidth={3} />
                                                        </button>
                                                    )}
                                                    <input type="file" accept="video/*" onChange={(e) => handleFileChange(e, 'video_file')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                    {newItem.video_file ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <PlayCircle size={24} className="text-amber-500" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 max-w-[100px] truncate">{newItem.video_file.name}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Upload size={20} className="text-amber-500/50" />
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>Choose Video</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isActionLoading}
                                className={`w-full py-3 rounded-[5px] font-black font-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex justify-center items-center gap-2 ${isActionLoading ? 'opacity-70 cursor-not-allowed' : (isAddModalOpen ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 text-white')}`}
                            >
                                {isActionLoading ? <Loader2 className="animate-spin" size={20} /> : (isAddModalOpen ? 'Save to Library' : 'Update Library Record')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {isViewModalOpen && selectedItemForView && (
                <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 ${isFullScreen ? 'p-0' : 'p-4'}`}>
                    <div className={`transition-all duration-300 overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col ${isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl rounded-[5px] h-[85vh]'}`}>
                        <div className={`grow overflow-hidden flex flex-col relative ${isDarkMode ? 'bg-black/80' : 'bg-slate-900/90'}`}>
                            {/* Minimalism Controls */}
                            <div className="absolute top-6 right-6 z-[10000] flex items-center gap-3">
                                {viewPage === 2 && (
                                    <button
                                        onClick={() => setIsFullScreen(!isFullScreen)}
                                        className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-[5px] transition-all active:scale-90"
                                    >
                                        {isFullScreen ? <Minimize2 size={20} strokeWidth={3} /> : <Maximize2 size={20} strokeWidth={3} />}
                                    </button>
                                )}
                                <button
                                    onClick={() => { setIsViewModalOpen(false); setSelectedItemForView(null); setIsFullScreen(false); }}
                                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-[5px] transition-all active:scale-90"
                                >
                                    <X size={24} strokeWidth={3} />
                                </button>
                            </div>

                            {viewPage === 1 ? (
                                <div className="flex flex-col lg:flex-row items-center justify-center h-full p-10 lg:p-16 gap-10 lg:gap-16 overflow-y-auto custom-scrollbar">
                                    <div className="relative group overflow-hidden rounded-[5px] shadow-2xl w-full max-w-[24rem] h-128 border-8 border-white/5 shrink-0 bg-black/40 flex items-center justify-center">
                                        {selectedItemForView.thumbnail ? (
                                            <img
                                                src={selectedItemForView.thumbnail}
                                                alt={selectedItemForView.name}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : selectedItemForView.video_link && getYouTubeThumbnail(selectedItemForView.video_link) ? (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <img
                                                    src={getYouTubeThumbnail(selectedItemForView.video_link)}
                                                    alt={selectedItemForView.name}
                                                    className="w-full h-full object-contain"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center text-white shadow-2xl">
                                                    <div className="bg-black/20 backdrop-blur-sm rounded-full p-2">
                                                        <PlayCircle size={80} strokeWidth={1.5} />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (selectedItemForView.video_link || selectedItemForView.video_file) ? (
                                            <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center gap-4 text-emerald-500">
                                                <PlayCircle size={100} strokeWidth={1} />
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Video Content</span>
                                            </div>
                                        ) : (
                                            <img
                                                src={'https://via.placeholder.com/100x130?text=NO+IMAGE'}
                                                alt={selectedItemForView.name}
                                                className="w-full h-full object-contain"
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl">
                                        <h4 className="text-3xl lg:text-5xl font-black uppercase tracking-tight mb-6 leading-tight text-white">{selectedItemForView.name}</h4>
                                        <p className="text-base font-medium leading-relaxed mb-10 text-white/60">{selectedItemForView.description || "No description available."}</p>
                                        {(selectedItemForView.pdf_file || selectedItemForView.video_link || selectedItemForView.video_file) && (
                                            <button onClick={() => setViewPage(2)} className="px-10 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[5px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-4">
                                                {selectedItemForView.pdf_file ? <FileText size={24} strokeWidth={3} /> : <PlayCircle size={24} strokeWidth={3} />}
                                                <span>{selectedItemForView.pdf_file ? 'Open Reader' : 'Play Video'}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full pt-20">
                                    {selectedItemForView.pdf_file ? (
                                        <iframe src={selectedItemForView.pdf_file} className="w-full h-full bg-white" title="PDF Preview" />
                                    ) : selectedItemForView.video_link ? (
                                        <div className="w-full h-full bg-black flex items-center justify-center">
                                            {selectedItemForView.video_link.includes('youtube.com') || selectedItemForView.video_link.includes('youtu.be') ? (
                                                <iframe
                                                    src={getYouTubeEmbedUrl(selectedItemForView.video_link)}
                                                    className="w-full h-full"
                                                    allowFullScreen
                                                    title="Video Player"
                                                />
                                            ) : (
                                                <a href={selectedItemForView.video_link} target="_blank" rel="noopener noreferrer" className="text-emerald-500 font-bold hover:underline py-10 flex flex-col items-center gap-4">
                                                    <ExternalLink size={48} />
                                                    <span>Open Video in External Tab</span>
                                                </a>
                                            )}
                                        </div>
                                    ) : selectedItemForView.video_file ? (
                                        <video src={selectedItemForView.video_file} className="w-full h-full" controls />
                                    ) : (
                                        <div className="p-20 text-center uppercase font-black text-white/30 tracking-widest">No attachment available</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default LibraryRegistry;
