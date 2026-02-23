import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Plus, FileText, Eye, Edit2, Trash2, RefreshCw, X, Upload, FileCheck, ChevronLeft, Loader2, Maximize2, Minimize2, ChevronDown, Check, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Square, CheckSquare } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const HomeworkRegistry = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, loading: authLoading } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // View Modal State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedItemForView, setSelectedItemForView] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const [homeworkItems, setHomeworkItems] = useState([]);

    // Master Data States
    const [sections, setSections] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [targetExams, setTargetExams] = useState([]);
    const [packages, setPackages] = useState([]);

    // Custom Select States
    const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const sectionDropdownRef = useRef(null);
    const typeDropdownRef = useRef(null);

    const [previews, setPreviews] = useState({
        pdf_file: false
    });

    const [newItem, setNewItem] = useState({
        name: '',
        homework_type: 'Must Do Questions',
        session: '',
        class_level: '',
        subject: '',
        exam_type: '',
        target_exam: '',
        selectedSections: [],
        pdf_file: null,
        is_general: true,
        packages: []
    });

    // Pagination & Filtering State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpToPage, setJumpToPage] = useState('');
    const [activeFilters, setActiveFilters] = useState({
        session: '',
        class_level: '',
        subject: '',
        target_exam: '',
        homework_type: ''
    });

    const fetchHomeworkItems = useCallback(async () => {
        if (authLoading) return;
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/homework/`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            setHomeworkItems(response.data);
        } catch (error) {
            console.error("Failed to fetch homework items", error);
            toast.error("Failed to load homework content");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, token, authLoading]);

    const fetchMasterData = useCallback(async () => {
        if (authLoading) return;
        try {
            const apiUrl = getApiUrl();
            const config = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
            const [secRes, sessRes, classRes, subRes, etRes, teRes, pkgRes] = await Promise.all([
                axios.get(`${apiUrl}/api/sections/`, config),
                axios.get(`${apiUrl}/api/master-data/sessions/`, config),
                axios.get(`${apiUrl}/api/master-data/classes/`, config),
                axios.get(`${apiUrl}/api/master-data/subjects/`, config),
                axios.get(`${apiUrl}/api/master-data/exam-types/`, config),
                axios.get(`${apiUrl}/api/master-data/target-exams/`, config),
                axios.get(`${apiUrl}/api/packages/`, config)
            ]);
            setSections(secRes.data);
            setSessions(sessRes.data);
            setClasses(classRes.data);
            setSubjects(subRes.data);
            setExamTypes(etRes.data);
            setTargetExams(teRes.data);
            setPackages(pkgRes.data);
        } catch (error) {
            console.error("Failed to fetch master data", error);
        }
    }, [getApiUrl, token, authLoading]);

    useEffect(() => {
        if (!authLoading) {
            fetchHomeworkItems();
            fetchMasterData();
        }
    }, [fetchHomeworkItems, fetchMasterData, authLoading]);

    // Handle outside clicks for custom multiselect
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(event.target)) {
                setIsSectionDropdownOpen(false);
            }
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
                setIsTypeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        setNewItem({ ...newItem, [field]: file });

        if (file) {
            if (field === 'pdf_file') {
                setPreviews(prev => ({ ...prev, [field]: true }));
            }
        }
    };

    const handleRemoveFile = (field) => {
        setNewItem(prev => ({ ...prev, [field]: null }));
        setPreviews(prev => ({ ...prev, [field]: false }));
    };

    const handleSectionToggle = (sectionId) => {
        setNewItem(prev => {
            const isSelected = prev.selectedSections.includes(sectionId);
            if (isSelected) {
                return { ...prev, selectedSections: prev.selectedSections.filter(id => id !== sectionId) };
            } else {
                return { ...prev, selectedSections: [...prev.selectedSections, sectionId] };
            }
        });
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            formData.append('name', newItem.name);
            formData.append('homework_type', newItem.homework_type);
            formData.append('is_general', newItem.is_general);

            if (newItem.is_general) {
                if (newItem.session) formData.append('session', newItem.session);
                if (newItem.class_level) formData.append('class_level', newItem.class_level);
                if (newItem.subject) formData.append('subject', newItem.subject);
                if (newItem.exam_type) formData.append('exam_type', newItem.exam_type);
                if (newItem.target_exam) formData.append('target_exam', newItem.target_exam);

                newItem.selectedSections.forEach(sectionId => {
                    formData.append('sections', sectionId);
                });
            } else {
                newItem.packages.forEach(pkgId => {
                    formData.append('packages', pkgId);
                });
            }

            if (newItem.pdf_file) formData.append('pdf_file', newItem.pdf_file);

            await axios.post(`${apiUrl}/api/master-data/homework/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Homework added successfully");
            setIsAddModalOpen(false);
            resetForm();
            fetchHomeworkItems();
        } catch (error) {
            console.error("Failed to add homework", error);
            toast.error("Failed to add homework item");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEditClick = (item) => {
        setSelectedItemForEdit(item);
        setNewItem({
            name: item.name || '',
            homework_type: item.homework_type || 'Must Do Questions',
            session: item.session || '',
            class_level: item.class_level || '',
            subject: item.subject || '',
            exam_type: item.exam_type || '',
            target_exam: item.target_exam || '',
            selectedSections: (item.sections || []).filter(id => typeof id === 'string'),
            pdf_file: null,
            is_general: item.is_general !== undefined ? item.is_general : true,
            packages: item.packages || []
        });
        setPreviews({
            pdf_file: !!item.pdf_file
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
            formData.append('homework_type', newItem.homework_type);
            formData.append('is_general', newItem.is_general);

            if (newItem.is_general) {
                formData.append('session', newItem.session || '');
                formData.append('class_level', newItem.class_level || '');
                formData.append('subject', newItem.subject || '');
                formData.append('exam_type', newItem.exam_type || '');
                formData.append('target_exam', newItem.target_exam || '');

                if (newItem.selectedSections.length === 0) {
                    formData.append('sections', '');
                } else {
                    newItem.selectedSections.forEach(sectionId => {
                        formData.append('sections', sectionId);
                    });
                }
            } else {
                if (newItem.packages.length === 0) {
                    formData.append('packages', '');
                } else {
                    newItem.packages.forEach(pkgId => {
                        formData.append('packages', pkgId);
                    });
                }
            }

            if (newItem.pdf_file) formData.append('pdf_file', newItem.pdf_file);

            await axios.patch(`${apiUrl}/api/master-data/homework/${selectedItemForEdit.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Homework updated successfully");
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
            resetForm();
            fetchHomeworkItems();
        } catch (error) {
            console.error("Failed to update homework", error);
            toast.error("Failed to update homework item");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/homework/${id}/`);
            toast.success("Homework deleted successfully");
            fetchHomeworkItems();
        } catch (error) {
            console.error("Failed to delete homework", error);
            toast.error("Failed to delete homework item");
        }
    };

    const resetForm = () => {
        setNewItem({
            name: '', homework_type: 'Must Do Questions', session: '', class_level: '', subject: '', exam_type: '', target_exam: '',
            selectedSections: [], pdf_file: null, is_general: true, packages: []
        });
        setPreviews({
            pdf_file: false
        });
        setIsSectionDropdownOpen(false);
    };

    const dynamicFilterOptions = useMemo(() => {
        const options = {
            sessions: new Set(),
            classes: new Set(),
            subjects: new Set(),
            targetExams: new Set(),
            types: new Set()
        };

        homeworkItems.forEach(item => {
            if (item.session_name) options.sessions.add(item.session_name);
            if (item.class_name) options.classes.add(item.class_name);
            if (item.subject_name) options.subjects.add(item.subject_name);
            if (item.target_exam_name) options.targetExams.add(item.target_exam_name);
            if (item.homework_type) options.types.add(item.homework_type);
        });

        return {
            sessions: Array.from(options.sessions).sort(),
            classes: Array.from(options.classes).sort(),
            subjects: Array.from(options.subjects).sort(),
            targetExams: Array.from(options.targetExams).sort(),
            types: Array.from(options.types).sort()
        };
    }, [homeworkItems]);

    const filteredItems = useMemo(() => {
        return homeworkItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSession = !activeFilters.session || item.session_name === activeFilters.session;
            const matchesClass = !activeFilters.class_level || item.class_name === activeFilters.class_level;
            const matchesSubject = !activeFilters.subject || item.subject_name === activeFilters.subject;
            const matchesTargetExam = !activeFilters.target_exam || item.target_exam_name === activeFilters.target_exam;
            const matchesType = !activeFilters.homework_type || item.homework_type === activeFilters.homework_type;

            return matchesSearch && matchesSession && matchesClass && matchesSubject && matchesTargetExam && matchesType;
        });
    }, [homeworkItems, searchQuery, activeFilters]);

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
            <div className={`p-8 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-orange-500/20">
                                    Content Management
                                </span>
                                <h2 className={`text-3xl font-black tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    Homework <span className="text-orange-500">Section</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage homework assignments, types, and academic targeting.
                            </p>
                        </div>
                        <button
                            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[5px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center gap-2 group"
                        >
                            <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-all duration-300" />
                            <span>Add Homework +</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="relative group flex-1">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Enter the name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full pl-14 pr-6 py-4 rounded-[5px] border-2 outline-none font-bold transition-all text-sm ${isDarkMode
                                        ? 'bg-white/[0.01] border-white/5 text-white focus:border-orange-500/50'
                                        : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-orange-500/50'
                                        }`}
                                />
                            </div>
                            <button
                                onClick={() => { fetchHomeworkItems(); fetchMasterData(); }}
                                className={`p-4 rounded-[5px] transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-orange-400 border border-white/5' : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-100'}`}
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
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Sessions</option>
                                {dynamicFilterOptions.sessions.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                            </select>
                            <select
                                value={activeFilters.class_level}
                                onChange={(e) => setActiveFilters({ ...activeFilters, class_level: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Classes</option>
                                {dynamicFilterOptions.classes.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
                            </select>
                            <select
                                value={activeFilters.subject}
                                onChange={(e) => setActiveFilters({ ...activeFilters, subject: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Subjects</option>
                                {dynamicFilterOptions.subjects.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                            </select>
                            <select
                                value={activeFilters.homework_type}
                                onChange={(e) => setActiveFilters({ ...activeFilters, homework_type: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Types</option>
                                {dynamicFilterOptions.types.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[5px] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-orange-500 text-white'}`}>
                                <th className="py-5 px-6 text-center w-20">#</th>
                                <th className="py-5 px-6">Name</th>
                                <th className="py-5 px-6">Code</th>
                                <th className="py-5 px-6 text-center">Subject</th>
                                <th className="py-5 px-6 text-center">Type</th>
                                <th className="py-5 px-6">Sections</th>
                                <th className="py-5 px-6">Packages</th>
                                <th className="py-5 px-6 text-center">PDF</th>
                                <th className="py-5 px-6 text-center">Action</th>
                                <th className="py-5 px-6 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 border-t border-white/5">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-5 px-6"><div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col gap-2">
                                                <div className={`h-4 w-48 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className="flex gap-2">
                                                    <div className={`h-3 w-12 rounded-[10px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                    <div className={`h-3 w-12 rounded-[10px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-6 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-4 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col gap-1">
                                                <div className={`h-3 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-3 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col gap-1">
                                                <div className={`h-3 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-3 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center"><div className={`h-8 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-10 w-10 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-10 w-10 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    </tr>
                                ))
                            ) : paginatedItems.length > 0 ? (
                                paginatedItems.map((item, index) => (
                                    <tr key={item.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`text-xs font-black ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                                {((currentPage - 1) * itemsPerPage) + index + 1}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <span className="font-bold text-sm block group-hover:text-orange-500 transition-colors uppercase tracking-tight">{item.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                {item.session_name && <span className="text-[9px] font-bold text-orange-500/60 uppercase">{item.session_name}</span>}
                                                {item.class_name && (
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{item.class_name}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <span className="text-xs font-bold text-slate-500">{item.code}</span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase rounded-[5px] border border-indigo-500/20">{item.subject_name || 'N/A'}</span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.homework_type}</span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col gap-1">
                                                {item.section_names && item.section_names.length > 0 ? (
                                                    <ul className="list-disc list-inside space-y-0.5">
                                                        {item.section_names.map((name, i) => (
                                                            <li key={i} className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{name}</li>
                                                        ))}
                                                    </ul>
                                                ) : <span className="text-[10px] opacity-30 italic">No sections</span>}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col gap-1">
                                                {item.package_names && item.package_names.length > 0 ? (
                                                    <ul className="list-disc list-inside space-y-0.5">
                                                        {item.package_names.map((name, i) => (
                                                            <li key={i} className="text-[10px] font-bold text-amber-500 uppercase">{name}</li>
                                                        ))}
                                                    </ul>
                                                ) : <span className="text-[10px] opacity-30 italic">No packages</span>}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button
                                                disabled={!item.pdf_file}
                                                onClick={() => {
                                                    setSelectedItemForView(item);
                                                    setIsViewModalOpen(true);
                                                }}
                                                className={`px-4 py-1.5 rounded-[5px] font-black text-[10px] uppercase tracking-widest transition-all border ${!item.pdf_file ? 'opacity-20 cursor-not-allowed border-transparent' : 'bg-transparent text-blue-500 border-blue-500/30 hover:bg-blue-500 hover:text-white hover:border-blue-500 shadow-sm'}`}
                                            >
                                                View
                                            </button>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button onClick={() => handleEditClick(item)} className="p-2.5 rounded-[5px] text-blue-500 hover:bg-blue-600 hover:text-white transition-all active:scale-95 group/edit">
                                                <Edit2 size={18} strokeWidth={2.5} className="group-hover/edit:scale-110" />
                                            </button>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button onClick={() => handleDeleteItem(item.id)} className="p-2.5 rounded-[5px] text-red-500 hover:bg-red-600 hover:text-white transition-all active:scale-95 group/del">
                                                <Trash2 size={18} strokeWidth={2.5} className="group-hover/del:scale-110" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={10} className={`py-20 text-center font-bold uppercase tracking-[0.2em] text-xs transition-all ${isDarkMode ? 'text-slate-500 opacity-40' : 'text-slate-400 opacity-60'}`}>No homework found</td></tr>
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
                            style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                            className={`px-4 py-2 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer ${isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-700 shadow-sm transition-all'}`}
                        >
                            {[10, 20, 50].map(val => (
                                <option key={val} value={val}>{val} per page</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className={`p-2 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-orange-500' : 'bg-slate-100 hover:bg-orange-500'} hover:text-white disabled:opacity-10`}><ChevronsLeft size={18} strokeWidth={2.5} /></button>
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className={`p-2 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-orange-500' : 'bg-slate-100 hover:bg-orange-500'} hover:text-white disabled:opacity-10`}><ChevronLeft size={18} strokeWidth={2.5} /></button>
                        <div className="flex items-center gap-1 mx-4">
                            <span className="text-[10px] font-black uppercase opacity-40">Page</span>
                            <span className="px-4 py-1.5 bg-orange-500 text-white rounded-[5px] font-black text-xs shadow-lg shadow-orange-500/20">{currentPage}</span>
                            <span className="text-[10px] font-black uppercase opacity-40">of {totalPages || 1}</span>
                        </div>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className={`p-2 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-orange-500' : 'bg-slate-100 hover:bg-orange-500'} hover:text-white disabled:opacity-10`}><ChevronRight size={18} strokeWidth={2.5} /></button>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(totalPages)} className={`p-2 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-orange-500' : 'bg-slate-100 hover:bg-orange-500'} hover:text-white disabled:opacity-10`}><ChevronsRight size={18} strokeWidth={2.5} /></button>
                    </div>

                    <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="Jump..."
                            value={jumpToPage}
                            onChange={(e) => setJumpToPage(e.target.value)}
                            className={`w-20 px-4 py-2 rounded-[5px] text-xs font-bold outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white focus:border-orange-500/50' : 'bg-white border-slate-200 text-slate-800'}`}
                        />
                        <button type="submit" className={`p-2 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-orange-500' : 'bg-orange-50 hover:bg-orange-100 text-orange-600'}`}>Go</button>
                    </form>
                </div>
            </div>

            {/* Combined Add/Edit Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                    <div className={`w-full max-w-4xl rounded-[5px] border shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/10 shadow-black' : 'bg-white border-slate-100 shadow-slate-200'}`}>
                        <div className={`p-6 border-b border-white/10 flex justify-between items-center text-white ${isEditModalOpen ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-[5px]"><FileText size={20} /></div>
                                <h2 className="text-xl font-black uppercase tracking-tight">{isAddModalOpen ? 'Add' : 'Edit'} <span className="opacity-70">Homework</span></h2>
                            </div>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }} className="p-2 hover:bg-white/10 rounded-[5px] transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={isAddModalOpen ? handleAddItem : handleUpdateItem} className="p-8 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            {/* Academic Categorization */}
                            <div className={`p-6 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-1.5 h-5 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80 text-orange-500">Assignment Targeting</span>
                                </div>

                                <div className="flex flex-col gap-6">
                                    <div className="flex items-center gap-4 p-4 rounded-[5px] transition-all border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-100 border-slate-200'}">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500'}`}>Targeting Type:</span>
                                        <div className={`flex p-1 rounded-[5px] shadow-inner ${isDarkMode ? 'bg-black/20 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                                            <button
                                                type="button"
                                                onClick={() => setNewItem({ ...newItem, is_general: false })}
                                                className={`px-6 py-2 rounded-[5px] text-xs font-black transition-all ${!newItem.is_general ? 'bg-orange-500 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                                            >
                                                Packages
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewItem({ ...newItem, is_general: true })}
                                                className={`px-6 py-2 rounded-[5px] text-xs font-black transition-all ${newItem.is_general ? 'bg-orange-500 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                                            >
                                                General
                                            </button>
                                        </div>
                                    </div>

                                    {newItem.is_general ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-500">
                                            {[
                                                { label: 'Session', field: 'session', options: sessions },
                                                { label: 'Class Level', field: 'class_level', options: classes },
                                                { label: 'Subject', field: 'subject', options: subjects },
                                                { label: 'Exam Type', field: 'exam_type', options: examTypes },
                                                { label: 'Target Exam', field: 'target_exam', options: targetExams }
                                            ].map((meta, idx) => (
                                                <div key={idx} className="space-y-1.5">
                                                    <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'opacity-40' : 'text-slate-500'}`}>{meta.label}</label>
                                                    <select
                                                        required
                                                        value={newItem[meta.field]}
                                                        onChange={(e) => setNewItem({ ...newItem, [meta.field]: e.target.value })}
                                                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                                        className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-xs transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/5 text-white focus:border-orange-500/50' : 'bg-white border-slate-200 text-slate-800 focus:border-orange-500'}`}
                                                    >
                                                        <option value="">Select {meta.label}</option>
                                                        {meta.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                                    </select>
                                                </div>
                                            ))}

                                            {/* Multi-Select for Sections */}
                                            <div className="space-y-2 relative" ref={sectionDropdownRef}>
                                                <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'opacity-40' : 'text-slate-500'}`}>Assign to Sections</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
                                                    className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-xs transition-all text-left flex items-center justify-between ${isDarkMode
                                                        ? 'bg-[#1a1f2e] border-white/5 text-white'
                                                        : 'bg-white border-slate-200 text-slate-800'
                                                        }`}
                                                >
                                                    <span className="truncate">
                                                        {newItem.selectedSections.length === 0
                                                            ? 'Select Sections'
                                                            : `${newItem.selectedSections.length} Sections Selected`}
                                                    </span>
                                                    <ChevronDown size={16} className={`transition-transform duration-300 ${isSectionDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>

                                                {isSectionDropdownOpen && (
                                                    <div className={`absolute top-full left-0 right-0 z-[110] mt-2 rounded-[5px] border shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300 ${isDarkMode
                                                        ? 'bg-[#1e293b] border-white/10 shadow-black/40'
                                                        : 'bg-white border-slate-100 shadow-slate-200'
                                                        }`}>
                                                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                                                            <div className="space-y-1">
                                                                {sections.length > 0 ? sections.map(sec => {
                                                                    const isSelected = newItem.selectedSections.includes(sec.id);
                                                                    return (
                                                                        <button
                                                                            key={sec.id}
                                                                            type="button"
                                                                            onClick={() => handleSectionToggle(sec.id)}
                                                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[5px] transition-all ${isSelected
                                                                                ? 'bg-orange-500/10 text-orange-500'
                                                                                : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-500'
                                                                                }`}
                                                                        >
                                                                            {isSelected ? <CheckSquare size={16} strokeWidth={3} /> : <Square size={16} strokeWidth={2} />}
                                                                            <span className="text-[11px] font-black uppercase tracking-tight">{sec.name}</span>
                                                                            {isSelected && <Check size={14} className="ml-auto" strokeWidth={4} />}
                                                                        </button>
                                                                    );
                                                                }) : <div className="p-4 text-center text-[10px] font-bold opacity-30">No sections found</div>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in duration-500">
                                            <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'opacity-40' : 'text-slate-500'}`}>Select Packages *</label>
                                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar p-3 rounded-[5px] border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                                                {packages.map(pkg => {
                                                    const isSelected = newItem.packages.includes(pkg._id);
                                                    return (
                                                        <label
                                                            key={pkg._id}
                                                            className={`flex items-center gap-4 p-4 rounded-[5px] border-2 transition-all cursor-pointer group ${isSelected
                                                                ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                                                                : isDarkMode ? 'bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/20' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                                }`}
                                                        >
                                                            <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isSelected ? 'bg-orange-500 text-white' : 'border-2 border-slate-400'}`}>
                                                                {isSelected && <Check size={12} strokeWidth={4} />}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                hidden
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setNewItem(prev => ({ ...prev, packages: [...prev.packages, pkg._id] }));
                                                                    else setNewItem(prev => ({ ...prev, packages: prev.packages.filter(id => id !== pkg._id) }));
                                                                }}
                                                            />
                                                            <span className="text-xs font-black uppercase tracking-tight truncate">{pkg.name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Details & File */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Homework Name *</label>
                                        <input
                                            required
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                            className={`w-full px-6 py-4 rounded-[5px] outline-none border-2 font-black transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5 focus:border-orange-500/50 text-white' : 'bg-slate-50 border-slate-100 focus:border-orange-500 text-slate-800'}`}
                                            placeholder="e.g. Physics Single Choice 01"
                                        />
                                    </div>

                                    <div className="relative" ref={typeDropdownRef}>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isDarkMode ? 'opacity-40' : 'text-slate-500'}`}>Homework Type</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                            className={`w-full px-6 py-4 rounded-[5px] outline-none border-2 font-black transition-all text-left flex items-center justify-between ${isDarkMode
                                                ? 'bg-white/[0.02] border-white/5 text-white focus:border-orange-500/50'
                                                : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-orange-500'
                                                }`}
                                        >
                                            <span>{newItem.homework_type}</span>
                                            <ChevronDown size={20} className={`transition-transform duration-300 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isTypeDropdownOpen && (
                                            <div className={`absolute top-full left-0 right-0 z-[120] mt-3 rounded-[5px] border shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300 ${isDarkMode
                                                ? 'bg-[#1E2532] border-white/10 shadow-black'
                                                : 'bg-white border-slate-100 shadow-slate-200'
                                                }`}>
                                                <div className="p-2 space-y-1">
                                                    {['Must Do Questions', 'Optional Assignment', 'Daily Practice', 'Revision Sheet'].map((type) => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => {
                                                                setNewItem({ ...newItem, homework_type: type });
                                                                setIsTypeDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-5 py-3.5 rounded-[5px] font-black text-xs uppercase tracking-tight transition-all ${newItem.homework_type === type
                                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                                : isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-orange-500'
                                                                }`}
                                                        >
                                                            {type}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Assignment PDF *</label>
                                    <div className={`relative h-[200px] rounded-[5px] border-2 border-dashed transition-all group overflow-hidden flex flex-col items-center justify-center p-4 ${isDarkMode ? 'border-white/10 hover:border-blue-500/50 bg-white/[0.01]' : 'border-slate-200 hover:border-blue-500 bg-slate-50'}`}>
                                        {(newItem.pdf_file || previews.pdf_file) && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFile('pdf_file')}
                                                className="absolute top-4 right-4 z-20 p-2 bg-red-500 text-white rounded-[5px] shadow-xl hover:bg-red-600 transition-all active:scale-90"
                                            >
                                                <X size={14} strokeWidth={3} />
                                            </button>
                                        )}
                                        <input type="file" required={isAddModalOpen} accept=".pdf" onChange={(e) => handleFileChange(e, 'pdf_file')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        {newItem.pdf_file ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 rounded-[5px] bg-blue-500 text-white shadow-xl shadow-blue-500/20">
                                                    <FileCheck size={40} />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 max-w-[200px] truncate">{newItem.pdf_file.name}</span>
                                            </div>
                                        ) : previews.pdf_file ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 rounded-[5px] bg-blue-500/20 text-blue-500">
                                                    <FileCheck size={40} />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Existing File Attached</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 rounded-[5px] bg-blue-500/10 text-blue-500">
                                                    <Upload size={32} />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Click or Drag to Upload PDF Assignment</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isActionLoading}
                                className={`w-full py-5 rounded-[5px] font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95 flex justify-center items-center gap-3 ${isActionLoading ? 'opacity-70 cursor-not-allowed' : (isAddModalOpen ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 text-white')}`}
                            >
                                {isActionLoading ? <Loader2 className="animate-spin" size={24} /> : (isAddModalOpen ? 'Add Assignment' : 'Update Record')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isViewModalOpen && selectedItemForView && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 ${isFullScreen ? 'p-0' : 'p-4'}`}>
                    <div className={`transition-all duration-300 overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col ${isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl rounded-[5px] h-[90vh]'}`}>
                        {/* Modal Header */}
                        <div className={`p-5 flex justify-between items-center border-b ${isDarkMode ? 'bg-[#1E2532] border-white/10 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-[5px]">
                                    <FileText size={22} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-wider">{selectedItemForView.name}</h2>
                                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{selectedItemForView.homework_type}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsFullScreen(!isFullScreen)}
                                    className={`p-2.5 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                                >
                                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>
                                <button
                                    onClick={() => { setIsViewModalOpen(false); setSelectedItemForView(null); setIsFullScreen(false); }}
                                    className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-[5px] transition-all active:scale-90"
                                >
                                    <X size={20} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        {/* PDF Content Area */}
                        <div className={`flex-grow relative ${isDarkMode ? 'bg-[#0f1419]' : 'bg-slate-50'}`}>
                            <div className="w-full h-full">
                                {selectedItemForView.pdf_file ? (
                                    <iframe src={selectedItemForView.pdf_file} className="w-full h-full bg-white transition-opacity duration-500" title="PDF Preview" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500 uppercase font-black tracking-widest">
                                        <div className="p-6 bg-slate-500/10 rounded-full">
                                            <FileText size={48} />
                                        </div>
                                        <span>No PDF Preview Available</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default HomeworkRegistry;
