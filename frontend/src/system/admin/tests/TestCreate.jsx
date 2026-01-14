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

const TestCreate = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
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
    const [modalMode, setModalMode] = useState('create');
    const [selectedItem, setSelectedItem] = useState(null);
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
                                                className={`transition-all hover:scale-110 active:scale-95 ${item.is_completed ? 'text-emerald-500' : 'text-slate-400'}`}
                                            >
                                                {item.is_completed ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex justify-center">
                                            <button className={`px-4 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all hover:bg-orange-500 hover:text-white hover:border-orange-500 ${isDarkMode ? 'border-white/10 text-white' : 'border-slate-200 text-slate-600'}`}>
                                                QuestionPaper
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex justify-center">
                                            <button className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-blue-700 shadow-lg shadow-blue-600/30">
                                                Manage
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex justify-center">
                                            <button className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-emerald-700 shadow-lg shadow-emerald-600/30">
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

    const filteredExamTypes = useMemo(() => {
        if (!formValues.target_exam) return [];
        return examTypes.filter(et => String(et.target_exam) === String(formValues.target_exam));
    }, [examTypes, formValues.target_exam]);

    const availableTitles = useMemo(() => {
        if (!formValues.session || !formValues.target_exam || !formValues.exam_type || !formValues.class_level) {
            return [];
        }
        return examDetails.filter(d =>
            String(d.session) === String(formValues.session) &&
            String(d.class_level) === String(formValues.class_level) &&
            String(d.target_exam) === String(formValues.target_exam) &&
            String(d.exam_type) === String(formValues.exam_type)
        ).map(d => d.name);
    }, [formValues.session, formValues.class_level, formValues.target_exam, formValues.exam_type, examDetails]);

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
                                        readOnly
                                        required
                                        placeholder="Exam Code *"
                                        value={formValues.code}
                                        className={`w-full px-5 py-4 rounded-xl border font-semibold text-sm outline-none transition-all placeholder:text-slate-500 opacity-60 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
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

                            {/* Relational Selects */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Session</label>
                                    <select
                                        value={formValues.session}
                                        onChange={e => setFormValues({ ...formValues, session: e.target.value, name: '', code: '' })}
                                        className={`w-full px-4 py-3 rounded-xl border font-bold text-[10px] uppercase outline-none appearance-none ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200'}`}
                                    >
                                        <option value="">Select Session</option>
                                        {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                    <select
                                        value={formValues.class_level}
                                        onChange={e => setFormValues({ ...formValues, class_level: e.target.value, name: '', code: '' })}
                                        className={`w-full px-4 py-3 rounded-xl border font-bold text-[10px] uppercase outline-none appearance-none ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200'}`}
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Target Exam</label>
                                    <select
                                        value={formValues.target_exam}
                                        onChange={e => setFormValues({ ...formValues, target_exam: e.target.value, exam_type: '', name: '', code: '' })}
                                        className={`w-full px-4 py-3 rounded-xl border font-bold text-[10px] uppercase outline-none appearance-none ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200'}`}
                                    >
                                        <option value="">Select Target</option>
                                        {targetExams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Type</label>
                                    <select
                                        disabled={!formValues.target_exam}
                                        value={formValues.exam_type}
                                        onChange={e => setFormValues({ ...formValues, exam_type: e.target.value, name: '', code: '' })}
                                        className={`w-full px-4 py-3 rounded-xl border font-bold text-[10px] uppercase outline-none appearance-none ${!formValues.target_exam ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200'}`}
                                    >
                                        <option value="">Select Type</option>
                                        {filteredExamTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold opacity-60">Instructions</label>
                                <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                    <div className="p-3 border-b border-inherit flex flex-wrap gap-2 items-center opacity-60">
                                        <Bold size={16} /> <Italic size={16} /> <Underline size={16} /> <Type size={16} />
                                        <div className="w-px h-4 bg-slate-300 mx-1" />
                                        <Quote size={16} /> <Code size={16} />
                                        <div className="w-px h-4 bg-slate-300 mx-1" />
                                        <List size={16} /> <List size={16} />
                                        <div className="w-px h-4 bg-slate-300 mx-1" />
                                        <Superscript size={16} /> <Subscript size={16} />
                                        <div className="w-px h-4 bg-slate-300 mx-1" />
                                        <span className="text-[11px] font-bold">Normal</span>
                                        <div className="w-px h-4 bg-slate-300 mx-1" />
                                        <AlignLeft size={16} /> <AlignCenter size={16} />
                                        <div className="w-px h-4 bg-slate-300 mx-1" />
                                        <Link size={16} /> <Image size={16} /> <Sigma size={16} />
                                    </div>
                                    <textarea
                                        rows="4"
                                        placeholder="Write something..."
                                        value={formValues.instructions}
                                        onChange={e => setFormValues({ ...formValues, instructions: e.target.value })}
                                        className="w-full p-5 bg-transparent outline-none font-medium text-sm resize-none italic"
                                    />
                                </div>
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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderHeader()}
            {renderContent()}
            {renderModal()}
        </div>
    );
};

export default TestCreate;
