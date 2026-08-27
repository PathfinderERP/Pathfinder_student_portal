import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
    Upload, Plus, Database, FileText, CheckCircle,
    X, Search, Filter, ChevronRight, AlertCircle,
    BookOpen, HelpCircle, HardDrive, Download,
    CloudUpload, FileSpreadsheet, Layers, ArrowLeft,
    Bold, Italic, Underline, List, ListOrdered, Image as ImageIcon,
    Type, Hash, Zap, Trash2, Save, ChevronLeft, ChevronDown, Check,
    Strikethrough, Quote, Code, Subscript, Superscript,
    AlignLeft, AlignCenter, AlignRight, Link, Sigma,
    Palette, Droplets, Eraser, Clock, Logs, Copy, Loader2, RefreshCcw, Settings2, Tag
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import SmartEditor from './components/SmartEditor';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const MathPreview = ({ tex, isDarkMode }) => {
    const containerRef = useRef();
    useEffect(() => {
        if (containerRef.current && tex) {
            try {
                katex.render(tex, containerRef.current, { throwOnError: false, displayMode: true });
            } catch (err) {
                containerRef.current.innerHTML = '<span style="color: #ef4444; font-size: 10px;">Invalid LaTeX</span>';
            }
        }
    }, [tex, isDarkMode]);
    return <div ref={containerRef} className={`min-h-[60px] flex items-center justify-center p-4 rounded-[5px] border ${isDarkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />;
};

const processLatexToHtml = (text) => {
    if (!text) return '';
    
    // The AI was instructed to double-escape backslashes (e.g. \\frac, \\n) 
    // to preserve valid JSON. We need to un-escape them before rendering!
    // Replace literal '\\n' with a real newline character or <br>
    let processed = text.replace(/\\\\n/g, '<br>').replace(/\\n/g, '<br>');
    
    // Un-escape all double backslashes to single backslashes for LaTeX
    processed = processed.replace(/\\\\/g, '\\');

    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
        // Escape quotes to not break the HTML attribute
        const escapedMath = math.replace(/"/g, '&quot;');
        return `<span data-latex="${escapedMath}" data-display-mode="true"></span>`;
    });
    processed = processed.replace(/\$([\s\S]*?)\$/g, (match, math) => {
        const escapedMath = math.replace(/"/g, '&quot;');
        return `<span data-latex="${escapedMath}"></span>`;
    });
    
    // Parse Markdown bold and italic
    processed = processed.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');
    
    // Parse LaTeX text formatting (outside math mode)
    processed = processed.replace(/\\textit\{([\s\S]*?)\}/g, '<em>$1</em>');
    processed = processed.replace(/\\textbf\{([\s\S]*?)\}/g, '<strong>$1</strong>');
    
    // Convert any remaining newlines to breaks
    return processed.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
};

const DIFFICULTY_OPTIONS = [
    { value: 'very_easy', label: 'Very Easy' },
    { value: 'easy', label: 'Easy' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'hard', label: 'Hard' },
    { value: 'very_hard', label: 'Very Hard' }
];

const LEVEL_NUM_TO_KEY = {
    '1': 'very_easy',
    '2': 'easy',
    '3': 'moderate',
    '4': 'hard',
    '5': 'very_hard'
};

// Custom Floating Label Select Component with Multi-Select Support
const CustomSelect = ({ label, value, onChange, options = [], placeholder, icon: Icon, showCount = true, isMulti = false }) => {
    const { isDarkMode } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);

    const multiMode = isMulti || Array.isArray(value);
    const safeArrayValue = useMemo(() => {
        if (!multiMode) return [];
        return Array.isArray(value) ? value.map(String) : (value ? [String(value)] : []);
    }, [multiMode, value]);

    useEffect(() => {
        if (!isOpen) setSearchTerm('');
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const validOptions = useMemo(() => {
        return (options || []).filter(opt => opt && opt.id !== '__NULL__' && opt.value !== '');
    }, [options]);

    const totalAvailableCount = validOptions.length > 0 ? validOptions.length : (options || []).length;

    const filteredOptions = useMemo(() => {
        let list = options || [];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter(opt => {
                const text = (opt.label || opt.name || opt.value || '').toLowerCase();
                return text.includes(term);
            });
        }

        // Natural alphabetical sorting (e.g. 7(a) before 7(b), A before B, 1 before 2)
        // Keep null / empty / 'None / Not Assigned' / 'All ...' options at the top
        return [...list].sort((a, b) => {
            const aVal = a.id !== undefined ? a.id : a.value;
            const bVal = b.id !== undefined ? b.id : b.value;
            const aIsTop = aVal === '__NULL__' || aVal === '' || aVal === null || aVal === undefined || String(a.label || a.name || '').toLowerCase().includes('not assigned') || String(a.label || a.name || '').toLowerCase().startsWith('all ');
            const bIsTop = bVal === '__NULL__' || bVal === '' || bVal === null || bVal === undefined || String(b.label || b.name || '').toLowerCase().includes('not assigned') || String(b.label || b.name || '').toLowerCase().startsWith('all ');

            if (aIsTop && !bIsTop) return -1;
            if (!aIsTop && bIsTop) return 1;
            if (aIsTop && bIsTop) return 0;

            const aText = String(a.label || a.name || a.value || '');
            const bText = String(b.label || b.name || b.value || '');
            return aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [options, searchTerm]);

    // Text summary of selected options
    const displayText = useMemo(() => {
        if (multiMode) {
            if (safeArrayValue.length === 0) return placeholder;
            const labels = safeArrayValue.map(v => {
                const found = (options || []).find(o => String(o.id) === String(v) || String(o.value) === String(v));
                return found ? (found.label || found.name || found.value) : v;
            }).filter(Boolean);

            if (labels.length === 0) return placeholder;
            if (labels.length <= 2) return labels.join(', ');
            return `${labels.length} Selected`;
        } else {
            const selectedOption = (options || []).find(opt => String(opt.id) === String(value) || opt.value === value);
            return selectedOption ? (selectedOption.label || selectedOption.name || selectedOption.value) : placeholder;
        }
    }, [multiMode, safeArrayValue, value, options, placeholder]);

    const fullTooltipText = useMemo(() => {
        if (multiMode && safeArrayValue.length > 0) {
            return safeArrayValue.map(v => {
                const found = (options || []).find(o => String(o.id) === String(v) || String(o.value) === String(v));
                return found ? (found.label || found.name || found.value) : v;
            }).join(', ');
        }
        return displayText;
    }, [multiMode, safeArrayValue, options, displayText]);

    const handleOptionClick = (optId) => {
        if (multiMode) {
            const strId = String(optId);
            let next;
            if (safeArrayValue.includes(strId)) {
                next = safeArrayValue.filter(v => v !== strId);
            } else {
                next = [...safeArrayValue, optId];
            }
            onChange(next);
        } else {
            onChange(optId);
            setIsOpen(false);
        }
    };

    const handleSelectAll = (e) => {
        e.stopPropagation();
        if (!multiMode) return;
        const validIds = validOptions.map(opt => opt.id !== undefined ? opt.id : opt.value);
        if (safeArrayValue.length >= validIds.length && validIds.length > 0) {
            onChange([]);
        } else {
            onChange(validIds);
        }
    };

    const hasValue = multiMode ? safeArrayValue.length > 0 : (value !== '' && value !== null && value !== undefined);

    return (
        <div className="relative group" ref={containerRef}>
            {/* Floating Label Container */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`relative w-full px-4 py-3.5 rounded-[5px] border-2 transition-all cursor-pointer flex items-center justify-between
                    ${isOpen
                        ? 'border-blue-500 bg-white shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'
                        : isDarkMode ? 'border-white/10 bg-white/5 hover:border-white/20' : 'border-slate-300 bg-white hover:border-slate-400 shadow-sm'}`}
            >
                {/* The Floating Label with Count Badge */}
                <label className={`absolute left-3 -top-2.5 px-1.5 text-[11px] font-black transition-all flex items-center gap-1.5 z-10 rounded
                    ${isOpen ? 'text-blue-500 bg-white dark:bg-[#10141D]' : isDarkMode ? 'bg-[#10141D] text-slate-400' : 'bg-white text-slate-500'}`}>
                    <span>{label}</span>
                    {showCount && totalAvailableCount > 0 && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black leading-none transition-colors ${
                            isOpen
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-200'
                                : isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {totalAvailableCount}
                        </span>
                    )}
                </label>

                <span
                    title={fullTooltipText}
                    className={`text-[13px] font-bold truncate ${!hasValue ? 'opacity-30' : ''}`}
                >
                    {displayText}
                </span>

                <div className="flex items-center gap-2">
                    {hasValue && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(multiMode ? [] : '');
                            }}
                            className={`p-1 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                            title="Clear Selection"
                        >
                            <X size={12} strokeWidth={3} className="text-red-500" />
                        </button>
                    )}
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : 'opacity-40'}`} />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={`absolute z-100 left-0 mt-1 min-w-full sm:min-w-[340px] max-w-[min(480px,90vw)] py-1 rounded-[5px] border shadow-2xl animate-in fade-in zoom-in-95 duration-200
                    ${isDarkMode ? 'bg-[#1a1f2e] border-white/10 shadow-black' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>

                    {/* Dropdown Header Info */}
                    <div className={`px-3.5 py-2 border-b text-[10px] font-black uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 ${
                        isDarkMode ? 'bg-[#151922] border-white/5 text-slate-400' : 'bg-slate-50/95 border-slate-100 text-slate-500 backdrop-blur-sm'
                    }`}>
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Available {label}: <span className="text-blue-500 font-extrabold">{totalAvailableCount}</span>
                        </span>
                        {multiMode ? (
                            <button
                                onClick={handleSelectAll}
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all ${
                                    isDarkMode ? 'bg-white/10 hover:bg-white/20 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                                }`}
                            >
                                {safeArrayValue.length >= validOptions.length && validOptions.length > 0 ? 'Deselect All' : 'Select All'}
                            </button>
                        ) : searchTerm ? (
                            <span className="text-[9px] opacity-70 font-bold">
                                Found: {filteredOptions.length}
                            </span>
                        ) : null}
                    </div>

                    {/* Search Option */}
                    {options.length > 5 && (
                        <div className={`p-2 border-b sticky top-[33px] z-101 ${isDarkMode ? 'border-white/5 bg-[#1a1f2e]' : 'border-slate-100 bg-white'}`}>
                            <div className="relative">
                                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder={`Search ${label}... (${totalAvailableCount} available)`}
                                    className={`w-full pl-8 pr-3 py-2 rounded-[5px] text-[11px] font-bold outline-none transition-all
                                        ${isDarkMode ? 'bg-black/20 border border-white/10 text-white focus:border-blue-500' : 'bg-white border border-slate-200 text-slate-700 focus:border-blue-500 shadow-sm'}`}
                                />
                            </div>
                        </div>
                    )}

                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {hasValue && (
                            <div
                                onClick={() => {
                                    onChange(multiMode ? [] : '');
                                    if (!multiMode) setIsOpen(false);
                                }}
                                className={`px-4 py-2 bg-red-500/5 border-b transition-all flex items-center justify-between cursor-pointer group
                                    ${isDarkMode ? 'border-white/5 hover:bg-red-500/20' : 'border-slate-100 hover:bg-red-100'}`}
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Clear All Selections</span>
                                <X size={12} className="text-red-500 group-hover:scale-125 transition-transform" />
                            </div>
                        )}
                        {filteredOptions.length > 0 ? filteredOptions.map((opt, i) => {
                            const optVal = opt.id !== undefined ? opt.id : opt.value;
                            const isSelected = multiMode
                                ? safeArrayValue.includes(String(optVal))
                                : (String(opt.id) === String(value) || (opt.value !== undefined && opt.value === value && value !== ''));
                            const optText = String(opt.label || opt.name || opt.value || '');
                            return (
                                <div
                                    key={i}
                                    onClick={() => handleOptionClick(optVal)}
                                    className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-all flex items-center justify-between gap-3
                                        ${isSelected
                                            ? 'bg-blue-500 text-white'
                                            : isDarkMode ? 'hover:bg-white/10 text-slate-300 hover:text-white' : 'hover:bg-blue-50/80 text-slate-700 hover:text-blue-700'}`}
                                >
                                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                        {multiMode && (
                                            <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                                                isSelected
                                                    ? 'bg-white border-white text-blue-600'
                                                    : isDarkMode ? 'border-white/30 bg-white/5' : 'border-slate-300 bg-white'
                                            }`}>
                                                {isSelected && <Check size={10} strokeWidth={4} />}
                                            </div>
                                        )}
                                        <span className="break-words text-left leading-snug whitespace-normal">{optText}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {opt.topicCount !== undefined && (
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide transition-all ${
                                                isSelected
                                                    ? 'bg-white/20 text-white'
                                                    : isDarkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                            }`}>
                                                {opt.topicCount} {opt.topicCount === 1 ? 'topic' : 'topics'}
                                            </span>
                                        )}
                                        {opt.badge && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                isSelected
                                                    ? 'bg-white/20 text-white'
                                                    : isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {opt.badge}
                                            </span>
                                        )}
                                        {!multiMode && isSelected && <Check size={14} className="shrink-0" strokeWidth={3} />}
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

const QuestionBank = ({ onNavigate, isSelectionMode = false, onAssignQuestions, alreadySelectedIds = [], totalAllowed = 0, currentCount = 0 }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [view, setView] = useState('overview'); // 'overview', 'manual', 'repository', 'bulk'
    const [selectedQuestion, setSelectedQuestion] = useState(null);

    useEffect(() => {
        if (isSelectionMode) {
            setView('repository');
        }
    }, [isSelectionMode]);

    const toggleQuestionSelection = (id, e) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            if (!prev.includes(id)) {
                if (totalAllowed > 0 && currentCount + prev.length >= totalAllowed) {
                    alert(`Cannot select more questions. Maximum limit of ${totalAllowed} reached for this section.`);
                    return prev;
                }
                return [...prev, id];
            } else {
                return prev.filter(i => i !== id);
            }
        });
    };

    // Master Data States
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [targetExams, setTargetExams] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [examDetails, setExamDetails] = useState([]);
    const [isLoadingMaster, setIsLoadingMaster] = useState(false);

    // Repository State
    const [questions, setQuestions] = useState([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    // Repository Filter State
    // Repository Filter State
    const [filters, setFilters] = useState({
        classId: [],
        subjectId: [],
        topicId: [],
        chapterId: [],
        examTypeId: [],
        targetExamId: [],
        question_type: '',
        level: [],
        is_wrong: '',
        sortBy: 'newest',
        filterDate: '',
        testNameId: [],
        search: ''
    });

    const [isInternalSelectionMode, setIsInternalSelectionMode] = useState(false);
    const [selectedInternalIds, setSelectedInternalIds] = useState([]);
    const [isBulkUpdateLoading, setIsBulkUpdateLoading] = useState(false);
    const [bulkUpdateFields, setBulkUpdateFields] = useState({
        difficulty_level: '',
        subject: '',
        topic: '',
        chapter: '',
        class_level: '',
        exam_type: '',
        target_exam: '',
        test_name: '',
        is_wrong: '',
        solve_time: ''
    });
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);

    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [jumpToPage, setJumpToPage] = useState('');

    // Media Library State
    const [images, setImages] = useState([]);
    const [isLoadingImages, setIsLoadingImages] = useState(false);
    const [imageFilters, setImageFilters] = useState({
        classId: '',
        subjectId: '',
        topicId: ''
    });
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const mediaInputRef = useRef(null);

    // Debounced search state
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debouncedSearchRef = useRef(null);
    const activeFetchKeysRef = useRef(new Set()); // Track in-flight requests

    // Handle debounced search
    useEffect(() => {
        if (debouncedSearchRef.current) {
            clearTimeout(debouncedSearchRef.current);
        }

        debouncedSearchRef.current = setTimeout(() => {
            setDebouncedSearch(filters.search);
            setCurrentPage(1);
        }, 500);

        return () => {
            if (debouncedSearchRef.current) {
                clearTimeout(debouncedSearchRef.current);
            }
        };
    }, [filters.search]);

    // Filtered Questions Logic
    const filteredQuestions = useMemo(() => {
        const toArray = (val) => Array.isArray(val) ? val : (val !== undefined && val !== null && val !== '' ? [val] : []);
        const getFieldValues = (q, singleField, multiField) => {
            const multi = Array.isArray(q[multiField]) ? q[multiField] : [];
            const single = q[singleField]?.id || q[singleField]?._id || q[singleField];
            const allVals = new Set();
            multi.forEach(m => {
                const id = typeof m === 'object' && m !== null ? (m.id || m._id || m) : m;
                if (id !== undefined && id !== null && id !== '') allVals.add(String(id));
            });
            if (single !== undefined && single !== null && single !== '') allVals.add(String(single));
            return Array.from(allVals);
        };

        const checkMatch = (filterVal, itemValues) => {
            const selected = toArray(filterVal);
            if (selected.length === 0) return true;
            if (selected.includes('__NULL__') && itemValues.length === 0) return true;
            const validSelected = selected.filter(s => s !== '__NULL__').map(String);
            if (validSelected.length === 0) return selected.includes('__NULL__') ? itemValues.length === 0 : true;
            return validSelected.some(s => itemValues.map(String).includes(s));
        };

        const result = questions.filter(q => {
            const qClasses = getFieldValues(q, 'class_level', 'class_levels');
            if (!checkMatch(filters.classId, qClasses)) return false;

            const qSubjects = getFieldValues(q, 'subject', 'subjects');
            if (!checkMatch(filters.subjectId, qSubjects)) return false;

            const qChapters = getFieldValues(q, 'chapter', 'chapters');
            if (!checkMatch(filters.chapterId, qChapters)) return false;

            const qTopics = getFieldValues(q, 'topic', 'topics');
            if (!checkMatch(filters.topicId, qTopics)) return false;

            const qExamTypes = getFieldValues(q, 'exam_type', 'exam_types');
            if (!checkMatch(filters.examTypeId, qExamTypes)) return false;

            const qTargetExams = getFieldValues(q, 'target_exam', 'target_exams');
            if (!checkMatch(filters.targetExamId, qTargetExams)) return false;

            const qTestNames = getFieldValues(q, 'test_name', 'test_names');
            if (!checkMatch(filters.testNameId, qTestNames)) return false;

            const qLevels = getFieldValues(q, 'difficulty_level', 'difficulty_levels');
            if (q.level) qLevels.push(String(q.level));
            const normalizedQLevels = new Set();
            qLevels.forEach(lvl => {
                const s = String(lvl).toLowerCase();
                normalizedQLevels.add(s);
                if (LEVEL_NUM_TO_KEY[s]) normalizedQLevels.add(LEVEL_NUM_TO_KEY[s]);
            });
            if (!checkMatch(filters.level, Array.from(normalizedQLevels))) return false;

            if (filters.question_type && q.question_type !== filters.question_type) return false;

            if (filters.is_wrong !== '') {
                const filterVal = filters.is_wrong === 'true';
                if (q.is_wrong !== filterVal) return false;
            }

            if (filters.filterDate) {
                const qDate = new Date(q.created_at).toISOString().split('T')[0];
                if (qDate !== filters.filterDate) return false;
            }

            // Use debounced search instead of immediate filter search
            if (debouncedSearch) {
                const searchTerm = debouncedSearch.trim().toLowerCase();
                if (searchTerm) {
                    const qText = (q.question || q.content || '').toLowerCase();
                    const qId = String(q.id || q._id || '').toLowerCase();

                    // Resolve names from master data for searching if needed
                    const matchesSubjectName = qSubjects.some(sid => {
                        const sObj = subjects.find(s => String(s.id) === String(sid));
                        return (sObj?.name || '').toLowerCase().includes(searchTerm);
                    });

                    const matchesTopicName = qTopics.some(tid => {
                        const tObj = topics.find(t => String(t.id) === String(tid));
                        return (tObj?.name || '').toLowerCase().includes(searchTerm);
                    });

                    if (!qText.includes(searchTerm) &&
                        !qId.includes(searchTerm) &&
                        !matchesSubjectName &&
                        !matchesTopicName) {
                        return false;
                    }
                }
            }

            return true;
        });

        // Sorting Logic
        if (filters.sortBy === 'newest') {
            result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        } else if (filters.sortBy === 'oldest') {
            result.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        }

        return result;
    }, [questions, filters, debouncedSearch, subjects, topics]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
    const paginatedQuestions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredQuestions.slice(start, start + itemsPerPage);
    }, [filteredQuestions, currentPage, itemsPerPage]);

    const handleJumpToPage = () => {
        const pageNum = parseInt(jumpToPage);
        if (pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
            setJumpToPage('');
        } else {
            alert(`Please enter a valid page number between 1 and ${totalPages}`);
        }
    };

    const createNewQuestion = useCallback(() => ({
        tempId: Date.now() + Math.random(),
        question: '',
        question_type: 'SINGLE_CHOICE', // Initial individual type
        options: [
            { id: 1, content: '', isCorrect: false },
            { id: 2, content: '', isCorrect: false },
            { id: 3, content: '', isCorrect: false },
            { id: 4, content: '', isCorrect: false }
        ],
        solution: '',
        image_1: '',
        image_2: '',
        solve_time: 30,
        answerFrom: '',
        answerTo: ''
    }), []);

    const [formKey, setFormKey] = useState(0);

    const [form, setForm] = useState({
        id: null,
        classId: [],
        subjectId: [],
        chapterId: [],
        topicId: [],
        examTypeId: [],
        targetExamId: [],
        testNameId: [],
        level: ['easy'],
        hasCalculator: false,
        useNumericOptions: false,
        isIndependentSelection: false,
        questions: [createNewQuestion()]
    });

    const [isExtractingAI, setIsExtractingAI] = useState(false);
    const aiFileInputRef = useRef(null);

    const handleAIExtract = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const config = getAuthConfig();
        if (!config) return;

        setIsExtractingAI(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const apiUrl = getApiUrl();
            const res = await axios.post(`${apiUrl}/api/questions/extract-ai/`, formData, {
                headers: {
                    ...config.headers,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.status === 'success' && res.data.data.length > 0) {
                const extractedQuestions = res.data.data;
                const checkCorrect = (ans, label, index) => {
                    if (!ans) return false;
                    const a = String(ans).toUpperCase();
                    return a === label || a === String(index) || a.includes(`OPTION ${label}`) || a.includes(`OPTION ${index}`);
                };
                
                const newQuestions = extractedQuestions.map(q => {
                    const defaultOptions = [
                        { id: 1, content: processLatexToHtml(q.options?.[0] || ''), isCorrect: checkCorrect(q.correctAnswer, 'A', 1) },
                        { id: 2, content: processLatexToHtml(q.options?.[1] || ''), isCorrect: checkCorrect(q.correctAnswer, 'B', 2) },
                        { id: 3, content: processLatexToHtml(q.options?.[2] || ''), isCorrect: checkCorrect(q.correctAnswer, 'C', 3) },
                        { id: 4, content: processLatexToHtml(q.options?.[3] || ''), isCorrect: checkCorrect(q.correctAnswer, 'D', 4) }
                    ];

                    return {
                        ...createNewQuestion(),
                        question: processLatexToHtml(q.question || ''),
                        options: defaultOptions,
                        solution: processLatexToHtml(q.solution || ''),
                        image_1: q.diagramUrl || '',
                    };
                });

                setForm(prev => {
                    const firstQ = prev.questions[0];
                    const isHtmlEmpty = !firstQ.question || firstQ.question === '<p><br></p>' || firstQ.question === '<p></p>' || firstQ.question.trim() === '';
                    
                    if (prev.questions.length === 1 && isHtmlEmpty && !firstQ.image_1) {
                        return { ...prev, questions: newQuestions };
                    }
                    return { ...prev, questions: [...prev.questions, ...newQuestions] };
                });
                alert(`Successfully extracted ${extractedQuestions.length} question(s).`);
            } else {
                alert(res.data.message || 'No questions found.');
            }
        } catch (err) {
            console.error("AI Extraction failed", err);
            alert("Failed to extract questions from file.");
        } finally {
            setIsExtractingAI(false);
            if (aiFileInputRef.current) aiFileInputRef.current.value = '';
        }
    };

    const resetForm = () => {
        setFormKey(prev => prev + 1);
        setForm({
            id: null,
            classId: [],
            subjectId: [],
            chapterId: [],
            topicId: [],
            examTypeId: [],
            targetExamId: [],
            testNameId: [],
            level: ['1'],
            hasCalculator: false,
            useNumericOptions: false,
            isIndependentSelection: false,
            questions: [createNewQuestion()]
        });
    };

    // Math Modal State
    const [showMathTools, setShowMathTools] = useState(false);
    const [formulaValue, setFormulaValue] = useState('');
    // Auth Config Helper
    const getAuthConfig = useCallback(() => {
        const activeToken = token || localStorage.getItem('auth_token');
        if (!activeToken) return null;
        return { headers: { 'Authorization': `Bearer ${activeToken}` } };
    }, [token]);

    // Fetch Master Data (with localStorage cache)
    const fetchMasterData = useCallback(async (force = false) => {
        const fetchKey = 'master-data';
        if (activeFetchKeysRef.current.has(fetchKey)) return;

        // Check cache first
        const cached = localStorage.getItem('masterDataCache');
        const cacheTime = localStorage.getItem('masterDataCacheTime');
        const now = Date.now();

        // Use cache if less than 2 hours old, not forced, and contains chapters
        if (!force && cached && cacheTime && (now - JSON.parse(cacheTime) < 7200000)) {
            try {
                const data = JSON.parse(cached);
                if (data.chapters) {
                    setClasses(data.classes);
                    setSubjects(data.subjects);
                    setTopics(data.topics);
                    setExamTypes(data.examTypes);
                    setTargetExams(data.targetExams);
                    setChapters(data.chapters);
                    setExamDetails(data.examDetails);
                    return;
                }
            } catch (e) {
                localStorage.removeItem('masterDataCache');
            }
        }

        const config = getAuthConfig();
        if (!config) return;

        setIsLoadingMaster(true);
        activeFetchKeysRef.current.add(fetchKey);
        try {
            const apiUrl = getApiUrl();
            const [classRes, subRes, chapterRes, topicRes, typeRes, targetRes, detailRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/classes/`, config),
                axios.get(`${apiUrl}/api/master-data/subjects/`, config),
                axios.get(`${apiUrl}/api/master-data/chapters/`, config),
                axios.get(`${apiUrl}/api/master-data/topics/`, config),
                axios.get(`${apiUrl}/api/master-data/exam-types/`, config),
                axios.get(`${apiUrl}/api/master-data/target-exams/`, config),
                axios.get(`${apiUrl}/api/master-data/exam-details/`, config)
            ]);

            const extractData = (res) => Array.isArray(res.data) ? res.data : (res.data.results || []);

            const masterData = {
                classes: extractData(classRes),
                subjects: extractData(subRes),
                chapters: extractData(chapterRes),
                topics: extractData(topicRes),
                examTypes: extractData(typeRes),
                targetExams: extractData(targetRes),
                examDetails: extractData(detailRes)
            };

            // Cache for 2 hours
            localStorage.setItem('masterDataCache', JSON.stringify(masterData));
            localStorage.setItem('masterDataCacheTime', JSON.stringify(now));

            setClasses(masterData.classes);
            setSubjects(masterData.subjects);
            setTopics(masterData.topics);
            setExamTypes(masterData.examTypes);
            setTargetExams(masterData.targetExams);
            setChapters(masterData.chapters);
            setExamDetails(masterData.examDetails);
        } catch (err) {
            console.error("Failed to fetch master data", err);
        } finally {
            setIsLoadingMaster(false);
            activeFetchKeysRef.current.delete(fetchKey);
        }
    }, [getApiUrl, getAuthConfig]);

    // Fetch Questions
    const fetchQuestions = useCallback(async (force = false) => {
        const fetchKey = 'questions';
        if (activeFetchKeysRef.current.has(fetchKey)) return;

        const config = getAuthConfig();
        if (!config) return;

        setIsLoadingQuestions(true);
        activeFetchKeysRef.current.add(fetchKey);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/questions/`, config);
            const data = response.data;
            const questionList = Array.isArray(data) ? data : (data.results || data.questions || []);
            setQuestions(questionList);
        } catch (err) {
            console.error("Failed to fetch questions", err);
        } finally {
            setIsLoadingQuestions(false);
            activeFetchKeysRef.current.delete(fetchKey);
        }
    }, [getApiUrl, getAuthConfig]);

    // Fetch Images
    const fetchImages = useCallback(async (force = false) => {
        const fetchKey = 'images';
        if (activeFetchKeysRef.current.has(fetchKey)) return;

        const config = getAuthConfig();
        if (!config) return;

        setIsLoadingImages(true);
        activeFetchKeysRef.current.add(fetchKey);
        try {
            const apiUrl = getApiUrl();
            const params = new URLSearchParams();
            if (imageFilters.classId) params.append('class_level', imageFilters.classId);
            if (imageFilters.subjectId) params.append('subject', imageFilters.subjectId);
            if (imageFilters.topicId) params.append('topic', imageFilters.topicId);

            const res = await axios.get(`${apiUrl}/api/questions/images/?${params.toString()}`, config);
            const data = res.data;
            const imageList = Array.isArray(data) ? data : (data.results || data.images || []);
            setImages(imageList);
        } catch (err) {
            console.error("Failed to fetch images", err);
        } finally {
            setIsLoadingImages(false);
            activeFetchKeysRef.current.delete(fetchKey);
        }
    }, [getApiUrl, getAuthConfig, imageFilters]);

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const config = getAuthConfig();
        if (!config) return;

        setIsUploadingImage(true);
        const apiUrl = getApiUrl();
        const uploadedImages = [];

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('image', file);
                if (imageFilters.classId) formData.append('class_level', imageFilters.classId);
                if (imageFilters.subjectId) formData.append('subject', imageFilters.subjectId);
                if (imageFilters.topicId) formData.append('topic', imageFilters.topicId);

                const res = await axios.post(`${apiUrl}/api/questions/images/`, formData, {
                    headers: {
                        ...config.headers,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                uploadedImages.push(res.data);
            }
            setImages(prev => [...prev, ...uploadedImages]);
            alert(`Successfully uploaded ${files.length} images`);
        } catch (err) {
            console.error("Image upload failed", err);
            alert("Failed to upload some images");
        } finally {
            setIsUploadingImage(false);
            if (mediaInputRef.current) mediaInputRef.current.value = '';
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert("Image Link Copied to Clipboard!");
        });
    };

    // Stats State
    const [stats, setStats] = useState({
        total: 0,
        thisMonth: 0,
        lastBatch: 'No data'
    });

    const fetchStats = useCallback(async (force = false) => {
        const fetchKey = 'stats';
        if (activeFetchKeysRef.current.has(fetchKey)) return;

        const config = getAuthConfig();
        if (!config) return;
        activeFetchKeysRef.current.add(fetchKey);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/questions/stats/`, config);
            setStats(res.data);
        } catch (err) {
            console.error("Failed to fetch stats", err);
        } finally {
            activeFetchKeysRef.current.delete(fetchKey);
        }
    }, [getApiUrl, getAuthConfig]);

    // Master Data Active Lists
    const activeClasses = useMemo(() => classes.filter(c => c.is_active !== false), [classes]);
    const activeSubjects = useMemo(() => subjects.filter(s => s.is_active !== false), [subjects]);
    const activeChapters = useMemo(() => chapters.filter(c => c.is_active !== false), [chapters]);
    const activeTopics = useMemo(() => topics.filter(t => t.is_active !== false), [topics]);
    const activeExamTypes = useMemo(() => examTypes.filter(e => e.is_active !== false), [examTypes]);
    const activeTargetExams = useMemo(() => targetExams.filter(t => t.is_active !== false), [targetExams]);
    const activeExamDetails = useMemo(() => examDetails.filter(d => d.is_active !== false), [examDetails]);

    // Initialize master data and stats on mount, and listen for live updates
    useEffect(() => {
        const initializeData = async () => {
            await fetchMasterData();
            await fetchStats();
        };
        initializeData();

        const handleMasterDataUpdated = () => {
            fetchMasterData(true);
        };
        window.addEventListener('master-data-updated', handleMasterDataUpdated);
        window.addEventListener('master_data_updated', handleMasterDataUpdated);
        return () => {
            window.removeEventListener('master-data-updated', handleMasterDataUpdated);
            window.removeEventListener('master_data_updated', handleMasterDataUpdated);
        };
    }, [fetchMasterData, fetchStats]);

    useEffect(() => {
        if (view === 'media') {
            fetchImages();
        }
        if (view === 'repository' && questions.length === 0) {
            fetchQuestions();
        }
    }, [view, questions.length]);

    // Media Cascading Filters (Active only)
    const filteredSubjectsForMedia = useMemo(() => {
        if (!imageFilters.classId) return activeSubjects;
        const activeTop = topics.filter(t => t.is_active !== false);
        const subjectIds = [...new Set(activeTop
            .filter(t => String(t.class_level) === String(imageFilters.classId))
            .map(t => String(t.subject))
        )];
        return activeSubjects.filter(s => subjectIds.includes(String(s.id)));
    }, [activeSubjects, topics, imageFilters.classId]);

    const filteredTopicsForMedia = useMemo(() => {
        const activeChapIds = new Set(chapters.filter(c => c.is_active !== false).map(c => String(c.id)));
        const activeTop = topics.filter(t => t.is_active !== false && (!t.chapter || activeChapIds.has(String(t.chapter))));
        return activeTop.filter(t => {
            const matchesClass = !imageFilters.classId || String(t.class_level) === String(imageFilters.classId);
            const matchesSubject = !imageFilters.subjectId || String(t.subject) === String(imageFilters.subjectId);
            return matchesClass && matchesSubject;
        });
    }, [topics, chapters, imageFilters.classId, imageFilters.subjectId]);

    const repositoryFilteredSubjects = useMemo(() => {
        const classIds = Array.isArray(filters.classId) ? filters.classId.filter(id => id && id !== '__NULL__') : (filters.classId && filters.classId !== '__NULL__' ? [filters.classId] : []);
        if (classIds.length === 0) return activeSubjects;
        const activeTop = topics.filter(t => t.is_active !== false);
        const subjectIds = [...new Set(activeTop
            .filter(t => classIds.map(String).includes(String(t.class_level)))
            .map(t => String(t.subject))
        )];
        return activeSubjects.filter(s => subjectIds.includes(String(s.id)));
    }, [activeSubjects, topics, filters.classId]);

    const repositoryFilteredChapters = useMemo(() => {
        const classIds = Array.isArray(filters.classId) ? filters.classId.filter(id => id && id !== '__NULL__') : (filters.classId && filters.classId !== '__NULL__' ? [filters.classId] : []);
        const subjectIds = Array.isArray(filters.subjectId) ? filters.subjectId.filter(id => id && id !== '__NULL__') : (filters.subjectId && filters.subjectId !== '__NULL__' ? [filters.subjectId] : []);
        const activeChap = chapters.filter(c => c.is_active !== false);
        const activeTop = topics.filter(t => t.is_active !== false);
        return activeChap.filter(c => {
            const matchesClass = classIds.length === 0 || classIds.map(String).includes(String(c.class_level));
            const matchesSubject = subjectIds.length === 0 || subjectIds.map(String).includes(String(c.subject));
            return matchesClass && matchesSubject;
        }).map(c => ({
            ...c,
            topicCount: activeTop.filter(t => String(t.chapter) === String(c.id)).length
        }));
    }, [chapters, topics, filters.classId, filters.subjectId]);

    const repositoryFilteredTopics = useMemo(() => {
        const classIds = Array.isArray(filters.classId) ? filters.classId.filter(id => id && id !== '__NULL__') : (filters.classId && filters.classId !== '__NULL__' ? [filters.classId] : []);
        const subjectIds = Array.isArray(filters.subjectId) ? filters.subjectId.filter(id => id && id !== '__NULL__') : (filters.subjectId && filters.subjectId !== '__NULL__' ? [filters.subjectId] : []);
        const chapterIds = Array.isArray(filters.chapterId) ? filters.chapterId.filter(id => id && id !== '__NULL__') : (filters.chapterId && filters.chapterId !== '__NULL__' ? [filters.chapterId] : []);
        const activeChapIds = new Set(chapters.filter(c => c.is_active !== false).map(c => String(c.id)));
        const activeTop = topics.filter(t => t.is_active !== false && (!t.chapter || activeChapIds.has(String(t.chapter))));
        return activeTop.filter(t => {
            const matchesClass = classIds.length === 0 || classIds.map(String).includes(String(t.class_level));
            const matchesSubject = subjectIds.length === 0 || subjectIds.map(String).includes(String(t.subject));
            const matchesChapter = chapterIds.length === 0 || chapterIds.map(String).includes(String(t.chapter));
            return matchesClass && matchesSubject && matchesChapter;
        });
    }, [topics, chapters, filters.classId, filters.subjectId, filters.chapterId]);

    const bulkUpdateFilteredSubjects = useMemo(() => {
        if (!bulkUpdateFields.class_level) return activeSubjects;
        const activeTop = topics.filter(t => t.is_active !== false);
        const subjectIds = [...new Set(activeTop
            .filter(t => String(t.class_level) === String(bulkUpdateFields.class_level))
            .map(t => String(t.subject))
        )];
        return activeSubjects.filter(s => subjectIds.includes(String(s.id)));
    }, [activeSubjects, topics, bulkUpdateFields.class_level]);

    const bulkUpdateFilteredChapters = useMemo(() => {
        const activeChap = chapters.filter(c => c.is_active !== false);
        const activeTop = topics.filter(t => t.is_active !== false);
        return activeChap.filter(c => {
            const matchesClass = !bulkUpdateFields.class_level || String(c.class_level) === String(bulkUpdateFields.class_level);
            const matchesSubject = !bulkUpdateFields.subject || String(c.subject) === String(bulkUpdateFields.subject);
            return matchesClass && matchesSubject;
        }).map(c => ({
            ...c,
            topicCount: activeTop.filter(t => String(t.chapter) === String(c.id)).length
        }));
    }, [chapters, topics, bulkUpdateFields.class_level, bulkUpdateFields.subject]);

    const bulkUpdateFilteredTopics = useMemo(() => {
        const activeChapIds = new Set(chapters.filter(c => c.is_active !== false).map(c => String(c.id)));
        const activeTop = topics.filter(t => t.is_active !== false && (!t.chapter || activeChapIds.has(String(t.chapter))));
        return activeTop.filter(t => {
            const matchesClass = !bulkUpdateFields.class_level || String(t.class_level) === String(bulkUpdateFields.class_level);
            const matchesSubject = !bulkUpdateFields.subject || String(t.subject) === String(bulkUpdateFields.subject);
            const matchesChapter = !bulkUpdateFields.chapter || String(t.chapter) === String(bulkUpdateFields.chapter);
            return matchesClass && matchesSubject && matchesChapter;
        });
    }, [topics, chapters, bulkUpdateFields.class_level, bulkUpdateFields.subject, bulkUpdateFields.chapter]);

    // Cascading Filter: Filter subjects based on selected class (Active only)
    const filteredSubjects = useMemo(() => {
        if (form.isIndependentSelection) return activeSubjects;
        const classIds = Array.isArray(form.classId) ? form.classId : (form.classId ? [form.classId] : []);
        if (classIds.length === 0) return activeSubjects;
        const activeTop = topics.filter(t => t.is_active !== false);
        const subjectIds = [...new Set(activeTop
            .filter(t => classIds.map(String).includes(String(t.class_level)))
            .map(t => String(t.subject))
        )];
        return activeSubjects.filter(s => subjectIds.includes(String(s.id)));
    }, [activeSubjects, topics, form.classId, form.isIndependentSelection]);

    const filteredChapters = useMemo(() => {
        const activeChap = chapters.filter(c => c.is_active !== false);
        const activeTop = topics.filter(t => t.is_active !== false);
        let list = activeChap;
        if (!form.isIndependentSelection) {
            const classIds = Array.isArray(form.classId) ? form.classId.map(String) : (form.classId ? [String(form.classId)] : []);
            const subjectIds = Array.isArray(form.subjectId) ? form.subjectId.map(String) : (form.subjectId ? [String(form.subjectId)] : []);
            list = activeChap.filter(c => {
                const matchesClass = classIds.length === 0 || classIds.includes(String(c.class_level));
                const matchesSubject = subjectIds.length === 0 || subjectIds.includes(String(c.subject));
                return matchesClass && matchesSubject;
            });
        }
        return list.map(c => ({
            ...c,
            topicCount: activeTop.filter(t => String(t.chapter) === String(c.id)).length
        }));
    }, [chapters, topics, form.classId, form.subjectId, form.isIndependentSelection]);

    const filteredTopics = useMemo(() => {
        const activeChapIds = new Set(chapters.filter(c => c.is_active !== false).map(c => String(c.id)));
        const activeTop = topics.filter(t => t.is_active !== false && (!t.chapter || activeChapIds.has(String(t.chapter))));
        if (form.isIndependentSelection) return activeTop;
        const classIds = Array.isArray(form.classId) ? form.classId.map(String) : (form.classId ? [String(form.classId)] : []);
        const subjectIds = Array.isArray(form.subjectId) ? form.subjectId.map(String) : (form.subjectId ? [String(form.subjectId)] : []);
        const chapterIds = Array.isArray(form.chapterId) ? form.chapterId.map(String) : (form.chapterId ? [String(form.chapterId)] : []);
        return activeTop.filter(t => {
            const matchesClass = classIds.length === 0 || classIds.includes(String(t.class_level));
            const matchesSubject = subjectIds.length === 0 || subjectIds.includes(String(t.subject));
            const matchesChapter = chapterIds.length === 0 || chapterIds.includes(String(t.chapter));
            return matchesClass && matchesSubject && matchesChapter;
        });
    }, [topics, chapters, form.classId, form.subjectId, form.chapterId, form.isIndependentSelection]);

    // Helper to process and upload Base64 images from HTML content before saving to DB
    const processEditorImages = async (html) => {
        if (!html || !html.includes('data:image')) return html;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const imgs = tempDiv.getElementsByTagName('img');

        const config = getAuthConfig();
        const apiUrl = getApiUrl();
        if (!config) return html;

        const uploadPromises = Array.from(imgs).map(async (img) => {
            const src = img.getAttribute('src');
            if (src && src.startsWith('data:image')) {
                try {
                    // Convert Base64 to Blob
                    const res = await fetch(src);
                    const blob = await res.blob();
                    const file = new File([blob], "pasted_image.png", { type: blob.type });

                    const formData = new FormData();
                    formData.append('image', file);
                    if (form.classId) formData.append('class_level', form.classId);
                    if (form.subjectId) formData.append('subject', form.subjectId);
                    if (form.topicId) formData.append('topic', form.topicId);

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


    // Handle Option Toggle (Dynamic behavior for Single vs Multi Choice)
    const handleToggleOption = (qIndex, optId) => {
        setForm(prev => {
            const updatedQuestions = [...prev.questions];
            const currentQ = { ...updatedQuestions[qIndex] };
            const isMulti = currentQ.question_type === 'MULTI_CHOICE';

            currentQ.options = currentQ.options.map(opt => {
                if (opt.id === optId) {
                    return { ...opt, isCorrect: isMulti ? !opt.isCorrect : true };
                }
                return { ...opt, isCorrect: isMulti ? opt.isCorrect : false };
            });

            updatedQuestions[qIndex] = currentQ;
            return { ...prev, questions: updatedQuestions };
        });
    };

    const addMoreQuestion = () => {
        setForm(prev => ({
            ...prev,
            questions: [...prev.questions, createNewQuestion()]
        }));
    };

    const removeQuestion = (index) => {
        if (form.questions.length <= 1) return;
        setForm(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));
    };

    // Formula/Math Modal Component
    const renderMathModal = () => {
        if (!showMathTools) return null;
        return (
            <div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMathTools(false)} />
                <div className={`relative w-full max-w-xl rounded-[5px] overflow-hidden shadow-2xl animate-in zoom-in duration-300 ${isDarkMode ? 'bg-[#10141D]' : 'bg-white'}`}>
                    <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
                        <div className="flex items-center gap-3">
                            <Sigma size={24} />
                            <h3 className="font-black uppercase tracking-widest text-sm">LaTeX Formula Author</h3>
                        </div>
                        <button onClick={() => setShowMathTools(false)}><X size={20} /></button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Equation Code</label>
                            <textarea
                                value={formulaValue}
                                onChange={(e) => setFormulaValue(e.target.value)}
                                placeholder="e.g. \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
                                className={`w-full h-32 p-4 rounded-[5px] border font-mono text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Live Preview</label>
                            <MathPreview tex={formulaValue} isDarkMode={isDarkMode} />
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {[
                                { l: '±', t: '\\pm' }, { l: '√', t: '\\sqrt{x}' }, { l: '∛', t: '\\sqrt[3]{x}' },
                                { l: 'ⁿ√', t: '\\sqrt[n]{x}' }, { l: 'x/y', t: '\\frac{x}{y}' },
                                { l: 'Σ', t: '\\sum_{x}^{n}' }, { l: 'Π', t: '\\prod_{x}^{n}' },
                                { l: '∫', t: '\\int_{x}^{s}' }, { l: '(n k)', t: '\\binom{n}{k}' },
                                { l: 'θ', t: '\\theta' }, { l: 'λ', t: '\\lambda' }, { l: 'Δ', t: '\\Delta' },
                                { l: 'π', t: '\\pi' }, { l: '∞', t: '\\infty' }, { l: '≠', t: '\\neq' },
                                { l: '≈', t: '\\approx' }, { l: '∈', t: '\\in' }, { l: '⊆', t: '\\subseteq' },
                                { l: '∪', t: '\\cup' }, { l: '∩', t: '\\cap' }
                            ].map((sym, i) => (
                                <button
                                    key={i}
                                    onClick={() => setFormulaValue(prev => prev + sym.t)}
                                    className={`p-2 rounded-[5px] text-[10px] font-bold border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-blue-500/20 hover:text-blue-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50'}`}
                                >
                                    {sym.l}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={insertFormula}
                            disabled={!formulaValue}
                            className="w-full py-4 bg-blue-600 text-white rounded-[5px] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
                        >
                            Insert into Editor
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Overview View Inner State handling
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) setSelectedFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        const config = getAuthConfig();
        if (!config) return;

        setIsUploading(true);
        setUploadProgress(10);

        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await axios.post(`${apiUrl}/api/questions/bulk-upload/`, formData, {
                headers: {
                    'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(Math.max(10, percentCompleted));
                }
            });

            setUploadProgress(100);

            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
                setSelectedFile(null);

                const { message, errors, data } = response.data;
                if (errors && errors.length > 0) {
                    alert(`${message}\n\nErrors encountered:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...and more' : ''}`);
                } else {
                    alert(message || "Bulk Question Import Successful!");
                }

                // Optimistic update: add new questions to state without full refetch
                if (data && Array.isArray(data)) {
                    setQuestions(prev => [...data, ...prev]);
                } else {
                    fetchQuestions(); // Fallback if no data returned
                }
                setView('repository'); // Take user to repository to see results
            }, 800);

        } catch (err) {
            console.error("Bulk upload failed", err);
            alert("Failed to import questions: " + (err.response?.data?.error || err.message));
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = [
            "SL NO (*)", "Class", "Subject (*)", "Topic (*)", "Exam Type", "Target Exam",
            "Question Type (*)", "Level (*)", "Calculator(yes/no)", "Numeric(yes/no)",
            "Question (*)", "Question Image (1st) (*)", "Question Image (2nd)",
            "Answer 1 (*)", "Answer 2 (*)", "Answer 3 (*)", "Answer 4 (*)", "Correct Answer (*)"
        ];

        const dummyData = [
            [
                "1", "Class 10", "Physics", "Optics", "WB Board", "NEET",
                "1", "Class 10", "Physics", "Optics", "WB Board", "NEET",
                "SINGLE_CHOICE", "1", "No", "No",
                "What is the speed of light in vacuum?",
                "https://your-portal.com/media/questions/physics_01.png",
                "",
                "3x10^8 m/s", "2x10^8 m/s", "1x10^8 m/s", "4x10^8 m/s", "A"
            ],
            [
                "2", "Class 12", "Mathematics", "Calculus", "JEE Main", "JEE Advanced",
                "NUMERICAL", "3", "Yes", "Yes",
                "Find the derivative of sin(x) at x=0.",
                "https://your-portal.com/media/questions/math_diagram.png",
                "https://your-portal.com/media/questions/formula_sheet.png",
                "1", "", "", "", "1"
            ]
        ];

        // Format as CSV
        const csvContent = [
            headers.join(","),
            ...dummyData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "QuestionBank_Template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderOverview = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className={`p-10 rounded-[5px] border shadow-2xl relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-orange-500 rounded-[5px] shadow-lg shadow-orange-500/30">
                                <Database className="text-white" size={24} />
                            </div>
                            <h2 className="text-4xl font-black tracking-tight uppercase">
                                Question <span className="text-orange-500">Bank</span>
                            </h2>
                        </div>
                        <p className={`text-sm font-medium max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Centralized repository for all academic assessments. Manage questions across different subjects, classes, and difficulty levels with precision.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
                        <div className={`px-5 py-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} flex items-center gap-3.5`}>
                            <div className="p-2.5 rounded-[5px] bg-blue-500/10 text-blue-500 shrink-0">
                                <Database size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5 truncate">Total Questions</p>
                                <p className="text-lg font-black tracking-tight">{stats.total || questions.length || 0}</p>
                            </div>
                        </div>

                        <div className={`px-5 py-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} flex items-center gap-3.5`}>
                            <div className="p-2.5 rounded-[5px] bg-purple-500/10 text-purple-500 shrink-0">
                                <BookOpen size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5 truncate">Total Chapters</p>
                                <p className="text-lg font-black tracking-tight">{activeChapters.length || 0}</p>
                            </div>
                        </div>

                        <div className={`px-5 py-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} flex items-center gap-3.5`}>
                            <div className="p-2.5 rounded-[5px] bg-indigo-500/10 text-indigo-500 shrink-0">
                                <Tag size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5 truncate">Total Topics</p>
                                <p className="text-lg font-black tracking-tight">{activeTopics.length || 0}</p>
                            </div>
                        </div>

                        <div className={`px-5 py-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} flex items-center gap-3.5`}>
                            <div className="p-2.5 rounded-[5px] bg-orange-500/10 text-orange-500 shrink-0">
                                <Clock size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5 truncate">Last Batch</p>
                                <p className="text-lg font-black tracking-tight truncate">{stats.lastBatch || 'No data'}</p>
                            </div>
                        </div>

                        <div className={`px-5 py-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} flex items-center gap-3.5`}>
                            <div className="p-2.5 rounded-[5px] bg-emerald-500/10 text-emerald-500 shrink-0">
                                <Plus size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5 truncate">Added This Month</p>
                                <p className="text-lg font-black tracking-tight">+{stats.thisMonth || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className={`p-8 rounded-[5px] border shadow-xl flex flex-col h-full ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Bulk Import</h3>
                                <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Upload Excel / CSV Files</p>
                            </div>
                        </div>

                        <div
                            onClick={() => setView('bulk')}
                            className={`flex-1 min-h-[300px] rounded-[5px] border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center relative cursor-pointer
                                ${isDarkMode ? 'border-white/10 hover:border-orange-500/50 hover:bg-orange-500/5' : 'border-slate-200 hover:border-orange-500/30 hover:bg-slate-50'}`}
                        >
                            <CloudUpload size={48} className="text-orange-500 mb-6 animate-bounce" />
                            <h4 className="text-lg font-black uppercase tracking-tight mb-2">Bulk Import Questions</h4>
                            <p className="text-xs font-medium opacity-50 mb-8 max-w-[280px]">Upload your Excel or CSV files with our standardized format.</p>

                            <button className="px-8 py-3.5 bg-orange-500 text-white rounded-[5px] font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/30 active:scale-95 flex items-center gap-3">
                                <FileSpreadsheet size={18} />
                                <span>Get Started</span>
                            </button>

                            <div className="mt-6 flex items-center gap-2 text-orange-500 font-black uppercase tracking-widest text-[10px] opacity-70">
                                View Instructions & Format <ChevronRight size={14} strokeWidth={4} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div onClick={() => { resetForm(); setView('manual'); }} className={`p-8 rounded-[5px] border shadow-xl group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                        <div className="w-14 h-14 bg-blue-500 rounded-[5px] shadow-lg shadow-blue-500/30 flex items-center justify-center mb-6 text-white"><Plus size={28} strokeWidth={3} /></div>
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2">Manual Entry</h3>
                        <p className="text-sm font-medium opacity-60 mb-8 leading-relaxed">Create complex questions manually with equations and multi-format options.</p>
                        <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-widest text-[10px]">Add Question Now <ChevronRight size={14} strokeWidth={4} /></div>
                    </div>
                    <div
                        onClick={() => {
                            fetchQuestions();
                            setView('repository');
                        }}
                        className={`p-8 rounded-[5px] border shadow-xl relative group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}
                    >
                        <div className="w-14 h-14 bg-emerald-500 rounded-[5px] shadow-lg flex items-center justify-center mb-6 text-white"><Layers size={28} /></div>
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2">Question Bank</h3>
                        <p className="text-sm font-medium opacity-60 mb-8 leading-relaxed">Explore historical question bank. Filter by tags or level.</p>
                        <div className="flex items-center gap-2 text-emerald-500 font-black uppercase tracking-widest text-[10px]">Browse All <ChevronRight size={14} strokeWidth={4} /></div>
                    </div>
                    <div
                        onClick={() => {
                            if (onNavigate) {
                                onNavigate('Admin Master Data', 'Image');
                            } else {
                                setView('media');
                            }
                        }}
                        className={`p-8 rounded-[5px] border shadow-xl relative group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}
                    >
                        <div className="w-14 h-14 bg-purple-500 rounded-[5px] shadow-lg flex items-center justify-center mb-6 text-white"><ImageIcon size={28} /></div>
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2">Media Master</h3>
                        <p className="text-sm font-medium opacity-60 mb-8 leading-relaxed">Upload and manage question images. Copy links for Excel.</p>
                        <div className="flex items-center gap-2 text-purple-500 font-black uppercase tracking-widest text-[10px]">Manage Media <ChevronRight size={14} strokeWidth={4} /></div>
                    </div>
                </div>
            </div>
        </div>
    );




    // Form Submission Handler
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        // Validation: Every question must have content and at least one answer if not numerical
        const isValid = form.questions.every(q => {
            const hasContent = !!(q.question || q.content);
            const needsAnswer = !['NUMERICAL', 'INTEGER_TYPE'].includes(q.question_type);
            const hasAnswer = needsAnswer ? q.options.some(o => o.isCorrect) : true;
            return hasContent && hasAnswer;
        });

        if (!isValid) {
            alert("Please ensure all questions have content and correct answers selected.");
            return;
        }

        setIsSubmitting(true);
        try {
            const config = getAuthConfig();
            const apiUrl = getApiUrl();

            let successCount = 0;

            // Loop through all questions in the batch
            for (const q of form.questions) {
                // Sync all Base64 images to cloud before generating the payload
                const cleanContent = await processEditorImages(q.question);
                const cleanSolution = await processEditorImages(q.solution);

                // Process option contents as well
                const cleanOptions = await Promise.all(q.options.map(async opt => ({
                    ...opt,
                    content: await processEditorImages(opt.content)
                })));

                const toArray = (val) => Array.isArray(val) ? val : (val ? [val] : []);
                const firstOrNull = (val) => {
                    if (Array.isArray(val)) return val.length > 0 ? val[0] : null;
                    return val || null;
                };

                const classList = toArray(form.classId);
                const subjectList = toArray(form.subjectId);
                const chapterList = toArray(form.chapterId);
                const topicList = toArray(form.topicId);
                const examTypeList = toArray(form.examTypeId);
                const targetExamList = toArray(form.targetExamId);
                const testNameList = toArray(form.testNameId);
                const levelList = toArray(form.level);

                const payload = {
                    content: cleanContent,
                    question_options: cleanOptions,
                    solution: cleanSolution,
                    question_type: q.question_type,
                    difficulty_level: levelList.length > 0 ? String(levelList[0]) : 'easy',
                    difficulty_levels: levelList.map(String),
                    class_level: firstOrNull(classList),
                    class_levels: classList,
                    subject: firstOrNull(subjectList),
                    subjects: subjectList,
                    chapter: firstOrNull(chapterList),
                    chapters: chapterList,
                    topic: firstOrNull(topicList),
                    topics: topicList,
                    exam_type: firstOrNull(examTypeList),
                    exam_types: examTypeList,
                    target_exam: firstOrNull(targetExamList),
                    target_exams: targetExamList,
                    test_name: firstOrNull(testNameList),
                    test_names: testNameList,
                    has_calculator: form.hasCalculator,
                    use_numeric_options: form.useNumericOptions,
                    solve_time: q.solve_time || 30,
                    answer_from: q.answerFrom || null,
                    answer_to: q.answerTo || null,
                    image_1: q.image_1,
                    image_2: q.image_2,
                };

                let result;
                if (form.id && q.tempId === form.id) {
                    result = await axios.patch(`${apiUrl}/api/questions/${form.id}/`, payload, config);
                    setQuestions(prev => prev.map(qu => (qu.id === form.id || qu._id === form.id) ? result.data : qu));
                } else {
                    result = await axios.post(`${apiUrl}/api/questions/`, payload, config);
                    setQuestions(prev => [result.data, ...prev]);
                }
                successCount++;
            }

            alert(`${successCount} Question(s) ${form.id ? 'updated' : 'added'} successfully!`);
            resetForm();
            if (form.id) setView('repository');

        } catch (error) {
            console.error("Submission Error", error);
            alert("Failed to save some questions. Check console for details.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-save progress while editing
    useEffect(() => {
        if (view === 'manual') {
            const timer = setTimeout(() => {
                localStorage.setItem('question_draft', JSON.stringify(form));
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [form, view]);

    const handleSaveProgress = () => {
        localStorage.setItem('question_draft', JSON.stringify(form));
        alert("Progress saved locally!");
    };

    const handleLoadDraft = () => {
        const saved = localStorage.getItem('question_draft');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setForm(parsed);
                setFormKey(prev => prev + 1);
                alert("Restored from draft!");
            } catch (err) {
                console.error("Draft load failed", err);
            }
        } else {
            alert("No saved drafts found.");
        }
    };


    const renderPagination = () => (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-dashed border-slate-200/50 mt-4">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Rows per page:</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className={`px-2 py-1 rounded-[5px] text-xs font-bold border outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-50">
                    {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredQuestions.length)} of {filteredQuestions.length}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-[5px] border disabled:opacity-30 hover:bg-slate-50 transition-all dark:hover:bg-white/5"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-black px-2">Page {currentPage} of {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-[5px] border disabled:opacity-30 hover:bg-slate-50 transition-all dark:hover:bg-white/5"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-2 pl-4 border-l border-slate-200/50">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Jump to:</span>
                    <input
                        type="number"
                        value={jumpToPage}
                        onChange={(e) => setJumpToPage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()}
                        className={`w-12 px-2 py-1 rounded-[5px] text-xs font-bold border outline-none text-center ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                    />
                    <button
                        onClick={handleJumpToPage}
                        className="p-1.5 rounded-[5px] bg-emerald-500 text-white shadow-sm active:scale-95"
                    >
                        <ChevronRight size={12} strokeWidth={4} />
                    </button>
                </div>
            </div>
        </div>
    );

    const handleMarkAsWrong = async (questionId) => {
        if (!confirm("Are you sure you want to change the 'Wrong' status of this question?")) return;
        try {
            const config = getAuthConfig();
            const apiUrl = getApiUrl();
            setQuestions(prev => prev.map(q =>
                (q.id === questionId || q._id === questionId) ? { ...q, is_wrong: !q.is_wrong } : q
            ));
            await axios.post(`${apiUrl}/api/questions/${questionId}/mark_wrong/`, {}, config);
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update status");
            fetchQuestions();
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (!confirm("Are you sure you want to permanently DELETE this question? This cannot be undone.")) return;
        try {
            const config = getAuthConfig();
            const apiUrl = getApiUrl();
            setQuestions(prev => prev.filter(q => q.id !== questionId && q._id !== questionId));
            if (selectedQuestion && (selectedQuestion.id === questionId || selectedQuestion._id === questionId)) {
                setSelectedQuestion(null);
            }
            await axios.delete(`${apiUrl}/api/questions/${questionId}/`, config);
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Failed to delete question");
            fetchQuestions();
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedInternalIds.length) return;
        if (!confirm(`Are you sure you want to DELETE ${selectedInternalIds.length} questions? This cannot be undone.`)) return;
        try {
            const config = getAuthConfig();
            const apiUrl = getApiUrl();
            setQuestions(prev => prev.filter(q => !selectedInternalIds.includes(q.id) && !selectedInternalIds.includes(q._id)));
            setSelectedInternalIds([]);
            setIsInternalSelectionMode(false);
            await axios.post(`${apiUrl}/api/questions/bulk-delete/`, { ids: selectedInternalIds }, config);
            alert(`Successfully deleted ${selectedInternalIds.length} questions`);
        } catch (error) {
            console.error("Bulk delete error", error);
            alert("Failed to perform bulk deletion");
            fetchQuestions();
        }
    };

    const handleBulkUpdate = async () => {
        if (!selectedInternalIds.length) return;
        const hasUpdates = Object.values(bulkUpdateFields).some(val => val !== '');
        if (!hasUpdates) {
            alert("Please select at least one field to update.");
            return;
        }
        setIsBulkUpdateLoading(true);
        try {
            const config = getAuthConfig();
            const apiUrl = getApiUrl();
            setQuestions(prev => prev.map(q => {
                if (selectedInternalIds.includes(q.id) || selectedInternalIds.includes(q._id)) {
                    const updates = {};
                    Object.keys(bulkUpdateFields).forEach(key => {
                        if (bulkUpdateFields[key] !== '') {
                            if (key === 'solve_time') {
                                updates[key] = parseInt(bulkUpdateFields[key]);
                            } else {
                                updates[key] = bulkUpdateFields[key];
                            }
                        }
                    });
                    return { ...q, ...updates };
                }
                return q;
            }));
            await axios.post(`${apiUrl}/api/questions/bulk-update/`, {
                ids: selectedInternalIds,
                updates: bulkUpdateFields
            }, config);
            alert(`Successfully updated ${selectedInternalIds.length} questions`);
            setShowBulkUpdateModal(false);
            setSelectedInternalIds([]);
            setIsInternalSelectionMode(false);
            setBulkUpdateFields({
                difficulty_level: '',
                subject: '',
                topic: '',
                chapter: '',
                class_level: '',
                exam_type: '',
                target_exam: '',
                test_name: '',
                is_wrong: '',
                solve_time: ''
            });
        } catch (error) {
            console.error("Bulk update error", error);
            alert("Failed to perform bulk update");
            fetchQuestions();
        } finally {
            setIsBulkUpdateLoading(false);
        }
    };

    const renderRepository = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            {/* Nav Header */}
            <div className="flex items-center justify-between">
                {!isSelectionMode ? (
                    <>
                        <button
                            onClick={() => setView('overview')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-[5px] font-black uppercase tracking-widest text-[10px] transition-all
                                ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                        >
                            <ArrowLeft size={16} />
                            Back to Overview
                        </button>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    setIsInternalSelectionMode(!isInternalSelectionMode);
                                    setSelectedInternalIds([]);
                                }}
                                className={`flex items-center gap-2 px-6 py-3 rounded-[5px] font-black uppercase tracking-widest text-[10px] transition-all
                                    ${isInternalSelectionMode
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 active:scale-95'
                                        : isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                            >
                                <Layers size={16} />
                                {isInternalSelectionMode ? 'Cancel Bulk' : 'Bulk Select'}
                            </button>
                            <button
                                onClick={() => { resetForm(); setView('manual'); }}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-[5px] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/30 hover:bg-blue-600 active:scale-95 transition-all"
                            >
                                <Plus size={16} strokeWidth={3} />
                                Add Question
                            </button>
                            <div className="flex items-center gap-3 pl-4 border-l border-slate-200/20">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Repository Mode</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Question Selection Mode</span>
                    </div>
                )}
            </div>

            {/* Questions Grid */}
            <div className={`p-10 rounded-[5px] border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="mb-4 space-y-8 border-b border-dashed border-slate-200/50 pb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tight">Question <span className="text-emerald-500">Bank</span></h2>
                            <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage your existing question bank
                            </p>
                        </div>
                    </div>

                    {/* Direct Search Bar */}
                    <div className="relative group w-full">
                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${filters.search ? 'text-emerald-500' : 'opacity-30'}`}>
                            <Search size={22} strokeWidth={3} />
                        </div>
                        <input
                            type="text"
                            placeholder="SEARCH BY QUESTION TEXT, ID, OR TOPIC..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className={`w-full pl-14 pr-12 py-4 rounded-[5px] border-2 text-[11px] font-black uppercase tracking-[0.2em] outline-none transition-all
                                ${isDarkMode
                                    ? 'bg-white/5 border-white/10 text-white focus:border-emerald-500/50 focus:bg-white/10'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-emerald-500/30 focus:bg-white shadow-inner'}`}
                        />
                        {filters.search && (
                            <button
                                onClick={() => setFilters({ ...filters, search: '' })}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all"
                            >
                                <X size={18} strokeWidth={3} className="text-slate-400" />
                            </button>
                        )}
                    </div>

                    {/* Filters */}
                    {/* Filters - Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <CustomSelect
                            isMulti={true}
                            label="Filter Class"
                            value={filters.classId}
                            options={[{ id: '__NULL__', name: 'None / Not Assigned' }, ...activeClasses]}
                            placeholder="All Classes"
                            onChange={(val) => setFilters({ ...filters, classId: val })}
                        />
                        <CustomSelect
                            isMulti={true}
                            label="Filter Subject"
                            value={filters.subjectId}
                            options={[{ id: '__NULL__', name: 'None / Not Assigned' }, ...repositoryFilteredSubjects]}
                            placeholder="All Subjects"
                            onChange={(val) => setFilters({ ...filters, subjectId: val })}
                        />
                        <CustomSelect
                            isMulti={true}
                            label="Filter Chapter"
                            value={filters.chapterId}
                            options={[{ id: '__NULL__', name: 'None / Not Assigned' }, ...repositoryFilteredChapters]}
                            placeholder="All Chapters"
                            onChange={(val) => setFilters({ ...filters, chapterId: val })}
                        />
                        <CustomSelect
                            isMulti={true}
                            label="Filter Topic"
                            value={filters.topicId}
                            options={[{ id: '__NULL__', name: 'None / Not Assigned' }, ...repositoryFilteredTopics]}
                            placeholder="All Topics"
                            onChange={(val) => setFilters({ ...filters, topicId: val })}
                        />
                        <CustomSelect
                            isMulti={true}
                            label="Exam Type"
                            value={filters.examTypeId}
                            options={[{ id: '__NULL__', name: 'None / Not Assigned' }, ...activeExamTypes]}
                            placeholder="All Exams"
                            onChange={(val) => setFilters({ ...filters, examTypeId: val })}
                        />
                        <CustomSelect
                            isMulti={true}
                            label="Target Exam"
                            value={filters.targetExamId}
                            options={[{ id: '__NULL__', name: 'None / Not Assigned' }, ...activeTargetExams]}
                            placeholder="All Targets"
                            onChange={(val) => setFilters({ ...filters, targetExamId: val })}
                        />
                    </div>

                    {/* Filters - Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mt-4">
                        <CustomSelect
                            isMulti={true}
                            label="Filter Test Name"
                            value={filters.testNameId}
                            options={[{ id: '__NULL__', name: 'None / Not Assigned' }, ...activeExamDetails]}
                            placeholder="All Tests"
                            onChange={(val) => setFilters({ ...filters, testNameId: val })}
                        />
                        <CustomSelect
                            label="Q. Type"
                            value={filters.question_type}
                            options={[
                                { value: '', label: 'All Types' },
                                { value: 'SINGLE_CHOICE', label: 'Single Choice' },
                                { value: 'MULTI_CHOICE', label: 'Multi Choice' },
                                { value: 'INTEGER_TYPE', label: 'Integer' }
                            ]}
                            placeholder="All Types"
                            onChange={(val) => setFilters({ ...filters, question_type: val })}
                        />
                        <CustomSelect
                            isMulti={true}
                            label="Difficulty"
                            value={filters.level}
                            options={DIFFICULTY_OPTIONS}
                            placeholder="All Levels"
                            onChange={(val) => setFilters({ ...filters, level: val })}
                        />
                        <CustomSelect
                            label="Status"
                            value={filters.is_wrong}
                            options={[
                                { value: '', label: 'All Status' },
                                { value: 'true', label: 'Wrong Only' },
                                { value: 'false', label: 'Correct Only' }
                            ]}
                            placeholder="All Status"
                            onChange={(val) => setFilters({ ...filters, is_wrong: val })}
                        />
                        <CustomSelect
                            label="Sort By"
                            value={filters.sortBy}
                            options={[
                                { value: 'newest', label: 'Newest First' },
                                { value: 'oldest', label: 'Oldest First' }
                            ]}
                            placeholder="Sort By"
                            onChange={(val) => setFilters({ ...filters, sortBy: val })}
                        />

                        {/* Date Filter */}
                        <div className="relative group">
                            <label className={`absolute left-3 -top-2 px-1 text-[11px] font-bold transition-all z-10
                                ${isDarkMode ? 'bg-[#10141D] text-slate-400' : 'bg-white text-slate-500'}`}>
                                Filter Date
                            </label>
                            <input
                                type="date"
                                value={filters.filterDate}
                                onChange={(e) => setFilters({ ...filters, filterDate: e.target.value })}
                                className={`w-full px-4 py-[11px] rounded-[5px] border-2 text-[13px] font-bold outline-none transition-all
                                    ${isDarkMode
                                        ? 'bg-white/5 border-white/10 text-white focus:border-blue-500'
                                        : 'bg-white border-slate-300 text-slate-700 focus:border-blue-500 shadow-sm'}`}
                            />
                        </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex justify-end mt-6">
                        <button
                            onClick={() => setFilters({
                                classId: '',
                                subjectId: '',
                                topicId: '',
                                chapterId: '',
                                examTypeId: '',
                                targetExamId: '',
                                question_type: '',
                                level: [],
                                is_wrong: '',
                                sortBy: 'newest',
                                filterDate: '',
                                testNameId: '',
                                search: ''
                            })}
                            className={`h-[42px] px-8 rounded-[5px] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg
                                ${isDarkMode
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                    : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 shadow-red-500/5'}`}
                        >
                            <RefreshCcw size={14} strokeWidth={3} />
                            Reset Filters
                        </button>
                    </div>
                </div>

                {isLoadingQuestions ? (
                    <div className="flex flex-col gap-4 mt-8 animate-pulse">
                        {Array(5).fill(0).map((_, i) => (
                            <div key={i} className={`p-8 rounded-[5px] border flex flex-col lg:flex-row gap-6 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className={`w-12 h-12 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        <div className={`h-6 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        <div className={`h-6 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        <div className={`h-6 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className={`h-4 w-full rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        <div className={`h-4 w-3/4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3 lg:min-w-[170px] border-l border-dashed border-slate-200/20 pl-8">
                                    <div className={`h-3 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                    <div className="flex gap-3 mt-auto">
                                        <div className={`h-10 w-10 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        <div className={`h-10 w-10 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        {filteredQuestions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                <Database size={48} className="mb-4" />
                                <span className="text-xs font-black uppercase tracking-widest">No Questions Found</span>
                            </div>
                        ) : (
                            <>
                                {/* Bulk selection actions */}
                                {(isSelectionMode || isInternalSelectionMode) && (
                                    <div className={`mt-6 p-4 rounded-[5px] border-2 border-dashed flex flex-wrap items-center justify-between gap-6 transition-all ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200 shadow-sm'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2.5 rounded-[5px] ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}>
                                                <CheckCircle size={20} strokeWidth={3} />
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] font-black uppercase tracking-widest leading-none mb-1">Bulk Operations</h4>
                                                <p className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em]">
                                                    {(isSelectionMode ? selectedIds.length : selectedInternalIds.length)} questions selected out of {filteredQuestions.length} matching
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            {isInternalSelectionMode && (isSelectionMode ? false : true) && (
                                                <>
                                                    <button
                                                        disabled={selectedInternalIds.length === 0}
                                                        onClick={() => {
                                                            setBulkUpdateFields({
                                                                difficulty_level: '',
                                                                subject: '',
                                                                topic: '',
                                                                class_level: '',
                                                                exam_type: '',
                                                                target_exam: '',
                                                                test_name: '',
                                                                is_wrong: ''
                                                            });
                                                            setShowBulkUpdateModal(true);
                                                        }}
                                                        className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                                                    >
                                                        <RefreshCcw size={14} strokeWidth={3} />
                                                        Bulk Update
                                                    </button>
                                                    <button
                                                        disabled={selectedInternalIds.length === 0}
                                                        onClick={handleBulkDelete}
                                                        className="px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2"
                                                    >
                                                        <Trash2 size={14} strokeWidth={3} />
                                                        Bulk Delete
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => {
                                                    const availableSlots = totalAllowed > 0
                                                        ? Math.max(0, totalAllowed - currentCount - selectedIds.length)
                                                        : Infinity;

                                                    const allIdsToSelect = filteredQuestions
                                                        .filter(q => !alreadySelectedIds.includes(q.id || q._id))
                                                        .map(q => q.id || q._id);

                                                    if (isSelectionMode) {
                                                        const targetIds = allIdsToSelect.filter(id => !selectedIds.includes(id));
                                                        if (totalAllowed > 0 && targetIds.length > availableSlots) {
                                                            if (availableSlots === 0) {
                                                                alert(`Maximum limit of ${totalAllowed} reached.`); return;
                                                            }
                                                            setSelectedIds([...selectedIds, ...targetIds.slice(0, availableSlots)]);
                                                        } else {
                                                            setSelectedIds([...selectedIds, ...targetIds]);
                                                        }
                                                    } else {
                                                        const targetIds = allIdsToSelect.filter(id => !selectedInternalIds.includes(id));
                                                        setSelectedInternalIds([...selectedInternalIds, ...targetIds]);
                                                    }
                                                }}
                                                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                                            >
                                                <Plus size={14} strokeWidth={3} />
                                                Select All Matching
                                            </button>
                                            <button
                                                onClick={() => isSelectionMode ? setSelectedIds([]) : setSelectedInternalIds([])}
                                                className={`px-5 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95
                                                    ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                            >
                                                Clear Selection
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-8">
                                    {renderPagination()}
                                </div>

                                <div className="flex flex-col gap-4 mt-8">
                                    {paginatedQuestions.map((q, index) => {
                                        const isSelected = (selectedQuestion?.id || selectedQuestion?._id) === (q.id || q._id);
                                        const serialNo = (currentPage - 1) * itemsPerPage + index + 1;
                                        const getMultiNames = (list, masterList, singleItem) => {
                                            const ids = [];
                                            if (Array.isArray(list) && list.length > 0) {
                                                list.forEach(i => {
                                                    const id = typeof i === 'object' && i !== null ? (i.id || i._id || i.name) : i;
                                                    if (id) ids.push(String(id));
                                                });
                                            } else if (singleItem) {
                                                const id = typeof singleItem === 'object' && singleItem !== null ? (singleItem.id || singleItem._id || singleItem.name) : singleItem;
                                                if (id) ids.push(String(id));
                                            }
                                            return ids.map(id => {
                                                const found = masterList.find(m => String(m.id) === String(id) || String(m._id) === String(id) || m.name === id);
                                                return found ? found.name : id;
                                            }).filter(Boolean);
                                        };

                                        const qSubjectNames = getMultiNames(q.subjects, subjects, q.subject);
                                        const qChapterNames = getMultiNames(q.chapters, chapters, q.chapter);

                                        return (
                                            <div
                                                onClick={() => {
                                                    const currentId = q.id || q._id;
                                                    setSelectedQuestion(isSelected ? null : q);
                                                }}
                                                key={q.id || q._id}
                                                className={`relative rounded-[5px] border transition-all cursor-pointer group flex flex-col overflow-hidden p-6
                                                    ${isDarkMode ? 'bg-white/5 border-white/5 hover:border-emerald-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' : 'bg-slate-50 border-slate-200 hover:border-emerald-500/50 shadow-sm'} 
                                                    ${isSelected ? 'ring-2 ring-emerald-500/50' : ''}
                                                `}
                                            >
                                                <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                                    {/* Selection, Sl No & Level */}
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        {(isSelectionMode || isInternalSelectionMode) && (() => {
                                                            const qid = q.id || q._id;
                                                            const isChecked = isSelectionMode ? selectedIds.includes(qid) : selectedInternalIds.includes(qid);
                                                            const isAlreadyInTest = isSelectionMode && alreadySelectedIds.includes(qid);
                                                            const limitReached = isSelectionMode && totalAllowed > 0 && (currentCount + selectedIds.length) >= totalAllowed;
                                                            const isDisabled = isSelectionMode && !isChecked && !isAlreadyInTest && limitReached;

                                                            if (isAlreadyInTest) {
                                                                return (
                                                                    <div className="w-12 h-12 rounded-[5px] border-2 flex items-center justify-center shrink-0 bg-slate-200/50 border-slate-300 text-slate-400 opacity-60">
                                                                        <CheckCircle size={24} strokeWidth={3} />
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isSelectionMode) {
                                                                            if (!isDisabled) toggleQuestionSelection(qid, e);
                                                                        } else {
                                                                            setSelectedInternalIds(prev => prev.includes(qid) ? prev.filter(i => i !== qid) : [...prev, qid]);
                                                                        }
                                                                    }}
                                                                    title={isDisabled ? `Limit of ${totalAllowed} questions reached` : ''}
                                                                    className={`w-12 h-12 rounded-[5px] border-2 flex items-center justify-center transition-all shrink-0
                                                                        ${isChecked
                                                                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/30'
                                                                            : isDisabled
                                                                                ? 'bg-slate-100 border-slate-200 text-slate-300 opacity-40 cursor-not-allowed'
                                                                                : 'bg-white/50 backdrop-blur-sm border-slate-300 cursor-pointer'
                                                                        }`}
                                                                >
                                                                    {isChecked && <Check size={24} strokeWidth={4} />}
                                                                    {isDisabled && !isChecked && <span className="text-[8px] font-black opacity-50">MAX</span>}
                                                                </div>
                                                            );
                                                        })()}
                                                        {/* Sl No Badge */}
                                                        <div className={`w-12 h-14 rounded-[5px] flex flex-col items-center justify-center shrink-0 border-2 transition-transform group-hover:scale-105 ${isDarkMode ? 'bg-[#10141D] text-slate-300 border-white/5' : 'bg-white text-slate-700 border-slate-200 shadow-sm'}`}>
                                                            <div className="text-[8px] font-black uppercase opacity-40 leading-none mb-0.5">SL NO</div>
                                                            <div className="text-xs font-black">#{serialNo}</div>
                                                        </div>
                                                        {/* Level Badge */}
                                                        <div className={`px-2 min-w-[3.5rem] h-14 rounded-[5px] flex flex-col items-center justify-center shrink-0 border-2 transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-[#10141D] text-emerald-500 border-white/5' : 'bg-white text-emerald-600 border-slate-100 shadow-sm'}`}>
                                                            <div className="text-[8px] font-black uppercase opacity-40 leading-none mb-0.5">LVL</div>
                                                            <div className="text-xs font-black text-center capitalize max-w-[5rem] truncate" title={Array.isArray(q.difficulty_levels) && q.difficulty_levels.length > 0 ? q.difficulty_levels.map(l => (LEVEL_NUM_TO_KEY[String(l)] || String(l)).replace('_', ' ')).join(', ') : ((LEVEL_NUM_TO_KEY[String(q.difficulty_level || q.level)] || String(q.difficulty_level || q.level || 'easy')).replace('_', ' '))}>
                                                                {Array.isArray(q.difficulty_levels) && q.difficulty_levels.length > 0
                                                                    ? q.difficulty_levels.map(l => (LEVEL_NUM_TO_KEY[String(l)] || String(l)).replace('_', ' ')).join(', ')
                                                                    : (LEVEL_NUM_TO_KEY[String(q.difficulty_level || q.level)] || String(q.difficulty_level || q.level || 'easy')).replace('_', ' ')}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Primary Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-3 mb-3">
                                                            <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                {q.question_type?.replace('_', ' ') || 'QUESTION'}
                                                            </span>
                                                            {alreadySelectedIds.includes(q.id || q._id) && (
                                                                <div className="px-3 py-1 rounded-[5px] bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                                    <CheckCircle size={10} strokeWidth={3} />
                                                                    <span>IN TEST</span>
                                                                </div>
                                                            )}
                                                            {qSubjectNames.length > 0 && qSubjectNames.map((name, sIdx) => (
                                                                <div key={sIdx} className="px-3 py-1 rounded-[5px] bg-slate-200/50 dark:bg-white/10 text-[10px] font-black uppercase tracking-widest opacity-60">
                                                                    {name}
                                                                </div>
                                                            ))}
                                                            {qChapterNames.length > 0 && qChapterNames.map((name, cIdx) => (
                                                                <div key={cIdx} className="px-3 py-1 rounded-[5px] bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest">
                                                                    {name}
                                                                </div>
                                                            ))}
                                                            {q.solve_time && (
                                                                <div className="px-3 py-1 rounded-[5px] bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                                                    <Clock size={10} />
                                                                    <span>{Math.floor(q.solve_time / 60)}m {q.solve_time % 60}s</span>
                                                                </div>
                                                            )}
                                                            {q.is_wrong && (
                                                                <div className="px-3 py-1 rounded-[5px] bg-red-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                                                                    <AlertCircle size={10} />
                                                                    <span>WRONG</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div
                                                            className={`text-base font-bold tracking-tight prose dark:prose-invert max-w-none leading-relaxed italic ${isSelected ? '' : 'line-clamp-2'}`}
                                                            dangerouslySetInnerHTML={{ __html: q.question || q.content }}
                                                        />
                                                    </div>

                                                    {/* Media Previews */}
                                                    {(q.image_1 || q.image_2) && (
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            {q.image_1 && (
                                                                <div className="w-20 h-20 rounded-[5px] overflow-hidden border border-slate-200 bg-white p-2 shadow-inner">
                                                                    <img src={q.image_1} alt="Q-Img-1" className="w-full h-full object-contain" />
                                                                </div>
                                                            )}
                                                            {q.image_2 && (
                                                                <div className="w-20 h-20 rounded-[5px] overflow-hidden border border-slate-200 bg-white p-2 shadow-inner">
                                                                    <img src={q.image_2} alt="Q-Img-2" className="w-full h-full object-contain" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Actions & Meta */}
                                                    <div className="flex flex-col items-end gap-3 shrink-0 lg:min-w-[170px] border-l border-dashed border-slate-200/20 pl-8">
                                                        {q.created_at && (
                                                            <div className="flex items-center gap-2 text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                                                                <Clock size={12} />
                                                                <span>{new Date(q.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-3">
                                                            {!isSelectionMode && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id || q._id); }}
                                                                    className="p-3 bg-red-500/10 text-red-500 rounded-[5px] hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                                                >
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            )}
                                                            <div className={`p-3 rounded-[5px] transition-all ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                <ChevronRight className={`transition-transform duration-500 ${isSelected ? 'rotate-90' : ''}`} size={24} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded details */}
                                                {isSelected && (
                                                    <div className="mt-10 pt-10 border-t-2 border-dashed border-slate-200/20 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 cursor-auto" onClick={(e) => e.stopPropagation()}>
                                                        {/* Options / Answer Range */}
                                                        <div className="space-y-4">
                                                            <label className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-2 block">Response Parameters</label>
                                                            {['NUMERICAL', 'INTEGER_TYPE'].includes(q.question_type || q.type) ? (
                                                                <div className="flex gap-4">
                                                                    <div className={`p-5 rounded-[5px] border-2 flex-1 flex flex-col gap-2 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100'}`}>
                                                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Min Value</span>
                                                                        <span className="text-xl font-bold">{q.answer_from}</span>
                                                                    </div>
                                                                    <div className={`p-5 rounded-[5px] border-2 flex-1 flex flex-col gap-2 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100'}`}>
                                                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Max Value</span>
                                                                        <span className="text-xl font-bold">{q.answer_to}</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {q.question_options && q.question_options.map((opt, idx) => {
                                                                        const isCorrect = opt.isCorrect;
                                                                        return (
                                                                            <div key={idx} className={`p-5 rounded-[5px] border-2 flex items-start gap-4 transition-all ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/50' : (isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100')}`}>
                                                                                <span className={`w-8 h-8 rounded-[5px] flex items-center justify-center font-black text-xs ${isCorrect ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>{String.fromCharCode(65 + idx)}</span>
                                                                                <div className="prose dark:prose-invert max-w-none text-sm font-bold" dangerouslySetInnerHTML={{ __html: opt.content }} />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Answer display */}
                                                        <div className="p-6 rounded-[5px] bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                                                    <CheckCircle size={20} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Verified Key</p>
                                                                    <div className="flex items-center gap-3 text-emerald-500 font-black text-lg">
                                                                        {['NUMERICAL', 'INTEGER_TYPE'].includes(q.question_type || q.type) ? (
                                                                            <span>{q.answer_from} to {q.answer_to}</span>
                                                                        ) : (
                                                                            q.question_options?.filter(o => o.isCorrect).map((o, i) => (
                                                                                <span key={i} className="flex items-center gap-1">
                                                                                    <span>Option {String.fromCharCode(65 + q.question_options.findIndex(opt => opt === o))}</span>
                                                                                    {i < q.question_options.filter(opt => opt.isCorrect).length - 1 && <span>, </span>}
                                                                                </span>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    const formattedOptions = (q.question_options || []).map(opt => ({
                                                                        id: opt.id,
                                                                        content: opt.content,
                                                                        isCorrect: opt.isCorrect
                                                                    }));
                                                                    const extractIds = (multiList, singleVal) => {
                                                                        if (Array.isArray(multiList) && multiList.length > 0) {
                                                                            return multiList.map(item => typeof item === 'object' && item !== null ? (item.id || item._id || item) : item).filter(Boolean);
                                                                        }
                                                                        if (singleVal) {
                                                                            const id = typeof singleVal === 'object' && singleVal !== null ? (singleVal.id || singleVal._id) : singleVal;
                                                                            return id ? [id] : [];
                                                                        }
                                                                        return [];
                                                                    };
                                                                    const rawLevels = Array.isArray(q.difficulty_levels) && q.difficulty_levels.length > 0
                                                                        ? q.difficulty_levels.map(String)
                                                                        : (q.difficulty_level ? [String(q.difficulty_level)] : (q.level ? [String(q.level)] : ['easy']));
                                                                    const levels = rawLevels.map(l => LEVEL_NUM_TO_KEY[String(l)] || String(l));

                                                                    setForm({
                                                                        ...form,
                                                                        id: q.id || q._id,
                                                                        level: levels,
                                                                        classId: extractIds(q.class_levels, q.class_level),
                                                                        subjectId: extractIds(q.subjects, q.subject),
                                                                        chapterId: extractIds(q.chapters, q.chapter),
                                                                        topicId: extractIds(q.topics, q.topic),
                                                                        examTypeId: extractIds(q.exam_types, q.exam_type),
                                                                        targetExamId: extractIds(q.target_exams, q.target_exam),
                                                                        testNameId: extractIds(q.test_names, q.test_name),
                                                                        hasCalculator: q.has_calculator || false,
                                                                        useNumericOptions: q.use_numeric_options || false,
                                                                        questions: [{
                                                                            tempId: q.id || q._id,
                                                                            question: q.question || q.content,
                                                                            question_type: q.question_type || q.type,
                                                                            solution: q.solution,
                                                                            options: formattedOptions.length > 0 ? formattedOptions : createNewQuestion().options,
                                                                            solve_time: q.solve_time || 30,
                                                                            answerFrom: q.answer_from || '',
                                                                            answerTo: q.answer_to || '',
                                                                            image_1: q.image_1 || '',
                                                                            image_2: q.image_2 || ''
                                                                        }]
                                                                    });
                                                                    setView('manual');
                                                                }}
                                                                className="px-8 py-3 bg-emerald-500 text-white rounded-[5px] font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                                                            >
                                                                Edit Content
                                                            </button>
                                                        </div>

                                                        {/* Solution */}
                                                        {q.solution && (
                                                            <div className={`p-8 rounded-[5px] border-2 border-dashed ${isDarkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50/50 border-blue-200'}`}>
                                                                <details className="group">
                                                                    <summary className="flex items-center gap-3 cursor-pointer text-blue-500 font-black text-[11px] uppercase tracking-widest select-none">
                                                                        <div className="w-8 h-8 rounded-[5px] bg-blue-500 text-white flex items-center justify-center">
                                                                            <HelpCircle size={16} />
                                                                        </div>
                                                                        <span>Explanatory Solution</span>
                                                                        <ChevronDown size={14} className="group-open:rotate-180 transition-transform ml-auto" />
                                                                    </summary>
                                                                    <div className="mt-6 pt-6 border-t border-dashed border-blue-200 prose dark:prose-invert max-w-none text-sm leading-relaxed"
                                                                        dangerouslySetInnerHTML={{ __html: q.solution }}
                                                                    />
                                                                </details>
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between items-center pt-6 border-t border-dashed border-slate-200/20">
                                                            <div className="flex items-center gap-4 text-[10px] font-black opacity-30 uppercase tracking-widest">
                                                                <span>ID: {q.id || q._id}</span>
                                                                <span>•</span>
                                                                <span>System: Pathfinder AI</span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarkAsWrong(q.id || q._id);
                                                                }}
                                                                className={`px-6 py-2 rounded-[5px] font-black uppercase tracking-widest text-[10px] border transition-all active:scale-95 flex items-center gap-2
                                                                    ${q.is_wrong
                                                                        ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                                                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'}`}
                                                            >
                                                                <AlertCircle size={14} />
                                                                {q.is_wrong ? 'Unmark Wrong' : 'Mark as Wrong'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {renderPagination()}
                            </>
                        )}
                    </div>
                )}

                {isSelectionMode && selectedIds.length > 0 && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-120 animate-in slide-in-from-bottom-5 duration-300">
                        <button
                            onClick={() => {
                                if (totalAllowed > 0 && (currentCount + selectedIds.length) > totalAllowed) {
                                    alert(`Warning: You are attempting to assign ${selectedIds.length} question(s), but this section only has ${totalAllowed - currentCount} slots left. (Total Limit: ${totalAllowed})`);
                                }
                                onAssignQuestions(selectedIds);
                            }}
                            className={`px-6 py-3 text-white rounded-[5px] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 transition-all active:scale-95 border-4 border-white/20 backdrop-blur-sm
                                ${totalAllowed > 0 && (currentCount + selectedIds.length) > totalAllowed ? 'bg-amber-600 hover:bg-amber-700 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        >
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                <Plus size={16} strokeWidth={3} />
                            </div>
                            Assign {selectedIds.length} ({totalAllowed > 0 ? `Total: ${currentCount + selectedIds.length} / ${totalAllowed}` : 'Questions'})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );


    const renderManualEntry = () => (
        <div key={formKey} className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            {/* Nav Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setView('overview')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-[5px] font-black uppercase tracking-widest text-[10px] transition-all
                        ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                >
                    <ArrowLeft size={16} />
                    Back to Overview
                </button>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            fetchQuestions();
                            setView('repository');
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-[5px] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95 transition-all"
                    >
                        <Logs size={16} strokeWidth={3} />
                        View Question Bank
                    </button>
                    <div className="flex items-center gap-3 pl-4 border-l border-slate-200/20">
                        <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Create Mode</span>
                    </div>
                </div>
            </div>

            {/* Main Form Card */}
            <div className={`p-10 rounded-[5px] border shadow-2xl relative ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                {/* Decorative title */}
                <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-dashed border-slate-200/50 pb-8">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tight">{form.id ? 'Edit' : 'Manual'} <span className="text-orange-500">Question</span> {form.id ? 'Mode' : 'Entry'}</h2>
                        <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Structure your question with precision systems
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => fetchMasterData(true)}
                            title="Refresh Master Data (Chapters, Topics, etc.)"
                            disabled={isLoadingMaster}
                            className={`p-3 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white disabled:opacity-50' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 disabled:opacity-50 italic'}`}>
                            <div className="flex items-center gap-2">
                                <RefreshCcw size={20} className={isLoadingMaster ? 'animate-spin text-emerald-500' : ''} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{isLoadingMaster ? 'Refreshing...' : 'Refresh'}</span>
                            </div>
                        </button>
                        <button
                            onClick={() => { if (confirm("Clear all fields? This will lose current progress.")) resetForm(); }}
                            title="Clear All Fields"
                            className={`p-3 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 italic'}`}>
                            <div className="flex items-center gap-2">
                                <Eraser size={20} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Clear Form</span>
                            </div>
                        </button>
                        <button
                            onClick={handleLoadDraft}
                            title="Load Saved Draft"
                            className={`p-3 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                            <HardDrive size={20} />
                        </button>
                        <input
                            type="file"
                            ref={aiFileInputRef}
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={handleAIExtract}
                        />
                        <button
                            onClick={() => aiFileInputRef.current?.click()}
                            disabled={isExtractingAI}
                            className="px-6 py-4 bg-indigo-500 text-white rounded-[5px] font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3 hover:bg-indigo-600 transition-colors disabled:opacity-50">
                            {isExtractingAI ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                            {isExtractingAI ? 'Extracting...' : 'Extract with AI'}
                        </button>
                        <button
                            onClick={handleSaveProgress}
                            className="px-8 py-4 bg-orange-500 text-white rounded-[5px] font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/20 active:scale-95 flex items-center gap-3 hover:bg-orange-600 transition-colors">
                            <Save size={18} />
                            Save Progress
                        </button>
                    </div>
                </div>

                <div className="space-y-10">
                    {/* Metadata Header & Selection Toggle */}
                    <div className="flex items-center justify-between pb-2">
                        <div className="flex items-center gap-3">
                            <Layers size={16} className="text-orange-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Content Metadata Hierarchy</span>
                        </div>
                        <div
                            onClick={() => setForm({ ...form, isIndependentSelection: !form.isIndependentSelection })}
                            className={`flex items-center gap-4 px-8 py-4 rounded-[5px] border-2 border-dashed transition-all cursor-pointer active:scale-95
                                ${form.isIndependentSelection ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                        >
                            <button
                                type="button"
                                className={`relative w-12 h-6 rounded-full transition-colors flex items-center ${form.isIndependentSelection ? 'bg-emerald-500 shadow-md' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute w-4 h-4 bg-white rounded-full transition-all shadow-sm ${form.isIndependentSelection ? 'right-1' : 'left-1'}`} />
                            </button>
                            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Independent Selection Mode</span>
                        </div>
                    </div>

                    {/* Metadata Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        <CustomSelect
                            isMulti={true}
                            label="Class"
                            value={form.classId}
                            options={activeClasses}
                            placeholder="Select Class"
                            onChange={(val) => setForm({ ...form, classId: val })}
                        />
                        <CustomSelect
                            isMulti={true}
                            label="Subject"
                            value={form.subjectId}
                            options={filteredSubjects}
                            placeholder="Select Subject"
                            onChange={(val) => setForm({ ...form, subjectId: val })}
                        />
                        <CustomSelect
                            isMulti={true}
                            label="Chapter"
                            value={form.chapterId}
                            options={filteredChapters}
                            placeholder="Select Chapter"
                            onChange={(val) => setForm({ ...form, chapterId: val })}
                        />
                        <CustomSelect
                            isMulti={true}
                            label="Topic"
                            value={form.topicId}
                            options={filteredTopics}
                            placeholder="Select Topic"
                            onChange={(val) => setForm({ ...form, topicId: val })}
                        />
                        <CustomSelect
                            isMulti={true}
                            label="Exam Type"
                            value={form.examTypeId}
                            options={activeExamTypes}
                            placeholder="Select Type"
                            onChange={(val) => setForm({ ...form, examTypeId: val })}
                        />
                        <CustomSelect
                            isMulti={true}
                            label="Target Exam"
                            value={form.targetExamId}
                            options={activeTargetExams}
                            placeholder="Select Exam"
                            onChange={(val) => setForm({ ...form, targetExamId: val })}
                        />
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
                        <CustomSelect
                            isMulti={true}
                            label="Test Name"
                            value={form.testNameId}
                            options={activeExamDetails}
                            placeholder="Select Test (Optional)"
                            onChange={(val) => setForm({ ...form, testNameId: val })}
                        />
                        <CustomSelect
                            isMulti={true}
                            label="Difficulty Level"
                            value={form.level}
                            options={DIFFICULTY_OPTIONS}
                            placeholder="Select Difficulty"
                            onChange={(val) => setForm({ ...form, level: val })}
                        />
                        <div className="flex items-center gap-6 px-4 py-2 border-2 border-dashed border-slate-200 rounded-[5px]">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, hasCalculator: !form.hasCalculator })}
                                    className={`relative w-10 h-5 rounded-full transition-colors flex items-center ${form.hasCalculator ? 'bg-blue-500 shadow-md' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm ${form.hasCalculator ? 'right-1' : 'left-1'}`} />
                                </button>
                                <span className="text-[10px] font-black uppercase opacity-60">Calculator</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, useNumericOptions: !form.useNumericOptions })}
                                    className={`relative w-10 h-5 rounded-full transition-colors flex items-center ${form.useNumericOptions ? 'bg-orange-500 shadow-md' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm ${form.useNumericOptions ? 'right-1' : 'left-1'}`} />
                                </button>
                                <span className="text-[10px] font-black uppercase opacity-60">Numeric (1234)</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-20">
                        {form.questions.map((q, qIdx) => (
                            <div key={q.tempId} className={`p-8 rounded-[5px] border-2 border-dashed ${isDarkMode ? 'bg-white/2 border-white/10' : 'bg-slate-50 border-slate-200'} relative animate-in zoom-in duration-500`}>
                                {/* Header / Remove Button */}
                                <div className="flex flex-wrap items-center justify-between gap-6 mb-8 pb-6 border-b border-dashed border-slate-200/30">
                                    <div className="flex items-center gap-6">
                                        <h4 className="px-4 py-1.5 bg-orange-500 text-white rounded-[5px] text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20">
                                            Question #{qIdx + 1}
                                        </h4>
                                        <div className="w-[200px]">
                                            <CustomSelect
                                                label="Question Type"
                                                value={q.question_type}
                                                options={[
                                                    { value: 'SINGLE_CHOICE', label: 'SINGLE_CHOICE' },
                                                    { value: 'MULTI_CHOICE', label: 'MULTI_CHOICE' },
                                                    { value: 'INTEGER_TYPE', label: 'INTEGER_TYPE' },
                                                ]}
                                                placeholder="Select Type"
                                                onChange={(val) => {
                                                    const updated = [...form.questions];
                                                    updated[qIdx].question_type = val;
                                                    setForm({ ...form, questions: updated });
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {form.questions.length > 1 && (
                                        <button
                                            onClick={() => removeQuestion(qIdx)}
                                            className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-[5px] transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                        >
                                            <Trash2 size={16} /> Remove
                                        </button>
                                    )}
                                </div>

                                {/* Question Content Header */}
                                <div className="flex flex-col gap-6 mb-8">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-[0.2em]">Enter Question Content</label>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-[5px] border-2 border-dashed border-amber-500/30 bg-amber-500/5">
                                                    <Clock size={14} className="text-amber-500" />
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-amber-600">Solve Time:</label>
                                                    <input
                                                        type="number"
                                                        value={q.solve_time}
                                                        onChange={(e) => {
                                                            const updated = [...form.questions];
                                                            updated[qIdx].solve_time = parseInt(e.target.value);
                                                            setForm({ ...form, questions: updated });
                                                        }}
                                                        className="w-16 bg-transparent outline-none text-xs font-black text-amber-600 border-b border-amber-500/50 text-center"
                                                    />
                                                    <span className="text-[10px] font-black text-amber-600 opacity-40 uppercase">Sec</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <span className={`px-2 py-1 rounded-[5px] text-[9px] font-black uppercase ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>Character: {q.question?.length || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <SmartEditor
                                            key={`question-${q.tempId}`}
                                            value={q.question}
                                            onChange={(val) => {
                                                const updated = [...form.questions];
                                                updated[qIdx].question = val;
                                                setForm({ ...form, questions: updated });
                                            }}
                                            placeholder="Enter Question content here..."
                                            isDarkMode={isDarkMode}
                                        />
                                    </div>
                                </div>

                                {/* LIVE IMAGE PREVIEW */}
                                {(q.image_1 || q.image_2) && (
                                    <div className="flex flex-wrap gap-4 pt-2">
                                        {q.image_1 && (
                                            <div className={`relative group max-w-[240px] rounded-[5px] overflow-hidden border transition-all ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-lg'}`}>
                                                <div className="px-3 py-1.5 border-b border-inherit bg-black/5 flex items-center justify-between">
                                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Preview 1</span>
                                                </div>
                                                <img src={q.image_1} alt="Preview 1" className="w-full h-auto max-h-40 object-contain p-4" />
                                            </div>
                                        )}
                                        {q.image_2 && (
                                            <div className={`relative group max-w-[240px] rounded-[5px] overflow-hidden border transition-all ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-lg'}`}>
                                                <div className="px-3 py-1.5 border-b border-inherit bg-black/5 flex items-center justify-between">
                                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Preview 2</span>
                                                </div>
                                                <img src={q.image_2} alt="Preview 2" className="w-full h-auto max-h-40 object-contain p-4" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Direct Image Links */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Question Image 1 (URL)</label>
                                        <input
                                            type="text"
                                            placeholder="https://example.com/image1.png"
                                            value={q.image_1 || ''}
                                            onChange={(e) => {
                                                const updated = [...form.questions];
                                                updated[qIdx].image_1 = e.target.value;
                                                setForm({ ...form, questions: updated });
                                            }}
                                            className={`w-full px-6 py-4 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Question Image 2 (URL)</label>
                                        <input
                                            type="text"
                                            placeholder="https://example.com/image2.png"
                                            value={q.image_2 || ''}
                                            onChange={(e) => {
                                                const updated = [...form.questions];
                                                updated[qIdx].image_2 = e.target.value;
                                                setForm({ ...form, questions: updated });
                                            }}
                                            className={`w-full px-6 py-4 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'}`}
                                        />
                                    </div>
                                </div>

                                {/* Options or Answer Range System */}
                                {['NUMERICAL', 'INTEGER_TYPE'].includes(q.question_type) ? (
                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-[0.2em] ml-1">Answer Range</label>
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="space-y-1 flex-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">From *</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    placeholder="Min valid value"
                                                    value={q.answerFrom}
                                                    onChange={(e) => {
                                                        const updated = [...form.questions];
                                                        updated[qIdx].answerFrom = e.target.value;
                                                        setForm({ ...form, questions: updated });
                                                    }}
                                                    className={`w-full px-6 py-4 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'}`}
                                                />
                                            </div>
                                            <div className="space-y-1 flex-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">To *</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    placeholder="Max valid value"
                                                    value={q.answerTo}
                                                    onChange={(e) => {
                                                        const updated = [...form.questions];
                                                        updated[qIdx].answerTo = e.target.value;
                                                        setForm({ ...form, questions: updated });
                                                    }}
                                                    className={`w-full px-6 py-4 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {q.options.map((opt, optIndex) => (
                                            <div key={opt.id} className="space-y-3 relative group">
                                                <div className="flex items-center justify-between px-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center font-black text-xs ${opt.isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                            {String.fromCharCode(65 + optIndex)}
                                                        </div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Option {optIndex + 1}</label>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleOption(qIdx, opt.id)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-[5px] transition-all ${opt.isCorrect ? 'bg-emerald-500/10 text-emerald-500' : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        <div className={`w-4 h-4 flex items-center justify-center transition-all border-2 
                                                                ${q.question_type === 'MULTI_CHOICE' ? 'rounded-[5px]' : 'rounded-full'}
                                                                ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-current'}`}
                                                        >
                                                            {opt.isCorrect && <Check size={10} strokeWidth={4} className="text-white" />}
                                                        </div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                                            {opt.isCorrect ? (q.question_type === 'MULTI_CHOICE' ? 'Selected' : 'Correct Answer') : 'Mark Correct'}
                                                        </span>
                                                    </button>
                                                </div>
                                                <SmartEditor
                                                    key={`opt-${q.tempId}-${optIndex}`}
                                                    value={opt.content}
                                                    onChange={(val) => {
                                                        const updated = [...form.questions];
                                                        updated[qIdx].options[optIndex].content = val;
                                                        setForm({ ...form, questions: updated });
                                                    }}
                                                    placeholder={`Enter content for Option ${String.fromCharCode(65 + optIndex)}...`}
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Solution / Explanation */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] ml-1">Step-by-step Solution <span className="opacity-40">(Optional)</span></label>
                                    <SmartEditor
                                        key={`solution-${q.tempId}`}
                                        value={q.solution}
                                        onChange={(val) => {
                                            const updated = [...form.questions];
                                            updated[qIdx].solution = val;
                                            setForm({ ...form, questions: updated });
                                        }}
                                        placeholder="Explain how to arrive at the correct answer..."
                                        isDarkMode={isDarkMode}
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Add More Question Button */}
                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={addMoreQuestion}
                                className="px-10 py-5 border-4 border-dashed border-orange-500/20 rounded-[5px] text-orange-500 font-black uppercase tracking-widest text-xs hover:bg-orange-500/5 hover:border-orange-500/40 transition-all flex items-center gap-3 active:scale-95"
                            >
                                <Plus size={20} strokeWidth={3} />
                                Add More Question
                            </button>
                        </div>
                    </div>

                    {/* Final Action */}
                    <div className="pt-10 flex flex-col items-center gap-6">
                        <div className="w-full h-px bg-linear-to-r from-transparent via-slate-200/20 to-transparent" />
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`px-16 py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[5px] font-black uppercase tracking-[0.3em] text-sm shadow-2xl shadow-orange-600/30 transition-all hover:scale-[1.05] active:scale-95 flex items-center gap-4 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {form.id ? 'Updating...' : `Processing ${form.questions.length} Question(s)...`}
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    {form.id ? 'Update Question' : `Save ${form.questions.length} Question(s) to Bank`}
                                </>
                            )}
                        </button>
                        <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">Questions will undergo validation check before publishing.</p>
                    </div>
                </div>
            </div>
        </div >
    );


    const renderMediaLibrary = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setView('overview')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-[5px] font-black uppercase tracking-widest text-[10px] transition-all
                        ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                >
                    <ArrowLeft size={16} />
                    Back to Overview
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => mediaInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="px-8 py-3 bg-blue-500 text-white rounded-[5px] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 flex items-center gap-3 disabled:opacity-50"
                    >
                        {isUploadingImage ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={18} />}
                        <span>{isUploadingImage ? 'Uploading...' : 'Upload To Gallery'}</span>
                    </button>
                    <input
                        type="file"
                        ref={mediaInputRef}
                        onChange={handleImageUpload}
                        multiple
                        accept="image/*"
                        className="hidden"
                    />
                </div>
            </div>

            {/* Filter & Info Card */}
            <div className={`p-8 rounded-[5px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="max-w-md">
                        <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 mb-2">
                            <Layers className="text-blue-500" size={24} /> Image Master
                        </h3>
                        <p className="text-xs font-medium opacity-50 leading-relaxed">
                            Upload your question images here first to get persistent links. Tag them with Subject/Topic to keep your library organized.
                        </p>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <CustomSelect
                            label="Filter Class"
                            value={imageFilters.classId}
                            options={activeClasses}
                            placeholder="All Classes"
                            onChange={(val) => setImageFilters(prev => ({ ...prev, classId: val, subjectId: '', topicId: '' }))}
                        />
                        <CustomSelect
                            label="Filter Subject"
                            value={imageFilters.subjectId}
                            options={filteredSubjectsForMedia}
                            placeholder="All Subjects"
                            onChange={(val) => setImageFilters(prev => ({ ...prev, subjectId: val, topicId: '' }))}
                        />
                        <CustomSelect
                            label="Filter Topic"
                            value={imageFilters.topicId}
                            options={filteredTopicsForMedia}
                            placeholder="All Topics"
                            onChange={(val) => setImageFilters(prev => ({ ...prev, topicId: val }))}
                        />
                    </div>
                </div>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {isLoadingImages ? (
                    Array(10).fill(0).map((_, i) => (
                        <div key={i} className={`aspect-square rounded-[5px] animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                    ))
                ) : images.length > 0 ? images.map((img) => (
                    <div key={img._id || img.id} className={`group relative p-3 rounded-[5px] border transition-all hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                        <div className="aspect-square w-full rounded-[5px] overflow-hidden bg-slate-900 border border-white/5 relative">
                            <img
                                src={img.image}
                                alt="Gallery item"
                                className="w-full h-full object-contain"
                            />
                            {/* Actions Overlay */}
                            <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4 p-6 scale-95 group-hover:scale-100">
                                <button
                                    onClick={() => copyToClipboard(img.image)}
                                    className="w-full py-3 bg-white text-black rounded-[5px] font-black uppercase tracking-widest text-[9px] shadow-xl hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                >
                                    <Copy size={14} />
                                    <span>Copy Excel Link</span>
                                </button>
                                <button
                                    onClick={() => window.open(img.image, '_blank')}
                                    className="w-full py-3 bg-white/10 text-white rounded-[5px] font-black uppercase tracking-widest text-[9px] hover:bg-white/20 transition-all flex items-center justify-center gap-2 border border-white/10"
                                >
                                    <Search size={14} />
                                    <span>Full View</span>
                                </button>
                            </div>
                        </div>
                        <div className="mt-3 px-1 flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 mb-0.5 truncate">
                                    {subjects.find(s => String(s.id) === String(img.subject))?.name || 'General'}
                                </p>
                                <p className="text-[8px] font-bold opacity-30 uppercase tracking-widest truncate">
                                    {topics.find(t => String(t.id) === String(img.topic))?.name || 'No Topic'}
                                </p>
                            </div>
                            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-[5px]">
                                <CheckCircle size={12} />
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-32 text-center">
                        <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                            <ImageIcon size={40} className="opacity-20" />
                        </div>
                        <h4 className="text-lg font-black uppercase tracking-tight mb-2 opacity-60">Your gallery is empty</h4>
                        <p className="text-xs font-medium opacity-40 max-w-[280px] mx-auto leading-relaxed">
                            Upload images to this subject/class to see them here. You can copy their links directly into your question import templates.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderBulkUpload = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setView('overview')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-[5px] font-black uppercase tracking-widest text-[10px] transition-all
                        ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                >
                    <ArrowLeft size={16} />
                    Back to Overview
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200/20">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Bulk Import Mode</span>
                </div>
            </div>

            {/* Instruction Card */}
            <div className={`p-10 rounded-[5px] border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="mb-10 border-b border-dashed border-slate-200/50 pb-8 flex items-start justify-between">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tight">Bulk Question <span className="text-blue-500">Import</span></h2>
                        <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Follow the structure below to import questions via Excel (.xlsx) or CSV
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setView('repository')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-[5px] font-black uppercase tracking-widest text-[10px] transition-all
                                ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                        >
                            <Database size={16} />
                            View Bank
                        </button>
                        <button
                            onClick={() => setView('manual')}
                            className="px-6 py-3 bg-blue-500 text-white rounded-[5px] font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <Plus size={16} />
                            Add Manually
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                            <AlertCircle size={16} /> Column Specifications
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { col: '1', title: 'SL NO', req: true },
                                { col: '2', title: 'Class', req: false },
                                { col: '3', title: 'Subject', req: true },
                                { col: '4', title: 'Topic', req: true },
                                { col: '5', title: 'Exam Type', req: false },
                                { col: '6', title: 'Target Exam', req: false },
                                { col: '7', title: 'Question Type', req: true, hint: '(SINGLE_CHOICE, MULTI_CHOICE, NUMERICAL, etc)' },
                                { col: '8', title: 'Level', req: true, hint: '(1 to 5)' },
                                { col: '9', title: 'Calculator(yes/no)', req: false },
                                { col: '10', title: 'Numeric(yes/no)', req: false },
                                { col: '11', title: 'Question', req: true, hint: '(HTML/Text supported)' },
                                { col: '12', title: 'Question Image (1st)', req: true, hint: '(Link from your system or public URL)' },
                                { col: '13', title: 'Question Image (2nd)', req: false },
                                { col: '14', title: 'Answer 1', req: true },
                                { col: '15', title: 'Answer 2', req: true },
                                { col: '16', title: 'Answer 3', req: true },
                                { col: '17', title: 'Answer 4', req: true },
                                { col: '18', title: 'Correct Answer', req: true, hint: '(A, B, C, D or Numerical value)' },
                            ].map((item) => (
                                <div key={item.col} className={`p-4 rounded-[5px] flex items-center justify-between border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center gap-4">
                                        <span className="w-8 h-8 rounded-[5px] bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-black">{item.col}</span>
                                        <div>
                                            <p className="text-xs font-bold">{item.title} {item.req && <span className="text-red-500">*</span>}</p>
                                            {item.hint && <p className="text-[9px] opacity-40 uppercase tracking-widest font-bold mt-0.5">{item.hint}</p>}
                                        </div>
                                    </div>
                                    {item.req ? (
                                        <CheckCircle size={14} className="text-blue-500" />
                                    ) : (
                                        <span className="text-[10px] font-black opacity-20 italic">Optional</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2">
                                <FileSpreadsheet size={16} /> Data Example
                            </h3>
                            <div className={`overflow-hidden rounded-[5px] border ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                <table className="w-full text-left text-[10px]">
                                    <thead className={`${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                                        <tr className="border-b border-slate-200/50">
                                            <th className="p-4 font-black">Col</th>
                                            <th className="p-4 font-black">Sample Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/20 font-medium">
                                        <tr><td className="p-4 opacity-40">3. Subject</td><td className="p-4 font-bold">Physics</td></tr>
                                        <tr><td className="p-4 opacity-40">7. Type</td><td className="p-4 font-bold text-blue-500 uppercase">SINGLE_CHOICE</td></tr>
                                        <tr><td className="p-4 opacity-40">11. Question</td><td className="p-4 italic">"What is the value of G?"</td></tr>
                                        <tr><td className="p-4 opacity-40">18. Correct</td><td className="p-4 font-black text-emerald-500">A</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-orange-500/5 border-2 border-dashed border-orange-500/20 p-8 rounded-[5px] space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500 rounded-[5px] text-white"><CloudUpload size={20} /></div>
                                <h4 className="text-sm font-black uppercase tracking-tight">Ready to Upload?</h4>
                            </div>
                            <p className="text-xs opacity-60 leading-relaxed font-medium">
                                Ensure your file matches the column order specified. Images should be uploaded to the server first or provided as valid URLs.
                            </p>
                            <div className="pt-4 flex items-center gap-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-3 bg-blue-500 text-white rounded-[5px] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all flex items-center gap-2"
                                >
                                    <FileSpreadsheet size={14} />
                                    Select File
                                </button>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className={`px-6 py-3 rounded-[5px] font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 border 
                                        ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                                >
                                    <Download size={14} />
                                    Get Example Template
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {selectedFile && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className={`p-6 rounded-[5px] border flex items-center gap-4 shadow-xl ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                                    <div className="p-3 bg-emerald-500 rounded-[5px] text-white shadow-lg shadow-emerald-500/20">
                                        <FileSpreadsheet size={24} />
                                    </div>
                                    <div className="flex-1 overflow-hidden text-left">
                                        <p className="font-black text-xs uppercase tracking-widest text-emerald-500 mb-1">File Loaded</p>
                                        <p className="font-black text-sm truncate">{selectedFile.name}</p>
                                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedFile(null)}
                                        className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-[5px] transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <button
                                    onClick={handleUpload}
                                    className="w-full mt-4 py-5 bg-emerald-500 text-white rounded-[5px] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <Upload size={18} strokeWidth={3} />
                                    <span>Proceed with Bulk Import</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderBulkUpdateModal = () => {
        if (!showBulkUpdateModal) return null;
        return (
            <div className="fixed inset-0 z-1000 flex items-center justify-center p-6 backdrop-blur-sm bg-black/60 overflow-y-auto">
                <div className={`relative w-full max-w-2xl rounded-[10px] shadow-2xl animate-in zoom-in-95 fade-in duration-300 ${isDarkMode ? 'bg-[#0F131A] border border-white/10' : 'bg-white'}`}>
                    {/* Header */}
                    <div className={`p-8 border-b flex items-center justify-between ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500 rounded-[5px] text-white">
                                <Settings2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Bulk Update Metadata</h3>
                                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">Updating {selectedInternalIds.length} selected questions</p>
                            </div>
                        </div>
                        <button onClick={() => setShowBulkUpdateModal(false)} className={`p-2 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <CustomSelect
                                label="Update Class"
                                value={bulkUpdateFields.class_level}
                                options={activeClasses}
                                placeholder="Keep Original"
                                onChange={(val) => setBulkUpdateFields({ ...bulkUpdateFields, class_level: val })}
                            />
                            <CustomSelect
                                label="Update Subject"
                                value={bulkUpdateFields.subject}
                                options={bulkUpdateFilteredSubjects}
                                placeholder="Keep Original"
                                onChange={(val) => setBulkUpdateFields({ ...bulkUpdateFields, subject: val })}
                            />
                            <CustomSelect
                                label="Update Chapter"
                                value={bulkUpdateFields.chapter}
                                options={bulkUpdateFilteredChapters}
                                placeholder="Keep Original"
                                onChange={(val) => setBulkUpdateFields({ ...bulkUpdateFields, chapter: val })}
                            />
                            <CustomSelect
                                label="Update Topic"
                                value={bulkUpdateFields.topic}
                                options={bulkUpdateFilteredTopics}
                                placeholder="Keep Original"
                                onChange={(val) => setBulkUpdateFields({ ...bulkUpdateFields, topic: val })}
                            />
                            <CustomSelect
                                label="Update Difficulty"
                                value={bulkUpdateFields.difficulty_level}
                                options={[
                                    { value: '', label: 'Keep Original' },
                                    ...DIFFICULTY_OPTIONS
                                ]}
                                placeholder="Keep Original"
                                onChange={(val) => setBulkUpdateFields({ ...bulkUpdateFields, difficulty_level: val })}
                            />
                            <CustomSelect
                                label="Update Exam Type"
                                value={bulkUpdateFields.exam_type}
                                options={activeExamTypes}
                                placeholder="Keep Original"
                                onChange={(val) => setBulkUpdateFields({ ...bulkUpdateFields, exam_type: val })}
                            />
                            <CustomSelect
                                label="Update Target Exam"
                                value={bulkUpdateFields.target_exam}
                                options={activeTargetExams}
                                placeholder="Keep Original"
                                onChange={(val) => setBulkUpdateFields({ ...bulkUpdateFields, target_exam: val })}
                            />
                            <CustomSelect
                                label="Update Test Name"
                                value={bulkUpdateFields.test_name}
                                options={activeExamDetails}
                                placeholder="Keep Original"
                                onChange={(val) => setBulkUpdateFields({ ...bulkUpdateFields, test_name: val })}
                            />
                            <CustomSelect
                                label="Update Status"
                                value={bulkUpdateFields.is_wrong}
                                options={[
                                    { value: 'true', label: 'Mark as Wrong' },
                                    { value: 'false', label: 'Mark as Correct' }
                                ]}
                                placeholder="Keep Original"
                                onChange={(val) => setBulkUpdateFields({ ...bulkUpdateFields, is_wrong: val })}
                            />
                            <div className="relative group">
                                <div
                                    className={`relative w-full px-4 py-3.5 rounded-[5px] border-2 transition-all flex items-center justify-between
                                        ${isDarkMode 
                                            ? 'border-white/10 bg-white/5 focus-within:border-blue-500 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]' 
                                            : 'border-slate-300 bg-white focus-within:border-blue-500 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.1)] shadow-sm'}`}
                                >
                                    <label className={`absolute left-3 -top-2 px-1 text-[11px] font-bold transition-all
                                        ${isDarkMode ? 'bg-[#0F131A] text-slate-400' : 'bg-white text-slate-500'} group-focus-within:text-blue-500`}>
                                        Update Solve Time (Sec)
                                    </label>
                                    <input
                                        type="number"
                                        value={bulkUpdateFields.solve_time}
                                        placeholder="Keep Original"
                                        onChange={(e) => setBulkUpdateFields({ ...bulkUpdateFields, solve_time: e.target.value })}
                                        className="w-full bg-transparent border-none outline-none text-[13px] font-bold dark:text-white"
                                    />
                                    {bulkUpdateFields.solve_time && (
                                        <button
                                            onClick={() => setBulkUpdateFields({ ...bulkUpdateFields, solve_time: '' })}
                                            className={`p-1 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                                            title="Clear Selection"
                                        >
                                            <X size={12} strokeWidth={3} className="text-red-500" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={`p-4 rounded-[5px] border-2 border-dashed ${isDarkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50/50 border-blue-200'}`}>
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-relaxed">
                                Note: Fields left empty will remain unchanged. This action will overwrite metadata for all {selectedInternalIds.length} selected questions permanently.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`p-8 border-t flex items-center justify-end gap-3 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                        <button
                            onClick={() => setShowBulkUpdateModal(false)}
                            className={`px-8 py-3 rounded-[5px] font-black uppercase text-[10px] tracking-widest transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBulkUpdate}
                            disabled={isBulkUpdateLoading}
                            className={`px-10 py-3 bg-blue-500 text-white rounded-[5px] font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/30 hover:bg-blue-600 active:scale-95 transition-all flex items-center gap-2 ${isBulkUpdateLoading ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {isBulkUpdateLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {isBulkUpdateLoading ? 'Updating...' : 'Confirm Update'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };


    return (
        <div className="min-h-screen">
            {view === 'overview' && renderOverview()}
            {view === 'manual' && renderManualEntry()}
            {view === 'repository' && renderRepository()}
            {view === 'bulk' && renderBulkUpload()}
            {view === 'media' && renderMediaLibrary()}
            {renderMathModal()}
            {renderBulkUpdateModal()}

            <style>{`
                @keyframes shimmer {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};



export default QuestionBank;
