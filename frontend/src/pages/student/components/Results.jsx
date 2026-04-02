import React, { useState } from 'react';
import { Award, TrendingUp, Search, Filter } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import ResultReport from './ResultReport';

const Results = ({ isDarkMode }) => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('recent'); // 'recent', 'all'
    const [selectedReport, setSelectedReport] = useState(null);

    // Mock data for results
    const detailedResults = [
        { id: 1, name: 'PHYSICS UNIT TEST 01', code: 'PHY-UT-01', date: '2026-03-10', marks: 85, total: 100, rank: 5, percentile: 92.5 },
        { id: 2, name: 'MATHEMATICS MOCK TEST 02', code: 'MATH-MT-02', date: '2026-03-05', marks: 92, total: 100, rank: 2, percentile: 98.1 },
        { id: 3, name: 'CHEMISTRY QUIZ 03', code: 'CHEM-QZ-03', date: '2026-02-28', marks: 78, total: 100, rank: 12, percentile: 85.0 },
        { id: 4, name: 'JEE MAIN FULL SYLLABUS 01', code: 'JEE-FS-01', date: '2026-02-15', marks: 245, total: 300, rank: 45, percentile: 99.2 },
        { id: 5, name: 'BIOLOGY PHASE TEST 01', code: 'BIO-PT-01', date: '2026-02-10', marks: 180, total: 200, rank: 8, percentile: 96.4 },
    ];

    const filteredDetailedResults = detailedResults.filter(res => 
        res.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        res.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // If a report is selected, show the report view
    if (selectedReport) {
        return (
            <ResultReport
                test={selectedReport}
                isDarkMode={isDarkMode}
                onBack={() => setSelectedReport(null)}
            />
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-2">
                <div className="flex items-center gap-6">
                    <h2 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {activeTab === 'recent' ? 'Recent Results' : 'Score History'}
                    </h2>
                    <div className={`flex p-1 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200 shadow-inner'}`}>
                        <button
                            onClick={() => setActiveTab('recent')}
                            className={`px-4 py-1.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'recent' 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Recent
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-1.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            View All
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                        <input
                            type="text"
                            placeholder={activeTab === 'participated' ? "Enter the test name" : "Search by test name..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full md:w-64 pl-11 pr-4 py-2.5 rounded-[5px] border text-xs font-bold transition-all outline-none ${isDarkMode 
                                ? 'bg-[#10141D] border-white/10 focus:border-blue-500/50 text-white' 
                                : 'bg-white border-slate-200 focus:border-blue-400 focus:shadow-lg focus:shadow-blue-500/5 text-slate-700'}`}
                        />
                    </div>
                    <button className={`p-2.5 rounded-[5px] border transition-all ${isDarkMode 
                            ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' 
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 shadow-sm'}`}>
                            <Filter size={18} />
                        </button>
                </div>
            </div>

            {/* Results Table */}
            <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                <th className="py-5 px-6 w-16 text-center">#</th>
                                <th className="py-5 px-6">Test Detail</th>
                                <th className="py-5 px-6">Date</th>
                                <th className="py-5 px-6 text-center">Score</th>
                                <th className="py-5 px-6 text-center">Rank</th>
                                <th className="py-5 px-6 text-center">Percentile</th>
                                <th className="py-5 px-6 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                            {filteredDetailedResults.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <div className="opacity-20 flex flex-col items-center gap-3">
                                            <Search size={48} />
                                            <p className="text-sm font-black uppercase tracking-[0.2em]">No Results Found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDetailedResults.map((res, index) => (
                                    <tr key={res.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}`}>
                                        <td className="py-5 px-6 text-center text-xs font-bold opacity-40">{index + 1}</td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className={`text-[11px] font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    {res.name}
                                                </span>
                                                <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest mt-0.5">{res.code}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <span className="text-[11px] font-bold opacity-50">{res.date}</span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-[11px] font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                    {res.marks}/{res.total}
                                                </span>
                                                <div className={`h-1 w-12 rounded-full overflow-hidden mt-1 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                                    <div 
                                                        className="h-full bg-emerald-500"
                                                        style={{ width: `${(res.marks / res.total) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Award size={12} className="text-orange-500" />
                                                <span className="text-[11px] font-black opacity-60">#{res.rank}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-blue-500">
                                                <TrendingUp size={12} />
                                                <span className="text-[11px] font-black">{res.percentile}%</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button
                                                onClick={() => setSelectedReport(res)}
                                                className="bg-[#4871D9] hover:bg-[#3D60B8] text-white text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-[4px] transition-all active:scale-95 shadow-[0_1px_3px_rgba(72,113,217,0.4)]"
                                            >
                                                Report
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Performance Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className={`p-6 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Highest Score</h4>
                    <div className="text-4xl font-black text-center text-blue-600 mb-1">99.2%</div>
                    <p className="text-[10px] font-bold text-center opacity-40 uppercase tracking-tighter">JEE MAIN FULL SYLLABUS 01</p>
                    <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12">
                        <Award size={100} />
                    </div>
                </div>
                <div className={`p-6 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Average Percentile</h4>
                    <div className="text-4xl font-black text-center text-emerald-500 mb-1">94.3%</div>
                    <p className="text-[10px] font-bold text-center opacity-40 uppercase tracking-tighter">Based on last 5 tests</p>
                    <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12">
                        <TrendingUp size={100} />
                    </div>
                </div>
                <div className={`p-6 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Global Rank</h4>
                    <div className="text-4xl font-black text-center text-orange-500 mb-1">#52</div>
                    <p className="text-[10px] font-bold text-center opacity-40 uppercase tracking-tighter">Top 5% of all students</p>
                    <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12">
                        <Award size={100} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Results;
