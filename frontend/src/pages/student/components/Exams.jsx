import React, { useState } from 'react';
import { FileText, Calendar, Clock, Award, TrendingUp, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const Exams = ({ isDarkMode, onRefresh }) => {
    const { user, getApiUrl, token } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('ongoing'); // 'ongoing' or 'previous'
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        if (onRefresh) await onRefresh(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    // Mock data for tests - in a real app, this would be fetched from /api/tests/
    const tests = [
        { id: 1, name: '2024_26 JEE MAIN PHASE TEST 01', code: '24_26JMPT01', duration: 180, activeTime: '2024-06-22T09:00', expire: '2024-06-25T21:00', status: 'Expired' },
        { id: 2, name: '2024_26 JEE MAIN PHASE TEST 02', code: '24_26JMPT02', duration: 180, activeTime: '2024-08-24T09:00', expire: '2024-08-27T21:00', status: 'Expired' },
        { id: 3, name: '2024_26 JEE MAIN UNIT TEST 01', code: '24_26JMUT01', duration: 180, activeTime: '2024-10-04T09:00', expire: '2024-10-07T21:00', status: 'Expired' },
        { id: 4, name: '2024_26 JEE MAIN PHASE TEST 03', code: '24_26JMPT03', duration: 180, activeTime: '2024-11-16T09:00', expire: '2024-11-19T21:00', status: 'Expired' },
        { id: 5, name: '2024_26 JEE MAIN PHASE TEST 04', code: '24_26JMPT04', duration: 180, activeTime: '2025-01-18T09:00', expire: '2025-01-28T21:00', status: 'Expired' },
        { id: 6, name: '2024_26 JEE MAIN PHASE TEST 05', code: '24_26JMPT05', duration: 180, activeTime: '2025-03-28T09:00', expire: '2025-04-01T21:00', status: 'Expired' },
        { id: 7, name: '2024_26 JEE MAIN UNIT TEST 02', code: '24_26JMUT02', duration: 180, activeTime: '2025-02-22T09:00', expire: '2025-02-25T21:00', status: 'Expired' },
        { id: 8, name: '2024_26 JEE ADV FULL SYLLABUS TEST 01-PAPER 1', code: '24_26JADFST01-P1', duration: 180, activeTime: '2024-04-11T09:00', expire: '2024-04-15T18:00', status: 'Expired' },
        { id: 9, name: '2024_26 JEE ADV FULL SYLLABUS TEST 01-PAPER 2', code: '24_26JADFST01-P2', duration: 180, activeTime: '2024-04-11T09:00', expire: '2024-04-15T18:00', status: 'Expired' },
        { id: 10, name: '2024_26 JEE MAIN FULL SYLLABUS TEST 02', code: '24_26JMFST02', duration: 180, activeTime: '2024-04-18T09:00', expire: '2024-04-21T21:00', status: 'Expired' },
    ];

    const completedExams = [
        { name: 'Biology Test', date: '2026-01-10', marks: 85, total: 100, rank: 5 },
        { name: 'English Test', date: '2026-01-05', marks: 92, total: 100, rank: 2 },
        { name: 'Physics Mock', date: '2025-12-28', marks: 78, total: 100, rank: 12 },
    ];

    const filteredTests = tests.filter(test => 
        test.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        test.code.toLowerCase().includes(searchTerm.toLowerCase())
    ).filter(test => {
        if (activeTab === 'ongoing') {
            // In a real app, this would check if the test is currently active
            return true; 
        } else {
            // For now, let's just show some tests in previous
            return test.status === 'Expired';
        }
    });

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
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
                            {filteredTests.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <div className="opacity-20 flex flex-col items-center gap-3">
                                            <Search size={48} />
                                            <p className="text-sm font-black uppercase tracking-[0.2em]">No Tests Found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTests.map((test, index) => (
                                    <tr key={test.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}`}>
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
                                            <span className="text-[11px] font-black opacity-60">{test.duration}</span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <span className="text-[11px] font-bold font-mono opacity-50">{test.activeTime}</span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <span className="text-[11px] font-bold font-mono opacity-50">{test.expire}</span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button 
                                                disabled={test.status === 'Expired'}
                                                className={`px-4 py-1.5 rounded-[3px] text-[9px] font-black uppercase tracking-widest transition-all ${test.status === 'Expired' 
                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30 active:scale-95'}`}
                                            >
                                                {test.status}
                                            </button>
                                        </td>
                                    </tr>
                                ))
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
    );
};

export default Exams;
