import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
    Palette, Droplets, Eraser, Clock, Logs
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';
import { ImageDrop } from 'quill-image-drop-module';
import katex from 'katex';
import 'katex/dist/katex.min.css';

window.katex = katex;
Quill.register('modules/imageResize', ImageResize);
Quill.register('modules/imageDrop', ImageDrop);

// Math Preview Component for LaTeX
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
    return <div ref={containerRef} className={`min-h-[60px] flex items-center justify-center p-4 rounded-xl border ${isDarkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />;
};

const QuestionBank = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [view, setView] = useState('overview'); // 'overview', 'manual'
    const [selectedQuestion, setSelectedQuestion] = useState(null);

    // Master Data States
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [targetExams, setTargetExams] = useState([]);
    const [isLoadingMaster, setIsLoadingMaster] = useState(false);

    // Repository State
    const [questions, setQuestions] = useState([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

    // Repository Filter State
    // Repository Filter State
    const [filters, setFilters] = useState({
        classId: '',
        subjectId: '',
        topicId: '',
        examTypeId: '',
        targetExamId: '',
        type: '',
        level: ''
    });

    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [jumpToPage, setJumpToPage] = useState('');

    // Filtered Questions Logic
    const filteredQuestions = useMemo(() => {
        const result = questions.filter(q => {
            if (filters.classId && String(q.class_level) !== String(filters.classId)) return false;

            const qSub = q.subject?.id || q.subject;
            if (filters.subjectId && String(qSub) !== String(filters.subjectId)) return false;

            const qTopic = q.topic?.id || q.topic;
            if (filters.topicId && String(qTopic) !== String(filters.topicId)) return false;

            const qExamType = q.exam_type?.id || q.exam_type;
            if (filters.examTypeId && String(qExamType) !== String(filters.examTypeId)) return false;

            const qTargetExam = q.target_exam?.id || q.target_exam;
            if (filters.targetExamId && String(qTargetExam) !== String(filters.targetExamId)) return false;

            if (filters.type && q.type !== filters.type) return false;

            if (filters.level && String(q.level) !== String(filters.level)) return false;
            return true;
        });
        setCurrentPage(1); // Reset to page 1 on filter change
        return result;
    }, [questions, filters]);

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

    // Manual Entry Form States
    const [form, setForm] = useState({
        classId: '',
        subjectId: '',
        topicId: '',
        examTypeId: '',
        targetExamId: '',
        type: 'SINGLE_CHOICE',
        level: '1',
        question: '',
        options: [
            { id: 1, content: '', isCorrect: false },
            { id: 2, content: '', isCorrect: false },
            { id: 3, content: '', isCorrect: false },
            { id: 4, content: '', isCorrect: false }
        ],
        solution: '',
        hasCalculator: false,
        useNumericOptions: false,
        answerFrom: '',
        answerTo: ''
    });

    // Math Modal State
    const [showMathTools, setShowMathTools] = useState(false);
    const [formulaValue, setFormulaValue] = useState('');
    const [activeQuillRef, setActiveQuillRef] = useState(null);

    // Auth Config Helper
    const getAuthConfig = useCallback(() => {
        const activeToken = token || localStorage.getItem('auth_token');
        if (!activeToken) return null;
        return { headers: { 'Authorization': `Bearer ${activeToken}` } };
    }, [token]);

    // Fetch Master Data
    const fetchMasterData = useCallback(async () => {
        const config = getAuthConfig();
        if (!config) return; // Don't fetch if no token is available

        setIsLoadingMaster(true);
        try {
            const apiUrl = getApiUrl();
            const [classRes, subRes, topicRes, typeRes, targetRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/classes/`, config),
                axios.get(`${apiUrl}/api/master-data/subjects/`, config),
                axios.get(`${apiUrl}/api/master-data/topics/`, config),
                axios.get(`${apiUrl}/api/master-data/exam-types/`, config),
                axios.get(`${apiUrl}/api/master-data/target-exams/`, config)
            ]);
            setClasses(classRes.data);
            setSubjects(subRes.data);
            setTopics(topicRes.data);
            setExamTypes(typeRes.data);
            setTargetExams(targetRes.data);
        } catch (err) {
            console.error("Failed to fetch master data", err);
        } finally {
            setIsLoadingMaster(false);
        }
    }, [getApiUrl, getAuthConfig]);

    // Fetch Questions
    const fetchQuestions = useCallback(async () => {
        const config = getAuthConfig();
        if (!config) return;

        setIsLoadingQuestions(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/questions/`, config);
            setQuestions(res.data);
        } catch (err) {
            console.error("Failed to fetch questions", err);
        } finally {
            setIsLoadingQuestions(false);
        }
    }, [getApiUrl, getAuthConfig]);

    // Stats State
    const [stats, setStats] = useState({
        total: 0,
        thisMonth: 0,
        lastBatch: 'No data'
    });

    const fetchStats = useCallback(async () => {
        const config = getAuthConfig();
        if (!config) return;
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/questions/stats/`, config);
            setStats(res.data);
        } catch (err) {
            console.error("Failed to fetch stats", err);
        }
    }, [getApiUrl, getAuthConfig]);

    useEffect(() => {
        fetchMasterData();
        fetchStats();
    }, [fetchMasterData, fetchStats]);

    // Cascading Filter: Filter subjects based on selected class
    const filteredSubjects = useMemo(() => {
        if (!form.classId) return subjects;
        // Get unique subject IDs that have topics for the selected class
        const subjectIds = [...new Set(topics
            .filter(t => String(t.class_level) === String(form.classId))
            .map(t => String(t.subject))
        )];
        return subjects.filter(s => subjectIds.includes(String(s.id)));
    }, [subjects, topics, form.classId]);

    // Cascading Filter: Filter topics based on selected class and subject
    const filteredTopics = useMemo(() => {
        return topics.filter(t => {
            const matchesClass = !form.classId || String(t.class_level) === String(form.classId);
            const matchesSubject = !form.subjectId || String(t.subject) === String(form.subjectId);
            return matchesClass && matchesSubject;
        });
    }, [topics, form.classId, form.subjectId]);

    // Formula Modal Opener (moved to top level for use in handlers)
    const openFormulaModal = (quill) => {
        setActiveQuillRef(quill);
        setShowMathTools(true);
    };

    // Quill Configuration with precise Row 1 and Row 2 layout mapping
    const quillModules = useMemo(() => ({
        toolbar: {
            container: [
                [
                    'bold', 'italic', 'underline', 'strike',
                    'blockquote', 'code-block',
                    { 'list': 'ordered' }, { 'list': 'bullet' },
                    { 'script': 'sub' }, { 'script': 'super' },
                    { 'header': [1, 2, 3, false] },
                    { 'indent': '-1' }, { 'indent': '+1' },
                    'link', 'image', 'formula'
                ],
                [
                    { 'color': [] }, { 'background': [] },
                    { 'align': [] },
                    'clean'
                ]
            ],
            handlers: {
                formula: function () {
                    openFormulaModal(this.quill);
                }
            }
        },
        imageResize: { modules: ['Resize', 'DisplaySize', 'Toolbar'] },
        imageDrop: true
    }), []);

    const quillFormats = [
        'header', 'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent', 'link', 'image', 'align', 'script', 'color', 'background',
        'code-block', 'formula'
    ];

    const insertFormula = () => {
        if (activeQuillRef && formulaValue) {
            const range = activeQuillRef.getSelection(true);
            activeQuillRef.insertEmbed(range.index, 'formula', formulaValue, 'user');
            activeQuillRef.setSelection(range.index + 1, 'user');
            setFormulaValue('');
            setShowMathTools(false);
        }
    };

    // Handle Option Toggle (Dynamic behavior for Single vs Multi Choice)
    const handleToggleOption = (id) => {
        setForm(prev => {
            const isMulti = prev.type === 'MULTI_CHOICE';
            return {
                ...prev,
                options: prev.options.map(opt => {
                    if (opt.id === id) {
                        return { ...opt, isCorrect: isMulti ? !opt.isCorrect : true };
                    }
                    return { ...opt, isCorrect: isMulti ? opt.isCorrect : false };
                })
            };
        });
    };

    // Formula/Math Modal Component
    const renderMathModal = () => {
        if (!showMathTools) return null;
        return (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMathTools(false)} />
                <div className={`relative w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 ${isDarkMode ? 'bg-[#10141D]' : 'bg-white'}`}>
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
                                className={`w-full h-32 p-4 rounded-xl border font-mono text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
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
                                    className={`p-2 rounded-lg text-[10px] font-bold border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-blue-500/20 hover:text-blue-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50'}`}
                                >
                                    {sym.l}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={insertFormula}
                            disabled={!formulaValue}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
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

    const handleUpload = () => {
        if (!selectedFile) return;
        setIsUploading(true);
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setUploadProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    setIsUploading(false);
                    setUploadProgress(0);
                    setSelectedFile(null);
                }, 500);
            }
        }, 200);
    };

    const renderOverview = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className={`p-10 rounded-[2.5rem] border shadow-2xl relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/30">
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        <div className={`px-6 py-4 rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} flex items-center gap-4`}>
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                                <Database size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5">Total Questions</p>
                                <p className="text-lg font-black tracking-tight">{stats.total}</p>
                            </div>
                        </div>

                        <div className={`px-6 py-4 rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} flex items-center gap-4`}>
                            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5">Last Batch</p>
                                <p className="text-lg font-black tracking-tight">{stats.lastBatch}</p>
                            </div>
                        </div>

                        <div className={`px-6 py-4 rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} flex items-center gap-4`}>
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                                <Plus size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5">Added This Month</p>
                                <p className="text-lg font-black tracking-tight">+{stats.thisMonth}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className={`p-8 rounded-[2.5rem] border shadow-xl flex flex-col h-full ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Bulk Import</h3>
                                <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Upload Excel / CSV Files</p>
                            </div>
                        </div>

                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) setSelectedFile(f); }}
                            className={`flex-1 min-h-[300px] rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center relative
                                ${isDragging ? 'border-orange-500 bg-orange-500/5' : isDarkMode ? 'border-white/10 hover:border-white/20' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            {!selectedFile ? (
                                <>
                                    <CloudUpload size={48} className="text-orange-500 mb-6" />
                                    <h4 className="text-lg font-black uppercase tracking-tight mb-2">Drop your file here</h4>
                                    <button onClick={() => fileInputRef.current?.click()} className="px-8 py-3.5 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/30 active:scale-95 flex items-center gap-3">
                                        <FileSpreadsheet size={18} />
                                        <span>Browse Files</span>
                                    </button>
                                </>
                            ) : (
                                <div className="w-full max-w-sm">
                                    <div className={`p-6 rounded-3xl border flex items-center gap-4 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
                                        <FileSpreadsheet className="text-emerald-500" size={32} />
                                        <div className="flex-1 text-left"><p className="font-black text-sm truncate">{selectedFile.name}</p></div>
                                        <button onClick={() => setSelectedFile(null)}><X size={20} /></button>
                                    </div>
                                    <button onClick={handleUpload} className="w-full mt-6 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 flex items-center justify-center gap-3">
                                        <Upload size={18} /> <span>Begin Upload</span>
                                    </button>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls, .csv" className="hidden" />
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div onClick={() => setView('manual')} className={`p-8 rounded-[2.5rem] border shadow-xl group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                        <div className="w-14 h-14 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center mb-6 text-white"><Plus size={28} strokeWidth={3} /></div>
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2">Manual Entry</h3>
                        <p className="text-sm font-medium opacity-60 mb-8 leading-relaxed">Create complex questions manually with equations and multi-format options.</p>
                        <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-widest text-[10px]">Add Question Now <ChevronRight size={14} strokeWidth={4} /></div>
                    </div>
                    <div
                        onClick={() => {
                            fetchQuestions();
                            setView('repository');
                        }}
                        className={`p-8 rounded-[2.5rem] border shadow-xl relative group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}
                    >
                        <div className="w-14 h-14 bg-emerald-500 rounded-2xl shadow-lg flex items-center justify-center mb-6 text-white"><Layers size={28} /></div>
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2">Question Bank</h3>
                        <p className="text-sm font-medium opacity-60 mb-8 leading-relaxed">Explore historical question bank. Filter by tags or level.</p>
                        <div className="flex items-center gap-2 text-emerald-500 font-black uppercase tracking-widest text-[10px]">Browse All <ChevronRight size={14} strokeWidth={4} /></div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Custom Floating Label Select Component
    const CustomSelect = ({ label, value, onChange, options, placeholder, icon: Icon }) => {
        const [isOpen, setIsOpen] = useState(false);
        const containerRef = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (containerRef.current && !containerRef.current.contains(event.target)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        const selectedOption = options.find(opt => String(opt.id) === String(value) || opt.value === value);

        return (
            <div className="relative group" ref={containerRef}>
                {/* Floating Label Container */}
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative w-full px-4 py-3.5 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-between
                        ${isOpen
                            ? 'border-blue-500 bg-white shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'
                            : isDarkMode ? 'border-white/10 bg-white/5 hover:border-white/20' : 'border-slate-300 bg-white hover:border-slate-400 shadow-sm'}`}
                >
                    {/* The Floating Label */}
                    <label className={`absolute left-3 -top-2 px-1 text-[11px] font-bold transition-all
                        ${isOpen ? 'text-blue-500 bg-white' : isDarkMode ? 'bg-[#10141D] text-slate-400' : 'bg-white text-slate-500'}`}>
                        {label}
                    </label>

                    <span className={`text-[13px] font-bold truncate ${!selectedOption ? 'opacity-30' : ''}`}>
                        {selectedOption ? (selectedOption.label || selectedOption.name || selectedOption.value) : placeholder}
                    </span>

                    <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : 'opacity-40'}`} />
                </div>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className={`absolute z-[100] left-0 right-0 mt-1 py-1 rounded-lg border shadow-2xl animate-in fade-in zoom-in-95 duration-200
                        ${isDarkMode ? 'bg-[#1a1f2e] border-white/10 shadow-black' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {options.length > 0 ? options.map((opt, i) => (
                                <div
                                    key={i}
                                    onClick={() => {
                                        onChange(opt.id || opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-all flex items-center justify-between
                                        ${(String(opt.id) === String(value) || opt.value === value)
                                            ? 'bg-blue-500 text-white'
                                            : isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}
                                >
                                    {opt.label || opt.name || opt.value}
                                    {(String(opt.id) === String(value) || opt.value === value) && <Check size={14} />}
                                </div>
                            )) : (
                                <div className="px-4 py-2.5 text-[11px] font-bold opacity-40 uppercase italic">No options available</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };


    // Form Submission Handler
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        // Basic Validation
        if (!form.question || (!form.options.some(o => o.isCorrect) && !['NUMERICAL', 'INTEGER_TYPE'].includes(form.type))) {
            alert("Please fill in the question and select at least one correct answer.");
            return;
        }

        setIsSubmitting(true);
        try {
            const config = getAuthConfig();
            const apiUrl = getApiUrl();

            const payload = {
                question: form.question,
                options: form.options,
                solution: form.solution,

                type: form.type,
                level: form.level,

                classId: form.classId,
                subjectId: form.subjectId,
                topicId: form.topicId,
                examTypeId: form.examTypeId,
                targetExamId: form.targetExamId,

                hasCalculator: form.hasCalculator,
                useNumericOptions: form.useNumericOptions,

                answerFrom: form.answerFrom,
                answerTo: form.answerTo,

                // Backend Mappings
                class_level: form.classId,
                subject: form.subjectId,
                topic: form.topicId,
                exam_type: form.examTypeId,
                target_exam: form.targetExamId,
                content: form.question,
                has_calculator: form.hasCalculator,
                use_numeric_options: form.useNumericOptions,
                answer_from: form.answerFrom || null,
                answer_to: form.answerTo || null,
            };

            await axios.post(`${apiUrl}/api/questions/`, payload, config);

            alert("Question added to bank successfully!");
            setForm({
                ...form,
                question: '',
                solution: '',
                options: form.options.map(o => ({ ...o, content: '', isCorrect: false })),
                answerFrom: '',
                answerTo: ''
            });

        } catch (error) {
            console.error("Submission Error", error);
            alert("Failed to save question. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveProgress = () => {
        localStorage.setItem('question_draft', JSON.stringify(form));
        alert("Progress saved locally!");
    };

    const handleLoadDraft = () => {
        const saved = localStorage.getItem('question_draft');
        if (saved) {
            if (confirm("Found a saved draft. Load it?")) {
                setForm(JSON.parse(saved));
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
                        className={`px-2 py-1 rounded-lg text-xs font-bold border outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
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
                        className="p-2 rounded-xl border disabled:opacity-30 hover:bg-slate-50 transition-all dark:hover:bg-white/5"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-black px-2">Page {currentPage} of {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl border disabled:opacity-30 hover:bg-slate-50 transition-all dark:hover:bg-white/5"
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
                        className={`w-12 px-2 py-1 rounded-lg text-xs font-bold border outline-none text-center ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                    />
                    <button
                        onClick={handleJumpToPage}
                        className="p-1.5 rounded-lg bg-emerald-500 text-white shadow-sm active:scale-95"
                    >
                        <ChevronRight size={12} strokeWidth={4} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderRepository = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            {/* Nav Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setView('overview')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all
                        ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                >
                    <ArrowLeft size={16} />
                    Back to Overview
                </button>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setView('manual')}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/30 hover:bg-blue-600 active:scale-95 transition-all"
                    >
                        <Plus size={16} strokeWidth={3} />
                        Add Question
                    </button>
                    <div className="flex items-center gap-3 pl-4 border-l border-slate-200/20">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Repository Mode</span>
                    </div>
                </div>
            </div>

            {/* Questions Grid */}
            <div className={`p-10 rounded-[3rem] border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="mb-4 space-y-8 border-b border-dashed border-slate-200/50 pb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tight">Question <span className="text-emerald-500">Bank</span></h2>
                            <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage your existing question bank
                            </p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                        <CustomSelect
                            label="Filter Class"
                            value={filters.classId}
                            options={classes}
                            placeholder="All Classes"
                            onChange={(val) => setFilters({ ...filters, classId: val, subjectId: '', topicId: '' })}
                        />
                        <CustomSelect
                            label="Filter Subject"
                            value={filters.subjectId}
                            options={subjects}
                            placeholder="All Subjects"
                            onChange={(val) => setFilters({ ...filters, subjectId: val, topicId: '' })}
                        />
                        <CustomSelect
                            label="Filter Topic"
                            value={filters.topicId}
                            options={topics}
                            placeholder="All Topics"
                            onChange={(val) => setFilters({ ...filters, topicId: val })}
                        />
                        <CustomSelect
                            label="Exam Type"
                            value={filters.examTypeId}
                            options={examTypes}
                            placeholder="All Exams"
                            onChange={(val) => setFilters({ ...filters, examTypeId: val })}
                        />
                        <CustomSelect
                            label="Target Exam"
                            value={filters.targetExamId}
                            options={targetExams}
                            placeholder="All Targets"
                            onChange={(val) => setFilters({ ...filters, targetExamId: val })}
                        />
                        <CustomSelect
                            label="Q. Type"
                            value={filters.type}
                            options={[
                                { value: '', label: 'All Types' },
                                { value: 'SINGLE_CHOICE', label: 'Single Choice' },
                                { value: 'MULTI_CHOICE', label: 'Multi Choice' },
                                { value: 'INTEGER_TYPE', label: 'Integer' },
                                { value: 'NUMERICAL', label: 'Numerical' },
                                { value: 'MATRIX', label: 'Matrix' },
                                { value: 'ASSERTION', label: 'Assertion' },
                                { value: 'PARAGRAPH', label: 'Paragraph' }
                            ]}
                            placeholder="All Types"
                            onChange={(val) => setFilters({ ...filters, type: val })}
                        />
                        <CustomSelect
                            label="Difficulty"
                            value={filters.level}
                            options={[
                                { value: '', label: 'All Levels' },
                                { value: '1', label: 'Level 1' },
                                { value: '2', label: 'Level 2' },
                                { value: '3', label: 'Level 3' },
                                { value: '4', label: 'Level 4' },
                                { value: '5', label: 'Level 5' }
                            ]}
                            placeholder="All Levels"
                            onChange={(val) => setFilters({ ...filters, level: val })}
                        />
                    </div>
                </div>

                {isLoadingQuestions ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Loading Repository...</span>
                    </div>
                ) : filteredQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                        <Database size={48} className="mb-4" />
                        <span className="text-xs font-black uppercase tracking-widest">No Questions Found</span>
                    </div>
                ) : (
                    <>
                        {renderPagination()}
                        <div className="grid grid-cols-1 gap-4 mt-4">
                            {paginatedQuestions.map((q) => (
                                <div
                                    onClick={() => {
                                        const currentId = q.id || q._id;
                                        const selectedId = selectedQuestion?.id || selectedQuestion?._id;
                                        setSelectedQuestion(selectedId === currentId ? null : q);
                                    }}
                                    key={q.id || q._id}
                                    className={`p-6 rounded-3xl border transition-all cursor-pointer group ${isDarkMode ? 'bg-white/5 border-white/5 hover:border-emerald-500/50' : 'bg-slate-50 border-slate-200 hover:border-emerald-500/50'} ${(selectedQuestion?.id || selectedQuestion?._id) === (q.id || q._id) ? 'ring-2 ring-emerald-500/50' : ''}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-[#10141D] text-emerald-500' : 'bg-white text-emerald-600 shadow-sm'}`}>
                                            <div className="text-xs font-black">{q.level}</div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {q.type.replace('_', ' ')}
                                                </span>
                                                {q.subject && (
                                                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-wider">
                                                        {subjects.find(s => s.id === q.subject)?.name || 'Subject'}
                                                    </span>
                                                )}
                                            </div>
                                            <div
                                                className="text-sm font-medium line-clamp-2 prose dark:prose-invert max-w-none"
                                                dangerouslySetInnerHTML={{ __html: q.question || q.content }}
                                            />
                                        </div>
                                        <ChevronRight className={`transition-transform duration-300 text-emerald-500 ${(selectedQuestion?.id || selectedQuestion?._id) === (q.id || q._id) ? 'rotate-90' : 'opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0'}`} />
                                    </div>

                                    {/* Expanded details */}
                                    {(selectedQuestion?.id || selectedQuestion?._id) === (q.id || q._id) && (
                                        <div className="mt-8 pt-8 border-t border-dashed border-slate-200/20 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 cursor-auto" onClick={(e) => e.stopPropagation()}>
                                            {/* Options */}
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2 block">Options</label>
                                                {q.options && q.options.map((opt, idx) => (
                                                    <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100'}`}>
                                                        <span className="font-bold opacity-50">{String.fromCharCode(97 + idx)}.</span>
                                                        <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: opt.content }} />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Answer display */}
                                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                                <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                                                    <span>Answer :</span>
                                                    {q.options?.filter(o => o.isCorrect).map((o, i) => (
                                                        <span key={i} className="flex items-center gap-1">
                                                            <span className="font-bold">{String.fromCharCode(97 + q.options.findIndex(opt => opt === o))}.</span>
                                                            <div dangerouslySetInnerHTML={{ __html: o.content }} className="inline-block" />
                                                            {i < q.options.filter(opt => opt.isCorrect).length - 1 && <span>, </span>}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Solution */}
                                            {q.solution && (
                                                <div>
                                                    <details className="group">
                                                        <summary className="flex items-center gap-2 cursor-pointer text-blue-500 font-bold text-sm select-none">
                                                            <span>View Solution</span>
                                                            <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                                                        </summary>
                                                        <div className="mt-4 pt-4 border-t border-dashed border-slate-200/50 prose dark:prose-invert max-w-none text-sm"
                                                            dangerouslySetInnerHTML={{ __html: q.solution }}
                                                        />
                                                    </details>
                                                </div>
                                            )}

                                            <div className="flex justify-end pt-4 border-t border-dashed border-slate-200/20">
                                                <button
                                                    onClick={() => {
                                                        // Ensure options are properly mapped
                                                        const formattedOptions = q.options.map(opt => ({
                                                            id: opt.id,
                                                            content: opt.content,
                                                            isCorrect: opt.isCorrect
                                                        }));

                                                        setForm({
                                                            ...form,
                                                            question: q.question || q.content,
                                                            solution: q.solution,
                                                            type: q.type,
                                                            level: String(q.level),
                                                            classId: q.class_level,
                                                            subjectId: q.subject?.id || q.subject,
                                                            topicId: q.topic?.id || q.topic || '',
                                                            examTypeId: q.exam_type?.id || q.exam_type || '',
                                                            targetExamId: q.target_exam?.id || q.target_exam || '',
                                                            options: formattedOptions.length > 0 ? formattedOptions : form.options,
                                                            hasCalculator: q.has_calculator || false,
                                                            useNumericOptions: q.use_numeric_options || false,
                                                            answerFrom: q.answer_from || '',
                                                            answerTo: q.answer_to || ''
                                                        });
                                                        setView('manual');
                                                    }}
                                                    className="px-6 py-2 bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                                >
                                                    Edit Question
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {renderPagination()}
                    </>
                )}
            </div>
        </div>
    );


    const renderManualEntry = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            {/* Nav Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setView('overview')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all
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
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95 transition-all"
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
            <div className={`p-10 rounded-[3rem] border shadow-2xl relative ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                {/* Decorative title */}
                <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-dashed border-slate-200/50 pb-8">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tight">Manual <span className="text-orange-500">Question</span> Entry</h2>
                        <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Structure your question with precision systems
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLoadDraft}
                            title="Load Saved Draft"
                            className={`p-3 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                            <HardDrive size={20} />
                        </button>
                        <button
                            onClick={handleSaveProgress}
                            className="px-8 py-4 bg-orange-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/20 active:scale-95 flex items-center gap-3 hover:bg-orange-600 transition-colors">
                            <Save size={18} />
                            Save Progress
                        </button>
                    </div>
                </div>

                <div className="space-y-10">
                    {/* Primary Metadata Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <CustomSelect
                            label="Class"
                            value={form.classId}
                            options={classes}
                            placeholder="Select Class"
                            onChange={(val) => setForm({ ...form, classId: val, topicId: '' })}
                        />
                        <CustomSelect
                            label="Subject"
                            value={form.subjectId}
                            options={filteredSubjects}
                            placeholder="Select Subject"
                            onChange={(val) => setForm({ ...form, subjectId: val, topicId: '' })}
                        />
                        <CustomSelect
                            label="Topic"
                            value={form.topicId}
                            options={filteredTopics}
                            placeholder="Select Topic"
                            onChange={(val) => setForm({ ...form, topicId: val })}
                        />
                        <CustomSelect
                            label="Exam Type"
                            value={form.examTypeId}
                            options={examTypes}
                            placeholder="Select Type"
                            onChange={(val) => setForm({ ...form, examTypeId: val })}
                        />
                        <CustomSelect
                            label="Target Exam"
                            value={form.targetExamId}
                            options={targetExams}
                            placeholder="Select Exam"
                            onChange={(val) => setForm({ ...form, targetExamId: val })}
                        />
                    </div>

                    {/* Secondary Filters & Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CustomSelect
                            label="Question Type"
                            value={form.type}
                            options={[
                                { value: 'SINGLE_CHOICE', label: 'SINGLE_CHOICE' },
                                { value: 'MULTI_CHOICE', label: 'MULTI_CHOICE' },
                                { value: 'NUMERICAL', label: 'NUMERICAL' },
                                { value: 'MATRIX', label: 'MATRIX' },
                                { value: 'ASSERTION', label: 'ASSERTION' },
                                { value: 'INTEGER_TYPE', label: 'INTEGER_TYPE' },
                                { value: 'PARAGRAPH', label: 'PARAGRAPH' },

                            ]}
                            placeholder="Select Type"
                            onChange={(val) => setForm({ ...form, type: val })}
                        />
                        <CustomSelect
                            label="Level"
                            value={form.level}
                            options={[
                                { value: '1', label: '1' },
                                { value: '2', label: '2' },
                                { value: '3', label: '3' },
                                { value: '4', label: '4' },
                                { value: '5', label: '5' }
                            ]}
                            placeholder="Select Level"
                            onChange={(val) => setForm({ ...form, level: val })}
                        />
                        <div className="flex items-center gap-6 px-4 py-2 border-2 border-dashed border-slate-200 rounded-xl">
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

                    {/* Question Content */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-[0.2em]">Enter Question Content</label>
                            <div className="flex gap-1">
                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>Character: {form.question.length}</span>
                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase bg-blue-500/10 text-blue-500`}>Draft Saved</span>
                            </div>
                        </div>
                        <div className={`rich-editor-wrapper rounded-3xl border transition-all overflow-hidden ${isDarkMode ? 'border-white/5 bg-white/[0.02] dark-quill' : 'border-slate-200 bg-white shadow-xl'}`}>
                            <ReactQuill
                                theme="snow"
                                modules={quillModules}
                                formats={quillFormats}
                                value={form.question}
                                onChange={(val) => setForm({ ...form, question: val })}
                                placeholder="Enter Question content here..."
                            />
                        </div>
                    </div>

                    {/* Options or Answer Range System */}
                    {['NUMERICAL', 'INTEGER_TYPE'].includes(form.type) ? (
                        <div className="space-y-4">
                            <label className="text-xs font-black uppercase tracking-[0.2em] ml-1">Answer Range</label>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="space-y-1 flex-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">From *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="Min valid value"
                                        value={form.answerFrom}
                                        onChange={(e) => setForm({ ...form, answerFrom: e.target.value })}
                                        className={`w-full px-6 py-4 rounded-2xl border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'}`}
                                    />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">To *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="Max valid value"
                                        value={form.answerTo}
                                        onChange={(e) => setForm({ ...form, answerTo: e.target.value })}
                                        className={`w-full px-6 py-4 rounded-2xl border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'}`}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {form.options.map((opt, index) => (
                                <div key={opt.id} className="space-y-3 relative group">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${opt.isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                {String.fromCharCode(65 + index)}
                                            </div>
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Option {index + 1}</label>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleOption(opt.id)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${opt.isCorrect ? 'bg-emerald-500/10 text-emerald-500' : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <div className={`w-4 h-4 flex items-center justify-center transition-all border-2 
                                                ${form.type === 'MULTI_CHOICE' ? 'rounded-md' : 'rounded-full'}
                                                ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-current'}`}
                                            >
                                                {opt.isCorrect && <Check size={10} strokeWidth={4} className="text-white" />}
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest">
                                                {opt.isCorrect ? (form.type === 'MULTI_CHOICE' ? 'Selected' : 'Correct Answer') : 'Mark Correct'}
                                            </span>
                                        </button>
                                    </div>
                                    <div className={`rich-editor-wrapper rounded-[2rem] border transition-all overflow-hidden ${opt.isCorrect ? 'border-emerald-500/40 bg-emerald-500/[0.02]' : isDarkMode ? 'border-white/5 bg-white/[0.02] dark-quill' : 'border-slate-200 bg-slate-50 shadow-inner'}`}>
                                        <ReactQuill
                                            theme="snow"
                                            modules={quillModules}
                                            formats={quillFormats}
                                            value={opt.content}
                                            onChange={(val) => {
                                                const newOps = [...form.options];
                                                newOps[index].content = val;
                                                setForm({ ...form, options: newOps });
                                            }}
                                            placeholder={`Enter content for Option ${String.fromCharCode(65 + index)}...`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Solution / Explanation */}
                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-[0.2em] ml-1">Step-by-step Solution <span className="opacity-40">(Optional)</span></label>
                        <div className={`rich-editor-wrapper rounded-3xl border transition-all overflow-hidden ${isDarkMode ? 'border-white/5 bg-white/[0.02] dark-quill' : 'border-slate-200 bg-slate-50 shadow-inner'}`}>
                            <ReactQuill
                                theme="snow"
                                modules={quillModules}
                                formats={quillFormats}
                                value={form.solution}
                                onChange={(val) => setForm({ ...form, solution: val })}
                                placeholder="Explain how to arrive at the correct answer..."
                            />
                        </div>
                    </div>

                    {/* Final Action */}
                    <div className="pt-10 flex flex-col items-center gap-6">
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200/20 to-transparent" />
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`px-16 py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl shadow-orange-600/30 transition-all hover:scale-[1.05] active:scale-95 flex items-center gap-4 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Plus size={20} strokeWidth={4} />
                                    Add to Question Bank
                                </>
                            )}
                        </button>
                        <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">Questions will undergo validation check before publishing.</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen">
            {view === 'overview' && renderOverview()}
            {view === 'manual' && renderManualEntry()}
            {view === 'repository' && renderRepository()}
            {renderMathModal()}

            <style jsx>{`
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
                .dark-quill .ql-toolbar {
                    background: rgba(255,255,255,0.05);
                    border-color: rgba(255,255,255,0.05) !important;
                }
                .dark-quill .ql-container {
                    border-color: rgba(255,255,255,0.05) !important;
                    color: white;
                }
                .dark-quill .ql-stroke {
                    stroke: #94a3b8 !important;
                }
                .dark-quill .ql-fill {
                    fill: #94a3b8 !important;
                }
                .dark-quill .ql-picker-label {
                    color: #94a3b8 !important;
                }
                .dark-quill .ql-picker-options {
                    background-color: #1A1F2B !important;
                    border-color: rgba(255,255,255,0.1) !important;
                    color: white !important;
                }
                .rich-editor-wrapper .ql-toolbar {
                    border-top: none !important;
                    border-left: none !important;
                    border-right: none !important;
                    padding: 12px !important;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    background: #fbfcfe;
                }
                .dark-quill .ql-toolbar {
                    background: rgba(255,255,255,0.02) !important;
                }
                .rich-editor-wrapper .ql-formats {
                    margin-right: 12px !important;
                    border-right: 1px solid rgba(0,0,0,0.05);
                    padding-right: 12px;
                }
                .dark-quill .ql-formats {
                    border-right-color: rgba(255,255,255,0.05);
                }
                .rich-editor-wrapper .ql-formats:last-child {
                    border-right: none;
                }
                .rich-editor-wrapper .ql-container {
                    border: none !important;
                    min-height: 180px;
                }
                .rich-editor-wrapper .ql-editor {
                    min-height: 150px;
                    font-size: 14px;
                    line-height: 1.6;
                }
            `}</style>
        </div>
    );
};



export default QuestionBank;
