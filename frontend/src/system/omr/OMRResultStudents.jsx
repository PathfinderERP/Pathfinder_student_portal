import React, { useState } from 'react';
import {
    Search, FileSpreadsheet, ArrowLeft,
    ChevronRight, Download
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Pagination from '../../components/common/Pagination';
import OMRStudentPerformance from './OMRStudentPerformance';


const OMRResultStudents = ({ test, onBack }) => {
    const { isDarkMode } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const itemsPerPage = 8;

    const testName = test?.name || 'Test Result';

    // Mock students data based on screenshot
    const students = [
        { rank: 1, name: 'KOUSTUV AICH', email: 'koustuv.aich@gmail.com', enrollment: 'PATH24003276', centre: 'BEHALA', marks: '73.83', accuracy: '66.00%', math: '73.83/100' },
        { rank: 2, name: 'SPANDAN GHOSH', email: 'ghoshkeya78@gmail.com', enrollment: 'PATH24000747', centre: 'DUMDUM', marks: '68.17', accuracy: '59.33%', math: '68.17/100' },
        { rank: 3, name: 'MD ISANUR SK', email: 'mdisanur@gamil.com', enrollment: 'PATH24003669', centre: 'KATWA', marks: '61', accuracy: '54.00%', math: '61/100' },
        { rank: 4, name: 'SK SAJID', email: 'skmahammedalique@gmail.com', enrollment: 'PATH24000555', centre: 'TAMLUK', marks: '60.17', accuracy: '49.33%', math: '60.17/100' },
        { rank: 5, name: 'SOURODIP ROY CHOWDHURY', email: 'samikbeta@gmail.com', enrollment: 'PATH24000036', centre: 'HAZRA H.O', marks: '59.67', accuracy: '49.33%', math: '59.67/100' },
        { rank: 6, name: 'SUBHAM PRAMANIK', email: 'subal10275@gmail.com', enrollment: 'PATH24003206', centre: 'HAZRA H.O', marks: '56.67', accuracy: '42.67%', math: '56.67/100' },
        { rank: 7, name: 'SOUGATA PAUL', email: 'satyapal9002382@gmail.com', enrollment: 'PATH24007130', centre: 'BERHAMPUR', marks: '55.25', accuracy: '53.33%', math: '55.25/100' },
        { rank: 8, name: 'ARYA MUKHERJEE', email: 'arya.ayushman0720@gmail.com', enrollment: 'PATH24004315', centre: 'KALYANI', marks: '53.5', accuracy: '50.67%', math: '53.5/100' },
        { rank: 9, name: 'SUDIPTO MANDAL', email: 'sudiptomandal123@gmail.com', enrollment: 'PATH24004311', centre: 'MALDA', marks: '53.5', accuracy: '46.00%', math: '53.5/100' },
        { rank: 10, name: 'AMRIT CHATTERJEE', email: 'chatterjee.santanu2010@gmail.com', enrollment: 'PATH24003327', centre: 'KALYANI', marks: '53.25', accuracy: '36.67%', math: '53.25/100' },
    ];

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
        return <OMRStudentPerformance student={selectedStudent} onBack={() => setSelectedStudent(null)} />;
    }

    return (
        <div className="p-1 animate-fade-in text-[#2D3748]">
            {/* Breadcrumb & Title */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
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
                            <h2 className="text-4xl font-black tracking-tight uppercase leading-none leading-tight dark:text-white">Result</h2>
                            <p className="text-[10px] font-black opacity-30 mt-1 uppercase tracking-widest leading-none dark:text-slate-400">{testName}</p>
                        </div>
                    </div>
                    <button className="px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-[5px] font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95 whitespace-nowrap">
                        <FileSpreadsheet size={18} />
                        <span>Export Excel</span>
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
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                <th className="py-6 px-10">Rank</th>
                                <th className="py-6 px-10">Name</th>
                                <th className="py-6 px-10">Email</th>
                                <th className="py-6 px-10">Enrollment No</th>
                                <th className="py-6 px-10">Centre</th>
                                <th className="py-6 px-10">Marks Got</th>
                                <th className="py-6 px-10">Accuracy</th>
                                <th className="py-6 px-10">Math</th>
                                <th className="py-6 px-10 text-right pr-14">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                            {paginatedStudents.map((student) => (
                                <tr key={student.rank} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-blue-50/20'}`}>
                                    <td className="py-6 px-10">
                                        <span className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${student.rank <= 3 ? 'bg-yellow-500/10 text-yellow-600' : 'bg-slate-500/10 text-slate-400'}`}>
                                            {student.rank}
                                        </span>
                                    </td>
                                    <td className="py-6 px-10">
                                        <span className="font-extrabold text-sm uppercase tracking-tight text-[#2D3748] dark:text-slate-200">{student.name}</span>
                                    </td>
                                    <td className="py-6 px-10 text-xs font-medium opacity-60 lowercase dark:text-slate-400">{student.email}</td>
                                    <td className="py-6 px-10">
                                        <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter uppercase">{student.enrollment}</span>
                                    </td>
                                    <td className="py-6 px-10 font-black text-[11px] opacity-40 uppercase tracking-widest dark:text-slate-500">{student.centre}</td>
                                    <td className="py-6 px-10 font-bold text-sm text-blue-600">{student.marks}</td>
                                    <td className={`py-6 px-10 font-black text-[11px] ${parseInt(student.accuracy) > 50 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                        {student.accuracy}
                                    </td>
                                    <td className="py-6 px-10 text-xs font-bold opacity-30 dark:text-slate-500">{student.math}</td>
                                    <td className="py-6 px-10 text-right pr-14">
                                        <button
                                            onClick={() => setSelectedStudent(student)}
                                            className={`px-6 py-2 rounded-[5px] text-xs font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${isDarkMode ? 'border-white/10 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500' : 'border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white'}`}>
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {paginatedStudents.length === 0 && (
                    <div className="p-20 text-center opacity-20 dark:text-white">
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

export default OMRResultStudents;
