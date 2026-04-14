import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import {
    Database, AlertCircle, Mail, Power, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Search, Filter, X, RotateCcw, GraduationCap,
    User, Briefcase, MapPin, Calendar, BadgeCheck, ShieldCheck, Award, Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const TeacherRegistry = ({ teachersData, isERPLoading }) => {
    const { isDarkMode } = useTheme();
    const { token, getApiUrl, loading: authLoading } = useAuth();
    const [allTeachers, setAllTeachers] = useState([]);
    const [displayedTeachers, setDisplayedTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [erpUnavailable, setErpUnavailable] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [totalPages, setTotalPages] = useState(0);
    const [jumpToPage, setJumpToPage] = useState('');

    // Lazy loading state
    const [loadedCount, setLoadedCount] = useState(0);
    const INITIAL_LOAD = 50;
    const LOAD_INCREMENT = 50;

    // Search and Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        subject: '',
        status: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [filteredTeachers, setFilteredTeachers] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Drag to scroll state
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const tableRef = React.useRef(null);

    const loadERPData = useCallback(async (force = false) => {
        if (authLoading) return;
        if (!force && allTeachers.length > 0) return;

        if (allTeachers.length === 0) setIsLoading(true);
        setError(null);

        try {
            const apiUrl = getApiUrl();
            if (!token) throw new Error("Authentication required. Please log in.");

            const response = await axios.get(`${apiUrl}/api/admin/erp-teachers/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { refresh: force }
            });

            const erpData = Array.isArray(response.data) ? response.data : (response.data?.data || []);

            if (erpData.length === 0) {
                setErpUnavailable(true);
                setIsLoading(false);
                return;
            }

            setErpUnavailable(false);
            setAllTeachers(erpData);

            setDisplayedTeachers(erpData.slice(0, INITIAL_LOAD));
            setLoadedCount(INITIAL_LOAD);
            setTotalPages(Math.ceil(erpData.length / itemsPerPage));

        } catch (err) {
            console.error("❌ ERP Teacher Sync Failed:", err);
            setError(err.response?.data?.error || err.message || "Failed to load teacher data");
        } finally {
            setIsLoading(false);
        }
    }, [allTeachers.length, itemsPerPage, token, getApiUrl, authLoading]);

    useEffect(() => {
        if (authLoading) return;
        if (teachersData && teachersData.length > 0) {
            setAllTeachers(teachersData);
            setDisplayedTeachers(teachersData.slice(0, INITIAL_LOAD));
            setLoadedCount(INITIAL_LOAD);
            setTotalPages(Math.ceil(teachersData.length / itemsPerPage));
            setIsLoading(false);
            return;
        }
        loadERPData();
    }, [teachersData, loadERPData, itemsPerPage, authLoading]);

    // Apply search and filters
    useEffect(() => {
        let result = [...allTeachers];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(t => {
                const name = (t.name || t.fullName || t.firstName + ' ' + t.lastName || '').toLowerCase();
                const email = (t.email || '').toLowerCase();
                const mobile = (t.mobile || t.phone || '').toLowerCase();
                const subject = (t.subject || '').toLowerCase();
                const code = (t.code || '').toLowerCase();

                return name.includes(query) || email.includes(query) || mobile.includes(query) || subject.includes(query) || code.includes(query);
            });
        }

        if (filters.subject) {
            result = result.filter(t => (t.subject || '').toLowerCase().includes(filters.subject.toLowerCase()));
        }

        setFilteredTeachers(result);
        setCurrentPage(1);
        setTotalPages(Math.ceil(result.length / itemsPerPage));
    }, [searchQuery, filters, allTeachers, itemsPerPage]);

    // Generate page numbers for smart pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const page = parseInt(jumpToPage);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
            goToPage(page);
            setJumpToPage('');
        }
    };

    const uniqueSubjects = [...new Set(allTeachers.map(t => t.subject_name || t.subject).filter(Boolean))];

    const paginatedTeachers = filteredTeachers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const goToPage = (page) => {
        const pageNum = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(pageNum);
        if (tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    if (isLoading && allTeachers.length === 0) return (
        <div className="animate-pulse space-y-8">
            <div className={`p-10 rounded-[5px] border overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="pb-6 px-4">Teacher Profile</th>
                                <th className="pb-6 px-4">Expertise / Subject</th>
                                <th className="pb-6 px-4">Contact Details</th>
                                <th className="pb-6 px-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <tr key={i}>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            <div className="space-y-2">
                                                <div className={`h-4 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-2.5 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className={`h-4 w-28 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                    </td>
                                    <td className="py-6 px-4 text-center">
                                        <div className={`h-6 w-16 mx-auto rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-[5px] flex items-center justify-center mb-6 border border-red-500/20 shadow-2xl shadow-red-500/10">
                <AlertCircle size={40} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">Sync Connection Failed</h3>
            <p className="text-sm font-medium opacity-50 max-w-xs mx-auto mb-8">{error}</p>
            <button onClick={() => loadERPData(true)} className="px-6 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-[5px] font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95">Retry Sync</button>
        </div>
    );

    if (erpUnavailable) return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className={`w-20 h-20 rounded-[5px] flex items-center justify-center mb-6 border shadow-2xl ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-orange-500/10' : 'bg-orange-50 text-orange-500 border-orange-200'}`}>
                <GraduationCap size={40} strokeWidth={2} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">ERP Server Response Timeout</h3>
            <p className={`text-sm font-medium max-w-sm mx-auto mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Could not fetch teacher master data from ERP.
            </p>
            <button
                onClick={() => { setErpUnavailable(false); setIsLoading(true); loadERPData(true); }}
                className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-lg shadow-orange-500/30"
            >
                <RotateCcw size={14} />
                Retry Sync
            </button>
        </div>
    );

    return (
        <>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className={`p-10 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                    <div className="mb-8 space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name, ID, email, or subject..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-3 rounded-[5px] text-sm font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all hover:scale-110 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                        <X size={16} className="opacity-50" />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`px-4 py-3 rounded-[5px] text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${showFilters ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : isDarkMode ? 'bg-white/5 text-white border border-white/10' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}
                                >
                                    <Filter size={14} />
                                    Filters
                                </button>
                                <button
                                    onClick={() => loadERPData(true)}
                                    className={`px-4 py-3 rounded-[5px] text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${isDarkMode ? 'bg-white/5 text-white border border-white/10' : 'bg-slate-900 text-white shadow-lg shadow-slate-900/30'}`}
                                >
                                    <RotateCcw size={14} />
                                    Sync
                                </button>
                            </div>
                        </div>

                        {showFilters && (
                            <div className={`p-6 rounded-[5px] border space-y-4 animate-in slide-in-from-top-2 ${isDarkMode ? 'bg-white/2 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Subject</label>
                                        <select
                                            value={filters.subject}
                                            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-[5px] text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                        >
                                            <option value="">All Subjects</option>
                                            {uniqueSubjects.map((subject, idx) => (
                                                <option key={idx} value={subject}>{subject}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Rows Per Page</label>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => {
                                                setItemsPerPage(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className={`w-full px-4 py-3 rounded-[5px] text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                        >
                                            {[10, 20, 50, 100, 200].map(val => (
                                                <option key={val} value={val}>{val} rows</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col justify-end">
                                        <button
                                            onClick={() => {
                                                setFilters({ subject: '', status: '' });
                                                setSearchQuery('');
                                                setItemsPerPage(50);
                                            }}
                                            className={`w-full py-3 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/5 text-slate-400 border border-white/10' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                                        >
                                            Reset All
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div ref={tableRef} className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                    <th className="pb-6 px-4">Teacher Profile</th>
                                    <th className="pb-6 px-4">Expertise / Subject</th>
                                    <th className="pb-6 px-4">Contact Info</th>
                                    <th className="pb-6 px-4 text-center">Code</th>
                                    <th className="pb-6 px-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-transparent">
                                {paginatedTeachers.length > 0 ? paginatedTeachers.map((t, i) => (
                                    <tr
                                        key={t.id || i}
                                        onClick={() => {
                                            setSelectedTeacher(t);
                                            setIsDetailOpen(true);
                                        }}
                                        className={`group cursor-pointer ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-slate-50'} transition-all duration-300`}
                                    >
                                        <td className="py-6 px-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center font-black text-sm border-2 transition-all group-hover:scale-110 ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-white/5' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                    {(t.name || 'T').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-base tracking-tight leading-none mb-1 uppercase">{t.name || 'Anonymous Teacher'}</p>
                                                    <p className="text-[9px] opacity-40 font-black uppercase tracking-[0.2em]">{t.qualification || 'Faculty Member'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="text-sm font-black text-orange-500 mb-0.5">{t.subject_name || t.subject || 'All Subjects'}</div>
                                            <div className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">{t.teacherType || 'Full-Time Faculty'}</div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Mail size={12} className="opacity-30" />
                                                <span className="text-xs font-medium opacity-60 italic">{t.email || 'no-email@erp.system'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Power size={10} className="rotate-90 text-emerald-500" />
                                                <span className="text-[11px] font-black opacity-70 tracking-tight">{t.phone || 'XXXXXXXXXX'}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4 text-center font-bold text-xs opacity-60">
                                            {t.code || 'N/A'}
                                        </td>
                                        <td className="py-6 px-4 text-center">
                                            <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-[5px] border ${t.isActive !== false ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                {t.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="py-32 text-center opacity-20">
                                            <Database size={48} className="mx-auto mb-4" />
                                            <p className="font-black uppercase tracking-[0.2em] text-sm">No Teacher Records Found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-white/5 space-y-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className={`text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Displaying <span className="text-orange-500 font-black">{((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredTeachers.length)}</span> of <span className="text-orange-500 font-black">{filteredTeachers.length}</span> Teachers
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => goToPage(1)}
                                        disabled={currentPage === 1}
                                        className={`p-2.5 rounded-[5px] border transition-all disabled:opacity-20 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}
                                    >
                                        <ChevronsLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className={`p-2.5 rounded-[5px] border transition-all disabled:opacity-20 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    <div className="flex items-center gap-1.5 px-2">
                                        {getPageNumbers().map((p, idx) => (
                                            typeof p === 'number' ? (
                                                <button
                                                    key={idx}
                                                    onClick={() => goToPage(p)}
                                                    className={`w-9 h-9 flex items-center justify-center rounded-[5px] text-[11px] font-black transition-all ${currentPage === p ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110' : isDarkMode ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                                >
                                                    {p}
                                                </button>
                                            ) : (
                                                <span key={idx} className="px-2 opacity-30 font-black">...</span>
                                            )
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className={`p-2.5 rounded-[5px] border transition-all disabled:opacity-20 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                    <button
                                        onClick={() => goToPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className={`p-2.5 rounded-[5px] border transition-all disabled:opacity-20 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}
                                    >
                                        <ChevronsRight size={16} />
                                    </button>
                                </div>

                                <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Jump To</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={jumpToPage}
                                        onChange={(e) => setJumpToPage(e.target.value)}
                                        className={`w-14 px-2 py-2 rounded-[5px] text-center text-xs font-black border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    />
                                    <button
                                        type="submit"
                                        className={`p-2 px-3 rounded-[5px] bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-500/20`}
                                    >
                                        Go
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

            </div>
            {isDetailOpen && selectedTeacher && ReactDOM.createPortal(
                <div className="fixed inset-0 z-999 flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setIsDetailOpen(false)}></div>
                    <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[5px] border shadow-2xl animate-in zoom-in-95 duration-500 ${isDarkMode ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'}`}>
                        {/* Header */}
                        <div className={`p-8 md:p-10 border-b flex items-start justify-between ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                            <div className="flex items-center gap-6">
                                <div className={`w-20 h-20 rounded-[5px] flex items-center justify-center font-black text-3xl border-4 ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-white/5' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                    {selectedTeacher.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-black uppercase tracking-tight leading-none">{selectedTeacher.name}</h2>
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-[5px] border ${selectedTeacher.isActive !== false ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                            {selectedTeacher.isActive !== false ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40">{selectedTeacher.designation || 'Faculty Member'}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDetailOpen(false)} className={`p-3 rounded-[5px] transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                <X size={20} className="opacity-50" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar max-h-[calc(90vh-160px)]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Left Column: Core Info */}
                                <div className="space-y-10">
                                    <section>
                                        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest opacity-30 mb-6">
                                            <User size={14} /> Professional Identity
                                        </h3>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Employee ID</p>
                                                <p className="font-bold text-orange-500 uppercase">{selectedTeacher.code || 'N/A'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Teacher Type</p>
                                                <p className="font-bold uppercase italic">{selectedTeacher.teacherType || 'Full-Time'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Department</p>
                                                <p className="font-bold uppercase tracking-tight">{selectedTeacher.teacherDepartment || 'Academic'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Subject</p>
                                                <p className="font-bold uppercase text-blue-500">{selectedTeacher.subject_name || selectedTeacher.subject}</p>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest opacity-30 mb-6">
                                            <Mail size={14} /> Contact & Availability
                                        </h3>
                                        <div className="space-y-6">
                                            <div className={`p-4 rounded-[5px] border flex items-center gap-4 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-[5px]">
                                                    <Mail size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Official Email</p>
                                                    <p className="font-bold lowercase italic">{selectedTeacher.email}</p>
                                                </div>
                                            </div>
                                            <div className={`p-4 rounded-[5px] border flex items-center gap-4 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-[5px]">
                                                    <Power size={18} className="rotate-90" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Phone Number</p>
                                                    <p className="font-bold">{selectedTeacher.phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Right Column: Assignments & Status */}
                                <div className="space-y-10">
                                    <section>
                                        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest opacity-30 mb-6">
                                            <MapPin size={14} /> Centre Assignments
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTeacher.centres && selectedTeacher.centres.length > 0 ? (
                                                selectedTeacher.centres.map((centre, idx) => (
                                                    <span key={idx} className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                                                        {centre}
                                                    </span>
                                                ))
                                            ) : (
                                                <div className="flex items-center gap-2 opacity-50 italic text-sm">
                                                    <Info size={14} /> No active centre assignments
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest opacity-30 mb-6">
                                            <Award size={14} /> Board & HOD Status
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className={`p-4 rounded-[5px] border ${selectedTeacher.isDeptHod ? 'bg-purple-500/10 border-purple-500/20' : 'opacity-40 border-transparent'}`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest mb-1">DEPT HOD</p>
                                                <p className="text-xs font-bold uppercase">{selectedTeacher.isDeptHod ? 'Authorized' : 'Member'}</p>
                                            </div>
                                            <div className={`p-4 rounded-[5px] border ${selectedTeacher.isBoardHod ? 'bg-orange-500/10 border-orange-500/20' : 'opacity-40 border-transparent'}`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest mb-1">BOARD HOD</p>
                                                <p className="text-xs font-bold uppercase">{selectedTeacher.isBoardHod ? 'Authorized' : 'Member'}</p>
                                            </div>
                                            <div className={`p-4 rounded-[5px] border col-span-2 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Board Type</p>
                                                        <p className="font-bold uppercase tracking-widest">{selectedTeacher.boardType || 'GENERAL'}</p>
                                                    </div>
                                                    <BadgeCheck size={24} className="opacity-20" />
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest opacity-30 mb-6">
                                            <Calendar size={14} /> Academic Timeline
                                        </h3>
                                        <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className="flex justify-between items-center">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Joining Date</p>
                                                    <p className="font-black text-lg tracking-tight">
                                                        {selectedTeacher.academicInfo?.joiningDate ? new Date(selectedTeacher.academicInfo.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Gender</p>
                                                    <p className="font-bold uppercase tracking-widest opacity-60 underline underline-offset-4 decoration-orange-500">{selectedTeacher.academicInfo?.gender || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`p-8 md:p-10 border-t flex justify-end ${isDarkMode ? 'border-white/5 bg-white/2' : 'border-slate-100 bg-slate-50/50'}`}>
                            <button
                                onClick={() => setIsDetailOpen(false)}
                                className={`px-8 py-3 rounded-[5px] text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'}`}
                            >
                                Close Overview
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default TeacherRegistry;
