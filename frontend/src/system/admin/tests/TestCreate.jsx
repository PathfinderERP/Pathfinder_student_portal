import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
    FileText, Plus, Search, Edit2, Trash2, Filter, Loader2,
    Database, X, Check, ChevronDown, RefreshCw, Layers, Clock, ToggleLeft, ToggleRight,
    Bold, Italic, Underline, Type, Quote, Code, List, Superscript, Subscript, AlignLeft,
    AlignCenter, Link, Image, Sigma, Calculator
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';
import { ImageDrop } from 'quill-image-drop-module';
import SectionManagement from './sections/SectionManagement';
import katex from 'katex';
import 'katex/dist/katex.min.css';

window.katex = katex;
Quill.register('modules/imageResize', ImageResize);
Quill.register('modules/imageDrop', ImageDrop);



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
            className={`min-h-[60px] flex items-center justify-center p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
        />
    );
};

const TestCreate = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    // Quill Editor Configuration
    const quillModules = useMemo(() => ({
        toolbar: {
            container: [
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'script': 'sub' }, { 'script': 'super' }],
                [{ 'header': [1, 2, 3, false] }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                ['link', 'image', 'formula'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['clean']
            ],
            handlers: {
                formula: function () {
                    document.dispatchEvent(new CustomEvent('open-formula-modal', { detail: { quill: this.quill } }));
                }
            }
        },
        imageResize: {
            parchment: Quill.import('parchment'),
            modules: ['Resize', 'DisplaySize', 'Toolbar']
        },
        imageDrop: true
    }), []);

    const quillFormats = [
        'header', 'size', 'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent', 'link', 'image', 'align', 'script', 'color', 'background',
        'code-block', 'formula'
    ];

    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState(null);

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
    const [showMathTools, setShowMathTools] = useState(false);
    const [toolbarAlert, setToolbarAlert] = useState(null);
    const [formulaValue, setFormulaValue] = useState('');
    const [activeQuill, setActiveQuill] = useState(null);
    const [pastFormulas, setPastFormulas] = useState([]);
    const [modalMode, setModalMode] = useState('create');
    const [selectedItem, setSelectedItem] = useState(null);

    const [activeView, setActiveView] = useState('test-list'); // 'test-list', 'section-management'
    const [managementTest, setManagementTest] = useState(null);

    // Toolbar Alert Logic
    useEffect(() => {
        if (!isModalOpen) return;

        const timeout = setTimeout(() => {
            const toolbar = document.querySelector('.ql-toolbar');
            if (toolbar) {
                const handleToolbarClick = (e) => {
                    const target = e.target.closest('button, .ql-picker');
                    if (!target) return;

                    // Get the tool name from class or label
                    let toolName = 'Formatting';
                    const classes = Array.from(target.classList);
                    const qlClass = classes.find(c => c.startsWith('ql-'));
                    if (qlClass) toolName = qlClass.replace('ql-', '').charAt(0).toUpperCase() + qlClass.replace('ql-', '').slice(1);
                    if (target.getAttribute('aria-label')) toolName = target.getAttribute('aria-label');

                    // Small delay to let Quill update the classes
                    setTimeout(() => {
                        const isActive = target.classList.contains('ql-active') ||
                            target.querySelector('.ql-picker-label')?.classList.contains('ql-active');

                        // Handle Image Toolbar Position Change
                        if (target.style.display === 'inline-block' || target.parentElement?.classList.contains('ql-image-toolbar')) {
                            const action = target.getAttribute('title') || toolName;
                            setToolbarAlert(`Image Position: ${action}`);
                        } else {
                            setToolbarAlert(`${toolName} ${isActive ? 'Selected' : 'Unselected'}`);
                        }

                        setTimeout(() => setToolbarAlert(null), 1500);
                    }, 100);
                };

                const handleEditorDrop = (e) => {
                    // Check if an image was dropped
                    if (e.target.closest('.ql-editor img') || e.dataTransfer.types.includes('Files')) {
                        setToolbarAlert('Image Position: Repositioned via Drag');
                        setTimeout(() => setToolbarAlert(null), 1500);
                    }
                };

                // Internal Draggable fix
                const makeImagesDraggable = () => {
                    document.querySelectorAll('.ql-editor img').forEach(img => {
                        if (img.getAttribute('draggable') !== 'true') {
                            img.setAttribute('draggable', 'true');
                            img.style.userSelect = 'auto';
                            img.style.webkitUserDrag = 'element';
                        }
                    });
                };

                const observer = new MutationObserver(makeImagesDraggable);
                const editorElement = document.querySelector('.ql-editor');
                if (editorElement) {
                    editorElement.addEventListener('drop', handleEditorDrop);
                    observer.observe(editorElement, { childList: true, subtree: true });
                    makeImagesDraggable();
                }

                toolbar.addEventListener('click', handleToolbarClick);

                return () => {
                    toolbar.removeEventListener('click', handleToolbarClick);
                    observer.disconnect();
                    if (editorElement) {
                        editorElement.removeEventListener('drop', handleEditorDrop);
                    }
                };
            }
        }, 500); // Wait for quill to render

        return () => clearTimeout(timeout);
    }, [isModalOpen]);

    useEffect(() => {
        const handleOpenFormula = (e) => {
            setActiveQuill(e.detail.quill);
            setShowMathTools(prev => !prev);
        };
        document.addEventListener('open-formula-modal', handleOpenFormula);
        return () => document.removeEventListener('open-formula-modal', handleOpenFormula);
    }, []);

    const mathSymbols = [
        { label: '±', tex: '\\pm' }, { label: '√x', tex: '\\sqrt{x}' }, { label: '∛x', tex: '\\sqrt[3]{x}' },
        { label: 'ⁿ√x', tex: '\\sqrt[n]{x}' }, { label: 'x/y', tex: '\\frac{x}{y}' },
        { label: 'Σ', tex: '\\sum_{x}^{n}' }, { label: 'Π', tex: '\\prod_{x}^{n}' },
        { label: '∫', tex: '\\int_{x}^{s}' }, { label: '(n k)', tex: '\\binom{n}{k}' }
    ];

    const insertFormula = () => {
        if (activeQuill && formulaValue) {
            const range = activeQuill.getSelection(true);
            activeQuill.insertEmbed(range.index, 'formula', formulaValue, 'user');
            activeQuill.setSelection(range.index + 1, 'user');
            if (!pastFormulas.includes(formulaValue)) {
                setPastFormulas(prev => [formulaValue, ...prev].slice(0, 10));
            }
            setFormulaValue('');
            setShowMathTools(false);
        }
    };

    const [formValues, setFormValues] = useState({
        name: '',
        code: '',
        session: '',
        target_exam: '',
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

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const apiUrl = getApiUrl();
            const config = getAuthConfig();
            const response = await axios.get(`${apiUrl}/api/tests/`, config);
            setData(response.data);

            // Fetch Master Data for dropdowns
            const [sessRes, typeRes, classRes, targetRes, detailRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/sessions/`, config),
                axios.get(`${apiUrl}/api/master-data/exam-types/`, config),
                axios.get(`${apiUrl}/api/master-data/classes/`, config),
                axios.get(`${apiUrl}/api/master-data/target-exams/`, config),
                axios.get(`${apiUrl}/api/master-data/exam-details/`, config)
            ]);
            setSessions(sessRes.data);
            setExamTypes(typeRes.data);
            setClasses(classRes.data);
            setTargetExams(targetRes.data);
            setExamDetails(detailRes.data);

        } catch (err) {
            console.error('Failed to fetch test data:', err);
            setError('Failed to load test management data.');
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, getAuthConfig]);

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
            target_exam: '',
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
            target_exam: item.target_exam || '',
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
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/tests/${id}/`, getAuthConfig());
            fetchData();
        } catch (err) {
            alert('Failed to delete test');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleStatus = async (item) => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/tests/${item.id}/`,
                { is_completed: !item.is_completed },
                getAuthConfig()
            );
            fetchData();
        } catch (err) {
            alert('Failed to update status');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            if (modalMode === 'create') {
                await axios.post(`${apiUrl}/api/tests/`, formValues, getAuthConfig());
            } else {
                await axios.patch(`${apiUrl}/api/tests/${selectedItem.id}/`, formValues, getAuthConfig());
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            alert(`Failed to ${modalMode} test: ` + (err.response?.data?.code || err.message));
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredData = data.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesStatus = true;
        if (statusFilter === 'completed') matchesStatus = item.is_completed === true;
        if (statusFilter === 'pending') matchesStatus = item.is_completed === false;

        return matchesSearch && matchesStatus;
    });

    const renderHeader = () => (
        <div className={`p-8 rounded-[2.5rem] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
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
                        className={`p-3 rounded-2xl border transition-all hover:scale-110 active:rotate-180 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
                    >
                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-600/30 active:scale-95"
                    >
                        <Plus size={16} strokeWidth={3} />
                        Add Test
                    </button>
                </div>
            </div>
        </div>
    );

    const renderContent = () => (
        <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search tests..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                            }`}
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto relative">
                    <div className="relative flex-1 md:flex-none">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${statusFilter !== 'all'
                                ? 'bg-orange-500/10 border-orange-500/50 text-orange-500'
                                : isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Filter size={16} />
                            {statusFilter === 'all' ? 'Filter' : statusFilter}
                            <ChevronDown size={14} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                                <div className={`absolute right-0 top-full mt-2 w-48 z-20 rounded-2xl border shadow-2xl p-2 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                    {['all', 'completed', 'pending'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => { setStatusFilter(f); setIsFilterOpen(false); }}
                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                {isLoading ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                        <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em]">Synchronizing Tests...</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="pb-4 px-4 font-black">#</th>
                                <th className="pb-4 px-4 font-black">Test Name</th>
                                <th className="pb-4 px-4 font-black">Test Code</th>
                                <th className="pb-4 px-4 font-black text-center">Duration</th>
                                <th className="pb-4 px-4 font-black text-center">Completed</th>
                                <th className="pb-4 px-4 font-black text-center">Question Paper</th>
                                <th className="pb-4 px-4 font-black text-center">Sections</th>
                                <th className="pb-4 px-4 font-black text-center">Questions</th>
                                <th className="pb-4 px-4 text-right font-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {filteredData.map((item, index) => (
                                <tr key={item.id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-200/50'} transition-colors`}>
                                    <td className="py-5 px-4 font-bold text-xs opacity-50">{index + 1}</td>
                                    <td className="py-5 px-4">
                                        <div className="flex flex-col">
                                            <span className="font-extrabold text-sm mb-1">{item.name}</span>
                                            <span className="text-[10px] opacity-40 font-bold uppercase tracking-wider">
                                                {item.session_details?.name} • {item.class_level_details?.name} • {item.target_exam_details?.name}
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
                                            <button className="px-4 py-1.5 rounded-md bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-orange-700 shadow-lg shadow-orange-600/30">
                                                QuestionPaper
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
                                                className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-blue-700 shadow-lg shadow-blue-600/30"
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex justify-center">
                                            <button className="px-4 py-1.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-emerald-700 shadow-lg shadow-emerald-600/30">
                                                Manage
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex justify-end items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className={`p-2 rounded-xl transition-all hover:scale-110 ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white'}`}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className={`p-2 rounded-xl transition-all hover:scale-110 ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white'}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );

    // Auto-populate Code, Duration, and Marks based on Selected Exam Title (Name)
    useEffect(() => {
        if (formValues.name) {
            const match = examDetails.find(d =>
                d.name === formValues.name &&
                String(d.session) === String(formValues.session) &&
                String(d.class_level) === String(formValues.class_level) &&
                String(d.target_exam) === String(formValues.target_exam) &&
                String(d.exam_type) === String(formValues.exam_type)
            );
            if (match) {
                setFormValues(prev => ({
                    ...prev,
                    code: match.code || prev.code,
                    duration: match.duration || prev.duration
                }));
            }
        }
    }, [formValues.name, formValues.session, formValues.class_level, formValues.target_exam, formValues.exam_type, examDetails]);

    // Cascading Filter Logic based on Exam Details Master
    const availableSessions = useMemo(() => {
        const sessionIds = [...new Set(examDetails.map(d => String(d.session)))];
        return sessions.filter(s => sessionIds.includes(String(s.id)));
    }, [sessions, examDetails]);

    const availableClasses = useMemo(() => {
        if (!formValues.session) return [];
        const classIds = [...new Set(examDetails
            .filter(d => String(d.session) === String(formValues.session))
            .map(d => String(d.class_level)))];
        return classes.filter(c => classIds.includes(String(c.id)));
    }, [classes, examDetails, formValues.session]);

    const availableTargetExams = useMemo(() => {
        if (!formValues.session || !formValues.class_level) return [];
        const targetIds = [...new Set(examDetails
            .filter(d =>
                String(d.session) === String(formValues.session) &&
                String(d.class_level) === String(formValues.class_level)
            )
            .map(d => String(d.target_exam)))];
        return targetExams.filter(t => targetIds.includes(String(t.id)));
    }, [targetExams, examDetails, formValues.session, formValues.class_level]);

    const availableExamTypes = useMemo(() => {
        if (!formValues.session || !formValues.class_level || !formValues.target_exam) return [];
        const typeIds = [...new Set(examDetails
            .filter(d =>
                String(d.session) === String(formValues.session) &&
                String(d.class_level) === String(formValues.class_level) &&
                String(d.target_exam) === String(formValues.target_exam)
            )
            .map(d => String(d.exam_type)))];
        return examTypes.filter(et => typeIds.includes(String(et.id)));
    }, [examTypes, examDetails, formValues.session, formValues.class_level, formValues.target_exam]);

    const availableTitles = useMemo(() => {
        if (!formValues.session || !formValues.class_level || !formValues.target_exam || !formValues.exam_type) return [];
        return examDetails
            .filter(d =>
                String(d.session) === String(formValues.session) &&
                String(d.class_level) === String(formValues.class_level) &&
                String(d.target_exam) === String(formValues.target_exam) &&
                String(d.exam_type) === String(formValues.exam_type)
            )
            .map(d => d.name);
    }, [examDetails, formValues.session, formValues.class_level, formValues.target_exam, formValues.exam_type]);

    const isAllCriteriaSelected = !!(formValues.session && formValues.target_exam && formValues.exam_type && formValues.class_level);

    const renderModal = () => {
        if (!isModalOpen) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                <div className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 ${isDarkMode ? 'bg-[#10141D]' : 'bg-white'}`}>
                    {/* Header */}
                    <div className="shrink-0 bg-orange-500 p-6 flex justify-between items-center z-10">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {modalMode === 'create' ? 'Add' : 'Edit'} Exam Details
                        </h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-white hover:scale-110 transition-transform">
                            <X size={24} strokeWidth={3} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        <div className="space-y-6">
                            {/* Relational Selects */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Session</label>
                                    <select
                                        value={formValues.session}
                                        onChange={e => setFormValues({ ...formValues, session: e.target.value, class_level: '', target_exam: '', exam_type: '', name: '', code: '' })}
                                        className={`w-full px-4 py-3 rounded-xl border-none font-bold text-[10px] uppercase outline-none appearance-none transition-all ${isDarkMode ? 'bg-white/5 text-white focus:bg-white/10' : 'bg-slate-100/50 text-slate-600 focus:bg-slate-100'}`}
                                    >
                                        <option value="">Select Session</option>
                                        {availableSessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                    <select
                                        disabled={!formValues.session}
                                        value={formValues.class_level}
                                        onChange={e => setFormValues({ ...formValues, class_level: e.target.value, target_exam: '', exam_type: '', name: '', code: '' })}
                                        className={`w-full px-4 py-3 rounded-xl border-none font-bold text-[10px] uppercase outline-none appearance-none transition-all ${!formValues.session ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-white/5 text-white focus:bg-white/10' : 'bg-slate-100/50 text-slate-600 focus:bg-slate-100'}`}
                                    >
                                        <option value="">Select Class</option>
                                        {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Target Exam</label>
                                    <select
                                        disabled={!formValues.class_level}
                                        value={formValues.target_exam}
                                        onChange={e => setFormValues({ ...formValues, target_exam: e.target.value, exam_type: '', name: '', code: '' })}
                                        className={`w-full px-4 py-3 rounded-xl border-none font-bold text-[10px] uppercase outline-none appearance-none transition-all ${!formValues.class_level ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-white/5 text-white focus:bg-white/10' : 'bg-slate-100/50 text-slate-600 focus:bg-slate-100'}`}
                                    >
                                        <option value="">Select Target</option>
                                        {availableTargetExams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Type</label>
                                    <select
                                        disabled={!formValues.target_exam}
                                        value={formValues.exam_type}
                                        onChange={e => setFormValues({ ...formValues, exam_type: e.target.value, name: '', code: '' })}
                                        className={`w-full px-4 py-3 rounded-xl border-none font-bold text-[10px] uppercase outline-none appearance-none transition-all ${!formValues.target_exam ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-white/5 text-white focus:bg-white/10' : 'bg-slate-100/50 text-slate-600 focus:bg-slate-100'}`}
                                    >
                                        <option value="">Select Type</option>
                                        {availableExamTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Title & Code */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Title * {!isAllCriteriaSelected && '(Select Four Filters First)'}</label>
                                    <select
                                        disabled={!isAllCriteriaSelected}
                                        required
                                        value={formValues.name}
                                        onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                        className={`w-full px-5 py-4 rounded-xl border font-semibold text-sm outline-none transition-all ${!isAllCriteriaSelected ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    >
                                        <option value="">Select Exam Title</option>
                                        {availableTitles.map(title => (
                                            <option key={title} value={title}>{title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Code *</label>
                                    <input
                                        required
                                        placeholder="Exam Code *"
                                        value={formValues.code}
                                        onChange={e => setFormValues({ ...formValues, code: e.target.value })}
                                        className={`w-full px-5 py-4 rounded-xl border font-semibold text-sm outline-none transition-all placeholder:text-slate-500 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Duration (Mins) (Auto-selected)</label>
                                    <input
                                        type="number"
                                        readOnly
                                        required
                                        value={formValues.duration}
                                        className={`w-full px-5 py-4 rounded-xl border font-semibold text-sm outline-none transition-all opacity-60 cursor-not-allowed ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="flex items-center gap-8 py-2">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormValues({ ...formValues, is_completed: !formValues.is_completed })}
                                        className={`relative w-12 h-6 rounded-full transition-colors flex items-center ${formValues.is_completed ? 'bg-orange-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formValues.is_completed ? 'right-1' : 'left-1'}`} />
                                    </button>
                                    <span className="text-sm font-bold opacity-60">Completed</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormValues({ ...formValues, has_calculator: !formValues.has_calculator })}
                                        className={`relative w-12 h-6 rounded-full transition-colors flex items-center ${formValues.has_calculator ? 'bg-orange-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formValues.has_calculator ? 'right-1' : 'left-1'}`} />
                                    </button>
                                    <span className="text-sm font-bold opacity-60">Calculator</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormValues({ ...formValues, option_type_numeric: !formValues.option_type_numeric })}
                                        className={`relative w-12 h-6 rounded-full transition-colors flex items-center ${formValues.option_type_numeric ? 'bg-orange-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formValues.option_type_numeric ? 'right-1' : 'left-1'}`} />
                                    </button>
                                    <span className="text-sm font-bold opacity-60">Option type (1,2,3,4)</span>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className={`h-px w-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />

                        {/* Instructions & Formulas (After Main Fields) */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold opacity-80 uppercase tracking-widest">Test Instructions</h3>
                                <p className="text-[10px] opacity-40 font-medium">Add guidelines and mathematical formulas for the students.</p>
                            </div>

                            <div className={`富文本编辑器 relative ${isDarkMode ? 'dark-quill' : ''}`}>
                                {/* Toolbar Alert */}
                                {toolbarAlert && (
                                    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[101] animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl border ${isDarkMode ? 'bg-[#1A1F2B] border-orange-500/50 text-orange-500' : 'bg-white border-orange-500 text-orange-600'}`}>
                                            {toolbarAlert}
                                        </div>
                                    </div>
                                )}

                                <ReactQuill
                                    theme="snow"
                                    value={formValues.instructions}
                                    onChange={(content, delta, source, editor) => {
                                        if (source === 'user') {
                                            const html = editor.getHTML();
                                            if (html !== formValues.instructions) {
                                                setFormValues(prev => ({ ...prev, instructions: html }));
                                            }
                                        }
                                    }}
                                    modules={quillModules}
                                    formats={quillFormats}
                                    placeholder="Enter test instructions..."
                                    className={`rounded-xl overflow-hidden border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
                                />
                                <style>{`
                                    .dark-quill .ql-toolbar {
                                        background: #1A1F2B !important;
                                        border-color: rgba(255,255,255,0.1) !important;
                                    }
                                    .dark-quill .ql-container {
                                        background: #1A1F2B !important;
                                        border-color: rgba(255,255,255,0.1) !important;
                                        color: white !important;
                                        min-height: 250px;
                                    }
                                    .dark-quill .ql-stroke {
                                        stroke: #94a3b8 !important;
                                        transition: all 0.2s;
                                    }
                                    .dark-quill .ql-fill {
                                        fill: #94a3b8 !important;
                                        transition: all 0.2s;
                                    }
                                    .dark-quill .ql-picker {
                                        color: #94a3b8 !important;
                                    }
                                    
                                    /* Active & Hover States - Dark Mode */
                                    .dark-quill .ql-active .ql-stroke,
                                    .dark-quill button:hover .ql-stroke {
                                        stroke: #f97316 !important;
                                    }
                                    .dark-quill .ql-active .ql-fill,
                                    .dark-quill button:hover .ql-fill {
                                        fill: #f97316 !important;
                                    }
                                    .dark-quill .ql-active.ql-picker,
                                    .dark-quill .ql-picker-label:hover {
                                        color: #f97316 !important;
                                    }
                                    .dark-quill button.ql-active {
                                        background: rgba(249, 115, 22, 0.1) !important;
                                        border-radius: 6px !important;
                                        box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.2) !important;
                                    }

                                    /* Active & Hover States - Light Mode */
                                    .ql-toolbar button:hover .ql-stroke,
                                    .ql-toolbar button.ql-active .ql-stroke {
                                        stroke: #ea580c !important;
                                    }
                                    .ql-toolbar button:hover .ql-fill,
                                    .ql-toolbar button.ql-active .ql-fill {
                                        fill: #ea580c !important;
                                    }
                                    .ql-toolbar .ql-picker-label:hover,
                                    .ql-toolbar .ql-picker.ql-active {
                                        color: #ea580c !important;
                                    }
                                    .ql-toolbar button.ql-active {
                                        background: rgba(234, 88, 12, 0.08) !important;
                                        border-radius: 6px !important;
                                        box-shadow: 0 0 0 1px rgba(234, 88, 12, 0.15) !important;
                                    }

                                    /* Picker Dropdown Styling (Dark Mode) */
                                    .dark-quill .ql-picker-options {
                                        background-color: #1A1F2B !important;
                                        border-color: rgba(255,255,255,0.1) !important;
                                        border-radius: 0.75rem !important;
                                        padding: 0.5rem !important;
                                        z-index: 100 !important;
                                    }
                                    .dark-quill .ql-picker-item:hover {
                                        color: #f97316 !important;
                                        background-color: rgba(255,255,255,0.05) !important;
                                    }
                                    .dark-quill .ql-picker-item.ql-selected {
                                        color: #f97316 !important;
                                    }

                                    .ql-toolbar {
                                        border-top-left-radius: 0.75rem;
                                        border-top-right-radius: 0.75rem;
                                    }
                                    .ql-container {
                                        border-bottom-left-radius: 0.75rem !important;
                                        border-bottom-right-radius: 0.75rem !important;
                                        font-family: inherit !important;
                                        min-height: 200px;
                                    }
                                    .ql-editor {
                                        font-size: 0.875rem;
                                        line-height: 1.6;
                                    }
                                    .ql-editor h1 { font-size: 2em !important; font-weight: 800 !important; margin-bottom: 0.5em !important; }
                                    .ql-editor h2 { font-size: 1.5em !important; font-weight: 700 !important; margin-bottom: 0.4em !important; }
                                    .ql-editor h3 { font-size: 1.25em !important; font-weight: 600 !important; margin-bottom: 0.3em !important; }
                                    
                                    .ql-editor img {
                                        cursor: grab;
                                        transition: box-shadow 0.2s, transform 0.2s;
                                    }
                                    .ql-editor img:active {
                                        cursor: grabbing;
                                    }
                                    .ql-editor img:hover {
                                        box-shadow: 0 0 0 2px #f97316;
                                    }

                                    /* Fixed Position & Alignment for Images */
                                    .ql-editor .ql-video { position: relative; }
                                    .ql-editor img.ql-align-center { display: block; margin-left: auto; margin-right: auto; }
                                    .ql-editor img.ql-align-right { display: block; margin-left: auto; }
                                    
                                    /* Vertical Inversion & Alignment */
                                    .img-flip-v { transform: scaleY(-1); }
                                    .img-align-top { vertical-align: top; }
                                    .img-align-middle { vertical-align: middle; }
                                    .img-align-bottom { vertical-align: bottom; }

                                    /* Styling for Image Resize Tooltip & Handles */
                                    .ql-image-resizer { border: 1px dashed #f97316 !important; }
                                    .ql-image-resizer .handle { 
                                        background-color: white !important; 
                                        border: 1px solid #f97316 !important;
                                        width: 10px !important;
                                        height: 10px !important;
                                    }
                                    .ql-image-toolbar {
                                        background-color: #1A1F2B !important;
                                        border: 1px solid rgba(255,255,255,0.1) !important;
                                        border-radius: 8px !important;
                                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;
                                        padding: 4px !important;
                                        display: flex !important;
                                        gap: 2px !important;
                                    }
                                    .ql-image-toolbar button {
                                        border: none !important;
                                        background: transparent !important;
                                        padding: 8px !important;
                                        cursor: pointer !important;
                                        border-radius: 4px !important;
                                        display: flex !important;
                                        align-items: center !important;
                                        justify-content: center !important;
                                    }
                                    .ql-image-toolbar button:hover {
                                        background: rgba(249, 115, 22, 0.1) !important;
                                    }
                                    .ql-image-toolbar svg rect, .ql-image-toolbar svg line, .ql-image-toolbar svg path {
                                        stroke: #94a3b8 !important;
                                    }
                                    .ql-image-toolbar button:hover svg rect, .ql-image-toolbar button:hover svg line, .ql-image-toolbar button:hover svg path {
                                        stroke: #f97316 !important;
                                    }

                                    .ql-editor.ql-blank::before {
                                        color: rgba(148, 163, 184, 0.5) !important;
                                        font-style: italic;
                                    }
                                `}</style>

                                {showMathTools && (
                                    <div className={`mt-4 p-5 rounded-xl border animate-in slide-in-from-top-2 duration-300 ${isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 font-bold">Scientific Formula Editor</span>
                                            <button type="button" onClick={() => setShowMathTools(false)} className="opacity-40 hover:opacity-100 transition-opacity"><X size={14} /></button>
                                        </div>

                                        <div className="flex items-center gap-3 mb-4">
                                            <label className="text-xs font-bold opacity-60 whitespace-nowrap">Enter formula:</label>
                                            <input
                                                autoFocus
                                                value={formulaValue}
                                                onChange={(e) => setFormulaValue(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && insertFormula()}
                                                placeholder="\sqrt{x}..."
                                                className={`flex-1 px-4 py-2.5 rounded-xl border font-mono text-sm outline-none transition-all ${isDarkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={insertFormula}
                                                className="px-6 py-2.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-lg shadow-green-900/10"
                                            >
                                                Save
                                            </button>
                                        </div>

                                        {/* Real-time Visual Preview */}
                                        <div className="mb-4 space-y-2">
                                            <label className="text-[9px] font-bold opacity-30 uppercase tracking-[0.2em] ml-1">Live Visual Preview</label>
                                            <MathPreview tex={formulaValue} isDarkMode={isDarkMode} />
                                        </div>

                                        <div className="grid grid-cols-5 md:grid-cols-9 gap-1.5">
                                            {mathSymbols.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setFormulaValue(prev => prev + s.tex)}
                                                    className={`p-2 rounded-lg border text-[10px] font-medium transition-all hover:scale-105 ${isDarkMode ? 'bg-white/5 border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10' : 'bg-white border-slate-200 hover:border-orange-500/50 hover:bg-orange-50'}`}
                                                >
                                                    <div className="flex items-center justify-center italic font-serif opacity-80">{s.label}</div>
                                                </button>
                                            ))}
                                        </div>

                                        {pastFormulas.length > 0 && (
                                            <div className="mt-4 pt-3 border-t border-inherit">
                                                <div className="text-[9px] font-bold opacity-30 uppercase tracking-[0.2em] mb-2">Past Formulas</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {pastFormulas.map((f, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => setFormulaValue(f)}
                                                            className={`px-2 py-1 rounded text-[9px] font-mono opacity-60 hover:opacity-100 transition-opacity ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-200 text-slate-700'}`}
                                                        >
                                                            {f}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-center pt-8">
                            <button
                                type="submit"
                                disabled={isActionLoading}
                                className="px-10 py-4 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-xl font-bold text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isActionLoading ? <Loader2 className="animate-spin" /> : <>{modalMode === 'create' ? 'Add Test' : 'Update Test'}</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const renderFormulaModal = () => {
        if (!isFormulaModalOpen) return null;
        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsFormulaModalOpen(false)} />
                <div className={`relative w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 ${isDarkMode ? 'bg-[#10141D] border border-white/10' : 'bg-white border border-slate-200'}`}>
                    <div className="p-6 border-b border-inherit flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Sigma className="text-orange-500" size={20} />
                            Math Formula Editor
                        </h3>
                        <button onClick={() => setIsFormulaModalOpen(false)} className="opacity-50 hover:opacity-100 transition-opacity">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Enter Formula (LaTeX)</label>
                            <div className="flex gap-2">
                                <input
                                    autoFocus
                                    value={formulaValue}
                                    onChange={(e) => setFormulaValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && insertFormula()}
                                    placeholder="e.g. \sqrt{x^2 + y^2}"
                                    className={`flex-1 px-4 py-3 rounded-xl border font-mono text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                />
                                <button
                                    onClick={insertFormula}
                                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-600/20 active:scale-95"
                                >
                                    Insert
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Math Symbols</label>
                            <div className="grid grid-cols-5 gap-2">
                                {mathSymbols.map((s, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setFormulaValue(prev => prev + s.tex)}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 hover:border-orange-500/50 hover:bg-orange-500/5' : 'bg-white border-slate-200 hover:border-orange-500/50 hover:bg-orange-50/50'}`}
                                    >
                                        <div className="h-6 flex items-center justify-center italic font-serif opacity-80">{s.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {pastFormulas.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Past Formulas</label>
                                <div className="flex flex-wrap gap-2">
                                    {pastFormulas.map((f, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setFormulaValue(f)}
                                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono transition-all ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-orange-500/5 text-[10px] text-center opacity-40 font-bold uppercase tracking-widest">
                        Tip: You can also type LaTeX directly in the box
                    </div>
                </div>
            </div>
        );
    };

    if (activeView === 'section-management' && managementTest) {
        return (
            <SectionManagement
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
