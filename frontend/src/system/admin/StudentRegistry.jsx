import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Database, AlertCircle, MapPin, Mail, Power, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Search, Filter, X, RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import StudentDetailView from '../StudentDetailView';

const StudentRegistry = ({ studentsData, isERPLoading }) => {
    const { isDarkMode } = useTheme();
    const { user: portalUser, token, getApiUrl, loading: authLoading } = useAuth();
    const [allStudents, setAllStudents] = useState([]);
    const [displayedStudents, setDisplayedStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [erpUnavailable, setErpUnavailable] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

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
        course: '',
        status: '',
        centre: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [filteredStudents, setFilteredStudents] = useState([]);

    // Drag to scroll state
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const tableRef = React.useRef(null);

    // Handle items per page change
    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1); // Reset to first page
        setTotalPages(Math.ceil(allStudents.length / newItemsPerPage));
    };

    const loadERPData = useCallback(async (force = false) => {
        // Wait for auth to finish loading
        if (authLoading) return;

        if (!force && allStudents.length > 0) return;
        setIsLoading(true);
        setError(null);

        try {
            const apiUrl = getApiUrl();

            if (!token) {
                throw new Error("Authentication required. Please log in.");
            }

            // Call backend API which proxies to ERP
            const response = await axios.get(`${apiUrl}/api/admin/erp-students/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const erpData = response.data?.data || (Array.isArray(response.data) ? response.data : []);

            // If ERP returned empty (server sleeping/unavailable), show retry UI
            if (erpData.length === 0) {
                setErpUnavailable(true);
                setIsLoading(false);
                return;
            }

            setErpUnavailable(false);
            setAllStudents(erpData);

            // Initially load first 50 records
            const initialData = erpData.slice(0, INITIAL_LOAD);
            setDisplayedStudents(initialData);
            setLoadedCount(INITIAL_LOAD);

            // Calculate total pages
            setTotalPages(Math.ceil(erpData.length / itemsPerPage));

        } catch (err) {
            console.error("❌ ERP Sync Failed:", err);
            setError(err.response?.data?.error || err.message || "Failed to load student data");
        } finally {
            setIsLoading(false);
        }
    }, [allStudents.length, itemsPerPage, token, getApiUrl, authLoading]);

    // Load more data gradually
    const loadMoreData = useCallback(() => {
        if (loadedCount >= allStudents.length) return;

        setIsLoadingMore(true);
        setTimeout(() => {
            const nextBatch = allStudents.slice(0, loadedCount + LOAD_INCREMENT);
            setDisplayedStudents(nextBatch);
            setLoadedCount(loadedCount + LOAD_INCREMENT);
            setIsLoadingMore(false);
        }, 300);
    }, [loadedCount, allStudents]);

    useEffect(() => {
        if (authLoading) return;

        if (studentsData && studentsData.length > 0) {
            setAllStudents(studentsData);
            setDisplayedStudents(studentsData.slice(0, INITIAL_LOAD));
            setLoadedCount(INITIAL_LOAD);
            setTotalPages(Math.ceil(studentsData.length / itemsPerPage));
            setIsLoading(false);
            return;
        }

        loadERPData();
    }, [studentsData, loadERPData, itemsPerPage, authLoading]);

    // Auto-load more data when scrolling near bottom
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.innerHeight + window.scrollY;
            const pageHeight = document.documentElement.scrollHeight;

            if (scrollPosition >= pageHeight - 500 && !isLoadingMore && loadedCount < allStudents.length) {
                loadMoreData();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isLoadingMore, loadedCount, allStudents.length, loadMoreData]);

    // Apply search and filters
    useEffect(() => {
        let result = [...allStudents];

        // Apply search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(std => {
                const name = (std.student?.studentsDetails?.[0]?.studentName || std.studentName || '').toLowerCase();
                const email = (std.student?.studentsDetails?.[0]?.studentEmail || '').toLowerCase();
                const enrollmentNum = (std.admissionNumber || '').toLowerCase();
                const mobile = (std.student?.studentsDetails?.[0]?.mobileNum || '').toLowerCase();

                return name.includes(query) ||
                    email.includes(query) ||
                    enrollmentNum.includes(query) ||
                    mobile.includes(query);
            });
        }

        // Apply course filter
        if (filters.course) {
            result = result.filter(std =>
                (std.course?.courseName || '').toLowerCase().includes(filters.course.toLowerCase())
            );
        }

        // Apply status filter
        if (filters.status) {
            result = result.filter(std =>
                (std.admissionStatus || '').toLowerCase() === filters.status.toLowerCase()
            );
        }

        // Apply centre filter
        if (filters.centre) {
            result = result.filter(std =>
                (std.centre || '').toLowerCase().includes(filters.centre.toLowerCase())
            );
        }

        setFilteredStudents(result);
        setCurrentPage(1); // Reset to first page when filters change
        setTotalPages(Math.ceil(result.length / itemsPerPage));
    }, [searchQuery, filters, allStudents, itemsPerPage]);

    // Get unique values for filter dropdowns
    const uniqueCourses = [...new Set(allStudents.map(std => std.course?.courseName).filter(Boolean))];
    const uniqueStatuses = [...new Set(allStudents.map(std => std.admissionStatus).filter(Boolean))];
    const uniqueCentres = [...new Set(allStudents.map(std => std.centre).filter(Boolean))];

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setFilters({ course: '', status: '', centre: '' });
    };

    const hasActiveFilters = searchQuery || filters.course || filters.status || filters.centre;

    // Paginate displayed students
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const goToPage = (page) => {
        const pageNum = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(pageNum);

        // Load more data if needed
        const requiredData = pageNum * itemsPerPage;
        if (requiredData > loadedCount && loadedCount < allStudents.length) {
            const nextBatch = allStudents.slice(0, Math.min(requiredData, allStudents.length));
            setDisplayedStudents(nextBatch);
            setLoadedCount(nextBatch.length);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const page = parseInt(jumpToPage);
        if (page && page >= 1 && page <= totalPages) {
            goToPage(page);
            setJumpToPage('');
        }
    };

    // Drag to scroll handlers
    const handleMouseDown = (e) => {
        if (!tableRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - tableRef.current.offsetLeft);
        setScrollLeft(tableRef.current.scrollLeft);
        tableRef.current.style.cursor = 'grabbing';
        tableRef.current.style.userSelect = 'none';
    };

    const handleMouseLeave = () => {
        if (!tableRef.current) return;
        setIsDragging(false);
        tableRef.current.style.cursor = 'grab';
        tableRef.current.style.userSelect = 'auto';
    };

    const handleMouseUp = () => {
        if (!tableRef.current) return;
        setIsDragging(false);
        tableRef.current.style.cursor = 'grab';
        tableRef.current.style.userSelect = 'auto';
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !tableRef.current) return;
        e.preventDefault();
        const x = e.pageX - tableRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        tableRef.current.scrollLeft = scrollLeft - walk;
    };

    if (isLoading) return (
        <div className="animate-pulse">
            <div className="flex flex-col items-center justify-center py-12 mb-8 space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-orange-500/10 border-t-orange-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Database size={20} className="text-orange-500 animate-pulse" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="font-black uppercase tracking-[0.3em] text-[10px] text-orange-500 mb-1">ERP Gateway</p>
                    <p className={`text-xs font-bold opacity-40 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Downloading 15,000+ Student Records...</p>
                    <p className={`text-[10px] mt-2 opacity-30 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>First load takes ~30 seconds. Cached for 1 hour after.</p>
                </div>
            </div>

            <div className={`rounded-[5px] border overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="pb-6 px-4">Student Profile</th>
                                <th className="pb-6 px-4">Course / Center</th>
                                <th className="pb-6 px-4">Contact Info</th>
                                <th className="pb-6 px-4 text-center">Form ID</th>
                                <th className="pb-6 px-4 text-center">Status</th>
                                <th className="pb-6 px-4 text-right">Action</th>
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
                                        <div className="space-y-2">
                                            <div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            <div className={`h-2.5 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="space-y-2">
                                            <div className={`h-4 w-28 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            <div className={`h-2.5 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className={`h-6 w-20 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className={`h-6 w-16 mx-auto rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                    </td>
                                    <td className="py-6 px-4 text-right">
                                        <div className={`h-9 w-24 ml-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
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
                <Database size={40} strokeWidth={2} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">ERP Server Waking Up</h3>
            <p className={`text-sm font-medium max-w-sm mx-auto mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                The ERP server is starting up (Render cold-start). This happens after ~15 min of inactivity.
            </p>
            <p className={`text-xs mb-8 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Wait 30–60 seconds, then click Retry.
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className={`p-10 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-[5px] shadow-lg shadow-orange-500/20">External ERP</div>
                            <h2 className="text-3xl font-black tracking-tight uppercase bg-gradient-to-r from-orange-500 to-indigo-500 bg-clip-text text-transparent">Student Registry</h2>
                        </div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Pathfinder Admission System live data synchronization.
                            <span className="ml-2 font-black text-orange-500">
                                {allStudents.length} Total Records
                            </span>
                            {loadedCount < allStudents.length && (
                                <span className={`ml-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    (Loaded: {loadedCount})
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={() => loadERPData(true)}
                        className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'}`}
                    >
                        <RotateCcw size={12} className={isLoading ? 'animate-spin' : ''} />
                        Sync Registry
                    </button>
                </div>

                {/* Search and Filter Section */}
                <div className="mb-8 space-y-4">
                    {/* Search Bar */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                            <input
                                type="text"
                                placeholder="Search by name, email, enrollment number, or mobile..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-12 pr-4 py-3 rounded-[5px] text-sm font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all hover:scale-110 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                                >
                                    <X size={16} className="opacity-50" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-6 py-3 rounded-[5px] text-sm font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${showFilters ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : isDarkMode ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'}`}
                        >
                            <Filter size={16} />
                            Filters
                            {hasActiveFilters && !showFilters && (
                                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px]">
                                    {[searchQuery, filters.course, filters.status, filters.centre].filter(Boolean).length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Filter Dropdowns */}
                    {showFilters && (
                        <div className={`p-6 rounded-[5px] border space-y-4 animate-in slide-in-from-top-2 ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Course Filter */}
                                <div>
                                    <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Course
                                    </label>
                                    <select
                                        value={filters.course}
                                        onChange={(e) => setFilters({ ...filters, course: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-[5px] text-sm font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white [&>option]:bg-[#10141D] [&>option]:text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    >
                                        <option value="">All Courses</option>
                                        {uniqueCourses.map((course, idx) => (
                                            <option key={idx} value={course}>{course}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Status
                                    </label>
                                    <select
                                        value={filters.status}
                                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-[5px] text-sm font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white [&>option]:bg-[#10141D] [&>option]:text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    >
                                        <option value="">All Statuses</option>
                                        {uniqueStatuses.map((status, idx) => (
                                            <option key={idx} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Centre Filter */}
                                <div>
                                    <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Centre
                                    </label>
                                    <select
                                        value={filters.centre}
                                        onChange={(e) => setFilters({ ...filters, centre: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-[5px] text-sm font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white [&>option]:bg-[#10141D] [&>option]:text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    >
                                        <option value="">All Centres</option>
                                        {uniqueCentres.map((centre, idx) => (
                                            <option key={idx} value={centre}>{centre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Clear Filters Button */}
                            {hasActiveFilters && (
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={clearFilters}
                                        className={`px-4 py-2 rounded-[5px] text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}
                                    >
                                        <X size={14} />
                                        Clear All Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Results Summary */}
                    {hasActiveFilters && (
                        <div className={`px-4 py-2 rounded-[5px] text-sm font-medium flex items-center gap-2 ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                            <Database size={16} />
                            Showing {filteredStudents.length} of {allStudents.length} students
                        </div>
                    )}
                </div>

                <div
                    ref={tableRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className="overflow-x-auto custom-scrollbar cursor-grab active:cursor-grabbing"
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="pb-6 px-4">Student Profile</th>
                                <th className="pb-6 px-4">Course / Center</th>
                                <th className="pb-6 px-4">Contact Info</th>
                                <th className="pb-6 px-4 text-center">Form ID</th>
                                <th className="pb-6 px-4 text-center">Status</th>
                                <th className="pb-6 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {paginatedStudents.length > 0 ? paginatedStudents.map((std, i) => (
                                <tr key={i} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-all duration-300`}>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center font-black text-sm border-2 transition-all group-hover:scale-110 group-hover:rotate-3 ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-white/5 shadow-inner' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                {(std.student?.studentsDetails?.[0]?.studentName || std.studentName || 'S').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-base tracking-tight leading-none mb-1">{std.student?.studentsDetails?.[0]?.studentName || std.studentName || 'Anonymous Student'}</p>
                                                <p className="text-[9px] opacity-40 font-black uppercase tracking-[0.2em]">{std.student?.studentsDetails?.[0]?.gender || 'Student'} • {std.student?.studentsDetails?.[0]?.board || 'Regular'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="text-sm font-black text-orange-500 mb-0.5">{std.course?.courseName || 'Standard Program'}</div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={10} className="opacity-40" />
                                            <span className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">{std.centre || 'Main Campus'}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Mail size={12} className="opacity-30" />
                                            <span className="text-xs font-medium opacity-60 italic whitespace-nowrap">{std.student?.studentsDetails?.[0]?.studentEmail || 'no-email@erp.system'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Power size={10} className="rotate-90 text-emerald-500" />
                                            <span className="text-[11px] font-black opacity-70 tracking-tight">+91 {std.student?.studentsDetails?.[0]?.mobileNum || 'XXXXXXXXXX'}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-center">
                                        <span className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black tracking-widest ${isDarkMode ? 'bg-white/5 text-white/30 border border-white/5' : 'bg-slate-100 text-slate-400 border border-slate-200/50'}`}>
                                            #{std.admissionNumber?.slice(-6) || 'ERP-ID'}
                                        </span>
                                    </td>
                                    <td className="py-6 px-4 text-center">
                                        <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-[5px] border shadow-lg ${std.admissionStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                                            {std.admissionStatus || 'PENDING'}
                                        </span>
                                    </td>
                                    <td className="py-6 px-4 text-right">
                                        <button
                                            onClick={() => setSelectedStudent(std)}
                                            className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ml-auto ${isDarkMode ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}
                                        >
                                            <Eye size={12} />
                                            View
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="py-32 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <Database size={48} className="mb-4" />
                                            <p className="font-black uppercase tracking-[0.2em] text-sm">No Records Available</p>
                                            <p className="text-xs mt-1">External database returned an empty set.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 0 && (
                    <div className={`mt-8 pt-8 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                        {/* Top Row: Items Per Page + Page Info */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                            {/* Items Per Page Dropdown */}
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Show:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                    className={`px-4 py-2 rounded-[5px] text-xs font-black border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'}`}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={30}>30</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>per page</span>
                            </div>

                            {/* Page Info */}
                            <div className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                Showing <span className="text-orange-500 font-black">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                                <span className="text-orange-500 font-black">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of{' '}
                                <span className="text-orange-500 font-black">{filteredStudents.length}</span> records
                                {hasActiveFilters && (
                                    <span className={`ml-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        (filtered from {allStudents.length})
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Bottom Row: Pagination Buttons + Jump to Page */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                            {/* Pagination Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToPage(1)}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    <ChevronsLeft size={16} />
                                </button>
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {/* Page Numbers */}
                                <div className="flex items-center gap-1">
                                    {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = idx + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = idx + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + idx;
                                        } else {
                                            pageNum = currentPage - 2 + idx;
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => goToPage(pageNum)}
                                                className={`px-3 py-2 rounded-[5px] text-xs font-black transition-all hover:scale-110 active:scale-95 ${currentPage === pageNum ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-[5px] transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    onClick={() => goToPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-[5px] transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    <ChevronsRight size={16} />
                                </button>
                            </div>

                            {/* Jump to Page */}
                            <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Go to:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    value={jumpToPage}
                                    onChange={(e) => setJumpToPage(e.target.value)}
                                    placeholder="Page"
                                    className={`w-20 px-3 py-2 rounded-[5px] text-xs font-bold text-center border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                                />
                                <button
                                    type="submit"
                                    className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}
                                >
                                    Go
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Loading More Indicator */}
                {isLoadingMore && (
                    <div className="mt-6 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold">
                            <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                            Loading more records...
                        </div>
                    </div>
                )}
            </div>

            {selectedStudent && (
                <StudentDetailView
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
        </div>
    );
};

export default StudentRegistry;
