import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, FileText, Eye, Edit2, Trash2, RefreshCw, X, Upload, FileCheck, AlertCircle, ChevronLeft, Loader2, Maximize2, Minimize2, ExternalLink, ChevronsLeft, ChevronsRight, ChevronRight, Filter, Bell, CheckCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const LiveClassRegistry = () => {
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
    const [packages, setPackages] = useState([]); // New Package State

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
        section: '',
        package: ''
    });

    const [viewTargeting, setViewTargeting] = useState('all');

    const [liveClasses, setLiveClasses] = useState([]);

    const [newItem, setNewItem] = useState({
        name: '',
        meeting_link: '',
        start_time: '',
        duration: '',
        description: '',
        session: '',
        class_level: '',
        subject: '',
        exam_type: '',
        target_exam: '',
        section: '',
        is_general: false,
        packages: []
    });

    const fetchLiveClasses = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/live-classes/`);
            setLiveClasses(response.data);
        } catch (error) {
            console.error("Failed to fetch live classes", error);
            toast.error("Failed to load live classes");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl]);

    const fetchMasterData = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const [sessRes, classRes, subRes, etRes, teRes, secRes, pkgRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/sessions/`),
                axios.get(`${apiUrl}/api/master-data/classes/`),
                axios.get(`${apiUrl}/api/master-data/subjects/`),
                axios.get(`${apiUrl}/api/master-data/exam-types/`),
                axios.get(`${apiUrl}/api/master-data/target-exams/`),
                axios.get(`${apiUrl}/api/sections/`),
                axios.get(`${apiUrl}/api/packages/`)
            ]);
            setSessions(sessRes.data);
            setClasses(classRes.data);
            setSubjects(subRes.data);
            setExamTypes(etRes.data);
            setTargetExams(teRes.data);
            setSections(secRes.data);
            setPackages(pkgRes.data);
            console.log('Packages fetched:', pkgRes.data);
        } catch (error) {
            console.error("Failed to fetch master data", error);
        }
    }, [getApiUrl]);

    useEffect(() => {
        fetchLiveClasses();
        fetchMasterData();
    }, [fetchLiveClasses, fetchMasterData]);


    const handleAddItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();

            console.log('=== DEBUG: handleAddItem ===');
            console.log('newItem:', newItem);
            console.log('packages array:', newItem.packages);
            console.log('is_general:', newItem.is_general);

            // Validate package selection
            if (!newItem.is_general && (!newItem.packages || newItem.packages.length === 0 || newItem.packages.every(p => !p))) {
                toast.error("Please select at least one package");
                setIsActionLoading(false);
                return;
            }

            const payload = {
                name: newItem.name,
                meeting_link: newItem.meeting_link,
                start_time: newItem.start_time,
                duration: newItem.duration,
                description: newItem.description,
                session: newItem.is_general ? (newItem.session || null) : null,
                class_level: newItem.is_general ? (newItem.class_level || null) : null,
                subject: newItem.is_general ? (newItem.subject || null) : null,
                exam_type: newItem.is_general ? (newItem.exam_type || null) : null,
                target_exam: newItem.is_general ? (newItem.target_exam || null) : null,
                section: newItem.is_general ? (newItem.section || null) : null,
                is_general: newItem.is_general,
                packages: !newItem.is_general ? (newItem.packages || []).filter(p => p !== null && p !== '' && p !== undefined) : [],
            };

            console.log('Payload being sent:', payload);

            await axios.post(`${apiUrl}/api/master-data/live-classes/`, payload);

            toast.success("Live Class scheduled successfully");
            setIsAddModalOpen(false);
            resetForm();
            fetchLiveClasses();
        } catch (error) {
            console.error("Failed to add live class", error);
            console.error("Error response:", error.response?.data);
            toast.error("Failed to schedule live class");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEditClick = (item) => {
        setSelectedItemForEdit(item);
        setNewItem({
            name: item.name,
            meeting_link: item.meeting_link,
            start_time: item.start_time ? item.start_time.slice(0, 16) : '', // Format for datetime-local
            duration: item.duration,
            description: item.description || '',
            session: item.session || '',
            class_level: item.class_level || '',
            subject: item.subject || '',
            exam_type: item.exam_type || '',
            target_exam: item.target_exam || '',
            section: item.section || '',
            is_general: item.is_general || false,
            packages: item.packages || []
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();

            // Validate package selection
            if (!newItem.is_general && (!newItem.packages || newItem.packages.length === 0 || newItem.packages.every(p => !p))) {
                toast.error("Please select at least one package");
                setIsActionLoading(false);
                return;
            }

            const payload = {
                name: newItem.name,
                meeting_link: newItem.meeting_link,
                start_time: newItem.start_time,
                duration: newItem.duration,
                description: newItem.description,
                session: newItem.is_general ? (newItem.session || null) : null,
                class_level: newItem.is_general ? (newItem.class_level || null) : null,
                subject: newItem.is_general ? (newItem.subject || null) : null,
                exam_type: newItem.is_general ? (newItem.exam_type || null) : null,
                target_exam: newItem.is_general ? (newItem.target_exam || null) : null,
                section: newItem.is_general ? (newItem.section || null) : null,
                is_general: newItem.is_general,
                packages: !newItem.is_general ? (newItem.packages || []).filter(p => p !== null && p !== '' && p !== undefined) : [],
            };

            console.log('Update payload being sent:', payload);

            await axios.put(`${apiUrl}/api/master-data/live-classes/${selectedItemForEdit.id}/`, payload);

            toast.success("Live Class updated successfully");
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
            resetForm();
            fetchLiveClasses();
        } catch (error) {
            console.error("Failed to update live class", error);
            console.error("Error response:", error.response?.data);
            toast.error("Failed to update live class");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this live class?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/live-classes/${id}/`);
            toast.success("Live Class deleted");
            fetchLiveClasses();
        } catch (error) {
            console.error("Failed to delete notice", error);
            toast.error("Failed to delete notice");
        }
    };

    const resetForm = () => {
        setNewItem({ name: '', meeting_link: '', start_time: '', duration: '', description: '', session: '', class_level: '', subject: '', exam_type: '', target_exam: '', section: '', is_general: false, packages: [] });
    };

    // Advanced Filtered Logic
    const filteredLiveClasses = useMemo(() => {
        return liveClasses.filter(n => {
            const matchesSearch = n.name.toLowerCase().includes(searchQuery.toLowerCase());

            // View Mode Filter
            if (viewTargeting === 'packages') {
                if (n.is_general) return false;
                if (activeFilters.package && !n.packages.includes(activeFilters.package)) return false;
            } else if (viewTargeting === 'general') {
                if (!n.is_general) return false;
                if (activeFilters.session && n.session !== activeFilters.session) return false;
                if (activeFilters.class_level && n.class_level !== activeFilters.class_level) return false;
                if (activeFilters.subject && n.subject !== activeFilters.subject) return false;
                if (activeFilters.exam_type && n.exam_type !== activeFilters.exam_type) return false;
                if (activeFilters.target_exam && n.target_exam !== activeFilters.target_exam) return false;
                if (activeFilters.section && n.section !== activeFilters.section) return false;
            }
            // If viewTargeting === 'all', show everything (no filtering by type)

            return matchesSearch;
        });
    }, [liveClasses, searchQuery, activeFilters, viewTargeting]);

    // Dynamic Filter Options based on available data
    const dynamicFilterOptions = useMemo(() => {
        return {
            sessions: [...new Set(liveClasses.filter(n => n.session_name).map(n => JSON.stringify({ id: n.session, name: n.session_name })))].map(s => JSON.parse(s)),
            classes: [...new Set(liveClasses.filter(n => n.class_name).map(n => JSON.stringify({ id: n.class_level, name: n.class_name })))].map(c => JSON.parse(c)),
            subjects: [...new Set(liveClasses.filter(n => n.subject_name).map(n => JSON.stringify({ id: n.subject, name: n.subject_name })))].map(s => JSON.parse(s)),
            examTypes: [...new Set(liveClasses.filter(n => n.exam_type_name).map(n => JSON.stringify({ id: n.exam_type, name: n.exam_type_name })))].map(e => JSON.parse(e)),
            targetExams: [...new Set(liveClasses.filter(n => n.target_exam_name).map(n => JSON.stringify({ id: n.target_exam, name: n.target_exam_name })))].map(t => JSON.parse(t)),
            sections: [...new Set(liveClasses.filter(n => n.section_name).map(n => JSON.stringify({ id: n.section, name: n.section_name })))].map(s => JSON.parse(s))
        };
    }, [liveClasses]);

    // Pagination logic
    const totalPages = Math.ceil(filteredLiveClasses.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLiveClasses.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLiveClasses, currentPage, itemsPerPage]);

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
                                    LIVE SESSIONS
                                </span>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    ALL <span className="text-amber-500">Live Class</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage and schedule live classes for students.
                            </p>
                        </div>
                        <button
                            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                            className="group flex items-center gap-2 px-8 py-4 bg-green-700 hover:bg-green-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-green-700/25 active:scale-95 whitespace-nowrap"
                        >
                            <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-all duration-300" />
                            <span>Add LiveClass +</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 group">
                                <Search className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-amber-500' : 'text-slate-400 group-focus-within:text-amber-500'}`} size={18} />
                                <input
                                    type="text"
                                    placeholder="Enter the name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full pl-14 pr-6 py-4 rounded-2xl border-2 outline-none transition-all font-bold text-sm ${isDarkMode ? 'bg-white/[0.01] border-white/5 focus:border-amber-500/50 text-white' : 'bg-slate-50 border-slate-100 focus:border-amber-500 focus:bg-white text-slate-900'}`}
                                />
                            </div>
                            <button
                                onClick={() => { fetchLiveClasses(); fetchMasterData(); }}
                                className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-amber-500 border border-white/5' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100'}`}
                            >
                                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Toggle View Mode */}
                            <div className={`p-1 rounded-xl flex items-center gap-1 border transition-all ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                                <span className="px-2 text-[10px] font-black uppercase tracking-widest opacity-50">Targeting:</span>
                                <button
                                    onClick={() => setViewTargeting('all')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${viewTargeting === 'all' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'opacity-60 hover:opacity-100'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setViewTargeting('packages')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${viewTargeting === 'packages' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'opacity-60 hover:opacity-100'}`}
                                >
                                    Packages
                                </button>
                                <button
                                    onClick={() => setViewTargeting('general')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${viewTargeting === 'general' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'opacity-60 hover:opacity-100'}`}
                                >
                                    General
                                </button>
                            </div>

                            <div className={`w-px h-8 mx-2 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>

                            <div className={`p-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                <Filter size={14} /> Filters
                            </div>

                            {viewTargeting === 'all' ? (
                                <span className={`px-4 py-2.5 rounded-xl font-bold text-xs ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Showing all live classes</span>
                            ) : viewTargeting === 'packages' ? (
                                <select
                                    value={activeFilters.package}
                                    onChange={(e) => setActiveFilters({ ...activeFilters, package: e.target.value })}
                                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                                >
                                    <option value="">All Packages</option>
                                    {packages.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                </select>
                            ) : (
                                <>
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
                                </>
                            )}

                            {(activeFilters.session || activeFilters.class_level || activeFilters.subject || activeFilters.exam_type || activeFilters.target_exam || activeFilters.section || activeFilters.package) && (
                                <button
                                    onClick={() => setActiveFilters({ session: '', class_level: '', subject: '', exam_type: '', target_exam: '', section: '', package: '' })}
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
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-orange-400 text-white'}`}>
                                <th className="py-5 px-6 text-center w-20">#</th>
                                <th className="py-5 px-6">Name</th>
                                <th className="py-5 px-6 text-center">Date</th>
                                <th className="py-5 px-6 text-center">Duration</th>
                                <th className="py-5 px-6 text-center">Type</th>
                                <th className="py-5 px-6 text-center">Targeting</th>
                                <th className="py-5 px-6 text-center">Action</th>
                                <th className="py-5 px-6 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 border-t border-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <Loader2 size={40} className="animate-spin text-amber-500" />
                                            <p className="font-bold text-lg opacity-50 text-slate-500 uppercase tracking-widest">Fetching Live Classes...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedItems.length > 0 ? (
                                paginatedItems.map((item, index) => (
                                    <tr key={item.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`text-xs font-black ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>{((currentPage - 1) * itemsPerPage) + index + 1}</span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm block group-hover:text-amber-500 transition-colors uppercase tracking-tight">{item.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {item.session_name && <span className="text-[10px] font-bold text-amber-500/60 uppercase">{item.session_name}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <span className="text-[11px] font-bold opacity-70">
                                                {item.start_time ? new Date(item.start_time).toLocaleString('en-GB').replace(',', '') : '-'}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <span className="text-[11px] font-bold opacity-70">{item.duration}</span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${item.is_general ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                                {item.is_general ? 'General' : 'Package'}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col gap-1 items-center justify-center">
                                                {item.is_general ? (
                                                    <>
                                                        {item.subject_name ? (
                                                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-lg border border-emerald-500/20">{item.subject_name}</span>
                                                        ) : <span className="text-[9px] font-black uppercase opacity-20">General</span>}
                                                        {item.class_name && <span className="text-[8px] font-black uppercase opacity-40">{item.class_name}</span>}
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        {item.package_names && item.package_names.length > 0 ? (
                                                            item.package_names.slice(0, 2).map((p, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-purple-500/10 text-purple-500 text-[9px] font-black uppercase rounded-lg border border-purple-500/20 max-w-[150px] truncate">{p}</span>
                                                            ))
                                                        ) : <span className="text-[9px] opacity-30">-</span>}
                                                        {item.package_names && item.package_names.length > 2 && (
                                                            <span className="text-[9px] opacity-40">+{item.package_names.length - 2} more</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex justify-center">
                                                <button onClick={() => handleEditClick(item)} className="p-2.5 rounded-xl text-blue-500 hover:bg-blue-500/10 transition-all">
                                                    <Edit2 size={16} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex justify-center">
                                                <button onClick={() => handleDeleteItem(item.id)} className="p-2.5 rounded-xl text-blue-500 hover:bg-blue-500/10 transition-all">
                                                    <Trash2 size={16} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={8} className="py-20 text-center text-slate-500 font-bold uppercase tracking-[0.2em] text-xs opacity-40 italic">No live classes matching criteria</td></tr>
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
                                <h2 className="text-xl font-black uppercase tracking-tight">{isAddModalOpen ? 'Create New' : 'Edit'} <span className="text-amber-500">Live Class</span></h2>
                            </div>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={isAddModalOpen ? handleAddItem : handleUpdateItem} className="p-8 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            {/* Top Section: Academic Targeting */}
                            <div className="flex flex-col gap-6">
                                {/* Type Toggle */}
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-100 dark:bg-white/5">
                                    <span className="text-xs font-black uppercase tracking-widest opacity-60">Targeting Type:</span>
                                    <div className="flex bg-white dark:bg-black/20 p-1 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setNewItem({ ...newItem, is_general: false })}
                                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${!newItem.is_general ? 'bg-amber-500 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                                        >
                                            Packages
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewItem({ ...newItem, is_general: true })}
                                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${newItem.is_general ? 'bg-amber-500 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                                        >
                                            General (Master Data)
                                        </button>
                                    </div>
                                </div>

                                {!newItem.is_general ? (
                                    /* Package Selection */
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Select Packages *</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto custom-scrollbar p-2 rounded-xl border border-dashed border-slate-300 dark:border-white/10">
                                            {packages.map(pkg => (
                                                <label key={pkg._id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${newItem.packages.includes(pkg._id) ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-white dark:bg-white/5 border-transparent hover:bg-slate-50 dark:hover:bg-white/10'}`}>
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${newItem.packages.includes(pkg._id) ? 'bg-amber-500 border-amber-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                        {newItem.packages.includes(pkg._id) && <CheckCircle size={12} className="text-white" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={newItem.packages.includes(pkg._id)}
                                                        onChange={(e) => {
                                                            console.log('Checkbox changed:', pkg.name, pkg._id, 'checked:', e.target.checked);
                                                            if (e.target.checked) {
                                                                setNewItem(prev => {
                                                                    const updated = { ...prev, packages: [...prev.packages, pkg._id] };
                                                                    console.log('Adding package, new state:', updated.packages);
                                                                    return updated;
                                                                });
                                                            } else {
                                                                setNewItem(prev => {
                                                                    const updated = { ...prev, packages: prev.packages.filter(id => id !== pkg._id) };
                                                                    console.log('Removing package, new state:', updated.packages);
                                                                    return updated;
                                                                });
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-xs font-bold">{pkg.name}</span>
                                                </label>
                                            ))}
                                            {packages.length === 0 && <p className="text-xs opacity-50 p-4">No packages found.</p>}
                                        </div>
                                    </div>
                                ) : (
                                    /* Master Data Grid */
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
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
                                )}
                            </div>

                            {/* Bottom Section: Content Details */}
                            <div className="grid grid-cols-1 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Live Class Title *</label>
                                        <input
                                            required
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                            className={`w-full px-6 py-4 rounded-2xl outline-none border-2 font-black transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5 focus:border-amber-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-100 focus:border-amber-500 focus:bg-white text-slate-800'}`}
                                            placeholder="Enter live class title..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Live Link *</label>
                                            <input
                                                required
                                                type="url"
                                                value={newItem.meeting_link}
                                                onChange={(e) => setNewItem({ ...newItem, meeting_link: e.target.value })}
                                                className={`w-full px-6 py-4 rounded-2xl outline-none border-2 font-bold transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5 focus:border-amber-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-100 focus:border-amber-500 focus:bg-white text-slate-800'}`}
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Start Time *</label>
                                            <input
                                                required
                                                type="datetime-local"
                                                value={newItem.start_time}
                                                onChange={(e) => setNewItem({ ...newItem, start_time: e.target.value })}
                                                className={`w-full px-6 py-4 rounded-2xl outline-none border-2 font-bold transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5 focus:border-amber-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-100 focus:border-amber-500 focus:bg-white text-slate-800'}`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Duration (Matches) *</label>
                                        <input
                                            required
                                            type="number"
                                            value={newItem.duration}
                                            onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })}
                                            className={`w-full px-6 py-4 rounded-2xl outline-none border-2 font-bold transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5 focus:border-amber-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-100 focus:border-amber-500 focus:bg-white text-slate-800'}`}
                                            placeholder="Duration in minutes"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Description (Optional)</label>
                                        <textarea
                                            value={newItem.description}
                                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            className={`w-full px-6 py-4 rounded-2xl outline-none border-2 font-bold transition-all min-h-[100px] resize-none ${isDarkMode ? 'bg-white/[0.02] border-white/5 focus:border-amber-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-200 focus:border-amber-500 focus:bg-white text-slate-800'}`}
                                            placeholder="Provide more context for students..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isActionLoading}
                                className={`w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex justify-center items-center gap-2 ${isActionLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isActionLoading ? <Loader2 className="animate-spin" size={24} /> : (isAddModalOpen ? 'Schedule Live Class' : 'Update Live Class')}
                            </button>
                        </form>
                    </div>
                </div >
            )}

        </div >
    );
};

export default LiveClassRegistry;
