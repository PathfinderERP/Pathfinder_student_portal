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
    Palette, Droplets, Eraser, Clock, Logs, Copy, Loader2
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

if (!Quill.imports['modules/imageResize']) {
    Quill.register('modules/imageResize', ImageResize);
}
if (!Quill.imports['modules/imageDrop']) {
    Quill.register('modules/imageDrop', ImageDrop);
}

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
    const [view, setView] = useState('overview'); // 'overview', 'manual', 'repository', 'bulk'
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
    const [formKey, setFormKey] = useState(0);
    const [form, setForm] = useState({
        id: null,
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
        answerTo: '',
        image_1: '',
        image_2: ''
    });

    const resetForm = () => {
        setFormKey(prev => prev + 1);
        setForm({
            id: null,
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
            answerTo: '',
            image_1: '',
            image_2: ''
        });
    };

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

    // Fetch Images
    const fetchImages = useCallback(async () => {
        const config = getAuthConfig();
        if (!config) return;

        setIsLoadingImages(true);
        try {
            const apiUrl = getApiUrl();
            const params = new URLSearchParams();
            if (imageFilters.classId) params.append('class_level', imageFilters.classId);
            if (imageFilters.subjectId) params.append('subject', imageFilters.subjectId);
            if (imageFilters.topicId) params.append('topic', imageFilters.topicId);

            const res = await axios.get(`${apiUrl}/api/questions/images/?${params.toString()}`, config);
            setImages(res.data);
        } catch (err) {
            console.error("Failed to fetch images", err);
        } finally {
            setIsLoadingImages(false);
        }
    }, [getApiUrl, getAuthConfig, imageFilters]);

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const config = getAuthConfig();
        if (!config) return;

        setIsUploadingImage(true);
        const apiUrl = getApiUrl();

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('image', file);
                if (imageFilters.classId) formData.append('class_level', imageFilters.classId);
                if (imageFilters.subjectId) formData.append('subject', imageFilters.subjectId);
                if (imageFilters.topicId) formData.append('topic', imageFilters.topicId);

                await axios.post(`${apiUrl}/api/questions/images/`, formData, {
                    headers: {
                        ...config.headers,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            }
            fetchImages();
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

    useEffect(() => {
        if (view === 'media') {
            fetchImages();
        }
    }, [view, fetchImages]);

    // Media Cascading Filters
    const filteredSubjectsForMedia = useMemo(() => {
        if (!imageFilters.classId) return subjects;
        const subjectIds = [...new Set(topics
            .filter(t => String(t.class_level) === String(imageFilters.classId))
            .map(t => String(t.subject))
        )];
        return subjects.filter(s => subjectIds.includes(String(s.id)));
    }, [subjects, topics, imageFilters.classId]);

    const filteredTopicsForMedia = useMemo(() => {
        return topics.filter(t => {
            const matchesClass = !imageFilters.classId || String(t.class_level) === String(imageFilters.classId);
            const matchesSubject = !imageFilters.subjectId || String(t.subject) === String(imageFilters.subjectId);
            return matchesClass && matchesSubject;
        });
    }, [topics, imageFilters.classId, imageFilters.subjectId]);

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

                const { message, errors } = response.data;
                if (errors && errors.length > 0) {
                    alert(`${message}\n\nErrors encountered:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...and more' : ''}`);
                } else {
                    alert(message || "Bulk Question Import Successful!");
                }

                fetchQuestions(); // Refresh the list
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
                            onClick={() => setView('bulk')}
                            className={`flex-1 min-h-[300px] rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center relative cursor-pointer
                                ${isDarkMode ? 'border-white/10 hover:border-orange-500/50 hover:bg-orange-500/5' : 'border-slate-200 hover:border-orange-500/30 hover:bg-slate-50'}`}
                        >
                            <CloudUpload size={48} className="text-orange-500 mb-6 animate-bounce" />
                            <h4 className="text-lg font-black uppercase tracking-tight mb-2">Bulk Import Questions</h4>
                            <p className="text-xs font-medium opacity-50 mb-8 max-w-[280px]">Upload your Excel or CSV files with our standardized format.</p>

                            <button className="px-8 py-3.5 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/30 active:scale-95 flex items-center gap-3">
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
                    <div onClick={() => { resetForm(); setView('manual'); }} className={`p-8 rounded-[2.5rem] border shadow-xl group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
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
                    <div
                        onClick={() => {
                            setView('media');
                        }}
                        className={`p-8 rounded-[2.5rem] border shadow-xl relative group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}
                    >
                        <div className="w-14 h-14 bg-purple-500 rounded-2xl shadow-lg flex items-center justify-center mb-6 text-white"><ImageIcon size={28} /></div>
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2">Media Master</h3>
                        <p className="text-sm font-medium opacity-60 mb-8 leading-relaxed">Upload and manage question images. Copy links for Excel.</p>
                        <div className="flex items-center gap-2 text-purple-500 font-black uppercase tracking-widest text-[10px]">Manage Media <ChevronRight size={14} strokeWidth={4} /></div>
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
                image_1: form.image_1,
                image_2: form.image_2,
            };

            if (form.id) {
                await axios.patch(`${apiUrl}/api/questions/${form.id}/`, payload, config);
                alert("Question updated successfully!");
            } else {
                await axios.post(`${apiUrl}/api/questions/`, payload, config);
                alert("Question added to bank successfully!");
            }

            resetForm();
            if (view === 'manual' && form.id) {
                fetchQuestions();
                setView('repository');
            }

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

    const handleMarkAsWrong = async (questionId) => {
        if (!confirm("Are you sure you want to change the 'Wrong' status of this question?")) return;
        try {
            const config = getAuthConfig();
            const apiUrl = getApiUrl();
            await axios.post(`${apiUrl}/api/questions/${questionId}/mark_wrong/`, {}, config);
            fetchQuestions(); // Refresh list
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update status");
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (!confirm("Are you sure you want to permanently DELETE this question? This cannot be undone.")) return;
        try {
            const config = getAuthConfig();
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/questions/${questionId}/`, config);
            fetchQuestions(); // Refresh list
            if (selectedQuestion && (selectedQuestion.id === questionId || selectedQuestion._id === questionId)) {
                setSelectedQuestion(null);
            }
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Failed to delete question");
        }
    };

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
                        onClick={() => { resetForm(); setView('manual'); }}
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
                                        <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 ${isDarkMode ? 'bg-[#10141D] text-emerald-500' : 'bg-white text-emerald-600 shadow-sm'}`}>
                                            <div className="text-[8px] font-black uppercase opacity-40 leading-none mb-0.5">LVL</div>
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
                                                {q.created_at && (
                                                    <div className="flex items-center gap-1.5 ml-auto text-[9px] font-bold opacity-30 uppercase tracking-widest">
                                                        <Clock size={10} />
                                                        {new Date(q.created_at).toLocaleString('en-IN', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                )}
                                                {q.is_wrong && (
                                                    <div className="ml-auto px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-md animate-pulse">
                                                        Wrong Pattern
                                                    </div>
                                                )}
                                            </div>
                                            <div
                                                className={`text-sm font-medium prose dark:prose-invert max-w-none ${(selectedQuestion?.id || selectedQuestion?._id) === (q.id || q._id) ? '' : 'line-clamp-2'}`}
                                                dangerouslySetInnerHTML={{ __html: q.question || q.content }}
                                            />
                                            {(q.image_1 || q.image_2) && (
                                                <div className="flex flex-wrap gap-4 mt-4">
                                                    {q.image_1 && (
                                                        <div className="relative group/img max-w-[180px] rounded-xl overflow-hidden border border-slate-200/50 bg-white">
                                                            <img src={q.image_1} alt="Question Diagram 1" className="max-h-32 w-full object-contain p-2" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                                <button onClick={(e) => { e.stopPropagation(); window.open(q.image_1, '_blank'); }} className="p-1.5 bg-white rounded-full text-black shadow-lg transform translate-y-2 group-hover/img:translate-y-0 transition-transform">
                                                                    <Plus size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {q.image_2 && (
                                                        <div className="relative group/img max-w-[180px] rounded-xl overflow-hidden border border-slate-200/50 bg-white">
                                                            <img src={q.image_2} alt="Question Diagram 2" className="max-h-32 w-full object-contain p-2" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                                <button onClick={(e) => { e.stopPropagation(); window.open(q.image_2, '_blank'); }} className="p-1.5 bg-white rounded-full text-black shadow-lg transform translate-y-2 group-hover/img:translate-y-0 transition-transform">
                                                                    <Plus size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
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

                                            <div className="flex justify-end pt-4 border-t border-dashed border-slate-200/20 gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteQuestion(q.id || q._id);
                                                    }}
                                                    className="px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkAsWrong(q.id || q._id);
                                                    }}
                                                    className={`px-6 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] border transition-all active:scale-95 flex items-center gap-2
                                                        ${q.is_wrong
                                                            ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'}`}
                                                >
                                                    <AlertCircle size={14} />
                                                    {q.is_wrong ? 'Unmark Wrong' : 'Mark as Wrong'}
                                                </button>
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
                                                            id: q.id || q._id,
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
                                                            answerTo: q.answer_to || '',
                                                            image_1: q.image_1 || '',
                                                            image_2: q.image_2 || ''
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
        </div >
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
                        <h2 className="text-3xl font-black uppercase tracking-tight">{form.id ? 'Edit' : 'Manual'} <span className="text-orange-500">Question</span> {form.id ? 'Mode' : 'Entry'}</h2>
                        <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Structure your question with precision systems
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { if (confirm("Clear all fields? This will lose current progress.")) resetForm(); }}
                            title="Clear All Fields"
                            className={`p-3 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 italic'}`}>
                            <div className="flex items-center gap-2">
                                <Eraser size={20} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Clear Form</span>
                            </div>
                        </button>
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
                    <div className="space-y-6">
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
                                    key={`question-${formKey}`}
                                    theme="snow"
                                    modules={quillModules}
                                    formats={quillFormats}
                                    value={form.question}
                                    onChange={(val) => setForm({ ...form, question: val })}
                                    placeholder="Enter Question content here..."
                                />
                            </div>
                        </div>

                        {/* Direct Image Links */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Question Image 1 (URL)</label>
                                <input
                                    type="text"
                                    placeholder="https://example.com/image1.png"
                                    value={form.image_1 || ''}
                                    onChange={(e) => setForm({ ...form, image_1: e.target.value })}
                                    className={`w-full px-6 py-4 rounded-2xl border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Question Image 2 (URL)</label>
                                <input
                                    type="text"
                                    placeholder="https://example.com/image2.png"
                                    value={form.image_2 || ''}
                                    onChange={(e) => setForm({ ...form, image_2: e.target.value })}
                                    className={`w-full px-6 py-4 rounded-2xl border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'}`}
                                />
                            </div>
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
                                            key={`opt-${index}-${formKey}`}
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
                                key={`solution-${formKey}`}
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
                                    {form.id ? 'Updating...' : 'Saving...'}
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    {form.id ? 'Update Question' : 'Save To Bank'}
                                </>
                            )}
                        </button>
                        <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">Questions will undergo validation check before publishing.</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMediaLibrary = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setView('overview')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all
                        ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                >
                    <ArrowLeft size={16} />
                    Back to Overview
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => mediaInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="px-8 py-3 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 flex items-center gap-3 disabled:opacity-50"
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
            <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
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
                            options={classes}
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
                        <div key={i} className={`aspect-square rounded-[2rem] animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                    ))
                ) : images.length > 0 ? images.map((img) => (
                    <div key={img._id || img.id} className={`group relative p-3 rounded-[2rem] border transition-all hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                        <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/5 relative">
                            <img
                                src={img.image}
                                alt="Gallery item"
                                className="w-full h-full object-contain"
                            />
                            {/* Actions Overlay */}
                            <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4 p-6 scale-95 group-hover:scale-100">
                                <button
                                    onClick={() => copyToClipboard(img.image)}
                                    className="w-full py-3 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[9px] shadow-xl hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                >
                                    <Copy size={14} />
                                    <span>Copy Excel Link</span>
                                </button>
                                <button
                                    onClick={() => window.open(img.image, '_blank')}
                                    className="w-full py-3 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-white/20 transition-all flex items-center justify-center gap-2 border border-white/10"
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
                            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
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
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all
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
            <div className={`p-10 rounded-[3rem] border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
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
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all
                                ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                        >
                            <Database size={16} />
                            View Bank
                        </button>
                        <button
                            onClick={() => setView('manual')}
                            className="px-6 py-3 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center gap-2 active:scale-95"
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
                                <div key={item.col} className={`p-4 rounded-2xl flex items-center justify-between border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center gap-4">
                                        <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-black">{item.col}</span>
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
                            <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
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

                        <div className="bg-orange-500/5 border-2 border-dashed border-orange-500/20 p-8 rounded-3xl space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500 rounded-lg text-white"><CloudUpload size={20} /></div>
                                <h4 className="text-sm font-black uppercase tracking-tight">Ready to Upload?</h4>
                            </div>
                            <p className="text-xs opacity-60 leading-relaxed font-medium">
                                Ensure your file matches the column order specified. Images should be uploaded to the server first or provided as valid URLs.
                            </p>
                            <div className="pt-4 flex items-center gap-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-3 bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all flex items-center gap-2"
                                >
                                    <FileSpreadsheet size={14} />
                                    Select File
                                </button>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 border 
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
                                <div className={`p-6 rounded-[2rem] border flex items-center gap-4 shadow-xl ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                                    <div className="p-3 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                                        <FileSpreadsheet size={24} />
                                    </div>
                                    <div className="flex-1 overflow-hidden text-left">
                                        <p className="font-black text-xs uppercase tracking-widest text-emerald-500 mb-1">File Loaded</p>
                                        <p className="font-black text-sm truncate">{selectedFile.name}</p>
                                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedFile(null)}
                                        className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <button
                                    onClick={handleUpload}
                                    className="w-full mt-4 py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
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


    return (
        <div className="min-h-screen">
            {view === 'overview' && renderOverview()}
            {view === 'manual' && renderManualEntry()}
            {view === 'repository' && renderRepository()}
            {view === 'bulk' && renderBulkUpload()}
            {view === 'media' && renderMediaLibrary()}
            {renderMathModal()}

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
