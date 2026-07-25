import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, FileText, Eye, Edit2, Trash2, RefreshCw, X, Upload, FileCheck, AlertCircle, ChevronLeft, Loader2, Maximize2, Minimize2, ExternalLink, ChevronsLeft, ChevronsRight, ChevronRight, Filter, Bell, CheckCircle, ChevronDown, Check, Video } from 'lucide-react';
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
    const [packages, setPackages] = useState([]);
    const [centres, setCentres] = useState([]);

    // Live Stream Modal State
    const [activeLiveStream, setActiveLiveStream] = useState(null);

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
        target_exams: [],
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
        class_levels: [],
        centres: [],
        programmes: []
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
            const [sessRes, classRes, subRes, etRes, teRes, secRes, pkgRes, centreRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/sessions/`),
                axios.get(`${apiUrl}/api/master-data/classes/`),
                axios.get(`${apiUrl}/api/master-data/subjects/`),
                axios.get(`${apiUrl}/api/master-data/exam-types/`),
                axios.get(`${apiUrl}/api/master-data/target-exams/`),
                axios.get(`${apiUrl}/api/master-data/master-sections/`),
                axios.get(`${apiUrl}/api/packages/`),
                axios.get(`${apiUrl}/api/centres/`)
            ]);

            // Handle MasterSection API (Array, {results: []}, or {sections: []})
            const secData = secRes.data;
            setSections(
                Array.isArray(secData) ? secData :
                    (Array.isArray(secData?.results) ? secData.results :
                        (Array.isArray(secData?.sections) ? secData.sections : []))
            );

            setSessions(sessRes.data.filter(s => s.is_active));
            setClasses(classRes.data);
            setSubjects(subRes.data);
            setExamTypes(etRes.data);
            setTargetExams(teRes.data);
            setPackages(pkgRes.data);
            setCentres(Array.isArray(centreRes.data) ? centreRes.data : (centreRes.data?.results || []));
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

            const payload = {
                name: newItem.name,
                meeting_link: newItem.meeting_link,
                start_time: newItem.start_time,
                duration: newItem.duration,
                description: newItem.description,
                class_levels: newItem.class_levels || [],
                centres: newItem.centres || [],
                programmes: newItem.programmes || []
            };

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

    const MultiSelect = ({ label, options, value = [], onChange, placeholder, isDarkMode, required, className = '' }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [searchTerm, setSearchTerm] = useState('');
        const containerRef = React.useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (containerRef.current && !containerRef.current.contains(event.target)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        const safeValue = Array.isArray(value) ? value : [];

        const selectedNames = useMemo(() => {
            return options
                .filter(opt => {
                    const optId = opt.id !== undefined ? opt.id : opt.value;
                    return safeValue.some(v => String(v) === String(optId));
                })
                .map(opt => opt.label || opt.name || opt.value);
        }, [options, safeValue]);

        const filteredOptions = useMemo(() => {
            if (!searchTerm) return options;
            return options.filter(opt => {
                const text = (opt.label || opt.name || opt.value || '').toLowerCase();
                return text.includes(searchTerm.toLowerCase());
            });
        }, [options, searchTerm]);

        const toggleOption = (id) => {
            const isAlreadySelected = safeValue.some(v => String(v) === String(id));
            const newValue = isAlreadySelected
                ? safeValue.filter(v => String(v) !== String(id))
                : [...safeValue, id];
            onChange(newValue);
        };

        const handleSelectAll = () => {
            if (safeValue.length === options.length) {
                onChange([]);
            } else {
                onChange(options.map(opt => opt.id !== undefined ? opt.id : opt.value));
            }
        };

        return (
            <div className={`relative group ${className}`} ref={containerRef}>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative w-full px-4 py-3 rounded-[5px] border-2 transition-all cursor-pointer flex items-center justify-between
                        ${isOpen
                            ? `border-amber-500 ${isDarkMode ? 'bg-[#1a1f2e] shadow-[0_0_0_4px_rgba(245,158,11,0.1)]' : 'bg-white shadow-[0_0_0_4px_rgba(245,158,11,0.1)]'}`
                            : isDarkMode ? 'border-white/5 bg-[#1a1f2e] text-white hover:border-white/10' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 shadow-sm'}`}
                >
                    <label className={`absolute left-3 -top-2 px-1 text-[10px] font-black uppercase tracking-widest transition-all
                        ${isOpen ? `text-amber-500 ${isDarkMode ? 'bg-[#10141D]' : 'bg-white'}` : isDarkMode ? 'bg-[#10141D] text-slate-500 opacity-40' : 'bg-white text-slate-500'}`}>
                        {label} {required && '*'}
                    </label>

                    <span className={`text-xs font-bold truncate ${safeValue.length === 0
                        ? (isDarkMode ? 'text-white/30' : 'text-slate-400')
                        : (isDarkMode ? 'text-white' : 'text-slate-700')}`}>
                        {safeValue.length > 0 
                            ? (selectedNames.length > 0 ? selectedNames.join(', ') : `${safeValue.length} Selected`) 
                            : placeholder}
                    </span>

                    <div className="flex items-center gap-2">
                        {safeValue.length > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange([]);
                                }}
                                className={`p-1 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                            >
                                <X size={12} strokeWidth={3} className="text-red-500" />
                            </button>
                        )}
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-amber-500' : 'opacity-40'}`} />
                    </div>
                </div>

                {isOpen && (
                    <div className={`absolute z-[100] left-0 right-0 mt-1 py-1 rounded-[5px] border shadow-2xl animate-in fade-in zoom-in-95 duration-200
                        ${isDarkMode ? 'bg-[#1a1f2e] border-white/10 shadow-black text-white' : 'bg-white border-slate-200 shadow-slate-200/50 text-slate-800'}`}>

                        <div className={`p-2 border-b sticky top-0 z-10 ${isDarkMode ? 'border-white/5 bg-[#1a1f2e]' : 'border-slate-100 bg-white'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <button
                                    onClick={handleSelectAll}
                                    className={`flex-1 py-1.5 rounded-[3px] text-[10px] font-black uppercase tracking-tighter transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}
                                >
                                    {safeValue.length === options.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="relative">
                                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder={`Search ${label}...`}
                                    className={`w-full pl-8 pr-3 py-2 rounded-[5px] text-[11px] font-bold outline-none transition-all
                                        ${isDarkMode ? 'bg-black/20 border border-white/10 text-white focus:border-amber-500' : 'bg-white border border-slate-200 text-slate-700 focus:border-amber-500 shadow-sm'}`}
                                />
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {filteredOptions.length > 0 ? filteredOptions.map((opt, i) => {
                                const optId = opt.id !== undefined ? opt.id : opt.value;
                                const isSelected = safeValue.some(v => String(v) === String(optId));
                                return (
                                    <div
                                        key={i}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleOption(optId);
                                        }}
                                        className={`px-4 py-2.5 text-[12px] font-bold cursor-pointer transition-all flex items-center justify-between
                                            ${isSelected
                                                ? 'bg-amber-500 text-white'
                                                : isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-white border-white' : isDarkMode ? 'border-white/20' : 'border-slate-300'}`}>
                                                {isSelected && <Check size={10} className="text-amber-500" strokeWidth={4} />}
                                            </div>
                                            {opt.label || opt.name || opt.value}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="px-4 py-2.5 text-[11px] font-bold opacity-40 uppercase italic">No options available</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const handleEditClick = (item) => {
        setSelectedItemForEdit(item);
        setNewItem({
            name: item.name,
            meeting_link: item.meeting_link,
            start_time: item.start_time ? item.start_time.slice(0, 16) : '',
            duration: item.duration,
            description: item.description || '',
            class_levels: item.class_levels || (item.class_level ? [item.class_level] : []),
            centres: item.centres || [],
            programmes: Array.isArray(item.programmes) ? item.programmes : []
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();

            const payload = {
                name: newItem.name,
                meeting_link: newItem.meeting_link,
                start_time: newItem.start_time,
                duration: newItem.duration,
                description: newItem.description,
                class_levels: newItem.class_levels || [],
                centres: newItem.centres || [],
                programmes: newItem.programmes || []
            };

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
        setNewItem({ name: '', meeting_link: '', start_time: '', duration: '', description: '', class_levels: [], centres: [], programmes: [] });
    };

    // Advanced Filtered Logic
    const filteredLiveClasses = useMemo(() => {
        return liveClasses.filter(n => {
            const matchesSearch = (n.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [liveClasses, searchQuery]);

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
            <div className={`p-8 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/20">
                                    LIVE SESSIONS
                                </span>
                                <h2 className={`text-3xl font-black tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    ALL <span className="text-amber-500">Live Class</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage and schedule live classes for students.
                            </p>
                        </div>
                        <button
                            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                            className="group flex items-center gap-2 px-8 py-4 bg-green-700 hover:bg-green-800 text-white rounded-[5px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-green-700/25 active:scale-95 whitespace-nowrap"
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
                                    className={`w-full pl-14 pr-6 py-4 rounded-[5px] border-2 outline-none transition-all font-bold text-sm ${isDarkMode ? 'bg-white/1 border-white/5 focus:border-amber-500/50 text-white' : 'bg-slate-50 border-slate-100 focus:border-amber-500 focus:bg-white text-slate-900'}`}
                                />
                            </div>
                            <button
                                onClick={() => { fetchLiveClasses(); fetchMasterData(); }}
                                className={`p-3 rounded-[5px] transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-amber-500 border border-white/5' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100'}`}
                            >
                                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className={`px-4 py-2.5 rounded-[5px] font-bold text-xs ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Showing all live classes</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`rounded-[5px] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-orange-400 text-white'}`}>
                                <th className="py-5 px-6 text-center w-20">#</th>
                                <th className="py-5 px-6">Name</th>
                                <th className="py-5 px-6 text-center">Date</th>
                                <th className="py-5 px-6 text-center">Duration</th>
                                <th className="py-5 px-6 text-center">Programme</th>
                                <th className="py-5 px-6 text-center">Class</th>
                                <th className="py-5 px-6 text-center">Active Centre</th>
                                <th className="py-5 px-6 text-center">Action</th>
                                <th className="py-5 px-6 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 border-t border-white/5">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-5 px-6 text-center">
                                            <div className={`h-3 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="space-y-2">
                                                <div className={`h-4 w-48 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-2.5 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className={`h-3 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className={`h-3 w-12 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className={`h-6 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className={`h-6 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-2.5 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className={`h-9 w-9 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className={`h-9 w-9 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedItems.length > 0 ? (
                                paginatedItems.map((item, index) => (
                                    <tr key={item.id} className={`group transition-colors duration-200 ${isDarkMode ? 'hover:bg-white/1' : 'hover:bg-slate-50'}`}>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`text-xs font-black ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>{((currentPage - 1) * itemsPerPage) + index + 1}</span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm block text-amber-500 transition-colors uppercase tracking-tight">{item.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {(item.session_names && item.session_names.length > 0) ? (
                                                        <span className="text-[10px] font-bold text-amber-500/60 uppercase">{item.session_names.join(', ')}</span>
                                                    ) : item.session_name && (
                                                        <span className="text-[10px] font-bold text-amber-500/60 uppercase">{item.session_name}</span>
                                                    )}
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
                                            {Array.isArray(item.programmes) && item.programmes.length > 0 ? (
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {item.programmes.map((p, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase rounded-[5px] border border-blue-500/20">{p}</span>
                                                    ))}
                                                </div>
                                            ) : <span className="text-[9px] font-black uppercase opacity-20">-</span>}
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            {item.class_level_names && item.class_level_names.length > 0 ? (
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {item.class_level_names.map((c, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-[5px] border border-emerald-500/20">{c}</span>
                                                    ))}
                                                </div>
                                            ) : item.class_name ? (
                                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-[5px] border border-emerald-500/20">{item.class_name}</span>
                                            ) : <span className="text-[9px] font-black uppercase opacity-20">-</span>}
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            {item.centre_names && item.centre_names.length > 0 ? (
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {item.centre_names.map((c, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase rounded-[5px] border border-amber-500/20">{c}</span>
                                                    ))}
                                                </div>
                                            ) : <span className="text-[9px] font-black uppercase opacity-20">-</span>}
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex justify-center">
                                                <button onClick={() => handleEditClick(item)} className="p-2.5 rounded-[5px] text-blue-500 hover:bg-blue-500/10 transition-all">
                                                    <Edit2 size={16} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex justify-center">
                                                <button onClick={() => handleDeleteItem(item.id)} className="p-2.5 rounded-[5px] text-blue-500 hover:bg-blue-500/10 transition-all">
                                                    <Trash2 size={16} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={9} className="py-20 text-center text-slate-500 font-bold uppercase tracking-[0.2em] text-xs opacity-40 italic">No live classes matching criteria</td></tr>
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
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className={`p-2 rounded-[5px] bg-white/5 hover:bg-amber-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronsLeft size={18} strokeWidth={2.5} /></button>
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className={`p-2 rounded-[5px] bg-white/5 hover:bg-amber-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronLeft size={18} strokeWidth={2.5} /></button>
                        <div className="flex items-center gap-1 mx-4">
                            <span className="text-[10px] font-black uppercase opacity-40 tracking-tighter">Page</span>
                            <span className="px-4 py-1.5 bg-amber-500 text-white rounded-[5px] font-black text-xs shadow-lg shadow-amber-500/20">{currentPage}</span>
                            <span className="text-[10px] font-black uppercase opacity-40 tracking-tighter">of {totalPages || 1}</span>
                        </div>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className={`p-2 rounded-[5px] bg-white/5 hover:bg-amber-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronRight size={18} strokeWidth={2.5} /></button>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(totalPages)} className={`p-2 rounded-[5px] bg-white/5 hover:bg-amber-500 hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronsRight size={18} strokeWidth={2.5} /></button>
                    </div>

                    <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="Jump..."
                            value={jumpToPage}
                            onChange={(e) => setJumpToPage(e.target.value)}
                            className={`w-20 px-4 py-2 rounded-[5px] text-xs font-bold outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white focus:border-amber-500/50' : 'bg-white border-slate-200 text-slate-800 focus:border-amber-500'}`}
                        />
                        <button type="submit" className={`p-2 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-amber-500' : 'bg-amber-50 hover:bg-amber-100 text-amber-600'}`}>Go</button>
                    </form>
                </div>
            </div>

            {/* Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                    <div className={`w-full max-w-2xl rounded-[5px] border shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/10 shadow-black text-white' : 'bg-white border-slate-100 shadow-slate-200 text-slate-800'}`}>
                        <div className="p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500 rounded-[5px] text-white shadow-lg shadow-amber-500/20"><Bell size={20} /></div>
                                <h2 className="text-xl font-black uppercase tracking-tight">{isAddModalOpen ? 'Create New' : 'Edit'} <span className="text-amber-500">Live Class</span></h2>
                            </div>
                            <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }} className="p-2 hover:bg-white/10 rounded-[5px] transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={isAddModalOpen ? handleAddItem : handleUpdateItem} className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                            {/* Programme, Class Level & Active Centre MultiSelect Dropdowns */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <MultiSelect 
                                    label="Programmes" 
                                    options={[{ id: 'CRP', name: 'CRP' }, { id: 'NCRP', name: 'NCRP' }]} 
                                    value={newItem.programmes} 
                                    onChange={(val) => setNewItem({ ...newItem, programmes: val })} 
                                    placeholder="Select Programmes (CRP/NCRP)" 
                                    isDarkMode={isDarkMode}
                                />

                                <MultiSelect 
                                    label="Classes" 
                                    options={classes.map(c => ({ id: c.id, name: c.name }))} 
                                    value={newItem.class_levels} 
                                    onChange={(val) => setNewItem({ ...newItem, class_levels: val })} 
                                    placeholder="Select Classes" 
                                    isDarkMode={isDarkMode}
                                />

                                <MultiSelect 
                                    label="Active Centres" 
                                    options={centres.map(c => ({ id: c._id || c.id, name: c.name ? `${c.name} (${c.code})` : (c.code || c.id) }))} 
                                    value={newItem.centres} 
                                    onChange={(val) => setNewItem({ ...newItem, centres: val })} 
                                    placeholder="Select Active Centres" 
                                    isDarkMode={isDarkMode}
                                />
                            </div>

                            {/* Bottom Section: Content Details */}
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-6">
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>Live Class Title *</label>
                                        <input
                                            required
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                            className={`w-full px-6 py-4 rounded-[5px] outline-none border-2 font-black transition-all ${isDarkMode ? 'bg-white/2 border-white/5 focus:border-amber-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-100 focus:border-amber-500 focus:bg-white text-slate-900'}`}
                                            placeholder="Enter live class title..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>Live Link *</label>
                                            <input
                                                required
                                                type="url"
                                                value={newItem.meeting_link}
                                                onChange={(e) => setNewItem({ ...newItem, meeting_link: e.target.value })}
                                                className={`w-full px-6 py-4 rounded-[5px] outline-none border-2 font-bold transition-all ${isDarkMode ? 'bg-white/2 border-white/5 focus:border-amber-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-100 focus:border-amber-500 focus:bg-white text-slate-800'}`}
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
                                                className={`w-full px-6 py-4 rounded-[5px] outline-none border-2 font-bold transition-all ${isDarkMode ? 'bg-white/2 border-white/5 focus:border-amber-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-100 focus:border-amber-500 focus:bg-white text-slate-800'}`}
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
                                            className={`w-full px-6 py-4 rounded-[5px] outline-none border-2 font-bold transition-all ${isDarkMode ? 'bg-white/2 border-white/5 focus:border-amber-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-100 focus:border-amber-500 focus:bg-white text-slate-800'}`}
                                            placeholder="Duration in minutes"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Description (Optional)</label>
                                        <textarea
                                            value={newItem.description}
                                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            className={`w-full px-6 py-4 rounded-[5px] outline-none border-2 font-bold transition-all min-h-[100px] resize-none ${isDarkMode ? 'bg-white/2 border-white/5 focus:border-amber-500/50 focus:bg-white/5 text-white' : 'bg-slate-50 border-slate-200 focus:border-amber-500 focus:bg-white text-slate-900'}`}
                                            placeholder="Provide more context for students..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isActionLoading}
                                className={`w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-[5px] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex justify-center items-center gap-2 ${isActionLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isActionLoading ? <Loader2 className="animate-spin" size={24} /> : (isAddModalOpen ? 'Schedule Live Class' : 'Update Live Class')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default LiveClassRegistry;
