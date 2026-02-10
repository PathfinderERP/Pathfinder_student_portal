import React, { useState, useEffect, useRef } from 'react';
import { FileSearch, Search, RefreshCw, Users, BarChart3, FileText, Eye } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const TestResult = () => {
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

    const handleReleaseResult = (testId) => {
        // TODO: Implement release result toggle
        console.log('Toggle release result for test:', testId);
    };

    const handleQuestionAnalysis = (testId) => {
        // TODO: Navigate to question analysis page
        console.log('View question analysis for test:', testId);
    };

    const handleQuestionVsStudentAnalysis = (testId) => {
        // TODO: Navigate to question vs student analysis page
        console.log('View question vs student analysis for test:', testId);
    };

    const handleShowStudentResponses = (testId) => {
        // TODO: Navigate to student responses page
        console.log('Show student responses for test:', testId);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className={`p-8 rounded-[5px] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                            Test <span className="text-orange-500">Result List</span>
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Manage test results, analysis, and student responses
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
                            ) : filteredTests.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-20 text-center">
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
                                            onClick={() => handleReleaseResult(test.id)}
                                            className={`relative w-14 h-7 rounded-full p-1 transition-all duration-300 ${test.is_result_released ? 'bg-pink-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm ${test.is_result_released ? 'translate-x-7' : 'translate-x-0'}`} />
                                        </button>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleQuestionAnalysis(test.id)}
                                            className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20 active:scale-95 flex items-center gap-1.5 mx-auto"
                                        >
                                            <BarChart3 size={11} /> Question Analysis
                                        </button>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleQuestionVsStudentAnalysis(test.id)}
                                            className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20 active:scale-95 flex items-center gap-1.5 mx-auto"
                                        >
                                            <BarChart3 size={11} /> Analysis
                                        </button>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleShowStudentResponses(test.id)}
                                            className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20 active:scale-95 flex items-center gap-1.5 mx-auto"
                                        >
                                            <Eye size={11} /> Students
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TestResult;

