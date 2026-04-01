import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileSearch, Search, RefreshCw, Users, FileText, ChevronLeft, Trash2, Unlock } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const TestResponses = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchTests = async (forceRefresh = false) => {
        if (forceRefresh) setIsSyncing(true);
        else if (tests.length === 0) setIsLoading(true);

        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/tests/${forceRefresh ? '?refresh=true' : ''}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTests(res.data);
            if (forceRefresh) toast.success('ERP Data Synchronized Successfully!');
        } catch (err) {
            console.error('Error fetching tests:', err);
            if (forceRefresh) toast.error('Failed to sync with ERP');
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchTests();
    }, []);

    const filteredTests = tests.filter(test =>
        test.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

    const [viewMode, setViewMode] = useState('TESTS'); // 'TESTS', 'CENTRES', 'STUDENTS'
    const [selectedTest, setSelectedTest] = useState(null);
    const [selectedCentre, setSelectedCentre] = useState(null);
    const [centres, setCentres] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [isCentresLoading, setIsCentresLoading] = useState(false);
    const [isSubmissionsLoading, setIsSubmissionsLoading] = useState(false);
    const [allottedSections, setAllottedSections] = useState([]);

    // Student search & filter
    const [studentSearch, setStudentSearch] = useState('');
    const [studentFilter, setStudentFilter] = useState('all'); // 'all', 'attempted', 'not_attempted', 'in_progress'

    const handleViewCentres = async (test) => {
        setSelectedTest(test);
        setViewMode('CENTRES');
        setIsCentresLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/tests/${test.id}/centres/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCentres(res.data);
        } catch (err) {
            console.error('Error fetching centres:', err);
        } finally {
            setIsCentresLoading(false);
        }
    };

    const handleViewSubmissions = async (centre, forceRefresh = false) => {
        setSubmissions([]); // Clear previous to prevent flickering
        setSelectedCentre(centre);
        setViewMode('STUDENTS');
        setStudentSearch('');
        setStudentFilter('all');
        setIsSubmissionsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/tests/${selectedTest.id}/submissions/?centre_code=${centre.centre_details?.code}${forceRefresh ? '&refresh=true' : ''}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubmissions(res.data.data || []);
            setAllottedSections(res.data.allotted_sections || []);
        } catch (err) {
            console.error('Error fetching submissions:', err);
            toast.error('Failed to sync ERP data');
        } finally {
            setIsSubmissionsLoading(false);
        }
    };

    // Robust helper for status checks
    const getNormalizedStatus = (s) => (s || '').toString().trim().toLowerCase();

    // Memoized filtered list for performance and consistency
    const filteredSubmissions = useMemo(() => {
        return submissions.filter(sub => {
            const status = getNormalizedStatus(sub.status);
            
            // 1. Status Filter
            if (studentFilter === 'attempted') {
                if (status === 'available') return false;
            } else if (studentFilter === 'not_attempted') {
                if (status !== 'available') return false;
            } else if (studentFilter === 'in_progress') {
                if (status !== 'in progress') return false;
            }

            // 2. Search Filter
            if (studentSearch) {
                const q = studentSearch.toLowerCase();
                return (
                    sub.student_name?.toLowerCase().includes(q) ||
                    sub.email?.toLowerCase().includes(q) ||
                    sub.enroll_number?.toLowerCase().includes(q) ||
                    sub.username?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [submissions, studentFilter, studentSearch]);

    const attemptedCountSummary = useMemo(() => submissions.filter(s => getNormalizedStatus(s.status) !== 'available').length, [submissions]);
    const showingCountSummary = filteredSubmissions.length;

    const handleGenerateResult = async (testId) => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.post(`${apiUrl}/api/tests/${testId}/generate_result/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(res.data.message || 'Results generated successfully!');
            fetchTests();
        } catch (err) {
            console.error('Error generating results:', err);
            toast.error(err.response?.data?.error || 'Failed to generate results. Ensure exam is over for all centres.');
        } finally {
            setIsLoading(false);
        }
    };

    const [isModalLoading, setIsModalLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'blue' });

    const handleResetSession = (studentId, studentName) => {
        setConfirmModal({
            isOpen: true,
            title: 'Reset Session',
            message: `Are you sure you want to completely RESET the session for ${studentName.toUpperCase()}? All current progress will be destroyed and the student can give a fresh exam.`,
            type: 'red',
            onConfirm: async () => {
                setIsModalLoading(true);
                try {
                    const apiUrl = getApiUrl();
                    const res = await axios.post(`${apiUrl}/api/tests/${selectedTest.id}/reset_test/`,
                        { student_id: studentId },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    toast.success(res.data.message || 'Session reset successfully.');
                    handleViewSubmissions(selectedCentre);
                } catch (err) {
                    console.error('Error resetting:', err);
                    toast.error('Failed to reset session');
                } finally {
                    setIsModalLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleResumeSession = (studentId, studentName) => {
        setConfirmModal({
            isOpen: true,
            title: 'Unlock Session',
            message: `Allow ${studentName.toUpperCase()} to resume their recorded exam session? This will unlock the test for exactly ONE entry.`,
            type: 'blue',
            onConfirm: async () => {
                setIsModalLoading(true);
                try {
                    const apiUrl = getApiUrl();
                    const res = await axios.post(`${apiUrl}/api/tests/${selectedTest.id}/resume_test/`,
                        { student_id: studentId },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    toast.success(res.data.message || 'Session unlocked successfully.');
                    handleViewSubmissions(selectedCentre);
                } catch (err) {
                    console.error('Error unlocking:', err);
                    toast.error('Failed to unlock session');
                } finally {
                    setIsModalLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    // Helper Component for Confirmation
    const ConfirmationModal = () => {
        if (!confirmModal.isOpen) return null;

        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-sm bg-black/40 animate-in fade-in duration-300">
                <div className={`w-full max-w-md rounded-[20px] shadow-2xl overflow-hidden border ${isDarkMode ? 'bg-[#0F131A] border-white/5 shadow-black/60' : 'bg-white border-slate-200 shadow-slate-300/50'}`}>
                    <div className="relative h-1.5 w-full bg-slate-100/10 overflow-hidden">
                        <div className={`absolute inset-0 h-full transition-all duration-300 ${confirmModal.type === 'red' ? 'bg-red-500' : 'bg-blue-500'} ${isModalLoading ? 'animate-pulse w-[40%]' : 'w-full'}`} />
                    </div>
                    <div className="p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`p-3 rounded-full ${confirmModal.type === 'red' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {confirmModal.type === 'red' ? <Trash2 size={24} /> : <Unlock size={24} />}
                            </div>
                            <h2 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                {confirmModal.title}
                            </h2>
                        </div>
                        <p className={`text-sm font-bold leading-relaxed mb-8 opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {confirmModal.message}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => !isModalLoading && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                disabled={isModalLoading}
                                className={`flex-1 py-4 rounded-[12px] text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'} ${isModalLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                disabled={isModalLoading}
                                className={`flex-1 py-4 rounded-[12px] text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2
                                ${confirmModal.type === 'red' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30'}
                                ${isModalLoading ? 'opacity-80 cursor-not-allowed' : ''}`}
                            >
                                {isModalLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                                {isModalLoading ? 'Processing...' : 'Confirm Action'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Page Views ---

    // Handle loading state
    if (isLoading && viewMode === 'TESTS') {
        return <div className="flex items-center justify-center min-h-screen"><RefreshCw className="animate-spin text-blue-500" size={48} /></div>;
    }

    return (
        <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
            {viewMode === 'TESTS' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Main Test List Header */}
                    <div className={`p-8 rounded-[5px] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                                    Test <span className="text-orange-500">Response Analysis</span>
                                </h2>
                                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Track student participation and responses across centres
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Enter the test name"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`pl-10 pr-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-4 ${isDarkMode ? 'bg-white/5 border-white/10 focus:ring-blue-500/10' : 'bg-slate-50 border-slate-200 focus:ring-blue-500/5'}`}
                                    />
                                </div>
                                <button
                                    onClick={() => fetchTests(true)}
                                    className={`px-4 py-2.5 rounded-[5px] bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95 ${isSyncing ? 'opacity-70 pointer-events-none' : ''}`}
                                >
                                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                                    {isSyncing ? 'Syncing...' : 'SYNC WITH ERP'}
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
                                    <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                        <th className="py-5 px-6">#</th>
                                        <th className="py-5 px-6">Test Name</th>
                                        <th className="py-5 px-6">Test Code</th>
                                        <th className="py-5 px-6 text-center">Attempts</th>
                                        <th className="py-5 px-6 text-center">Total Roster</th>
                                        <th className="py-5 px-6 text-center">Centres</th>
                                        <th className="py-5 px-6 text-center">Results</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                                    {isLoading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan="7" className="py-8 px-6">
                                                    <div className={`h-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                                </td>
                                            </tr>
                                        ))
                                    ) : filteredTests.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="py-20 text-center">
                                                <div className="opacity-20 flex flex-col items-center gap-3">
                                                    <FileSearch size={48} />
                                                    <p className="text-sm font-black uppercase tracking-[0.2em]">No Tests Found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredTests.map((test, index) => (
                                        <tr key={test.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-blue-50/30'}`}>
                                            <td className="py-5 px-6 text-xs font-black opacity-30">{index + 1}</td>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-2 whitespace-nowrap">
                                                    <span className="text-xs font-black uppercase tracking-tight">{test.name}</span>
                                                    <span className="text-[9px] font-bold opacity-40 px-2 py-0.5 rounded-md bg-slate-500/5 whitespace-nowrap">{test.session_details?.name}</span>
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
                                                    <span className="text-sm font-black">{test.total_students || 0}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <div className="flex items-center justify-center gap-2 text-blue-500">
                                                    <Users size={14} />
                                                    <span className="text-sm font-black">{test.total_roster_count || 0}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <button
                                                    onClick={() => handleViewCentres(test)}
                                                    className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                                >
                                                    View Centres
                                                </button>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <button
                                                    onClick={() => handleGenerateResult(test.id)}
                                                    disabled={!test.is_over && !test.is_completed}
                                                    title={(!test.is_over && !test.is_completed) ? "Exam is still in progress. Can only generate after end time of all centres." : "Click to generate result"}
                                                    className={`px-4 py-1.5 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 mx-auto
                                                        ${(test.is_over || test.is_completed) 
                                                            ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-600/20' 
                                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50 shadow-none'}
                                                     `}
                                                >
                                                    <FileText size={11} /> {test.is_completed ? 'Regenerate' : 'Generate Result'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'CENTRES' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* Centres Page Header */}
                    <div className={`p-8 rounded-[5px] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setViewMode('TESTS')}
                                    className={`p-2 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight uppercase">
                                        All <span className="text-orange-500">Centre Responses</span>
                                    </h2>
                                    <p className={`text-xs font-bold opacity-40 uppercase tracking-widest mt-1`}>
                                        Test: {selectedTest?.name}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleViewCentres(selectedTest)}
                                className={`p-3 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-blue-400' : 'bg-white border-slate-200 text-blue-500'}`}
                            >
                                <RefreshCw size={20} className={isCentresLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Centres Table */}
                    <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                        <th className="py-5 px-6">#</th>
                                        <th className="py-5 px-6">Centre Name</th>
                                        <th className="py-5 px-6 text-center">Attempted Students</th>
                                        <th className="py-5 px-6 text-center">Total Students</th>
                                        <th className="py-5 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                                    {isCentresLoading && centres.length === 0 ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan="5" className="py-8 px-6">
                                                    <div className={`h-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                                </td>
                                            </tr>
                                        ))
                                    ) : centres.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-20 text-center opacity-20 font-black uppercase tracking-widest">No Centres Found</td>
                                        </tr>
                                    ) : centres.map((centre, index) => (
                                        <tr key={centre.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-blue-50/30'}`}>
                                            <td className="py-5 px-6 text-xs font-black opacity-30">{index + 1}</td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black uppercase tracking-tight">{centre.centre_details?.name}</span>
                                                    <span className="text-[9px] font-bold opacity-40">{centre.centre_details?.code}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <div className="flex items-center justify-center gap-2 text-orange-500">
                                                    <Users size={13} strokeWidth={3} />
                                                    <span className="text-sm font-black tracking-tight">{centre.submission_count || 0}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <div className="flex items-center justify-center gap-2 text-blue-500">
                                                    <Users size={13} strokeWidth={3} />
                                                    <span className="text-sm font-black tracking-tight">{centre.total_students_in_centre || 0}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button
                                                        onClick={() => handleViewSubmissions(centre)}
                                                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                                    >
                                                        Students
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'STUDENTS' && (() => {
                const notStartedCount = submissions.length - attemptedCountSummary;

                return (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Students Page Header */}
                        <div className={`p-6 rounded-[5px] border shadow-xl mb-6 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setViewMode('CENTRES')}
                                        className={`p-2 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight uppercase">
                                            <span className="text-orange-500">{selectedCentre?.centre_details?.name}</span> Responses
                                        </h2>
                                        <p className={`text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mt-1`}>
                                            Test: {selectedTest?.name} ({selectedTest?.code})
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={15} />
                                        <input
                                            type="text"
                                            placeholder="Search name / email / enroll..."
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                            className={`pl-9 pr-4 py-2 rounded-[5px] border text-xs font-bold outline-none w-64 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleViewSubmissions(selectedCentre, true)}
                                        className={`p-2.5 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-blue-400' : 'bg-white border-slate-200 text-blue-500'}`}
                                    >
                                        <RefreshCw size={18} className={isSubmissionsLoading ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            </div>
                            {/* Filter Pills + Stats */}
                            <div className="flex flex-wrap items-center gap-3">
                                {[['all', 'All Students'], ['attempted', '✓ Attempted'], ['not_attempted', '✗ Not Attempted'], ['in_progress', '⏳ In Progress']].map(([val, label]) => (
                                    <button
                                        key={val}
                                        onClick={() => setStudentFilter(val)}
                                        className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all border ${studentFilter === val
                                                ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                                                : isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                                <div className={`ml-auto flex items-center gap-3 text-[10px] font-black uppercase tracking-widest`}>
                                    <span className="text-orange-500">{attemptedCountSummary} Started</span>
                                    <span className="opacity-30">·</span>
                                    <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>{notStartedCount} Not Started</span>
                                    <span className="opacity-30">·</span>
                                    <span className="text-blue-500">{showingCountSummary} Showing</span>
                                </div>
                            </div>
                        </div>

                        {/* Students Table */}
                        <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                            <th className="py-5 px-6 text-center w-14">#</th>
                                            <th className="py-5 px-6">Name</th>
                                            <th className="py-5 px-6">Email</th>
                                            <th className="py-5 px-6">Enroll Number</th>
                                            <th className="py-5 px-6">Section</th>
                                            <th className="py-5 px-6 text-center">Status</th>
                                            <th className="py-5 px-4 text-center">Resume</th>
                                            <th className="py-5 px-4 text-center">Delete</th>
                                            <th className="py-5 px-4 text-center">Force Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                                        {isSubmissionsLoading && submissions.length === 0 ? (
                                            Array(5).fill(0).map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan="9" className="py-8 px-6">
                                                        <div className={`h-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : filteredSubmissions.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" className="py-20 text-center opacity-20 font-black uppercase tracking-widest">No Students Found</td>
                                            </tr>
                                        ) : filteredSubmissions.map((sub, index) => {
                                            const hasSession = getNormalizedStatus(sub.status) !== 'available';
                                            const canUnlock = hasSession && !sub.allow_resume;
                                            const alreadyUnlocked = sub.allow_resume;
                                            const currentStatus = getNormalizedStatus(sub.status);
                                            return (
                                                <tr key={sub.student_id ? `${sub.student_id}-${index}` : `erp-${index}`} className={`group transition-all ${hasSession ? (isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-blue-50/5') : ''
                                                    }`}>
                                                    <td className="py-5 px-6 text-xs text-center font-black opacity-30">{index + 1}</td>
                                                    <td className="py-5 px-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black uppercase tracking-tight">{sub.student_name}</span>
                                                            <span className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">
                                                                {sub.username}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <span className="text-[10px] font-bold opacity-60 lowercase">{sub.email || '---'}</span>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <span className={`text-[10px] font-black tracking-widest ${sub.enroll_number === 'ID MISSING' ? 'text-red-500/80 animate-pulse' : 'opacity-70 font-mono text-xs'}`}>
                                                            {sub.enroll_number}
                                                        </span>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`text-[11px] font-mono font-black uppercase tracking-tighter ${(() => {
                                                                    if (!allottedSections.length || !sub.section) return false;
                                                                    // Check if any part of the student's section matches the allotted list
                                                                    const studentSections = sub.section.split(',').map(s => s.trim().toLowerCase());
                                                                    const allowedLower = allottedSections.map(s => s.toLowerCase());
                                                                    return !studentSections.some(s => allowedLower.includes(s));
                                                                })()
                                                                    ? 'text-orange-600'
                                                                    : 'opacity-60'
                                                                }`}>
                                                                {sub.section || '---'}
                                                            </span>
                                                            {(() => {
                                                                if (!allottedSections.length || !sub.section) return false;
                                                                const studentSections = sub.section.split(',').map(s => s.trim().toLowerCase());
                                                                const allowedLower = allottedSections.map(s => s.toLowerCase());
                                                                return !studentSections.some(s => allowedLower.includes(s));
                                                            })() && (
                                                                <span className="text-[8px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded-[2px] w-fit uppercase tracking-tighter animate-pulse">
                                                                    Section Mismatch
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {/* Status Badge */}
                                                    <td className="py-5 px-6 text-center">
                                                        {currentStatus === 'available' && (
                                                            <span className={`px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Not Started</span>
                                                        )}
                                                        {currentStatus === 'in progress' && (
                                                            <span className="px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest whitespace-nowrap bg-amber-500/15 text-amber-500 border border-amber-500/20 animate-pulse">In Progress</span>
                                                        )}
                                                        {currentStatus === 'submitted' && (
                                                            <span className="px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest whitespace-nowrap bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">Submitted</span>
                                                        )}
                                                    </td>
                                                    {/* Resume Button */}
                                                    <td className="py-5 px-4 text-center">
                                                        {alreadyUnlocked ? (
                                                            <span className="px-4 py-2 rounded-[5px] text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 inline-flex items-center gap-1">
                                                                ✓ Unlocked
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleResumeSession(sub.student_id, sub.student_name)}
                                                                disabled={!canUnlock}
                                                                title={!hasSession ? 'Student has not started the exam yet' : 'Click to allow resume'}
                                                                className={`px-4 py-2 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${canUnlock
                                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 cursor-pointer'
                                                                        : isDarkMode ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                    }`}
                                                            >
                                                                Resume
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="py-5 px-4 text-center">
                                                        <button
                                                            onClick={() => handleResetSession(sub.student_id, sub.student_name)}
                                                            disabled={!hasSession}
                                                            className={`px-4 py-2 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${hasSession
                                                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
                                                                    : isDarkMode ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                }`}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                    <td className="py-5 px-4 text-center">
                                                        <button
                                                            onClick={() => handleResetSession(sub.student_id, sub.student_name)}
                                                            className="px-4 py-2 rounded-[5px] bg-white border border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition-all active:scale-95"
                                                        >
                                                            Force Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })()}
            <ConfirmationModal />
        </div>
    );
};

export default TestResponses;
