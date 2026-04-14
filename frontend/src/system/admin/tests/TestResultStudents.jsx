import React, { useState, useEffect } from 'react';
import {
    Search, FileSpreadsheet, ArrowLeft,
    ChevronRight, Download, FileText, Loader2
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import Pagination from '../../../components/common/Pagination';
import StudentPerformanceAnalysis from './StudentPerformanceAnalysis';


const TestResultStudents = ({ test, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [students, setStudents] = useState([]);
    const [sections, setSections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const itemsPerPage = 8;

    const testName = test?.name || 'Test Result';

    useEffect(() => {
        const fetchResults = async () => {
            if (!test?.id) return;
            setIsLoading(true);
            try {
                const apiUrl = getApiUrl();
                const res = await axios.get(`${apiUrl}/api/tests/${test.id}/student_results/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSections(res.data.sections);
                setStudents(res.data.students);
            } catch (err) {
                console.error('Failed to fetch student results:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchResults();
    }, [test]);

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.enrollment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.centre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (selectedStudent) {
        return <StudentPerformanceAnalysis student={selectedStudent} test={test} onBack={() => setSelectedStudent(null)} />;
    }

    return (
        <div className="p-1 animate-fade-in text-[#2D3748]">
            {/* Breadcrumb & Title */}
            <div className="mb-8">
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'opacity-40' : 'text-slate-500 opacity-80'}`}>
                    <span className="hover:text-blue-600 cursor-pointer" onClick={onBack}>Pages</span>
                    <ChevronRight size={10} />
                    <span className="text-blue-600">Result</span>
                </div>
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className={`p-2 rounded-[5px] border transition-all hover:bg-blue-50 hover:text-blue-600 ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-white border-slate-100 text-slate-500'}`}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className={`text-3xl font-black tracking-tight uppercase leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                List Of Users <span className="text-blue-600">Given The Test</span>
                            </h2>
                            <p className={`text-[10px] font-bold mt-1 uppercase tracking-widest leading-none ${isDarkMode ? 'text-slate-400 opacity-30' : 'text-slate-600 opacity-90'}`}>{testName}</p>
                        </div>
                    </div>
                    <button className="px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-[5px] font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95 whitespace-nowrap">
                        <FileSpreadsheet size={18} />
                        <span>Export Data</span>
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className={`p-4 rounded-[5px] border shadow-xl mb-8 flex items-center gap-4 ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="relative flex-1 group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'}`} size={18} />
                    <input
                        type="text"
                        placeholder="Search student by name, enrollment or centre..."
                        className={`w-full pl-12 pr-4 py-3 rounded-[5px] border transition-all outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50' : 'bg-slate-50 border-slate-100 focus:border-blue-500/50'}`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Premium Table Container */}
            <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/60' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                <th className="py-6 px-6 text-center"># Rank</th>
                                <th className="py-6 px-6">Student Name</th>
                                <th className="py-6 px-6 text-center">Roll Number</th>
                                <th className="py-6 px-6 text-center">Centre</th>
                                {sections.map(sec => (
                                    <th key={sec} className="py-6 px-6 text-center">{sec}</th>
                                ))}
                                <th className="py-6 px-6 text-center">Total Marks</th>
                                <th className="py-6 px-6 text-center">Accuracy</th>
                                <th className="py-6 px-6 text-center">Total Time</th>
                                <th className="py-6 px-6 text-right pr-10">Show Details</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10 + sections.length} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-50">
                                            <Loader2 size={40} className="animate-spin text-blue-500" />
                                            <span className="text-xs font-black uppercase tracking-widest">Loading results...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedStudents.map((student) => (
                                <tr key={student.rank} className={`group transition-all ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-blue-50/20'}`}>
                                    <td className="py-6 px-6 text-center">
                                        <span className={`flex items-center justify-center mx-auto w-8 h-8 rounded-full font-black text-xs ${student.rank <= 3 ? 'bg-yellow-500/10 text-yellow-600' : isDarkMode ? 'bg-slate-500/10 text-slate-400' : 'bg-slate-100 text-slate-700'}`}>
                                            {student.rank}
                                        </span>
                                    </td>
                                    <td className="py-6 px-6">
                                        <span className={`font-extrabold text-sm uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{student.name}</span>
                                    </td>
                                    <td className="py-6 px-6 text-center">
                                        <span className={`text-xs font-bold font-mono tracking-tighter uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>{student.enrollment}</span>
                                    </td>
                                    <td className={`py-6 px-6 text-center font-black text-[11px] uppercase tracking-widest ${isDarkMode ? 'text-slate-500 opacity-40' : 'text-slate-700 opacity-90'}`}>{student.centre}</td>

                                    {sections.map(sec => (
                                        <td key={sec} className={`py-6 px-6 text-center text-xs font-bold ${isDarkMode ? 'text-slate-400 opacity-60' : 'text-slate-800 opacity-90'}`}>
                                            {student.section_scores?.[sec] || '—'}
                                        </td>
                                    ))}

                                    <td className="py-6 px-6 text-center font-bold text-sm text-blue-600">{student.marks}</td>
                                    <td className={`py-6 px-6 text-center font-black text-[11px] ${parseFloat(student.accuracy) > 50 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                        {student.accuracy}
                                    </td>
                                    <td className={`py-6 px-6 text-center text-xs font-bold ${isDarkMode ? 'text-slate-500 opacity-40' : 'text-slate-700 opacity-90'}`}>{student.totalTime}</td>
                                    <td className="py-6 px-6 text-right pr-10">
                                        <button
                                            onClick={() => setSelectedStudent(student)}
                                            className={`px-6 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${isDarkMode ? 'border-white/10 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500' : 'border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white'}`}>
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {paginatedStudents.length === 0 && (
                    <div className={`p-20 text-center opacity-20 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <Search size={60} className="mx-auto mb-4" />
                        <h3 className="text-xl font-black uppercase tracking-widest">No matching students</h3>
                    </div>
                )}
            </div>

            {/* Reusable Pagination Component */}
            <Pagination
                currentPage={currentPage}
                totalItems={filteredStudents.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
            />
        </div>
    );
};

export default TestResultStudents;
