import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, AlertCircle, FileSpreadsheet, X, Maximize2, Minimize2 } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

const QuestionStudentAnalysis = ({ testId, testName, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const fetch = async () => {
            setIsLoading(true);
            try {
                const apiUrl = getApiUrl();
                const res = await axios.get(
                    `${apiUrl}/api/tests/${testId}/question_student_analysis/`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setData(res.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load analysis.');
            } finally {
                setIsLoading(false);
            }
        };
        fetch();
    }, [testId]);

    const handleExport = () => {
        if (!data) return;
        const csvRows = [];
        const headers = ['Student Name', 'Enrollment', ...Array.from({ length: data.questions_count }, (_, i) => `Q${i + 1}`)];
        csvRows.push(headers.join(','));

        data.matrix.forEach(row => {
            const values = [row.student_name, row.enrollment_number, ...row.results];
            csvRows.push(values.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Analysis_${data.test_name}.csv`;
        a.click();
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={40} className="animate-spin text-green-500" />
            <p className="text-sm font-black uppercase tracking-widest opacity-60">Building Analysis Matrix...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle size={44} className="text-red-500" />
            <p className="font-black uppercase tracking-widest text-sm opacity-60">{error}</p>
            <button onClick={onBack} className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-[5px] text-xs font-black uppercase">Go Back</button>
        </div>
    );

    const questionNumbers = Array.from({ length: data?.questions_count || 0 }, (_, i) => i + 1);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'CA': return 'bg-[#22c55e] text-white'; // Correct
            case 'IA': return 'bg-[#ef4444] text-white'; // Incorrect
            case 'PA': return 'bg-[#f97316] text-white'; // Partial
            default: return isDarkMode ? 'bg-white/5 text-transparent' : 'bg-slate-50 text-transparent'; // NA
        }
    };

    return (
        <div
            ref={containerRef}
            className={`
                animate-in fade-in duration-500 flex flex-col overflow-hidden
                ${isDarkMode ? 'bg-slate-900 text-white border-white/10' : 'bg-white text-slate-900 border-slate-200'}
                ${isFullscreen ? 'fixed inset-0 z-100 h-screen' : 'relative rounded-3xl border h-[800px] shadow-2xl'}
            `}
        >
            {/* Header */}
            <div className={`flex items-center justify-between px-8 py-5 border-b relative z-50 backdrop-blur-xl ${isDarkMode ? 'bg-slate-900/80 border-white/5' : 'bg-white/80 border-slate-100'
                }`}>
                <div className="flex items-center gap-6">
                    {!isFullscreen && (
                        <button
                            onClick={onBack}
                            className={`group flex items-center justify-center w-10 h-10 rounded-xl border transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 border-white/5' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                                }`}
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-blue-500/80' : 'text-blue-600/80'
                                }`}>Performance Analysis</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                        <h2 className={`text-xl font-bold tracking-tight truncate max-w-xl ${isDarkMode ? 'text-white' : 'text-slate-800'
                            }`}>
                            {testName || data?.test_name}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    {/* Compact Glass Legend */}
                    <div className={`hidden xl:flex items-center gap-8 px-6 py-2.5 rounded-2xl border backdrop-blur-md ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
                        }`}>
                        {[
                            { label: 'CA', color: 'bg-emerald-500', title: 'Correct' },
                            { label: 'IA', color: 'bg-rose-500', title: 'Wrong' },
                            { label: 'PA', color: 'bg-amber-500', title: 'Partial' },
                            { label: 'NA', color: isDarkMode ? 'bg-slate-700' : 'bg-slate-200', title: 'Unattempted' }
                        ].map((l) => (
                            <div key={l.label} className="flex items-center gap-2.5">
                                <div className={`w-3 h-3 rounded-full ${l.color} shadow-sm`} />
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                    }`}>
                                    <span className={isDarkMode ? 'text-white mr-1' : 'text-slate-900 mr-1'}>{l.label}:</span> {l.title}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={toggleFullscreen}
                            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all border ${isDarkMode ? 'bg-white/5 hover:bg-white/10 border-white/5' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                                }`}
                            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                        >
                            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>
                        <button
                            onClick={handleExport}
                            className={`group flex items-center gap-3 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200/50'
                                }`}
                        >
                            <FileSpreadsheet size={16} className="group-hover:rotate-12 transition-transform" />
                            Export Report
                        </button>
                        <button
                            onClick={onBack}
                            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all border border-transparent ${isDarkMode ? 'hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 hover:border-rose-500/20' : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600 hover:border-rose-100'
                                }`}
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Matrix Table with Refined Scrollbars */}
            <div className={`flex-1 overflow-auto scrollbar-thin ${isDarkMode ? 'bg-slate-900 scrollbar-thumb-white/10' : 'bg-white scrollbar-thumb-slate-200'
                }`}>
                <table className="w-full border-separate border-spacing-0 table-fixed">
                    <thead className="sticky top-0 z-40">
                        {/* Section Header Row */}
                        <tr className={isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}>
                            <th className={`sticky left-0 z-45 w-[280px] p-0 border-b border-r ${isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-slate-50 border-slate-200'
                                }`} rowSpan={2}>
                                <div className="h-full flex items-center px-8 text-left">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-blue-500' : 'text-blue-600'
                                        }`}>Student Identity</span>
                                </div>
                            </th>
                            <th className={`sticky left-[280px] z-45 w-[160px] p-0 border-b border-r ${isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-slate-50 border-slate-200'
                                }`} rowSpan={2}>
                                <div className="h-full flex items-center justify-center">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-blue-500' : 'text-blue-600'
                                        }`}>Reg. ID</span>
                                </div>
                            </th>
                            {data?.sections_info?.map((sec, sIdx) => (
                                <th
                                    key={sIdx}
                                    colSpan={sec.count}
                                    className={`p-0 border-b ${isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-slate-50 border-slate-200'
                                        } ${sIdx !== data.sections_info.length - 1 ? (isDarkMode ? 'border-r-2 border-white/20' : 'border-r-2 border-slate-300') : ''}`}
                                >
                                    <div className="h-[40px] flex items-center justify-center">
                                        <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-white/40' : 'text-slate-400'
                                            }`}>{sec.name}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                        {/* Question Number Row */}
                        <tr className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>
                            {questionNumbers.map((n, nIdx) => {
                                let isLastInSection = false;
                                let currentTotal = 0;
                                for (let sec of (data?.sections_info || [])) {
                                    currentTotal += sec.count;
                                    if (n === currentTotal) {
                                        isLastInSection = true;
                                        break;
                                    }
                                }

                                return (
                                    <th
                                        key={n}
                                        className={`w-[54px] p-0 border-b ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100'
                                            } ${isLastInSection ? (isDarkMode ? 'border-r-2 border-white/20' : 'border-r-2 border-slate-300') : (isDarkMode ? 'border-r border-white/5' : 'border-r border-slate-100')}`}
                                    >
                                        <div className="h-[40px] flex items-center justify-center group">
                                            <span className={`text-xs font-black group-hover:text-blue-400 transition-colors ${isDarkMode ? 'text-white/90' : 'text-slate-600'
                                                }`}>{n}</span>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {data?.matrix.map((row, idx) => (
                            <tr key={idx} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/3' : 'hover:bg-slate-50'}`}>
                                <td className={`sticky left-0 z-30 p-0 border-r transition-colors ${isDarkMode ? 'bg-slate-900 group-hover:bg-slate-800 border-white/10' : 'bg-white group-hover:bg-slate-50 border-slate-200'
                                    }`}>
                                    <div className={`h-[64px] flex flex-col justify-center px-8 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'
                                        }`}>
                                        <span className={`text-xs font-bold tracking-wide truncate pr-4 ${isDarkMode ? 'text-white' : 'text-slate-700'
                                            }`}>{row.student_name}</span>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Verified Profile</span>
                                    </div>
                                </td>
                                <td className={`sticky left-[280px] z-30 p-0 text-center border-r transition-colors ${isDarkMode ? 'bg-slate-900 group-hover:bg-slate-800 border-white/10' : 'bg-white group-hover:bg-slate-50 border-slate-200'
                                    }`}>
                                    <div className={`h-[64px] flex items-center justify-center border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'
                                        }`}>
                                        <span className={`font-mono text-[10px] font-black px-2.5 py-1 rounded-lg border ${isDarkMode ? 'text-slate-400 bg-white/5 border-white/5' : 'text-slate-500 bg-slate-100 border-slate-200'
                                            }`}>
                                            {row.enrollment_number}
                                        </span>
                                    </div>
                                </td>
                                {row.results.map((res, qIdx) => {
                                    let isLastInSection = false;
                                    let currentTotal = 0;
                                    for (let sec of (data?.sections_info || [])) {
                                        currentTotal += sec.count;
                                        if ((qIdx + 1) === currentTotal) {
                                            isLastInSection = true;
                                            break;
                                        }
                                    }

                                    return (
                                        <td key={qIdx} className={`p-0 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'
                                            } ${isLastInSection ? (isDarkMode ? 'border-r-2 border-white/20' : 'border-r-2 border-slate-300') : (isDarkMode ? 'border-r border-white/5' : 'border-r border-slate-100')}`}>
                                            <div className="h-[64px] flex items-center justify-center relative overflow-hidden group/cell">
                                                <div className={`
                                                    relative z-10 w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-all duration-300
                                                    group-cell:scale-110
                                                    ${res === 'CA' ? 'bg-emerald-500 text-white shadow-sm' :
                                                        res === 'IA' ? 'bg-rose-500 text-white shadow-sm' :
                                                            res === 'PA' ? 'bg-amber-500 text-white shadow-sm' :
                                                                (isDarkMode ? 'bg-white/5 text-transparent border border-white/5' : 'bg-slate-50 text-transparent border border-slate-100')}
                                                `}>
                                                    {res !== 'NA' ? res : ''}
                                                </div>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer Summary Bar */}
            <div className={`h-11 border-t flex items-center px-8 justify-between ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Dataset: Fully Finalized</span>
                    </div>
                    <div className="w-px h-3 bg-slate-300 dark:bg-white/10" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Active Students: {data?.matrix.length}</span>
                </div>
                <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-blue-500/40' : 'text-blue-600/40'
                    }`}>
                    Secure Integrated Performance Database
                </div>
            </div>
        </div>
    );
};

export default QuestionStudentAnalysis;
