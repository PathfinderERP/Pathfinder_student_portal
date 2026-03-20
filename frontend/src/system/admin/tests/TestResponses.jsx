import React, { useState, useEffect, useRef } from 'react';
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

    const fetchTests = async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/tests/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTests(res.data);
        } catch (err) {
            console.error('Error fetching tests:', err);
        } finally {
            setIsLoading(false);
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

    const handleViewSubmissions = async (centre) => {
        setSelectedCentre(centre);
        setViewMode('STUDENTS');
        setIsSubmissionsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/tests/${selectedTest.id}/submissions/?centre_code=${centre.centre_details?.code}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubmissions(res.data);
        } catch (err) {
            console.error('Error fetching submissions:', err);
        } finally {
            setIsSubmissionsLoading(false);
        }
    };

    const handleGenerateResult = (testId) => {
        // TODO: Implement result generation
        console.log('Generate result for test:', testId);
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
                                    <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                        <th className="py-5 px-6">#</th>
                                        <th className="py-5 px-6">Test Name</th>
                                        <th className="py-5 px-6">Test Code</th>
                                        <th className="py-5 px-6 text-center">No Of Student Attempted</th>
                                        <th className="py-5 px-6 text-center">Centre</th>
                                        <th className="py-5 px-6 text-center">Generate Result</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                                    {isLoading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan="6" className="py-8 px-6">
                                                    <div className={`h-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                                </td>
                                            </tr>
                                        ))
                                    ) : filteredTests.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="py-20 text-center">
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
                                                <button
                                                    onClick={() => handleViewCentres(test)}
                                                    className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                                >
                                                    Centres
                                                </button>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <button
                                                    onClick={() => handleGenerateResult(test.id)}
                                                    className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20 active:scale-95 flex items-center gap-1.5 mx-auto"
                                                >
                                                    <FileText size={11} /> Generate Result
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
                                        <th className="py-5 px-6 text-center">Number Students</th>
                                        <th className="py-5 px-6 text-right">Students</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                                    {isCentresLoading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan="4" className="py-8 px-6">
                                                    <div className={`h-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                                </td>
                                            </tr>
                                        ))
                                    ) : centres.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="py-20 text-center opacity-20 font-black uppercase tracking-widest">No Centres Found</td>
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
                                                <span className="text-sm font-black">{centre.total_students_in_centre || 0}</span>
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <button
                                                    onClick={() => handleViewSubmissions(centre)}
                                                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                                >
                                                    Students
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

            {viewMode === 'STUDENTS' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* Students Page Header */}
                    <div className={`p-8 rounded-[5px] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                        <div className="flex justify-between items-center">
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
                            <button 
                                onClick={() => handleViewSubmissions(selectedCentre)}
                                className={`p-3 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-blue-400' : 'bg-white border-slate-200 text-blue-500'}`}
                            >
                                <RefreshCw size={20} className={isSubmissionsLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Students Table */}
                    <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                        <th className="py-6 px-6 text-center w-16">#</th>
                                        <th className="py-6 px-6">Name</th>
                                        <th className="py-6 px-6">Email</th>
                                        <th className="py-6 px-6">Enroll Number</th>
                                        <th className="py-6 px-6">Section</th>
                                        <th className="py-6 px-4 text-center">Resume</th>
                                        <th className="py-6 px-4 text-center">Delete</th>
                                        <th className="py-6 px-4 text-center">Force Delete</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                                    {isSubmissionsLoading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan="8" className="py-8 px-6">
                                                    <div className={`h-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                                </td>
                                            </tr>
                                        ))
                                    ) : submissions.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="py-20 text-center opacity-20 font-black uppercase tracking-widest">No Students Found in this Centre</td>
                                        </tr>
                                    ) : submissions.map((sub, index) => {
                                        const canResume = sub.status === 'In Progress' && !sub.allow_resume;
                                        const isSubmitting = sub.is_finalized;
                                        
                                        return (
                                            <tr key={sub.student_id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-blue-50/5'}`}>
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
                                                    <span className="text-[11px] font-mono font-black opacity-60 uppercase tracking-tighter">
                                                        {sub.section || '---'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <button 
                                                        onClick={() => handleResumeSession(sub.student_id, sub.student_name)}
                                                        disabled={!canResume || isSubmitting}
                                                        className={`px-5 py-2.5 rounded-[5px] text-[9px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95
                                                        ${(!canResume || isSubmitting) 
                                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'}`}
                                                    >
                                                        {sub.allow_resume ? 'Unlocked' : 'Resume'}
                                                    </button>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <button 
                                                        onClick={() => handleResetSession(sub.student_id, sub.student_name)}
                                                        className="px-5 py-2.5 rounded-[5px] bg-red-500 hover:bg-red-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-500/30 transition-all active:scale-95"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <button 
                                                        onClick={() => handleResetSession(sub.student_id, sub.student_name)}
                                                        className="px-5 py-2.5 rounded-[5px] bg-white border border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition-all active:scale-95"
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
            )}
            <ConfirmationModal />
        </div>
    );
};

export default TestResponses;
