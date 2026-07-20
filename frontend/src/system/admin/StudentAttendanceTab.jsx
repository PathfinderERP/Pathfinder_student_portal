import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, XCircle, Clock, Calendar, User, BookOpen, MapPin, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';
import MultiSelectDropdown from '../../components/common/MultiSelectDropdown';

const safeStr = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val.name) return val.name;
    return String(val);
};

const StudentAttendanceTab = ({ admissionNumber, isDarkMode }) => {
    const { token, getApiUrl } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [attendanceData, setAttendanceData] = useState([]);
    const [summary, setSummary] = useState({});
    const [expandedRow, setExpandedRow] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Filters
    const [searchTopic, setSearchTopic] = useState('');
    const [chapterFilter, setChapterFilter] = useState([]);
    const [dateFilter, setDateFilter] = useState('');
    const [teacherFilter, setTeacherFilter] = useState([]);
    const [subjectFilter, setSubjectFilter] = useState([]);
    const [topicFilter, setTopicFilter] = useState([]);
    const [statusFilter, setStatusFilter] = useState(['Present', 'Absent']);

    useEffect(() => {
        const fetchAttendance = async () => {
            if (!admissionNumber) return;
            
            try {
                setLoading(true);
                setError(null);
                const apiUrl = getApiUrl();
                const response = await axios.get(`${apiUrl}/api/admin/student-attendance/${admissionNumber}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const resData = response.data;
                // Extract summary stats
                setSummary({
                    totalClasses: resData.totalPreviousClasses || 0,
                    presentCount: resData.presentCount || 0,
                    absentCount: resData.absentCount || 0,
                });

                const data = resData?.data || resData || [];
                setAttendanceData(Array.isArray(data) ? data : [data]);
            } catch (err) {
                console.error("Failed to fetch student attendance:", err);
                setError(err.response?.data?.error || "Failed to load attendance");
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [admissionNumber, getApiUrl, token]);

    const filteredData = React.useMemo(() => {
        return attendanceData.filter(record => {
            if (chapterFilter.length > 0 && !chapterFilter.includes(safeStr(record.chapterName))) return false;
            
            if (dateFilter) {
                try {
                    const recordDate = new Date(record.date).toISOString().split('T')[0];
                    if (recordDate !== dateFilter) return false;
                } catch(e) {
                    // Ignore parsing errors and default to skipping this record if date doesn't match
                    return false;
                }
            }
            
            if (teacherFilter.length > 0 && !teacherFilter.includes(safeStr(record.teacherName))) return false;
            if (subjectFilter.length > 0 && !subjectFilter.includes(safeStr(record.subjectName || record.academicSubjectName))) return false;
            if (topicFilter.length > 0 && (!record.topics || !record.topics.some(t => topicFilter.includes(safeStr(t))))) return false;

            if (statusFilter.length > 0) {
                const status = safeStr(record.attendanceStatus) || 'Not Marked';
                if (!statusFilter.includes(status)) return false;
            }

            if (searchTopic) {
                const query = searchTopic.toLowerCase();
                const topicMatch = record.topics && record.topics.some(t => safeStr(t).toLowerCase().includes(query));
                const subjectMatch = safeStr(record.subjectName || record.academicSubjectName).toLowerCase().includes(query);
                if (!topicMatch && !subjectMatch) return false;
            }
            return true;
        });
    }, [attendanceData, chapterFilter, searchTopic, dateFilter, teacherFilter, subjectFilter, topicFilter, statusFilter]);

    const uniqueChapters = React.useMemo(() => {
        return [...new Set(attendanceData.map(r => safeStr(r.chapterName)).filter(Boolean))].sort();
    }, [attendanceData]);

    const uniqueTeachers = React.useMemo(() => {
        return [...new Set(attendanceData.map(r => safeStr(r.teacherName)).filter(Boolean))].sort();
    }, [attendanceData]);

    const uniqueSubjects = React.useMemo(() => {
        return [...new Set(attendanceData.map(r => safeStr(r.subjectName || r.academicSubjectName)).filter(Boolean))].sort();
    }, [attendanceData]);

    const uniqueTopics = React.useMemo(() => {
        const topics = new Set();
        attendanceData.forEach(r => {
            if (r.topics && Array.isArray(r.topics)) {
                r.topics.forEach(t => {
                    if (t) topics.add(safeStr(t));
                });
            }
        });
        return [...topics].sort();
    }, [attendanceData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading attendance data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`p-6 rounded-[5px] border flex flex-col items-center justify-center py-20 ${isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                <p className="text-red-500 font-bold mb-2">Error</p>
                <p className={`text-sm text-center ${isDarkMode ? 'text-red-400/80' : 'text-red-600/80'}`}>{error}</p>
            </div>
        );
    }

    if (!attendanceData || attendanceData.length === 0) {
        return (
            <div className={`p-6 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                No attendance history found for this student.
            </div>
        );
    }

    const attendanceRate = summary.totalClasses > 0 
        ? ((summary.presentCount / (summary.presentCount + summary.absentCount)) * 100).toFixed(1) 
        : 0;
        
    const notMarkedCount = Math.max(0, summary.totalClasses - (summary.presentCount + summary.absentCount));

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Total Classes</p>
                    <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{summary.totalClasses}</p>
                </div>
                <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Present</p>
                    <p className="text-2xl font-black text-emerald-500">{summary.presentCount}</p>
                </div>
                <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-red-500/5 border-red-500/10' : 'bg-red-50 border-red-200'}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1">Absent</p>
                    <p className="text-2xl font-black text-red-500">{summary.absentCount}</p>
                </div>
                <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-yellow-500/5 border-yellow-500/10' : 'bg-yellow-50 border-yellow-200'}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500 mb-1">Not Marked</p>
                    <p className="text-2xl font-black text-yellow-500">{notMarkedCount}</p>
                </div>
                <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-orange-500/5 border-orange-500/10' : 'bg-orange-50 border-orange-200'}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-1">Attendance Rate</p>
                    <p className="text-2xl font-black text-orange-500">{attendanceRate}%</p>
                </div>
            </div>

            {/* Attendance Table Controls */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2">
                        <Calendar size={14} className="text-orange-500" /> Attendance History ({filteredData.length} records)
                    </h3>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={14} />
                            <input
                                type="text"
                                placeholder="Search topics or subject..."
                                value={searchTopic}
                                onChange={(e) => { setSearchTopic(e.target.value); setCurrentPage(1); setExpandedRow(null); }}
                                className={`w-full pl-9 pr-3 py-2 rounded-[5px] text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                            />
                        </div>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); setExpandedRow(null); }}
                            className={`w-full sm:w-40 px-3 py-2 rounded-[5px] text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                            style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                        />
                    </div>
                </div>

                {/* Advanced Filters */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <div className="relative">
                        <MultiSelectDropdown
                            options={['Present', 'Absent', 'Not Marked']}
                            selected={statusFilter}
                            onChange={(val) => { setStatusFilter(val); setCurrentPage(1); setExpandedRow(null); }}
                            placeholder="All Statuses"
                            isDarkMode={isDarkMode}
                        />
                    </div>
                    <div className="relative">
                        <MultiSelectDropdown
                            options={uniqueSubjects}
                            selected={subjectFilter}
                            onChange={(val) => { setSubjectFilter(val); setCurrentPage(1); setExpandedRow(null); }}
                            placeholder="All Subjects"
                            isDarkMode={isDarkMode}
                        />
                    </div>
                    <div className="relative">
                        <MultiSelectDropdown
                            options={uniqueTeachers}
                            selected={teacherFilter}
                            onChange={(val) => { setTeacherFilter(val); setCurrentPage(1); setExpandedRow(null); }}
                            placeholder="All Teachers"
                            isDarkMode={isDarkMode}
                        />
                    </div>
                    <div className="relative">
                        <MultiSelectDropdown
                            options={uniqueChapters}
                            selected={chapterFilter}
                            onChange={(val) => { setChapterFilter(val); setCurrentPage(1); setExpandedRow(null); }}
                            placeholder="All Chapters"
                            isDarkMode={isDarkMode}
                        />
                    </div>
                    <div className="relative">
                        <MultiSelectDropdown
                            options={uniqueTopics}
                            selected={topicFilter}
                            onChange={(val) => { setTopicFilter(val); setCurrentPage(1); setExpandedRow(null); }}
                            placeholder="All Topics"
                            isDarkMode={isDarkMode}
                        />
                    </div>
                </div>
            </div>
            
            <div className={`overflow-x-auto border rounded-[5px] ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <table className="w-full text-sm text-left">
                    <thead className={`font-bold uppercase text-[10px] tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                        <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Class</th>
                            <th className="px-4 py-3">Subject</th>
                            <th className="px-4 py-3">Teacher</th>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3 text-center">Mode</th>
                            <th className="px-4 py-3 text-center">Attendance</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                        {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((record, idx) => {
                            const globalIdx = (currentPage - 1) * itemsPerPage + idx;
                            return (
                            <React.Fragment key={globalIdx}>
                                <tr className={`transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}
                                    onClick={() => setExpandedRow(expandedRow === globalIdx ? null : globalIdx)}>
                                    {/* Date */}
                                    <td className="px-4 py-3 font-bold whitespace-nowrap">
                                        {record.date ? new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                    </td>
                                    {/* Class */}
                                    <td className="px-4 py-3">
                                        <span className="font-bold">{safeStr(record.className) || 'N/A'}</span>
                                        {record.academicClassName && (
                                            <span className={`block text-[9px] font-bold uppercase tracking-widest opacity-40`}>Class {record.academicClassName}</span>
                                        )}
                                    </td>
                                    {/* Subject */}
                                    <td className="px-4 py-3">
                                        <span className="text-orange-500 font-bold">{safeStr(record.subjectName) || safeStr(record.academicSubjectName) || 'N/A'}</span>
                                    </td>
                                    {/* Teacher */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <User size={12} className="opacity-30" />
                                            <span className="font-medium text-xs">{safeStr(record.teacherName) || 'N/A'}</span>
                                        </div>
                                    </td>
                                    {/* Time */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={12} className="opacity-30" />
                                            <span className="text-xs font-medium">{record.startTime || '-'} – {record.endTime || '-'}</span>
                                        </div>
                                    </td>
                                    {/* Mode */}
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                            record.classMode === 'Online'
                                                ? 'bg-blue-500/10 text-blue-500'
                                                : record.classMode === 'Offline'
                                                    ? 'bg-purple-500/10 text-purple-500'
                                                    : 'bg-slate-500/10 text-slate-500'
                                        }`}>
                                            {safeStr(record.classMode) || '-'}
                                        </span>
                                    </td>
                                    {/* Attendance Status */}
                                    <td className="px-4 py-3 text-center">
                                        {record.attendanceStatus === 'Present' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                                                <CheckCircle2 size={11} /> Present
                                            </span>
                                        ) : record.attendanceStatus === 'Absent' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest">
                                                <XCircle size={11} /> Absent
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-[9px] font-black uppercase tracking-widest">
                                                {safeStr(record.attendanceStatus) || 'Not Marked'}
                                            </span>
                                        )}
                                    </td>
                                    {/* Class Status */}
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                            record.status === 'Completed'
                                                ? 'bg-emerald-500/10 text-emerald-500'
                                                : record.status === 'Scheduled'
                                                    ? 'bg-blue-500/10 text-blue-500'
                                                    : 'bg-slate-500/10 text-slate-500'
                                        }`}>
                                            {safeStr(record.status) || '-'}
                                        </span>
                                    </td>
                                    {/* Expand */}
                                    <td className="px-4 py-3 text-center">
                                        {expandedRow === idx ? <ChevronUp size={14} className="opacity-40" /> : <ChevronDown size={14} className="opacity-40" />}
                                    </td>
                                </tr>

                                {/* Expanded Detail Row */}
                                {expandedRow === globalIdx && (
                                    <tr className={`${isDarkMode ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
                                        <td colSpan="9" className="px-6 py-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Chapter */}
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Chapter</p>
                                                    <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                        {safeStr(record.chapterName) || 'N/A'}
                                                    </p>
                                                </div>
                                                {/* Topics */}
                                                <div className="md:col-span-2">
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Topics Covered</p>
                                                    {record.topics && record.topics.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {record.topics.map((topic, tIdx) => (
                                                                <span key={tIdx} className={`px-2 py-1 rounded-[5px] text-xs font-medium ${isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-700 border border-slate-200'}`}>
                                                                    {safeStr(topic)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm opacity-50">No topics listed</p>
                                                    )}
                                                </div>
                                                {/* Attendance Marked Date */}
                                                {record.attendanceMarkedDate && (
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Marked On</p>
                                                        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                            {new Date(record.attendanceMarkedDate).toLocaleString('en-IN')}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {(() => {
                const totalPages = Math.ceil(filteredData.length / itemsPerPage);
                if (totalPages <= 1 && filteredData.length > 0) return null;
                if (filteredData.length === 0) return (
                    <div className="py-8 text-center text-slate-500">No records found matching your filters.</div>
                );
                return (
                    <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            {/* Items per page + info */}
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Show:</span>
                                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); setExpandedRow(null); }}
                                    className={`px-3 py-1.5 rounded-[5px] text-xs font-black border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Showing <span className="text-orange-500 font-black">{((currentPage - 1) * itemsPerPage) + 1}</span> – <span className="text-orange-500 font-black">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="text-orange-500 font-black">{filteredData.length}</span>
                                </span>
                            </div>

                            {/* Page buttons */}
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => { setCurrentPage(1); setExpandedRow(null); }} disabled={currentPage === 1}
                                    className={`p-2 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                    <ChevronsLeft size={14} />
                                </button>
                                <button onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); setExpandedRow(null); }} disabled={currentPage === 1}
                                    className={`p-2 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                    <ChevronLeft size={14} />
                                </button>

                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;
                                    return (
                                        <button key={pageNum} onClick={() => { setCurrentPage(pageNum); setExpandedRow(null); }}
                                            className={`w-8 h-8 rounded-[5px] text-xs font-black transition-all hover:scale-110 active:scale-95 ${currentPage === pageNum ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); setExpandedRow(null); }} disabled={currentPage === totalPages}
                                    className={`p-2 rounded-[5px] transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                    <ChevronRight size={14} />
                                </button>
                                <button onClick={() => { setCurrentPage(totalPages); setExpandedRow(null); }} disabled={currentPage === totalPages}
                                    className={`p-2 rounded-[5px] transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                    <ChevronsRight size={14} />
                                </button>
                            </div>

                            {/* Jump to page */}
                            <form onSubmit={(e) => { e.preventDefault(); const p = parseInt(e.target.jumpPage.value); if (p >= 1 && p <= totalPages) { setCurrentPage(p); setExpandedRow(null); e.target.jumpPage.value = ''; } }} className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Go to:</span>
                                <input name="jumpPage" type="number" min="1" max={totalPages} placeholder={`1-${totalPages}`}
                                    className={`w-20 px-3 py-1.5 rounded-[5px] text-xs font-black text-center border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                                <button type="submit" className="px-3 py-1.5 bg-orange-500 text-white rounded-[5px] text-xs font-black uppercase tracking-wider hover:scale-105 transition-all active:scale-95">Go</button>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default StudentAttendanceTab;
