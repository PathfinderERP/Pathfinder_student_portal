import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
    Calendar, Layers, GraduationCap, Plus, Search, Target,
    Edit2, Trash2, Filter, Loader2, Database, X, Check, ChevronDown, Clock
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const subTabs = [
    { id: 'Session', icon: Calendar, label: 'Session', endpoint: 'sessions' },
    { id: 'Class', icon: GraduationCap, label: 'Class', endpoint: 'classes' },
    { id: 'Target Exam', icon: Target, label: 'Target Exam', endpoint: 'target-exams' },
    { id: 'Exam Type', icon: Layers, label: 'Exam Type', endpoint: 'exam-types' },
    { id: 'Exam Details', icon: Database, label: 'Exam Details', endpoint: 'exam-details' }
];

const MasterDataManagement = ({ activeSubTab, setActiveSubTab }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState(null);

    // Filter State
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Exam Details Specific Filters
    const [sessionFilter, setSessionFilter] = useState('all');
    const [examTypeFilter, setExamTypeFilter] = useState('all');
    const [classFilter, setClassFilter] = useState('all');
    const [targetFilter, setTargetFilter] = useState('all');
    const [isSessionFilterOpen, setIsSessionFilterOpen] = useState(false);
    const [isExamTypeFilterOpen, setIsExamTypeFilterOpen] = useState(false);
    const [isClassFilterOpen, setIsClassFilterOpen] = useState(false);
    const [isTargetFilterOpen, setIsTargetFilterOpen] = useState(false);

    const [sessions, setSessions] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [classes, setClasses] = useState([]);
    const [targetExams, setTargetExams] = useState([]);

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

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [selectedItem, setSelectedItem] = useState(null);
    const [formValues, setFormValues] = useState({
        name: '',
        code: '',
        description: '',
        session: '',
        exam_type: '',
        class_level: '',
        duration: 180,
        total_marks: 0,
        is_active: true
    });

    const filteredExamTypes = useMemo(() => {
        if (!formValues.target_exam) return [];
        return examTypes.filter(et => String(et.target_exam) === String(formValues.target_exam));
    }, [examTypes, formValues.target_exam]);



    const currentTabConfig = useMemo(() => subTabs.find(t => t.id === activeSubTab), [activeSubTab]);

    const getAuthConfig = useCallback(() => {
        const activeToken = token || localStorage.getItem('auth_token');
        if (!activeToken) return null;
        return { headers: { 'Authorization': `Bearer ${activeToken}` } };
    }, [token]);

    const fetchData = useCallback(async () => {
        if (!currentTabConfig) return;

        const config = getAuthConfig();
        if (!config) return; // Wait for token

        setIsLoading(true);
        setError(null);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/`, config);
            setData(response.data);

            if (activeSubTab === 'Exam Details' || activeSubTab === 'Exam Type') {
                const [sessRes, typeRes, classRes, targetRes] = await Promise.all([
                    axios.get(`${apiUrl}/api/master-data/sessions/`, config),
                    axios.get(`${apiUrl}/api/master-data/exam-types/`, config),
                    axios.get(`${apiUrl}/api/master-data/classes/`, config),
                    axios.get(`${apiUrl}/api/master-data/target-exams/`, config)
                ]);
                setSessions(sessRes.data);
                setExamTypes(typeRes.data);
                setClasses(classRes.data);
                setTargetExams(targetRes.data);
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
        }
    }, [currentTabConfig, getApiUrl, getAuthConfig, activeSubTab]);

    useEffect(() => {
        setSearchTerm('');
        setStatusFilter('all');
        setSessionFilter('all');
        setExamTypeFilter('all');
        setClassFilter('all');
        setTargetFilter('all');
        fetchData();
    }, [fetchData]);

    const handleCreate = () => {
        setModalMode('create');
        setSelectedItem(null);
        setFormValues({
            name: '',
            code: '',
            target_exam: '',
            description: '',
            session: sessions[0]?.id || '',
            exam_type: '', // Clear this to force target exam selection
            class_level: classes[0]?.id || '',
            duration: 180,
            total_marks: 0,
            is_active: true
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setModalMode('edit');
        setSelectedItem(item);
        if (activeSubTab === 'Exam Details') {
            setFormValues({
                name: item.name || '',
                code: item.code || '',
                session: item.session,
                target_exam: item.target_exam || '',
                exam_type: item.exam_type,
                class_level: item.class_level,
                duration: item.duration,
                total_marks: item.total_marks || 0,
                is_active: item.is_active
            });
        } else {
            setFormValues({
                name: item.name,
                code: item.code,
                target_exam: item.target_exam || '',
                description: item.description || '',
                is_active: item.is_active
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/${id}/`, getAuthConfig());
            fetchData();
        } catch (err) {
            alert('Failed to delete item');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleStatus = async (item) => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/${item.id}/`,
                { is_active: !item.is_active },
                getAuthConfig()
            );
            fetchData();
        } catch (err) {
            alert('Failed to toggle status');
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
                await axios.post(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/`, formValues, getAuthConfig());
            } else {
                await axios.patch(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/${selectedItem.id}/`, formValues, getAuthConfig());
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            alert(`Failed to ${modalMode} item: ` + (err.response?.data?.code || err.message));
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredData = data.filter(item => {
        if (activeSubTab === 'Exam Details') {
            const matchesSearch = item.session_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.exam_type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.class_level_name?.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesStatus = true;
            if (statusFilter === 'active') matchesStatus = item.is_active === true;
            if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

            const matchesSession = sessionFilter === 'all' || String(item.session) === String(sessionFilter);
            const matchesExamType = examTypeFilter === 'all' || String(item.exam_type) === String(examTypeFilter);
            const matchesClass = classFilter === 'all' || String(item.class_level) === String(classFilter);
            const matchesTarget = targetFilter === 'all' || String(item.target_exam) === String(targetFilter);

            return matchesSearch && matchesStatus && matchesSession && matchesExamType && matchesClass && matchesTarget;
        }

        const matchesSearch = (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (item.code?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        let matchesStatus = true;
        if (statusFilter === 'active') matchesStatus = item.is_active === true;
        if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

        return matchesSearch && matchesStatus;
    });

    const renderHeader = () => (
        <div className={`p-8 rounded-[2.5rem] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                        Master <span className="text-orange-500">Data</span>
                    </h2>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Configure system-wide parameters and categories.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 p-1.5 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                        {subTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeSubTab === tab.id
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                                    : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-white'
                                    }`}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderContent = () => (
        <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex flex-col xl:flex-row justify-between items-center gap-3 mb-8">
                <div className="relative w-full xl:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={`Search ${activeSubTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                            }`}
                    />
                </div>

                <div className="flex items-center gap-2 w-full xl:w-auto">
                    {activeSubTab === 'Exam Details' && (
                        <>
                            {/* Session Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsSessionFilterOpen(!isSessionFilterOpen)}
                                    className={`pl-3 pr-7 py-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${sessionFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    {sessionLabel}
                                    <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isSessionFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isSessionFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[60]" onClick={() => setIsSessionFilterOpen(false)} />
                                        <div className={`absolute left-0 top-full mt-2 w-48 z-[70] p-2 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <button
                                                onClick={() => { setSessionFilter('all'); setIsSessionFilterOpen(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sessionFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                All Sessions {sessionFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                            </button>
                                            {sessions.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => { setSessionFilter(s.id); setIsSessionFilterOpen(false); }}
                                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${String(sessionFilter) === String(s.id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {s.name} {String(sessionFilter) === String(s.id) && <Check size={14} strokeWidth={3} />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Class Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsClassFilterOpen(!isClassFilterOpen)}
                                    className={`pl-3 pr-7 py-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${classFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    {classLabel}
                                    <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isClassFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isClassFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[60]" onClick={() => setIsClassFilterOpen(false)} />
                                        <div className={`absolute left-0 top-full mt-2 w-48 z-[70] p-2 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <button
                                                onClick={() => { setClassFilter('all'); setIsClassFilterOpen(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${classFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                All Classes {classFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                            </button>
                                            {classes.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => { setClassFilter(c.id); setIsClassFilterOpen(false); }}
                                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${String(classFilter) === String(c.id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {c.name} {String(classFilter) === String(c.id) && <Check size={14} strokeWidth={3} />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Target Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsTargetFilterOpen(!isTargetFilterOpen)}
                                    className={`pl-3 pr-7 py-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${targetFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    {targetFilterLabel}
                                    <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isTargetFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isTargetFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[60]" onClick={() => setIsTargetFilterOpen(false)} />
                                        <div className={`absolute left-0 top-full mt-2 w-48 z-[70] p-2 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <button
                                                onClick={() => { setTargetFilter('all'); setIsTargetFilterOpen(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                All Targets {targetFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                            </button>
                                            {targetExams.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => { setTargetFilter(t.id); setIsTargetFilterOpen(false); }}
                                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${String(targetFilter) === String(t.id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {t.name} {String(targetFilter) === String(t.id) && <Check size={14} strokeWidth={3} />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Exam Type Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsExamTypeFilterOpen(!isExamTypeFilterOpen)}
                                    className={`pl-3 pr-7 py-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${examTypeFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    {examTypeLabel}
                                    <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isExamTypeFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isExamTypeFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[60]" onClick={() => setIsExamTypeFilterOpen(false)} />
                                        <div className={`absolute left-0 top-full mt-2 w-48 z-[70] p-2 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <button
                                                onClick={() => { setExamTypeFilter('all'); setIsExamTypeFilterOpen(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${examTypeFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                All Types {examTypeFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                            </button>
                                            {examTypes.map(et => (
                                                <button
                                                    key={et.id}
                                                    onClick={() => { setExamTypeFilter(et.id); setIsExamTypeFilterOpen(false); }}
                                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${String(examTypeFilter) === String(et.id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {et.name} {String(examTypeFilter) === String(et.id) && <Check size={14} strokeWidth={3} />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                    {/* Filter Button & Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${statusFilter !== 'all'
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
                                <div className="fixed inset-0 z-[60]" onClick={() => setIsFilterOpen(false)} />
                                <div className={`absolute right-0 top-full mt-3 w-56 z-[70] p-2 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'
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
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${statusFilter === opt.id
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
                        onClick={handleCreate}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-600/30 active:scale-95"
                    >
                        <Plus size={16} strokeWidth={3} />
                        Add New {activeSubTab}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                {isLoading ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                        <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em]">Synchronizing Master Data...</p>
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
                                {activeSubTab === 'Exam Details' ? (
                                    <>
                                        <th className="pb-4 px-4 font-black">Exam Title</th>
                                        <th className="pb-4 px-4 font-black">Code</th>
                                        <th className="pb-4 px-4 font-black">Session</th>
                                        <th className="pb-4 px-4 font-black text-center">Class</th>
                                        <th className="pb-4 px-4 font-black">Target</th>
                                        <th className="pb-4 px-4 font-black">Exam Type</th>
                                        <th className="pb-4 px-4 font-black text-center">Marks</th>
                                        <th className="pb-4 px-4 font-black text-center">Duration</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="pb-4 px-4 font-black">Name / Title</th>
                                        {activeSubTab === 'Exam Type' && <th className="pb-4 px-4 font-black">Target</th>}
                                        <th className="pb-4 px-4 font-black">Code</th>
                                    </>
                                )}
                                <th className="pb-4 px-4 font-black text-center">Status</th>
                                <th className="pb-4 px-4 text-right font-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {filteredData.length > 0 ? filteredData.map((item) => (
                                <tr key={item.id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-200/50'} transition-colors`}>
                                    {activeSubTab === 'Exam Details' ? (
                                        <>
                                            <td className="py-5 px-4">
                                                <span className="font-extrabold text-sm">{item.name}</span>
                                            </td>
                                            <td className="py-5 px-4 text-xs font-bold opacity-70">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                    {item.code}
                                                </span>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="flex flex-col">
                                                    <span className="font-extrabold text-xs">{item.session_name}</span>
                                                    <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider">Academic Year</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <span className="font-bold text-sm tracking-tight">{item.class_level_name}</span>
                                            </td>
                                            <td className="py-5 px-4">
                                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                    {item.target_exam_name || '-'}
                                                </span>
                                            </td>
                                            <td className="py-5 px-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
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
                                    ) : (
                                        <>
                                            <td className="py-5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-orange-900/10 text-orange-500 border-white/5' : 'bg-orange-50 text-orange-600 border-orange-100'
                                                        }`}>
                                                        {activeSubTab.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-sm">{item.name}</span>
                                                </div>
                                            </td>
                                            {activeSubTab === 'Exam Type' && (
                                                <td className="py-5 px-4">
                                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                        {item.target_exam_name || '-'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="py-5 px-4 text-sm font-bold opacity-70">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {item.code}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                    <td className="py-5 px-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleToggleStatus(item)}
                                                disabled={isActionLoading}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border transition-all hover:scale-105 active:scale-95 ${item.is_active
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                    }`}
                                            >
                                                <div className={`w-1 h-1 rounded-full ${item.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                                {item.is_active ? 'Active' : 'Inactive'}
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
                                                disabled={isActionLoading}
                                                className={`p-2 rounded-xl transition-all hover:scale-110 ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white'}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={activeSubTab === 'Exam Details' ? 8 : (activeSubTab === 'Exam Type' ? 5 : 4)} className="py-24 text-center">
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
        </div>
    );

    const renderModal = () => {
        if (!isModalOpen) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isActionLoading && setIsModalOpen(false)} />
                <div className={`relative w-full max-w-2xl rounded-[2.5rem] border shadow-2xl animate-in zoom-in duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200'}`}>
                    <form onSubmit={handleSubmit} className="p-7 space-y-5">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">
                                    {modalMode === 'create' ? 'Add New' : 'Edit'} <span className="text-orange-500">{activeSubTab}</span>
                                </h2>
                                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">Configuration parameters</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className={`p-2 rounded-xl transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-900 border border-slate-200'}`}>
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {activeSubTab === 'Exam Details' ? (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Title</label>
                                        <input
                                            required
                                            placeholder="e.g. JEE Main Mock"
                                            value={formValues.name}
                                            onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Code</label>
                                        <input
                                            required
                                            placeholder="e.g. JEE_01"
                                            value={formValues.code}
                                            onChange={e => setFormValues({ ...formValues, code: e.target.value })}
                                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Session</label>
                                        <select
                                            value={formValues.session}
                                            onChange={e => setFormValues({ ...formValues, session: e.target.value })}
                                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        >
                                            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                        <select
                                            value={formValues.class_level}
                                            onChange={e => setFormValues({ ...formValues, class_level: e.target.value })}
                                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        >
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Target Exam</label>
                                        <select
                                            value={formValues.target_exam}
                                            onChange={e => setFormValues({ ...formValues, target_exam: e.target.value, exam_type: '' })}
                                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        >
                                            <option value="">Select Target</option>
                                            {targetExams.map(te => <option key={te.id} value={te.id}>{te.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Type</label>
                                        <select
                                            disabled={!formValues.target_exam}
                                            value={formValues.exam_type}
                                            onChange={e => setFormValues({ ...formValues, exam_type: e.target.value })}
                                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none appearance-none transition-all ${!formValues.target_exam ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        >
                                            <option value="">Select Type</option>
                                            {filteredExamTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Duration (Mins)</label>
                                        <input
                                            type="number"
                                            value={formValues.duration}
                                            onChange={e => setFormValues({ ...formValues, duration: e.target.value })}
                                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Total Marks</label>
                                        <input
                                            type="number"
                                            value={formValues.total_marks}
                                            onChange={e => setFormValues({ ...formValues, total_marks: e.target.value })}
                                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
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
                                            onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                            placeholder="e.g. JEE Mock"
                                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>

                                    <div className="space-y-1.5 text-right">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Unique Code</label>
                                            <span className="text-[9px] font-bold text-orange-500 uppercase opacity-60 italic">Auto-generated</span>
                                        </div>
                                        <input
                                            disabled
                                            type="text"
                                            value={formValues.code}
                                            placeholder="SYSTEM_GEN"
                                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none opacity-50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>

                                    {activeSubTab === 'Exam Type' && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Target Exam (e.g. JEE, NEET)</label>
                                            <select
                                                value={formValues.target_exam}
                                                onChange={e => setFormValues({ ...formValues, target_exam: e.target.value })}
                                                className={`w-full p-3 rounded-xl border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                            >
                                                <option value="">Select Target Exam</option>
                                                {targetExams.map(te => (
                                                    <option key={te.id} value={te.id}>{te.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className={`${activeSubTab === 'Exam Type' ? '' : 'col-span-2'} space-y-1.5`}>
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Description</label>
                                        <textarea
                                            rows="1"
                                            value={formValues.description}
                                            onChange={e => setFormValues({ ...formValues, description: e.target.value })}
                                            placeholder="Optional details..."
                                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none transition-all resize-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormValues({ ...formValues, is_active: !formValues.is_active })}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-black text-[10px] uppercase tracking-widest ${formValues.is_active
                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                                        : isDarkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${formValues.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                    {formValues.is_active ? 'Active' : 'Inactive'}
                                </button>
                            </div>
                        </div>

                        <button
                            disabled={isActionLoading}
                            type="submit"
                            className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            {isActionLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>SAVE CONFIGURATION <Check size={14} strokeWidth={3} /></>
                            )}
                        </button>
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

export default MasterDataManagement;
