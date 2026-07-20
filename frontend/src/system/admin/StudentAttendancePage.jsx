import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Database, AlertCircle, MapPin, Mail, Power, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Search, Filter, X, RotateCcw, Calendar, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import StudentAttendanceTab from './StudentAttendanceTab';
import MultiSelectDropdown from '../../components/common/MultiSelectDropdown';

// Helper: MongoDB populated fields can be objects {_id, name, __v} or plain strings
const safeStr = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val.name) return val.name;
    return String(val);
};

const StudentAttendancePage = () => {
    const { isDarkMode } = useTheme();
    const { user: portalUser, token, getApiUrl, loading: authLoading } = useAuth();
    const [allStudents, setAllStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [erpUnavailable, setErpUnavailable] = useState(false);

    // Selected student for attendance view
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [totalPages, setTotalPages] = useState(0);
    const [jumpToPage, setJumpToPage] = useState('');

    // Search and Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        centre: [],
        course: [],
        status: [],
        className: [],
        examTag: [],
        batch: []
    });
    const [showFilters, setShowFilters] = useState(false);
    const [filteredStudents, setFilteredStudents] = useState([]);

    // Drag to scroll state
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const tableRef = React.useRef(null);

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
    };

    const loadERPData = useCallback(async (force = false) => {
        if (authLoading) return;
        if (!force && allStudents.length > 0) return;
        if (allStudents.length === 0) setIsLoading(true);
        setError(null);

        try {
            const apiUrl = getApiUrl();
            if (!token) throw new Error("Authentication required. Please log in.");

            const response = await axios.get(`${apiUrl}/api/admin/erp-students/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const erpData = response.data?.data || (Array.isArray(response.data) ? response.data : []);

            if (erpData.length === 0) {
                setErpUnavailable(true);
                setIsLoading(false);
                return;
            }

            setErpUnavailable(false);
            setAllStudents(erpData);
        } catch (err) {
            console.error("❌ ERP Sync Failed:", err);
            setError(err.response?.data?.error || err.message || "Failed to load student data");
        } finally {
            setIsLoading(false);
        }
    }, [allStudents.length, token, getApiUrl, authLoading]);

    useEffect(() => {
        if (authLoading) return;
        loadERPData();
    }, [loadERPData, authLoading]);

    // Apply search and filters
    useEffect(() => {
        let result = [...allStudents];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(std => {
                const name = (std.student?.studentsDetails?.[0]?.studentName || std.studentName || '').toLowerCase();
                const email = (std.student?.studentsDetails?.[0]?.studentEmail || '').toLowerCase();
                const enrollmentNum = (std.admissionNumber || '').toLowerCase();
                const mobile = (std.student?.studentsDetails?.[0]?.mobileNum || '').toLowerCase();
                return name.includes(query) || email.includes(query) || enrollmentNum.includes(query) || mobile.includes(query);
            });
        }

        if (filters.centre.length > 0) {
            result = result.filter(std => filters.centre.includes(safeStr(std.centre)));
        }
        if (filters.course.length > 0) {
            result = result.filter(std => filters.course.includes(safeStr(std.course?.courseName) || ''));
        }
        if (filters.status.length > 0) {
            result = result.filter(std => filters.status.includes(safeStr(std.admissionStatus) || ''));
        }
        if (filters.className.length > 0) {
            result = result.filter(std => {
                const cls = safeStr(std.class) || std.student?.studentsDetails?.[0]?.className || '';
                return filters.className.includes(cls);
            });
        }
        if (filters.examTag.length > 0) {
            result = result.filter(std => {
                const tag = safeStr(std.examTag) || safeStr(std.course?.examTag) || '';
                return filters.examTag.includes(tag);
            });
        }
        if (filters.batch.length > 0) {
            result = result.filter(std => {
                const batch = safeStr(std.batch) || safeStr(std.academicSession) || '';
                return filters.batch.includes(batch);
            });
        }

        setFilteredStudents(result);
        setCurrentPage(1);
        setTotalPages(Math.ceil(result.length / itemsPerPage));
    }, [searchQuery, filters, allStudents, itemsPerPage]);

    // Get unique values for filter dropdowns
    const uniqueCentres = [...new Set(allStudents.map(std => safeStr(std.centre)).filter(Boolean))].sort();
    const uniqueCourses = [...new Set(allStudents.map(std => safeStr(std.course?.courseName)).filter(Boolean))].sort();
    const uniqueStatuses = [...new Set(allStudents.map(std => safeStr(std.admissionStatus)).filter(Boolean))].sort();
    const uniqueClasses = [...new Set(allStudents.map(std => safeStr(std.class) || std.student?.studentsDetails?.[0]?.className || '').filter(Boolean))].sort();
    const uniqueExamTags = [...new Set(allStudents.map(std => safeStr(std.examTag) || safeStr(std.course?.examTag) || '').filter(Boolean))].sort();
    const uniqueBatches = [...new Set(allStudents.map(std => safeStr(std.batch) || safeStr(std.academicSession) || '').filter(Boolean))].sort();

    const clearFilters = () => {
        setSearchQuery('');
        setFilters({ centre: [], course: [], status: [], className: [], examTag: [], batch: [] });
    };

    const hasActiveFilters = searchQuery || Object.values(filters).some(val => val.length > 0);

    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const goToPage = (page) => {
        const pageNum = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(pageNum);
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
        const walk = (x - startX) * 2;
        tableRef.current.scrollLeft = scrollLeft - walk;
    };

    // --- Attendance Detail Modal ---
    if (selectedStudent) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                {/* Back button */}
                <button
                    onClick={() => setSelectedStudent(null)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-[5px] text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'}`}
                >
                    <ChevronLeft size={14} /> Back to Student List
                </button>

                {/* Student header */}
                <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-4 mb-2">
                        <div className={`w-14 h-14 rounded-[5px] flex items-center justify-center text-2xl font-black border-2 ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                            {(selectedStudent.student?.studentsDetails?.[0]?.studentName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {selectedStudent.student?.studentsDetails?.[0]?.studentName || 'Student'}
                            </h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                    #{selectedStudent.admissionNumber}
                                </span>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${selectedStudent.admissionStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                                    {selectedStudent.admissionStatus || 'UNKNOWN'}
                                </span>
                                <span className={`text-[10px] font-bold opacity-50`}>
                                    {safeStr(selectedStudent.centre)} • {safeStr(selectedStudent.course?.courseName)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance data */}
                <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                    <StudentAttendanceTab admissionNumber={selectedStudent.admissionNumber} isDarkMode={isDarkMode} />
                </div>
            </div>
        );
    }

    // --- Loading ---
    if (isLoading && allStudents.length === 0) return (
        <div className="animate-pulse">
            <div className={`p-10 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4 mb-8">
                    <div className={`w-12 h-12 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                    <div className="space-y-2">
                        <div className={`h-6 w-48 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                        <div className={`h-3 w-64 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                    </div>
                </div>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className={`flex items-center gap-4 py-5 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                        <div className={`w-10 h-10 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                        <div className={`h-4 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                        <div className={`h-4 w-24 rounded-[5px] ml-auto ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                    </div>
                ))}
            </div>
        </div>
    );

    // --- Error ---
    if (error) return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-[5px] flex items-center justify-center mb-6 border border-red-500/20 shadow-2xl shadow-red-500/10">
                <AlertCircle size={40} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">Connection Failed</h3>
            <p className="text-sm font-medium opacity-50 max-w-xs mx-auto mb-8">{error}</p>
            <button onClick={() => loadERPData(true)} className="px-6 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-[5px] font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95">Retry</button>
        </div>
    );

    // --- ERP Unavailable ---
    if (erpUnavailable) return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className={`w-20 h-20 rounded-[5px] flex items-center justify-center mb-6 border shadow-2xl ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-orange-500/10' : 'bg-orange-50 text-orange-500 border-orange-200'}`}>
                <Database size={40} strokeWidth={2} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">ERP Server Waking Up</h3>
            <p className={`text-sm font-medium max-w-sm mx-auto mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                The ERP server is starting up. Wait 30–60 seconds, then click Retry.
            </p>
            <button
                onClick={() => { setErpUnavailable(false); setIsLoading(true); loadERPData(true); }}
                className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-lg shadow-orange-500/30 mt-6"
            >
                <RotateCcw size={14} /> Retry
            </button>
        </div>
    );

    // --- Main View ---
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className={`p-10 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>

                {/* Page Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-500'}`}>
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h1 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Student <span className="text-orange-500">Attendance</span>
                        </h1>
                        <p className={`text-sm font-bold opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Click on a student to view their attendance history • {allStudents.length} students loaded
                        </p>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="mb-8 space-y-4">
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
                                <button onClick={() => setSearchQuery('')} className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all hover:scale-110 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                    <X size={16} className="opacity-50" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-6 py-3 rounded-[5px] text-sm font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${showFilters ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : isDarkMode ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'}`}
                        >
                            <Filter size={16} /> Filters
                            {hasActiveFilters && !showFilters && (
                                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px]">
                                    {(searchQuery ? 1 : 0) + Object.values(filters).filter(val => val.length > 0).length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Filter Dropdowns */}
                    {showFilters && (
                        <div className={`p-6 rounded-[5px] border space-y-4 animate-in slide-in-from-top-2 ${isDarkMode ? 'bg-white/2 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Centre Filter */}
                                <div className="relative">
                                    <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Centre</label>
                                    <MultiSelectDropdown
                                        options={uniqueCentres}
                                        selected={filters.centre}
                                        onChange={(val) => setFilters({ ...filters, centre: val })}
                                        placeholder="All Centres"
                                        isDarkMode={isDarkMode}
                                    />
                                </div>

                                {/* Class Filter */}
                                <div className="relative">
                                    <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Class</label>
                                    <MultiSelectDropdown
                                        options={uniqueClasses}
                                        selected={filters.className}
                                        onChange={(val) => setFilters({ ...filters, className: val })}
                                        placeholder="All Classes"
                                        isDarkMode={isDarkMode}
                                    />
                                </div>

                                {/* Exam Tag Filter */}
                                <div className="relative">
                                    <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Exam Tag</label>
                                    <MultiSelectDropdown
                                        options={uniqueExamTags}
                                        selected={filters.examTag}
                                        onChange={(val) => setFilters({ ...filters, examTag: val })}
                                        placeholder="All Exam Tags"
                                        isDarkMode={isDarkMode}
                                    />
                                </div>

                                {/* Batch Filter */}
                                <div className="relative">
                                    <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Batch / Session</label>
                                    <MultiSelectDropdown
                                        options={uniqueBatches}
                                        selected={filters.batch}
                                        onChange={(val) => setFilters({ ...filters, batch: val })}
                                        placeholder="All Batches"
                                        isDarkMode={isDarkMode}
                                    />
                                </div>

                                {/* Course Filter */}
                                <div className="relative">
                                    <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Course</label>
                                    <MultiSelectDropdown
                                        options={uniqueCourses}
                                        selected={filters.course}
                                        onChange={(val) => setFilters({ ...filters, course: val })}
                                        placeholder="All Courses"
                                        isDarkMode={isDarkMode}
                                    />
                                </div>

                                {/* Status Filter */}
                                <div className="relative">
                                    <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Status</label>
                                    <MultiSelectDropdown
                                        options={uniqueStatuses}
                                        selected={filters.status}
                                        onChange={(val) => setFilters({ ...filters, status: val })}
                                        placeholder="All Statuses"
                                        isDarkMode={isDarkMode}
                                    />
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <div className="flex justify-end pt-2">
                                    <button onClick={clearFilters}
                                        className={`px-4 py-2 rounded-[5px] text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}>
                                        <X size={14} /> Clear All Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {hasActiveFilters && (
                        <div className={`px-4 py-2 rounded-[5px] text-sm font-medium flex items-center gap-2 ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                            <Database size={16} /> Showing {filteredStudents.length} of {allStudents.length} students
                        </div>
                    )}
                </div>

                {/* Student Table */}
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
                                <th className="pb-6 px-4 text-center">Admission #</th>
                                <th className="pb-6 px-4 text-center">Status</th>
                                <th className="pb-6 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {paginatedStudents.length > 0 ? paginatedStudents.map((std, i) => (
                                <tr key={i} className={`group ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-slate-50'} transition-all duration-300 cursor-pointer`} onClick={() => setSelectedStudent(std)}>
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
                                        <div className="text-sm font-black text-orange-500 mb-0.5">{safeStr(std.course?.courseName) || 'Standard Program'}</div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={10} className="opacity-40" />
                                            <span className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">{safeStr(std.centre) || 'Main Campus'}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Mail size={12} className="opacity-30" />
                                            <span className="text-xs font-medium opacity-60 italic whitespace-nowrap">{std.student?.studentsDetails?.[0]?.studentEmail || 'no-email'}</span>
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
                                            onClick={(e) => { e.stopPropagation(); setSelectedStudent(std); }}
                                            className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ml-auto ${isDarkMode ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}
                                        >
                                            <Eye size={12} /> Attendance
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="py-32 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <Database size={48} className="mb-4" />
                                            <p className="font-black uppercase tracking-[0.2em] text-sm">No Records Found</p>
                                            <p className="text-xs mt-1">Try adjusting your search or filters.</p>
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
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Show:</span>
                                <select value={itemsPerPage} onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                    className={`px-4 py-2 rounded-[5px] text-xs font-black border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'}`}>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={30}>30</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>per page</span>
                            </div>

                            <div className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                Showing <span className="text-orange-500 font-black">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                                <span className="text-orange-500 font-black">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of{' '}
                                <span className="text-orange-500 font-black">{filteredStudents.length}</span> records
                                {hasActiveFilters && (
                                    <span className={`ml-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>(filtered from {allStudents.length})</span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <button onClick={() => goToPage(1)} disabled={currentPage === 1}
                                    className={`p-2.5 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                    <ChevronsLeft size={16} />
                                </button>
                                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
                                    className={`p-2.5 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                    <ChevronLeft size={16} />
                                </button>

                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    return (
                                        <button key={pageNum} onClick={() => goToPage(pageNum)}
                                            className={`w-10 h-10 rounded-[5px] text-xs font-black transition-all hover:scale-110 active:scale-95 ${currentPage === pageNum ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
                                    className={`p-2.5 rounded-[5px] transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                    <ChevronRight size={16} />
                                </button>
                                <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
                                    className={`p-2.5 rounded-[5px] transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                    <ChevronsRight size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleJumpToPage} className="flex items-center gap-3">
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Go to:</span>
                                <input type="number" min="1" max={totalPages} value={jumpToPage} onChange={(e) => setJumpToPage(e.target.value)} placeholder={`1-${totalPages}`}
                                    className={`w-20 px-3 py-2 rounded-[5px] text-xs font-black text-center border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                                <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-[5px] text-xs font-black uppercase tracking-wider hover:scale-105 transition-all active:scale-95">Go</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentAttendancePage;
