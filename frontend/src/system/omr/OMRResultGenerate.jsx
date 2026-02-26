import React, { useState, useEffect } from 'react';
import {
    RefreshCw, Search, FileText, MapPin,
    CheckCircle2, AlertCircle, ChevronRight,
    ListFilter, Download, LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Pagination from '../../components/common/Pagination';

const OMRResultGenerate = () => {
    const { isDarkMode } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Mock data based on the screenshot provided
    const mockTests = [
        { id: 1, name: '2024_26 NEET PHASE TEST 1 XI STU', code: '24_26NPT01', centersCount: 12, status: 'ready' },
        { id: 2, name: '2024_26 NEET PHASE TEST 1 XI STU (DEMO TEST)', code: '24_26NPT01 (DEMO)', centersCount: 8, status: 'ready' },
        { id: 3, name: '2024_26 WBJEE PHASE TEST 1 XI STU PC', code: '24_26WPT01PC', centersCount: 15, status: 'ready' },
        { id: 4, name: '2024_26 WBJEE PHASE TEST 1 XI STU MATH', code: '24_26WPT01MATH', centersCount: 14, status: 'ready' },
        { id: 5, name: '2024_26 WBJEE PHASE TEST 1 XI STU PC (DEMO TEST)', code: '24_26WPT01PC(DEMO)', centersCount: 5, status: 'ready' },
        { id: 6, name: '2024_26 WBJEE PHASE TEST 1 XI STU MATH (DEMO TEST)', code: '24_26WPT01MATH(DEMO)', centersCount: 7, status: 'ready' },
        { id: 7, name: '2024_25 NEET PHASE TEST 2 XII STU', code: '24_25NPT02', centersCount: 22, status: 'ready' },
        { id: 8, name: '2024_25 WBJEE PHASE TEST 2 XII STU PC', code: '24_25WPT02PC', centersCount: 18, status: 'ready' },
        { id: 9, name: '2024_25 WBJEE PHASE TEST 2 XII STU MATH', code: '24_25WPT02MATH', centersCount: 20, status: 'ready' },
        { id: 10, name: '2024_25 NEET UNIT TEST 1 XII STU', code: '24_25NUT01', centersCount: 25, status: 'ready' },
    ];

    const filteredTests = mockTests.filter(test =>
        test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedTests = filteredTests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="p-1 animate-fade-in">
            {/* Header Section */}
            <div className={`p-8 rounded-[5px] border shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div>
                    <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                        OMR <span className="text-blue-600">Result Generation</span>
                    </h2>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Process OMR sheets and synchronize test results across all centers.
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80 group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                        <input
                            type="text"
                            placeholder="Search by test name or code..."
                            className={`w-full pl-12 pr-4 py-3 rounded-[5px] border transition-all outline-none font-medium ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 focus:border-blue-500/50'}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/10 active:scale-95 whitespace-nowrap"
                    >
                        <Download size={18} />
                        <span>Export All</span>
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                <th className="py-6 px-10">Name</th>
                                <th className="py-6 px-10">Code</th>
                                <th className="py-6 px-10 text-center">No Sheet Uploaded</th>
                                <th className="py-6 px-10 text-right pr-14">Generate</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                            {paginatedTests.map((test) => (
                                <tr key={test.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-blue-50/20'}`}>
                                    <td className="py-6 px-10">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-[5px] ${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                                                <FileText className="text-blue-500" size={18} />
                                            </div>
                                            <span className="font-black text-sm uppercase tracking-tight">{test.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-10">
                                        <span className="px-2 py-1 bg-slate-500/10 text-slate-500 rounded-[5px] font-mono text-[10px] font-bold uppercase tracking-wider">
                                            {test.code}
                                        </span>
                                    </td>
                                    <td className="py-6 px-10 text-center">
                                        <button className="px-8 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-[50px] text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 active:scale-95">
                                            Centers
                                        </button>
                                    </td>
                                    <td className="py-6 px-10 text-right pr-14">
                                        <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[50px] text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 group-hover:scale-105">
                                            Regenerate Result
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredTests.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="opacity-20 flex flex-col items-center">
                            <AlertCircle size={60} />
                            <h3 className="text-xl font-black uppercase mt-4 tracking-widest">No Tests Found</h3>
                            <p className="text-sm font-bold mt-2 font-mono">"{searchTerm}"</p>
                        </div>
                    </div>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalItems={filteredTests.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
            />
        </div>
    );
};

export default OMRResultGenerate;
