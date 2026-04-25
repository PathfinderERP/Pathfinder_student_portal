import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import {
    FileText, Plus, Search, Edit2, Trash2, Filter, Loader2, Eye,
    Database, X, Check, ChevronDown, RefreshCw, Layers, Clock, ToggleLeft, ToggleRight,
    Bold, Italic, Underline, Type, Quote, Code, List, Superscript, Subscript, AlignLeft,
    AlignCenter, Link, Image, Sigma, Calculator, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import SmartEditor from '../components/SmartEditor';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import TestSectionManager from './sections/TestSectionManager';
import TestQuestionManager from './questions/TestQuestionManager';
import QuestionPaperView from './questions/QuestionPaperView';

// Custom Searchable Dropdown Component
const SearchableSelect = ({
    options = [],
    value,
    onChange,
    placeholder = "Select Option",
    isMulti = false,
    isDarkMode,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        return (options || []).filter(opt =>
            opt && opt.name && opt.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    const selectedOptions = useMemo(() => {
        if (isMulti) return Array.isArray(value) ? value.map(String) : [];
        return value ? [String(value)] : [];
    }, [value, isMulti]);

    const handleSelect = (id) => {
        if (disabled) return;
        const idStr = String(id);
        if (isMulti) {
            const newValue = selectedOptions.includes(idStr)
                ? selectedOptions.filter(v => v !== idStr)
                : [...selectedOptions, idStr];
            onChange(newValue);
        } else {
            onChange(id);
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    const getDisplayValue = () => {
        if (isMulti) {
            if (selectedOptions.length === 0) return placeholder;
            if (selectedOptions.length === 1) {
                const opt = options.find(o => String(o.id) === selectedOptions[0]);
                return opt ? opt.name : placeholder;
            }
            if (disabled) {
                return options.filter(o => selectedOptions.includes(String(o.id))).map(o => o.name).join(', ');
            }
            return `${selectedOptions.length} Selected`;
        } else {
            const opt = options.find(o => String(o.id) === String(value));
            return opt ? opt.name : placeholder;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm flex items-center justify-between cursor-pointer transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} ${disabled ? 'border-orange-500/20' : ''}`}
            >
                <span className="truncate">{getDisplayValue()}</span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className={`absolute z-200 mt-2 w-full p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1F2533] border-white/10' : 'bg-white border-slate-200'}`}>
                    {disabled && <div className="px-3 py-1 mb-2 text-[8px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 rounded-full w-fit">Read Only View</div>}
                    <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10 space-y-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-8 pr-2 py-2 rounded-[3px] text-xs outline-none ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'}`}
                            />
                        </div>
                        {isMulti && filteredOptions.length > 0 && !disabled && (
                            <div className="flex items-center gap-2 px-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const allIds = filteredOptions.map(opt => String(opt.id));
                                        const uniqueNewIds = Array.from(new Set([...selectedOptions, ...allIds]));
                                        onChange(uniqueNewIds);
                                    }}
                                    className={`flex-1 py-1.5 rounded-[3px] text-[9px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const filteredIds = filteredOptions.map(opt => String(opt.id));
                                        const remainingIds = selectedOptions.filter(id => !filteredIds.includes(id));
                                        onChange(remainingIds);
                                    }}
                                    className={`flex-1 py-1.5 rounded-[3px] text-[9px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">No results found</div>
                        ) : (
                            filteredOptions.map(opt => {
                                const idStr = String(opt.id);
                                const isSelected = selectedOptions.includes(idStr);
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={disabled ? undefined : () => handleSelect(opt.id)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-xs font-bold transition-all mb-1 ${disabled ? 'cursor-default' : 'cursor-pointer'} ${isSelected
                                            ? (isDarkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600')
                                            : (isDarkMode ? `text-slate-400 ${disabled ? '' : 'hover:bg-white/5'}` : `text-slate-600 ${disabled ? '' : 'hover:bg-slate-50'}`)}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected
                                            ? 'bg-orange-500 border-orange-500'
                                            : (isDarkMode ? 'border-white/20' : 'border-slate-300')}`}
                                        >
                                            {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                                        </div>
                                        <span className="flex-1 truncate">{opt.name}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper component for live math preview
const MathPreview = ({ tex, isDarkMode }) => {
    const containerRef = React.useRef();

    React.useEffect(() => {
        if (containerRef.current && tex) {
            try {
                katex.render(tex, containerRef.current, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (err) {
                containerRef.current.innerHTML = '<span style="color: #ef4444; font-size: 10px;">Invalid LaTeX</span>';
            }
        } else if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }
    }, [tex, isDarkMode]);

    return (
        <div
            ref={containerRef}
            className={`min-h-[60px] flex items-center justify-center p-4 rounded-[5px] border transition-all ${isDarkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
        />
    );
};

const TestCreate = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debouncedSearchRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState(null);

    // Master data caching
    const masterDataCacheRef = useRef({});
    const masterDataTimestampRef = useRef(null);
    const MASTER_DATA_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

    // Master Data for Dropdowns
    const [sessions, setSessions] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [classes, setClasses] = useState([]);
    const [targetExams, setTargetExams] = useState([]);
    const [examDetails, setExamDetails] = useState([]);

    // Filter State
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'pending'
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedItem, setSelectedItem] = useState(null);

    const [activeView, setActiveView] = useState('test-list');
    const [managementTest, setManagementTest] = useState(null);
    const [initialSectionId, setInitialSectionId] = useState(null);

    const [formValues, setFormValues] = useState({
        name: '',
        code: '',
        session: '',
        target_exams: [],
        exam_type: '',
        class_level: '',
        duration: 180,
        description: '',
        instructions: '',
        is_completed: false,
        has_calculator: false,
        option_type_numeric: false
    });

    const getAuthConfig = useCallback(() => {
        const activeToken = token || localStorage.getItem('auth_token');
        return activeToken ? { headers: { 'Authorization': `Bearer ${activeToken}` } } : {};
    }, [token]);

    // Fetch master data with caching
    const fetchMasterData = useCallback(async () => {
        const now = Date.now();

        if (masterDataCacheRef.current &&
            masterDataTimestampRef.current &&
            (now - masterDataTimestampRef.current) < MASTER_DATA_CACHE_TTL &&
            Object.keys(masterDataCacheRef.current).length > 0) {
            const cached = masterDataCacheRef.current;
            setSessions(cached.sessions || []);
            setExamTypes(cached.examTypes || []);
            setClasses(cached.classes || []);
            setTargetExams(cached.targetExams || []);
            setExamDetails(cached.examDetails || []);
            return;
        }

        const config = getAuthConfig();
        if (!config.headers) return;

        try {
            const apiUrl = getApiUrl();
            const [sessRes, typeRes, classRes, targetRes, detailRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/sessions/`, config),
                axios.get(`${apiUrl}/api/master-data/exam-types/`, config),
                axios.get(`${apiUrl}/api/master-data/classes/`, config),
                axios.get(`${apiUrl}/api/master-data/target-exams/`, config),
                axios.get(`${apiUrl}/api/master-data/exam-details/`, config)
            ]);

            masterDataCacheRef.current = {
                sessions: sessRes.data,
                examTypes: typeRes.data,
                classes: classRes.data,
                targetExams: targetRes.data,
                examDetails: detailRes.data
            };
            masterDataTimestampRef.current = now;

            setSessions(sessRes.data);
            setExamTypes(typeRes.data);
            setClasses(classRes.data);
            setTargetExams(targetRes.data);
            setExamDetails(detailRes.data);
        } catch (err) {
            console.error('Failed to fetch master data:', err);
        }
    }, [getAuthConfig, getApiUrl]);

    // Helper to process and upload Base64 images from HTML content before saving to DB
    const processEditorImages = async (html) => {
        if (!html || !html.includes('data:image')) return html;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const imgs = tempDiv.getElementsByTagName('img');

        const config = getAuthConfig();
        const apiUrl = getApiUrl();
        if (!config || !config.headers) return html;

        const uploadPromises = Array.from(imgs).map(async (img) => {
            const src = img.getAttribute('src');
            if (src && src.startsWith('data:image')) {
                try {
                    // Convert Base64 to Blob
                    const res = await fetch(src);
                    const blob = await res.blob();
                    const file = new File([blob], "test_instruction_image.png", { type: blob.type });

                    const formData = new FormData();
                    formData.append('image', file);
                    if (formValues.class_level) formData.append('class_level', formValues.class_level);
                    if (formValues.exam_type) formData.append('exam_type', formValues.exam_type);

                    const uploadRes = await axios.post(`${apiUrl}/api/questions/images/`, formData, {
                        headers: { ...config.headers, 'Content-Type': 'multipart/form-data' }
                    });
                    img.setAttribute('src', uploadRes.data.image);
                } catch (err) {
                    console.error("Sync: Failed to upload image", err);
                }
            }
        });

        await Promise.all(uploadPromises);
        return tempDiv.innerHTML;
    };



    const fetchData = useCallback(async (force = false) => {
        if (!force && data.length > 0) return;
        setIsLoading(true);
        setError(null);
        try {
            const apiUrl = getApiUrl();
            const config = getAuthConfig();
            const response = await axios.get(`${apiUrl}/api/tests/`, config);
            setData(Array.isArray(response.data) ? response.data : (response.data.results || []));

            // Use cached master data instead of repeated API calls
            await fetchMasterData();
        } catch (err) {
            console.error('Failed to fetch test data:', err);
            setError('Failed to load test management data.');
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, getAuthConfig, fetchMasterData]);

    // Handle debounced search
    useEffect(() => {
        if (debouncedSearchRef.current) {
            clearTimeout(debouncedSearchRef.current);
        }

        debouncedSearchRef.current = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);

        return () => {
            if (debouncedSearchRef.current) {
                clearTimeout(debouncedSearchRef.current);
            }
        };
    }, [searchTerm]);

    // Pre-load master data on mount
    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreate = () => {
        setModalMode('create');
        setSelectedItem(null);
        setFormValues({
            name: '',
            code: '',
            session: sessions[0]?.id || '',
            target_exams: [],
            exam_type: '',
            class_level: classes[0]?.id || '',
            duration: 180,
            description: '',
            instructions: '',
            is_completed: false,
            has_calculator: false,
            option_type_numeric: false
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setModalMode('edit');
        setSelectedItem(item);
        setFormValues({
            name: item.name,
            code: item.code,
            session: item.session || '',
            target_exams: item.target_exams || [],
            exam_type: item.exam_type || '',
            class_level: item.class_level || '',
            duration: item.duration,
            description: item.description || '',
            instructions: item.instructions || '',
            is_completed: item.is_completed,
            has_calculator: item.has_calculator || false,
            option_type_numeric: item.option_type_numeric || false
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this test?')) return;
        setIsActionLoading(true);

        // Optimistic delete
        setData(prev => prev.filter(item => item.id !== id));

        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/tests/${id}/`, getAuthConfig());
        } catch (err) {
            alert('Failed to delete test');
            fetchData(true); // Revert on error
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleStatus = async (item) => {
        setIsActionLoading(true);

        // Optimistic toggle
        setData(prev => prev.map(d => d.id === item.id ? { ...d, is_completed: !d.is_completed } : d));

        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/tests/${item.id}/`,
                { is_completed: !item.is_completed },
                getAuthConfig()
            );
        } catch (err) {
            alert('Failed to update status');
            fetchData(true); // Revert on error
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const config = getAuthConfig();

            // Sync images from instructions/description to cloud before saving
            const cleanInstructions = await processEditorImages(formValues.instructions);
            const cleanDescription = await processEditorImages(formValues.description);
            const finalPayload = { ...formValues, instructions: cleanInstructions, description: cleanDescription };

            if (modalMode === 'create') {
                const result = await axios.post(`${apiUrl}/api/tests/`, finalPayload, config);
                // Optimistic add
                setData(prev => [result.data, ...prev]);
            } else {
                const result = await axios.patch(`${apiUrl}/api/tests/${selectedItem.id}/`, finalPayload, config);
                // Optimistic update
                setData(prev => prev.map(d => d.id === selectedItem.id ? result.data : d));
            }
            setIsModalOpen(false);
        } catch (err) {
            alert(`Failed to ${modalMode} test: ` + (err.response?.data?.code || err.message));
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredRecords = useMemo(() => {
        return data.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                item.code.toLowerCase().includes(debouncedSearch.toLowerCase());

            let matchesStatus = true;
            if (statusFilter === 'completed') matchesStatus = item.is_completed === true;
            if (statusFilter === 'pending') matchesStatus = item.is_completed === false;

            return matchesSearch && matchesStatus;
        });
    }, [data, debouncedSearch, statusFilter]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, statusFilter]);

    const pageCount = Math.ceil(filteredRecords.length / itemsPerPage);
    const currentRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const renderHeader = () => (
        <div className={`p-8 rounded-[5px] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                        Test <span className="text-orange-500">Management</span>
                    </h2>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Create and configure entrance and academic tests.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className={`p-3 rounded-[5px] border transition-all hover:scale-110 active:rotate-180 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
                    >
                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderContent = () => (
        <div className={`p-8 rounded-[5px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex flex-wrap items-center gap-4 mb-8">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name or code (500ms debounce)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`pl-10 pr-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-4 w-64 ${isDarkMode ? 'bg-white/5 border-white/10 focus:ring-blue-500/10' : 'bg-slate-50 border-slate-200 focus:ring-blue-500/5'}`}
                    />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        <Filter size={16} />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`px-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-4 ${isDarkMode ? 'bg-[#10141D] border-white/10 focus:ring-orange-500/10' : 'bg-white border-slate-200 focus:ring-orange-500/5'}`}
                    >
                        <option value="all" className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>Every Test</option>
                        <option value="completed" className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>Completed Only</option>
                        <option value="pending" className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>Pending Only</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead>
                        <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                            <th className="pb-4 px-4 font-black">#</th>
                            <th className="pb-4 px-4 font-black">Test Name</th>
                            <th className="pb-4 px-4 font-black">Test Code</th>
                            <th className="pb-4 px-4 font-black text-center">Duration</th>
                            <th className="pb-4 px-4 font-black text-center">Completed</th>
                            <th className="pb-4 px-4 font-black text-center">Question Paper</th>
                            <th className="pb-4 px-4 font-black text-center">Question Sections</th>
                            <th className="pb-4 px-4 font-black text-center">Questions</th>
                            <th className="pb-4 px-4 text-right font-black">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-transparent">
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="py-5 px-4"><div className={`h-4 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    <td className="py-5 px-4">
                                        <div className="space-y-2">
                                            <div className={`h-4 w-48 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            <div className={`h-3 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    <td className="py-5 px-4 text-center"><div className={`h-4 w-12 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    <td className="py-5 px-4 text-center"><div className={`h-6 w-12 mx-auto rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    <td className="py-5 px-4 text-center"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    <td className="py-5 px-4 text-center"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    <td className="py-5 px-4 text-center"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    <td className="py-5 px-4 text-right"><div className={`h-8 w-16 ml-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                </tr>
                            ))
                        ) : (
                            currentRecords.map((item, index) => (
                                <tr key={item.id} className={`group ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-slate-200/50'} transition-colors`}>
                                    <td className="py-5 px-4 font-bold text-xs opacity-50">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="py-5 px-4">
                                        <div className="flex flex-col">
                                            <span className="font-extrabold text-sm mb-1">{item.name}</span>
                                            <span className="text-[10px] opacity-40 font-bold uppercase tracking-wider">
                                                {item.session_details?.name} • {item.class_level_details?.name} • {Array.isArray(item.target_exam_details) ? (item.target_exam_details.length > 3 ? `${item.target_exam_details.slice(0, 3).map(te => te.name).join(', ')} + ${item.target_exam_details.length - 3} test` : item.target_exam_details.map(te => te.name).join(', ')) : (item.target_exam_details?.name || '-')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                            {item.code}
                                        </span>
                                    </td>
                                    <td className="py-5 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5 font-black text-xs">
                                            <Clock size={14} className="text-orange-500" />
                                            {item.duration}m
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleToggleStatus(item)}
                                                className="relative transition-all active:scale-95 group"
                                            >
                                                <div className={`w-11 h-6 rounded-full transition-all duration-500 ${Boolean(item.is_completed) ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-200'}`}>
                                                    <div className={`absolute top-1 left-1 bg-white h-4 w-4 rounded-full shadow-sm transition-transform duration-500 ${Boolean(item.is_completed) ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </div>
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => {
                                                    setManagementTest(item);
                                                    setActiveView('question-paper');
                                                }}
                                                className="px-4 py-1.5 rounded-[5px] bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-orange-700 shadow-lg shadow-orange-600/30"
                                            >
                                                QUESTIONPAPER
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4 text-center">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => {
                                                    setManagementTest(item);
                                                    setActiveView('section-management');
                                                }}
                                                className="px-4 py-1.5 rounded-[5px] bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-blue-700 shadow-lg shadow-blue-600/30"
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => {
                                                    setManagementTest(item);
                                                    setActiveView('question-management');
                                                }}
                                                className="px-4 py-1.5 rounded-[5px] bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-emerald-700 shadow-lg shadow-emerald-600/30"
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4 text-right">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className={`p-2.5 rounded-[5px] transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-orange-500 hover:bg-orange-500/10' : 'bg-slate-100 text-slate-500 hover:text-orange-600 hover:bg-orange-50'}`}
                                            title="View Details & Allotment"
                                        >
                                            <Eye size={18} strokeWidth={2.5} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {filteredRecords.length > 0 && (
                <div className={`px-8 py-5 border-t flex flex-col sm:flex-row justify-between items-center gap-6 mt-6 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Rows per page:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className={`bg-transparent text-xs font-black outline-none cursor-pointer ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                            >
                                {[5, 10, 20, 50].map(val => <option key={val} value={val} className={isDarkMode ? 'bg-[#0F131A]' : 'bg-white'}>{val}</option>)}
                            </select>
                        </div>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Showing <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{(currentPage - 1) * itemsPerPage + 1}</span> to <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> of <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{filteredRecords.length}</span> results
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className={`px-3 py-2 rounded-[5px] text-[10px] font-black uppercase transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                        >
                            First
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                                let pageNum;
                                if (pageCount <= 5) pageNum = i + 1;
                                else if (currentPage <= 3) pageNum = i + 1;
                                else if (currentPage >= pageCount - 2) pageNum = pageCount - 4 + i;
                                else pageNum = currentPage - 2 + i;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-[5px] text-xs font-black transition-all ${currentPage === pageNum ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : `hover:bg-orange-500/10 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                            disabled={currentPage === pageCount}
                            className={`p-2 rounded-[5px] transition-all ${currentPage === pageCount ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(pageCount)}
                            disabled={currentPage === pageCount}
                            className={`px-3 py-2 rounded-[5px] text-[10px] font-black uppercase transition-all ${currentPage === pageCount ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                        >
                            Last
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    // Auto-populate Code, Duration, and Marks based on Selected Exam Title (Name)
    useEffect(() => {
        if (formValues.name) {
            const match = examDetails.find(d =>
                d.name === formValues.name &&
                String(d.session) === String(formValues.session) &&
                String(d.class_level) === String(formValues.class_level) &&
                (Array.isArray(d.target_exams) && formValues.target_exams.length > 0
                    ? d.target_exams.some(te => formValues.target_exams.includes(String(te)))
                    : true) &&
                String(d.exam_type) === String(formValues.exam_type)
            );
            if (match) {
                setFormValues(prev => ({
                    ...prev,
                    code: match.code || prev.code,
                    duration: match.duration || prev.duration,
                    has_calculator: match.has_calculator ?? prev.has_calculator,
                    option_type_numeric: match.option_type_numeric ?? prev.option_type_numeric,
                    instructions: match.instructions || prev.instructions
                }));
            }
        }
    }, [formValues.name, formValues.session, formValues.class_level, formValues.target_exams, formValues.exam_type, examDetails]);

    // Cascading Filter Logic based on Exam Details Master
    const availableSessions = useMemo(() => {
        const sessionIds = [...new Set(examDetails.map(d => String(d.session)))];
        return sessions.filter(s => sessionIds.includes(String(s.id)) && (s.is_active || String(s.id) === String(formValues.session)));
    }, [sessions, examDetails, formValues.session]);

    const availableClasses = useMemo(() => {
        if (!formValues.session) return [];
        const classIds = [...new Set(examDetails
            .filter(d => String(d.session) === String(formValues.session))
            .map(d => String(d.class_level)))];
        return classes.filter(c => classIds.includes(String(c.id)) && (c.is_active || String(c.id) === String(formValues.class_level)));
    }, [classes, examDetails, formValues.session, formValues.class_level]);

    const availableTargetExams = useMemo(() => {
        if (!formValues.session || !formValues.class_level) return [];
        const targetIds = [...new Set(examDetails
            .filter(d =>
                String(d.session) === String(formValues.session) &&
                String(d.class_level) === String(formValues.class_level)
            )
            .flatMap(d => Array.isArray(d.target_exams) ? d.target_exams.map(String) : d.target_exam ? [String(d.target_exam)] : []))];
        return targetExams.filter(t => targetIds.includes(String(t.id)) && (t.is_active || (Array.isArray(formValues.target_exams) && formValues.target_exams.map(String).includes(String(t.id)))));
    }, [targetExams, examDetails, formValues.session, formValues.class_level, formValues.target_exams]);

    const availableExamTypes = useMemo(() => {
        if (!formValues.session || !formValues.class_level || formValues.target_exams.length === 0) return [];
        const typeIds = [...new Set(examDetails
            .filter(d =>
                String(d.session) === String(formValues.session) &&
                String(d.class_level) === String(formValues.class_level) &&
                (Array.isArray(d.target_exams)
                    ? d.target_exams.some(te => formValues.target_exams.includes(String(te)))
                    : false)
            )
            .map(d => String(d.exam_type)))];
        return examTypes.filter(et => typeIds.includes(String(et.id)));
    }, [examTypes, examDetails, formValues.session, formValues.class_level, formValues.target_exams]);

    const availableTitles = useMemo(() => {
        if (!formValues.session || !formValues.class_level || formValues.target_exams.length === 0 || !formValues.exam_type) return [];
        return examDetails
            .filter(d =>
                String(d.session) === String(formValues.session) &&
                String(d.class_level) === String(formValues.class_level) &&
                (Array.isArray(d.target_exams)
                    ? d.target_exams.some(te => formValues.target_exams.includes(String(te)))
                    : false) &&
                String(d.exam_type) === String(formValues.exam_type)
            )
            .map(d => ({ id: d.name, name: d.name }));
    }, [examDetails, formValues.session, formValues.class_level, formValues.target_exams, formValues.exam_type]);

    const isAllCriteriaSelected = !!(formValues.session && formValues.target_exams.length > 0 && formValues.exam_type && formValues.class_level);

    const renderModal = () => {
        if (!isModalOpen) return null;
        return (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 md:p-8">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                <div className={`relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-[5px] overflow-hidden shadow-2xl animate-in zoom-in duration-300 ${isDarkMode ? 'bg-[#10141D]' : 'bg-white'}`}>
                    {/* Header */}
                    <div className="shrink-0 bg-orange-500 p-6 flex justify-between items-center z-10">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {modalMode === 'create' ? 'Add' : 'View'} Exam Details
                        </h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-white hover:scale-110 transition-transform p-1">
                            <X size={24} strokeWidth={3} />
                        </button>
                    </div>

                    <form id="test-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            <div className="space-y-6">
                                {/* Relational Selects */}
                                {modalMode === 'edit' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Session</label>
                                            <div className={`px-4 py-3 rounded-[5px] border font-bold text-xs ${isDarkMode ? 'bg-orange-500/5 border-orange-500/10 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                                                {availableSessions.find(s => String(s.id) === String(formValues.session))?.name || '-'}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                            <div className={`px-4 py-3 rounded-[5px] border font-bold text-xs ${isDarkMode ? 'bg-orange-500/5 border-orange-500/10 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                                                {availableClasses.find(c => String(c.id) === String(formValues.class_level))?.name || '-'}
                                            </div>
                                        </div>
                                        <div className="space-y-1 col-span-1 md:col-span-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Target Exam</label>
                                            <div className={`px-4 py-2 min-h-[42px] rounded-[5px] border flex flex-wrap gap-1.5 ${isDarkMode ? 'bg-orange-500/5 border-orange-500/10' : 'bg-orange-50 border-orange-200'}`}>
                                                {availableTargetExams.filter(te => formValues.target_exams.map(String).includes(String(te.id))).map(te => (
                                                    <span key={te.id} className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-white/80 text-orange-600 border border-orange-200'}`}>
                                                        {te.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-1 col-span-1 md:col-span-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Type</label>
                                            <div className={`px-4 py-3 rounded-[5px] border font-bold text-xs ${isDarkMode ? 'bg-orange-500/5 border-orange-500/10 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                                                {availableExamTypes.find(et => String(et.id) === String(formValues.type || formValues.exam_type))?.name || '-'}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Session</label>
                                            <SearchableSelect
                                                options={availableSessions}
                                                value={formValues.session}
                                                onChange={val => setFormValues({ ...formValues, session: val, class_level: '', target_exams: [], exam_type: '', name: '', code: '' })}
                                                placeholder="Select Session"
                                                isDarkMode={isDarkMode}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                            <SearchableSelect
                                                disabled={!formValues.session}
                                                options={availableClasses}
                                                value={formValues.class_level}
                                                onChange={val => setFormValues({ ...formValues, class_level: val, target_exams: [], exam_type: '', name: '', code: '' })}
                                                placeholder="Select Class"
                                                isDarkMode={isDarkMode}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Target Exam</label>
                                            <SearchableSelect
                                                disabled={!formValues.class_level}
                                                options={availableTargetExams}
                                                value={formValues.target_exams}
                                                onChange={val => setFormValues({ ...formValues, target_exams: val, exam_type: '', name: '', code: '' })}
                                                placeholder="Select Target"
                                                isDarkMode={isDarkMode}
                                                isMulti={true}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Type</label>
                                            <SearchableSelect
                                                disabled={formValues.target_exams.length === 0}
                                                options={availableExamTypes}
                                                value={formValues.exam_type}
                                                onChange={val => setFormValues({ ...formValues, exam_type: val, name: '', code: '' })}
                                                placeholder="Select Type"
                                                isDarkMode={isDarkMode}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Title & Code */}
                                {modalMode === 'edit' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Title</label>
                                            <div className={`px-5 py-4 rounded-[5px] border font-bold text-sm ${isDarkMode ? 'bg-orange-500/5 border-orange-500/10 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                                                {formValues.name || '-'}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Code</label>
                                            <div className={`px-5 py-4 rounded-[5px] border font-bold text-sm ${isDarkMode ? 'bg-orange-500/5 border-orange-500/10 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                                                {formValues.code || '-'}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Title * {!isAllCriteriaSelected && '(Select Four Filters First)'}</label>
                                                <SearchableSelect
                                                    disabled={!isAllCriteriaSelected}
                                                    options={availableTitles}
                                                    value={formValues.name}
                                                    onChange={val => setFormValues({ ...formValues, name: val })}
                                                    placeholder="Select Exam Title"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Code *</label>
                                                <input
                                                    required
                                                    placeholder="Exam Code *"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value })}
                                                    className={`w-full px-5 py-4 rounded-[5px] border font-semibold text-sm outline-none transition-all placeholder:text-slate-500 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Duration (Mins) (Auto-selected)</label>
                                        {modalMode === 'edit' ? (
                                            <div className={`px-5 py-4 rounded-[5px] border font-bold text-sm ${isDarkMode ? 'bg-orange-500/5 border-orange-500/10 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                                                {formValues.duration || '0'}
                                            </div>
                                        ) : (
                                            <input
                                                type="number"
                                                readOnly
                                                required
                                                value={formValues.duration}
                                                className={`w-full px-5 py-4 rounded-[5px] border font-semibold text-sm outline-none transition-all opacity-60 cursor-not-allowed ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Toggles */}
                                <div className="flex items-center gap-8 py-2">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => modalMode !== 'edit' && setFormValues({ ...formValues, is_completed: !formValues.is_completed })}
                                            className={`relative w-12 h-6 rounded-full transition-colors flex items-center ${modalMode === 'edit' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${formValues.is_completed ? 'bg-orange-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formValues.is_completed ? 'right-1' : 'left-1'}`} />
                                        </button>
                                        <span className="text-sm font-bold opacity-60">Completed</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => modalMode !== 'edit' && setFormValues({ ...formValues, has_calculator: !formValues.has_calculator })}
                                            className={`relative w-12 h-6 rounded-full transition-colors flex items-center ${modalMode === 'edit' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${formValues.has_calculator ? 'bg-orange-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formValues.has_calculator ? 'right-1' : 'left-1'}`} />
                                        </button>
                                        <span className="text-sm font-bold opacity-60">Calculator</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => modalMode !== 'edit' && setFormValues({ ...formValues, option_type_numeric: !formValues.option_type_numeric })}
                                            className={`relative w-12 h-6 rounded-full transition-colors flex items-center ${modalMode === 'edit' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${formValues.option_type_numeric ? 'bg-orange-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formValues.option_type_numeric ? 'right-1' : 'left-1'}`} />
                                        </button>
                                        <span className="text-sm font-bold opacity-60">Option type (1,2,3,4)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className={`h-px w-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />

                            {/* Instructions (After Main Fields) */}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold opacity-80 uppercase tracking-widest">Test Instructions</h3>
                                    <p className="text-[10px] opacity-40 font-medium">Add guidelines and mathematical formulas for the students.</p>
                                </div>
                                <SmartEditor
                                    value={formValues.instructions}
                                    onChange={(val) => modalMode !== 'edit' && setFormValues(prev => ({ ...prev, instructions: val }))}
                                    placeholder="Enter test instructions..."
                                    isDarkMode={isDarkMode}
                                    readOnly={modalMode === 'edit'}
                                />
                            </div>

                        </div>

                        {/* Sticky Footer */}
                        {modalMode !== 'edit' && (
                            <div className={`shrink-0 p-6 border-t flex justify-center ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}>
                                <button
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="px-10 py-3.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-900/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isActionLoading ? <Loader2 className="animate-spin" size={16} /> : <>{modalMode === 'create' ? 'Add Test' : 'Update Test'}</>}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        );
    };

    if (activeView === 'section-management' && managementTest) {
        return (
            <TestSectionManager
                test={managementTest}
                onBack={() => {
                    setActiveView('test-list');
                    setManagementTest(null);
                }}
                onManageQuestions={(section) => {
                    setInitialSectionId(section.id);
                    setActiveView('question-management');
                }}
            />
        );
    }

    if (activeView === 'question-management' && managementTest) {
        return (
            <TestQuestionManager
                test={managementTest}
                initialSectionId={initialSectionId}
                onBack={() => {
                    setInitialSectionId(null);
                    setActiveView('test-list');
                    setManagementTest(null);
                }}
            />
        );
    }

    if (activeView === 'question-paper' && managementTest) {
        return (
            <QuestionPaperView
                test={managementTest}
                onBack={() => {
                    setActiveView('test-list');
                    setManagementTest(null);
                }}
            />
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderHeader()}
            {renderContent()}
            {renderModal()}
        </div>
    );
};

export default TestCreate;
