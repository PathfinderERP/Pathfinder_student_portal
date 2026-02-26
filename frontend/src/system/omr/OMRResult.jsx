import React, { useState } from 'react';
import {
    Search, Plus, Users, FileText,
    ToggleLeft, ToggleRight, Info, ChevronRight,
    PieChart, Download, Filter
} from 'lucide-react';
import OMRResultStudents from './OMRResultStudents';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Pagination from '../../components/common/Pagination';

const OMRResult = () => {
    const { isDarkMode } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTest, setSelectedTest] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Mock data based on the screenshot provided
    const [mockResults, setMockResults] = useState([
        { id: 1, name: '2024_26 WBJEE PHASE TEST 2 XI STU MATH', code: '24_26WPT02MATH', studentCount: 228, active: false },
        { id: 2, name: '2024_25 WBJEE PHASE TEST 3 XII STU MATH', code: '24_25WPT03MATH', studentCount: 193, active: false },
        { id: 3, name: '2024_26 WBJEE PHASE TEST 3 XI STU PC', code: '24_26WPT03PC', studentCount: 204, active: false },
        { id: 4, name: '2025_26 NEET MOCK TEST I XII STU', code: '25_26NMT1', studentCount: 186, active: false },
        { id: 5, name: '2025_27 WBJEE UNIT TEST 1 XI STU PC', code: '25_27WUT01PC', studentCount: 39, active: false },
        { id: 6, name: '2024_26 WBJEE PHASE TEST 2 XI STU PC', code: '24_26WPT02PC', studentCount: 225, active: false },
        { id: 7, name: '2024_26 WBJEE FULL SYLLABUS TEST 1 XI STU MATH', code: '24_26WFST01MATH', studentCount: 69, active: false },
        { id: 8, name: '2025 PATHFINDER MATHEMATICS OLYMPIADS TEST VII STU SET A', code: '25-26PMO7A', studentCount: 469, active: false },
        { id: 9, name: '2024_25 NEET PHASE TEST 5 XII PASS REPEATER NEW', code: '24_25NPT05NEW', studentCount: 209, active: false },
        { id: 10, name: '2024_25 WBJEE PHASE TEST 4 XII STU MATH', code: '24_25WPT04MATH', studentCount: 111, active: false },
    ]);

    const toggleStatus = (id) => {
        setMockResults(prev => prev.map(res =>
            res.id === id ? { ...res, active: !res.active } : res
        ));
    };

    const filteredResults = mockResults.filter(res =>
        res.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedResults = filteredResults.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (selectedTest) {
        return <OMRResultStudents test={selectedTest} onBack={() => setSelectedTest(null)} />;
    }

    return (
        <div className="p-1 animate-fade-in">
            {/* Header / Actions Bar */}
            <div className={`p-6 rounded-[5px] border shadow-xl mb-8 flex flex-col md:flex-row justify-between items-center gap-6 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="relative flex-1 group w-full">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'}`} size={18} />
                    <input
                        type="text"
                        placeholder="Search for test results..."
                        className={`w-full pl-12 pr-4 py-3 rounded-[5px] border transition-all outline-none font-medium ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 focus:border-blue-500/50'}`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <button className="px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-[5px] font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-900/10 active:scale-95 whitespace-nowrap">
                    <Plus size={18} strokeWidth={3} />
                    <span>Add Test</span>
                </button>
            </div>

            {/* Premium Table */}
            <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                <th className="py-6 px-10">Name</th>
                                <th className="py-6 px-10">Code</th>
                                <th className="py-6 px-10">No of Student</th>
                                <th className="py-6 px-10 text-center">Result Active</th>
                                <th className="py-6 px-10 text-right pr-14">Students</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                            {paginatedResults.map((result) => (
                                <tr key={result.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-blue-50/20'}`}>
                                    <td className="py-6 px-10">
                                        <span className="font-extrabold text-sm uppercase tracking-tight text-[#2D3748] dark:text-slate-200">{result.name}</span>
                                    </td>
                                    <td className="py-6 px-10">
                                        <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter uppercase">{result.code}</span>
                                    </td>
                                    <td className="py-6 px-10">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-500">{result.studentCount}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-10 text-center">
                                        <button
                                            onClick={() => toggleStatus(result.id)}
                                            className="focus:outline-none transform active:scale-90 transition-transform"
                                        >
                                            {result.active ? (
                                                <div className="w-12 h-6 bg-blue-600 rounded-full relative transition-all">
                                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-6 bg-slate-200 dark:bg-white/10 rounded-full relative transition-all">
                                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white dark:bg-slate-500 rounded-full shadow-md" />
                                                </div>
                                            )}
                                        </button>
                                    </td>
                                    <td className="py-6 px-10 text-right pr-14">
                                        <button
                                            onClick={() => setSelectedTest(result)}
                                            className={`px-6 py-2 rounded-[5px] text-xs font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${isDarkMode ? 'border-white/10 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500' : 'border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white'}`}
                                        >
                                            Students
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredResults.length === 0 && (
                    <div className="p-20 text-center opacity-20">
                        <PieChart size={60} className="mx-auto mb-4" />
                        <h3 className="text-xl font-black uppercase tracking-widest">No Results Indexed</h3>
                    </div>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalItems={filteredResults.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
            />

            {/* Footer Metrics */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Total Active Results</p>
                    <p className="text-2xl font-black text-blue-600">{mockResults.filter(r => r.active).length}</p>
                </div>
                <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Total Students Recorded</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">
                        {mockResults.reduce((acc, curr) => acc + curr.studentCount, 0).toLocaleString()}
                    </p>
                </div>
                <div className="flex justify-end items-end p-6">
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-500 transition-colors">
                        <Download size={14} /> Download Summary Report
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OMRResult;
