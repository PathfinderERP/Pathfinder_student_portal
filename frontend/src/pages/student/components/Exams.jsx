import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { FileText, Calendar, Clock, Award, TrendingUp, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import StartExamModal from './StartExamModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Exams = ({ isDarkMode, onRefresh, cache, setCache }) => {
    const { user, getApiUrl, token } = useAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('ongoing'); // 'ongoing' or 'previous'
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [tests, setTests] = useState(cache?.data || []);
    const [loading, setLoading] = useState(!cache?.loaded);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);

    const fetchTests = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/tests/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Map the backend structure to our local state if necessary
            // In a real app, we might also filter by 'package' or other params
            const data = response.data || [];
            setTests(data);
            if (setCache) setCache({ data, loaded: true });
        } catch (err) {
            console.error("Error fetching tests:", err);
            setError("Failed to load exams. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [getApiUrl, token, setCache]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        // Step 1: Tell parent to refresh ERP data (if it has the callback)
        if (onRefresh) await onRefresh(true);
        // Step 2: Fetch fresh tests from our backend
        await fetchTests();
        setTimeout(() => setIsRefreshing(false), 1000);
    }, [onRefresh, fetchTests]);

    useEffect(() => {
        if (token && (!cache || !cache.loaded)) {
            fetchTests();
        }
    }, [token, fetchTests, cache]);

    const handleStartClick = useCallback((test) => {
        setSelectedTest(test);
        setIsModalOpen(true);
    }, []);

    const handleVerifyCode = useCallback(async (code) => {
        const apiUrl = getApiUrl();
        try {
            const response = await axios.post(`${apiUrl}/api/tests/${selectedTest.id}/verify_access_code/`, {
                code
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success('Access code verified! Launching instructions...');
                setIsModalOpen(false);
                navigate(`/student/exam/instructions/${selectedTest.id}`);
            }
        } catch (err) {
            // Rethrow so the modal can handle it
            throw err;
        }
    }, [getApiUrl, selectedTest, token, navigate]);

    const formatDateTime = useCallback((dateStr) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('en-IN', {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (e) {
            return '—';
        }
    }, []);

    const filteredTests = useMemo(() => {
        return tests.filter(test => 
            (test.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (test.code || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).filter(test => {
            const isStudentCompleted = test.submission?.is_finalized;
            if (activeTab === 'ongoing') {
                return !isStudentCompleted; 
            } else {
                return isStudentCompleted;
            }
        });
    }, [tests, searchTerm, activeTab]);

    return (
        <>
            <div className="space-y-8 animate-fade-in-up pb-10 pt-4">
            {/* Header Section with Search and Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <h2 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {activeTab === 'ongoing' ? 'All Active Test' : 'Previous Tests'}
                    </h2>
                    {/* View Switcher */}
                    <div className={`flex p-1 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200 shadow-inner'}`}>
                        <button
                            onClick={() => setActiveTab('ongoing')}
                            className={`px-6 py-1.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ongoing' 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Ongoing
                        </button>
                        <button
                            onClick={() => setActiveTab('previous')}
                            className={`px-6 py-1.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'previous' 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Previous
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                        <input
                            type="text"
                            placeholder="Enter the test name"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full md:w-64 pl-11 pr-4 py-2.5 rounded-[5px] border text-xs font-bold transition-all outline-none ${isDarkMode 
                                ? 'bg-[#10141D] border-white/10 focus:border-blue-500/50 text-white' 
                                : 'bg-white border-slate-200 focus:border-blue-400 focus:shadow-lg focus:shadow-blue-500/5 text-slate-700'}`}
                        />
                    </div>
                    <button 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={`p-2.5 rounded-[5px] border transition-all ${isDarkMode 
                        ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' 
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 shadow-sm'}`}>
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Test Table Section */}
            <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                <th className="py-5 px-6 w-16 text-center">#</th>
                                <th className="py-5 px-6">Test Name</th>
                                <th className="py-5 px-6">Test Code</th>
                                <th className="py-5 px-6 text-center">Duration</th>
                                <th className="py-5 px-6">Active Time</th>
                                <th className="py-5 px-6">Expire</th>
                                <th className="py-5 px-6 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 animate-pulse text-blue-500/50">
                                            <RefreshCw size={48} className="animate-spin" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Loading Secure Exams...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center text-red-500/60">
                                        <p className="text-sm font-bold">{error}</p>
                                    </td>
                                </tr>
                            ) : filteredTests.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <div className="opacity-20 flex flex-col items-center gap-3">
                                            <Search size={48} />
                                            <p className="text-sm font-black uppercase tracking-[0.2em]">No Restricted Tests Found</p>
                                            <p className="text-[10px] font-bold">Contact Admin if your Section is not visible</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTests.map((test, index) => {
                                    const studentCompleted = test.submission?.is_finalized;
                                    const hasStarted = test.submission?.time_spent > 0;
                                    
                                    return (
                                        <tr key={test.id || test._id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}`}>
                                            <td className="py-5 px-6 text-center text-xs font-bold opacity-40">{index + 1}</td>
                                            <td className="py-5 px-6">
                                                <span className={`text-[11px] font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    {test.name}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className="text-[11px] font-bold font-mono opacity-50 uppercase">{test.code}</span>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <span className="text-[11px] font-black opacity-60">{test.duration} MIN</span>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className="text-[11px] font-bold font-mono opacity-50">
                                                    {formatDateTime(test.start_time)}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className="text-[11px] font-bold font-mono opacity-50">
                                                    {formatDateTime(test.end_time)}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <button 
                                                    disabled={studentCompleted}
                                                    onClick={() => handleStartClick(test)}
                                                    className={`px-4 py-1.5 rounded-[3px] text-[9px] font-black uppercase tracking-widest transition-all ${studentCompleted
                                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30 active:scale-95'}`}
                                                >
                                                    {studentCompleted ? 'Completed' : (hasStarted ? 'Resume' : 'Start Test')}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Placeholder (per screenshot visuals) */}
            <div className="flex justify-between items-center px-2">
                <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Showing {filteredTests.length} tests
                </p>
                <div className="flex gap-2">
                    <button className={`p-2 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-white border-slate-200 text-slate-400 shadow-sm hover:bg-slate-50'}`}>
                        <ChevronLeft size={16} />
                    </button>
                    <button className={`p-2 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-white border-slate-200 text-slate-400 shadow-sm hover:bg-slate-50'}`}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            </div>
            
            {/* Start Exam Modal - Moved outside animated container to avoid transform issues */}
            <StartExamModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleVerifyCode}
                test={selectedTest}
                isDarkMode={isDarkMode}
            />
        </>
    );
};

export default Exams;
