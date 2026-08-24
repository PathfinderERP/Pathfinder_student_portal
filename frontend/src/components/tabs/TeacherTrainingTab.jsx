import React, { useState, useEffect } from 'react';
import {
    GraduationCap, BookOpen, CheckCircle2, Clock, Plus, Search,
    Filter, AlertCircle, Award, Trash2, Loader2, RefreshCw,
    UserCheck, LayoutGrid, List, ChevronLeft, ChevronRight,
    ArrowRight, Calendar, User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const TeacherTrainingTab = ({ isAdminView = false, filterTeacherName = '', filterTeacherEmail = '' }) => {
    const { isDarkMode } = useTheme();
    const { user, getApiUrl, token } = useAuth();
    const [trainings, setTrainings] = useState([]);
    const [teachersList, setTeachersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // View Mode & Pagination states
    const [viewMode, setViewMode] = useState('card'); // 'card' | 'row'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [jumpPageInput, setJumpPageInput] = useState('');

    // Compute the logged-in user's display name as default trainer
    const getLoggedInUserName = () => {
        if (!user) return '';
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        return fullName || user.name || user.username || '';
    };

    const defaultTrainer = getLoggedInUserName();

    const [formData, setFormData] = useState({
        teacher_name: filterTeacherName || '',
        training_topic: '',
        trainer: defaultTrainer,
        training_date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        remarks: ''
    });

    useEffect(() => {
        if (filterTeacherName) {
            setFormData(prev => ({ ...prev, teacher_name: filterTeacherName }));
        }
    }, [filterTeacherName]);

    // Update default trainer when user info becomes available
    useEffect(() => {
        if (defaultTrainer && !formData.trainer) {
            setFormData(prev => ({ ...prev, trainer: defaultTrainer }));
        }
    }, [defaultTrainer]);

    const fetchTeachers = async () => {
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/admin/erp-teachers/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
            setTeachersList(data);
        } catch (err) {
            console.error("Error fetching teachers list for suggestions:", err);
        }
    };

    const fetchTrainings = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/teacher-training/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data && Array.isArray(res.data.data)) {
                setTrainings(res.data.data);
            } else {
                setTrainings([]);
            }
        } catch (err) {
            console.error("Teacher training fetch error:", err);
            setTrainings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrainings();
        fetchTeachers();
    }, []);

    const openScheduleModal = () => {
        setFormData({
            teacher_name: filterTeacherName || '',
            training_topic: '',
            trainer: getLoggedInUserName(),
            training_date: new Date().toISOString().split('T')[0],
            status: 'Pending',
            remarks: ''
        });
        setIsAddModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const apiUrl = getApiUrl();
            const payload = {
                ...formData,
                trainer: formData.trainer || getLoggedInUserName(),
                completion_date: formData.status === 'Completed' ? new Date().toISOString().split('T')[0] : 'Pending'
            };
            const res = await axios.post(`${apiUrl}/api/teacher-training/`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setTrainings(prev => [res.data.data, ...prev]);
            } else {
                fetchTrainings();
            }
            setIsAddModalOpen(false);
            setCurrentPage(1);
            setFormData({
                teacher_name: filterTeacherName || '',
                training_topic: '',
                trainer: getLoggedInUserName(),
                training_date: new Date().toISOString().split('T')[0],
                status: 'Pending',
                remarks: ''
            });
        } catch (err) {
            console.error("Failed to schedule training:", err);
            alert("Failed to schedule training. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (id, newStatus) => {
        const completionDate = newStatus === 'Completed' ? new Date().toISOString().split('T')[0] : 'Pending';
        // Optimistic update
        setTrainings(prev => prev.map(t => {
            if (t.id === id) {
                return {
                    ...t,
                    status: newStatus,
                    completion_date: completionDate
                };
            }
            return t;
        }));

        try {
            const apiUrl = getApiUrl();
            await axios.put(`${apiUrl}/api/teacher-training/`, {
                id: id,
                status: newStatus,
                completion_date: completionDate
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
        } catch (err) {
            console.error("Failed to update status on server:", err);
            fetchTrainings();
        }
    };

    const handleDeleteTraining = async (id, teacherName) => {
        if (!window.confirm(`Are you sure you want to remove the training record for "${teacherName || 'this teacher'}"?`)) return;
        setTrainings(prev => prev.filter(t => t.id !== id));
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/teacher-training/?id=${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
        } catch (err) {
            console.error("Failed to delete training record:", err);
            fetchTrainings();
        }
    };

    const filteredTrainings = trainings.filter(t => {
        if (filterTeacherName || filterTeacherEmail) {
            const tName = (t.teacher_name || '').toLowerCase().trim();
            const trName = (t.trainer || '').toLowerCase().trim();
            const fName = (filterTeacherName || '').toLowerCase().trim();
            const fEmail = (filterTeacherEmail || '').toLowerCase().trim();
            
            const matchName = fName && (
                tName.includes(fName) || fName.includes(tName) || 
                trName.includes(fName) || fName.includes(trName)
            );
            const matchEmail = fEmail && (
                tName.includes(fEmail) || fEmail.includes(tName) || 
                trName.includes(fEmail) || fEmail.includes(trName)
            );
            
            if (!matchName && !matchEmail) return false;
        }
        const teacherName = (t.teacher_name || '').toLowerCase();
        const trainingTopic = (t.training_topic || '').toLowerCase();
        const trainer = (t.trainer || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        const matchesSearch = teacherName.includes(query) || trainingTopic.includes(query) || trainer.includes(query);
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const teacherScopeTrainings = (filterTeacherName || filterTeacherEmail)
        ? trainings.filter(t => {
            const tName = (t.teacher_name || '').toLowerCase().trim();
            const trName = (t.trainer || '').toLowerCase().trim();
            const fName = (filterTeacherName || '').toLowerCase().trim();
            const fEmail = (filterTeacherEmail || '').toLowerCase().trim();
            
            const matchName = fName && (
                tName.includes(fName) || fName.includes(tName) || 
                trName.includes(fName) || fName.includes(trName)
            );
            const matchEmail = fEmail && (
                tName.includes(fEmail) || fEmail.includes(tName) || 
                trName.includes(fEmail) || fEmail.includes(trName)
            );
            return matchName || matchEmail;
        })
        : trainings;

    const completedCount = teacherScopeTrainings.filter(t => t.status === 'Completed').length;
    const inProgressCount = teacherScopeTrainings.filter(t => t.status === 'In Progress').length;
    const pendingCount = teacherScopeTrainings.filter(t => t.status === 'Pending').length;

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredTrainings.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    const paginatedTrainings = filteredTrainings.slice(startIndex, startIndex + itemsPerPage);

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const pageNum = parseInt(jumpPageInput, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
            setJumpPageInput('');
        } else {
            alert(`Please enter a valid page number between 1 and ${totalPages}`);
        }
    };

    // Helper for pagination page numbers with smart ellipsis
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (safeCurrentPage <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (safeCurrentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(safeCurrentPage - 1);
                pages.push(safeCurrentPage);
                pages.push(safeCurrentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="text-cyan-500" size={24} />
                            <h2 className="text-2xl font-black tracking-tight">
                                {filterTeacherName ? `Training Records — ${filterTeacherName}` : 'Training for New Teachers'}
                            </h2>
                        </div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Teacher onboarding & training module. Track training topic, trainer, scheduled dates, and status (Pending → In Progress → Completed).
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchTrainings}
                            title="Refresh"
                            className={`p-2.5 rounded-xl border transition-all ${
                                isDarkMode ? 'border-white/10 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        {!isAdminView && (
                            <button
                                onClick={openScheduleModal}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
                            >
                                <Plus size={16} />
                                <span>Schedule Teacher Training</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Completed Trainings</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{completedCount}</span>
                        <CheckCircle2 className={isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'} size={24} />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>In Progress</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{inProgressCount}</span>
                        <Clock className={isDarkMode ? 'text-cyan-400/80' : 'text-cyan-600/80'} size={24} />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pending Schedule</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{pendingCount}</span>
                        <AlertCircle className={isDarkMode ? 'text-amber-400/80' : 'text-amber-600/80'} size={24} />
                    </div>
                </div>
            </div>

            {/* Controls Bar: Search, Status Filter, View Mode Toggle */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                {/* Search input */}
                <div className="relative flex-1 min-w-[260px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search training modules by topic, trainer, or keywords..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                            isDarkMode
                                ? 'bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-500/50'
                                : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-cyan-500'
                        }`}
                    />
                </div>

                {/* Right controls: Status filter + View Mode toggle */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Status Pill Filters */}
                    <div className={`flex items-center p-1 rounded-xl border ${isDarkMode ? 'bg-slate-900/40 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                        {['All', 'Completed', 'In Progress', 'Pending'].map(st => (
                            <button
                                key={st}
                                onClick={() => {
                                    setStatusFilter(st);
                                    setCurrentPage(1);
                                }}
                                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                    statusFilter === st
                                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                        : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>

                    {/* View Mode Toggle: Card vs Row */}
                    <div className={`flex items-center p-1 rounded-xl border ${isDarkMode ? 'bg-slate-900/40 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                        <button
                            onClick={() => setViewMode('card')}
                            title="Card Grid View"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                viewMode === 'card'
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                                    : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                            }`}
                        >
                            <LayoutGrid size={14} />
                            <span>Cards</span>
                        </button>
                        <button
                            onClick={() => setViewMode('row')}
                            title="Row Table View"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                viewMode === 'row'
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                                    : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                            }`}
                        >
                            <List size={14} />
                            <span>Rows</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Section: Loading, Empty, Card View, or Row View */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-cyan-500" size={32} />
                    <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading teacher training records...</p>
                </div>
            ) : filteredTrainings.length === 0 ? (
                /* Empty State */
                <div className={`p-12 text-center rounded-2xl border ${isDarkMode ? 'bg-slate-900/30 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} space-y-3`}>
                    <GraduationCap className="mx-auto text-slate-400 opacity-60" size={48} />
                    <h3 className={`text-base font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {searchQuery || statusFilter !== 'All'
                            ? 'No matching teacher training records found'
                            : filterTeacherName
                            ? `No teacher training records found for ${filterTeacherName}`
                            : 'No teacher training records scheduled yet'}
                    </h3>
                    <p className="text-xs max-w-md mx-auto">
                        {searchQuery || statusFilter !== 'All'
                            ? 'Try clearing the search or status filter to see other records.'
                            : filterTeacherName
                            ? `There are currently no training records registered for ${filterTeacherName}.`
                            : 'Click "Schedule Teacher Training" above to register and track a new teacher training module.'}
                    </p>
                    {!isAdminView && (!searchQuery && statusFilter === 'All') && (
                        <button
                            onClick={openScheduleModal}
                            className="inline-flex items-center gap-2 px-4 py-2 mt-2 rounded-xl text-xs font-bold bg-cyan-500 text-white hover:bg-cyan-600 transition-all"
                        >
                            <Plus size={14} />
                            Schedule Training Now
                        </button>
                    )}
                </div>
            ) : viewMode === 'card' ? (
                /* Card Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedTrainings.map(t => (
                        <div
                            key={t.id}
                            className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                                isDarkMode ? 'bg-slate-900/40 border-white/10 hover:border-cyan-500/30' : 'bg-white border-slate-200 hover:border-cyan-500/50'
                            } shadow-lg relative group`}
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.teacher_name}</h3>
                                        <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Trainer: <strong className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}>{t.trainer || 'N/A'}</strong>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            t.status === 'Completed'
                                                ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                                : t.status === 'In Progress'
                                                ? (isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-100 text-cyan-700 border border-cyan-200')
                                                : (isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-100 text-amber-700 border border-amber-200')
                                        }`}>
                                            {t.status}
                                        </span>
                                        {!isAdminView && (
                                            <button
                                                onClick={() => handleDeleteTraining(t.id, t.teacher_name)}
                                                title="Delete Training Record"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className={`p-3 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className={`text-[10px] font-black uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Training Topic</span>
                                    <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{t.training_topic}</p>
                                </div>

                                {t.remarks && (
                                    <p className={`text-xs italic ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>"{t.remarks}"</p>
                                )}
                            </div>

                            <div className={`pt-3 border-t space-y-3 text-xs ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                <div className={`flex items-center justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <span>Training Date: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{t.training_date || 'N/A'}</strong></span>
                                    <span>Completed: <strong className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>{t.completion_date || 'Pending'}</strong></span>
                                </div>

                                {/* Status Section: Read-only in Admin, quick buttons in Teacher Portal */}
                                {isAdminView ? (
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Status</span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            t.status === 'Completed'
                                                ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                                : t.status === 'In Progress'
                                                ? (isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-100 text-cyan-700 border border-cyan-200')
                                                : (isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-100 text-amber-700 border border-amber-200')
                                        }`}>
                                            {t.status}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 pt-1">
                                        <button
                                            onClick={() => updateStatus(t.id, 'Pending')}
                                            className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${t.status === 'Pending' ? 'bg-amber-500 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
                                        >
                                            Pending
                                        </button>
                                        <button
                                            onClick={() => updateStatus(t.id, 'In Progress')}
                                            className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${t.status === 'In Progress' ? 'bg-cyan-500 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
                                        >
                                            In Progress
                                        </button>
                                        <button
                                            onClick={() => updateStatus(t.id, 'Completed')}
                                            className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${t.status === 'Completed' ? 'bg-emerald-500 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
                                        >
                                            Completed
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Row / Table View */
                <div className={`rounded-2xl border overflow-hidden shadow-xl ${isDarkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className={`border-b font-black uppercase tracking-wider text-[10px] ${isDarkMode ? 'bg-slate-950/40 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                    <th className="py-4 px-4 text-center w-12">#</th>
                                    <th className="py-4 px-4">Teacher (Trainee)</th>
                                    <th className="py-4 px-4">Training Topic</th>
                                    <th className="py-4 px-4">Trainer</th>
                                    <th className="py-4 px-4">Training Date</th>
                                    <th className="py-4 px-4">Completed Date</th>
                                    <th className="py-4 px-4 text-center">Status</th>
                                    <th className="py-4 px-4">Remarks</th>
                                    {!isAdminView && <th className="py-4 px-4 text-center w-24">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                {paginatedTrainings.map((t, idx) => (
                                    <tr
                                        key={t.id}
                                        className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'}`}
                                    >
                                        {/* Row Index */}
                                        <td className="py-4 px-4 text-center font-bold opacity-50">
                                             {startIndex + idx + 1}
                                        </td>

                                        {/* Teacher Name */}
                                        <td className="py-4 px-4 font-black">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold text-xs uppercase">
                                                    {(t.teacher_name || 'T').charAt(0)}
                                                </div>
                                                <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{t.teacher_name}</span>
                                            </div>
                                        </td>

                                        {/* Topic */}
                                        <td className="py-4 px-4 font-semibold max-w-xs truncate">
                                            <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{t.training_topic}</span>
                                        </td>

                                        {/* Trainer */}
                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-700'}`}>
                                                <User size={12} />
                                                {t.trainer || 'N/A'}
                                            </span>
                                        </td>

                                        {/* Training Date */}
                                        <td className="py-4 px-4 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            {t.training_date || 'N/A'}
                                        </td>

                                        {/* Completed Date */}
                                        <td className="py-4 px-4 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                            {t.completion_date || 'Pending'}
                                        </td>

                                        {/* Status: Read-only badge in Admin, interactive buttons in Teacher view */}
                                        <td className="py-4 px-4 text-center">
                                            {isAdminView ? (
                                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    t.status === 'Completed'
                                                        ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                                        : t.status === 'In Progress'
                                                        ? (isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-100 text-cyan-700 border border-cyan-200')
                                                        : (isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-100 text-amber-700 border border-amber-200')
                                                }`}>
                                                    {t.status}
                                                </span>
                                            ) : (
                                                <div className="inline-flex items-center gap-1">
                                                    {['Pending', 'In Progress', 'Completed'].map(st => (
                                                        <button
                                                            key={st}
                                                            onClick={() => updateStatus(t.id, st)}
                                                            className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                                                                t.status === st
                                                                    ? (st === 'Completed'
                                                                        ? 'bg-emerald-500 text-white shadow-sm'
                                                                        : st === 'In Progress'
                                                                        ? 'bg-cyan-500 text-white shadow-sm'
                                                                        : 'bg-amber-500 text-white shadow-sm')
                                                                    : (isDarkMode ? 'bg-slate-800/80 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                                                            }`}
                                                        >
                                                            {st === 'In Progress' ? 'Progress' : st}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </td>

                                        {/* Remarks */}
                                        <td className="py-4 px-4 text-slate-500 dark:text-slate-400 italic max-w-xs truncate">
                                            {t.remarks || '—'}
                                        </td>

                                        {/* Actions */}
                                        {!isAdminView && (
                                            <td className="py-4 px-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteTraining(t.id, t.teacher_name)}
                                                    title="Delete Record"
                                                    className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination & "Go to page" Controls */}
            {filteredTrainings.length > 0 && (
                <div className={`p-4 md:p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg ${
                    isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                    {/* Left: Items Per Page & Count Summary */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="font-bold opacity-60 uppercase tracking-wider text-[10px]">Show</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(parseInt(e.target.value, 10));
                                setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-xl border outline-none font-bold text-xs cursor-pointer ${
                                isDarkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
                            }`}
                        >
                            {[6, 9, 12, 24, 48].map(sz => (
                                <option key={sz} value={sz} className={isDarkMode ? 'bg-slate-900 text-white' : ''}>
                                    {sz} per page
                                </option>
                            ))}
                        </select>
                        <span className="font-medium opacity-60">
                            Showing <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{startIndex + 1}</strong> to <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{Math.min(startIndex + itemsPerPage, filteredTrainings.length)}</strong> of <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{filteredTrainings.length}</strong> items
                        </span>
                    </div>

                    {/* Center: Prev / Next & Page Buttons */}
                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={safeCurrentPage <= 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                            }`}
                        >
                            <ChevronLeft size={14} />
                            <span>Prev</span>
                        </button>

                        <div className="flex items-center gap-1">
                            {getPageNumbers().map((p, i) => (
                                p === '...' ? (
                                    <span key={`dots-${i}`} className="px-2 py-1 text-xs opacity-50 font-bold">...</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-8 h-8 rounded-xl font-black text-xs transition-all ${
                                            safeCurrentPage === p
                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                                                : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            ))}
                        </div>

                        <button
                            disabled={safeCurrentPage >= totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                            }`}
                        >
                            <span>Next</span>
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Right: "Go to Page" Jump Form */}
                    <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                        <span className="text-xs font-bold opacity-60 uppercase tracking-wider text-[10px]">Go to:</span>
                        <input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={jumpPageInput}
                            onChange={(e) => setJumpPageInput(e.target.value)}
                            placeholder="Page #"
                            className={`w-16 px-2.5 py-1.5 rounded-xl border text-xs font-bold text-center outline-none ${
                                isDarkMode ? 'bg-slate-800 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                            }`}
                        />
                        <button
                            type="submit"
                            className="px-3 py-1.5 rounded-xl font-bold text-xs bg-cyan-500 hover:bg-cyan-600 text-white transition-all shadow-md shadow-cyan-500/20"
                        >
                            Go
                        </button>
                    </form>
                </div>
            )}

            {/* Datalist for Teachers & Trainers suggestions */}
            <datalist id="teachers-datalist">
                {teachersList.map((tea, idx) => (
                    <option key={tea.id || idx} value={tea.name || tea.teacher_name || tea.username}>
                        {tea.department ? `(${tea.department})` : ''}
                    </option>
                ))}
            </datalist>

            {/* Add Training Modal */}
            {!isAdminView && isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`w-full max-w-lg p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} space-y-4 shadow-2xl`}>
                        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="text-cyan-500" size={22} />
                                <h3 className="text-lg font-black">Schedule Teacher Training</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-slate-400 hover:text-white text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Teacher Name (Trainee)</label>
                                <input
                                    type="text"
                                    required
                                    list="teachers-datalist"
                                    value={formData.teacher_name}
                                    onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                                    placeholder="Enter teacher name or choose from list"
                                    className={`w-full p-2.5 rounded-xl border outline-none font-medium ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                />
                            </div>

                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Training Topic</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.training_topic}
                                    onChange={(e) => setFormData({ ...formData, training_topic: e.target.value })}
                                    placeholder="e.g. Smartboard Operations & Pedagogy"
                                    className={`w-full p-2.5 rounded-xl border outline-none font-medium ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className={`block font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Trainer Name</label>
                                        {defaultTrainer && formData.trainer !== defaultTrainer && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, trainer: defaultTrainer })}
                                                className="text-[10px] text-cyan-500 hover:underline font-bold"
                                            >
                                                Use my name
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            list="teachers-datalist"
                                            value={formData.trainer}
                                            onChange={(e) => setFormData({ ...formData, trainer: e.target.value })}
                                            placeholder="Trainer name / Dept"
                                            className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-cyan-400' : 'bg-slate-50 border-slate-200 text-cyan-700'}`}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                                        {formData.trainer === defaultTrainer && defaultTrainer ? '✨ Auto-populated from your profile' : 'You can edit or pick from existing trainers'}
                                    </span>
                                </div>
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Training Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.training_date}
                                        onChange={(e) => setFormData({ ...formData, training_date: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none font-medium ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className={`w-full p-2.5 rounded-xl border outline-none font-medium ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>

                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Remarks</label>
                                <textarea
                                    rows="2"
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    placeholder="Optional notes or evaluation remarks"
                                    className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                ></textarea>
                            </div>

                            <div className={`flex items-center justify-end gap-3 pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => setIsAddModalOpen(false)}
                                    className={`px-4 py-2 rounded-xl font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:opacity-90 disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                                >
                                    {submitting && <Loader2 size={14} className="animate-spin" />}
                                    <span>Schedule Training</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherTrainingTab;
