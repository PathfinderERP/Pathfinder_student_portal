import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
    Search, Filter, ChevronLeft, ChevronRight, Activity, Clock, FileText, RotateCcw,
    MonitorPlay, Download, RefreshCw, CheckCircle2, Timer
} from 'lucide-react';
import MultiSelectDropdown from '../../components/common/MultiSelectDropdown';

const formatTime = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
};

const StudentActivity = ({ studentsData = [], isERPLoading, isDarkMode, onRefresh }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        course: [],
        status: [],
        centre: [],
        className: [],
        examTag: []
    });
    const [showFilters, setShowFilters] = useState(false);

    // Auth and Activity Loading
    const { token, getApiUrl } = useAuth();
    const [activityData, setActivityData] = useState({});
    const [loadingActivity, setLoadingActivity] = useState({});

    const loadActivity = async (student) => {
        const admissionNumber = student.admissionNumber;
        const erpId = student.student?._id || student._id;
        if (!admissionNumber) return;

        setLoadingActivity(prev => ({ ...prev, [admissionNumber]: true }));
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/admin/student-activity-summary/${admissionNumber}/`, {
                params: { erp_id: erpId },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setActivityData(prev => ({ ...prev, [admissionNumber]: response.data }));
        } catch (error) {
            console.error('Failed to load activity:', error);
        } finally {
            setLoadingActivity(prev => ({ ...prev, [admissionNumber]: false }));
        }
    };

    const loadAllDisplayedActivity = () => {
        displayedStudents.forEach(student => {
            if (!activityData[student.admissionNumber] && !loadingActivity[student.admissionNumber]) {
                loadActivity(student);
            }
        });
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    const activeStudents = useMemo(() => {
        return studentsData.filter(student => {
            const name = student.student?.studentsDetails?.[0]?.studentName || student.studentName;
            return name && name.trim() !== '';
        });
    }, [studentsData]);

    const extractExamTag = (s) => {
        let val = s.exam_tag || s.student?.studentsDetails?.[0]?.targetExam || s.target_exam || s.targetExam || s.examTag;
        if (val && typeof val === 'object') {
            val = val.examName || val.name || val.targetExamName || val.title || val.exam_name;
        }
        if (typeof val === 'string' && val.length === 24) {
             val = s.exam_tag_name || s.student?.studentsDetails?.[0]?.targetExamName || val;
        }
        return val ? String(val) : null;
    };

    const filteredStudents = useMemo(() => {
        return activeStudents.filter(student => {
            const name = (student.student?.studentsDetails?.[0]?.studentName || student.studentName || '').toLowerCase();
            const email = (student.student?.studentsDetails?.[0]?.studentEmail || '').toLowerCase();
            const mobile = (student.student?.studentsDetails?.[0]?.mobileNum || '').toLowerCase();
            const admissionNumber = (student.admissionNumber || '').toLowerCase();
            const courseName = student.course?.courseName || '';
            const centerName = student.centre || '';
            const status = student.admissionStatus || '';
            const className = student.class?.name || student.student?.studentsDetails?.[0]?.className || student.class || '';
            const examTag = extractExamTag(student) || '';

            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                name.includes(searchLower) ||
                email.includes(searchLower) ||
                mobile.includes(searchLower) ||
                admissionNumber.includes(searchLower);

            const matchesCourse = filters.course.length === 0 || filters.course.includes(courseName);
            const matchesCentre = filters.centre.length === 0 || filters.centre.includes(centerName);
            const matchesStatus = filters.status.length === 0 || filters.status.includes(status);
            const matchesClass = filters.className.length === 0 || filters.className.includes(className);
            const matchesExamTag = filters.examTag.length === 0 || filters.examTag.includes(examTag);

            return matchesSearch && matchesCourse && matchesCentre && matchesStatus && matchesClass && matchesExamTag;
        });
    }, [activeStudents, searchQuery, filters]);

    // Unique values for filters
    const uniqueCourses = useMemo(() => [...new Set(activeStudents.map(s => s.course?.courseName ? String(s.course.courseName) : null).filter(Boolean))], [activeStudents]);
    const uniqueCentres = useMemo(() => [...new Set(activeStudents.map(s => s.centre ? String(s.centre) : null).filter(Boolean))], [activeStudents]);
    const uniqueClasses = useMemo(() => [...new Set(activeStudents.map(s => {
        let val = s.class?.name || s.student?.studentsDetails?.[0]?.className || s.class;
        if (val && typeof val === 'object') val = val.name || val.className;
        return val ? String(val) : null;
    }).filter(Boolean))], [activeStudents]);
    
    const uniqueExamTags = useMemo(() => [...new Set(activeStudents.map(extractExamTag).filter(Boolean))], [activeStudents]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const displayedStudents = useMemo(() => {
        const startIdx = (currentPage - 1) * itemsPerPage;
        return filteredStudents.slice(startIdx, startIdx + itemsPerPage);
    }, [filteredStudents, currentPage, itemsPerPage]);

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({ course: [], status: [], centre: [], className: [], examTag: [] });
        setSearchQuery('');
        setCurrentPage(1);
    };

    if (isERPLoading && activeStudents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                <p className="text-slate-500">Loading student data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className={`rounded-[5px] border p-6 shadow-sm ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                    <div>
                        <h2 className={`text-2xl font-black uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            Student <span className="text-orange-500">Activity</span>
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Consolidated activity data for all students
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 border rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'}`}
                            />
                        </div>
                        <button
                            onClick={loadAllDisplayedActivity}
                            title="Load Activity for Current Page"
                            className={`p-2 rounded-[5px] border transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500/20' : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100'}`}
                        >
                            <Download size={18} />
                        </button>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 rounded-[5px] border transition-colors ${showFilters ? 'bg-orange-500 border-orange-500 text-white' : (isDarkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')}`}
                        >
                            <Filter size={18} />
                        </button>
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                disabled={isERPLoading}
                                className={`p-2 rounded-[5px] border transition-all ${isERPLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                                title="Hard Refresh ERP Data"
                            >
                                <RefreshCw size={18} className={isERPLoading ? 'animate-spin' : ''} />
                            </button>
                        )}
                    </div>
                </div>

                {showFilters && (
                    <div className={`grid grid-cols-1 md:grid-cols-6 gap-4 p-4 mb-6 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <div>
                            <label className={`block text-xs font-bold mb-1 uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Class</label>
                            <MultiSelectDropdown
                                options={uniqueClasses}
                                selected={filters.className}
                                onChange={(val) => { setFilters(p => ({ ...p, className: val })); setCurrentPage(1); }}
                                placeholder="All Classes"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold mb-1 uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Exam Tag</label>
                            <MultiSelectDropdown
                                options={uniqueExamTags}
                                selected={filters.examTag}
                                onChange={(val) => { setFilters(p => ({ ...p, examTag: val })); setCurrentPage(1); }}
                                placeholder="All Exam Tags"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold mb-1 uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Centre</label>
                            <MultiSelectDropdown
                                options={uniqueCentres}
                                selected={filters.centre}
                                onChange={(val) => { setFilters(p => ({ ...p, centre: val })); setCurrentPage(1); }}
                                placeholder="All Centres"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold mb-1 uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Course</label>
                            <MultiSelectDropdown
                                options={uniqueCourses}
                                selected={filters.course}
                                onChange={(val) => { setFilters(p => ({ ...p, course: val })); setCurrentPage(1); }}
                                placeholder="All Courses"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold mb-1 uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status</label>
                            <MultiSelectDropdown
                                options={['ACTIVE', 'INACTIVE', 'PENDING']}
                                selected={filters.status}
                                onChange={(val) => { setFilters(p => ({ ...p, status: val })); setCurrentPage(1); }}
                                placeholder="All Status"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <RotateCcw size={16} /> Clear Filters
                            </button>
                        </div>
                    </div>
                )}

                <div className={`overflow-x-auto border-x border-t rounded-t-[5px] ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <table className="w-full text-sm text-left">
                        <thead className={`font-bold uppercase text-xs ${isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            <tr>
                                <th className="px-4 py-3">Student</th>
                                <th className="px-4 py-3">Course / Centre</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center">App Logins</th>
                                <th className="px-4 py-3 text-center">Videos Watched</th>
                                <th className="px-4 py-3 text-center">Tests Taken</th>
                                <th className="px-4 py-3 text-center">Attendance</th>
                                <th className="px-4 py-3 text-center">Study Time</th>
                                <th className="px-4 py-3 text-right">Last Active</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                            {displayedStudents.length > 0 ? (
                                displayedStudents.map((student, idx) => (
                                    <tr key={student.id || idx} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        <td className="px-4 py-3">
                                            <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.student?.studentsDetails?.[0]?.studentName || student.studentName || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500">
                                                {student.admissionNumber ? <span className="font-semibold text-orange-500/80">#{student.admissionNumber}</span> : ''}
                                                {student.admissionNumber ? ' • ' : ''}
                                                {student.student?.studentsDetails?.[0]?.mobileNum || student.student?.studentsDetails?.[0]?.studentEmail || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className={`font-medium text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{student.course?.courseName || 'N/A'}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wide">{student.centre || 'N/A'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${student.admissionStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {student.admissionStatus || 'N/A'}
                                            </span>
                                        </td>
                                        {activityData[student.admissionNumber] ? (
                                            <>
                                                <td className="px-4 py-3 text-center">
                                                    <div className={`inline-flex items-center justify-center gap-1.5 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        <Activity size={14} className="text-blue-500" title="App Logins" />
                                                        <span>{activityData[student.admissionNumber].loginCount || 0}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className={`inline-flex items-center justify-center gap-1.5 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        <MonitorPlay size={14} className="text-purple-500" title="Videos Watched" />
                                                        <span>{activityData[student.admissionNumber].videosWatched || 0}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className={`inline-flex items-center justify-center gap-1.5 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        <FileText size={14} className="text-orange-500" title="Tests Taken" />
                                                        <span>{activityData[student.admissionNumber].testsTaken || 0}/{activityData[student.admissionNumber].testsTotal || 0}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className={`inline-flex items-center justify-center gap-1.5 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        <CheckCircle2 size={14} className="text-emerald-500" title="Attendance" />
                                                        <span>{activityData[student.admissionNumber].attendanceTotal ? `${activityData[student.admissionNumber].attendancePresent}/${activityData[student.admissionNumber].attendanceTotal}` : '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className={`inline-flex items-center justify-center gap-1.5 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        <Timer size={14} className="text-teal-500" title="Study Time" />
                                                        <span>{formatTime(activityData[student.admissionNumber].totalStudyTimeSeconds)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="inline-flex items-center justify-end gap-1.5 text-xs text-slate-500 w-full">
                                                        <Clock size={12} title="Last Active" />
                                                        <span>{activityData[student.admissionNumber].lastActive ? new Date(activityData[student.admissionNumber].lastActive).toLocaleDateString() : 'Never'}</span>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <td colSpan="6" className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => loadActivity(student)}
                                                    disabled={loadingActivity[student.admissionNumber]}
                                                    className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all w-full max-w-[150px] mx-auto flex items-center justify-center gap-2 ${loadingActivity[student.admissionNumber] ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${isDarkMode ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}
                                                >
                                                    {loadingActivity[student.admissionNumber] ? (
                                                        <div className="w-3 h-3 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                                                    ) : (
                                                        <Download size={12} />
                                                    )}
                                                    {loadingActivity[student.admissionNumber] ? 'Loading...' : 'Load Activity'}
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className={`px-4 py-8 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        No student activity data found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className={`flex flex-col md:flex-row justify-between items-center gap-4 mt-4 p-4 border border-t-0 rounded-b-[5px] ${isDarkMode ? 'border-white/10 bg-[#10141D]' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredStudents.length)} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} entries
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className={`p-1.5 text-sm border rounded-[5px] focus:outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                        >
                            <option value={50}>50 / page</option>
                            <option value={100}>100 / page</option>
                            <option value={500}>500 / page</option>
                        </select>

                        <div className="flex items-center gap-1 mx-2">
                            <span className={`text-xs font-medium mr-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Go to</span>
                            <input
                                type="number"
                                min="1"
                                max={totalPages || 1}
                                value={currentPage}
                                onChange={(e) => {
                                    let page = parseInt(e.target.value);
                                    if (!isNaN(page)) {
                                        if (page < 1) page = 1;
                                        if (page > (totalPages || 1)) page = totalPages || 1;
                                        setCurrentPage(page);
                                    }
                                }}
                                className={`w-14 p-1.5 text-sm border rounded-[5px] text-center focus:outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50' : 'bg-white border-slate-200 text-slate-800 focus:border-orange-400'}`}
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`p-1.5 rounded-[5px] border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-3 py-1 text-sm font-bold bg-orange-500/10 text-orange-500 rounded-[5px]">
                                {currentPage} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className={`p-1.5 rounded-[5px] border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentActivity;
