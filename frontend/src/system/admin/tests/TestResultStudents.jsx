import React, { useState, useEffect, useRef } from 'react';
import {
    Search, FileSpreadsheet, ArrowLeft,
    ChevronRight, Download, FileText, Loader2, Filter, X
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import Pagination from '../../../components/common/Pagination';
import StudentPerformanceAnalysis from './StudentPerformanceAnalysis';
import Select from 'react-select';
import * as XLSX from 'xlsx';


const TestResultStudents = ({ test, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [students, setStudents] = useState([]);
    const [sections, setSections] = useState([]);
    const [selectedCentre, setSelectedCentre] = useState([]);
    const [selectedPerformance, setSelectedPerformance] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const itemsPerPage = 8;

    const testName = test?.name || 'Test Result';

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

    const centres = [...new Set(students.map(s => s.centre))].sort();

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.enrollment.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.centre.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCentre = selectedCentre.length === 0 || selectedCentre.some(c => c.value === s.centre);
        
        let matchesPerformance = true;
        if (selectedPerformance === 'high') {
            matchesPerformance = parseFloat(s.accuracy) >= 80;
        } else if (selectedPerformance === 'mid') {
            matchesPerformance = parseFloat(s.accuracy) >= 50 && parseFloat(s.accuracy) < 80;
        } else if (selectedPerformance === 'low') {
            matchesPerformance = parseFloat(s.accuracy) < 50;
        }

        return matchesSearch && matchesCentre && matchesPerformance;
    });

    const handleExport = () => {
        if (filteredStudents.length === 0) return;

        // Helper to format a student object for Excel
        const formatStudentRow = (s, centerRank = null) => {
            const row = {
                'All India Rank': s.rank,
            };
            if (centerRank !== null) {
                row['Center Wise Rank'] = centerRank;
            }
            row['Student Name'] = s.name;
            row['Roll Number'] = s.enrollment;
            row['Centre'] = s.centre;
            row['Student Batch'] = s.batch || 'N/A';
            
            sections.forEach(sec => {
                row[sec] = s.section_scores?.[sec] || '0';
            });
            
            // Calculate Subject Totals
            const subjectTotals = {};
            sections.forEach(sec => {
                const subject = sec.split('_')[0].toUpperCase();
                const scoreStr = String(s.section_scores?.[sec] || '0/0');
                const [earnedStr, maxStr] = scoreStr.split('/');
                const earned = parseFloat(earnedStr) || 0;
                const max = parseFloat(maxStr) || 0;
                
                if (!subjectTotals[subject]) {
                    subjectTotals[subject] = { earned: 0, max: 0 };
                }
                subjectTotals[subject].earned += earned;
                subjectTotals[subject].max += max;
            });

            // Append subject totals to the row
            Object.keys(subjectTotals).forEach(subj => {
                const t = subjectTotals[subj];
                row[`${subj} TOTAL`] = `${Number(t.earned.toFixed(2))}/${t.max}`;
            });
            
            row['Total Marks'] = s.marks;
            row['Accuracy'] = s.accuracy;
            row['Total Time'] = s.totalTime;
            return row;
        };

        const wb = XLSX.utils.book_new();

        // 1. Create "All Data" sheet
        const allDataRows = filteredStudents.map(s => formatStudentRow(s));
        const wsAll = XLSX.utils.json_to_sheet(allDataRows);
        XLSX.utils.book_append_sheet(wb, wsAll, 'All Data');

        // 2. Create Center Wise sheets
        const centerGroups = {};
        filteredStudents.forEach(s => {
            if (!centerGroups[s.centre]) centerGroups[s.centre] = [];
            centerGroups[s.centre].push(s);
        });
        
        Object.keys(centerGroups).forEach(centerName => {
            const centerStudents = centerGroups[centerName];
            // They are already sorted by global rank, so we can just assign center rank 1, 2, 3...
            const centerRows = centerStudents.map((s, idx) => formatStudentRow(s, idx + 1));
            
            // Excel sheet names max 31 chars and no illegal chars
            const safeSheetName = centerName.replace(/[\\/?*[\]]/g, '_').substring(0, 31) || 'Unknown Center';
            const wsCenter = XLSX.utils.json_to_sheet(centerRows);
            
            try {
                XLSX.utils.book_append_sheet(wb, wsCenter, safeSheetName);
            } catch (e) {
                const altName = safeSheetName.substring(0, 25) + '_' + Math.floor(Math.random() * 1000);
                XLSX.utils.book_append_sheet(wb, wsCenter, altName);
            }
        });

        // Download the file
        XLSX.writeFile(wb, `${testName.replace(/\s+/g, '_')}_Results.xlsx`);
    };

    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (selectedStudent) {
        return <StudentPerformanceAnalysis student={selectedStudent} test={test} onBack={() => setSelectedStudent(null)} />;
    }

    const centreOptions = centres.map(c => ({ value: c, label: c }));

    const customSelectStyles = {
        control: (provided) => ({
            ...provided,
            backgroundColor: 'transparent',
            border: 'none',
            boxShadow: 'none',
            minHeight: 'auto',
            cursor: 'pointer',
            flex: 1
        }),
        valueContainer: (provided) => ({
            ...provided,
            padding: '0 8px',
        }),
        input: (provided) => ({
            ...provided,
            color: isDarkMode ? '#fff' : '#0f172a',
            margin: 0,
            padding: 0,
        }),
        placeholder: (provided) => ({
            ...provided,
            color: isDarkMode ? '#94a3b8' : '#64748b',
            fontSize: '0.75rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
        }),
        singleValue: (provided) => ({
            ...provided,
            color: isDarkMode ? '#fff' : '#0f172a',
            fontSize: '0.75rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
            borderRadius: '4px',
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: isDarkMode ? '#fff' : '#0f172a',
            fontSize: '0.65rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: isDarkMode ? '#94a3b8' : '#64748b',
            ':hover': {
                backgroundColor: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
            },
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#10141D' : '#ffffff',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isFocused
                ? (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc')
                : 'transparent',
            color: isDarkMode ? '#fff' : '#0f172a',
            fontSize: '0.75rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            cursor: 'pointer',
        }),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (provided) => ({
            ...provided,
            color: isDarkMode ? '#94a3b8' : '#64748b',
            padding: '0',
            ':hover': {
                color: isDarkMode ? '#fff' : '#0f172a',
            }
        }),
        clearIndicator: (provided) => ({
            ...provided,
            color: isDarkMode ? '#94a3b8' : '#64748b',
            padding: '0',
            marginRight: '4px',
            ':hover': {
                color: '#ef4444',
            }
        })
    };

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
                    <button 
                        onClick={handleExport}
                        className="px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-[5px] font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95 whitespace-nowrap">
                        <FileSpreadsheet size={18} />
                        <span>Export Data</span>
                    </button>
                </div>
            </div>

            {/* Search Bar & Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
                <div className={`flex-1 p-4 rounded-[5px] border shadow-xl flex items-center gap-4 ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                    <div className="relative flex-1 group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'}`} size={18} />
                        <input
                            type="text"
                            placeholder="Search student by name, enrollment or centre..."
                            className={`w-full pl-12 pr-4 py-3 rounded-[5px] border transition-all outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50' : 'bg-slate-50 border-slate-100 focus:border-blue-500/50'}`}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    {/* Centre Filter */}
                    <div className={`p-4 rounded-[5px] border shadow-xl flex items-center gap-2 flex-1 min-w-[250px] max-w-[400px] ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                        <Filter className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} size={18} />
                        <div className="flex-1">
                            <Select
                                isMulti
                                options={centreOptions}
                                value={selectedCentre}
                                onChange={(selected) => {
                                    setSelectedCentre(selected || []);
                                    setCurrentPage(1);
                                }}
                                placeholder="ALL CENTRES"
                                styles={customSelectStyles}
                                classNamePrefix="react-select"
                            />
                        </div>
                    </div>

                    {/* Performance Filter */}
                    <div className={`p-4 rounded-[5px] border shadow-xl flex items-center gap-4 min-w-[200px] ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                        <div className={`w-2 h-2 rounded-full ${selectedPerformance === 'high' ? 'bg-emerald-500' : selectedPerformance === 'mid' ? 'bg-orange-400' : selectedPerformance === 'low' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <select
                            value={selectedPerformance}
                            onChange={(e) => {
                                setSelectedPerformance(e.target.value);
                                setCurrentPage(1);
                            }}
                            className={`flex-1 bg-transparent border-none outline-none font-bold text-xs uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                        >
                            <option value="all">All Performance</option>
                            <option value="high" className={isDarkMode ? 'bg-[#10141D] text-white' : 'bg-white text-slate-900'}>High Accuracy (&gt;80%)</option>
                            <option value="mid" className={isDarkMode ? 'bg-[#10141D] text-white' : 'bg-white text-slate-900'}>Average (50-80%)</option>
                            <option value="low" className={isDarkMode ? 'bg-[#10141D] text-white' : 'bg-white text-slate-900'}>Needs Improvement (&lt;50%)</option>
                        </select>
                    </div>

                    {(selectedCentre.length > 0 || selectedPerformance !== 'all' || searchTerm) && (
                        <button 
                            onClick={() => {
                                setSelectedCentre([]);
                                setSelectedPerformance('all');
                                setSearchTerm('');
                                setCurrentPage(1);
                            }}
                            className={`p-4 rounded-[5px] border shadow-xl flex items-center justify-center gap-2 transition-all hover:text-red-500 ${isDarkMode ? 'bg-[#10141D] border-white/5 text-slate-500' : 'bg-white border-slate-100 text-slate-400'}`}
                            title="Clear All Filters"
                        >
                            <X size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest md:hidden lg:inline">Clear</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Premium Table Container */}
            <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/60' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div 
                    ref={tableContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className={`overflow-x-auto custom-scrollbar ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
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
