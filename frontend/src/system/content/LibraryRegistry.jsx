import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, FileText, Eye, Edit2, Trash2, RefreshCw, X, Upload, FileCheck, AlertCircle, ChevronLeft, Loader2, Maximize2, Minimize2, ExternalLink, Filter, ChevronsLeft, ChevronsRight, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const LibraryRegistry = () => {
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
        section: ''
    });

    const [libraryItems, setLibraryItems] = useState([]);

    const [newItem, setNewItem] = useState({
        name: '',
        description: '',
        thumbnail: null,
        pdf: null,
        session: '',
        class_level: '',
        subject: '',
        exam_type: '',
        target_exam: '',
        section: ''
    });

    const fetchLibraryItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/library/`);
            setLibraryItems(response.data);
        } catch (error) {
            console.error("Failed to fetch library items", error);
            toast.error("Failed to load library content");
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
        fetchLibraryItems();
        fetchMasterData();
    }, [fetchLibraryItems, fetchMasterData]);

    const handleFileChange = (e, field) => {
        setNewItem({ ...newItem, [field]: e.target.files[0] });
    };

    const handleRemoveFile = (field) => {
        if (field === 'thumbnail') {
            setNewItem({ ...newItem, thumbnail: null, existing_thumbnail: null });
        } else {
            setNewItem({ ...newItem, pdf: null });
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

            await axios.post(`${apiUrl}/api/master-data/library/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Item added successfully");
            setIsAddModalOpen(false);
            resetForm();
            fetchLibraryItems();
        } catch (error) {
            console.error("Failed to add item", error);
            toast.error("Failed to add library item");
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

            await axios.patch(`${apiUrl}/api/master-data/library/${selectedItemForEdit.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Item updated successfully");
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
            resetForm();
            fetchLibraryItems();
        } catch (error) {
            console.error("Failed to update item", error);
            toast.error("Failed to update library item");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/library/${id}/`);
            toast.success("Item deleted successfully");
            fetchLibraryItems();
        } catch (error) {
            console.error("Failed to delete item", error);
            toast.error("Failed to delete library item");
        }
    };

    const resetForm = () => {
        setNewItem({ name: '', description: '', thumbnail: null, pdf: null, session: '', class_level: '', subject: '', exam_type: '', target_exam: '', section: '' });
        setSelectedItemForEdit(null);
    };

    // Filter Logic
    const filteredItems = useMemo(() => {
        return libraryItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSession = !activeFilters.session || item.session === activeFilters.session;
            const matchesClass = !activeFilters.class_level || item.class_level === activeFilters.class_level;
            const matchesSubject = !activeFilters.subject || item.subject === activeFilters.subject;
            const matchesExamType = !activeFilters.exam_type || item.exam_type === activeFilters.exam_type;
            const matchesTargetExam = !activeFilters.target_exam || item.target_exam === activeFilters.target_exam;
            const matchesSection = !activeFilters.section || item.section === activeFilters.section;
            return matchesSearch && matchesSession && matchesClass && matchesSubject && matchesExamType && matchesTargetExam && matchesSection;
        });
    }, [libraryItems, searchQuery, activeFilters]);

    // Dynamic Filter Options based on available data
    const dynamicFilterOptions = useMemo(() => {
        return {
            sessions: [...new Set(libraryItems.filter(i => i.session_name).map(i => JSON.stringify({ id: i.session, name: i.session_name })))].map(s => JSON.parse(s)),
            classes: [...new Set(libraryItems.filter(i => i.class_name).map(i => JSON.stringify({ id: i.class_level, name: i.class_name })))].map(c => JSON.parse(c)),
            subjects: [...new Set(libraryItems.filter(i => i.subject_name).map(i => JSON.stringify({ id: i.subject, name: i.subject_name })))].map(s => JSON.parse(s)),
            examTypes: [...new Set(libraryItems.filter(i => i.exam_type_name).map(i => JSON.stringify({ id: i.exam_type, name: i.exam_type_name })))].map(e => JSON.parse(e)),
            targetExams: [...new Set(libraryItems.filter(i => i.target_exam_name).map(i => JSON.stringify({ id: i.target_exam, name: i.target_exam_name })))].map(t => JSON.parse(t)),
            sections: [...new Set(libraryItems.filter(i => i.section_name).map(i => JSON.stringify({ id: i.section, name: i.section_name })))].map(s => JSON.parse(s))
        };
    }, [libraryItems]);

    // Pagination logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredItems, currentPage, itemsPerPage]);

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
                                <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/20">
                                    Content Management
                                </span>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    Study <span className="text-emerald-500">Library</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage educational materials, PDFs, and thumbnails with advanced academic targeting.
                            </p>
                        </div>
                        <button
                            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center gap-2 group"
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
                                    className={`w-full pl-14 pr-6 py-4 rounded-2xl border-2 outline-none font-bold transition-all text-sm ${isDarkMode
                                        ? 'bg-white/[0.01] border-white/5 text-white focus:border-emerald-500/50'
                                        : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-emerald-500/50'
                                        }`}
                                />
                            </div>
                            <button
                                onClick={() => { fetchLibraryItems(); fetchMasterData(); }}
                                className={`p-4 rounded-2xl transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/5' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100'}`}
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

            {/* Table */}
            <div className={`rounded-[2.5rem] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
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
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <Loader2 size={40} className="animate-spin text-emerald-500" />
                                            <p className="font-bold text-lg opacity-50 uppercase tracking-widest">Loading library...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedItems.length > 0 ? (
                                paginatedItems.map((item, index) => (
                                    <tr key={item.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`text-xs font-black ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                                {((currentPage - 1) * itemsPerPage) + index + 1}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm block group-hover:text-emerald-500 transition-colors uppercase tracking-tight">{item.name}</span>
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
                                                    className="relative group/img overflow-hidden rounded-xl shadow-lg w-12 h-16 border border-white/10 bg-black/5 cursor-pointer"
                                                >
                                                    <img src={item.thumbnail || 'https://via.placeholder.com/100x130?text=NO+IMAGE'} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Eye size={16} className="text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                {item.subject_name ? (
                                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase rounded-lg border border-blue-500/20">{item.subject_name}</span>
                                                ) : <span className="text-[9px] font-black uppercase opacity-20 tracking-widest">Unsorted</span>}
                                                {item.exam_type_name && <span className="text-[8px] font-black uppercase opacity-40">{item.exam_type_name}</span>}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button
                                                disabled={!item.pdf_file}
                                                onClick={() => {
                                                    setSelectedItemForView(item);
                                                    setViewPage(1);
                                                    setIsViewModalOpen(true);
                                                    setIsFullScreen(false);
                                                }}
                                                className={`px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${!item.pdf_file ? 'opacity-20 cursor-not-allowed' : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-sm'}`}
                                            >
                                                View PDF
                                            </button>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditClick(item)} className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-blue-500/5">
                                                    <Edit2 size={14} strokeWidth={3} />
                                                </button>
                                                <button onClick={() => handleDeleteItem(item.id)} className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-red-500/5">
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
                            className={`px-4 py-2 rounded-xl font-bold text-xs outline-none border-none cursor-pointer ${isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-700 shadow-sm transition-all'}`}
                        >
                            {[10, 20, 50].map(val => (
                                <option key={val} value={val} className={isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-800'}>{val} per page</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className={`p-2 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronsLeft size={18} strokeWidth={2.5} /></button>
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className={`p-2 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronLeft size={18} strokeWidth={2.5} /></button>
                        <div className="flex items-center gap-1 mx-4">
                            <span className="text-[10px] font-black uppercase opacity-40 tracking-tighter">Page</span>
                            <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg font-black text-xs shadow-lg shadow-emerald-500/20">{currentPage}</span>
                            <span className="text-[10px] font-black uppercase opacity-40 tracking-tighter">of {totalPages || 1}</span>
                        </div>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className={`p-2 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronRight size={18} strokeWidth={2.5} /></button>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(totalPages)} className={`p-2 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronsRight size={18} strokeWidth={2.5} /></button>
                    </div>

                    <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="Jump..."
                            value={jumpToPage}
                            onChange={(e) => setJumpToPage(e.target.value)}
                            className={`w-20 px-4 py-2 rounded-xl text-xs font-bold outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white focus:border-emerald-500/50' : 'bg-white border-slate-200 text-slate-800'}`}
                        />
                        <button type="submit" className={`p-2 rounded-xl transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-emerald-500' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'}`}>Go</button>
                    </form>
                </div>
            </div>

            {/* Modals */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                    <div className={`w-full max-w-4xl rounded-[2.5rem] border shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/10 shadow-black' : 'bg-white border-slate-100 shadow-slate-200'}`}>
                        <div className={`p-6 border-b border-white/10 flex justify-between items-center text-white ${isEditModalOpen ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl"><FileText size={20} /></div>
                                <h2 className="text-xl font-black uppercase tracking-tight">{isAddModalOpen ? 'Add To' : 'Edit'} <span className="opacity-70">Library</span></h2>
                            </div>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={isAddModalOpen ? handleAddItem : handleUpdateItem} className="p-8 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            {/* Top Section: Academic Categorization */}
                            <div className={`p-6 rounded-[2rem] border transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-1.5 h-5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80 text-emerald-500">Resource Categorization</span>
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
                                                required
                                                value={newItem[meta.field]}
                                                onChange={(e) => setNewItem({ ...newItem, [meta.field]: e.target.value })}
                                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                                className={`w-full px-4 py-3 rounded-xl border-2 outline-none font-bold text-xs transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/5 text-white focus:border-emerald-500/50' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500'}`}
                                            >
                                                <option value="">Select {meta.label}</option>
                                                {meta.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Section: Resource Details */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Resource Name *</label>
                                        <input
                                            required
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                            className={`w-full px-6 py-4 rounded-2xl outline-none border-2 font-black transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5 focus:border-emerald-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-100 focus:border-emerald-500 focus:bg-white text-slate-800'}`}
                                            placeholder="e.g. Physics Module Vol 1"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Short Description</label>
                                        <textarea
                                            value={newItem.description}
                                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            className={`w-full px-6 py-4 rounded-2xl outline-none border-2 font-bold transition-all min-h-[120px] resize-none ${isDarkMode ? 'bg-white/[0.02] border-white/5 focus:border-emerald-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-800'}`}
                                            placeholder="Provide a brief summary of this resource..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Thumbnail</label>
                                        <div className={`relative h-[220px] rounded-[2rem] border-2 border-dashed transition-all group overflow-hidden flex flex-col items-center justify-center p-4 ${isDarkMode ? 'border-white/10 hover:border-emerald-500/50 bg-white/[0.01]' : 'border-slate-200 hover:border-emerald-500 bg-slate-50'}`}>
                                            {(newItem.thumbnail || newItem.existing_thumbnail) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFile('thumbnail')}
                                                    className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-xl shadow-xl hover:bg-red-600 transition-all active:scale-90"
                                                >
                                                    <X size={14} strokeWidth={3} />
                                                </button>
                                            )}
                                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'thumbnail')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            {newItem.thumbnail ? (
                                                <img src={URL.createObjectURL(newItem.thumbnail)} className="h-40 w-full object-contain rounded-xl shadow-2xl" alt="Preview" />
                                            ) : newItem.existing_thumbnail ? (
                                                <img src={newItem.existing_thumbnail} className="h-40 w-full object-contain rounded-xl shadow-2xl" alt="Existing" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500">
                                                        <Upload size={32} />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Cover Image</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">PDF File</label>
                                        <div className={`relative h-[220px] rounded-[2rem] border-2 border-dashed transition-all group overflow-hidden flex flex-col items-center justify-center p-4 ${isDarkMode ? 'border-white/10 hover:border-blue-500/50 bg-white/[0.01]' : 'border-slate-200 hover:border-blue-500 bg-slate-50'}`}>
                                            {newItem.pdf && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFile('pdf')}
                                                    className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-xl shadow-xl hover:bg-red-600 transition-all active:scale-90"
                                                >
                                                    <X size={14} strokeWidth={3} />
                                                </button>
                                            )}
                                            <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'pdf')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            {newItem.pdf ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="p-4 rounded-2xl bg-blue-500/20 text-blue-500 shadow-xl shadow-blue-500/10">
                                                        <FileCheck size={40} />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 max-w-[120px] truncate">{newItem.pdf.name}</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
                                                        <FileText size={32} />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Main Document</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isActionLoading}
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex justify-center items-center gap-2 ${isActionLoading ? 'opacity-70 cursor-not-allowed' : (isAddModalOpen ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 text-white')}`}
                            >
                                {isActionLoading ? <Loader2 className="animate-spin" size={24} /> : (isAddModalOpen ? 'Save to Library' : 'Update Library Record')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {isViewModalOpen && selectedItemForView && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 ${isFullScreen ? 'p-0' : 'p-4'}`}>
                    <div className={`transition-all duration-300 overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col ${isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl rounded-[2.5rem] h-[85vh]'}`}>
                        <div className={`flex-grow overflow-hidden flex flex-col relative ${isDarkMode ? 'bg-black/80' : 'bg-slate-900/90'}`}>
                            {/* Minimalism Controls */}
                            <div className="absolute top-6 right-6 z-[110] flex items-center gap-3">
                                {viewPage === 2 && (
                                    <button
                                        onClick={() => setIsFullScreen(!isFullScreen)}
                                        className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl transition-all active:scale-90"
                                    >
                                        {isFullScreen ? <Minimize2 size={20} strokeWidth={3} /> : <Maximize2 size={20} strokeWidth={3} />}
                                    </button>
                                )}
                                <button
                                    onClick={() => { setIsViewModalOpen(false); setSelectedItemForView(null); setIsFullScreen(false); }}
                                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl transition-all active:scale-90"
                                >
                                    <X size={24} strokeWidth={3} />
                                </button>
                            </div>

                            {viewPage === 1 ? (
                                <div className="flex flex-col lg:flex-row items-center justify-center h-full p-10 lg:p-16 gap-10 lg:gap-16 overflow-y-auto custom-scrollbar">
                                    <div className="relative group overflow-hidden rounded-[2.5rem] shadow-2xl w-full max-w-[20rem] h-[28rem] border-[8px] border-white/5 flex-shrink-0 bg-black/20">
                                        <img
                                            src={selectedItemForView.thumbnail || 'https://via.placeholder.com/100x130?text=NO+IMAGE'}
                                            alt={selectedItemForView.name}
                                            className="w-full h-full object-contain p-4"
                                        />
                                    </div>
                                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl">
                                        <h4 className="text-3xl lg:text-5xl font-black uppercase tracking-tight mb-6 leading-tight text-white">{selectedItemForView.name}</h4>
                                        <p className="text-base font-medium leading-relaxed mb-10 text-white/60">{selectedItemForView.description || "No description available."}</p>
                                        <button onClick={() => setViewPage(2)} className="px-10 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-4">
                                            <FileText size={24} strokeWidth={3} /> <span>Open Reader</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full pt-20">
                                    {selectedItemForView.pdf_file ? <iframe src={selectedItemForView.pdf_file} className="w-full h-full bg-white" title="PDF Preview" /> : <div className="p-20 text-center uppercase font-black text-white/30 tracking-widest">No PDF available</div>}
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
