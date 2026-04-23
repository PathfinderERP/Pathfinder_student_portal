import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileSearch, Search, RefreshCw, Users, BarChart3, FileText, Eye, ChevronLeft, ChevronRight, Filter, Layers, Loader2, Zap, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import QuestionAnalysis from './QuestionAnalysis';
import QuestionStudentAnalysis from './QuestionStudentAnalysis';
import TestResultStudents from './TestResultStudents';

const TestResult = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [testFilter, setTestFilter] = useState('all');
    const [selectedSession, setSelectedSession] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAnalysisTest, setSelectedAnalysisTest] = useState(null); // { id, name }
    const [selectedStudentVsQuestionTest, setSelectedStudentVsQuestionTest] = useState(null); // { id, name }
    const [selectedTestForResult, setSelectedTestForResult] = useState(null);
    const [togglingStatusId, setTogglingStatusId] = useState(null);
    const [isAutoRefresh, setIsAutoRefresh] = useState(true);
    const [testToForcePublish, setTestToForcePublish] = useState(null); // For custom modal

    const fetchTests = async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/tests/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data;
            const testList = Array.isArray(data) ? data : (data.results || []);
            setTests(testList);
        } catch (err) {
            console.error('Error fetching tests:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTests();
    }, []);

    // Smart Auto-Refresh logic to fulfill "update automatically when more student gave the exam"
    useEffect(() => {
        if (!isAutoRefresh || isLoading) return;
        const interval = setInterval(() => {
            fetchTests();
        }, 30000); // 30 seconds
        return () => clearInterval(interval);
    }, [isAutoRefresh, isLoading]);

    const sessions = useMemo(() => {
        const unique = Array.from(new Set(tests.map(t => t.session_details?.name).filter(Boolean)));
        return unique.sort();
    }, [tests]);

    const filteredTests = useMemo(() => {
        return tests.filter(test => {
            const matchesSearch = test.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                test.code?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = testFilter === 'all' ||
                (testFilter === 'completed' && test.is_completed) ||
                (testFilter === 'in_progress' && !test.is_completed);

            const matchesSession = selectedSession === 'all' ||
                test.session_details?.name === selectedSession;

            return matchesSearch && matchesStatus && matchesSession;
        });
    }, [tests, searchTerm, testFilter, selectedSession]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, testFilter, selectedSession]);

    const pageCount = Math.ceil(filteredTests.length / itemsPerPage);
    const currentTests = filteredTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Drag to Scroll Logic
    const tableContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - tableContainerRef.current.offsetLeft);
        setScrollLeft(tableContainerRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - tableContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        tableContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleReleaseResult = async (test) => {
        try {
            setTogglingStatusId(test.id);
            const apiUrl = getApiUrl();
            const newStatus = !test.is_result_published;
            await axios.patch(`${apiUrl}/api/tests/${test.id}/`, {
                is_result_published: newStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update local state
            setTests(tests.map(t => t.id === test.id ? { ...t, is_result_published: newStatus } : t));
        } catch (err) {
            console.error('Error toggling release result:', err);
        } finally {
            setTogglingStatusId(null);
        }
    };

    const handleForcePublishAction = async (test) => {
        if (!test) return;
        setTestToForcePublish(null); // Close modal

        try {
            setTogglingStatusId(test.id);
            const apiUrl = getApiUrl();
            const res = await axios.post(`${apiUrl}/api/tests/${test.id}/force_publish/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local state with the new values from backend
            setTests(tests.map(t => t.id === test.id ? {
                ...t,
                is_completed: true,
                is_result_published: true
            } : t));
        } catch (err) {
            console.error('Error force publishing result:', err);
            alert(err.response?.data?.error || 'Failed to force publish.');
        } finally {
            setTogglingStatusId(null);
        }
    };

    const handleForcePublish = (test) => {
        setTestToForcePublish(test);
    };

    const handleQuestionAnalysis = (testId, testName) => {
        setSelectedAnalysisTest({ id: testId, name: testName });
    };

    const handleQuestionVsStudentAnalysis = (testId, testName) => {
        setSelectedStudentVsQuestionTest({ id: testId, name: testName });
    };

    const handleShowStudentResponses = (test) => {
        setSelectedTestForResult(test);
    };

    // ── If analysis mode is active, show it instead of the list ──
    if (selectedAnalysisTest) {
        return (
            <QuestionAnalysis
                testId={selectedAnalysisTest.id}
                testName={selectedAnalysisTest.name}
                onBack={() => setSelectedAnalysisTest(null)}
            />
        );
    }

    // ── If student vs question analysis mode is active ──
    if (selectedStudentVsQuestionTest) {
        return (
            <QuestionStudentAnalysis
                testId={selectedStudentVsQuestionTest.id}
                testName={selectedStudentVsQuestionTest.name}
                onBack={() => setSelectedStudentVsQuestionTest(null)}
            />
        );
    }

    if (selectedTestForResult) {
        return (
            <TestResultStudents
                test={selectedTestForResult}
                onBack={() => setSelectedTestForResult(null)}
            />
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className={`p-8 rounded-[5px] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                            Test <span className="text-orange-500">Result List</span>
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Manage test results, analysis, and student responses
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or code"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`pl-10 pr-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-4 w-64 ${isDarkMode ? 'bg-white/5 border-white/10 focus:ring-blue-500/10' : 'bg-slate-50 border-slate-200 focus:ring-blue-500/5'}`}
                            />
                        </div>

                        {/* Session Filter */}
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                <Layers size={16} />
                            </div>
                            <select
                                value={selectedSession}
                                onChange={(e) => setSelectedSession(e.target.value)}
                                className={`px-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-4 ${isDarkMode ? 'bg-[#10141D] border-white/10 focus:ring-purple-500/10' : 'bg-white border-slate-200 focus:ring-purple-500/5'}`}
                            >
                                <option value="all" className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>All Sessions</option>
                                {sessions.map(s => <option key={s} value={s} className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>{s}</option>)}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                <Filter size={16} />
                            </div>
                            <select
                                value={testFilter}
                                onChange={(e) => setTestFilter(e.target.value)}
                                className={`px-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-4 ${isDarkMode ? 'bg-[#10141D] border-white/10 focus:ring-green-500/10' : 'bg-white border-slate-200 focus:ring-green-500/5'}`}
                            >
                                <option value="all" className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>Every Result</option>
                                <option value="completed" className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>Completed Only</option>
                                <option value="in_progress" className={isDarkMode ? 'bg-[#10141D]' : 'bg-white'}>Processing / Ready</option>
                            </select>
                        </div>

                        {/* Auto-Sync Toggle */}
                        <div className="flex items-center gap-2 group">
                            <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity duration-300 ${isAutoRefresh ? 'text-green-500' : 'opacity-40'}`}>
                                {isAutoRefresh ? 'Auto-Sync ON' : 'Auto-Sync OFF'}
                            </span>
                            <button
                                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                                className={`w-10 h-5 rounded-full p-1 transition-all duration-300 relative ${isAutoRefresh ? 'bg-green-500 shadow-lg shadow-green-500/20' : 'bg-slate-300'}`}
                            >
                                <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${isAutoRefresh ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <button
                            onClick={fetchTests}
                            className={`p-3 rounded-[5px] border transition-all active:rotate-180 duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 text-blue-400' : 'bg-white border-slate-200 text-blue-500 hover:bg-blue-50'}`}
                        >
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div
                    ref={tableContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className={`overflow-x-auto ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                <th className="py-5 px-6">#</th>
                                <th className="py-5 px-6">Test Name</th>
                                <th className="py-5 px-6">Test Code</th>
                                <th className="py-5 px-6 text-center">No Of Student Attempted</th>
                                <th className="py-5 px-6 text-center">Release Result</th>
                                <th className="py-5 px-6 text-center">QuestionWise Analysis</th>
                                <th className="py-5 px-6 text-center">Question VS Student Analysis</th>
                                <th className="py-5 px-6 text-center">Show Students Responses</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="8" className="py-8 px-6">
                                            <div className={`h-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                        </td>
                                    </tr>
                                ))
                            ) : currentTests.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-20 text-center">
                                        <div className="opacity-20 flex flex-col items-center gap-3">
                                            <FileSearch size={48} />
                                            <p className="text-sm font-black uppercase tracking-[0.2em]">No Tests Found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentTests.map((test, index) => (
                                <tr key={test.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-blue-50/30'}`}>
                                    <td className={`py-5 px-6 text-xs font-black ${isDarkMode ? 'opacity-30 text-white' : 'text-slate-500 opacity-90'}`}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            <span className={`text-xs font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{test.name}</span>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-500/5 whitespace-nowrap ${isDarkMode ? 'opacity-40 text-slate-400' : 'text-slate-600 opacity-80'}`}>{test.session_details?.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="px-3 py-1.5 bg-purple-500/10 text-purple-500 rounded-[5px] text-xs font-bold font-mono tracking-widest border border-purple-500/20">
                                            {test.code}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Users size={14} className="text-orange-500" />
                                            <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{test.total_students || 0}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        {test.is_completed ? (
                                            <button
                                                onClick={() => handleReleaseResult(test)}
                                                disabled={togglingStatusId === test.id}
                                                className={`relative w-14 h-7 rounded-full p-1 transition-all duration-300 overflow-hidden ${togglingStatusId === test.id ? 'bg-slate-400 opacity-50' :
                                                        test.is_result_published ? 'bg-pink-500 shadow-lg shadow-pink-500/20' : 'bg-slate-300'
                                                    }`}
                                            >
                                                {togglingStatusId === test.id ? (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Loader2 size={14} className="animate-spin text-white" />
                                                    </div>
                                                ) : (
                                                    <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm ${test.is_result_published ? 'translate-x-7' : 'translate-x-0'}`} />
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleForcePublish(test)}
                                                disabled={togglingStatusId === test.id}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all mx-auto bg-linear-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95`}
                                            >
                                                {togglingStatusId === test.id ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                    <Zap size={12} fill="currentColor" />
                                                )}
                                                Force
                                            </button>
                                        )}
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleQuestionAnalysis(test.id, test.name)}
                                            disabled={!test.is_completed}
                                            className={`px-3.5 py-1.5 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-1.5 mx-auto ${test.is_completed
                                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20 active:scale-95'
                                                    : 'bg-slate-300 dark:bg-white/5 text-slate-500 dark:text-slate-500 cursor-not-allowed shadow-none'
                                                }`}
                                        >
                                            <BarChart3 size={11} /> <span className="hidden sm:inline">Question Analysis</span><span className="sm:hidden">Q. Analysis</span>
                                        </button>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleQuestionVsStudentAnalysis(test.id, test.name)}
                                            disabled={!test.is_completed}
                                            className={`px-3.5 py-1.5 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-1.5 mx-auto ${test.is_completed
                                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20 active:scale-95'
                                                    : 'bg-slate-300 dark:bg-white/5 text-slate-500 dark:text-slate-500 cursor-not-allowed shadow-none'
                                                }`}
                                        >
                                            <BarChart3 size={11} /> <span className="hidden sm:inline">Analysis</span><span className="sm:hidden">Analy.</span>
                                        </button>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleShowStudentResponses(test)}
                                            disabled={!test.is_completed}
                                            className={`px-3.5 py-1.5 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-1.5 mx-auto ${test.is_completed
                                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20 active:scale-95'
                                                    : 'bg-slate-300 dark:bg-white/5 text-slate-500 dark:text-slate-500 cursor-not-allowed shadow-none'
                                                }`}
                                        >
                                            <Eye size={11} /> Students
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {filteredTests.length > 0 && (
                    <div className={`px-8 py-5 border-t flex flex-col sm:flex-row justify-between items-center gap-6 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>Rows per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className={`bg-transparent text-xs font-black outline-none cursor-pointer ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                                >
                                    {[5, 10, 20, 50].map(val => <option key={val} value={val} className={isDarkMode ? 'bg-[#0F131A]' : 'bg-white'}>{val}</option>)}
                                </select>
                            </div>
                            <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                                Showing <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{(currentPage - 1) * itemsPerPage + 1}</span> to <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{Math.min(currentPage * itemsPerPage, filteredTests.length)}</span> of <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{filteredTests.length}</span> results
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className={`px-3 py-2 rounded-[5px] text-[10px] font-black uppercase transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                            >
                                First
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={`p-2 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex items-center gap-1 mx-2">
                                {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                                    let pageNum;
                                    if (pageCount <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= pageCount - 2) pageNum = pageCount - 4 + i;
                                    else pageNum = currentPage - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 rounded-[5px] text-xs font-black transition-all ${currentPage === pageNum ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : `hover:bg-orange-500/10 ${isDarkMode ? 'text-slate-400' : 'text-slate-50'}`}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                                disabled={currentPage === pageCount}
                                className={`p-2 rounded-[5px] transition-all ${currentPage === pageCount ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                            >
                                <ChevronRight size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(pageCount)}
                                disabled={currentPage === pageCount}
                                className={`px-3 py-2 rounded-[5px] text-[10px] font-black uppercase transition-all ${currentPage === pageCount ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                            >
                                Last
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Force Publish Confirmation Modal */}
            {testToForcePublish && (
                <div className="fixed inset-0 z-999 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        onClick={() => setTestToForcePublish(null)}
                    />

                    <div className={`relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 ${isDarkMode ? 'bg-[#0F131A] border border-white/10' : 'bg-white border border-slate-200'} shadow-orange-500/10`}>
                        {/* Header Gradient Strip */}
                        <div className="h-2 bg-linear-to-r from-orange-500 via-pink-500 to-purple-600" />

                        <div className="p-8">
                            <div className="flex items-start justify-between mb-8">
                                <div className="p-4 bg-orange-500/20 rounded-2xl">
                                    <ShieldAlert size={32} className="text-orange-500" strokeWidth={2.5} />
                                </div>
                                <button
                                    onClick={() => setTestToForcePublish(null)}
                                    className={`p-2 rounded-full transition-all hover:rotate-90 ${isDarkMode ? 'hover:bg-white/10 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 mb-10">
                                <h3 className={`text-2xl font-black uppercase tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    Confirm <span className="text-orange-500">Force Publish</span>
                                </h3>
                                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-white/2 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                    <p className="text-sm font-bold leading-relaxed">
                                        Are you sure you want to release results for <span className={`${isDarkMode ? 'text-white' : 'text-slate-900'} underline decoration-orange-500/50 underline-offset-4`}>{testToForcePublish.name}</span>?
                                    </p>
                                    <div className="mt-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                            Immediate Student Access
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                            Bypasses Deadline
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => setTestToForcePublish(null)}
                                    className={`flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleForcePublishAction(testToForcePublish)}
                                    className="flex-1 px-6 py-4 bg-linear-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Zap size={14} fill="currentColor" />
                                    Confirm Publish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestResult;

