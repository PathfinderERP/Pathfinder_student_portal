import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import {
    Calendar, Layers, GraduationCap, Plus, Search, Target,
    Edit2, Trash2, Filter, Loader2, Database, X, Check, ChevronDown, Clock, BookOpen, RefreshCw,
    Image as ImageIcon, Copy, ExternalLink, CloudUpload, ArrowLeft, AlertTriangle,
    Download, FileSpreadsheet, Upload, FileCheck,
    CheckSquare, Square, CheckCircle2, XCircle, SlidersHorizontal, FileText, Sparkles, Info, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import SmartEditor from './components/SmartEditor';
import SectionRegistry from '../sections/SectionRegistry';
import ChapterTestSettings from './components/ChapterTestSettings';

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
            return `${selectedOptions.length} Selected`;
        } else {
            const opt = options.find(o => String(o.id) === String(value));
            return opt ? opt.name : placeholder;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm flex items-center justify-between cursor-pointer transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
            >
                <span className="truncate">{getDisplayValue()}</span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className={`absolute z-[200] mt-2 w-full p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1F2533] border-white/10' : 'bg-white border-slate-200'}`}>
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
                        {isMulti && filteredOptions.length > 0 && (
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
                                        onClick={() => handleSelect(opt.id)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-xs font-bold cursor-pointer transition-all mb-1 ${isSelected 
                                            ? (isDarkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600') 
                                            : (isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50')}`}
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

const subTabs = [
    { id: 'Section Management', icon: Layers, label: 'Section Management', endpoint: 'sections' },
    { id: 'Subject', icon: BookOpen, label: 'Subject', endpoint: 'subjects' },
    { id: 'Class', icon: GraduationCap, label: 'Class', endpoint: 'classes' },
    { id: 'Chapter', icon: BookOpen, label: 'Chapter', endpoint: 'chapters' },
    { id: 'Topic', icon: BookOpen, label: 'Topic', endpoint: 'topics' },
    { id: 'SubTopic', icon: BookOpen, label: 'SubTopic', endpoint: 'subtopics' },
    { id: 'Session', icon: Calendar, label: 'Session', endpoint: 'sessions' },
    { id: 'Target Exam', icon: Target, label: 'Target Exam', endpoint: 'target-exams' },
    { id: 'Exam Type', icon: Layers, label: 'Exam Type', endpoint: 'exam-types' },
    { id: 'Exam Details', icon: Database, label: 'Exam Details', endpoint: 'exam-details' },
    { id: 'Partial Marks', icon: FileCheck, label: 'Partial Marks', endpoint: 'partial-mark-rules' },
    { id: 'Image', icon: ImageIcon, label: 'Question Images', endpoint: 'questions/images' },
    { id: 'Psychometric Traits', icon: Target, label: 'Psychometric Traits', endpoint: 'psychometric-traits' },
    { id: 'Psychometric Questions', icon: BookOpen, label: 'Psychometric Questions', endpoint: 'psychometric-questions' },
    { id: 'Mistake Reason', icon: AlertTriangle, label: 'Mistake Reason', endpoint: 'mistake-reasons' },
    { id: 'Chapter Test Settings', icon: Target, label: 'Chapter Test Settings', endpoint: 'chapter-test-settings' },
];

const MasterDataManagement = ({ activeSubTab, setActiveSubTab, onBack, onNavigate }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(null);

    // Pagination state
    const [pageNumber, setPageNumber] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [jumpPage, setJumpPage] = useState('');

    const handleSyncERP = async () => {
        setIsSyncing(true);
        const config = getAuthConfig();
        if (!config) return;

        let endpoint, label;
        if (activeSubTab === 'Session') {
            endpoint = 'sessions';
            label = 'Sessions';
        } else if (activeSubTab === 'Class') {
            endpoint = 'classes';
            label = 'Classes';
        } else {
            endpoint = 'target-exams';
            label = 'Exam Tags';
        }

        const loadToast = toast.loading(`Syncing ${label} with ERP...`);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.post(`${apiUrl}/api/master-data/${endpoint}/sync-erp/`, {}, config);
            toast.success(response.data.message || "Sync completed!", { id: loadToast });
            fetchData(true); // Refresh list
            const syncKeys = activeSubTab === 'Session' ? ['sessions'] : 
                            activeSubTab === 'Class' ? ['classes'] : ['targetExams'];
            fetchMasterData(syncKeys, true); // Refresh relevant dropdowns
        } catch (err) {
            console.error("ERP Sync failed:", err);
            toast.error(err.response?.data?.error || "Sync failed", { id: loadToast });
        } finally {
            setIsSyncing(false);
        }
    };

    // Tab Scrolling Ref and Drag State
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [dragged, setDragged] = useState(false);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragged(false);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        // Small delay to ensure onClick has time to check the 'dragged' state
        setTimeout(() => setDragged(false), 10);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        if (Math.abs(walk) > 5) {
            setDragged(true);
        }
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollLeft - walk;
        }
    };

    // Filter State
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Filter States
    const [sessionFilter, setSessionFilter] = useState('all');
    const [examTypeFilter, setExamTypeFilter] = useState('all');
    const [classFilter, setClassFilter] = useState('all');
    const [targetFilter, setTargetFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [topicFilter, setTopicFilter] = useState('all');
    const [chapterFilter, setChapterFilter] = useState('all');
    const [sessionSearch, setSessionSearch] = useState('');
    const [examTypeSearch, setExamTypeSearch] = useState('');
    const [classSearch, setClassSearch] = useState('');
    const [targetSearch, setTargetSearch] = useState('');
    const [subjectSearch, setSubjectSearch] = useState('');
    const [topicSearch, setTopicSearch] = useState('');
    const [chapterSearch, setChapterSearch] = useState('');

    const [isSessionFilterOpen, setIsSessionFilterOpen] = useState(false);
    const [isExamTypeFilterOpen, setIsExamTypeFilterOpen] = useState(false);
    const [isClassFilterOpen, setIsClassFilterOpen] = useState(false);
    const [isTargetFilterOpen, setIsTargetFilterOpen] = useState(false);
    const [isSubjectFilterOpen, setIsSubjectFilterOpen] = useState(false);
    const [isTopicFilterOpen, setIsTopicFilterOpen] = useState(false);
    const [isChapterFilterOpen, setIsChapterFilterOpen] = useState(false);
    const [isModalChapterFilterOpen, setIsModalChapterFilterOpen] = useState(false);
    const [modalChapterSearch, setModalChapterSearch] = useState('');

    const [sessions, setSessions] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [classes, setClasses] = useState([]);
    const [targetExams, setTargetExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [subTopics, setSubTopics] = useState([]);
    const [psychometricTraits, setPsychometricTraits] = useState([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [selectedItem, setSelectedItem] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, title: '' });
    const [formValues, setFormValues] = useState({
        name: '',
        code: '',
        description: '',
        session: '',
        sessions: [],
        exam_type: '',
        target_exam: '',
        target_exams: [],
        class_levels: [],
        class_level: '',
        text: '',
        trait: '',
        is_reverse_scored: false,
        order: 1,
        subject: '',
        topic: '',
        sub_topic: '',
        email: '',
        phone: '',
        qualification: '',
        experience: '',
        duration: 180,
        total_marks: 0,
        has_calculator: false,
        option_type_numeric: false,
        instructions: '',
        is_active: true
    });

    // Bulk Import/Export & Multi-Select State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [bulkImportMode, setBulkImportMode] = useState('skip_existing'); // 'skip_existing', 'upsert', 'create'
    const [importReport, setImportReport] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportFilter, setReportFilter] = useState('all'); // 'all', 'created', 'skipped', 'error', 'updated'
    const [reportSearch, setReportSearch] = useState('');
    const bulkFileInputRef = useRef(null);

    // Multi-Select Bulk Actions State
    const [selectedRowIds, setSelectedRowIds] = useState([]);
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [bulkEditFields, setBulkEditFields] = useState({
        is_active: '',
        class_level: '',
        subject: '',
        chapter: '',
        topic: '',
        session: '',
        target_exam: '',
        exam_type: '',
    });

    const lastFetchedTab = useRef(null);
    const activeFetchKeyRef = useRef(null); // Prevent duplicate simultaneous requests
    const masterDataCacheRef = useRef({}); // Cache master data in memory
    const masterDataTimestampRef = useRef({}); // Track cache time per endpoint
    const MASTER_DATA_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

    const sessionLabel = useMemo(() => {
        if (sessionFilter === 'all') return 'Sessions';
        return sessions.find(s => String(s.id) === String(sessionFilter))?.name || 'Sessions';
    }, [sessionFilter, sessions]);

    const examTypeLabel = useMemo(() => {
        if (examTypeFilter === 'all') return 'Types';
        return examTypes.find(et => String(et.id) === String(examTypeFilter))?.name || 'Types';
    }, [examTypeFilter, examTypes]);

    const classLabel = useMemo(() => {
        if (classFilter === 'all') return 'Classes';
        return classes.find(c => String(c.id) === String(classFilter))?.name || 'Classes';
    }, [classFilter, classes]);

    const targetFilterLabel = useMemo(() => {
        if (targetFilter === 'all') return 'Targets';
        return targetExams.find(t => String(t.id) === String(targetFilter))?.name || 'Targets';
    }, [targetFilter, targetExams]);

    const subjectLabel = useMemo(() => {
        if (subjectFilter === 'all') return 'Subjects';
        return subjects.find(s => String(s.id) === String(subjectFilter))?.name || 'Subjects';
    }, [subjectFilter, subjects]);

    const chapterLabel = useMemo(() => {
        if (chapterFilter === 'all') return 'Chapters';
        return chapters.find(c => String(c.id) === String(chapterFilter))?.name || 'Chapters';
    }, [chapterFilter, chapters]);

    const topicLabel = useMemo(() => {
        if (topicFilter === 'all') return 'Topics';
        return topics.find(t => String(t.id) === String(topicFilter))?.name || 'Topics';
    }, [topicFilter, topics]);

    const filteredTopicsForImage = useMemo(() => {
        if (!topics || topics.length === 0) return [];
        let filtered = [...topics];
        if (formValues.class_level && formValues.class_level !== '') {
            filtered = filtered.filter(t =>
                String(t.class_level || t.class_level_id) === String(formValues.class_level)
            );
        }
        if (formValues.subject && formValues.subject !== '') {
            filtered = filtered.filter(t =>
                String(t.subject || t.subject_id) === String(formValues.subject)
            );
        }
        return filtered;
    }, [topics, formValues.class_level, formValues.subject]);

    // Image Upload State
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const mediaInputRef = useRef(null);

    // Debounced search state
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debouncedSearchRef = useRef(null);

    // Cascading Filter Options for "Exam Details" subtab
    const availableSessionsForFilter = useMemo(() => {
        if (activeSubTab !== 'Exam Details') return sessions.filter(s => s.is_active);
        const sessionIds = [...new Set(data.map(d => String(d.session)))];
        return sessions.filter(s => sessionIds.includes(String(s.id)) && s.is_active);
    }, [sessions, data, activeSubTab]);

    const availableClassesForFilter = useMemo(() => {
        if (activeSubTab !== 'Exam Details') return classes;
        const classIds = [...new Set(data
            .filter(d => (sessionFilter === 'all' || String(d.session) === String(sessionFilter)))
            .map(d => String(d.class_level)))];
        return classes.filter(c => classIds.includes(String(c.id)));
    }, [classes, data, activeSubTab, sessionFilter]);

    const availableTargetsForFilter = useMemo(() => {
        if (activeSubTab !== 'Exam Details') return targetExams;
        const targetIds = [...new Set(data
            .filter(d => (sessionFilter === 'all' || String(d.session) === String(sessionFilter)))
            .filter(d => (classFilter === 'all' || String(d.class_level) === String(classFilter)))
            .flatMap(d => Array.isArray(d.target_exams) ? d.target_exams.map(String) : d.target_exam ? [String(d.target_exam)] : []))];
        return targetExams.filter(t => targetIds.includes(String(t.id)));
    }, [targetExams, data, activeSubTab, sessionFilter, classFilter]);

    const availableTypesForFilter = useMemo(() => {
        if (activeSubTab !== 'Exam Details') return examTypes;
        const typeIds = [...new Set(data
            .filter(d => (sessionFilter === 'all' || String(d.session) === String(sessionFilter)))
            .filter(d => (classFilter === 'all' || String(d.class_level) === String(classFilter)))
            .filter(d => {
                if (targetFilter === 'all') return true;
                if (Array.isArray(d.target_exams)) return d.target_exams.some(te => String(te) === String(targetFilter));
                return String(d.target_exam) === String(targetFilter);
            })
            .map(d => String(d.exam_type)))];
        return examTypes.filter(et => typeIds.includes(String(et.id)));
    }, [examTypes, data, activeSubTab, sessionFilter, classFilter, targetFilter]);



    const currentTabConfig = useMemo(() => subTabs.find(t => t.id === activeSubTab), [activeSubTab]);

    const getAuthConfig = useCallback(() => {
        const activeToken = token || localStorage.getItem('auth_token');
        if (!activeToken) return null;
        return { headers: { 'Authorization': `Bearer ${activeToken}` } };
    }, [token]);

    // Function to fetch master data with caching (granular)
    const fetchMasterData = useCallback(async (keys = [], force = false) => {
        const now = Date.now();
        const config = getAuthConfig();
        if (!config || !keys.length) return;

        const endpoints = {
            sessions: { url: 'sessions', setter: setSessions },
            examTypes: { url: 'exam-types', setter: setExamTypes },
            classes: { url: 'classes', setter: setClasses },
            targetExams: { url: 'target-exams', setter: setTargetExams },
            subjects: { url: 'subjects', setter: setSubjects },
            topics: { url: 'topics', setter: setTopics },
            chapters: { url: 'chapters', setter: setChapters },
            psychometricTraits: { url: 'psychometric-traits', setter: setPsychometricTraits },
        };

        // Determine which keys actually need fetching
        const keysToFetch = keys.filter(key => {
            if (force) return true;
            const lastFetched = masterDataTimestampRef.current[key];
            const isStale = !lastFetched || (now - lastFetched) > MASTER_DATA_CACHE_TTL;
            const inCache = masterDataCacheRef.current[key];
            
            if (!isStale && inCache) {
                // Populate state from cache
                const data = masterDataCacheRef.current[key];
                endpoints[key].setter(key === 'sessions' ? data.filter(s => s.is_active) : data);
                return false;
            }
            return true;
        });

        if (keysToFetch.length === 0) return;

        try {
            const apiUrl = getApiUrl();
            const query = force ? '?refresh=true' : '';
            const responses = await Promise.all(keysToFetch.map(key => 
                axios.get(`${apiUrl}/api/master-data/${endpoints[key].url}/${query}`, config)
            ));

            responses.forEach((res, i) => {
                const key = keysToFetch[i];
                const resData = res.data;
                masterDataCacheRef.current[key] = resData;
                masterDataTimestampRef.current[key] = now;
                
                const ep = endpoints[key];
                ep.setter(key === 'sessions' ? resData.filter(s => s.is_active) : resData);
            });
        } catch (err) {
            console.error('Failed to fetch granular master data:', err);
        }
    }, [getAuthConfig, getApiUrl]);

    const tabDependencies = useMemo(() => ({
        'Chapter': ['classes', 'subjects'],
        'Topic': ['classes', 'subjects', 'chapters'],
        'SubTopic': ['topics'],
        'Exam Type': ['examTypes'],
        'Exam Details': ['sessions', 'examTypes', 'classes', 'targetExams'],
        'Image': ['classes', 'subjects', 'topics', 'examTypes', 'targetExams'],
        'Psychometric Questions': ['psychometricTraits'],
    }), []);

    const getMasterDataEventKey = useCallback((subTab) => {
        const mapping = {
            'Exam Details': 'examDetails',
            'Exam Type': 'examTypes',
            'Target Exam': 'targetExams',
            'Session': 'sessions',
            'Classes': 'classes',
            'Subject': 'subjects',
            'Topic': 'topics',
            'Chapter': 'chapters'
        };
        return mapping[subTab] || null;
    }, []);

    const dispatchMasterDataUpdate = useCallback((key) => {
        if (!key || typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('master-data-updated', { detail: { key } }));
    }, []);

    const fetchData = useCallback(async (force = false, topicFilterId = null) => {
        if (!currentTabConfig || activeSubTab === 'Section Management') return;

        // Prevent redundant parallel requests for the same tab/context
        const fetchKey = `${activeSubTab}-${topicFilterId || 'none'}-${force}`;
        if (activeFetchKeyRef.current === fetchKey && !force) return;
        activeFetchKeyRef.current = fetchKey;

        const requiredKeys = tabDependencies[activeSubTab] || [];

        // For SubTopic, skip the bulk data fetch - use topic filter instead
        if (activeSubTab === 'SubTopic' && !topicFilterId && !force) {
            // Load required master data (topics)
            await fetchMasterData(requiredKeys);
            setData([]);
            lastFetchedTab.current = activeSubTab;
            return;
        }

        // Only skip if not forced AND we have data AND we're still on the same subtab
        if (!force && data.length > 0 && lastFetchedTab.current === activeSubTab) return;

        const config = getAuthConfig();
        if (!config) return; // Wait for token

        setIsLoading(true);
        setError(null);
        try {
            const apiUrl = getApiUrl();
            const endpoint = activeSubTab === 'Image' ? 'questions/images' : `master-data/${currentTabConfig.endpoint}`;

            // Build parameters for pagination and filtering
            const queryParams = new URLSearchParams();
            if (topicFilterId) queryParams.append('topic', topicFilterId);
            if (force) queryParams.append('refresh', 'true');

            const paramsString = queryParams.toString() ? `?${queryParams.toString()}` : '';
            const response = await axios.get(`${apiUrl}/api/${endpoint}/${paramsString}`, config);
            setData(response.data);
            if (!topicFilterId) lastFetchedTab.current = activeSubTab;

            // Load master data required for this tab
            if (requiredKeys.length > 0) {
                await fetchMasterData(requiredKeys, force);
            }
        } catch (err) {
            console.error(`Failed to fetch ${activeSubTab} data:`, err);
            if (err.response?.status === 401) {
                setError(`Unauthorized access. Please try logging out and back in.`);
            } else {
                setError(`Failed to load ${activeSubTab.toLowerCase()} data.`);
            }
        } finally {
            setIsLoading(false);
            if (activeFetchKeyRef.current === fetchKey) {
                activeFetchKeyRef.current = null;
            }
        }
    }, [currentTabConfig, getApiUrl, getAuthConfig, activeSubTab, fetchMasterData]);

    // Fetch CSRF token on mount
    useEffect(() => {
        const fetchCSRFToken = async () => {
            try {
                const config = getAuthConfig();
                if (!config) return;

                const apiUrl = getApiUrl();
                await axios.get(`${apiUrl}/api/master-data/sessions/`, config);

                // Configure axios to always include CSRF token
                const getCookie = (name) => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop().split(';').shift();
                };

                const csrfToken = getCookie('csrftoken');
                if (csrfToken) {
                    axios.defaults.headers.common['X-CSRFToken'] = csrfToken;
                }
            } catch (err) {
                console.error('Failed to fetch CSRF token:', err);
            }
        };
        fetchCSRFToken();
    }, [getApiUrl, getAuthConfig]);

    // Handle debounced search
    useEffect(() => {
        if (debouncedSearchRef.current) {
            clearTimeout(debouncedSearchRef.current);
        }

        debouncedSearchRef.current = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);

        return () => {
            if (debouncedSearchRef.current) {
                clearTimeout(debouncedSearchRef.current);
            }
        };
    }, [searchTerm]);

    // Reset filters on tab change
    useEffect(() => {
        setSearchTerm('');
        setDebouncedSearch('');
        setPageNumber(1); // Reset to first page
        setStatusFilter('all');
        setSessionFilter('all');
        setExamTypeFilter('all');
        setClassFilter('all');
        setTargetFilter('all');
        setSubjectFilter('all');
        setTopicFilter('all');
        fetchData();
    }, [activeSubTab, fetchData]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            toast.success("Image Link Copied to Clipboard!");
        });
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);

        // Revoke old previews
        previews.forEach(url => URL.revokeObjectURL(url));

        // Create new previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);
    };

    const performImageUpload = async () => {
        if (selectedFiles.length === 0) {
            toast.error("Please select at least one image.");
            return;
        }

        const config = getAuthConfig();
        if (!config) return;

        setIsActionLoading(true);
        setIsUploadingImage(true);
        const apiUrl = getApiUrl();

        try {
            const uploadedImages = [];
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append('image', file);

                if (formValues.class_level) formData.append('class_level', formValues.class_level);
                if (formValues.subject) formData.append('subject', formValues.subject);
                if (formValues.topic) formData.append('topic', formValues.topic);
                if (formValues.exam_type) formData.append('exam_type', formValues.exam_type);
                if (formValues.target_exam) formData.append('target_exam', formValues.target_exam);

                const result = await axios.post(`${apiUrl}/api/questions/images/`, formData, {
                    headers: {
                        ...config.headers,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                uploadedImages.push(result.data);
            }

            // Optimistic: add new images to local state
            setData(prev => [...uploadedImages, ...prev]);

            setIsModalOpen(false);
            setSelectedFiles([]);
            setPreviews([]);
            toast.success(`Successfully uploaded ${selectedFiles.length} image(s)`);
        } catch (err) {
            console.error("Image upload failed", err);
            toast.error("Failed to upload image(s)");
            fetchData(true); // Revert on error
        } finally {
            setIsActionLoading(false);
            setIsUploadingImage(false);
            if (mediaInputRef.current) mediaInputRef.current.value = '';
        }
    };

    const handleCreate = () => {
        setModalMode('create');
        setSelectedItem(null);

        const initialForm = {
            name: '',
            code: '',
            target_exam: '',
            description: '',
            sessions: [],
            session: '',
            exam_type: '',
            class_levels: [],
            class_level: classes[0]?.id || '',
            subject: subjects[0]?.id || '',
            sub_topic: '',
            email: '',
            phone: '',
            qualification: '',
            experience: '',
            duration: 180,
            total_marks: 0,
            has_calculator: false,
            option_type_numeric: false,
            instructions: '',
            is_active: true
        };

        if (activeSubTab === 'Image') {
            initialForm.image = null;
            initialForm.class_level = '';
            initialForm.subject = '';
            initialForm.topic = '';
        } else if (activeSubTab === 'Partial Marks') {
            initialForm.logic_type = 'STANDARD';
            initialForm.base_correct_marks = 4;
            initialForm.base_negative_marks = 1;
            initialForm.exam_type = '';
        } else if (activeSubTab === 'Psychometric Traits') {
            initialForm.name = '';
            initialForm.description = '';
            initialForm.order = 1;
        } else if (activeSubTab === 'Psychometric Questions') {
            initialForm.text = '';
            initialForm.trait = psychometricTraits?.[0]?.id || '';
            initialForm.is_reverse_scored = false;
            initialForm.order = 1;
        }

        setFormValues(initialForm);
        setSelectedFiles([]);
        setPreviews([]);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setModalMode('edit');
        setSelectedItem(item);
        if (activeSubTab === 'Exam Details') {
            setFormValues({
                ...item,
                session: item.session_id || item.session || '',
                sessions: item.sessions || (item.session_id || item.session ? [item.session_id || item.session] : []),
                exam_type: item.exam_type_id || item.exam_type || '',
                target_exams: item.target_exams || (item.target_exam ? [item.target_exam] : []),
                class_levels: item.class_levels || (item.class_level_id || item.class_level ? [item.class_level_id || item.class_level] : []),
                class_level: item.class_level_id || item.class_level || '',
                duration: item.duration,
                total_marks: item.total_marks || 0,
                has_calculator: item.has_calculator || false,
                option_type_numeric: item.option_type_numeric || false,
                instructions: item.instructions || '',
                is_active: item.is_active
            });
        } else if (activeSubTab === 'Chapter') {
            setFormValues({
                name: item.name || '',
                code: item.code || '',
                class_level: item.class_level,
                subject: item.subject,
                order: item.order ?? 1,
                is_active: item.is_active
            });
        } else if (activeSubTab === 'SubTopic') {
            setFormValues({
                name: item.name || '',
                code: item.code || '',
                topic: item.topic,
                order: item.order ?? 1,
                is_active: item.is_active
            });
        } else if (activeSubTab === 'Topic') {
            setFormValues({
                name: item.name || '',
                sub_topic: item.sub_topic || '',
                code: item.code || '',
                class_level: item.class_level,
                subject: item.subject,
                chapter: item.chapter || '',
                is_active: item.is_active
            });
        } else if (activeSubTab === 'Image') {
            setFormValues({
                class_level: item.class_level || '',
                subject: item.subject || '',
                topic: item.topic || '',
                is_active: true
            });
        } else if (activeSubTab === 'Partial Marks') {
            setFormValues({
                name: item.name,
                code: item.code,
                logic_type: item.logic_type || 'STANDARD',
                base_correct_marks: item.base_correct_marks ?? 4,
                base_negative_marks: item.base_negative_marks ?? 1,
                exam_type: item.exam_type || item.exam_type_id || '',
                is_active: item.is_active
            });
        } else if (activeSubTab === 'Psychometric Traits') {
            setFormValues({
                name: item.name || '',
                description: item.description || '',
                order: item.order ?? 1,
                is_active: item.is_active
            });
        } else if (activeSubTab === 'Psychometric Questions') {
            setFormValues({
                text: item.text || '',
                trait: item.trait || item.trait_id || '',
                is_reverse_scored: item.is_reverse_scored || false,
                order: item.order ?? 1,
                is_active: item.is_active
            });
        } else {
            setFormValues({
                name: item.name,
                code: item.code,
                target_exams: item.target_exams || [],
                target_exam: item.target_exam || '',
                description: item.description || '',
                is_active: item.is_active
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        setConfirmDialog({
            isOpen: true,
            id,
            title: `Are you sure you want to delete this ${activeSubTab.toLowerCase()}?`
        });
    };

    const confirmDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const config = getAuthConfig();

            // Get CSRF token from cookie
            const getCookie = (name) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
            };

            const csrfToken = getCookie('csrftoken');
            if (csrfToken) {
                config.headers['X-CSRFToken'] = csrfToken;
            }

            if (id === 'bulk') {
                const endpoint = activeSubTab === 'Image'
                    ? `questions/images/bulk-delete`
                    : `master-data/${currentTabConfig.endpoint}/bulk-delete`;
                const res = await axios.post(`${apiUrl}/api/${endpoint}/`, { ids: selectedRowIds }, config);
                toast.success(res.data.message || `Deleted ${selectedRowIds.length} items successfully!`);
                setSelectedRowIds([]);
                fetchData(true);
                const eventKey = getMasterDataEventKey(activeSubTab);
                if (eventKey) dispatchMasterDataUpdate(eventKey);
                return;
            }

            // Optimistic delete: remove from local state immediately
            setData(prev => prev.filter(item => (item.id !== id && item._id !== id)));

            // Use correct endpoint based on active tab
            const endpoint = activeSubTab === 'Image'
                ? `questions/images/${id}`
                : `master-data/${currentTabConfig.endpoint}/${id}`;

            await axios.delete(`${apiUrl}/api/${endpoint}/`, config);
            toast.success('Item deleted successfully!');
            const eventKey = getMasterDataEventKey(activeSubTab);
            if (eventKey) dispatchMasterDataUpdate(eventKey);
        } catch (err) {
            console.error('Delete failed:', err);
            toast.error('Failed to delete item');
            fetchData(true); // Revert on error
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleStatus = async (item) => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();

            // Optimistic update: toggle in local state
            setData(prev => prev.map(d => d.id === item.id ? { ...d, is_active: !d.is_active } : d));

            await axios.patch(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/${item.id}/`,
                { is_active: !item.is_active },
                getAuthConfig()
            );
            toast.success('Status updated successfully');
            const eventKey = getMasterDataEventKey(activeSubTab);
            if (eventKey) dispatchMasterDataUpdate(eventKey);
        } catch (err) {
            toast.error('Failed to toggle status');
            fetchData(true); // Revert on error
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAddToLibrary = (item) => {
        sessionStorage.setItem('library_prefill', JSON.stringify({
            name: item.name,
            class_level: item.class_level,
            subject: item.subject,
            chapter: item.id
        }));
        if (onNavigate) {
            onNavigate('Library');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (activeSubTab === 'Image' && modalMode === 'create') {
            await performImageUpload();
            return;
        }

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            let result;
            if (modalMode === 'create') {
                result = await axios.post(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/`, formValues, getAuthConfig());
                // Optimistic: add to local state
                setData(prev => [result.data, ...prev]);
            } else {
                const endpoint = activeSubTab === 'Image' ? `questions/images/${selectedItem.id}` : `master-data/${currentTabConfig.endpoint}/${selectedItem.id}`;
                result = await axios.patch(`${apiUrl}/api/${endpoint}/`, formValues, getAuthConfig());
                // Optimistic: update in local state
                setData(prev => prev.map(d => d.id === selectedItem.id ? result.data : d));
            }
            setIsModalOpen(false);
            toast.success(`${modalMode === 'create' ? 'Created' : 'Updated'} successfully!`);

            // Clear local cache and notify other pages about relevant master data changes.
            masterDataCacheRef.current = {};
            const eventKey = getMasterDataEventKey(activeSubTab);
            if (eventKey) dispatchMasterDataUpdate(eventKey);
            // Also notify that tests may need refreshing (some UI shows embedded test fields)
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('tests-updated'));
            fetchData(true);

            // Automatically navigate to Library for newly created Chapters
            if (modalMode === 'create' && activeSubTab === 'Chapter' && result.data) {
                handleAddToLibrary(result.data);
            }
        } catch (err) {
            toast.error(`Failed to ${modalMode} item: ` + (err.response?.data?.code || err.message));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleExamNameChange = (e) => {
        const value = e.target.value;
        const upperValue = value.toUpperCase();
        
        let newValues = { ...formValues, name: value };
        
        if (activeSubTab === 'Exam Details') {
            const matchedTarget = targetExams.find(te => upperValue.includes(te.name.toUpperCase()));
            if (matchedTarget && !formValues.target_exam) {
                newValues.target_exam = matchedTarget.id || matchedTarget._id;
            }
            
            const matchedClass = classes.find(c => upperValue.includes(c.name.toUpperCase()));
            if (matchedClass && !formValues.class_level) {
                newValues.class_level = matchedClass.id || matchedClass._id;
            }
        }
        
        setFormValues(newValues);
    };

    const handleExport = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/export/`, {
                headers: getAuthConfig().headers,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${activeSubTab.toLowerCase()}s_export.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("CSV Exported successfully!");
        } catch (err) {
            toast.error("Export failed");
        }
    };

    const handleBulkImport = async () => {
        if (!importFile) return;
        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', importFile);
        formData.append('mode', bulkImportMode);
        try {
            const apiUrl = getApiUrl();
            const config = getAuthConfig();
            const res = await axios.post(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/bulk-upload/`, formData, {
                headers: { ...config.headers, 'Content-Type': 'multipart/form-data' }
            });

            setImportReport(res.data);
            setShowBulkModal(false);
            setImportFile(null);
            setShowReportModal(true);
            setReportFilter('all');
            setReportSearch('');

            toast.success(res.data.message || "Import completed!");

            // Clear in-memory caches to ensure all dropdowns and search views get fresh data
            masterDataCacheRef.current = {};
            masterDataTimestampRef.current = {};

            fetchData(true);
            fetchMasterData(['classes', 'subjects', 'chapters', 'topics'], true);

            const eventKey = getMasterDataEventKey(activeSubTab);
            if (eventKey) dispatchMasterDataUpdate(eventKey);
            dispatchMasterDataUpdate('chapters');
        } catch (err) {
            toast.error(err.response?.data?.error || "Import failed");
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadImportReport = () => {
        if (!importReport || !importReport.details || importReport.details.length === 0) {
            toast.error("No report details available to download");
            return;
        }
        const headers = ["Row", "Name", "Class Level", "Subject", "Status", "Message"];
        const rows = importReport.details.map(d => [
            d.row,
            `"${(d.name || '').replace(/"/g, '""')}"`,
            `"${(d.class_level || '').replace(/"/g, '""')}"`,
            `"${(d.subject || d.topic || '').replace(/"/g, '""')}"`,
            `"${(d.status || '').toUpperCase()}"`,
            `"${(d.message || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `import_report_${activeSubTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Import report downloaded as CSV");
    };

    // Bulk Multi-Select Operations Handlers
    const handleBulkStatusChange = async (newStatus) => {
        if (selectedRowIds.length === 0) return;
        setIsActionLoading(true);
        const toastId = toast.loading(`Updating ${selectedRowIds.length} records...`);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.post(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/bulk-update/`, {
                ids: selectedRowIds,
                updates: { is_active: newStatus }
            }, getAuthConfig());
            toast.success(res.data.message || `Updated ${selectedRowIds.length} records to ${newStatus ? 'Active' : 'Inactive'}`, { id: toastId });
            setSelectedRowIds([]);
            fetchData(true);
            const eventKey = getMasterDataEventKey(activeSubTab);
            if (eventKey) dispatchMasterDataUpdate(eventKey);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Bulk status update failed', { id: toastId });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleBulkEditSubmit = async (e) => {
        e.preventDefault();
        if (selectedRowIds.length === 0) return;
        
        const updates = {};
        if (bulkEditFields.is_active !== '') updates.is_active = bulkEditFields.is_active === 'true';
        if (bulkEditFields.class_level) updates.class_level = bulkEditFields.class_level;
        if (bulkEditFields.subject) updates.subject = bulkEditFields.subject;
        if (bulkEditFields.chapter) updates.chapter = bulkEditFields.chapter;
        if (bulkEditFields.topic) updates.topic = bulkEditFields.topic;
        if (bulkEditFields.session) updates.session = bulkEditFields.session;
        if (bulkEditFields.target_exam) updates.target_exam = bulkEditFields.target_exam;
        if (bulkEditFields.exam_type) updates.exam_type = bulkEditFields.exam_type;

        if (Object.keys(updates).length === 0) {
            toast.error("Please select at least one field to update");
            return;
        }

        setIsActionLoading(true);
        const toastId = toast.loading(`Bulk updating ${selectedRowIds.length} records...`);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.post(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/bulk-update/`, {
                ids: selectedRowIds,
                updates
            }, getAuthConfig());
            toast.success(res.data.message || "Bulk update completed successfully!", { id: toastId });
            setIsBulkEditModalOpen(false);
            setSelectedRowIds([]);
            setBulkEditFields({
                is_active: '',
                class_level: '',
                subject: '',
                chapter: '',
                topic: '',
                session: '',
                target_exam: '',
                exam_type: '',
            });
            fetchData(true);
            const eventKey = getMasterDataEventKey(activeSubTab);
            if (eventKey) dispatchMasterDataUpdate(eventKey);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Bulk update failed', { id: toastId });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleBulkDelete = () => {
        if (selectedRowIds.length === 0) return;
        setConfirmDialog({
            isOpen: true,
            id: 'bulk',
            title: `Delete ${selectedRowIds.length} selected ${activeSubTab}(s)?`
        });
    };

    const handleExportSelected = () => {
        if (selectedRowIds.length === 0) return;
        const selectedItems = data.filter(item => selectedRowIds.includes(item.id));
        if (selectedItems.length === 0) return;

        const headers = Object.keys(selectedItems[0]).filter(k => typeof selectedItems[0][k] !== 'object' || selectedItems[0][k] === null);
        const csvRows = [];
        csvRows.push(headers.join(','));
        for (const item of selectedItems) {
            const values = headers.map(h => {
                const val = item[h] === null || item[h] === undefined ? '' : String(item[h]).replace(/"/g, '""');
                return `"${val}"`;
            });
            csvRows.push(values.join(','));
        }
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${activeSubTab.toLowerCase()}_selected_${selectedRowIds.length}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success(`Exported ${selectedRowIds.length} items to CSV`);
    };

    const filteredData = useMemo(() => {
        return data.filter(item => {
            if (activeSubTab === 'Exam Details') {
                const matchesSearch = item.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    item.code?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    (Array.isArray(item.session_names) ? item.session_names.some(s => s.toLowerCase().includes(debouncedSearch.toLowerCase())) : item.session_name?.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
                    item.exam_type_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    item.class_level_name?.toLowerCase().includes(debouncedSearch.toLowerCase());

                let matchesStatus = true;
                if (statusFilter === 'active') matchesStatus = item.is_active === true;
                if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

                const matchesSession = sessionFilter === 'all' || String(item.session) === String(sessionFilter);
                const matchesExamType = examTypeFilter === 'all' || String(item.exam_type) === String(examTypeFilter);
                const matchesClass = classFilter === 'all' || String(item.class_level) === String(classFilter);
                const matchesTarget = targetFilter === 'all' || 
                    (Array.isArray(item.target_exams) 
                        ? item.target_exams.some(te => String(te) === String(targetFilter))
                        : String(item.target_exam) === String(targetFilter));

                return matchesSearch && matchesStatus && matchesSession && matchesExamType && matchesClass && matchesTarget;
            }

            if (activeSubTab === 'Chapter') {
                const matchesSearch = (item.name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.subject_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.class_level_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.code?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());

                let matchesStatus = true;
                if (statusFilter === 'active') matchesStatus = item.is_active === true;
                if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

                const matchesClass = classFilter === 'all' || String(item.class_level) === String(classFilter);
                const matchesSubject = subjectFilter === 'all' || String(item.subject) === String(subjectFilter);

                return matchesSearch && matchesStatus && matchesClass && matchesSubject;
            }

            if (activeSubTab === 'SubTopic') {
                const matchesSearch = (item.name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.topic_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.code?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());

                let matchesStatus = true;
                if (statusFilter === 'active') matchesStatus = item.is_active === true;
                if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

                const matchesTopic = topicFilter === 'all' || String(item.topic) === String(topicFilter);

                return matchesSearch && matchesStatus && matchesTopic;
            }

            if (activeSubTab === 'Topic') {
                const matchesSearch = item.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    item.subject_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    item.chapter_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    item.class_level_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    item.code?.toLowerCase().includes(debouncedSearch.toLowerCase());

                let matchesStatus = true;
                if (statusFilter === 'active') matchesStatus = item.is_active === true;
                if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

                const matchesClass = classFilter === 'all' || String(item.class_level) === String(classFilter);
                const matchesSubject = subjectFilter === 'all' || String(item.subject) === String(subjectFilter);
                const matchesChapter = chapterFilter === 'all' || String(item.chapter) === String(chapterFilter);

                return matchesSearch && matchesStatus && matchesClass && matchesSubject && matchesChapter;
            }

            if (activeSubTab === 'Image') {
                const matchesSearch = (item.topic_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.subject_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.image?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());

                const matchesClass = classFilter === 'all' || String(item.class_level) === String(classFilter);
                const matchesSubject = subjectFilter === 'all' || String(item.subject) === String(subjectFilter);
                const matchesTopic = topicFilter === 'all' || String(item.topic) === String(topicFilter);
                const matchesExamType = examTypeFilter === 'all' || String(item.exam_type) === String(examTypeFilter);
                const matchesTarget = targetFilter === 'all' || String(item.target_exam) === String(targetFilter);

                return matchesSearch && matchesClass && matchesSubject && matchesTopic && matchesExamType && matchesTarget;
            }

            const matchesSearch = (item.name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                (item.code?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());

            let matchesStatus = true;
            if (statusFilter === 'active') matchesStatus = item.is_active === true;
            if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

            return matchesSearch && matchesStatus;
        });
    }, [data, debouncedSearch, statusFilter, activeSubTab, sessionFilter, classFilter, targetFilter, topicFilter, subjectFilter, examTypeFilter, chapterFilter]);

    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    const paginatedData = useMemo(() => {
        const start = (pageNumber - 1) * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, pageNumber, rowsPerPage]);

    const handleJumpPage = (e) => {
        e.preventDefault();
        const page = parseInt(jumpPage);
        if (page >= 1 && page <= totalPages) {
            setPageNumber(page);
        }
        setJumpPage('');
    };

    // Multi-Select Computed States & Handlers
    useEffect(() => {
        setSelectedRowIds([]);
    }, [activeSubTab, statusFilter, sessionFilter, classFilter, targetFilter, topicFilter, subjectFilter, examTypeFilter, chapterFilter]);

    const isAllPageSelected = useMemo(() => {
        if (paginatedData.length === 0) return false;
        return paginatedData.every(item => selectedRowIds.includes(item.id));
    }, [paginatedData, selectedRowIds]);

    const isSomePageSelected = useMemo(() => {
        if (paginatedData.length === 0) return false;
        return paginatedData.some(item => selectedRowIds.includes(item.id)) && !isAllPageSelected;
    }, [paginatedData, selectedRowIds, isAllPageSelected]);

    const handleToggleSelectAllPage = () => {
        if (isAllPageSelected) {
            const pageIds = paginatedData.map(i => i.id);
            setSelectedRowIds(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            const pageIds = paginatedData.map(i => i.id);
            setSelectedRowIds(prev => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    const handleSelectAllFiltered = () => {
        const allIds = filteredData.map(i => i.id);
        setSelectedRowIds(allIds);
    };

    const handleToggleRowSelect = (id, e) => {
        if (e) e.stopPropagation();
        setSelectedRowIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const renderHeader = () => (
        <div className={`p-6 rounded-[5px] border shadow-xl mb-6 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className={`p-3 rounded-[5px] border transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700'}`}
                            title="Go Back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase text-center md:text-left">
                            Master <span className="text-orange-500">Data</span>
                        </h2>
                        <p className={`text-sm font-medium text-center md:text-left ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Configure system-wide parameters and categories.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-center md:justify-start">
                    <div
                        ref={scrollRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        className={`flex items-center gap-1 p-1 rounded-[5px] border overflow-x-auto custom-scrollbar max-w-full cursor-grab active:cursor-grabbing select-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}
                    >
                        {subTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={(e) => {
                                    if (!dragged) {
                                        setActiveSubTab(tab.id);
                                    }
                                }}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === tab.id
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                                    : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-white'
                                    }`}
                            >
                                <tab.icon size={12} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderImageGallery = () => {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredData.map((img) => (
                    <div key={img.id || img._id} className={`group relative rounded-[5px] border overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className="aspect-square relative overflow-hidden bg-slate-900/5">
                            <img
                                src={img.image}
                                alt="Gallery item"
                                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => copyToClipboard(img.image)}
                                    className="p-2.5 bg-white text-slate-900 rounded-[5px] hover:scale-110 active:scale-95 transition-all shadow-xl"
                                    title="Copy Excel Link"
                                >
                                    <Copy size={18} />
                                </button>
                                <a
                                    href={img.image}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 bg-orange-600 text-white rounded-[5px] hover:scale-110 active:scale-95 transition-all shadow-xl"
                                    title="View Full Image"
                                >
                                    <ExternalLink size={18} />
                                </a>
                                <button
                                    onClick={() => handleDelete(img.id || img._id)}
                                    className="p-2.5 bg-red-600 text-white rounded-[5px] hover:scale-110 active:scale-95 transition-all shadow-xl"
                                    title="Delete Image"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest truncate max-w-[120px]">
                                    {img.subject_name || 'Unclassified'}
                                </span>
                                <span className="text-[9px] font-bold opacity-30 truncate">
                                    {new Date(img.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className={`text-[11px] font-bold truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {img.topic_name || (img.image?.split('/').pop())}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        if (activeSubTab === 'Section Management') {
            return <SectionRegistry />;
        }

        if (activeSubTab === 'Chapter Test Settings') {
            return <ChapterTestSettings />;
        }

        if (activeSubTab === 'Image') {
            return (
                <div className={`p-8 rounded-[5px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                    <div className="flex flex-col xl:flex-row justify-between items-center gap-3 mb-8">
                        <div className="relative w-full xl:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder={`Search Images...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-12 pr-4 py-3.5 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                            <input
                                type="file"
                                ref={mediaInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                multiple
                                accept="image/*"
                            />

                            {/* Class Filter */}
                            <div className="relative min-w-[120px]">
                                <button
                                    onClick={() => setIsClassFilterOpen(!isClassFilterOpen)}
                                    className={`w-full px-3 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center justify-between gap-2 ${classFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    <span className="truncate">{classLabel}</span>
                                    <ChevronDown size={14} className={`transition-transform ${isClassFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isClassFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-90" onClick={() => { setIsClassFilterOpen(false); setClassSearch(''); }} />
                                        <div className={`absolute top-full left-0 right-0 mt-2 z-100 rounded-[5px] border shadow-2xl overflow-hidden py-2 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search classes..."
                                                        value={classSearch}
                                                        onChange={(e) => setClassSearch(e.target.value)}
                                                        className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <div
                                                    onClick={() => { setClassFilter('all'); setIsClassFilterOpen(false); setClassSearch(''); }}
                                                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${classFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    All Classes {classFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                {classes.filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase())).map(c => (
                                                    <div
                                                        key={c.id || c._id}
                                                        onClick={() => { setClassFilter(c.id || c._id); setIsClassFilterOpen(false); setClassSearch(''); }}
                                                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${String(classFilter) === String(c.id || c._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                    >
                                                        {c.name} {String(classFilter) === String(c.id || c._id) && <Check size={14} strokeWidth={3} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Subject Filter */}
                            <div className="relative min-w-[120px]">
                                <button
                                    onClick={() => setIsSubjectFilterOpen(!isSubjectFilterOpen)}
                                    className={`w-full px-3 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center justify-between gap-2 ${subjectFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    <span className="truncate">{subjectLabel}</span>
                                    <ChevronDown size={14} className={`transition-transform ${isSubjectFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isSubjectFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-90" onClick={() => { setIsSubjectFilterOpen(false); setSubjectSearch(''); }} />
                                        <div className={`absolute top-full left-0 right-0 mt-2 z-100 rounded-[5px] border shadow-2xl overflow-hidden py-2 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search subjects..."
                                                        value={subjectSearch}
                                                        onChange={(e) => setSubjectSearch(e.target.value)}
                                                        className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <div
                                                    onClick={() => { setSubjectFilter('all'); setIsSubjectFilterOpen(false); setSubjectSearch(''); }}
                                                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${subjectFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    All Subjects {subjectFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                {subjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase())).map(s => (
                                                    <div
                                                        key={s.id || s._id}
                                                        onClick={() => { setSubjectFilter(s.id || s._id); setIsSubjectFilterOpen(false); setSubjectSearch(''); }}
                                                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${String(subjectFilter) === String(s.id || s._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                    >
                                                        {s.name} {String(subjectFilter) === String(s.id || s._id) && <Check size={14} strokeWidth={3} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Topic Filter */}
                            <div className="relative min-w-[120px]">
                                <button
                                    onClick={() => setIsTopicFilterOpen(!isTopicFilterOpen)}
                                    className={`w-full px-3 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center justify-between gap-2 ${topicFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    <span className="truncate">{topicLabel}</span>
                                    <ChevronDown size={14} className={`transition-transform ${isTopicFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isTopicFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-90" onClick={() => { setIsTopicFilterOpen(false); setTopicSearch(''); }} />
                                        <div className={`absolute top-full left-0 right-0 mt-2 z-100 rounded-[5px] border shadow-2xl overflow-hidden py-2 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search topics..."
                                                        value={topicSearch}
                                                        onChange={(e) => setTopicSearch(e.target.value)}
                                                        className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <div
                                                    onClick={() => { setTopicFilter('all'); setIsTopicFilterOpen(false); setTopicSearch(''); }}
                                                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${topicFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    All Topics {topicFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                {topics.filter(t =>
                                                    (classFilter === 'all' || String(t.class_level || t.class_level_id) === String(classFilter)) &&
                                                    (subjectFilter === 'all' || String(t.subject || t.subject_id) === String(subjectFilter)) &&
                                                    (t.name.toLowerCase().includes(topicSearch.toLowerCase()))
                                                ).map(t => (
                                                    <div
                                                        key={t.id || t._id}
                                                        onClick={() => { setTopicFilter(t.id || t._id); setIsTopicFilterOpen(false); setTopicSearch(''); }}
                                                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${String(topicFilter) === String(t.id || t._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                    >
                                                        {t.name} {String(topicFilter) === String(t.id || t._id) && <Check size={14} strokeWidth={3} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Exam Type Filter */}
                            <div className="relative min-w-[120px]">
                                <button
                                    onClick={() => setIsExamTypeFilterOpen(!isExamTypeFilterOpen)}
                                    className={`w-full px-3 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center justify-between gap-2 ${examTypeFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    <span className="truncate">{examTypeLabel}</span>
                                    <ChevronDown size={14} className={`transition-transform ${isExamTypeFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isExamTypeFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-90" onClick={() => { setIsExamTypeFilterOpen(false); setExamTypeSearch(''); }} />
                                        <div className={`absolute top-full left-0 right-0 mt-2 z-100 rounded-[5px] border shadow-2xl overflow-hidden py-2 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search types..."
                                                        value={examTypeSearch}
                                                        onChange={(e) => setExamTypeSearch(e.target.value)}
                                                        className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <div
                                                    onClick={() => { setExamTypeFilter('all'); setIsExamTypeFilterOpen(false); setExamTypeSearch(''); }}
                                                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${examTypeFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    All Types {examTypeFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                {examTypes.filter(et => et.name.toLowerCase().includes(examTypeSearch.toLowerCase())).map(et => (
                                                    <div
                                                        key={et.id || et._id}
                                                        onClick={() => { setExamTypeFilter(et.id || et._id); setIsExamTypeFilterOpen(false); setExamTypeSearch(''); }}
                                                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${String(examTypeFilter) === String(et.id || et._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                    >
                                                        {et.name} {String(examTypeFilter) === String(et.id || et._id) && <Check size={14} strokeWidth={3} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Target Filter */}
                            <div className="relative min-w-[120px]">
                                <button
                                    onClick={() => setIsTargetFilterOpen(!isTargetFilterOpen)}
                                    className={`w-full px-3 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center justify-between gap-2 ${targetFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    <span className="truncate">{targetFilterLabel}</span>
                                    <ChevronDown size={14} className={`transition-transform ${isTargetFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isTargetFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-90" onClick={() => { setIsTargetFilterOpen(false); setTargetSearch(''); }} />
                                        <div className={`absolute top-full left-0 right-0 mt-2 z-100 rounded-[5px] border shadow-2xl overflow-hidden py-2 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search targets..."
                                                        value={targetSearch}
                                                        onChange={(e) => setTargetSearch(e.target.value)}
                                                        className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <div
                                                    onClick={() => { setTargetFilter('all'); setIsTargetFilterOpen(false); setTargetSearch(''); }}
                                                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${targetFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    All Targets {targetFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                {targetExams.filter(te => te.name.toLowerCase().includes(targetSearch.toLowerCase())).map(te => (
                                                    <div
                                                        key={te.id || te._id}
                                                        onClick={() => { setTargetFilter(te.id || te._id); setIsTargetFilterOpen(false); setTargetSearch(''); }}
                                                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${String(targetFilter) === String(te.id || te._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                    >
                                                        {te.name} {String(targetFilter) === String(te.id || te._id) && <Check size={14} strokeWidth={3} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={handleCreate}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-600/30 active:scale-95 ml-auto"
                            >
                                <CloudUpload size={16} strokeWidth={3} />
                                Upload To Gallery
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-24 flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                            <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em]">Loading Gallery...</p>
                        </div>
                    ) : filteredData.length > 0 ? (
                        renderImageGallery()
                    ) : (
                        <div className="py-24 flex flex-col items-center justify-center space-y-4 opacity-20">
                            <ImageIcon size={64} />
                            <p className="font-black uppercase tracking-[0.2em] text-sm">Media Gallery is Empty</p>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className={`p-6 rounded-[5px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col xl:flex-row justify-between items-center gap-3 mb-6">
                    <div className="relative w-full xl:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={`Search ${activeSubTab}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3.5 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                                }`}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full xl:w-auto">
                        {(activeSubTab === 'Exam Details' || activeSubTab === 'Chapter' || activeSubTab === 'Topic' || activeSubTab === 'SubTopic') && (
                            <>
                                {activeSubTab === 'Exam Details' && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsSessionFilterOpen(!isSessionFilterOpen)}
                                            className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${sessionFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                        >
                                            {sessionLabel}
                                            <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isSessionFilterOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isSessionFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-140" onClick={() => { setIsSessionFilterOpen(false); setSessionSearch(''); }} />
                                                <div className={`absolute left-0 top-full mt-2 w-48 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                    <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                        <div className="relative">
                                                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search sessions..."
                                                                value={sessionSearch}
                                                                onChange={(e) => setSessionSearch(e.target.value)}
                                                                className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                        <button
                                                            onClick={() => { setSessionFilter('all'); setClassFilter('all'); setTargetFilter('all'); setExamTypeFilter('all'); setIsSessionFilterOpen(false); setSessionSearch(''); }}
                                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${sessionFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            All Sessions {sessionFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                        </button>
                                                        {availableSessionsForFilter.filter(s => s.name.toLowerCase().includes(sessionSearch.toLowerCase())).map(s => (
                                                            <button
                                                                key={s.id}
                                                                onClick={() => { setSessionFilter(s.id); setClassFilter('all'); setTargetFilter('all'); setExamTypeFilter('all'); setIsSessionFilterOpen(false); setSessionSearch(''); }}
                                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${String(sessionFilter) === String(s.id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                {s.name} {String(sessionFilter) === String(s.id) && <Check size={14} strokeWidth={3} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Class Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsClassFilterOpen(!isClassFilterOpen)}
                                        className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${classFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                    >
                                        {classLabel}
                                        <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isClassFilterOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isClassFilterOpen && (
                                        <>
                                            <div className="fixed inset-0 z-140" onClick={() => { setIsClassFilterOpen(false); setClassSearch(''); }} />
                                            <div className={`absolute left-0 top-full mt-2 w-48 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                    <div className="relative">
                                                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search classes..."
                                                            value={classSearch}
                                                            onChange={(e) => setClassSearch(e.target.value)}
                                                            className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                    <button
                                                        onClick={() => { setClassFilter('all'); setTargetFilter('all'); setExamTypeFilter('all'); setIsClassFilterOpen(false); setClassSearch(''); }}
                                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${classFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        All Classes {classFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                    </button>
                                                    {(activeSubTab === 'Exam Details' ? availableClassesForFilter : classes).filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase())).map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => { setClassFilter(c.id); setTargetFilter('all'); setExamTypeFilter('all'); setIsClassFilterOpen(false); setClassSearch(''); }}
                                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${String(classFilter) === String(c.id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            {c.name} {String(classFilter) === String(c.id) && <Check size={14} strokeWidth={3} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {(activeSubTab === 'Exam Details' || activeSubTab === 'Chapter' || activeSubTab === 'Topic') && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsSubjectFilterOpen(!isSubjectFilterOpen)}
                                            className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${subjectFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                        >
                                            {subjectLabel}
                                            <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isSubjectFilterOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isSubjectFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-140" onClick={() => { setIsSubjectFilterOpen(false); setSubjectSearch(''); }} />
                                                <div className={`absolute left-0 top-full mt-2 w-48 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                    <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                        <div className="relative">
                                                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search subjects..."
                                                                value={subjectSearch}
                                                                onChange={(e) => setSubjectSearch(e.target.value)}
                                                                className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                        <button
                                                            onClick={() => { setSubjectFilter('all'); setIsSubjectFilterOpen(false); setSubjectSearch(''); }}
                                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${subjectFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            All Subjects {subjectFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                        </button>
                                                        {subjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase())).map(s => (
                                                            <button
                                                                key={s.id || s._id}
                                                                onClick={() => { setSubjectFilter(s.id || s._id); setIsSubjectFilterOpen(false); setSubjectSearch(''); }}
                                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${String(subjectFilter) === String(s.id || s._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                {s.name} {String(subjectFilter) === String(s.id || s._id) && <Check size={14} strokeWidth={3} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {activeSubTab === 'Topic' && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsChapterFilterOpen(!isChapterFilterOpen)}
                                            className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${chapterFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                        >
                                            {chapterLabel}
                                            <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isChapterFilterOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isChapterFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-140" onClick={() => { setIsChapterFilterOpen(false); setChapterSearch(''); }} />
                                                <div className={`absolute left-0 top-full mt-2 w-56 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                    <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                        <div className="relative">
                                                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search chapters..."
                                                                value={chapterSearch}
                                                                onChange={(e) => setChapterSearch(e.target.value)}
                                                                className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                        <button
                                                            onClick={() => { setChapterFilter('all'); setIsChapterFilterOpen(false); setChapterSearch(''); }}
                                                            className={`w-full flex items-center justify-between px-2 py-2 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${chapterFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            All Chapters {chapterFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                        </button>
                                                        {chapters.filter(c =>
                                                            (classFilter === 'all' || String(c.class_level) === String(classFilter)) &&
                                                            (subjectFilter === 'all' || String(c.subject) === String(subjectFilter)) &&
                                                            (c.name.toLowerCase().includes(chapterSearch.toLowerCase()))
                                                        ).map(c => (
                                                            <button
                                                                key={c.id || c._id}
                                                                onClick={() => { setChapterFilter(c.id || c._id); setIsChapterFilterOpen(false); setChapterSearch(''); }}
                                                                className={`w-full flex items-center justify-between px-2 py-2 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all text-left ${String(chapterFilter) === String(c.id || c._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                <span className="truncate mr-2">{c.name}</span> {String(chapterFilter) === String(c.id || c._id) && <Check size={14} strokeWidth={3} className="shrink-0" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {activeSubTab === 'Exam Details' && (
                                    <>
                                        {/* Target Dropdown */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsTargetFilterOpen(!isTargetFilterOpen)}
                                                className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${targetFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                            >
                                                {targetFilterLabel}
                                                <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isTargetFilterOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isTargetFilterOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-140" onClick={() => { setIsTargetFilterOpen(false); setTargetSearch(''); }} />
                                                    <div className={`absolute left-0 top-full mt-2 w-48 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                        <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                            <div className="relative">
                                                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search targets..."
                                                                    value={targetSearch}
                                                                    onChange={(e) => setTargetSearch(e.target.value)}
                                                                    className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                            <button
                                                                onClick={() => { setTargetFilter('all'); setExamTypeFilter('all'); setIsTargetFilterOpen(false); setTargetSearch(''); }}
                                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${targetFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                All Targets {targetFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                            </button>
                                                            {availableTargetsForFilter.filter(t => t.name.toLowerCase().includes(targetSearch.toLowerCase())).map(t => (
                                                                <button
                                                                    key={t.id}
                                                                    onClick={() => { setTargetFilter(t.id); setExamTypeFilter('all'); setIsTargetFilterOpen(false); setTargetSearch(''); }}
                                                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${String(targetFilter) === String(t.id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                                >
                                                                    {t.name} {String(targetFilter) === String(t.id) && <Check size={14} strokeWidth={3} />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Exam Type Dropdown */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsExamTypeFilterOpen(!isExamTypeFilterOpen)}
                                                className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${examTypeFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                            >
                                                {examTypeLabel}
                                                <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isExamTypeFilterOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isExamTypeFilterOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-140" onClick={() => { setIsExamTypeFilterOpen(false); setExamTypeSearch(''); }} />
                                                    <div className={`absolute left-0 top-full mt-2 w-48 z-150 p-3 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                        <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                            <div className="relative">
                                                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search types..."
                                                                    value={examTypeSearch}
                                                                    onChange={(e) => setExamTypeSearch(e.target.value)}
                                                                    className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                            <button
                                                                onClick={() => { setExamTypeFilter('all'); setIsExamTypeFilterOpen(false); setExamTypeSearch(''); }}
                                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${examTypeFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                All Types {examTypeFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                            </button>
                                                            {availableTypesForFilter.filter(et => et.name.toLowerCase().includes(examTypeSearch.toLowerCase())).map(et => (
                                                                <button
                                                                    key={et.id}
                                                                    onClick={() => { setExamTypeFilter(et.id); setIsExamTypeFilterOpen(false); setExamTypeSearch(''); }}
                                                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${String(examTypeFilter) === String(et.id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                                >
                                                                    {et.name} {String(examTypeFilter) === String(et.id) && <Check size={14} strokeWidth={3} />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                        {/* SubTopic: Topic Filter */}
                        {activeSubTab === 'SubTopic' && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsTopicFilterOpen(!isTopicFilterOpen)}
                                    className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${topicFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    {topicFilter === 'all' ? 'Select Topic...' : topics.find(t => String(t.id) === String(topicFilter))?.name || 'Select Topic...'}
                                    <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isTopicFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isTopicFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-140" onClick={() => { setIsTopicFilterOpen(false); setTopicSearch(''); }} />
                                        <div className={`absolute left-0 top-full mt-2 w-56 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search topics..."
                                                        value={topicSearch}
                                                        onChange={(e) => setTopicSearch(e.target.value)}
                                                        className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <button
                                                    onClick={() => {
                                                        setTopicFilter('all');
                                                        setIsTopicFilterOpen(false);
                                                        setTopicSearch('');
                                                        setData([]);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-2 py-2 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${topicFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    All Topics {topicFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                </button>
                                                {topics.filter(t => t.name.toLowerCase().includes(topicSearch.toLowerCase())).map(t => (
                                                    <button
                                                        key={t.id || t._id}
                                                        onClick={() => {
                                                            const id = t.id || t._id;
                                                            setTopicFilter(id);
                                                            setIsTopicFilterOpen(false);
                                                            setTopicSearch('');
                                                            fetchData(true, id);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-2 py-2 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all text-left ${String(topicFilter) === String(t.id || t._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        <span className="truncate mr-2">{t.name}</span> {String(topicFilter) === String(t.id || t._id) && <Check size={14} strokeWidth={3} className="shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {/* Filter Button & Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[5px] border font-black text-[10px] uppercase tracking-widest transition-all ${statusFilter !== 'all'
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-500'
                                    : isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Filter size={16} className={statusFilter !== 'all' ? 'animate-pulse' : ''} />
                                {statusFilter === 'all' ? 'Filter' : `${statusFilter}`}
                                <ChevronDown size={14} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-140" onClick={() => setIsFilterOpen(false)} />
                                    <div className={`absolute right-0 top-full mt-3 w-56 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'
                                        }`}>
                                        {[
                                            { id: 'all', label: 'All Status' },
                                            { id: 'active', label: 'Active Only' },
                                            { id: 'inactive', label: 'Inactive Only' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => {
                                                    setStatusFilter(opt.id);
                                                    setIsFilterOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-[5px] text-xs font-bold transition-all ${statusFilter === opt.id
                                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                    : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {opt.label}
                                                {statusFilter === opt.id && <Check size={14} strokeWidth={3} />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => fetchData(true)}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-[5px] border font-black text-[10px] uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            title="Fast Refresh (Bypass Cache)"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>

                        {(activeSubTab === 'Target Exam' || activeSubTab === 'Session' || activeSubTab === 'Class') ? (
                            <button
                                onClick={handleSyncERP}
                                disabled={isSyncing}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30 active:scale-95 ${isSyncing ? 'opacity-50' : ''}`}
                            >
                                {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                Sync with ERP
                            </button>
                        ) : (
                            <button
                                onClick={handleCreate}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-600/30 active:scale-95"
                            >
                                <Plus size={16} strokeWidth={3} />
                                Add New {activeSubTab}
                            </button>
                        )}

                        {activeSubTab !== 'Section Management' && activeSubTab !== 'Chapter Test Settings' && activeSubTab !== 'Image' && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExport}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-[5px] border font-black text-[10px] uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    title="Export All to CSV"
                                >
                                    <Download size={16} />
                                    Export
                                </button>
                                <button
                                    onClick={() => setShowBulkModal(true)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-[5px] border font-black text-[10px] uppercase tracking-widest transition-all ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'}`}
                                >
                                    <Upload size={16} />
                                    Import
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="animate-pulse">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                                        <th className="pb-4 px-3 w-10 text-center"><div className={`h-4 w-4 mx-auto rounded ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>
                                        {activeSubTab === 'Exam Details' ? (
                                            <>
                                                <th className="pb-4 px-4"><div className={`h-3 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <th key={i} className="pb-4 px-4"><div className={`h-3 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>)}
                                            </>
                                        ) : activeSubTab === 'Chapter' || activeSubTab === 'Topic' ? (
                                            <>
                                                <th className="pb-4 px-4"><div className={`h-3 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>
                                                {[1, 2, 3, 4, 5].map(i => <th key={i} className="pb-4 px-4"><div className={`h-3 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>)}
                                            </>
                                        ) : (
                                            <>
                                                <th className="pb-4 px-4"><div className={`h-3 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>
                                                {[1, 2, 3].map(i => <th key={i} className="pb-4 px-4"><div className={`h-3 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>)}
                                            </>
                                        )}
                                        <th className="pb-4 px-4"><div className={`h-3 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>
                                        <th className="pb-4 px-4"><div className={`h-3 w-16 ml-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-transparent">
                                    {[1, 2, 3, 4, 5].map((row) => (
                                        <tr key={row}>
                                            <td className="py-5 px-3 w-10 text-center"><div className={`h-4 w-4 mx-auto rounded ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            {activeSubTab === 'Exam Details' ? (
                                                <>
                                                    <td className="py-5 px-4"><div className={`h-4 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-12 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-10 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                </>
                                            ) : activeSubTab === 'Chapter' || activeSubTab === 'Topic' ? (
                                                <>
                                                    <td className="py-5 px-4"><div className={`h-4 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-40 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-12 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="py-5 px-4"><div className={`h-4 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                            <div className={`h-4 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                        </div>
                                                    </td>
                                                    {activeSubTab === 'Exam Type' && <td className="py-5 px-4"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>}
                                                    <td className="py-5 px-4"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                </>
                                            )}
                                            <td className="py-5 px-4"><div className={`h-6 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-5 px-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <div className={`h-8 w-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                    <div className={`h-8 w-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : error ? (
                        <div className="py-24 flex flex-col items-center justify-center space-y-4 text-red-500">
                            <Database size={48} className="opacity-20" />
                            <p className="font-bold">{error}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                    <th className="pb-4 px-3 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={isAllPageSelected}
                                            ref={el => { if (el) el.indeterminate = isSomePageSelected; }}
                                            onChange={handleToggleSelectAllPage}
                                            className="w-4 h-4 rounded border cursor-pointer accent-orange-500"
                                            title="Select all on this page"
                                        />
                                    </th>
                                    {activeSubTab === 'Exam Details' ? (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">Exam Title</th>
                                            <th className="pb-4 px-4 font-black">Code</th>
                                            <th className="pb-4 px-4 font-black">Session</th>
                                            <th className="pb-4 px-4 font-black text-center">Class</th>
                                            <th className="pb-4 px-4 font-black">Target</th>
                                            <th className="pb-4 px-4 font-black">Exam Type</th>
                                            <th className="pb-4 px-4 font-black text-center">Marks</th>
                                            <th className="pb-4 px-4 font-black text-center">Duration</th>
                                        </>
                                    ) : activeSubTab === 'Chapter' ? (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">Chapter Name</th>
                                            <th className="pb-4 px-4 font-black text-center">Class</th>
                                            <th className="pb-4 px-4 font-black">Subject</th>
                                            <th className="pb-4 px-4 font-black">Code</th>
                                        </>
                                    ) : activeSubTab === 'SubTopic' ? (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">SubTopic Name</th>
                                            <th className="pb-4 px-4 font-black text-center">Topic</th>
                                            <th className="pb-4 px-4 font-black">Code</th>
                                        </>
                                    ) : activeSubTab === 'Topic' ? (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">Topic Name</th>
                                            <th className="pb-4 px-4 font-black text-center">Class</th>
                                            <th className="pb-4 px-4 font-black">Subject</th>
                                            <th className="pb-4 px-4 font-black">Chapter</th>
                                            <th className="pb-4 px-4 font-black">Sub-topic</th>
                                            <th className="pb-4 px-4 font-black">Code</th>
                                        </>
                                    ) : activeSubTab === 'Teacher' ? (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">Teacher Name</th>
                                            <th className="pb-4 px-4 font-black">Subject</th>
                                            <th className="pb-4 px-4 font-black">Email</th>
                                            <th className="pb-4 px-4 font-black">Phone</th>
                                            <th className="pb-4 px-4 font-black">Qualification</th>
                                        </>
                                    ) : activeSubTab === 'Psychometric Traits' ? (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">Trait Name</th>
                                            <th className="pb-4 px-4 font-black">Description</th>
                                            <th className="pb-4 px-4 font-black text-center">Order</th>
                                        </>
                                    ) : activeSubTab === 'Psychometric Questions' ? (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">Question Text</th>
                                            <th className="pb-4 px-4 font-black">Trait</th>
                                            <th className="pb-4 px-4 font-black text-center">Order</th>
                                            <th className="pb-4 px-4 font-black text-center">Reverse Scored</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">Name / Title</th>
                                            {activeSubTab === 'Exam Type' && <th className="pb-4 px-4 font-black">Target</th>}
                                            <th className="pb-4 px-4 font-black">Code</th>
                                        </>
                                    )}
                                    <th className="pb-4 px-4 font-black">Uploaded / Edited</th>
                                    <th className="pb-4 px-4 font-black text-center">Status</th>
                                    <th className="pb-4 px-4 text-right font-black">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-transparent">
                                {paginatedData.length > 0 ? paginatedData.map((item, index) => {
                                    const isSelected = selectedRowIds.includes(item.id);
                                    return (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => handleToggleRowSelect(item.id)}
                                        className={`group cursor-pointer transition-colors ${
                                            isSelected 
                                                ? (isDarkMode ? 'bg-orange-500/15 border-l-4 border-orange-500' : 'bg-orange-50/90 border-l-4 border-orange-500') 
                                                : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50')
                                        }`}
                                    >
                                        <td className="py-5 px-3 w-10 text-center" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={e => handleToggleRowSelect(item.id, e)}
                                                className="w-4 h-4 rounded border cursor-pointer accent-orange-500"
                                            />
                                        </td>
                                        <td className="py-5 px-4 font-bold opacity-30 text-xs">{index + 1 + (pageNumber - 1) * rowsPerPage}</td>
                                        {activeSubTab === 'Exam Details' ? (
                                            <>
                                                <td className="py-5 px-4">
                                                    <span className="font-extrabold text-sm">{item.name}</span>
                                                </td>
                                                <td className="py-5 px-4 text-xs font-bold opacity-70">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        {item.code}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-extrabold text-xs">
                                                            {Array.isArray(item.session_names) && item.session_names.length > 0 
                                                                ? (item.session_names.length > 2 
                                                                    ? `${item.session_names.slice(0, 2).join(', ')} + ${item.session_names.length - 2}`
                                                                    : item.session_names.join(', '))
                                                                : (item.session_name || '-')}
                                                        </span>
                                                        <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider">Academic Year</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <span className="font-bold text-sm tracking-tight">
                                                        {Array.isArray(item.class_level_names) && item.class_level_names.length > 0
                                                            ? (item.class_level_names.length > 2
                                                                ? `${item.class_level_names.slice(0, 2).join(', ')} + ${item.class_level_names.length - 2}`
                                                                : item.class_level_names.join(', '))
                                                            : (item.class_level_name || '-')}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                        {Array.isArray(item.target_exam_names) && item.target_exam_names.length > 0 
                                                            ? (item.target_exam_names.length > 3 
                                                                ? `${item.target_exam_names.slice(0, 3).join(', ')} + ${item.target_exam_names.length - 3}`
                                                                : item.target_exam_names.join(', '))
                                                            : (typeof item.target_exam_names === 'string' ? item.target_exam_names : '-')}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        {item.exam_type_name}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <span className="font-bold text-sm tracking-tight">{item.total_marks || 0}</span>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5 font-black text-xs">
                                                        <Clock size={14} className="text-orange-500" />
                                                        {item.duration}m
                                                    </div>
                                                </td>
                                            </>
                                        ) : activeSubTab === 'Chapter' ? (
                                            <>
                                                <td className="py-5 px-4">
                                                    <span className="font-extrabold text-sm uppercase">{item.name}</span>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <span className="font-bold text-sm tracking-tight">{item.class_level_name || '-'}</span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                        {item.subject_name || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4 text-xs font-bold opacity-70">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        {item.code}
                                                    </span>
                                                </td>
                                            </>
                                        ) : activeSubTab === 'SubTopic' ? (
                                            <>
                                                <td className="py-5 px-4">
                                                    <span className="font-extrabold text-sm uppercase">{item.name}</span>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <span className="font-bold text-sm tracking-tight">{item.topic_name || '-'}</span>
                                                </td>
                                                <td className="py-5 px-4 text-xs font-bold opacity-70">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        {item.code}
                                                    </span>
                                                </td>
                                            </>
                                        ) : activeSubTab === 'Topic' ? (
                                            <>
                                                <td className="py-5 px-4">
                                                    <span className="font-extrabold text-sm uppercase">{item.name}</span>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <span className="font-bold text-sm tracking-tight">{item.class_level_name || '-'}</span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                        {item.subject_name || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-xs font-bold opacity-80">{item.chapter_name || '-'}</span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-xs font-bold opacity-80">{item.sub_topic || '-'}</span>
                                                </td>
                                                <td className="py-5 px-4 text-xs font-bold opacity-70">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        {item.code}
                                                    </span>
                                                </td>
                                            </>
                                        ) : activeSubTab === 'Teacher' ? (
                                            <>
                                                <td className="py-5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-xs">
                                                            {item.name.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-sm">{item.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                        {item.subject_name || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4 text-xs font-bold opacity-70">{item.email || '-'}</td>
                                                <td className="py-5 px-4 text-xs font-bold opacity-70">{item.phone || '-'}</td>
                                                <td className="py-5 px-4 text-xs font-bold opacity-70">{item.qualification || '-'}</td>
                                            </>
                                        ) : activeSubTab === 'Psychometric Traits' ? (
                                            <>
                                                <td className="py-5 px-4">
                                                    <span className="font-extrabold text-sm">{item.name}</span>
                                                </td>
                                                <td className="py-5 px-4 text-xs opacity-70 font-medium max-w-xs truncate">
                                                    {item.description || '-'}
                                                </td>
                                                <td className="py-5 px-4 text-center font-black text-xs">
                                                    {item.order}
                                                </td>
                                            </>
                                        ) : activeSubTab === 'Psychometric Questions' ? (
                                            <>
                                                <td className="py-5 px-4">
                                                    <span className="font-bold text-sm">{item.question_text}</span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-xs font-bold opacity-80">{item.trait_name || '-'}</span>
                                                </td>
                                                <td className="py-5 px-4 text-center font-black text-xs">
                                                    {item.order}
                                                </td>
                                                <td className="py-5 px-4 text-center font-bold text-xs">
                                                    {item.is_reverse ? (
                                                        <span className="text-amber-500">Yes</span>
                                                    ) : (
                                                        <span className="opacity-40">No</span>
                                                    )}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="py-5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center font-bold text-xs border transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-orange-900/10 text-orange-500 border-white/5' : 'bg-orange-50 text-orange-600 border-orange-100'
                                                            }`}>
                                                            {activeSubTab.charAt(0)}
                                                        </div>
                                                        <span className={`font-bold text-sm ${activeSubTab === 'Subject' ? 'uppercase' : ''}`}>{item.name}</span>
                                                    </div>
                                                </td>
                                                {activeSubTab === 'Exam Type' && (
                                                    <td className="py-5 px-4">
                                                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                            {Array.isArray(item.target_exam_names) && item.target_exam_names.length > 0 
                                                                ? (item.target_exam_names.length > 3 
                                                                    ? `${item.target_exam_names.slice(0, 3).join(', ')} + ${item.target_exam_names.length - 3}`
                                                                    : item.target_exam_names.join(', '))
                                                                : (typeof item.target_exam_names === 'string' ? item.target_exam_names : '-')}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="py-5 px-4 text-sm font-bold opacity-70">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {item.code}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        <td className="py-5 px-4">
                                            <div className="flex flex-col text-[11px] leading-tight">
                                                <span className="font-bold text-xs flex items-center gap-1">
                                                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{item.updated_by || item.created_by || 'Admin'}</span>
                                                </span>
                                                <span className="text-[10px] opacity-40 font-mono mt-0.5 whitespace-nowrap">
                                                    {item.updated_at 
                                                        ? new Date(item.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                        : (item.created_at 
                                                            ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                                                            : '—')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => handleToggleStatus(item)}
                                                    disabled={isActionLoading || activeSubTab === 'Target Exam' || activeSubTab === 'Session' || activeSubTab === 'Class'}
                                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-[9px] font-black uppercase border transition-all ${activeSubTab !== 'Target Exam' && activeSubTab !== 'Session' && activeSubTab !== 'Class' ? 'hover:scale-105 active:scale-95' : 'cursor-not-allowed opacity-70'} ${item.is_active
                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                        }`}
                                                >
                                                    {item.is_active ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                                                    {item.is_active ? 'Active' : 'Inactive'}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                {activeSubTab === 'Chapter' && (
                                                    <button
                                                        onClick={() => handleAddToLibrary(item)}
                                                        className={`p-2 rounded-[5px] transition-all hover:scale-110 ${isDarkMode ? 'bg-orange-500/10 text-orange-400 hover:text-white hover:bg-orange-500' : 'bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white'}`}
                                                        title="Quick Add to Library"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                )}
                                                {activeSubTab !== 'Target Exam' && activeSubTab !== 'Session' && activeSubTab !== 'Class' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className={`p-2 rounded-[5px] transition-all hover:scale-110 ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white'}`}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            disabled={isActionLoading}
                                                            className={`p-2 rounded-[5px] transition-all hover:scale-110 ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white'}`}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={
                                            activeSubTab === 'Exam Details' ? 13 :
                                                activeSubTab === 'Topic' ? 11 :
                                                    activeSubTab === 'Teacher' ? 10 :
                                                        activeSubTab === 'Chapter' ? 9 :
                                                            activeSubTab === 'Exam Type' ? 8 :
                                                                activeSubTab === 'SubTopic' ? 8 : 7
                                        } className="py-24 text-center">
                                            <div className="flex flex-col items-center opacity-20">
                                                <Database size={48} className="mb-4" />
                                                <p className="font-black uppercase tracking-[0.2em] text-sm">No Records Found</p>
                                                <p className="text-xs mt-1">Try adjusting your search or add a new entry.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                {!isLoading && !error && filteredData.length > 0 && (
                    <div className={`p-4 border-t flex flex-col md:flex-row items-center justify-between gap-4 ${isDarkMode ? 'border-white/5 bg-[#1A1F2B]/50' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Rows per page:</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setPageNumber(1);
                                    }}
                                    className={`p-1.5 rounded border text-xs font-bold outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                >
                                    {[10, 20, 50, 100].map(val => (
                                        <option key={val} value={val}>{val}</option>
                                    ))}
                                </select>
                            </div>
                            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Showing {(pageNumber - 1) * rowsPerPage + 1} to {Math.min(pageNumber * rowsPerPage, filteredData.length)} of {filteredData.length}
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <form onSubmit={handleJumpPage} className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Jump to:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    value={jumpPage}
                                    onChange={(e) => setJumpPage(e.target.value)}
                                    placeholder={pageNumber}
                                    className={`w-12 p-1.5 rounded border text-xs font-bold text-center outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500' : 'bg-white border-slate-200 text-slate-700 focus:border-orange-500'}`}
                                />
                            </form>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                                    disabled={pageNumber === 1}
                                    className={`px-3 py-1.5 rounded border text-xs font-bold transition-all ${pageNumber === 1 ? 'opacity-50 cursor-not-allowed' : isDarkMode ? 'hover:bg-white/5 border-white/10' : 'hover:bg-slate-100 border-slate-200'}`}
                                >
                                    Prev
                                </button>
                                <div className={`px-3 py-1.5 rounded text-xs font-black ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                    {pageNumber} / {totalPages}
                                </div>
                                <button
                                    onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))}
                                    disabled={pageNumber === totalPages}
                                    className={`px-3 py-1.5 rounded border text-xs font-bold transition-all ${pageNumber === totalPages ? 'opacity-50 cursor-not-allowed' : isDarkMode ? 'hover:bg-white/5 border-white/10' : 'hover:bg-slate-100 border-slate-200'}`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderFloatingActionBar = () => {
        if (selectedRowIds.length === 0) return null;
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
                >
                    <div className={`pointer-events-auto flex flex-wrap items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl ${
                        isDarkMode ? 'bg-[#0F131A]/90 border-white/10 text-white shadow-black/80' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/60'
                    }`}>
                        {/* Selection info */}
                        <div className="flex items-center gap-2.5 pr-3 border-r border-slate-200 dark:border-white/10">
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-500 text-white font-black text-xs">
                                {selectedRowIds.length}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-wider">Selected</span>
                                {selectedRowIds.length < filteredData.length && (
                                    <button
                                        onClick={handleSelectAllFiltered}
                                        className="text-[9px] font-bold text-orange-500 hover:underline text-left cursor-pointer"
                                    >
                                        Select all {filteredData.length}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick actions */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => handleBulkStatusChange(true)}
                                disabled={isActionLoading}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                                    isDarkMode ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}
                                title="Set selected items as Active"
                            >
                                <CheckCircle2 size={14} />
                                Set Active
                            </button>

                            <button
                                onClick={() => handleBulkStatusChange(false)}
                                disabled={isActionLoading}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                                    isDarkMode ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30' : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                }`}
                                title="Set selected items as Inactive"
                            >
                                <XCircle size={14} />
                                Set Inactive
                            </button>

                            {activeSubTab !== 'Target Exam' && activeSubTab !== 'Session' && activeSubTab !== 'Class' && activeSubTab !== 'Image' && (
                                <button
                                    onClick={() => setIsBulkEditModalOpen(true)}
                                    disabled={isActionLoading}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase tracking-wider shadow-lg shadow-orange-600/30 transition-all active:scale-95 cursor-pointer"
                                    title="Edit fields across all selected items"
                                >
                                    <SlidersHorizontal size={14} />
                                    Bulk Edit
                                </button>
                            )}

                            <button
                                onClick={handleExportSelected}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider border transition-all ${
                                    isDarkMode ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                                }`}
                                title="Export selected rows as CSV"
                            >
                                <Download size={14} />
                                Export
                            </button>

                            {activeSubTab !== 'Target Exam' && activeSubTab !== 'Session' && activeSubTab !== 'Class' && (
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={isActionLoading}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 font-black text-[10px] uppercase tracking-wider transition-all"
                                    title="Delete selected items"
                                >
                                    <Trash2 size={14} />
                                    Delete
                                </button>
                            )}
                        </div>

                        {/* Deselect / Close */}
                        <button
                            onClick={() => setSelectedRowIds([])}
                            className={`p-2 rounded-xl ml-1 transition-all ${isDarkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
                            title="Clear selection"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    };

    const renderBulkEditModal = () => {
        if (!isBulkEditModalOpen) return null;
        return (
            <AnimatePresence>
                <div className="fixed inset-0 z-2000 flex items-start justify-center p-6 pt-24 backdrop-blur-md bg-black/70">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className={`relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
                            isDarkMode ? 'bg-[#0F131A] border-white/10' : 'bg-white border-slate-200'
                        }`}
                    >
                        <form onSubmit={handleBulkEditSubmit} className="p-6 space-y-5">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-orange-500 rounded-xl text-white">
                                        <SlidersHorizontal size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-tight">Bulk Edit ({selectedRowIds.length} {activeSubTab}s)</h3>
                                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-0.5">Select fields to batch update across all selected items</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setIsBulkEditModalOpen(false)} className={`p-2 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                                {/* Status Update */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Status</label>
                                    <select
                                        value={bulkEditFields.is_active}
                                        onChange={(e) => setBulkEditFields({ ...bulkEditFields, is_active: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none transition-all ${
                                            isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500'
                                        }`}
                                    >
                                        <option value="">-- Leave Unchanged --</option>
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                </div>

                                {/* Class Level Update */}
                                {(activeSubTab === 'Chapter' || activeSubTab === 'Topic' || activeSubTab === 'Exam Details') && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Class Level</label>
                                        <select
                                            value={bulkEditFields.class_level}
                                            onChange={(e) => setBulkEditFields({ ...bulkEditFields, class_level: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none transition-all ${
                                                isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500'
                                            }`}
                                        >
                                            <option value="">-- Leave Unchanged --</option>
                                            {classes.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Subject Update */}
                                {(activeSubTab === 'Chapter' || activeSubTab === 'Topic' || activeSubTab === 'Teacher') && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Subject</label>
                                        <select
                                            value={bulkEditFields.subject}
                                            onChange={(e) => setBulkEditFields({ ...bulkEditFields, subject: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none transition-all ${
                                                isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500'
                                            }`}
                                        >
                                            <option value="">-- Leave Unchanged --</option>
                                            {subjects.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Chapter Update */}
                                {activeSubTab === 'Topic' && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Chapter</label>
                                        <select
                                            value={bulkEditFields.chapter}
                                            onChange={(e) => setBulkEditFields({ ...bulkEditFields, chapter: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none transition-all ${
                                                isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500'
                                            }`}
                                        >
                                            <option value="">-- Leave Unchanged --</option>
                                            {chapters.map(ch => (
                                                <option key={ch.id} value={ch.id}>{ch.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Target Exam Update */}
                                {(activeSubTab === 'Exam Details' || activeSubTab === 'Exam Type') && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Target Exam</label>
                                        <select
                                            value={bulkEditFields.target_exam}
                                            onChange={(e) => setBulkEditFields({ ...bulkEditFields, target_exam: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none transition-all ${
                                                isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500'
                                            }`}
                                        >
                                            <option value="">-- Leave Unchanged --</option>
                                            {targetExams.map(te => (
                                                <option key={te.id} value={te.id}>{te.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsBulkEditModalOpen(false)}
                                    className={`flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
                                        isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="flex-[1.5] py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    Apply Bulk Changes
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </AnimatePresence>
        );
    };

    const renderBulkImportModal = () => {
        if (!showBulkModal) return null;
        const isExcel = importFile?.name?.endsWith('.xlsx') || importFile?.name?.endsWith('.xls');

        return (
            <div className="fixed inset-0 z-2000 flex items-start justify-center p-4 pt-16 sm:pt-24 backdrop-blur-md bg-black/70 overflow-y-auto">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-6 border ${isDarkMode ? 'bg-[#0F131A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                >
                    {/* Header */}
                    <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                                <CloudUpload size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight">Bulk Import {activeSubTab}s</h3>
                                <p className="text-[11px] font-semibold opacity-50">Upload Excel (.xlsx, .xls) or CSV (.csv) file</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowBulkModal(false)} 
                            className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Dropzone */}
                        <div
                            onClick={() => bulkFileInputRef.current?.click()}
                            className={`p-7 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3.5 cursor-pointer transition-all ${
                                importFile 
                                    ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-emerald-50/80 border-emerald-500/50' 
                                    : isDarkMode ? 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-emerald-500/40' : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-emerald-500/40'
                            }`}
                        >
                            <input
                                type="file"
                                ref={bulkFileInputRef}
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setImportFile(e.target.files[0]);
                                    }
                                }}
                                accept=".csv, .xlsx, .xls"
                                className="hidden"
                            />
                            {importFile ? (
                                <>
                                    <div className={`p-3.5 rounded-2xl ${isExcel ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {isExcel ? <FileSpreadsheet size={36} /> : <FileText size={36} />}
                                    </div>
                                    <div className="text-center space-y-1">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase ${isExcel ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                                                {isExcel ? 'Excel' : 'CSV'}
                                            </span>
                                            <p className="text-sm font-bold truncate max-w-[240px]">{importFile.name}</p>
                                        </div>
                                        <p className="text-[10px] font-semibold opacity-50">{(importFile.size / 1024).toFixed(2)} KB • Click to change file</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={`p-3.5 rounded-2xl ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                        <FileSpreadsheet size={36} />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-xs font-bold uppercase tracking-wider">Click or Drag & Drop File Here</p>
                                        <p className="text-[10px] font-medium opacity-50">Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Import Mode / Strategy Selection */}
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                                <SlidersHorizontal size={12} />
                                Import Mode / Duplicate Handling
                            </label>
                            
                            <div className="space-y-2">
                                <label 
                                    onClick={() => setBulkImportMode('skip_existing')}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        bulkImportMode === 'skip_existing'
                                            ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/40' : 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400'
                                            : isDarkMode ? 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]' : 'bg-slate-50/50 border-slate-200 hover:bg-white'
                                    }`}
                                >
                                    <input 
                                        type="radio" 
                                        name="bulkMode" 
                                        checked={bulkImportMode === 'skip_existing'} 
                                        onChange={() => setBulkImportMode('skip_existing')}
                                        className="mt-1 text-emerald-500 focus:ring-0" 
                                    />
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold">Skip Existing Duplicates</span>
                                            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[9px] font-black rounded uppercase">Recommended</span>
                                        </div>
                                        <p className="text-[11px] opacity-60 mt-0.5 leading-relaxed">
                                            If a record already exists in database, skip it safely and upload all new records without failing.
                                        </p>
                                    </div>
                                </label>

                                <label 
                                    onClick={() => setBulkImportMode('upsert')}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        bulkImportMode === 'upsert'
                                            ? isDarkMode ? 'bg-blue-500/10 border-blue-500/60 ring-1 ring-blue-500/40' : 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400'
                                            : isDarkMode ? 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]' : 'bg-slate-50/50 border-slate-200 hover:bg-white'
                                    }`}
                                >
                                    <input 
                                        type="radio" 
                                        name="bulkMode" 
                                        checked={bulkImportMode === 'upsert'} 
                                        onChange={() => setBulkImportMode('upsert')}
                                        className="mt-1 text-blue-500 focus:ring-0" 
                                    />
                                    <div className="flex-1 text-left">
                                        <span className="text-xs font-bold">Update Existing & Add New (Upsert)</span>
                                        <p className="text-[11px] opacity-60 mt-0.5 leading-relaxed">
                                            Update attributes (code, sort order, status) of matching records, and create any new records.
                                        </p>
                                    </div>
                                </label>

                                <label 
                                    onClick={() => setBulkImportMode('create')}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        bulkImportMode === 'create'
                                            ? isDarkMode ? 'bg-purple-500/10 border-purple-500/60 ring-1 ring-purple-500/40' : 'bg-purple-50/80 border-purple-400 ring-1 ring-purple-400'
                                            : isDarkMode ? 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]' : 'bg-slate-50/50 border-slate-200 hover:bg-white'
                                    }`}
                                >
                                    <input 
                                        type="radio" 
                                        name="bulkMode" 
                                        checked={bulkImportMode === 'create'} 
                                        onChange={() => setBulkImportMode('create')}
                                        className="mt-1 text-purple-500 focus:ring-0" 
                                    />
                                    <div className="flex-1 text-left">
                                        <span className="text-xs font-bold">Create Only (Strict)</span>
                                        <p className="text-[11px] opacity-60 mt-0.5 leading-relaxed">
                                            Insert only new records; flags duplicate entries as warnings/errors in the final report.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Format Guideline Box */}
                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50/60 border-blue-100'}`}>
                            <div className="flex gap-3">
                                <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
                                <div className="space-y-1 text-left">
                                    <p className="text-[11px] font-black uppercase text-blue-500 tracking-wider">File Format Requirements</p>
                                    <p className="text-[11px] font-medium opacity-75 leading-relaxed">
                                        Columns required: <code className="px-1 py-0.5 rounded bg-blue-500/10 font-bold">Name</code>, <code className="px-1 py-0.5 rounded bg-blue-500/10 font-bold">Class Level</code>, <code className="px-1 py-0.5 rounded bg-blue-500/10 font-bold">Subject</code>. 
                                        Optional: <code className="px-1 py-0.5 rounded bg-blue-500/10">Code</code>, <code className="px-1 py-0.5 rounded bg-blue-500/10">Sort Order</code>, <code className="px-1 py-0.5 rounded bg-blue-500/10">Is Active</code>.
                                    </p>
                                    <p className="text-[11px] font-semibold text-blue-500 hover:underline cursor-pointer pt-1 flex items-center gap-1" onClick={handleExport}>
                                        <Download size={12} /> Download Current Data as Template
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setShowBulkModal(false)}
                                className={`flex-1 py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkImport}
                                disabled={!importFile || isImporting}
                                className={`flex-[1.6] py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider text-white shadow-xl transition-all flex items-center justify-center gap-2.5 ${
                                    !importFile || isImporting 
                                        ? 'bg-slate-600 opacity-60 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-500/25 active:scale-[0.98]'
                                }`}
                            >
                                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                {isImporting ? 'Processing File...' : 'Start Import'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    const renderImportReportModal = () => {
        if (!showReportModal || !importReport) return null;

        const totalRows = importReport.total_rows || 0;
        const createdCount = importReport.created_count || 0;
        const skippedCount = importReport.skipped_count || 0;
        const updatedCount = importReport.updated_count || 0;
        const errorCount = importReport.error_count || (importReport.errors ? importReport.errors.length : 0);

        const details = importReport.details || [];
        const filteredDetails = details.filter(item => {
            if (reportFilter === 'created' && item.status !== 'created') return false;
            if (reportFilter === 'skipped' && item.status !== 'skipped') return false;
            if (reportFilter === 'updated' && item.status !== 'updated') return false;
            if (reportFilter === 'error' && item.status !== 'error') return false;

            if (reportSearch.trim()) {
                const q = reportSearch.toLowerCase();
                const nameMatch = (item.name || '').toLowerCase().includes(q);
                const classMatch = (item.class_level || '').toLowerCase().includes(q);
                const subjectMatch = (item.subject || item.topic || '').toLowerCase().includes(q);
                const msgMatch = (item.message || '').toLowerCase().includes(q);
                return nameMatch || classMatch || subjectMatch || msgMatch;
            }
            return true;
        });

        return (
            <div className="fixed inset-0 z-2000 flex items-start justify-center p-4 pt-12 sm:pt-16 backdrop-blur-md bg-black/75 overflow-y-auto">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className={`relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-6 border ${isDarkMode ? 'bg-[#0F131A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                >
                    {/* Header */}
                    <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div className="flex items-center gap-3.5">
                            <div className={`p-3 rounded-xl text-white shadow-lg ${errorCount === 0 ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20' : 'bg-gradient-to-tr from-amber-600 to-orange-500 shadow-orange-500/20'}`}>
                                {errorCount === 0 ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight">Bulk Import Report: {activeSubTab}s</h3>
                                <p className="text-[11px] font-semibold opacity-50">{importReport.message || 'Import process finished'}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowReportModal(false)} 
                            className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* KPI Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className={`p-3.5 rounded-xl border text-left ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Total Rows</p>
                                <p className="text-xl font-black mt-1">{totalRows}</p>
                            </div>
                            
                            <div className={`p-3.5 rounded-xl border text-left ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">Created / Added</p>
                                <p className="text-xl font-black mt-1">{createdCount}</p>
                            </div>

                            <div className={`p-3.5 rounded-xl border text-left ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">Skipped (Exists)</p>
                                <p className="text-xl font-black mt-1">{skippedCount}</p>
                            </div>

                            <div className={`p-3.5 rounded-xl border text-left ${errorCount > 0 ? (isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700') : (isDarkMode ? 'bg-white/[0.02] border-white/10 opacity-50' : 'bg-slate-50 border-slate-200 opacity-50')}`}>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">Failed / Errors</p>
                                <p className="text-xl font-black mt-1">{errorCount}</p>
                            </div>
                        </div>

                        {/* Filter Tabs & Search */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className={`flex items-center p-1 rounded-xl border ${isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                                <button
                                    onClick={() => setReportFilter('all')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${reportFilter === 'all' ? (isDarkMode ? 'bg-white/10 text-white shadow' : 'bg-white text-slate-900 shadow') : 'opacity-60 hover:opacity-100'}`}
                                >
                                    All ({details.length})
                                </button>
                                <button
                                    onClick={() => setReportFilter('created')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${reportFilter === 'created' ? 'bg-emerald-500 text-white shadow' : 'opacity-60 hover:opacity-100 text-emerald-400'}`}
                                >
                                    Added ({createdCount})
                                </button>
                                <button
                                    onClick={() => setReportFilter('skipped')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${reportFilter === 'skipped' ? 'bg-amber-500 text-white shadow' : 'opacity-60 hover:opacity-100 text-amber-400'}`}
                                >
                                    Skipped ({skippedCount})
                                </button>
                                {errorCount > 0 && (
                                    <button
                                        onClick={() => setReportFilter('error')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${reportFilter === 'error' ? 'bg-rose-500 text-white shadow' : 'opacity-60 hover:opacity-100 text-rose-400'}`}
                                    >
                                        Errors ({errorCount})
                                    </button>
                                )}
                            </div>

                            <div className="relative flex-1 sm:max-w-xs">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                                <input
                                    type="text"
                                    value={reportSearch}
                                    onChange={(e) => setReportSearch(e.target.value)}
                                    placeholder="Filter by name, class, subject..."
                                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none transition-all ${
                                        isDarkMode 
                                            ? 'bg-white/[0.04] border-white/10 text-white focus:border-emerald-500/50' 
                                            : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500/50'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Details Table */}
                        <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50/50'}`}>
                            <div className="max-h-64 overflow-y-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className={`sticky top-0 z-10 text-[10px] font-black uppercase tracking-wider border-b ${isDarkMode ? 'bg-[#151921] border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                        <tr>
                                            <th className="py-2.5 px-3">Row</th>
                                            <th className="py-2.5 px-3">Name</th>
                                            <th className="py-2.5 px-3">Class & Subject</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3">Details / Message</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredDetails.length > 0 ? (
                                            filteredDetails.map((item, idx) => (
                                                <tr key={idx} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-white'}`}>
                                                    <td className="py-2.5 px-3 font-mono opacity-50">{item.row}</td>
                                                    <td className="py-2.5 px-3 font-bold max-w-[180px] truncate" title={item.name}>{item.name}</td>
                                                    <td className="py-2.5 px-3 text-[11px] opacity-70">
                                                        {item.class_level ? `${item.class_level} • ${item.subject || item.topic || ''}` : (item.topic || '—')}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        {item.status === 'created' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                Added
                                                            </span>
                                                        )}
                                                        {item.status === 'skipped' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                                Skipped (Exists)
                                                            </span>
                                                        )}
                                                        {item.status === 'updated' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                                Updated
                                                            </span>
                                                        )}
                                                        {item.status === 'error' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                                                Failed
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-[11px] opacity-75 max-w-[280px] truncate" title={item.message || item.error || item.reason || ''}>
                                                        {item.message || item.error || item.reason || '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center opacity-40 font-medium text-xs">
                                                    No records match the selected filter or search.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Action Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <button
                                onClick={handleDownloadImportReport}
                                className={`w-full sm:w-auto px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-2 transition-all ${
                                    isDarkMode ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                                }`}
                            >
                                <Download size={15} />
                                Download Full Report (CSV)
                            </button>

                            <button
                                onClick={() => setShowReportModal(false)}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-wider text-white shadow-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Check size={16} />
                                Done & View List
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    const renderModal = () => {
        return (
            <AnimatePresence>
                {isModalOpen && (
                    <div style={{ zIndex: 1000 }} className="fixed inset-0 flex items-center justify-center p-4 md:max-lg:p-2">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isActionLoading && setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            style={{ zIndex: 1001 }}
                            className={`relative w-full ${activeSubTab === 'Exam Details' ? 'max-w-2xl' : 'max-w-lg md:max-lg:max-w-sm'} rounded-3xl border shadow-2xl max-h-[85vh] overflow-y-auto ${isDarkMode ? 'bg-[#0F1117] border-white/10' : 'bg-white border-slate-200'}`}
                        >
                            <form onSubmit={handleSubmit} className="p-4 md:max-lg:p-3 space-y-4 md:max-lg:space-y-3">
                                <div className="flex justify-between items-center bg-linear-to-r from-orange-500/10 to-transparent -mx-4 -mt-4 p-4 md:max-lg:-mx-3 md:max-lg:-mt-3 md:max-lg:p-3 border-b border-white/5 mb-2">
                                    <div>
                                        <h2 className={`text-xl md:max-lg:text-base font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {modalMode === 'create' ? 'Add New' : 'Edit'} <span className="text-orange-500">{activeSubTab}</span>
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Configuration parameters</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`p-2.5 rounded-xl transition-all hover:rotate-90 hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-900 border border-slate-200'}`}>
                                        <X size={18} strokeWidth={3} />
                                    </button>
                                </div>

                                <div className="space-y-4 md:max-lg:space-y-2">
                                    {activeSubTab === 'Exam Details' ? (
                                        <div className="grid grid-cols-2 gap-4 md:max-lg:gap-2">
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Title</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={handleExamNameChange}
                                                    placeholder="e.g. JEE Advanced Mock - 1"
                                                    className={`w-full p-3.5 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    placeholder="e.g. JEE_ADV_2026"
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Session</label>
                                                <SearchableSelect
                                                    isMulti={true}
                                                    options={sessions.filter(s => s.is_active || (Array.isArray(formValues.sessions) && formValues.sessions.map(String).includes(String(s.id))))}
                                                    value={formValues.sessions}
                                                    onChange={vals => setFormValues({ ...formValues, sessions: vals, session: vals.length > 0 ? vals[0] : '' })}
                                                    placeholder="Select Sessions"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                                <SearchableSelect
                                                    isMulti={true}
                                                    options={classes.filter(c => c.is_active || (Array.isArray(formValues.class_levels) && formValues.class_levels.map(String).includes(String(c.id))))}
                                                    value={formValues.class_levels}
                                                    onChange={vals => setFormValues({ ...formValues, class_levels: vals, class_level: vals.length > 0 ? vals[0] : '' })}
                                                    placeholder="Select Classes"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Target Exam (Multiple)</label>
                                                <SearchableSelect
                                                    isMulti={true}
                                                    options={targetExams.filter(te => te.is_active || (Array.isArray(formValues.target_exams) && formValues.target_exams.map(String).includes(String(te.id))))}
                                                    value={formValues.target_exams}
                                                    onChange={vals => setFormValues({ ...formValues, target_exams: vals, exam_type: '' })}
                                                    placeholder="Select Targets"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Type</label>
                                                <SearchableSelect
                                                    disabled={!formValues.target_exams || formValues.target_exams.length === 0}
                                                    options={(() => {
                                                        const selectedTargetIds = Array.isArray(formValues.target_exams) ? formValues.target_exams.map(String) : [];
                                                        return examTypes.filter(et => {
                                                            if (et.target_exams && Array.isArray(et.target_exams)) {
                                                                return et.target_exams.some(teId => selectedTargetIds.includes(String(teId)));
                                                            }
                                                            return selectedTargetIds.includes(String(et.target_exam || et.target_exam_id || ''));
                                                        });
                                                    })()}
                                                    value={formValues.exam_type}
                                                    onChange={val => setFormValues({ ...formValues, exam_type: val })}
                                                    placeholder="Select Type"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Duration (Mins)</label>
                                                <input
                                                    type="number"
                                                    value={formValues.duration}
                                                    onChange={e => setFormValues({ ...formValues, duration: e.target.value })}
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Total Marks</label>
                                                <input
                                                    type="number"
                                                    value={formValues.total_marks}
                                                    onChange={e => setFormValues({ ...formValues, total_marks: e.target.value })}
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            
                                            <div className="space-y-3 flex flex-col justify-end">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Calculator</label>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormValues({ ...formValues, has_calculator: !formValues.has_calculator })}
                                                        className={`relative w-12 h-6 rounded-full transition-all duration-300 flex items-center ${formValues.has_calculator ? 'bg-orange-500 shadow-lg shadow-orange-500/30' : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`}
                                                    >
                                                        <div className={`absolute w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${formValues.has_calculator ? 'right-1' : 'left-1'}`} />
                                                    </button>
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${formValues.has_calculator ? 'text-orange-500' : 'opacity-40'}`}>
                                                        {formValues.has_calculator ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-3 flex flex-col justify-end">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Option Style</label>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormValues({ ...formValues, option_type_numeric: !formValues.option_type_numeric })}
                                                        className={`relative w-12 h-6 rounded-full transition-all duration-300 flex items-center ${formValues.option_type_numeric ? 'bg-orange-500 shadow-lg shadow-orange-500/30' : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`}
                                                    >
                                                        <div className={`absolute w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${formValues.option_type_numeric ? 'right-1' : 'left-1'}`} />
                                                    </button>
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${formValues.option_type_numeric ? 'text-orange-500' : 'opacity-40'}`}>
                                                        {formValues.option_type_numeric ? '1, 2, 3, 4' : 'A, B, C, D'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Test Instructions</label>
                                                <div className={`rounded-[5px] border overflow-hidden ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                                    <SmartEditor
                                                        value={formValues.instructions}
                                                        onChange={(val) => setFormValues({ ...formValues, instructions: val })}
                                                        placeholder="Enter test instructions for students..."
                                                        isDarkMode={isDarkMode}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : activeSubTab === 'Image' ? (
                                        <div className="space-y-6 text-left">
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                                    <SearchableSelect
                                                        options={classes.filter(c => c.is_active || String(c.id) === String(formValues.class_level))}
                                                        value={formValues.class_level}
                                                        onChange={val => setFormValues({ ...formValues, class_level: val, topic: '' })}
                                                        placeholder="No Class"
                                                        isDarkMode={isDarkMode}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Subject</label>
                                                    <SearchableSelect
                                                        options={subjects.filter(s => s.is_active || String(s.id) === String(formValues.subject))}
                                                        value={formValues.subject}
                                                        onChange={val => setFormValues({ ...formValues, subject: val, topic: '' })}
                                                        placeholder="No Subject"
                                                        isDarkMode={isDarkMode}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Topic</label>
                                                    <SearchableSelect
                                                        options={filteredTopicsForImage.filter(t => t.is_active || String(t.id) === String(formValues.topic))}
                                                        value={formValues.topic}
                                                        onChange={val => setFormValues({ ...formValues, topic: val })}
                                                        placeholder="No Topic"
                                                        isDarkMode={isDarkMode}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Type</label>
                                                    <SearchableSelect
                                                        options={examTypes}
                                                        value={formValues.exam_type}
                                                        onChange={val => setFormValues({ ...formValues, exam_type: val })}
                                                        placeholder="No Type"
                                                        isDarkMode={isDarkMode}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Target</label>
                                                    <SearchableSelect
                                                        options={targetExams.filter(t => t.is_active || String(t.id) === String(formValues.target_exam))}
                                                        value={formValues.target_exam}
                                                        onChange={val => setFormValues({ ...formValues, target_exam: val })}
                                                        placeholder="No Target"
                                                        isDarkMode={isDarkMode}
                                                    />
                                                </div>
                                            </div>
                                            <div className="p-8 rounded-[5px] border-2 border-dashed border-orange-500/20 bg-orange-500/2 flex flex-col items-center justify-center text-center space-y-3">
                                                <div className="w-24 h-24 rounded-[5px] bg-orange-500/10 flex items-center justify-center text-orange-500 overflow-hidden border-4 border-white shadow-lg">
                                                    {previews.length > 0 ? (
                                                        <img src={previews[0]} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon size={32} />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-tight">
                                                        {selectedFiles.length > 0 ? `${selectedFiles.length} File(s) Ready` : 'Select Images First'}
                                                    </h4>
                                                    <p className="text-[10px] font-medium opacity-50 max-w-[200px] mx-auto">
                                                        {selectedFiles.length > 0 ? 'Click "Save Configuration" to start upload' : 'Tagging your images helps you find them later in the Question Bank.'}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => mediaInputRef.current.click()}
                                                    className="px-6 py-2 bg-orange-600 text-white rounded-[5px] text-xs font-bold shadow-lg shadow-orange-600/30 hover:bg-orange-700 transition-all active:scale-95"
                                                >
                                                    {selectedFiles.length > 0 ? 'Change Selection' : 'Browse Images'}
                                                </button>
                                            </div>
                                            <input
                                                type="file"
                                                ref={mediaInputRef}
                                                onChange={handleFileSelect}
                                                className="hidden"
                                                multiple
                                                accept="image/*"
                                            />
                                        </div>
                                    ) : activeSubTab === 'SubTopic' ? (
                                        <div className="grid grid-cols-2 gap-4 text-left">
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Topic</label>
                                                <SearchableSelect
                                                    options={topics.filter(t => t.is_active || String(t.id) === String(formValues.topic))}
                                                    value={formValues.topic}
                                                    onChange={val => setFormValues({ ...formValues, topic: val })}
                                                    placeholder="Select Topic"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">SubTopic Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                                    placeholder="e.g. Introduction, Key Concepts"
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Unique Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    placeholder="CODE"
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Order</label>
                                                <input
                                                    type="number"
                                                    value={formValues.order}
                                                    onChange={e => setFormValues({ ...formValues, order: e.target.value })}
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                        </div>
                                    ) : activeSubTab === 'Chapter' ? (
                                        <div className="grid grid-cols-2 gap-4 text-left">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                                <SearchableSelect
                                                    options={classes.filter(c => c.is_active || String(c.id) === String(formValues.class_level))}
                                                    value={formValues.class_level}
                                                    onChange={val => setFormValues({ ...formValues, class_level: val })}
                                                    placeholder="Select Class"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Subject</label>
                                                <SearchableSelect
                                                    options={subjects.filter(s => s.is_active || String(s.id) === String(formValues.subject))}
                                                    value={formValues.subject}
                                                    onChange={val => setFormValues({ ...formValues, subject: val })}
                                                    placeholder="Select Subject"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Chapter Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                                    placeholder="e.g. Chemical Bonding, Linear Algebra"
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Unique Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    placeholder="CODE"
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Order</label>
                                                <input
                                                    type="number"
                                                    value={formValues.order}
                                                    onChange={e => setFormValues({ ...formValues, order: e.target.value })}
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                        </div>
                                    ) : activeSubTab === 'Topic' ? (
                                        <div className="grid grid-cols-2 gap-4 text-left">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                                <SearchableSelect
                                                    options={classes.filter(c => c.is_active || String(c.id) === String(formValues.class_level))}
                                                    value={formValues.class_level}
                                                    onChange={val => setFormValues({ ...formValues, class_level: val })}
                                                    placeholder="Select Class"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Subject</label>
                                                <SearchableSelect
                                                    options={subjects.filter(s => s.is_active || String(s.id) === String(formValues.subject))}
                                                    value={formValues.subject}
                                                    onChange={val => setFormValues({ ...formValues, subject: val })}
                                                    placeholder="Select Subject"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Chapter</label>
                                                <SearchableSelect
                                                    options={chapters.filter(ch => 
                                                        (ch.is_active || String(ch.id) === String(formValues.chapter)) &&
                                                        (!formValues.class_level || String(ch.class_level) === String(formValues.class_level)) &&
                                                        (!formValues.subject || String(ch.subject) === String(formValues.subject))
                                                    )}
                                                    value={formValues.chapter}
                                                    onChange={val => setFormValues({ ...formValues, chapter: val })}
                                                    placeholder="Select Chapter"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Topic Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                                    placeholder="e.g. Thermodynamics, Genetics"
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Sub-topic (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={formValues.sub_topic}
                                                    onChange={e => setFormValues({ ...formValues, sub_topic: e.target.value })}
                                                    placeholder="e.g. Laws of Motion"
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Unique Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    placeholder="CODE"
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                        </div>
                                    ) : activeSubTab === 'Teacher' ? (
                                        <div className="grid grid-cols-2 gap-3 text-left">
                                            <div className="space-y-1 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Teacher Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                                    placeholder="e.g. John Doe, Dr. Smith"
                                                    className={`w-full p-2 md:max-lg:p-1.5 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Subject</label>
                                                <SearchableSelect
                                                    options={subjects.filter(s => s.is_active || String(s.id) === String(formValues.subject))}
                                                    value={formValues.subject}
                                                    onChange={val => setFormValues({ ...formValues, subject: val })}
                                                    placeholder="Select Subject"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={formValues.email}
                                                    onChange={e => setFormValues({ ...formValues, email: e.target.value })}
                                                    placeholder="email@example.com"
                                                    className={`w-full p-2 md:max-lg:p-1.5 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Phone</label>
                                                <input
                                                    type="text"
                                                    value={formValues.phone}
                                                    onChange={e => setFormValues({ ...formValues, phone: e.target.value })}
                                                    placeholder="+1 234 567 890"
                                                    className={`w-full p-2 md:max-lg:p-1.5 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Qualification</label>
                                                <input
                                                    type="text"
                                                    value={formValues.qualification}
                                                    onChange={e => setFormValues({ ...formValues, qualification: e.target.value })}
                                                    placeholder="e.g. PhD, MSc"
                                                    className={`w-full p-2 md:max-lg:p-1.5 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Experience</label>
                                                <input
                                                    type="text"
                                                    value={formValues.experience}
                                                    onChange={e => setFormValues({ ...formValues, experience: e.target.value })}
                                                    placeholder="e.g. 5 Years"
                                                    className={`w-full p-2 md:max-lg:p-1.5 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1 text-left col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Unique Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    placeholder="TEACHER_CODE"
                                                    className={`w-full p-2 md:max-lg:p-1.5 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                        </div>
                                    ) : activeSubTab === 'Partial Marks' ? (
                                        <div className="grid grid-cols-2 gap-4 text-left">
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Rule Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                                    placeholder="e.g. JEE Advanced Logic"
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Unique Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    placeholder="JEE_ADV_PATTERN"
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Logic Type</label>
                                                <select
                                                    value={formValues.logic_type}
                                                    onChange={e => setFormValues({ ...formValues, logic_type: e.target.value })}
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                >
                                                    <option value="STANDARD">Standard (+X, -Y)</option>
                                                    <option value="JEE_ADVANCED">JEE Advanced (+3, +2, +1, -1)</option>
                                                    <option value="WBJEE">WBJEE Category 3 (+X, 0)</option>
                                                    <option value="CUSTOM_FRACTIONAL">Custom Fractional</option>
                                                </select>
                                                <div className={`mt-2 p-3 rounded-[5px] text-xs font-medium border space-y-2 ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                                    {formValues.logic_type === 'STANDARD' && (
                                                        <>
                                                            <p><strong>Strict grading:</strong> Marks awarded only if ALL correct options (and no incorrect ones) are chosen. Otherwise, negative marks are applied.</p>
                                                            <p className="opacity-80 border-t border-current/20 pt-2"><strong>Example:</strong> Correct answer is [A, B]. Base: +4, Neg: -1.<br/>• Selecting [A, B] &rarr; +4.<br/>• Selecting [A] &rarr; -1.<br/>• Selecting [A, B, C] &rarr; -1.</p>
                                                        </>
                                                    )}
                                                    {formValues.logic_type === 'JEE_ADVANCED' && (
                                                        <>
                                                            <p><strong>Tiered grading:</strong> Full marks for all correct. Partial marks (+2, +1) awarded if no incorrect options are chosen but some correct options are missed. Negative marks if ANY incorrect option is chosen.</p>
                                                            <p className="opacity-80 border-t border-current/20 pt-2"><strong>Example:</strong> Correct answer is [A, B, C]. Base: +4, Neg: -1.<br/>• Selecting [A, B, C] &rarr; +4.<br/>• Selecting [A, B] &rarr; +2.<br/>• Selecting [A] &rarr; +1.<br/>• Selecting [A, D] &rarr; -1 (because D is wrong).</p>
                                                        </>
                                                    )}
                                                    {formValues.logic_type === 'WBJEE' && (
                                                        <>
                                                            <p><strong>Proportional grading:</strong> Fractional marks awarded based on (Correct Options Selected / Total Correct Options). Usually, no negative marking is applied for partial subsets.</p>
                                                            <p className="opacity-80 border-t border-current/20 pt-2"><strong>Example:</strong> Correct answer is [A, B]. Base: +2, Neg: 0.<br/>• Selecting [A, B] &rarr; +2.<br/>• Selecting [A] &rarr; +1 (half marks).<br/>• Selecting [A, C] &rarr; 0 (because C is wrong, but no negative penalty).</p>
                                                        </>
                                                    )}
                                                    {formValues.logic_type === 'CUSTOM_FRACTIONAL' && (
                                                        <>
                                                            <p><strong>Custom Fractional grading:</strong> Correct marks are divided equally among the correct options. Any incorrect option selected applies the base negative penalty.</p>
                                                            <p className="opacity-80 border-t border-current/20 pt-2"><strong>Example:</strong> Correct answer is [A, B]. Base: +4, Neg: -1.<br/>• Selecting [A] &rarr; +2 (1 out of 2 correct options).<br/>• Selecting [A, B] &rarr; +4 (all correct).<br/>• Selecting [A, C] &rarr; +1 (+2 for A, -1 for C).</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Base Correct Marks</label>
                                                <input
                                                    required
                                                    type="number"
                                                    step="any"
                                                    value={formValues.base_correct_marks}
                                                    onChange={e => setFormValues({ ...formValues, base_correct_marks: e.target.value })}
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Base Negative Marks</label>
                                                <input
                                                    required
                                                    type="number"
                                                    step="any"
                                                    value={formValues.base_negative_marks}
                                                    onChange={e => setFormValues({ ...formValues, base_negative_marks: e.target.value })}
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                        </div>
                                    ) : activeSubTab === 'Psychometric Traits' ? (
                                        <div className="grid grid-cols-2 gap-4 text-left">
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Trait Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                                    placeholder="e.g. Critical Thinking"
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Description</label>
                                                <textarea
                                                    rows="2"
                                                    value={formValues.description}
                                                    onChange={e => setFormValues({ ...formValues, description: e.target.value })}
                                                    placeholder="Trait description..."
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all resize-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Order</label>
                                                <input
                                                    type="number"
                                                    value={formValues.order}
                                                    onChange={e => setFormValues({ ...formValues, order: e.target.value })}
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                        </div>
                                    ) : activeSubTab === 'Psychometric Questions' ? (
                                        <div className="grid grid-cols-2 gap-4 text-left">
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Question Text</label>
                                                <textarea
                                                    required
                                                    rows="2"
                                                    value={formValues.text}
                                                    onChange={e => setFormValues({ ...formValues, text: e.target.value })}
                                                    placeholder="e.g. I adapt easily to new situations."
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all resize-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Associated Trait</label>
                                                <SearchableSelect
                                                    options={psychometricTraits}
                                                    value={formValues.trait}
                                                    onChange={val => setFormValues({ ...formValues, trait: val })}
                                                    placeholder="Select Trait"
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Order</label>
                                                <input
                                                    type="number"
                                                    value={formValues.order}
                                                    onChange={e => setFormValues({ ...formValues, order: e.target.value })}
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-3 flex flex-col justify-end">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Reverse Scored?</label>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormValues({ ...formValues, is_reverse_scored: !formValues.is_reverse_scored })}
                                                        className={`relative w-12 h-6 rounded-full transition-all duration-300 flex items-center ${formValues.is_reverse_scored ? 'bg-orange-500 shadow-lg shadow-orange-500/30' : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`}
                                                    >
                                                        <div className={`absolute w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${formValues.is_reverse_scored ? 'right-1' : 'left-1'}`} />
                                                    </button>
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${formValues.is_reverse_scored ? 'text-orange-500' : 'opacity-40'}`}>
                                                        {formValues.is_reverse_scored ? 'Yes' : 'No'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Name / Title</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => {
                                                        const val = activeSubTab === 'Subject' ? e.target.value.toUpperCase() : e.target.value;
                                                        setFormValues({ ...formValues, name: val });
                                                    }}
                                                    placeholder={activeSubTab === 'Subject' ? "e.g. Mathematics, Physics" : "e.g. JEE Mock"}
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>

                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Unique Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>

                                            {activeSubTab === 'Exam Type' && (
                                                <div className="space-y-1.5 col-span-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Target Exams (Multiple)</label>
                                                    <SearchableSelect
                                                        isMulti={true}
                                                        options={targetExams}
                                                        value={formValues.target_exams}
                                                        onChange={vals => setFormValues({ ...formValues, target_exams: vals })}
                                                        placeholder="Select Targets"
                                                        isDarkMode={isDarkMode}
                                                    />
                                                </div>
                                            )}

                                            <div className={`${activeSubTab === 'Exam Type' ? '' : 'col-span-2'} space-y-1.5`}>
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Description</label>
                                                <textarea
                                                    rows="1"
                                                    value={formValues.description}
                                                    onChange={e => setFormValues({ ...formValues, description: e.target.value })}
                                                    placeholder="Optional details..."
                                                    className={`w-full p-3 md:max-lg:p-2 rounded-[5px] border font-bold text-sm outline-none transition-all resize-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 py-2">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setFormValues({ ...formValues, is_active: !formValues.is_active })}
                                                className={`relative w-12 h-6 rounded-full transition-all duration-300 flex items-center ${formValues.is_active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`}
                                            >
                                                <div className={`absolute w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${formValues.is_active ? 'right-1' : 'left-1'}`} />
                                            </button>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${formValues.is_active ? 'text-emerald-500' : 'opacity-40'}`}>
                                                Status: {formValues.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    disabled={isActionLoading}
                                    type="submit"
                                    className="w-full py-3.5 md:max-lg:py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-[5px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {isActionLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>SAVE CONFIGURATION <Check size={14} strokeWidth={3} /></>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderHeader()}
            {renderContent()}
            {renderModal()}
            {renderBulkImportModal()}
            {renderImportReportModal()}
            {renderBulkEditModal()}
            {renderFloatingActionBar()}

            {/* Premium Confirm Modal */}
            <AnimatePresence>
                {confirmDialog.isOpen && (
                    <div style={{ zIndex: 1100 }} className="fixed inset-0 flex items-start justify-center p-4 pt-32">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className={`relative w-full max-w-sm rounded-3xl border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#0F1117] border-white/10' : 'bg-white border-slate-200'}`}
                        >
                            <div className="p-8 text-center">
                                <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${isDarkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-500'}`}>
                                    <AlertTriangle size={40} strokeWidth={2.5} />
                                </div>
                                <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    Are you sure?
                                </h3>
                                <p className={`text-sm font-medium leading-relaxed mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {confirmDialog.title}
                                    <br />
                                    <span className="text-red-500/80 font-bold">This action cannot be undone.</span>
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                                        className={`py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-600/30 active:scale-95"
                                    >
                                        Delete Now
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MasterDataManagement;
