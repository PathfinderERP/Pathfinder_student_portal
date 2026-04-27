import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { FileText, Plus, Trash2, Edit2, Search, Filter, X, CheckCircle, RefreshCw, Eye, File, ChevronDown, Check, Square, CheckSquare } from 'lucide-react';

const PenPaperTestRegistry = () => {
    const { isDarkMode } = useTheme();
    const getApiUrl = useCallback(() => localStorage.getItem('apiUrl') || 'http://127.0.0.1:3001', []);

    // State Management
    const [tests, setTests] = useState([]);
    const [packages, setPackages] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [targetExams, setTargetExams] = useState([]);

    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const typeDropdownRef = useRef(null);

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

    const [newItem, setNewItem] = useState({
        name: '',
        code: '',
        duration: 180,
        test_type: 'Practice Paper',
        start_date: '',
        end_date: '',
        question_paper: null,
        solution_file: null,
        thumbnail: null,
        remove_thumbnail: false,
        pdf_link: '',
        is_active: true,
        show_solution: false,
        sessions: [],
        class_level: '',
        subject: '',
        exam_type: '',
        target_exams: [],
        is_general: false,
        packages: []
    });

    const fetchTests = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/pen-paper-tests/`);
            setTests(response.data);
        } catch (error) {
            console.error("Failed to fetch tests", error);
            toast.error("Failed to load tests");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl]);

    const fetchMasterData = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const [sessRes, classRes, subRes, etRes, teRes, pkgRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/sessions/`),
                axios.get(`${apiUrl}/api/master-data/classes/`),
                axios.get(`${apiUrl}/api/master-data/subjects/`),
                axios.get(`${apiUrl}/api/master-data/exam-types/`),
                axios.get(`${apiUrl}/api/master-data/target-exams/`),
                axios.get(`${apiUrl}/api/packages/`)
            ]);
            
            setSessions(sessRes.data.filter(s => s.is_active));
            setClasses(classRes.data);
            setSubjects(subRes.data);
            setExamTypes(etRes.data);
            setTargetExams(teRes.data);
            setPackages(pkgRes.data);
        } catch (error) {
            console.error("Failed to fetch master data", error);
        }
    }, [getApiUrl]);

    useEffect(() => {
        fetchTests();
        fetchMasterData();
    }, [fetchTests, fetchMasterData]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
                setIsTypeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

        const filteredOptions = useMemo(() => {
            if (!searchTerm) return options;
            return options.filter(opt => {
                const text = (opt.label || opt.name || opt.value || '').toLowerCase();
                return text.includes(searchTerm.toLowerCase());
            });
        }, [options, searchTerm]);

        const toggleOption = (id) => {
            const newValue = safeValue.includes(id)
                ? safeValue.filter(v => v !== id)
                : [...safeValue, id];
            onChange(newValue);
        };

        const handleSelectAll = () => {
            if (safeValue.length === options.length) {
                onChange([]);
            } else {
                onChange(options.map(opt => opt.id || opt.value));
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
                            ? `${safeValue.length} Selected` 
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
                                const isSelected = safeValue.includes(opt.id) || safeValue.includes(opt.value);
                                return (
                                    <div
                                        key={i}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleOption(opt.id || opt.value);
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

    const handleAddItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();

            if (!newItem.is_general && (!newItem.packages || newItem.packages.length === 0)) {
                toast.error("Please select at least one package");
                setIsActionLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append('name', newItem.name);
            formData.append('duration', newItem.duration);
            formData.append('test_type', newItem.test_type);
            formData.append('is_active', newItem.is_active);
            formData.append('show_solution', newItem.show_solution);
            formData.append('is_general', newItem.is_general);

            if (newItem.start_date) formData.append('start_date', newItem.start_date);
            if (newItem.end_date) formData.append('end_date', newItem.end_date);

            if (newItem.question_paper instanceof window.File) formData.append('question_paper', newItem.question_paper);
            if (newItem.solution_file instanceof window.File) formData.append('solution_file', newItem.solution_file);
            if (newItem.thumbnail instanceof window.File) formData.append('thumbnail', newItem.thumbnail);
            if (newItem.remove_thumbnail) formData.append('remove_thumbnail', 'true');

            if (newItem.is_general) {
                if (newItem.sessions && newItem.sessions.length > 0) {
                    newItem.sessions.forEach(id => formData.append('sessions', id));
                }
                if (newItem.class_level) formData.append('class_level', newItem.class_level);
                if (newItem.subject) formData.append('subject', newItem.subject);
                if (newItem.exam_type) formData.append('exam_type', newItem.exam_type);
                if (newItem.target_exams && newItem.target_exams.length > 0) {
                    newItem.target_exams.forEach(id => formData.append('target_exams', id));
                }
            } else {
                newItem.packages.forEach(id => formData.append('packages', id));
            }

            await axios.post(`${apiUrl}/api/master-data/pen-paper-tests/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Test added successfully");
            setIsAddModalOpen(false);
            resetForm();
            fetchTests();
        } catch (error) {
            console.error("Failed to add test", error);
            toast.error("Failed to add test");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();

            if (!newItem.is_general && (!newItem.packages || newItem.packages.length === 0)) {
                toast.error("Please select at least one package");
                setIsActionLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append('name', newItem.name);
            formData.append('duration', newItem.duration);
            formData.append('test_type', newItem.test_type);
            formData.append('is_active', newItem.is_active);
            formData.append('show_solution', newItem.show_solution);
            formData.append('is_general', newItem.is_general);

            if (newItem.start_date) formData.append('start_date', newItem.start_date);
            if (newItem.end_date) formData.append('end_date', newItem.end_date);

            if (newItem.question_paper instanceof window.File) formData.append('question_paper', newItem.question_paper);
            if (newItem.solution_file instanceof window.File) formData.append('solution_file', newItem.solution_file);
            if (newItem.thumbnail instanceof window.File) formData.append('thumbnail', newItem.thumbnail);
            if (newItem.remove_thumbnail) formData.append('remove_thumbnail', 'true');

            if (newItem.is_general) {
                if (newItem.sessions && newItem.sessions.length > 0) {
                    newItem.sessions.forEach(id => formData.append('sessions', id));
                } else {
                    formData.append('sessions', '');
                }
                formData.append('class_level', newItem.class_level || '');
                formData.append('subject', newItem.subject || '');
                formData.append('exam_type', newItem.exam_type || '');
                
                if (newItem.target_exams && newItem.target_exams.length > 0) {
                    newItem.target_exams.forEach(id => formData.append('target_exams', id));
                } else {
                    formData.append('target_exams', '');
                }
            } else {
                if (newItem.packages.length === 0) {
                    formData.append('packages', '');
                } else {
                    newItem.packages.forEach(id => formData.append('packages', id));
                }
            }

            await axios.patch(`${apiUrl}/api/master-data/pen-paper-tests/${selectedItemForEdit.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Test updated successfully");
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
            resetForm();
            fetchTests();
        } catch (error) {
            console.error("Failed to update test", error);
            toast.error("Failed to update test");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm("Are you sure you want to delete this test?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/pen-paper-tests/${id}/`);
            toast.success("Test deleted successfully");
            fetchTests();
        } catch (error) {
            console.error("Failed to delete test", error);
            toast.error("Failed to delete test");
        }
    };

    const handleToggleStatus = async (item, field) => {
        try {
            const apiUrl = getApiUrl();
            const updatedValue = !item[field];
            // Optimistic update
            setTests(prev => prev.map(t => t.id === item.id ? { ...t, [field]: updatedValue } : t));

            await axios.patch(`${apiUrl}/api/master-data/pen-paper-tests/${item.id}/`, { [field]: updatedValue });
            toast.success(`Updated ${field.replace('_', ' ')} successfully`);
        } catch (error) {
            console.error("Failed to toggle status", error);
            toast.error("Failed to update status");
            fetchTests(); // Revert on error
        }
    };

    const handleEditClick = (item) => {
        setSelectedItemForEdit(item);
        setNewItem({
            name: item.name,
            code: item.code,
            duration: item.duration,
            test_type: item.test_type,
            start_date: item.start_date ? item.start_date.slice(0, 16) : '',
            end_date: item.end_date ? item.end_date.slice(0, 16) : '',
            question_paper: item.question_paper, // URL
            solution_file: item.solution_file, // URL
            thumbnail: item.thumbnail, // URL
            remove_thumbnail: false,
            pdf_link: item.pdf_link,
            is_active: item.is_active,
            show_solution: item.show_solution,
            sessions: item.sessions || [],
            class_level: item.class_level || '',
            subject: item.subject || '',
            exam_type: item.exam_type || '',
            target_exams: item.target_exams || [],
            is_general: item.is_general || false,
            packages: item.packages || []
        });
        setIsEditModalOpen(true);
    };

    const resetForm = () => {
        setNewItem({
            name: '', code: '', duration: 180, test_type: 'Practice Paper',
            start_date: '', end_date: '', question_paper: null, solution_file: null, thumbnail: null, remove_thumbnail: false,
            pdf_link: '',
            is_active: true, show_solution: false,
            sessions: [], class_level: '', subject: '', exam_type: '', target_exams: [],
            is_general: false, packages: []
        });
    };

    const filteredTests = useMemo(() => {
        return tests.filter(n => {
            const matchesSearch = n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (n.code && n.code.toLowerCase().includes(searchQuery.toLowerCase()));

            // View Mode Filter
            if (viewTargeting === 'packages') {
                if (n.is_general) return false;
                if (activeFilters.package && !n.packages.includes(activeFilters.package)) return false;
            } else if (viewTargeting === 'general') {
                if (!n.is_general) return false;
                const matchesSession = !activeFilters.session || 
                    String(n.session) === String(activeFilters.session) || 
                    (n.sessions && n.sessions.some(s => String(s) === String(activeFilters.session)));
                if (!matchesSession) return false;
                if (activeFilters.class_level && n.class_level !== activeFilters.class_level) return false;
                if (activeFilters.subject && n.subject !== activeFilters.subject) return false;
                if (activeFilters.exam_type && n.exam_type !== activeFilters.exam_type) return false;
                const matchesTargetExam = activeFilters.target_exams.length === 0 || 
                    (n.target_exams && n.target_exams.some(te => activeFilters.target_exams.includes(te)));
                if (!matchesTargetExam) return false;
            }

            return matchesSearch;
        });
    }, [tests, searchQuery, activeFilters, viewTargeting]);

    const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
    const paginatedTests = filteredTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className={`min-h-screen p-8 ${isDarkMode ? 'bg-[#0f1419] text-white' : 'bg-gray-50 text-gray-900'}`}>
            <div className="max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-500/10 rounded-[5px]">
                                <FileText className="text-amber-500" size={24} />
                            </div>
                            <h1 className={`text-3xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                Pen Paper <span className="text-amber-500">Test</span>
                            </h1>
                        </div>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Manage offline tests, question papers, and solutions.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 py-3 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-sm uppercase tracking-widest rounded-[5px] shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus size={18} /> Add PenPaperTest
                    </button>
                </div>

                {/* Search & Filters */}
                <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#1a1f2e] border-white/5' : 'bg-white border-slate-200'} space-y-4`}>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Enter the name or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-12 pr-4 py-3 rounded-[5px] border-2 outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#0f1419] border-white/5 text-white focus:border-amber-500/50' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'}`}
                            />
                        </div>
                        <button
                            onClick={fetchTests}
                            className={`p-3 rounded-[5px] border-2 transition-all ${isDarkMode ? 'bg-[#0f1419] border-white/5 hover:border-amber-500/50' : 'bg-slate-50 border-slate-200 hover:border-amber-500'}`}
                        >
                            <RefreshCw size={18} className="text-amber-500" />
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className={`p-1 rounded-[5px] flex items-center gap-1 border transition-all ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                            <span className="px-2 text-[10px] font-black uppercase tracking-widest opacity-50">Targeting:</span>
                            <button onClick={() => setViewTargeting('all')} className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-wide transition-all ${viewTargeting === 'all' ? 'bg-amber-500 text-white shadow-lg' : 'opacity-60 hover:opacity-100'}`}>All</button>
                            <button onClick={() => setViewTargeting('packages')} className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-wide transition-all ${viewTargeting === 'packages' ? 'bg-amber-500 text-white shadow-lg' : 'opacity-60 hover:opacity-100'}`}>Packages</button>
                            <button onClick={() => setViewTargeting('general')} className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-wide transition-all ${viewTargeting === 'general' ? 'bg-amber-500 text-white shadow-lg' : 'opacity-60 hover:opacity-100'}`}>General</button>
                        </div>

                        {/* Dynamic Filters similar to VideoRegistry */}
                        {viewTargeting === 'packages' ? (
                            <select
                                value={activeFilters.package}
                                onChange={(e) => setActiveFilters({ ...activeFilters, package: e.target.value })}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-slate-50 text-slate-700'}`}
                            >
                                <option value="">All Packages</option>
                                {packages.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                        ) : viewTargeting === 'general' && (
                            <div className="flex flex-wrap items-center gap-3">
                                <MultiSelect
                                    label="Target Exam"
                                    options={targetExams}
                                    value={activeFilters.target_exams}
                                    placeholder="All Target Exams"
                                    isDarkMode={isDarkMode}
                                    onChange={(val) => setActiveFilters({ ...activeFilters, target_exams: val })}
                                    className="min-w-[180px]"
                                />
                            </div>
                        )}

                        {(activeFilters.session || activeFilters.package || activeFilters.target_exam) && (
                            <button onClick={() => setActiveFilters({ session: '', class_level: '', subject: '', exam_type: '', target_exam: '', section: '', package: '' })} className="px-4 py-2.5 rounded-[5px] font-bold text-[10px] uppercase tracking-widest text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all">Clear Filters</button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className={`rounded-[5px] border overflow-hidden ${isDarkMode ? 'bg-[#1a1f2e] border-white/5' : 'bg-white border-slate-200'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={`${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                                <tr>
                                    <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest opacity-60">#</th>
                                    <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest opacity-60">Name</th>
                                    <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest opacity-60">Code</th>
                                    <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">Duration (min)</th>
                                    <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">Exam Tag</th>
                                    <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">Section</th>
                                    <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">Test Type</th>
                                    <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">Active</th>
                                    <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">Show Solution</th>
                                    <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">Targeting</th>
                                    <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">PDF</th>
                                    <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="py-5 px-6"><div className={`h-4 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-5 px-6"><div className={`h-4 w-48 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-5 px-6"><div className={`h-3 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-5 px-6"><div className={`h-4 w-12 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-5 px-6 text-center"><div className={`h-4 w-20 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-5 px-6 text-center"><div className={`h-3 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-5 px-6 text-center"><div className={`h-3 w-20 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-5 px-6 text-center"><div className={`h-5 w-10 mx-auto rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-5 px-6 text-center"><div className={`h-5 w-10 mx-auto rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-5 px-6 text-center">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <div className={`h-3 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                    <div className={`h-3 w-12 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center"><div className={`h-7 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-5 px-6 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <div className={`h-8 w-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                    <div className={`h-8 w-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : paginatedTests.map((item, index) => (
                                    <tr key={item.id} className={`border-t ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                                        <td className="py-5 px-6 text-sm font-bold">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold block text-amber-500 uppercase tracking-tight">{item.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {(item.session_names && item.session_names.length > 0) ? (
                                                        <span className="text-[10px] font-bold text-amber-500/60 uppercase">{item.session_names.join(', ')}</span>
                                                    ) : item.session_name && (
                                                        <span className="text-[10px] font-bold text-amber-500/60 uppercase">{item.session_name}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center text-xs opacity-70">{item.test_type}</td>

                                        {/* Status Toggles */}
                                        <td className="py-5 px-6 text-center">
                                            <div
                                                onClick={() => handleToggleStatus(item, 'is_active')}
                                                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors mx-auto ${item.is_active ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${item.is_active ? 'translate-x-5' : ''}`} />
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div
                                                onClick={() => handleToggleStatus(item, 'show_solution')}
                                                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors mx-auto ${item.show_solution ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${item.show_solution ? 'translate-x-5' : ''}`} />
                                            </div>
                                        </td>

                                        <td className="py-5 px-6 text-center text-xs opacity-70 max-w-[200px] truncate">
                                            {item.is_general ? (
                                                <div className="flex flex-wrap justify-center gap-1 max-w-[200px] mx-auto">
                                                    {(item.section_names || []).length > 0 ? (
                                                        item.section_names.map((name, i) => (
                                                            <span key={i} className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[10px] whitespace-nowrap">{name}</span>
                                                        ))
                                                    ) : <span className="opacity-30">All Sections</span>}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    {item.package_names?.slice(0, 2).map((p, i) => (
                                                        <span key={i} className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded inline-block">{p}</span>
                                                    ))}
                                                    {item.package_names?.length > 2 && <span className="text-[10px] opacity-50">+{item.package_names.length - 2} more</span>}
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-5 px-6 text-center">
                                            {(item.question_paper || item.pdf_link) ? (
                                                <a href={item.question_paper || item.pdf_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[5px] border border-blue-500/30 text-blue-500 hover:bg-blue-500 hover:text-white transition-all text-xs font-bold uppercase">
                                                    <Eye size={12} /> View
                                                </a>
                                            ) : <span className="opacity-30">-</span>}
                                        </td>

                                        <td className="py-5 px-6">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditClick(item)} className="p-2 rounded-[5px] bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDeleteClick(item.id)} className="p-2 rounded-[5px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 0 && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className={`text-sm font-bold opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTests.length)} of {filteredTests.length} entries
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Rows per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                    className={`px-3 py-2 rounded-[5px] font-bold text-sm outline-none border-2 cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/5 text-white hover:border-amber-500/50' : 'bg-white border-slate-200 text-slate-700 hover:border-amber-500'}`}
                                >
                                    {[5, 10, 20, 50, 100].map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-amber-500 hover:text-white'} ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-white text-slate-700'}`}
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className={`px-4 py-2 rounded-[5px] font-bold text-sm transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-amber-500 hover:text-white'} ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-white text-slate-700'}`}
                                >
                                    Previous
                                </button>

                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Page</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={jumpToPage}
                                        onChange={(e) => setJumpToPage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const page = parseInt(jumpToPage);
                                                if (page >= 1 && page <= totalPages) {
                                                    setCurrentPage(page);
                                                    setJumpToPage('');
                                                }
                                            }
                                        }}
                                        placeholder={currentPage.toString()}
                                        className={`w-12 px-2 py-1 rounded-[5px] text-center font-bold text-sm outline-none border-2 transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/5 text-white focus:border-amber-500' : 'bg-white border-slate-200 text-slate-700 focus:border-amber-500'}`}
                                    />
                                    <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>of {totalPages}</span>
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`px-4 py-2 rounded-[5px] font-bold text-sm transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-amber-500 hover:text-white'} ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-white text-slate-700'}`}
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-[5px] transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-amber-500 hover:text-white'} ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-white text-slate-700'}`}
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[5px] border ${isDarkMode ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200'} shadow-2xl`}>
                        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${isDarkMode ? 'bg-[#1a1f2e] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                            <h2 className="text-2xl font-black uppercase tracking-tight">{isEditModalOpen ? 'Edit' : 'Add'} <span className="text-amber-500">Test</span></h2>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }} className="p-2 rounded-[5px] hover:bg-red-500/10 text-red-500 transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={isEditModalOpen ? handleUpdateItem : handleAddItem} className="p-6 space-y-6">

                            {/* Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500'} mb-2 ml-1`}>Date and Time:</label>
                                    <input type="datetime-local" value={newItem.start_date} onChange={(e) => setNewItem({ ...newItem, start_date: e.target.value })} className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-sm ${isDarkMode ? 'bg-[#0f1419] border-white/5 text-white' : 'bg-white border-slate-200'}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500'} mb-2 ml-1`}>Last joining Date and Time:</label>
                                    <input type="datetime-local" value={newItem.end_date} onChange={(e) => setNewItem({ ...newItem, end_date: e.target.value })} className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-sm ${isDarkMode ? 'bg-[#0f1419] border-white/5 text-white' : 'bg-white border-slate-200'}`} />
                                </div>
                            </div>

                            {/* Targeting */}
                            <div className="flex items-center gap-4 p-4 rounded-[5px] bg-slate-100 dark:bg-white/5">
                                <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'opacity-60' : 'text-slate-500'}`}>Targeting Type:</span>
                                <div className="flex bg-white dark:bg-black/20 p-1 rounded-[5px]">
                                    <button type="button" onClick={() => setNewItem({ ...newItem, is_general: false })} className={`px-4 py-2 rounded-[5px] text-xs font-bold transition-all ${!newItem.is_general ? 'bg-amber-500 text-white shadow-lg' : 'opacity-40'}`}>Packages</button>
                                    <button type="button" onClick={() => setNewItem({ ...newItem, is_general: true })} className={`px-4 py-2 rounded-[5px] text-xs font-bold transition-all ${newItem.is_general ? 'bg-amber-500 text-white shadow-lg' : 'opacity-40'}`}>General</button>
                                </div>
                            </div>

                            {/* Package Selection */}
                            {!newItem.is_general ? (
                                <div className="space-y-3">
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500'} ml-1`}>Select Packages *</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto custom-scrollbar p-2 rounded-[5px] border border-dashed border-slate-300 dark:border-white/10">
                                        {packages.map(pkg => (
                                            <label key={pkg._id} className={`flex items-center gap-3 p-3 rounded-[5px] border transition-all cursor-pointer ${newItem.packages.includes(pkg._id) ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-white dark:bg-white/5 border-transparent'}`}>
                                                <input type="checkbox" checked={newItem.packages.includes(pkg._id)} onChange={(e) => {
                                                    if (e.target.checked) setNewItem(prev => ({ ...prev, packages: [...prev.packages, pkg._id] }));
                                                    else setNewItem(prev => ({ ...prev, packages: prev.packages.filter(id => id !== pkg._id) }));
                                                }} className="accent-amber-500 w-4 h-4" />
                                                <span className="text-xs font-bold">{pkg.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                /* Master Data Dropdowns */
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="space-y-1.5">
                                        <MultiSelect 
                                            label="Sessions" 
                                            options={sessions} 
                                            value={newItem.sessions} 
                                            onChange={(val) => setNewItem({ ...newItem, sessions: val })} 
                                            placeholder="Select Sessions" 
                                            isDarkMode={isDarkMode}
                                        />
                                    </div>
                                    {[
                                        { label: 'Class', field: 'class_level', options: classes },
                                        { label: 'Subject', field: 'subject', options: subjects },
                                        { label: 'Exam Type', field: 'exam_type', options: examTypes }
                                    ].map(meta => (
                                        <div key={meta.field}>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500'} mb-2 ml-1`}>{meta.label}</label>
                                            <select
                                                value={newItem[meta.field]}
                                                onChange={(e) => setNewItem({ ...newItem, [meta.field]: e.target.value })}
                                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                                className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-xs transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/5 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                            >
                                                <option value="">Select {meta.label}</option>
                                                {meta.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                    <div className="space-y-1.5">
                                        <MultiSelect 
                                            label="Target Exams" 
                                            options={targetExams} 
                                            value={newItem.target_exams} 
                                            onChange={(val) => setNewItem({ ...newItem, target_exams: val })} 
                                            placeholder="Select Target Exams" 
                                            isDarkMode={isDarkMode}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Core Details */}
                            <div className="space-y-5">
                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500'} mb-2 ml-1`}>PenPaper Test Name *</label>
                                    <input required type="text" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-sm ${isDarkMode ? 'bg-[#0f1419] border-white/5 text-white' : 'bg-white border-slate-200'}`} placeholder="e.g. NEET Mock Test 01" />
                                </div>
                                {/* Duration */}
                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500'} mb-2 ml-1`}>Duration (minutes) *</label>
                                    <input required type="number" value={newItem.duration} onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })} className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-sm ${isDarkMode ? 'bg-[#0f1419] border-white/5 text-white' : 'bg-white border-slate-200'}`} />
                                </div>
                                <div className="relative" ref={typeDropdownRef}>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500'} mb-2 ml-1`}>Test Type</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                        className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-sm transition-all text-left flex items-center justify-between ${isDarkMode
                                            ? 'bg-[#0f1419] border-white/5 text-white focus:border-amber-500/50'
                                            : 'bg-white border-slate-200 text-slate-800'
                                            }`}
                                    >
                                        <span>{newItem.test_type}</span>
                                        <ChevronDown size={18} className={`transition-transform duration-300 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isTypeDropdownOpen && (
                                        <div className={`absolute top-full left-0 right-0 z-[120] mt-2 rounded-[5px] border shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300 ${isDarkMode
                                            ? 'bg-[#1e293b] border-white/10 shadow-black'
                                            : 'bg-white border-slate-100 shadow-slate-200'
                                            }`}>
                                            <div className="p-2 space-y-1">
                                                {['Practice Paper', 'Mock Test', 'Previous Year Paper'].map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewItem({ ...newItem, test_type: type });
                                                            setIsTypeDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 rounded-[5px] font-bold text-xs transition-all ${newItem.test_type === type
                                                            ? 'bg-amber-500 text-white'
                                                            : isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50'
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

                            {/* Files */}
                            <div className="space-y-6 pt-4 border-t border-dashed border-slate-200 dark:border-white/10">
                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500'} mb-2 ml-1`}>Question Paper (PDF only)</label>
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setNewItem({ ...newItem, question_paper: e.target.files[0] })}
                                            className={`block w-full text-sm rounded-[5px] border p-2 ${isDarkMode ? 'bg-[#0f1419] border-white/5 text-slate-300 file:bg-white/10 file:text-white file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded-[5px] file:text-xs file:font-bold hover:file:bg-white/20' : 'bg-white border-slate-200 text-slate-500 file:bg-slate-100 file:text-slate-700 file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded-[5px] file:text-xs file:font-bold hover:file:bg-slate-200'} transition-all cursor-pointer`}
                                        />
                                        {newItem.question_paper && typeof newItem.question_paper === 'string' && (
                                            <a href={newItem.question_paper} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-bold text-blue-500 hover:underline px-2">
                                                <Eye size={12} /> View Current Paper
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500'} mb-2 ml-1`}>Solution (PDF only)</label>
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setNewItem({ ...newItem, solution_file: e.target.files[0] })}
                                            className={`block w-full text-sm rounded-[5px] border p-2 ${isDarkMode ? 'bg-[#0f1419] border-white/5 text-slate-300 file:bg-white/10 file:text-white file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded-[5px] file:text-xs file:font-bold hover:file:bg-white/20' : 'bg-white border-slate-200 text-slate-500 file:bg-slate-100 file:text-slate-700 file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded-[5px] file:text-xs file:font-bold hover:file:bg-slate-200'} transition-all cursor-pointer`}
                                        />
                                        {newItem.solution_file && typeof newItem.solution_file === 'string' && (
                                            <a href={newItem.solution_file} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-bold text-blue-500 hover:underline px-2">
                                                <Eye size={12} /> View Current Solution
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500'} mb-2 ml-1`}>Thumbnail Image (Optional)</label>
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setNewItem({ ...newItem, thumbnail: e.target.files[0] })}
                                            className={`block w-full text-sm rounded-[5px] border p-2 ${isDarkMode ? 'bg-[#0f1419] border-white/5 text-slate-300 file:bg-white/10 file:text-white file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded-[5px] file:text-xs file:font-bold hover:file:bg-white/20' : 'bg-white border-slate-200 text-slate-500 file:bg-slate-100 file:text-slate-700 file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded-[5px] file:text-xs file:font-bold hover:file:bg-slate-200'} transition-all cursor-pointer`}
                                        />
                                        {newItem.thumbnail && typeof newItem.thumbnail === 'string' && (
                                            <div className="flex items-center gap-4 px-2">
                                                <img src={newItem.thumbnail} alt="Thumbnail Preview" className="h-20 w-auto rounded-[5px] border border-slate-200 dark:border-white/10 object-cover" />
                                                <button type="button" onClick={() => setNewItem({ ...newItem, thumbnail: null, remove_thumbnail: true })} className="px-3 py-1.5 rounded-[5px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-bold uppercase">
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-3 rounded-[5px] font-bold text-sm uppercase bg-slate-500/10 text-slate-500">Cancel</button>
                                <button type="submit" disabled={isActionLoading} className="px-6 py-3 rounded-[5px] font-bold text-sm uppercase bg-linear-to-r from-emerald-500 to-emerald-600 text-white shadow-lg">{isActionLoading ? 'Saving...' : 'Save Test'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PenPaperTestRegistry;
